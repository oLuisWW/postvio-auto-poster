from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware # <--- NOVA LINHA AQUI
import mysql.connector
import os
import shutil
from dotenv import load_dotenv
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime
from datetime import datetime, timedelta
from fastapi.staticfiles import StaticFiles

# Carrega as configurações do .env
load_dotenv()

app = FastAPI()
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# --- CONFIGURAÇÃO DO CORS (NOVO) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Permite que qualquer página se conecte à API
    allow_credentials=True,
    allow_methods=["*"], # Permite todos os métodos (GET, POST, etc.)
    allow_headers=["*"],
)
# -----------------------------------

# Cria a pasta 'uploads' automaticamente caso não exista
os.makedirs("uploads", exist_ok=True)

# Função auxiliar para ligar ao banco de dados
def conectar_banco():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME")
    )

@app.get("/")
def ler_raiz():
    return {"status": "sucesso", "mensagem": "API do Postvio rodando em Python!"}

@app.post("/agendar/")
async def agendar_video(
    video: UploadFile = File(...), 
    legenda: str = Form(...), 
    data_hora: str = Form(...),
    capa: UploadFile = File(None) # NOVO: Recebe a imagem da capa (opcional)
):
    caminho_video = f"uploads/{video.filename}"
    with open(caminho_video, "wb") as buffer:
        shutil.copyfileobj(video.file, buffer)
        
    # Processa a capa se ela for enviada
    caminho_capa = None
    if capa and capa.filename:
        caminho_capa = f"uploads/capa_{capa.filename}"
        with open(caminho_capa, "wb") as buffer:
            shutil.copyfileobj(capa.file, buffer)

    conn = conectar_banco()
    cursor = conn.cursor()
    # SQL atualizado para incluir o caminho_capa
    comando = "INSERT INTO postagens (caminho_video, legenda, data_hora_agendamento, status, caminho_capa) VALUES (%s, %s, %s, 'PENDENTE', %s)"
    cursor.execute(comando, (caminho_video, legenda, data_hora, caminho_capa))
    conn.commit()
    cursor.close()
    conn.close()
    
    return {"status": "sucesso", "mensagem": "Vídeo e capa agendados com sucesso!"}


@app.post("/agendar-auto/")
async def agendar_video_automatico(
    video: UploadFile = File(...), 
    legenda: str = Form(...),
    capa: UploadFile = File(None) # NOVO: Recebe a capa no modo em massa
):
    proximo_horario = obter_proximo_horario_livre()
    if not proximo_horario:
        raise HTTPException(status_code=400, detail="Erro: Configure um horário na Grade.")
        
    caminho_video = f"uploads/{video.filename}"
    with open(caminho_video, "wb") as buffer:
        shutil.copyfileobj(video.file, buffer)
        
    caminho_capa = None
    if capa and capa.filename:
        caminho_capa = f"uploads/capa_{capa.filename}"
        with open(caminho_capa, "wb") as buffer:
            shutil.copyfileobj(capa.file, buffer)
        
    conn = conectar_banco()
    cursor = conn.cursor()
    comando = "INSERT INTO postagens (caminho_video, legenda, data_hora_agendamento, status, caminho_capa) VALUES (%s, %s, %s, 'PENDENTE', %s)"
    cursor.execute(comando, (caminho_video, legenda, proximo_horario, caminho_capa))
    conn.commit()
    cursor.close()
    conn.close()
    
    return {"status": "sucesso", "horario_agendado": proximo_horario}

@app.get("/fila/")
def listar_fila():
    try:
        conn = conectar_banco()
        # dictionary=True formata os resultados para serem lidos facilmente em JSON
        cursor = conn.cursor(dictionary=True) 
        
        # Consulta todas as postagens, ordenando pela data de agendamento
        cursor.execute("SELECT * FROM postagens ORDER BY data_hora_agendamento ASC")
        postagens = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return {"status": "sucesso", "total": len(postagens), "fila": postagens}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao listar a fila: {str(e)}")

    # --- GESTÃO DE HORÁRIOS PADRÃO ---

@app.get("/horarios/")
def listar_horarios():
    conn = conectar_banco()
    cursor = conn.cursor(dictionary=True)
    # Ordena pelo dia da semana e depois pela hora
    cursor.execute("SELECT * FROM horarios_padrao ORDER BY dia_semana, horario")
    horarios = cursor.fetchall()
    
    # Converte o formato 'timedelta' do MySQL para string (ex: '10:00:00')
    for h in horarios:
        h['horario'] = str(h['horario'])
        
    cursor.close()
    conn.close()
    return {"status": "sucesso", "horarios": horarios}

@app.post("/horarios/")
def adicionar_horario(dia_semana: int = Form(...), horario: str = Form(...)):
    conn = conectar_banco()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO horarios_padrao (dia_semana, horario) VALUES (%s, %s)", (dia_semana, horario))
    conn.commit()
    cursor.close()
    conn.close()
    return {"status": "sucesso", "mensagem": "Horário adicionado com sucesso!"}

@app.delete("/horarios/{id_horario}")
def apagar_horario(id_horario: int):
    conn = conectar_banco()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM horarios_padrao WHERE id = %s", (id_horario,))
    conn.commit()
    cursor.close()
    conn.close()
    return {"status": "sucesso", "mensagem": "Horário apagado com sucesso!"}

# --- MOTOR DE DISTRIBUIÇÃO AUTOMÁTICA (BULK UPLOAD) ---

def obter_proximo_horario_livre():
    conn = conectar_banco()
    cursor = conn.cursor(dictionary=True)
    
    # 1. Pega a grade de horários configurada pelo utilizador
    cursor.execute("SELECT dia_semana, horario FROM horarios_padrao ORDER BY dia_semana, horario")
    grade = cursor.fetchall()
    
    if not grade:
        return None # O utilizador ainda não configurou nenhum horário na grade
        
    # 2. Pega a data e hora do ÚLTIMO vídeo que está na fila para saber de onde continuar
    cursor.execute("SELECT MAX(data_hora_agendamento) as ultimo_agendamento FROM postagens WHERE status = 'PENDENTE'")
    resultado = cursor.fetchone()
    
    # Se não houver vídeos pendentes, a base começa "agora"
    data_base = resultado['ultimo_agendamento'] if resultado['ultimo_agendamento'] else datetime.now()
    
    # Garante que não agendamos no passado
    if data_base < datetime.now():
        data_base = datetime.now()

    # 3. Procura o próximo dia e horário válido (vasculha os próximos 30 dias)
    for i in range(30):
        data_teste = data_base.date() + timedelta(days=i)
        dia_semana_teste = data_teste.weekday() # 0 = Segunda, 6 = Domingo
        
        for g in grade:
            if g['dia_semana'] == dia_semana_teste:
                # O MySQL devolve a hora como timedelta. Precisamos extrair as horas e minutos.
                segundos = g['horario'].total_seconds()
                horas = int(segundos // 3600)
                minutos = int((segundos % 3600) // 60)
                
                # Monta a data/hora completa do possível próximo agendamento
                data_hora_candidata = datetime(
                    data_teste.year, data_teste.month, data_teste.day, 
                    horas, minutos, 0
                )
                
                # Se a data candidata for maior que a do último vídeo, achámos o próximo espaço!
                if data_hora_candidata > data_base:
                    cursor.close()
                    conn.close()
                    return data_hora_candidata.strftime('%Y-%m-%d %H:%M:%S')

    cursor.close()
    conn.close()
    return None

    # --- MOTOR AUTOMÁTICO DE PUBLICAÇÃO ---

def verificar_e_publicar_videos():
    try:
        conn = conectar_banco()
        cursor = conn.cursor(dictionary=True)
        
        # Capta a data e hora exata de agora
        agora = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        # Procura vídeos pendentes onde a hora de agendamento já passou
        comando = "SELECT id, caminho_video FROM postagens WHERE status = 'PENDENTE' AND data_hora_agendamento <= %s"
        cursor.execute(comando, (agora,))
        videos_prontos = cursor.fetchall()
        
        for video in videos_prontos:
            print(f"🔄 A iniciar publicação do vídeo ID: {video['id']}")
            
            # (No futuro, é aqui que entra o código para enviar para o Instagram/TikTok)
            
            # Atualiza o status na base de dados para CONCLUIDO
            cursor.execute("UPDATE postagens SET status = 'CONCLUIDO' WHERE id = %s", (video['id'],))
            conn.commit()
            print(f"✅ Vídeo ID: {video['id']} publicado com sucesso!")
            
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Erro no motor automático: {e}")

# Inicia o relógio que vai executar a função acima a cada 1 minuto
agendador = BackgroundScheduler()
agendador.add_job(verificar_e_publicar_videos, 'interval', minutes=1)
agendador.start()
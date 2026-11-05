from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Depends
import os
import time
from datetime import datetime, timedelta
from database import conectar_banco
from servicos.motor import obter_proximo_horario_livre
from servicos.auth import obter_usuario_atual

router = APIRouter()

# --- CÓDIGO DE BLINDAGEM DA PASTA ---
DIRETORIO_BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PASTA_UPLOADS = os.path.join(DIRETORIO_BASE, "uploads")
os.makedirs(PASTA_UPLOADS, exist_ok=True)
print(f"📂 A pasta de uploads oficial é: {PASTA_UPLOADS}")

def verificar_dono_da_conta(cursor, conta_id: int, usuario_id: str):
    """🔒 Verifica se a conta de Instagram pertence ao utilizador logado"""
    cursor.execute("SELECT id FROM contas_instagram WHERE id = %s AND usuario_id = %s", (conta_id, usuario_id))
    if not cursor.fetchone():
        raise HTTPException(status_code=403, detail="Acesso negado: Esta conta de Instagram não lhe pertence.")

def limpar_nome_arquivo(nome_original: str):
    """Garante que o nome do ficheiro não tem espaços ou caracteres que o Windows/Linux odeiem"""
    limpo = nome_original.replace(" ", "_").replace("(", "").replace(")", "")
    return f"{int(time.time())}_{limpo}"

@router.post("/")
async def agendar_video(
    video: UploadFile = File(...), 
    legenda: str = Form(...), 
    data_hora: str = Form(...),
    conta_id: int = Form(...),
    capa: UploadFile = File(None),
    usuario_id: str = Depends(obter_usuario_atual)
):
    conn = conectar_banco()
    cursor = conn.cursor()
    
    try:
        verificar_dono_da_conta(cursor, conta_id, usuario_id)
        
        # 1. Guardar Vídeo de Forma Segura (Async para não corromper)
        nome_video = limpar_nome_arquivo(video.filename)
        caminho_fisico_video = os.path.join(PASTA_UPLOADS, nome_video)
        
        conteudo_video = await video.read()
        with open(caminho_fisico_video, "wb") as f:
            f.write(conteudo_video)
        caminho_bd_video = f"uploads/{nome_video}"
            
        # 2. Guardar Capa (Se existir)
        caminho_bd_capa = None
        if capa and capa.filename:
            nome_capa = f"capa_{limpar_nome_arquivo(capa.filename)}"
            caminho_fisico_capa = os.path.join(PASTA_UPLOADS, nome_capa)
            
            conteudo_capa = await capa.read()
            with open(caminho_fisico_capa, "wb") as f:
                f.write(conteudo_capa)
            caminho_bd_capa = f"uploads/{nome_capa}"

        # 3. Guardar na BD com os caminhos relativos
        comando = "INSERT INTO postagens (caminho_video, legenda, data_hora_agendamento, status, caminho_capa, conta_id) VALUES (%s, %s, %s, 'PENDENTE', %s, %s)"
        cursor.execute(comando, (caminho_bd_video, legenda, data_hora, caminho_bd_capa, conta_id))
        conn.commit()
        return {"status": "sucesso", "mensagem": "Vídeo agendado com sucesso!"}
    finally:
        cursor.close()
        conn.close()


@router.post("/auto/")
async def agendar_video_automatico(
    video: UploadFile = File(...), 
    legenda: str = Form(...),
    conta_id: int = Form(...),
    capa: UploadFile = File(None),
    modo_agendamento: str = Form("grade"), 
    posicao_fila: int = Form(0),
    data_inicio: str = Form(None),
    hora_inicio: str = Form(None),
    intervalo_minutos: int = Form(0),
    usuario_id: str = Depends(obter_usuario_atual)
):
    conn = conectar_banco()
    cursor = conn.cursor()
    
    try:
        verificar_dono_da_conta(cursor, conta_id, usuario_id)

        # 1. Calcular o horário
        if modo_agendamento == 'intervalo':
            if not data_inicio or not hora_inicio or intervalo_minutos <= 0:
                raise HTTPException(status_code=400, detail="Dados de intervalo inválidos.")
            
            data_hora_str = f"{data_inicio} {hora_inicio}:00"
            data_base = datetime.strptime(data_hora_str, "%Y-%m-%d %H:%M:%S")
            minutos_somar = intervalo_minutos * posicao_fila
            horario_calculado = data_base + timedelta(minutes=minutos_somar)
            proximo_horario = horario_calculado.strftime("%Y-%m-%d %H:%M:%S")
        else:
            proximo_horario = obter_proximo_horario_livre(conta_id)
            if not proximo_horario:
                raise HTTPException(status_code=400, detail="Erro: Configure um horário na Grade para esta conta.")
                
        # 2. Guardar Vídeo de Forma Segura (Async para aguentar Upload em Massa)
        nome_video = limpar_nome_arquivo(video.filename)
        caminho_fisico_video = os.path.join(PASTA_UPLOADS, nome_video)
        
        conteudo_video = await video.read()
        with open(caminho_fisico_video, "wb") as f:
            f.write(conteudo_video)
        caminho_bd_video = f"uploads/{nome_video}"
            
        # 3. Guardar Capa
        caminho_bd_capa = None
        if capa and capa.filename:
            nome_capa = f"capa_{limpar_nome_arquivo(capa.filename)}"
            caminho_fisico_capa = os.path.join(PASTA_UPLOADS, nome_capa)
            
            conteudo_capa = await capa.read()
            with open(caminho_fisico_capa, "wb") as f:
                f.write(conteudo_capa)
            caminho_bd_capa = f"uploads/{nome_capa}"

        # 4. Guardar na BD com os caminhos relativos
        comando = "INSERT INTO postagens (caminho_video, legenda, data_hora_agendamento, status, caminho_capa, conta_id) VALUES (%s, %s, %s, 'PENDENTE', %s, %s)"
        cursor.execute(comando, (caminho_bd_video, legenda, proximo_horario, caminho_bd_capa, conta_id))
        conn.commit()
        return {"status": "sucesso", "horario_agendado": proximo_horario}
    finally:
        cursor.close()
        conn.close()


@router.get("/fila/")
def listar_fila(conta_id: int, usuario_id: str = Depends(obter_usuario_atual)):
    try:
        conn = conectar_banco()
        cursor = conn.cursor(dictionary=True) 
        verificar_dono_da_conta(cursor, conta_id, usuario_id)
        
        comando = """
            SELECT * FROM postagens 
            WHERE conta_id = %s 
            ORDER BY 
                CASE WHEN status = 'PENDENTE' THEN 1 ELSE 2 END,
                CASE WHEN status = 'PENDENTE' THEN data_hora_agendamento END ASC,
                CASE WHEN status = 'CONCLUIDO' THEN data_hora_agendamento END DESC
        """
        cursor.execute(comando, (conta_id,))
        postagens = cursor.fetchall()
        return {"status": "sucesso", "total": len(postagens), "fila": postagens}
    finally:
        cursor.close()
        conn.close()


@router.delete("/{video_id}")
def apagar_video(video_id: int, usuario_id: str = Depends(obter_usuario_atual)):
    conn = conectar_banco()
    cursor = conn.cursor(dictionary=True)
    
    try:
        comando_busca = """
            SELECT p.caminho_video, p.caminho_capa 
            FROM postagens p
            JOIN contas_instagram c ON p.conta_id = c.id
            WHERE p.id = %s AND c.usuario_id = %s
        """
        cursor.execute(comando_busca, (video_id, usuario_id))
        video = cursor.fetchone()
        
        if not video:
            raise HTTPException(status_code=404, detail="Vídeo não encontrado ou sem permissão para apagar.")
            
        cursor.execute("DELETE FROM postagens WHERE id = %s", (video_id,))
        conn.commit()
        
        # O ficheiro na BD agora é só "uploads/nome.mp4", logo temos de juntar com a base para apagar no disco
        if video['caminho_video']:
            caminho_fisico = os.path.join(DIRETORIO_BASE, video['caminho_video'])
            if os.path.exists(caminho_fisico):
                os.remove(caminho_fisico)
                
        if video['caminho_capa']:
            caminho_fisico = os.path.join(DIRETORIO_BASE, video['caminho_capa'])
            if os.path.exists(caminho_fisico):
                os.remove(caminho_fisico)
                
        return {"status": "sucesso", "mensagem": "Vídeo e ficheiros apagados!"}
    finally:
        cursor.close()
        conn.close()


@router.delete("/concluidos/{conta_id}")
def limpar_historico_concluidos(conta_id: int, usuario_id: str = Depends(obter_usuario_atual)):
    conn = conectar_banco()
    cursor = conn.cursor(dictionary=True)
    
    try:
        verificar_dono_da_conta(cursor, conta_id, usuario_id)
        
        cursor.execute("SELECT caminho_video, caminho_capa FROM postagens WHERE conta_id = %s AND status = 'CONCLUIDO'", (conta_id,))
        videos = cursor.fetchall()
        
        cursor.execute("DELETE FROM postagens WHERE conta_id = %s AND status = 'CONCLUIDO'", (conta_id,))
        conn.commit()
        
        for v in videos:
            if v['caminho_video']:
                caminho_fisico = os.path.join(DIRETORIO_BASE, v['caminho_video'])
                if os.path.exists(caminho_fisico):
                    os.remove(caminho_fisico)
                    
            if v['caminho_capa']:
                caminho_fisico = os.path.join(DIRETORIO_BASE, v['caminho_capa'])
                if os.path.exists(caminho_fisico):
                    os.remove(caminho_fisico)
                
        return {"status": "sucesso", "apagados": len(videos)}
    finally:
        cursor.close()
        conn.close()
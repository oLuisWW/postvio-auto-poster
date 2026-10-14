from fastapi import APIRouter, File, UploadFile, Form, HTTPException
import shutil
import os
from datetime import datetime, timedelta # <-- Nova importação crucial para fazer a matemática do tempo
from database import conectar_banco
from servicos.motor import obter_proximo_horario_livre

router = APIRouter()

@router.post("/")
async def agendar_video(
    video: UploadFile = File(...), 
    legenda: str = Form(...), 
    data_hora: str = Form(...),
    conta_id: int = Form(...),
    capa: UploadFile = File(None)
):
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
    comando = "INSERT INTO postagens (caminho_video, legenda, data_hora_agendamento, status, caminho_capa, conta_id) VALUES (%s, %s, %s, 'PENDENTE', %s, %s)"
    cursor.execute(comando, (caminho_video, legenda, data_hora, caminho_capa, conta_id))
    conn.commit()
    cursor.close()
    conn.close()
    
    return {"status": "sucesso", "mensagem": "Vídeo agendado com sucesso!"}

@router.post("/auto/")
async def agendar_video_automatico(
    video: UploadFile = File(...), 
    legenda: str = Form(...),
    conta_id: int = Form(...),
    capa: UploadFile = File(None),
    # Novos campos opcionais recebidos do Frontend
    modo_agendamento: str = Form("grade"), 
    posicao_fila: int = Form(0),
    data_inicio: str = Form(None),
    hora_inicio: str = Form(None),
    intervalo_minutos: int = Form(0)
):
    # 1. Calcular o horário de acordo com o MODO escolhido
    if modo_agendamento == 'intervalo':
        if not data_inicio or not hora_inicio or intervalo_minutos <= 0:
            raise HTTPException(status_code=400, detail="Dados de intervalo inválidos.")
        
        # Junta a data e a hora "2026-10-12 14:00:00" e converte para objeto de tempo
        data_hora_str = f"{data_inicio} {hora_inicio}:00"
        data_base = datetime.strptime(data_hora_str, "%Y-%m-%d %H:%M:%S")
        
        # Faz a matemática exata (posição 0 = 0min, posição 1 = 30min, posição 2 = 60min...)
        minutos_somar = intervalo_minutos * posicao_fila
        horario_calculado = data_base + timedelta(minutes=minutos_somar)
        
        # Transforma de volta em texto para a Base de Dados
        proximo_horario = horario_calculado.strftime("%Y-%m-%d %H:%M:%S")
        
    else:
        # O Motor Original (Modo Grade)
        proximo_horario = obter_proximo_horario_livre(conta_id)
        if not proximo_horario:
            raise HTTPException(status_code=400, detail="Erro: Configure um horário na Grade para esta conta.")
            
    # 2. Guardar Ficheiros
    caminho_video = f"uploads/{video.filename}"
    with open(caminho_video, "wb") as buffer:
        shutil.copyfileobj(video.file, buffer)
        
    caminho_capa = None
    if capa and capa.filename:
        caminho_capa = f"uploads/capa_{capa.filename}"
        with open(caminho_capa, "wb") as buffer:
            shutil.copyfileobj(capa.file, buffer)
        
    # 3. Guardar na Base de Dados
    conn = conectar_banco()
    cursor = conn.cursor()
    comando = "INSERT INTO postagens (caminho_video, legenda, data_hora_agendamento, status, caminho_capa, conta_id) VALUES (%s, %s, %s, 'PENDENTE', %s, %s)"
    cursor.execute(comando, (caminho_video, legenda, proximo_horario, caminho_capa, conta_id))
    conn.commit()
    cursor.close()
    conn.close()
    
    return {"status": "sucesso", "horario_agendado": proximo_horario}

@router.get("/fila/")
def listar_fila(conta_id: int = 1):
    try:
        conn = conectar_banco()
        cursor = conn.cursor(dictionary=True) 
        
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
        cursor.close()
        conn.close()
        return {"status": "sucesso", "total": len(postagens), "fila": postagens}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao listar a fila: {str(e)}")

@router.delete("/{video_id}")
def apagar_video(video_id: int):
    conn = conectar_banco()
    cursor = conn.cursor(dictionary=True)
    
    cursor.execute("SELECT caminho_video, caminho_capa FROM postagens WHERE id = %s", (video_id,))
    video = cursor.fetchone()
    
    if not video:
        cursor.close()
        conn.close()
        raise HTTPException(status_code=404, detail="Vídeo não encontrado")
        
    cursor.execute("DELETE FROM postagens WHERE id = %s", (video_id,))
    conn.commit()
    cursor.close()
    conn.close()
    
    if video['caminho_video'] and os.path.exists(video['caminho_video']):
        os.remove(video['caminho_video'])
    if video['caminho_capa'] and os.path.exists(video['caminho_capa']):
        os.remove(video['caminho_capa'])
        
    return {"status": "sucesso", "mensagem": "Vídeo e ficheiros apagados!"}

@router.delete("/concluidos/{conta_id}")
def limpar_historico_concluidos(conta_id: int):
    conn = conectar_banco()
    cursor = conn.cursor(dictionary=True)
    
    cursor.execute("SELECT caminho_video, caminho_capa FROM postagens WHERE conta_id = %s AND status = 'CONCLUIDO'", (conta_id,))
    videos = cursor.fetchall()
    
    cursor.execute("DELETE FROM postagens WHERE conta_id = %s AND status = 'CONCLUIDO'", (conta_id,))
    conn.commit()
    cursor.close()
    conn.close()
    
    for v in videos:
        if v['caminho_video'] and os.path.exists(v['caminho_video']):
            os.remove(v['caminho_video'])
        if v['caminho_capa'] and os.path.exists(v['caminho_capa']):
            os.remove(v['caminho_capa'])
            
    return {"status": "sucesso", "apagados": len(videos)}
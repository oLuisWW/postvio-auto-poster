from fastapi import APIRouter, File, UploadFile, Form, HTTPException
import shutil
import os
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
    capa: UploadFile = File(None)
):
    proximo_horario = obter_proximo_horario_livre(conta_id)
    if not proximo_horario:
        raise HTTPException(status_code=400, detail="Erro: Configure um horário na Grade para esta conta.")
        
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
    
    # 1. Procurar os caminhos dos ficheiros para os apagar do seu PC
    cursor.execute("SELECT caminho_video, caminho_capa FROM postagens WHERE id = %s", (video_id,))
    video = cursor.fetchone()
    
    if not video:
        cursor.close()
        conn.close()
        raise HTTPException(status_code=404, detail="Vídeo não encontrado")
        
    # 2. Apagar da Base de Dados
    cursor.execute("DELETE FROM postagens WHERE id = %s", (video_id,))
    conn.commit()
    cursor.close()
    conn.close()
    
    # 3. Apagar os ficheiros reais da pasta uploads
    if video['caminho_video'] and os.path.exists(video['caminho_video']):
        os.remove(video['caminho_video'])
    if video['caminho_capa'] and os.path.exists(video['caminho_capa']):
        os.remove(video['caminho_capa'])
        
    return {"status": "sucesso", "mensagem": "Vídeo e ficheiros apagados!"}

@router.delete("/concluidos/{conta_id}")
def limpar_historico_concluidos(conta_id: int):
    conn = conectar_banco()
    cursor = conn.cursor(dictionary=True)
    
    # 1. Buscar os caminhos dos ficheiros para os apagar do PC
    cursor.execute("SELECT caminho_video, caminho_capa FROM postagens WHERE conta_id = %s AND status = 'CONCLUIDO'", (conta_id,))
    videos = cursor.fetchall()
    
    # 2. Apagar da Base de Dados de uma só vez
    cursor.execute("DELETE FROM postagens WHERE conta_id = %s AND status = 'CONCLUIDO'", (conta_id,))
    conn.commit()
    cursor.close()
    conn.close()
    
    # 3. Apagar os ficheiros físicos
    for v in videos:
        if v['caminho_video'] and os.path.exists(v['caminho_video']):
            os.remove(v['caminho_video'])
        if v['caminho_capa'] and os.path.exists(v['caminho_capa']):
            os.remove(v['caminho_capa'])
            
    return {"status": "sucesso", "apagados": len(videos)}
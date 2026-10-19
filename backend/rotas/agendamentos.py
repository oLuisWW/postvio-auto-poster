from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Depends
import shutil
import os
from datetime import datetime, timedelta
from database import conectar_banco
from servicos.motor import obter_proximo_horario_livre
from servicos.auth import obter_usuario_atual

router = APIRouter()

def verificar_dono_da_conta(cursor, conta_id: int, usuario_id: str):
    """🔒 Função de segurança SaaS: Verifica se a conta de Instagram pertence ao utilizador logado"""
    cursor.execute("SELECT id FROM contas_instagram WHERE id = %s AND usuario_id = %s", (conta_id, usuario_id))
    if not cursor.fetchone():
        raise HTTPException(status_code=403, detail="Acesso negado: Esta conta de Instagram não lhe pertence.")

@router.post("/")
async def agendar_video(
    video: UploadFile = File(...), 
    legenda: str = Form(...), 
    data_hora: str = Form(...),
    conta_id: int = Form(...),
    capa: UploadFile = File(None),
    usuario_id: str = Depends(obter_usuario_atual) # 🔒 EXIGE TOKEN
):
    conn = conectar_banco()
    cursor = conn.cursor()
    
    try:
        verificar_dono_da_conta(cursor, conta_id, usuario_id) # 🔒 Impede invasões
        
        caminho_video = f"uploads/{video.filename}"
        with open(caminho_video, "wb") as buffer:
            shutil.copyfileobj(video.file, buffer)
            
        caminho_capa = None
        if capa and capa.filename:
            caminho_capa = f"uploads/capa_{capa.filename}"
            with open(caminho_capa, "wb") as buffer:
                shutil.copyfileobj(capa.file, buffer)

        comando = "INSERT INTO postagens (caminho_video, legenda, data_hora_agendamento, status, caminho_capa, conta_id) VALUES (%s, %s, %s, 'PENDENTE', %s, %s)"
        cursor.execute(comando, (caminho_video, legenda, data_hora, caminho_capa, conta_id))
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
    usuario_id: str = Depends(obter_usuario_atual) # 🔒 EXIGE TOKEN
):
    conn = conectar_banco()
    cursor = conn.cursor()
    
    try:
        verificar_dono_da_conta(cursor, conta_id, usuario_id) # 🔒 Impede invasões

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
        comando = "INSERT INTO postagens (caminho_video, legenda, data_hora_agendamento, status, caminho_capa, conta_id) VALUES (%s, %s, %s, 'PENDENTE', %s, %s)"
        cursor.execute(comando, (caminho_video, legenda, proximo_horario, caminho_capa, conta_id))
        conn.commit()
        return {"status": "sucesso", "horario_agendado": proximo_horario}
    finally:
        cursor.close()
        conn.close()

@router.get("/fila/")
def listar_fila(conta_id: int, usuario_id: str = Depends(obter_usuario_atual)): # 🔒 EXIGE TOKEN
    try:
        conn = conectar_banco()
        cursor = conn.cursor(dictionary=True) 
        
        verificar_dono_da_conta(cursor, conta_id, usuario_id) # 🔒 Garante que só vê a própria fila
        
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
def apagar_video(video_id: int, usuario_id: str = Depends(obter_usuario_atual)): # 🔒 EXIGE TOKEN
    conn = conectar_banco()
    cursor = conn.cursor(dictionary=True)
    
    try:
        # 🔒 Procura o vídeo MAS garantindo que pertence a uma conta do cliente atual
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
        
        if video['caminho_video'] and os.path.exists(video['caminho_video']):
            os.remove(video['caminho_video'])
        if video['caminho_capa'] and os.path.exists(video['caminho_capa']):
            os.remove(video['caminho_capa'])
            
        return {"status": "sucesso", "mensagem": "Vídeo e ficheiros apagados!"}
    finally:
        cursor.close()
        conn.close()

@router.delete("/concluidos/{conta_id}")
def limpar_historico_concluidos(conta_id: int, usuario_id: str = Depends(obter_usuario_atual)): # 🔒 EXIGE TOKEN
    conn = conectar_banco()
    cursor = conn.cursor(dictionary=True)
    
    try:
        verificar_dono_da_conta(cursor, conta_id, usuario_id) # 🔒
        
        cursor.execute("SELECT caminho_video, caminho_capa FROM postagens WHERE conta_id = %s AND status = 'CONCLUIDO'", (conta_id,))
        videos = cursor.fetchall()
        
        cursor.execute("DELETE FROM postagens WHERE conta_id = %s AND status = 'CONCLUIDO'", (conta_id,))
        conn.commit()
        
        for v in videos:
            if v['caminho_video'] and os.path.exists(v['caminho_video']):
                os.remove(v['caminho_video'])
            if v['caminho_capa'] and os.path.exists(v['caminho_capa']):
                os.remove(v['caminho_capa'])
                
        return {"status": "sucesso", "apagados": len(videos)}
    finally:
        cursor.close()
        conn.close()
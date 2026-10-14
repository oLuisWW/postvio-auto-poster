from fastapi import APIRouter, Form, UploadFile, File, HTTPException
import shutil
import os
from database import conectar_banco

router = APIRouter()

@router.post("/")
async def adicionar_conta(
    nome_perfil: str = Form(...),
    usuario_ig: str = Form(...),
    senha: str = Form(...), 
    foto_perfil: UploadFile = File(None)
):
    caminho_foto = None
    if foto_perfil and foto_perfil.filename:
        caminho_foto = f"uploads/perfil_{foto_perfil.filename}"
        with open(caminho_foto, "wb") as buffer:
            shutil.copyfileobj(foto_perfil.file, buffer)

    conn = conectar_banco()
    cursor = conn.cursor()
    # Usa a tabela correta: contas_instagram
    comando = "INSERT INTO contas_instagram (nome_perfil, usuario_ig, senha, foto_perfil) VALUES (%s, %s, %s, %s)"
    cursor.execute(comando, (nome_perfil, usuario_ig, senha, caminho_foto))
    conn.commit()
    cursor.close()
    conn.close()

    return {"status": "sucesso", "mensagem": "Conta adicionada com sucesso!"}

@router.get("/")
def listar_contas():
    try:
        conn = conectar_banco()
        cursor = conn.cursor(dictionary=True)
        # CORRIGIDO: Agora lê da tabela contas_instagram
        cursor.execute("SELECT * FROM contas_instagram")
        contas = cursor.fetchall()
        cursor.close()
        conn.close()
        return {"status": "sucesso", "contas": contas}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{conta_id}")
def apagar_conta(conta_id: int):
    try:
        conn = conectar_banco()
        cursor = conn.cursor(dictionary=True)
        
        # Buscar a foto para apagar do disco
        cursor.execute("SELECT foto_perfil FROM contas_instagram WHERE id = %s", (conta_id,))
        conta = cursor.fetchone()
        
        # CORRIGIDO: Apaga da tabela contas_instagram
        cursor.execute("DELETE FROM contas_instagram WHERE id = %s", (conta_id,))
        conn.commit()
        cursor.close()
        conn.close()
        
        # Apagar o ficheiro da foto se existir
        if conta and conta['foto_perfil'] and os.path.exists(conta['foto_perfil']):
            os.remove(conta['foto_perfil'])
            
        return {"status": "sucesso", "mensagem": "Conta apagada com sucesso!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
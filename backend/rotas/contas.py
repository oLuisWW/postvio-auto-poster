from fastapi import APIRouter, Form
from database import conectar_banco

router = APIRouter()

@router.get("/")
async def listar_contas():
    conn = conectar_banco()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT id, nome_perfil, usuario_ig, foto_perfil FROM contas_instagram ORDER BY id")
    contas = cursor.fetchall()
    cursor.close()
    conn.close()
    return {"status": "sucesso", "contas": contas}

@router.post("/")
async def adicionar_conta(nome_perfil: str = Form(...), usuario_ig: str = Form(...), senha_ig: str = Form(...)):
    conn = conectar_banco()
    cursor = conn.cursor()
    comando = "INSERT INTO contas_instagram (nome_perfil, usuario_ig, senha_ig) VALUES (%s, %s, %s)"
    cursor.execute(comando, (nome_perfil, usuario_ig, senha_ig))
    conn.commit()
    cursor.close()
    conn.close()
    return {"status": "sucesso", "mensagem": "Conta adicionada!"}
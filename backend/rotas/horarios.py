from fastapi import APIRouter, Form, Depends, HTTPException
from database import conectar_banco
from servicos.auth import obter_usuario_atual

router = APIRouter()

def verificar_dono_da_conta(cursor, conta_id: int, usuario_id: str):
    """🔒 Função de segurança: Verifica se a conta pertence ao utilizador logado"""
    cursor.execute("SELECT id FROM contas_instagram WHERE id = %s AND usuario_id = %s", (conta_id, usuario_id))
    if not cursor.fetchone():
        raise HTTPException(status_code=403, detail="Acesso negado: Esta conta não lhe pertence.")

@router.get("/")
def listar_horarios(conta_id: int, usuario_id: str = Depends(obter_usuario_atual)): # 🔒 EXIGE TOKEN
    conn = conectar_banco()
    cursor = conn.cursor(dictionary=True)
    
    try:
        verificar_dono_da_conta(cursor, conta_id, usuario_id) # 🔒 Verifica se tem permissão
        
        cursor.execute("SELECT * FROM horarios_padrao WHERE conta_id = %s ORDER BY dia_semana, horario", (conta_id,))
        horarios = cursor.fetchall()
        for h in horarios:
            h['horario'] = str(h['horario'])
            
        return {"status": "sucesso", "horarios": horarios}
    finally:
        cursor.close()
        conn.close()

@router.post("/")
def adicionar_horario(
    dia_semana: int = Form(...), 
    horario: str = Form(...), 
    conta_id: int = Form(...),
    usuario_id: str = Depends(obter_usuario_atual) # 🔒 EXIGE TOKEN
):
    conn = conectar_banco()
    cursor = conn.cursor()
    
    try:
        verificar_dono_da_conta(cursor, conta_id, usuario_id) # 🔒 Verifica se tem permissão
        
        cursor.execute("INSERT INTO horarios_padrao (dia_semana, horario, conta_id) VALUES (%s, %s, %s)", (dia_semana, horario, conta_id))
        conn.commit()
        return {"status": "sucesso"}
    finally:
        cursor.close()
        conn.close()

@router.delete("/{id_horario}")
def apagar_horario(id_horario: int, usuario_id: str = Depends(obter_usuario_atual)): # 🔒 EXIGE TOKEN
    conn = conectar_banco()
    cursor = conn.cursor(dictionary=True)
    
    try:
        # 🔒 Procura o horário MAS cruzando com o ID do cliente logado para evitar invasões
        comando_busca = """
            SELECT h.id 
            FROM horarios_padrao h
            JOIN contas_instagram c ON h.conta_id = c.id
            WHERE h.id = %s AND c.usuario_id = %s
        """
        cursor.execute(comando_busca, (id_horario, usuario_id))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Horário não encontrado ou sem permissão para apagar.")

        cursor.execute("DELETE FROM horarios_padrao WHERE id = %s", (id_horario,))
        conn.commit()
        return {"status": "sucesso"}
    finally:
        cursor.close()
        conn.close()
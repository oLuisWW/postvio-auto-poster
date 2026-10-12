from fastapi import APIRouter, Form
from database import conectar_banco

router = APIRouter()

@router.get("/")
def listar_horarios(conta_id: int = 1):
    conn = conectar_banco()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM horarios_padrao WHERE conta_id = %s ORDER BY dia_semana, horario", (conta_id,))
    horarios = cursor.fetchall()
    for h in horarios:
        h['horario'] = str(h['horario'])
    cursor.close()
    conn.close()
    return {"status": "sucesso", "horarios": horarios}

@router.post("/")
def adicionar_horario(dia_semana: int = Form(...), horario: str = Form(...), conta_id: int = Form(...)):
    conn = conectar_banco()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO horarios_padrao (dia_semana, horario, conta_id) VALUES (%s, %s, %s)", (dia_semana, horario, conta_id))
    conn.commit()
    cursor.close()
    conn.close()
    return {"status": "sucesso"}

@router.delete("/{id_horario}")
def apagar_horario(id_horario: int):
    conn = conectar_banco()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM horarios_padrao WHERE id = %s", (id_horario,))
    conn.commit()
    cursor.close()
    conn.close()
    return {"status": "sucesso"}
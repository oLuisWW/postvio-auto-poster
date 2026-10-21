from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import os
from apscheduler.schedulers.background import BackgroundScheduler
from dotenv import load_dotenv

# --- Importações do seu projeto ---
from database import conectar_banco  # Necessário para aceder à BD no login/registo
from servicos.motor_publicacao import iniciar_motor_em_segundo_plano
from servicos.auth import obter_hash_senha, verificar_senha, criar_token_acesso

# Importar as rotas e serviços refatorados
from rotas import contas, agendamentos, horarios
from servicos.motor import verificar_e_publicar_videos

load_dotenv()

app = FastAPI()

# -------------------------------------------------------------------
# CONFIGURAÇÕES DE SEGURANÇA (JWT)
# Diz ao FastAPI onde os clientes vão fazer login para receber o token
# -------------------------------------------------------------------
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# Modelo para validar os dados de Registo
class UsuarioRegisto(BaseModel):
    nome: str
    email: str
    senha: str

# -------------------------------------------------------------------

@app.on_event("startup")
def startup_event():
    iniciar_motor_em_segundo_plano()

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# --- CORREÇÃO DO CORS AQUI ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:8000",
        "https://postvio-auto-poster.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# -----------------------------

# ===================================================================
# ROTAS DE AUTENTICAÇÃO (SaaS)
# ===================================================================

@app.post("/registrar", tags=["Autenticação"])
def registrar_usuario(usuario: UsuarioRegisto):
    conn = conectar_banco()
    cursor = conn.cursor(dictionary=True)
    
    # Verifica se o email já existe
    cursor.execute("SELECT id FROM usuarios WHERE email = %s", (usuario.email,))
    if cursor.fetchone():
        cursor.close()
        conn.close()
        raise HTTPException(status_code=400, detail="Este email já está registado.")
    
    # Encripta a senha antes de guardar
    senha_encriptada = obter_hash_senha(usuario.senha)
    
    cursor.execute(
        "INSERT INTO usuarios (nome, email, senha_hash) VALUES (%s, %s, %s)",
        (usuario.nome, usuario.email, senha_encriptada)
    )
    conn.commit()
    cursor.close()
    conn.close()
    
    return {"status": "sucesso", "mensagem": "Conta criada com sucesso!"}


@app.post("/login", tags=["Autenticação"])
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    conn = conectar_banco()
    cursor = conn.cursor(dictionary=True)
    
    # Procura o utilizador pelo email (no formulário OAuth2, o email entra no campo 'username')
    cursor.execute("SELECT * FROM usuarios WHERE email = %s", (form_data.username,))
    usuario = cursor.fetchone()
    cursor.close()
    conn.close()
    
    # Verifica se encontrou o utilizador e se a senha bate certo
    if not usuario or not verificar_senha(form_data.password, usuario['senha_hash']):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou palavra-passe incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Gera o Token JWT com o ID do utilizador (o "sub" é o subject, o ID do dono da conta)
    token = criar_token_acesso(dados={"sub": str(usuario['id'])})
    
    return {"access_token": token, "token_type": "bearer", "nome": usuario['nome']}

# ===================================================================

# Registar os ficheiros de rotas isolados
app.include_router(contas.router, prefix="/contas", tags=["Contas"])
app.include_router(agendamentos.router, prefix="/agendar", tags=["Agendamentos"])
app.include_router(horarios.router, prefix="/horarios", tags=["Horários"])

@app.get("/")
def ler_raiz():
    return {"status": "sucesso", "mensagem": "API Multi-Contas do Postvio rodando!"}


# Iniciar o motor de publicação em segundo plano
agendador = BackgroundScheduler()
agendador.add_job(verificar_e_publicar_videos, 'interval', minutes=1)
agendador.start()
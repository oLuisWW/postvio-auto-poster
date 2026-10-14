from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from apscheduler.schedulers.background import BackgroundScheduler
from dotenv import load_dotenv
from servicos.motor_publicacao import iniciar_motor_em_segundo_plano

# Importar as rotas e serviços refatorados
from rotas import contas, agendamentos, horarios
from servicos.motor import verificar_e_publicar_videos

load_dotenv()

app = FastAPI()

@app.on_event("startup")
def startup_event():
    iniciar_motor_em_segundo_plano()

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
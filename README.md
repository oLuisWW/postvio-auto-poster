Postvio 🚀

O Postvio é um sistema profissional de gestão e agendamento automático de vídeos para redes sociais. Desenhado com uma arquitetura de Auto-Queue (Fila Automática), permite o upload em massa de vídeos, distribuindo-os de forma inteligente por uma grade de horários predefinida.

🌟 Funcionalidades Principais

Upload em Massa (Bulk Upload): Envie dezenas de vídeos simultaneamente.

Auto-Queue Inteligente: Sistema anti-colisão que calcula e distribui vídeos pelos próximos espaços vazios na agenda.

Gestão de Miniaturas (Thumbnails): Suporte para anexar capas personalizadas a vídeos individuais ou em massa.

Dashboard Dinâmico: Interface moderna construída em React para gestão da fila de publicação.

Motor Assíncrono: Backend em Python que verifica a base de dados e publica conteúdos em segundo plano.

🛠️ Tecnologias Utilizadas

Frontend: React, Vite, Tailwind CSS

Backend: Python, FastAPI, Uvicorn, APScheduler

Base de Dados: MySQL

🚀 Como Executar o Projeto Localmente

1. Base de Dados

Crie uma base de dados no MySQL chamada postvio e execute as tabelas postagens e horarios_padrao.

2. Iniciar o Backend (Terminal 1)

# Ativar ambiente virtual
venv\Scripts\activate  # (No Windows)
# Instalar dependências (caso seja a primeira vez)
pip install fastapi uvicorn mysql-connector-python python-multipart apscheduler
# Iniciar o servidor
uvicorn main:app --reload


3. Iniciar o Frontend (Terminal 2)

# Instalar dependências
npm install
# Iniciar o servidor de desenvolvimento
npm run dev

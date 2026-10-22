# Usa uma versão leve do Python
FROM python:3.13-slim

# Instala o motor de vídeo FFmpeg
RUN apt-get update && apt-get install -y ffmpeg

# Define a pasta de trabalho
WORKDIR /app

# Copia e instala as dependências do Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia o resto do código
COPY . .

# Expõe a porta que o Render exige
EXPOSE 10000

# Comando para iniciar o servidor
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "10000"]
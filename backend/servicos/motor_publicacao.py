import time
import os
import subprocess
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from instagrapi import Client
from database import conectar_banco
from moviepy.editor import VideoFileClip

def otimizar_video_para_instagram(caminho_original):
    diretorio, nome_ficheiro = os.path.split(caminho_original)
    nome_base, _ = os.path.splitext(nome_ficheiro)
    caminho_otimizado = os.path.join(diretorio, f"otimizado_{nome_base}.mp4")

    # MENSAGEM NOVA PARA CONFIRMARMOS QUE ATUALIZOU
    print(f"🎬 A aplicar Otimizador Premium (CRF 17 + Max 8M + Nível 4.1)...")

    # Comando Premium: Ajustado milimetricamente para o algoritmo do Instagram Reels
    comando = [
        "ffmpeg", "-y", "-i", caminho_original,
        "-vf", "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2",
        "-c:v", "libx264", "-crf", "17", 
        "-maxrate", "8M", "-bufsize", "16M", 
        "-preset", "slow", "-profile:v", "high", "-level", "4.1", 
        "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-r", "30",
        caminho_otimizado
    ]

    try:
        subprocess.run(comando, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        print("✅ Vídeo padronizado com Qualidade Premium!")
        return caminho_otimizado
    except Exception as e:
        print(f"⚠️ Erro ao otimizar: {str(e)}. A enviar original...")
        return caminho_original

    try:
        # Executa o FFmpeg de forma silenciosa
        subprocess.run(comando, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        print("✅ Vídeo perfeitamente padronizado para os servidores do Instagram!")
        return caminho_otimizado
    except Exception as e:
        print(f"⚠️ Erro ao otimizar com FFmpeg: {str(e)}. A enviar original por precaução...")
        return caminho_original

def verificar_e_publicar():
    agora = datetime.now()
    agora_str = agora.strftime("%Y-%m-%d %H:%M:%S")
    
    print(f"[{agora_str}] 🔍 A verificar Fila de Publicação...")

    try:
        conn = conectar_banco()
        cursor = conn.cursor(dictionary=True)

        comando = """
            SELECT p.*, c.usuario_ig, c.senha 
            FROM postagens p
            JOIN contas_instagram c ON p.conta_id = c.id
            WHERE p.status = 'PENDENTE' AND p.data_hora_agendamento <= %s
        """
        cursor.execute(comando, (agora_str,))
        videos_para_publicar = cursor.fetchall()

        for video in videos_para_publicar:
            print(f"🚀 Iniciando processamento do vídeo {video['id']} para a conta @{video['usuario_ig']}...")

            try:
                # 1. Otimizar o vídeo antes de enviar
                video_para_enviar = otimizar_video_para_instagram(video['caminho_video'])

                # 2. Iniciar o Cliente do Instagram e configurar Disfarce
                cl = Client()
                cl.set_device({
                    "android_version": 33,
                    "android_release": "13.0",
                    "manufacturer": "Samsung",
                    "device": "SM-S908B",
                    "model": "b0q",
                    "cpu": "exynos2200"
                })
                cl.set_timezone_offset(-10800)
                cl.set_locale('pt_BR')

                # Tratamento de segurança para evitar erro "NoneType"
                senha_conta = video['senha'] if video['senha'] else ""
                legenda_post = video['legenda'] if video['legenda'] else ""

                if len(senha_conta) < 5:
                    raise Exception("A conta não tem uma Chave de Autenticação (Session ID) válida na base de dados.")

                # Autenticação por Session ID ou Senha
                if len(senha_conta) > 30 and "%" in senha_conta:
                    print("🔐 A usar autenticação blindada por Session ID...")
                    cl.login_by_sessionid(senha_conta)
                else:
                    print("🔑 A usar autenticação padrão por senha...")
                    cl.login(video['usuario_ig'], senha_conta)

                # 3. Publicar o Vídeo Otimizado como Reels
                print("A enviar ficheiro para o Instagram...")
                
                if video.get('caminho_capa'):
                    cl.clip_upload(video_para_enviar, legenda_post, thumbnail=video['caminho_capa'])
                else:
                    cl.clip_upload(video_para_enviar, legenda_post)

                # 4. Atualizar a base de dados para CONCLUIDO
                cursor.execute("UPDATE postagens SET status = 'CONCLUIDO' WHERE id = %s", (video['id'],))
                conn.commit()
                print(f"✅ Vídeo {video['id']} publicado com sucesso no Instagram!")

            except Exception as e:
                print(f"❌ Erro ao publicar vídeo {video['id']}: {str(e)}")
                cursor.execute("UPDATE postagens SET status = 'ERRO' WHERE id = %s", (video['id'],))
                conn.commit()

        cursor.close()
        conn.close()

    except Exception as e:
        print(f"Erro no motor de verificação: {str(e)}")

def iniciar_motor_em_segundo_plano():
    scheduler = BackgroundScheduler()
    scheduler.add_job(verificar_e_publicar, 'interval', minutes=1)
    scheduler.start()
    print("⚙️ Motor de Publicação Automática Iniciado (Com Otimizador de Qualidade).")
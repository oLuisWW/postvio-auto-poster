import os
import subprocess
from datetime import datetime, timedelta
from apscheduler.schedulers.background import BackgroundScheduler
from instagrapi import Client
from database import conectar_banco

# --- FUNÇÃO RECUPERADA PARA A GRADE DE HORÁRIOS ---
def obter_proximo_horario_livre(conta_id):
    conn = conectar_banco()
    cursor = conn.cursor(dictionary=True)
    
    cursor.execute("SELECT dia_semana, horario FROM horarios_padrao WHERE conta_id = %s ORDER BY dia_semana, horario", (conta_id,))
    grade = cursor.fetchall()
    
    if not grade:
        return None
        
    cursor.execute("SELECT data_hora_agendamento FROM postagens WHERE status = 'PENDENTE' AND conta_id = %s", (conta_id,))
    ocupados_db = cursor.fetchall()
    horarios_ocupados = [o['data_hora_agendamento'].strftime('%Y-%m-%d %H:%M:%S') for o in ocupados_db]
    
    agora = datetime.now()
    
    for i in range(365):
        data_teste = agora.date() + timedelta(days=i)
        dia_semana_teste = data_teste.weekday()
        
        for g in grade:
            if g['dia_semana'] == dia_semana_teste:
                segundos = g['horario'].total_seconds()
                horas = int(segundos // 3600)
                minutos = int((segundos % 3600) // 60)
                
                data_hora_candidata = datetime(data_teste.year, data_teste.month, data_teste.day, horas, minutos, 0)
                str_candidata = data_hora_candidata.strftime('%Y-%m-%d %H:%M:%S')
                
                if data_hora_candidata > agora and str_candidata not in horarios_ocupados:
                    cursor.close()
                    conn.close()
                    return str_candidata

    cursor.close()
    conn.close()
    return None

# --- MOTOR DE PUBLICAÇÃO E OTIMIZADOR ---
def otimizar_video_para_instagram(caminho_original):
    diretorio, nome_ficheiro = os.path.split(caminho_original)
    nome_base, _ = os.path.splitext(nome_ficheiro)
    caminho_otimizado = os.path.join(diretorio, f"otimizado_{nome_base}.mp4")

    print(f"🎬 A aplicar Otimizador Premium (CRF 17 + Max 8M + Nível 4.1)...")

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
        print("✅ Vídeo perfeitamente padronizado para os servidores do Instagram!")
        return caminho_otimizado
    except Exception as e:
        print(f"⚠️ Erro ao otimizar com FFmpeg: {str(e)}. A enviar original por precaução...")
        return caminho_original

def verificar_e_publicar():
    agora = datetime.now()
    agora_str = agora.strftime("%Y-%m-%d %H:%M:%S")
    # Trava de segurança: vídeos marcados para há mais de 30 minutos atrás são bloqueados
    limite_atraso = agora - timedelta(minutes=30)
    
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
            # Verifica se o vídeo está muito atrasado e manda-o para a nova aba do painel
            if video['data_hora_agendamento'] < limite_atraso:
                print(f"⚠️ Vídeo {video['id']} ignorado pois está mais de 30 minutos atrasado. Marcando como ATRASADO.")
                cursor.execute("UPDATE postagens SET status = 'ATRASADO' WHERE id = %s", (video['id'],))
                conn.commit()
                continue

            print(f"🚀 Iniciando processamento do vídeo {video['id']} para a conta @{video['usuario_ig']}...")

            try:
                DIRETORIO_BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
                caminho_db = video['caminho_video']
                if not os.path.isabs(caminho_db):
                    caminho_video_absoluto = os.path.join(DIRETORIO_BASE, caminho_db)
                else:
                    caminho_video_absoluto = caminho_db

                video_para_enviar = otimizar_video_para_instagram(caminho_video_absoluto)

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

                senha_conta = video['senha'] if video['senha'] else ""
                legenda_post = video['legenda'] if video['legenda'] else ""

                if len(senha_conta) < 5:
                    raise Exception("A conta não tem uma Chave de Autenticação (Session ID) válida.")

                if len(senha_conta) > 30 and "%" in senha_conta:
                    print("🔐 A usar autenticação blindada por Session ID...")
                    cl.login_by_sessionid(senha_conta)
                else:
                    print("🔑 A usar autenticação padrão por senha...")
                    cl.login(video['usuario_ig'], senha_conta)

                print("A enviar ficheiro para o Instagram...")
                
                caminho_capa_absoluto = None
                if video.get('caminho_capa'):
                    if not os.path.isabs(video['caminho_capa']):
                        caminho_capa_absoluto = os.path.join(DIRETORIO_BASE, video['caminho_capa'])
                    else:
                        caminho_capa_absoluto = video['caminho_capa']
                    
                    cl.clip_upload(video_para_enviar, legenda_post, thumbnail=caminho_capa_absoluto)
                else:
                    cl.clip_upload(video_para_enviar, legenda_post)

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
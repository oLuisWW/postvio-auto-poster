import time
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from instagrapi import Client
from database import conectar_banco

def verificar_e_publicar():
    agora = datetime.now()
    agora_str = agora.strftime("%Y-%m-%d %H:%M:%S")
    
    print(f"[{agora_str}] 🔍 A verificar Fila de Publicação...")

    try:
        conn = conectar_banco()
        cursor = conn.cursor(dictionary=True)

        # Procura vídeos que estão PENDENTES e cuja hora de agendamento já passou ou é exatamente agora
        comando = """
            SELECT p.*, c.usuario_ig, c.senha 
            FROM postagens p
            JOIN contas_instagram c ON p.conta_id = c.id
            WHERE p.status = 'PENDENTE' AND p.data_hora_agendamento <= %s
        """
        cursor.execute(comando, (agora_str,))
        videos_para_publicar = cursor.fetchall()

        for video in videos_para_publicar:
            print(f"🚀 Iniciando publicação do vídeo {video['id']} para a conta @{video['usuario_ig']}...")

            try:
                # 1. Iniciar o Cliente do Instagram e configurar Disfarce
                cl = Client()
                
                # --- INÍCIO DO DISFARCE ANTI-BLOQUEIO ---
                cl.set_device({
                    "android_version": 33,
                    "android_release": "13.0",
                    "manufacturer": "Samsung",
                    "device": "SM-S908B",
                    "model": "b0q",
                    "cpu": "exynos2200"
                })
                cl.set_timezone_offset(-10800) # Ajuste para o fuso horário do Brasil (-3h)
                cl.set_locale('pt_BR')
                # --- FIM DO DISFARCE ---

                # INTELIGÊNCIA DO SAAS: Se o texto for longo e tiver '%', é um Session ID. Se não, tenta a senha normal.
                if len(video['senha']) > 30 and "%" in video['senha']:
                    print("🔐 A usar autenticação blindada por Session ID...")
                    cl.login_by_sessionid(video['senha'])
                else:
                    print("🔑 A usar autenticação padrão por senha...")
                    cl.login(video['usuario_ig'], video['senha'])

                # 2. Publicar o Vídeo como Reels
                print("A enviar ficheiro para o Instagram (pode demorar alguns segundos)...")
                
                # Se tiver capa, envia com capa. Se não, envia sem capa.
                if video['caminho_capa']:
                    cl.clip_upload(video['caminho_video'], video['legenda'], thumbnail=video['caminho_capa'])
                else:
                    cl.clip_upload(video['caminho_video'], video['legenda'])

                # 3. Atualizar a base de dados para CONCLUIDO
                cursor.execute("UPDATE postagens SET status = 'CONCLUIDO' WHERE id = %s", (video['id'],))
                conn.commit()
                print(f"✅ Vídeo {video['id']} publicado com sucesso no Instagram!")

            except Exception as e:
                print(f"❌ Erro ao publicar vídeo {video['id']}: {str(e)}")
                # Se der erro, marcamos como ERRO para não ficar em loop infinito
                cursor.execute("UPDATE postagens SET status = 'ERRO' WHERE id = %s", (video['id'],))
                conn.commit()

        cursor.close()
        conn.close()

    except Exception as e:
        print(f"Erro no motor de verificação: {str(e)}")

# Esta função liga o motor quando iniciamos a nossa API
def iniciar_motor_em_segundo_plano():
    scheduler = BackgroundScheduler()
    # Manda executar a função verificar_e_publicar a cada 1 minuto
    scheduler.add_job(verificar_e_publicar, 'interval', minutes=1)
    scheduler.start()
    print("⚙️ Motor de Publicação Automática Iniciado (Verificando a cada 1 min).")
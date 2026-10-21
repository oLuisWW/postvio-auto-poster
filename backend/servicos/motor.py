from database import conectar_banco
from datetime import datetime, timedelta
from moviepy.editor import VideoFileClip

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

def verificar_e_publicar_videos():
    try:
        conn = conectar_banco()
        cursor = conn.cursor(dictionary=True)
        
        agora = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        comando = "SELECT id, caminho_video, conta_id FROM postagens WHERE status = 'PENDENTE' AND data_hora_agendamento <= %s"
        cursor.execute(comando, (agora,))
        videos_prontos = cursor.fetchall()
        
        for video in videos_prontos:
            print(f"🔄 A iniciar publicação do vídeo ID: {video['id']} (Conta: {video['conta_id']})")
            # Integração com a API do Instagram entrará aqui
            cursor.execute("UPDATE postagens SET status = 'CONCLUIDO' WHERE id = %s", (video['id'],))
            conn.commit()
            print(f"✅ Vídeo ID: {video['id']} publicado com sucesso!")
            
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Erro no motor automático: {e}")
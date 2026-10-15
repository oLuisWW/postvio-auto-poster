from fastapi import APIRouter, Form, UploadFile, File, HTTPException
import shutil
import os
from database import conectar_banco
from instagrapi import Client

router = APIRouter()

@router.post("/")
async def adicionar_conta(
    nome_perfil: str = Form(...),
    usuario_ig: str = Form(...),
    senha: str = Form(...), 
    foto_perfil: UploadFile = File(None)
):
    caminho_foto = None
    if foto_perfil and foto_perfil.filename:
        caminho_foto = f"uploads/perfil_{foto_perfil.filename}"
        with open(caminho_foto, "wb") as buffer:
            shutil.copyfileobj(foto_perfil.file, buffer)

    # --- AUTOMAÇÃO INTELIGENTE DE LOGIN (SaaS Level) ---
    session_id_capturado = senha # Por predefinição assume o que o utilizador digitou (caso seja um sessionid manual)
    
    # Se o utilizador digitou uma senha normal (menos de 30 caracteres ou sem '%'), tentamos autenticar e capturar o cookie
    if len(senha) < 30 or "%" not in senha:
        print(f"🔄 A tentar login automático para @{usuario_ig} para capturar o Session ID...")
        try:
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
            
            # Tenta o login com a senha fornecida
            cl.login(usuario_ig, senha)
            
            # Se deu certo, extrai o sessionid gerado pela sessão
            cookies = cl.get_settings().get("cookies", {})
            session_id_capturado = cookies.get("sessionid")
            
            if not session_id_capturado:
                raise Exception("Não foi possível extrair o token de sessão.")
                
            print(f"✅ Login bem-sucedido! Session ID capturado com sucesso para @{usuario_ig}.")
            
        except Exception as e:
            # 🔥 IMPRIME O ERRO COMPLETO NO TERMINAL PARA DEPURAÇÃO
            print(f"🔥 ERRO DETALHADO DO INSTAGRAM: {str(e)}")
            
            # Se falhar o login por senha, limpa a foto enviada
            if caminho_foto and os.path.exists(caminho_foto):
                os.remove(caminho_foto)
            
            erro_msg = str(e)
            if "bad_password" in erro_msg.lower():
                raise HTTPException(status_code=400, detail="Palavra-passe incorreta.")
            elif "challenge_required" in erro_msg.lower():
                raise HTTPException(status_code=400, detail="O Instagram exigiu verificação de segurança (2FA / Desafio). Tente usar o Session ID manual para esta conta.")
            else:
                raise HTTPException(status_code=400, detail=f"Erro ao autenticar no Instagram: {erro_msg}")

    # Guardar na base de dados o session_id blindado (ou a senha se o utilizador passou manualmente)
    try:
        conn = conectar_banco()
        cursor = conn.cursor()
        comando = "INSERT INTO contas_instagram (nome_perfil, usuario_ig, senha, foto_perfil) VALUES (%s, %s, %s, %s)"
        cursor.execute(comando, (nome_perfil, usuario_ig, session_id_capturado, caminho_foto))
        conn.commit()
        cursor.close()
        conn.close()

        return {"status": "sucesso", "mensagem": "Conta adicionada e autenticada com sucesso!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/")
def listar_contas():
    try:
        conn = conectar_banco()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT id, nome_perfil, usuario_ig, foto_perfil FROM contas_instagram") # Omitimos a 'senha' por segurança na API!
        contas = cursor.fetchall()
        cursor.close()
        conn.close()
        return {"status": "sucesso", "contas": contas}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{conta_id}")
def apagar_conta(conta_id: int):
    try:
        conn = conectar_banco()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("SELECT foto_perfil FROM contas_instagram WHERE id = %s", (conta_id,))
        conta = cursor.fetchone()
        
        cursor.execute("DELETE FROM contas_instagram WHERE id = %s", (conta_id,))
        conn.commit()
        cursor.close()
        conn.close()
        
        if conta and conta['foto_perfil'] and os.path.exists(conta['foto_perfil']):
            os.remove(conta['foto_perfil'])
            
        return {"status": "sucesso", "mensagem": "Conta apagada com sucesso!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
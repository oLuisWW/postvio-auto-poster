from datetime import datetime, timedelta
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext
import jwt

# Configurações de Segurança do SaaS
SECRET_KEY = "postvio_chave_mestra_super_secreta_mudar_em_producao"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # Login dura 7 dias

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# O nosso verificador de tokens (diz que o login é feito na rota /login)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def verificar_senha(senha_plana, senha_hash):
    return pwd_context.verify(senha_plana, senha_hash)

def obter_hash_senha(senha):
    return pwd_context.hash(senha)

def criar_token_acesso(dados: dict):
    ao_codificar = dados.copy()
    expiracao = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    ao_codificar.update({"exp": expiracao})
    token_codificado = jwt.encode(ao_codificar, SECRET_KEY, algorithm=ALGORITHM)
    return token_codificado

def obter_usuario_atual(token: str = Depends(oauth2_scheme)):
    """
    O Segurança: Pega no token enviado pelo frontend, decodifica,
    verifica se não expirou e devolve o ID do dono da conta.
    """
    erro_credenciais = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Acesso negado. Token inválido ou expirado.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Tenta abrir o token com a nossa chave secreta
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        usuario_id: str = payload.get("sub") # 'sub' é onde guardámos o ID no login
        
        if usuario_id is None:
            raise erro_credenciais
            
        return usuario_id # Devolve o ID (ex: "1", "2") para sabermos quem está a mexer
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="O seu login expirou. Inicie sessão novamente.")
    except jwt.InvalidTokenError:
        raise erro_credenciais
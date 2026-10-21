from database import conectar_banco

def instalar():
    conn = conectar_banco()
    cursor = conn.cursor()

    tabelas = [
        """
        CREATE TABLE IF NOT EXISTS usuarios (
            id VARCHAR(36) PRIMARY KEY,
            nome VARCHAR(100) NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            senha VARCHAR(255) NOT NULL
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS contas_instagram (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nome_perfil VARCHAR(100),
            usuario_ig VARCHAR(100) NOT NULL,
            senha TEXT NOT NULL,
            foto_perfil VARCHAR(255),
            usuario_id VARCHAR(36),
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS postagens (
            id INT AUTO_INCREMENT PRIMARY KEY,
            caminho_video VARCHAR(255) NOT NULL,
            caminho_capa VARCHAR(255),
            legenda TEXT,
            data_hora_agendamento DATETIME NOT NULL,
            status VARCHAR(50) DEFAULT 'PENDENTE',
            conta_id INT,
            FOREIGN KEY (conta_id) REFERENCES contas_instagram(id) ON DELETE CASCADE
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS horarios_padrao (
            id INT AUTO_INCREMENT PRIMARY KEY,
            dia_semana INT NOT NULL,
            horario TIME NOT NULL,
            conta_id INT,
            FOREIGN KEY (conta_id) REFERENCES contas_instagram(id) ON DELETE CASCADE
        )
        """
    ]

    for comando in tabelas:
        cursor.execute(comando)
        
    conn.commit()
    cursor.close()
    conn.close()
    print("✅ Base de dados na nuvem instalada e pronta para o Postvio!")

if __name__ == "__main__":
    instalar()
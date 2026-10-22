import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import UploadMassa from './components/UploadMassa';
import GradeHorarios from './components/GradeHorarios';
import GerirContas from './components/GerirContas'; 
import Auth from './components/Auth'; // 🔒 Importamos a nova página de Login

function App() {
  // --- ESTADOS DE SEGURANÇA ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [abaAtiva, setAbaAtiva] = useState('dashboard');
  const [contas, setContas] = useState([]);
  const [contaAtiva, setContaAtiva] = useState(null); // Iniciamos nulo até carregar as contas

  // 1. Verifica se o cliente já tem a "chave" guardada no navegador ao abrir o site
  useEffect(() => {
    const token = localStorage.getItem('postvio_token');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  // 2. Só tenta carregar as contas se o cliente estiver logado
  useEffect(() => {
    if (isAuthenticated) {
      carregarContas();
    }
  }, [isAuthenticated]);

  const carregarContas = async () => {
    try {
      const token = localStorage.getItem('postvio_token');
      
      const resposta = await fetch('https://postvio-auto-poster.onrender.com/contas/', {
        headers: {
          'Authorization': `Bearer ${token}` // 🔑 A MAGIA DO SAAS: Enviamos o token para o backend
        }
      });

      // Se o backend disser "Acesso Negado" (ex: token expirou), fazemos logout automático
      if (resposta.status === 401) {
        handleLogout();
        return;
      }

      const dados = await resposta.json();
      if (dados.status === 'sucesso') {
        setContas(dados.contas);
        if (dados.contas.length > 0) {
          setContaAtiva(dados.contas[0].id);
        }
      }
    } catch (erro) {
      console.error("Erro ao carregar contas:", erro);
    }
  };

  // Função para terminar a sessão
  const handleLogout = () => {
    localStorage.removeItem('postvio_token');
    localStorage.removeItem('postvio_user');
    setIsAuthenticated(false);
  };

  // 🛑 O PORTEIRO: Se não tiver sessão, mostra APENAS o Login
  if (!isAuthenticated) {
    return <Auth onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  // ✅ Se passou do porteiro, mostra a plataforma completa!
  return (
    <div className="flex bg-gray-100 min-h-screen font-sans">
      <Sidebar
        abaAtiva={abaAtiva}
        setAbaAtiva={setAbaAtiva}
        contas={contas}
        contaAtiva={contaAtiva}
        setContaAtiva={setContaAtiva}
        onLogout={handleLogout} // Passamos a função de logout para usar na Sidebar depois
      />

      <div className="ml-72 flex-1 p-10 bg-gray-50 min-h-screen">
        
        {abaAtiva === 'dashboard' && (
          <Dashboard contaAtiva={contaAtiva} />
        )}
        
        {abaAtiva === 'upload' && (
          <UploadMassa contaAtiva={contaAtiva} />
        )}
        
        {abaAtiva === 'horarios' && (
          <GradeHorarios contaAtiva={contaAtiva} />
        )}
        
        {abaAtiva === 'contas' && (
          <GerirContas contaAtiva={contaAtiva} setContaAtiva={setContaAtiva} />
        )}
      </div>
    </div>
  );
}

export default App;
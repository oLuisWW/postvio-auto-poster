import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';

import Dashboard from './components/Dashboard';
import UploadMassa from './components/UploadMassa';
import GradeHorarios from './components/GradeHorarios';
import GerirContas from './components/GerirContas'; 

function App() {
  const [abaAtiva, setAbaAtiva] = useState('dashboard');
  const [contas, setContas] = useState([]);
  const [contaAtiva, setContaAtiva] = useState(1);

  useEffect(() => {
    carregarContas();
  }, []);

  const carregarContas = async () => {
    try {
      const resposta = await fetch('http://localhost:8000/contas/');
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

  return (
    <div className="flex bg-gray-100 min-h-screen font-sans">
      <Sidebar
        abaAtiva={abaAtiva}
        setAbaAtiva={setAbaAtiva}
        contas={contas}
        contaAtiva={contaAtiva}
        setContaAtiva={setContaAtiva}
      />

      <div className="ml-72 flex-1 p-10 bg-gray-50 min-h-screen">
        
        {/* O Dashboard agora tem TUDO: Estatísticas no topo e os vídeos em baixo */}
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
import React, { useState, useEffect } from 'react';

function VisaoGeral({ contaAtiva, contas }) {
  const [estatisticas, setEstatisticas] = useState({
    pendentes: 0,
    concluidos: 0,
    proximaData: null,
    proximaLegenda: ''
  });

  useEffect(() => {
    if (contaAtiva) {
      carregarDados();
    }
  }, [contaAtiva]);

  const carregarDados = async () => {
    try {
      // Usamos a mesma rota da fila para fazer a matemática no frontend sem pesar o backend
      const resposta = await fetch(`postvio-auto-poster-production.up.railway.app/agendar/fila/?conta_id=${contaAtiva}`);
      const dados = await resposta.json();

      if (dados.status === 'sucesso') {
        const fila = dados.fila;
        const pendentes = fila.filter(v => v.status === 'PENDENTE');
        const concluidos = fila.filter(v => v.status === 'CONCLUIDO');

        // Como o backend já devolve a fila ordenada por data, o primeiro pendente é o próximo vídeo a sair
        const proxima = pendentes.length > 0 ? pendentes[0] : null;

        setEstatisticas({
          pendentes: pendentes.length,
          concluidos: concluidos.length,
          proximaData: proxima ? proxima.data_hora_agendamento : null,
          proximaLegenda: proxima ? proxima.legenda : ''
        });
      }
    } catch (erro) {
      console.error("Erro ao carregar estatísticas:", erro);
    }
  };

  // Encontra os detalhes da conta ativa para personalizar o painel
  const contaAtual = contas.find(c => c.id === contaAtiva);

  return (
    <div className="max-w-6xl mx-auto flex flex-col h-full">
      
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">
            Visão Geral {contaAtual && <span className="text-blue-600">@{contaAtual.usuario_ig}</span>}
          </h2>
          <p className="text-gray-500 mt-2">Bem-vindo ao Postvio. Aqui está o resumo de desempenho desta conta.</p>
        </div>
      </div>

      {/* Grid de Cartões de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        
        {/* Cartão 1: Vídeos Pendentes */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center transform hover:-translate-y-1 transition-transform">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 font-medium">Na Fila</h3>
            <span className="w-10 h-10 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center text-xl">⏳</span>
          </div>
          <p className="text-4xl font-black text-gray-800">{estatisticas.pendentes}</p>
          <p className="text-sm text-gray-400 mt-2">Vídeos a aguardar publicação</p>
        </div>

        {/* Cartão 2: Vídeos Concluídos */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center transform hover:-translate-y-1 transition-transform">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 font-medium">Publicados</h3>
            <span className="w-10 h-10 rounded-full bg-green-50 text-green-500 flex items-center justify-center text-xl">✅</span>
          </div>
          <p className="text-4xl font-black text-gray-800">{estatisticas.concluidos}</p>
          <p className="text-sm text-gray-400 mt-2">Vídeos já processados</p>
        </div>

        {/* Cartão 3: Contas Geridas */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center transform hover:-translate-y-1 transition-transform">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 font-medium">Contas Ativas</h3>
            <span className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center text-xl">👥</span>
          </div>
          <p className="text-4xl font-black text-gray-800">{contas.length}</p>
          <p className="text-sm text-gray-400 mt-2">Perfis conectados ao Postvio</p>
        </div>

        {/* Cartão 4: Espaço (Fictício para já, para visual de SaaS) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center transform hover:-translate-y-1 transition-transform">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 font-medium">Motor IA</h3>
            <span className="w-10 h-10 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center text-xl">⚡</span>
          </div>
          <p className="text-2xl font-black text-green-500">Operacional</p>
          <p className="text-sm text-gray-400 mt-2">Sistema a correr normalmente</p>
        </div>

      </div>

      {/* Secção de Próxima Ação */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 text-white shadow-lg flex flex-col md:flex-row items-center justify-between">
        <div>
          <h3 className="text-xl font-bold mb-2">Próxima Publicação</h3>
          {estatisticas.proximaData ? (
            <>
              <p className="text-blue-100 text-sm mb-1 line-clamp-1 max-w-lg">"{estatisticas.proximaLegenda}"</p>
              <p className="text-2xl font-black mt-2">
                📅 {new Date(estatisticas.proximaData).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </>
          ) : (
            <p className="text-blue-100">Não tem vídeos agendados para esta conta de momento.</p>
          )}
        </div>
        
        <div className="mt-6 md:mt-0">
          <span className="text-5xl opacity-80">🚀</span>
        </div>
      </div>

    </div>
  );
}

export default VisaoGeral;
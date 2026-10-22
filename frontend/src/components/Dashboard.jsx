import React, { useState, useEffect } from 'react';

function Dashboard({ contaAtiva }) {
  const [fila, setFila] = useState([]);
  const [video, setVideo] = useState(null);
  const [capa, setCapa] = useState(null);
  const [legenda, setLegenda] = useState('');
  
  const [data, setData] = useState('');
  const [hora, setHora] = useState('');
  
  const [mensagem, setMensagem] = useState('');

  useEffect(() => {
    if (contaAtiva) {
      carregarFila();
    }
  }, [contaAtiva]);

  const carregarFila = async () => {
    try {
      const token = localStorage.getItem('postvio_token'); // 🔒 Pega a chave
      
      const resposta = await fetch(`https://postvio-auto-poster.onrender.com/agendar/fila/?conta_id=${contaAtiva}`, {
        headers: {
          'Authorization': `Bearer ${token}` // 🔒 Mostra a chave
        }
      });
      
      if (resposta.status === 401) return; // Se não tiver acesso, ignora (App trata o logout)
      
      const dados = await resposta.json();
      if (dados.status === 'sucesso') {
        setFila(dados.fila);
      }
    } catch (erro) {
      console.error("Erro ao carregar fila:", erro);
    }
  };

  const fazerUploadManual = async (e) => {
    e.preventDefault();
    setMensagem('A carregar...');
    
    const dataHoraFormatada = `${data} ${hora}:00`;
    
    const formData = new FormData();
    formData.append('video', video);
    formData.append('legenda', legenda);
    formData.append('data_hora', dataHoraFormatada);
    formData.append('conta_id', contaAtiva);
    if (capa) {
      formData.append('capa', capa);
    }

    try {
      const token = localStorage.getItem('postvio_token'); // 🔒 Pega a chave
      
      const resposta = await fetch('https://postvio-auto-poster.onrender.com/agendar/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}` // 🔒 Mostra a chave
        },
        body: formData,
      });
      const dados = await resposta.json();
      
      if (dados.status === 'sucesso') {
        setMensagem('✅ Vídeo agendado com sucesso!');
        setVideo(null);
        setCapa(null);
        setLegenda('');
        setData('');
        setHora('');
        
        document.getElementById('input-video').value = '';
        if(document.getElementById('input-capa')) document.getElementById('input-capa').value = '';

        carregarFila();
      } else {
        setMensagem(`❌ Erro: ${dados.detail || 'Falha ao agendar'}`);
      }
    } catch (erro) {
      setMensagem('❌ Erro de conexão ao agendar vídeo.');
    }
  };

  const apagarVideo = async (id) => {
    const confirmacao = window.confirm("Tem certeza que deseja apagar este vídeo permanentemente?");
    if (!confirmacao) return;

    try {
      const token = localStorage.getItem('postvio_token'); // 🔒 Pega a chave
      
      const resposta = await fetch(`https://postvio-auto-poster.onrender.com/agendar/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}` // 🔒 Mostra a chave
        }
      });
      const dados = await resposta.json();
      if (dados.status === 'sucesso') carregarFila();
    } catch (erro) {
      console.error("Erro ao apagar vídeo:", erro);
    }
  };

  const limparConcluidos = async () => {
    const confirmacao = window.confirm("Tem certeza que deseja apagar TODOS os vídeos já concluídos? Esta ação libertará espaço no disco.");
    if (!confirmacao) return;

    try {
      const token = localStorage.getItem('postvio_token'); // 🔒 Pega a chave
      
      const resposta = await fetch(`https://postvio-auto-poster.onrender.com/agendar/concluidos/${contaAtiva}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}` // 🔒 Mostra a chave
        }
      });
      const dados = await resposta.json();
      if (dados.status === 'sucesso') carregarFila();
    } catch (erro) {
      console.error("Erro ao limpar concluídos:", erro);
    }
  };

  // --- ESTATÍSTICAS AUTOMÁTICAS ---
  const temConcluidos = fila.some(item => item.status === 'CONCLUIDO');
  const pendentes = fila.filter(item => item.status === 'PENDENTE');
  const concluidos = fila.filter(item => item.status === 'CONCLUIDO');
  const proxima = pendentes.length > 0 ? pendentes[0] : null;

  return (
    <div className="max-w-6xl mx-auto flex flex-col h-[calc(100vh-100px)] overflow-hidden">
      
      {/* --- NOVA ZONA DE ESTATÍSTICAS NO TOPO --- */}
      <div className="mb-6 shrink-0">
        <h2 className="text-3xl font-bold text-gray-800 mb-4">Painel Principal</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-gray-500 font-medium text-sm mb-1">Na Fila</p>
              <p className="text-3xl font-black text-gray-800">{pendentes.length}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center text-2xl">⏳</div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-gray-500 font-medium text-sm mb-1">Publicados</p>
              <p className="text-3xl font-black text-gray-800">{concluidos.length}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-green-50 text-green-500 flex items-center justify-center text-2xl">✅</div>
          </div>

          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-5 rounded-2xl shadow-sm border border-blue-600 flex items-center justify-between text-white">
            <div>
              <p className="text-blue-100 font-medium text-sm mb-1">Próxima Publicação</p>
              <p className="text-xl font-bold">
                {proxima ? new Date(proxima.data_hora_agendamento).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Nenhuma na fila'}
              </p>
            </div>
            <div className="text-3xl">🚀</div>
          </div>
        </div>
      </div>

      {/* --- A SUA ZONA ORIGINAL DE VÍDEOS --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 min-h-0 overflow-hidden mb-4">
        
        {/* COLUNA ESQUERDA: Upload Manual */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full justify-between overflow-y-auto shrink-0">
          <div>
            <h3 className="text-xl font-semibold mb-5 flex items-center gap-2">
              ⚡ Agendamento Rápido
            </h3>
            <form onSubmit={fazerUploadManual} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vídeo (MP4)</label>
                <input id="input-video" type="file" accept="video/*" onChange={(e) => setVideo(e.target.files[0])} required className="w-full text-sm border p-2 rounded-lg bg-gray-50" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Capa (Opcional)</label>
                <input id="input-capa" type="file" accept="image/*" onChange={(e) => setCapa(e.target.files[0])} className="w-full text-sm border p-2 rounded-lg bg-gray-50" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Legenda</label>
                <textarea value={legenda} onChange={(e) => setLegenda(e.target.value)} required className="w-full border p-3 rounded-lg h-24 bg-gray-50 resize-none" placeholder="Escreva a legenda..."></textarea>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                  <input type="date" value={data} onChange={(e) => setData(e.target.value)} required className="w-full border p-2.5 rounded-lg bg-gray-50 text-gray-700 cursor-pointer" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hora</label>
                  <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} required className="w-full border p-2.5 rounded-lg bg-gray-50 text-gray-700 cursor-pointer" />
                </div>
              </div>

              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors mt-2 shadow-md">
                Agendar Publicação
              </button>
              {mensagem && <p className="text-sm text-center font-medium text-gray-600 mt-2">{mensagem}</p>}
            </form>
          </div>
        </div>

        {/* COLUNA DIREITA: Fila de Vídeos */}
        <div className="lg:col-span-2 h-full flex flex-col overflow-hidden">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col h-full min-h-0 overflow-hidden">
            
            <div className="flex justify-between items-center mb-4 shrink-0">
              <h3 className="text-xl font-semibold">Próximos Vídeos</h3>
              {temConcluidos && (
                <button 
                  onClick={limparConcluidos}
                  className="flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors border border-red-100"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Apagar vídeos já concluídos
                </button>
              )}
            </div>
            
            {fila.length === 0 ? (
              <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl flex-1 flex flex-col justify-center">
                <p>Nenhum vídeo agendado para esta conta.</p>
              </div>
            ) : (
              <div className="space-y-4 overflow-y-auto pr-2 flex-1 min-h-0 scrollbar-thin">
                {fila.map((item) => (
                  <div key={item.id} className="flex gap-4 p-4 border border-gray-100 rounded-xl hover:shadow-md transition-shadow bg-white shrink-0 group">
                    <div className="w-32 h-24 bg-gray-100 rounded-lg overflow-hidden shrink-0 border border-gray-200">
                      {item.caminho_capa ? (
                        <img src={`https://postvio-auto-poster.onrender.com/${item.caminho_capa}`} alt="Capa" className="w-full h-full object-cover" />
                      ) : (
                        <video src={`https://postvio-auto-poster.onrender.com/${item.caminho_video}`} className="w-full h-full object-cover" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                      <div>
                        <div className="flex justify-between items-start">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${item.status === 'PENDENTE' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                            {item.status}
                          </span>
                          <button 
                            onClick={() => apagarVideo(item.id)}
                            className="text-gray-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-all shrink-0"
                            title="Apagar permanentemente"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <p className="mt-2 text-sm text-gray-600 line-clamp-2 break-all">{item.legenda}</p>
                      </div>
                      <p className="text-sm font-semibold text-gray-800 mt-2">
                        📅 {new Date(item.data_hora_agendamento).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default Dashboard;
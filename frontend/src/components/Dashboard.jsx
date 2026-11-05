import React, { useState, useEffect } from 'react';

function Dashboard({ contaAtiva }) {
  const [fila, setFila] = useState([]);
  const [video, setVideo] = useState(null);
  const [capa, setCapa] = useState(null);
  const [legenda, setLegenda] = useState('');
  const [data, setData] = useState('');
  const [hora, setHora] = useState('');
  const [mensagem, setMensagem] = useState('');

  const [idReagendar, setIdReagendar] = useState(null);
  const [novaData, setNovaData] = useState('');
  const [novaHora, setNovaHora] = useState('');

  const [abaAtiva, setAbaAtiva] = useState('pendentes'); // Estado das abas

  useEffect(() => {
    if (contaAtiva) carregarFila();
  }, [contaAtiva]);

  const carregarFila = async () => {
    try {
      const token = localStorage.getItem('postvio_token');
      const resposta = await fetch(`/api/agendar/fila/?conta_id=${contaAtiva}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true'
        }
      });
      if (resposta.status === 401) return;
      
      const dados = await resposta.json();
      if (dados.status === 'sucesso') setFila(dados.fila);
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
    if (capa) formData.append('capa', capa);

    try {
      const token = localStorage.getItem('postvio_token');
      const resposta = await fetch('/api/agendar/', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true'
        },
        body: formData,
      });
      const dados = await resposta.json();
      
      if (dados.status === 'sucesso') {
        setMensagem('✅ Vídeo agendado com sucesso!');
        setVideo(null); setCapa(null); setLegenda(''); setData(''); setHora('');
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
    if (!window.confirm("Tem certeza que deseja apagar este vídeo?")) return;
    try {
      const token = localStorage.getItem('postvio_token');
      const resposta = await fetch(`/api/agendar/${id}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true'
        }
      });
      const dados = await resposta.json();
      if (dados.status === 'sucesso') carregarFila();
    } catch (erro) {
      console.error("Erro ao apagar vídeo:", erro);
    }
  };

  const salvarReagendamento = async (id) => {
    if (!novaData || !novaHora) {
      alert("Preencha a nova data e hora!");
      return;
    }
    try {
      const dataHoraFormatada = `${novaData} ${novaHora}:00`;
      const formData = new URLSearchParams();
      formData.append('nova_data_hora', dataHoraFormatada);

      const token = localStorage.getItem('postvio_token');
      const resposta = await fetch(`/api/agendar/${id}/reagendar`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData
      });
      
      const dados = await resposta.json();
      if (dados.status === 'sucesso') {
        setIdReagendar(null);
        carregarFila();
      } else {
        alert(dados.detail || "Erro ao reagendar");
      }
    } catch (erro) {
      console.error("Erro ao reagendar:", erro);
    }
  };

  const limparConcluidos = async () => {
    if (!window.confirm("Apagar TODOS os vídeos já concluídos?")) return;
    try {
      const token = localStorage.getItem('postvio_token');
      const resposta = await fetch(`/api/agendar/concluidos/${contaAtiva}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true'
        }
      });
      const dados = await resposta.json();
      if (dados.status === 'sucesso') carregarFila();
    } catch (erro) {
      console.error("Erro ao limpar concluídos:", erro);
    }
  };

  const pendentes = fila.filter(item => item.status === 'PENDENTE');
  const concluidos = fila.filter(item => item.status === 'CONCLUIDO');
  const atrasadosOuComErro = fila.filter(item => item.status === 'ATRASADO' || item.status === 'ERRO');
  const proxima = pendentes.length > 0 ? pendentes[0] : null;

  const exibirVideosPorAba = () => {
    if (abaAtiva === 'pendentes') return pendentes;
    if (abaAtiva === 'concluidos') return concluidos;
    if (abaAtiva === 'atrasados') return atrasadosOuComErro;
    return [];
  };

  return (
    <div className="max-w-6xl mx-auto flex flex-col h-[calc(100vh-100px)] overflow-hidden">
      <div className="mb-6 shrink-0">
        <h2 className="text-3xl font-bold text-gray-800 mb-4">Painel Principal</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div><p className="text-gray-500 font-medium text-sm mb-1">Na Fila</p><p className="text-3xl font-black text-gray-800">{pendentes.length}</p></div>
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center text-2xl">⏳</div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div><p className="text-gray-500 font-medium text-sm mb-1">Publicados</p><p className="text-3xl font-black text-gray-800">{concluidos.length}</p></div>
            <div className="w-12 h-12 rounded-full bg-green-50 text-green-500 flex items-center justify-center text-2xl">✅</div>
          </div>
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-5 rounded-2xl shadow-sm border border-blue-600 flex items-center justify-between text-white">
            <div>
              <p className="text-blue-100 font-medium text-sm mb-1">Próxima Publicação</p>
              <p className="text-xl font-bold">{proxima ? new Date(proxima.data_hora_agendamento).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Nenhuma na fila'}</p>
            </div>
            <div className="text-3xl">🚀</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 min-h-0 overflow-hidden mb-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full justify-between overflow-y-auto shrink-0">
          <div>
            <h3 className="text-xl font-semibold mb-5 flex items-center gap-2">⚡ Agendamento Rápido</h3>
            <form onSubmit={fazerUploadManual} className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Vídeo (MP4)</label><input id="input-video" type="file" accept="video/*" onChange={(e) => setVideo(e.target.files[0])} required className="w-full text-sm border p-2 rounded-lg bg-gray-50" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Capa (Opcional)</label><input id="input-capa" type="file" accept="image/*" onChange={(e) => setCapa(e.target.files[0])} className="w-full text-sm border p-2 rounded-lg bg-gray-50" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Legenda</label><textarea value={legenda} onChange={(e) => setLegenda(e.target.value)} required className="w-full border p-3 rounded-lg h-24 bg-gray-50 resize-none"></textarea></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Data</label><input type="date" value={data} onChange={(e) => setData(e.target.value)} required className="w-full border p-2.5 rounded-lg bg-gray-50 text-gray-700 cursor-pointer" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Hora</label><input type="time" value={hora} onChange={(e) => setHora(e.target.value)} required className="w-full border p-2.5 rounded-lg bg-gray-50 text-gray-700 cursor-pointer" /></div>
              </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors mt-2 shadow-md">Agendar Publicação</button>
              {mensagem && <p className="text-sm text-center font-medium text-gray-600 mt-2">{mensagem}</p>}
            </form>
          </div>
        </div>

        <div className="lg:col-span-2 h-full flex flex-col overflow-hidden">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col h-full min-h-0 overflow-hidden">
            <div className="flex justify-between items-center mb-4 shrink-0">
              <h3 className="text-xl font-semibold">Próximos Vídeos</h3>
              
              {/* AS NOSSAS ABAS NOVAS */}
              <div className="flex gap-2 border-b border-gray-200 w-full justify-start overflow-x-auto">
                 <button onClick={() => setAbaAtiva('pendentes')} className={`py-2 px-4 text-sm font-medium ${abaAtiva === 'pendentes' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>Pendentes</button>
                 <button onClick={() => setAbaAtiva('concluidos')} className={`py-2 px-4 text-sm font-medium ${abaAtiva === 'concluidos' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>Concluídos</button>
                 <button onClick={() => setAbaAtiva('atrasados')} className={`py-2 px-4 text-sm font-medium ${abaAtiva === 'atrasados' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>Atrasados/Erros</button>
              </div>

              {abaAtiva === 'concluidos' && concluidos.length > 0 && (
                <button onClick={limparConcluidos} className="text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg border border-red-100 whitespace-nowrap ml-4">Apagar concluídos</button>
              )}
            </div>
            
            {exibirVideosPorAba().length === 0 ? (
              <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl flex-1 flex flex-col justify-center">Nenhum vídeo nesta aba.</div>
            ) : (
              <div className="space-y-4 overflow-y-auto pr-2 flex-1 min-h-0 scrollbar-thin">
                {exibirVideosPorAba().map((item) => (
                  <div key={item.id} className="flex gap-4 p-4 border border-gray-100 rounded-xl hover:shadow-md transition-shadow bg-white shrink-0 group">
                    <div className="w-32 h-24 bg-gray-100 rounded-lg overflow-hidden shrink-0 border border-gray-200">
                      {item.caminho_capa ? (
                        <img src={`/api/${item.caminho_capa}`} alt="Capa" className="w-full h-full object-cover" />
                      ) : (
                        <video src={`/api/${item.caminho_video}`} className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                      <div>
                        <div className="flex justify-between items-start">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${item.status === 'PENDENTE' ? 'bg-amber-100 text-amber-700' : item.status === 'CONCLUIDO' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{item.status}</span>
                          
                          <div className="flex gap-1">
                            <button onClick={() => { setIdReagendar(item.id); setNovaData(''); setNovaHora(''); }} className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 p-1.5 rounded-md transition-all shrink-0" title="Reagendar Data">🔄</button>
                            <button onClick={() => apagarVideo(item.id)} className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-all shrink-0" title="Apagar Vídeo">❌</button>
                          </div>
                        </div>
                        <p className="mt-2 text-sm text-gray-600 line-clamp-2 break-all">{item.legenda}</p>
                      </div>
                      
                      {idReagendar === item.id ? (
                        <div className="mt-3 bg-blue-50 p-3 rounded-lg border border-blue-100">
                          <p className="text-xs font-bold text-blue-800 mb-2">Reagendar para:</p>
                          <div className="flex gap-2 mb-2">
                            <input type="date" value={novaData} onChange={(e) => setNovaData(e.target.value)} className="w-full text-xs border border-blue-200 p-1.5 rounded" />
                            <input type="time" value={novaHora} onChange={(e) => setNovaHora(e.target.value)} className="w-full text-xs border border-blue-200 p-1.5 rounded" />
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => salvarReagendamento(item.id)} className="flex-1 bg-blue-600 text-white text-xs font-bold py-1.5 rounded hover:bg-blue-700 transition-colors">Guardar</button>
                            <button onClick={() => setIdReagendar(null)} className="flex-1 bg-white border border-gray-300 text-gray-700 text-xs font-bold py-1.5 rounded hover:bg-gray-50 transition-colors">Cancelar</button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm font-semibold text-gray-800 mt-2">📅 {new Date(item.data_hora_agendamento).toLocaleString('pt-PT')}</p>
                      )}
                      
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
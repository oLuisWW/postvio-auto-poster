import React, { useState } from 'react';

function UploadMassa({ contaAtiva }) {
  const [videos, setVideos] = useState([]);
  const [legendaPadrao, setLegendaPadrao] = useState('Novo vídeo no canal! 🚀 #viral');
  const [capaPadrao, setCapaPadrao] = useState(null);
  
  // NOVOS ESTADOS PARA O MODO DE INTERVALO
  const [modoAgendamento, setModoAgendamento] = useState('grade'); // 'grade' ou 'intervalo'
  const [intervaloMinutos, setIntervaloMinutos] = useState(30);
  const [dataInicio, setDataInicio] = useState('');
  const [horaInicio, setHoraInicio] = useState('');

  const [status, setStatus] = useState('');
  const [progresso, setProgresso] = useState(0);
  const [emAndamento, setEmAndamento] = useState(false);

  const lidarComSelecao = (e) => {
    const ficheirosSelecionados = Array.from(e.target.files);
    const apenasVideos = ficheirosSelecionados.filter(f => f.type.startsWith('video/'));
    setVideos(apenasVideos);
    setStatus('');
    setProgresso(0);
  };

  const removerVideo = (index) => {
    const novaLista = [...videos];
    novaLista.splice(index, 1);
    setVideos(novaLista);
  };

  const iniciarUpload = async () => {
    if (videos.length === 0) return;
    
    // Validação extra para o modo de intervalo
    if (modoAgendamento === 'intervalo' && (!dataInicio || !horaInicio || intervaloMinutos < 1)) {
      alert("Por favor, preencha a Data de Início, Hora de Início e o Intervalo corretamente.");
      return;
    }
    
    const mensagemConfirmacao = modoAgendamento === 'grade' 
      ? `Os ${videos.length} vídeos serão agendados usando a Grade de Horários.` 
      : `Os ${videos.length} vídeos serão agendados a cada ${intervaloMinutos} minutos a partir de ${dataInicio} às ${horaInicio}.`;
      
    const confirmacao = window.confirm(`Atenção: ${mensagemConfirmacao} Deseja continuar?`);
    if (!confirmacao) return;

    setEmAndamento(true);
    setStatus(`A preparar o upload de ${videos.length} vídeos...`);
    setProgresso(0);

    let sucessos = 0;
    let falhas = 0;

    for (let i = 0; i < videos.length; i++) {
      const videoAtual = videos[i];
      setStatus(`A fazer upload (${i + 1}/${videos.length}): ${videoAtual.name}...`);
      
      const formData = new FormData();
      formData.append('video', videoAtual);
      formData.append('legenda', legendaPadrao);
      formData.append('conta_id', contaAtiva);
      
      // Enviamos o modo e a posição do vídeo para o backend conseguir calcular a hora exata
      formData.append('modo_agendamento', modoAgendamento);
      formData.append('posicao_fila', i); // Passamos a posição do loop (0, 1, 2...)
      
      if (capaPadrao) {
        formData.append('capa', capaPadrao);
      }
      
      if (modoAgendamento === 'intervalo') {
        formData.append('data_inicio', dataInicio);
        formData.append('hora_inicio', horaInicio);
        formData.append('intervalo_minutos', intervaloMinutos);
      }

      try {
        const token = localStorage.getItem('postvio_token'); // 🔒 Pega a chave JWT
        
        const resposta = await fetch('https://postvio-auto-poster-production.up.https://postvio-auto-poster.onrender.com/agendar/auto/', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}` // 🔒 Mostra a chave ao segurança
            // Nota: Não defina 'Content-Type' manualmente com FormData, o navegador faz isso automaticamente com os boundaries
          },
          body: formData,
        });
        
        if (!resposta.ok) {
          const erroDados = await resposta.json();
          throw new Error(erroDados.detail || "Erro desconhecido");
        }

        const dados = await resposta.json();
        if (dados.status === 'sucesso') {
          sucessos++;
        }
      } catch (erro) {
        console.error("Erro no upload em massa:", erro);
        falhas++;
        
        if (erro.message.includes("Configure um horário")) {
          setStatus("❌ Upload interrompido! Não há horários configurados na Grade desta conta.");
          setEmAndamento(false);
          return;
        }
      }
      
      setProgresso(Math.round(((i + 1) / videos.length) * 100));
    }

    setStatus(`Upload Concluído! ✅ Sucesso: ${sucessos} | ❌ Falhas: ${falhas}`);
    setEmAndamento(false);
    
    if (falhas === 0) {
      setTimeout(() => {
        setVideos([]);
        setCapaPadrao(null);
        if(document.getElementById('input-capa-massa')) document.getElementById('input-capa-massa').value = '';
        setProgresso(0);
        setStatus('');
      }, 4000);
    }
  };

  return (
    <div className="max-w-6xl mx-auto flex flex-col h-[calc(100vh-100px)] overflow-hidden">
      
      <div className="mb-6 shrink-0">
        <h2 className="text-3xl font-bold text-gray-800">Upload em Massa</h2>
        <p className="text-gray-500 mt-2">Envie dezenas de vídeos de uma vez. O sistema encaixa-os automaticamente nos seus horários.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 min-h-0 overflow-hidden mb-4">
        
        {/* COLUNA ESQUERDA: Configuração */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full overflow-y-auto shrink-0 scrollbar-thin">
          <h3 className="text-xl font-semibold mb-5 flex items-center gap-2 shrink-0">
            ⚙️ Configuração
          </h3>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">1. Selecionar Vídeos</label>
              <input 
                type="file" 
                accept="video/*" 
                multiple 
                onChange={lidarComSelecao} 
                disabled={emAndamento}
                className="w-full text-sm border border-dashed border-blue-300 bg-blue-50/50 p-4 rounded-xl cursor-pointer focus:outline-none" 
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">2. Capa & Legenda (Padrão)</label>
              <input 
                id="input-capa-massa"
                type="file" 
                accept="image/*" 
                onChange={(e) => setCapaPadrao(e.target.files[0])} 
                disabled={emAndamento}
                className="w-full text-sm border border-dashed border-gray-300 bg-gray-50 p-3 rounded-xl cursor-pointer focus:outline-none mb-2" 
              />
              <textarea 
                value={legendaPadrao} 
                onChange={(e) => setLegendaPadrao(e.target.value)} 
                disabled={emAndamento}
                className="w-full border p-3 rounded-xl h-24 bg-gray-50 resize-none outline-none focus:ring-2 focus:ring-blue-500 text-sm" 
                placeholder="Legenda para os vídeos..."
              ></textarea>
            </div>

            {/* SELETOR DE MODO DE AGENDAMENTO */}
            <div className="border-t border-gray-100 pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-3">3. Como deseja agendar?</label>
              
              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setModoAgendamento('grade')}
                  className={`flex-1 py-2.5 px-3 text-sm font-semibold rounded-xl border transition-all ${modoAgendamento === 'grade' ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                >
                  📅 Usar Grade
                </button>
                <button
                  type="button"
                  onClick={() => setModoAgendamento('intervalo')}
                  className={`flex-1 py-2.5 px-3 text-sm font-semibold rounded-xl border transition-all ${modoAgendamento === 'intervalo' ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                >
                  ⏱️ Intervalo Fixo
                </button>
              </div>

              {/* CAMPOS DO INTERVALO (Condicionais) */}
              {modoAgendamento === 'intervalo' && (
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4 animate-fade-in">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Intervalo (Minutos)</label>
                    <input 
                      type="number" 
                      min="1" 
                      value={intervaloMinutos} 
                      onChange={(e) => setIntervaloMinutos(Number(e.target.value))} 
                      className="w-full border p-2.5 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500" 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Data Início</label>
                      <input 
                        type="date" 
                        value={dataInicio} 
                        onChange={(e) => setDataInicio(e.target.value)} 
                        className="w-full border p-2.5 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Hora Início</label>
                      <input 
                        type="time" 
                        value={horaInicio} 
                        onChange={(e) => setHoraInicio(e.target.value)} 
                        className="w-full border p-2.5 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500" 
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <button 
              onClick={iniciarUpload}
              disabled={videos.length === 0 || emAndamento}
              className={`w-full font-bold py-4 rounded-xl transition-all shadow-md mt-2 ${
                videos.length === 0 || emAndamento 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none' 
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-500/30 transform hover:-translate-y-0.5'
              }`}
            >
              {emAndamento ? 'A processar...' : `Iniciar Upload Automático (${videos.length})`}
            </button>
          </div>
        </div>

        {/* COLUNA DIREITA: Fila de Processamento (Mantém-se igual) */}
        <div className="lg:col-span-2 h-full flex flex-col overflow-hidden">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col h-full min-h-0 overflow-hidden">
            <h3 className="text-xl font-semibold mb-4 shrink-0">Fila de Processamento</h3>
            
            {(progresso > 0 || status) && (
              <div className="mb-6 shrink-0 bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div className="flex justify-between text-sm font-semibold mb-2">
                  <span className="text-blue-600">{status}</span>
                  <span className="text-gray-600">{progresso}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out" 
                    style={{ width: `${progresso}%` }}
                  ></div>
                </div>
              </div>
            )}

            {videos.length === 0 ? (
              <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl flex-1 flex flex-col justify-center bg-gray-50/50">
                <span className="text-4xl mb-3">📂</span>
                <p>Nenhum vídeo selecionado.</p>
                <p className="text-sm mt-1">Use o botão ao lado para escolher os ficheiros.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 overflow-y-auto pr-2 flex-1 min-h-0 scrollbar-thin content-start">
                {videos.map((vid, index) => (
                  <div key={index} className="relative group bg-gray-100 rounded-xl overflow-hidden border border-gray-200 flex flex-col justify-between aspect-video">
                    <div className="flex-1 flex flex-col items-center justify-center p-3 text-center bg-gray-800 text-white">
                      <span className="text-2xl mb-2">🎬</span>
                      <p className="text-xs font-medium truncate w-full px-2" title={vid.name}>
                        {vid.name}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {(vid.size / (1024 * 1024)).toFixed(1)} MB
                      </p>
                    </div>
                    
                    {!emAndamento && (
                      <button 
                        onClick={() => removerVideo(index)}
                        className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        title="Remover da lista"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
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

export default UploadMassa;
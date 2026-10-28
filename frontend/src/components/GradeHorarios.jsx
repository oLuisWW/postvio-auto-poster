import React, { useState, useEffect } from 'react';

function GradeHorarios({ contaAtiva }) {
  const [horarios, setHorarios] = useState([]);
  const [diasSelecionados, setDiasSelecionados] = useState([]);
  const [hora, setHora] = useState('');
  const [mensagem, setMensagem] = useState('');

  const botoesDias = [
    { id: 0, letra: 'S', titulo: 'Segunda-feira' },
    { id: 1, letra: 'T', titulo: 'Terça-feira' },
    { id: 2, letra: 'Q', titulo: 'Quarta-feira' },
    { id: 3, letra: 'Q', titulo: 'Quinta-feira' },
    { id: 4, letra: 'S', titulo: 'Sexta-feira' },
    { id: 5, letra: 'S', titulo: 'Sábado' },
    { id: 6, letra: 'D', titulo: 'Domingo' }
  ];

  useEffect(() => {
    if (contaAtiva) {
      carregarHorarios();
    }
  }, [contaAtiva]);

  const carregarHorarios = async () => {
    try {
      const token = localStorage.getItem('postvio_token'); // 🔒 Pega a chave
      
      const resposta = await fetch(`https://unapprovable-unneglected-pamelia.ngrok-free.dev/horarios/?conta_id=${contaAtiva}`, {
        headers: {
          'Authorization': `Bearer ${token}` // 🔒 Mostra a chave
        }
      });
      
      if (resposta.status === 401) return; // Se não tiver acesso, ignora
      
      const dados = await resposta.json();
      if (dados.status === 'sucesso') {
        setHorarios(dados.horarios);
      }
    } catch (erro) {
      console.error("Erro ao carregar horários:", erro);
    }
  };

  const toggleDia = (id) => {
    if (diasSelecionados.includes(id)) {
      setDiasSelecionados(diasSelecionados.filter(dia => dia !== id));
    } else {
      setDiasSelecionados([...diasSelecionados, id]);
    }
  };

  const adicionarHorario = async (e) => {
    e.preventDefault();

    if (diasSelecionados.length === 0) {
      setMensagem('⚠️ Selecione pelo menos um dia da semana!');
      return;
    }

    setMensagem('A guardar...');

    try {
      const token = localStorage.getItem('postvio_token'); // 🔒 Pega a chave
      
      const promessas = diasSelecionados.map(dia => {
        const formData = new FormData();
        formData.append('dia_semana', dia);
        formData.append('horario', hora);
        formData.append('conta_id', contaAtiva);
        
        return fetch('https://unapprovable-unneglected-pamelia.ngrok-free.dev/horarios/', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}` // 🔒 Mostra a chave
          },
          body: formData,
        });
      });

      await Promise.all(promessas);
      
      setMensagem('');
      setHora('');
      setDiasSelecionados([]);
      carregarHorarios();
      
    } catch (erro) {
      setMensagem('❌ Erro ao adicionar horários.');
    }
  };

  const apagarGrupoHorario = async (itensDoGrupo) => {
    const confirmacao = window.confirm("Deseja remover este horário de todos os dias configurados?");
    if (!confirmacao) return;

    try {
      const token = localStorage.getItem('postvio_token'); // 🔒 Pega a chave
      
      const promessas = itensDoGrupo.map(item => 
        fetch(`https://unapprovable-unneglected-pamelia.ngrok-free.dev/horarios/${item.id}`, { 
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}` // 🔒 Mostra a chave
          }
        })
      );
      await Promise.all(promessas);
      carregarHorarios();
    } catch (erro) {
      console.error("Erro ao apagar grupo de horários:", erro);
    }
  };

  const agruparHorarios = () => {
    const grupos = {};
    horarios.forEach(item => {
      const horaFormatada = item.horario.split(':').slice(0, 2).join(':');
      if (!grupos[horaFormatada]) {
        grupos[horaFormatada] = [];
      }
      grupos[horaFormatada].push(item);
    });
    return Object.entries(grupos).sort(([horaA], [horaB]) => horaA.localeCompare(horaB));
  };

  const horariosAgrupados = agruparHorarios();

  return (
    <div className="max-w-6xl mx-auto flex flex-col h-[calc(100vh-100px)] overflow-hidden">
      
      <div className="mb-6 shrink-0">
        <h2 className="text-3xl font-bold text-gray-800">Grade de Horários Padrão</h2>
        <p className="text-gray-500 mt-2">Defina os dias e horas em que esta conta costuma publicar. O motor automático usará isto para o Upload em Massa.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 min-h-0 overflow-hidden mb-4">
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-fit shrink-0">
          <h3 className="text-xl font-semibold mb-5 flex items-center gap-2">
            ⏰ Novo Horário
          </h3>
          <form onSubmit={adicionarHorario} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Hora da Publicação</label>
              <input 
                type="time" 
                value={hora} 
                onChange={(e) => setHora(e.target.value)} 
                required 
                className="w-full text-4xl font-bold text-center border-none bg-gray-50 py-6 rounded-2xl text-blue-600 cursor-pointer outline-none focus:ring-4 focus:ring-blue-100 transition-all" 
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3 text-center">Repetir nos dias</label>
              <div className="flex justify-between gap-1">
                {botoesDias.map((btn) => {
                  const selecionado = diasSelecionados.includes(btn.id);
                  return (
                    <button
                      key={btn.id}
                      type="button"
                      onClick={() => toggleDia(btn.id)}
                      title={btn.titulo}
                      className={`w-10 h-10 rounded-full font-bold text-sm transition-all duration-200 flex items-center justify-center
                        ${selecionado 
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-500/40 transform scale-110' 
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                    >
                      {btn.letra}
                    </button>
                  );
                })}
              </div>
            </div>

            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-xl transition-all shadow-md mt-2">
              Adicionar à Grade
            </button>
            {mensagem && (
              <p className={`text-sm text-center font-medium mt-2 ${mensagem.includes('Erro') || mensagem.includes('⚠️') ? 'text-amber-600' : 'text-blue-600'}`}>
                {mensagem}
              </p>
            )}
          </form>
        </div>

        <div className="lg:col-span-2 h-full flex flex-col overflow-hidden">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col h-full min-h-0 overflow-hidden">
            <h3 className="text-xl font-semibold mb-4 shrink-0">Horários Ativos</h3>
            
            {horariosAgrupados.length === 0 ? (
              <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl flex-1 flex flex-col justify-center">
                <p>Nenhum horário configurado para esta conta.</p>
                <p className="text-sm mt-2">Adicione horários ao lado para ativar o agendamento automático.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pr-2 flex-1 min-h-0 scrollbar-thin content-start">
                
                {horariosAgrupados.map(([horaGrupo, itensDoGrupo]) => (
                  <div key={horaGrupo} className="flex flex-col p-5 border border-gray-100 rounded-2xl bg-white shadow-sm hover:shadow-md transition-all group">
                    <div className="flex justify-between items-start mb-4">
                      <p className="text-4xl font-black text-gray-800">{horaGrupo}</p>
                      <button 
                        onClick={() => apagarGrupoHorario(itensDoGrupo)}
                        className="text-gray-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                        title="Remover horário"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    
                    <div className="flex justify-between gap-1">
                      {botoesDias.map(btn => {
                        const estaAtivo = itensDoGrupo.some(item => item.dia_semana === btn.id);
                        return (
                          <div 
                            key={btn.id}
                            title={btn.titulo}
                            className={`w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center
                              ${estaAtivo ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}
                          >
                            {btn.letra}
                          </div>
                        );
                      })}
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

export default GradeHorarios;
import React, { useState } from 'react';

function Sidebar({ abaAtiva, setAbaAtiva, contas, contaAtiva, setContaAtiva }) {
  const [menuAberto, setMenuAberto] = useState(false);

  // Encontra qual conta está selecionada neste momento
  const contaSelecionada = contas.find(c => c.id === contaAtiva) || {
    nome_perfil: 'Minha Conta Principal',
    usuario_ig: 'usuario_principal'
  };

  const alternarConta = (id) => {
    setContaAtiva(id);
    setMenuAberto(false);
  };

  // Pega na primeira letra para a foto de perfil temporária caso não exista imagem
  const inicial = contaSelecionada.nome_perfil ? contaSelecionada.nome_perfil.charAt(0).toUpperCase() : 'P';

  return (
    <div className="w-72 bg-gray-950 h-screen text-white flex flex-col fixed left-0 top-0 shadow-2xl border-r border-gray-800/60 z-50">
      <div className="p-6 flex flex-col h-full">
        {/* LOGO */}
        <h1 className="text-3xl font-black text-blue-500 mb-8 tracking-tighter">
          POSTVIO<span className="text-white">.</span>
        </h1>
        
        {/* NOVO SELETOR DE CONTAS PERSONALIZADO */}
        <div className="mb-8 relative">
          <label className="text-[10px] text-gray-500 uppercase font-extrabold tracking-widest mb-1.5 block">
            Conta Ativa
          </label>
          
          {/* Botão Gatilho (Dropdown customizado) */}
          <button 
            onClick={() => setMenuAberto(!menuAberto)}
            className="w-full flex items-center justify-between bg-gray-900 hover:bg-gray-800/80 text-left border border-gray-800 hover:border-gray-700 rounded-xl p-3 transition-all duration-200 cursor-pointer outline-none focus:ring-2 focus:ring-blue-500/40"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-sm shrink-0 border border-blue-500/30">
                {contaSelecionada.foto_perfil ? (
                  <img src={contaSelecionada.foto_perfil} alt="" className="w-full h-full rounded-full object-cover" />
                ) : inicial}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-gray-200 truncate leading-tight">
                  {contaSelecionada.nome_perfil}
                </p>
                <p className="text-[10px] text-gray-400 truncate mt-0.5">
                  @{contaSelecionada.usuario_ig}
                </p>
              </div>
            </div>
            
            {/* Seta para baixo */}
            <svg 
              className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ml-1 ${menuAberto ? 'rotate-180' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Lista de Contas (Dropdown flutuante) */}
          {menuAberto && (
            <div className="absolute top-full left-0 w-full mt-2 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl overflow-hidden z-50 divide-y divide-gray-800/50">
              <div className="max-h-56 overflow-y-auto">
                {contas && contas.length > 0 ? (
                  contas.map(c => (
                    <button
                      key={c.id}
                      onClick={() => alternarConta(c.id)}
                      className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${c.id === contaAtiva ? 'bg-blue-600/10 hover:bg-blue-600/15' : 'hover:bg-gray-800'}`}
                    >
                      <div className={`w-7.5 h-7.5 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${c.id === contaAtiva ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300'}`}>
                        {c.foto_perfil ? (
                          <img src={c.foto_perfil} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (c.nome_perfil ? c.nome_perfil.charAt(0).toUpperCase() : 'P')}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-gray-100 truncate">{c.nome_perfil}</p>
                        <p className="text-[10px] text-gray-400 truncate">@{c.usuario_ig}</p>
                      </div>
                      {c.id === contaAtiva && (
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      )}
                    </button>
                  ))
                ) : (
                  <p className="p-3 text-xs text-gray-500 text-center">Nenhuma conta encontrada</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* NAVEGAÇÃO */}
        <nav className="space-y-2.5 flex-1">
          <button 
            onClick={() => setAbaAtiva('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 text-sm ${abaAtiva === 'dashboard' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/10' : 'text-gray-400 hover:bg-gray-900 hover:text-gray-100'}`}
          >
            <span className="text-base">📊</span> Fila de Publicação
          </button>
          
          <button 
            onClick={() => setAbaAtiva('upload')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 text-sm ${abaAtiva === 'upload' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/10' : 'text-gray-400 hover:bg-gray-900 hover:text-gray-100'}`}
          >
            <span className="text-base">🚀</span> Upload em Massa
          </button>
          
          <button 
            onClick={() => setAbaAtiva('horarios')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 text-sm ${abaAtiva === 'horarios' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/10' : 'text-gray-400 hover:bg-gray-900 hover:text-gray-100'}`}
          >
            <span className="text-base">⏰</span> Grade de Horários
          </button>
          
          <button 
            onClick={() => setAbaAtiva('contas')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 text-sm ${abaAtiva === 'contas' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/10' : 'text-gray-400 hover:bg-gray-900 hover:text-gray-100'}`}
          >
            <span className="text-base">⚙️</span> Gerir Contas
          </button>
        </nav>
        
        {/* RODAPÉ */}
        <div className="pt-6 border-t border-gray-900 text-[10px] text-gray-500 font-semibold tracking-wider uppercase mt-auto">
          <p>Postvio v2.0</p>
          <p className="text-blue-500 mt-0.5">Multi-Account Engine</p>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
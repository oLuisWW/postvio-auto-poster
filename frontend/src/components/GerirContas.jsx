import React, { useState, useEffect } from 'react';

function GerirContas({ contaAtiva, setContaAtiva }) {
  const [contas, setContas] = useState([]);
  const [nomePerfil, setNomePerfil] = useState('');
  const [usuarioIg, setUsuarioIg] = useState('');
  const [senha, setSenha] = useState(''); 
  const [fotoPerfil, setFotoPerfil] = useState(null);
  const [mensagem, setMensagem] = useState('');

  useEffect(() => {
    carregarContas();
  }, []);

  const carregarContas = async () => {
    try {
      const token = localStorage.getItem('postvio_token'); // 🔒 Pega a chave
      
      const resposta = await fetch('postvio-auto-poster-production.up.railway.app/contas/', {
        headers: {
          'Authorization': `Bearer ${token}` // 🔒 Mostra a chave ao segurança
        }
      });
      
      if (resposta.status === 401) return; // Se não tiver acesso, ignora silenciosamente (o App trata do logout)
      
      const dados = await resposta.json();
      if (dados.status === 'sucesso') {
        setContas(dados.contas);
      }
    } catch (erro) {
      console.error("Erro ao carregar contas:", erro);
    }
  };

  const adicionarConta = async (e) => {
    e.preventDefault();
    setMensagem('A adicionar...');

    const formData = new FormData();
    formData.append('nome_perfil', nomePerfil);
    formData.append('usuario_ig', usuarioIg);
    formData.append('senha', senha); 
    
    if (fotoPerfil) {
      formData.append('foto_perfil', fotoPerfil);
    }

    try {
      const token = localStorage.getItem('postvio_token'); // 🔒 Pega a chave
      
      const resposta = await fetch('postvio-auto-poster-production.up.railway.app/contas/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}` // 🔒 Mostra a chave
        },
        body: formData,
      });
      const dados = await resposta.json();
      
      if (dados.status === 'sucesso') {
        setMensagem('✅ Conta adicionada com sucesso!');
        setNomePerfil('');
        setUsuarioIg('');
        setSenha(''); 
        setFotoPerfil(null);
        if(document.getElementById('input-foto-perfil')) document.getElementById('input-foto-perfil').value = '';
        
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setMensagem(`❌ Erro: ${dados.detail || 'Falha ao adicionar'}`);
      }
    } catch (erro) {
      setMensagem('❌ Erro de conexão ao adicionar conta.');
    }
  };

  const apagarConta = async (id) => {
    if (contas.length <= 1) {
      alert("Não pode apagar a única conta do sistema!");
      return;
    }

    const confirmacao = window.confirm("Tem certeza que deseja apagar esta conta? TODOS os vídeos e horários associados a ela também serão perdidos.");
    if (!confirmacao) return;

    try {
      const token = localStorage.getItem('postvio_token'); // 🔒 Pega a chave
      
      const resposta = await fetch(`postvio-auto-poster-production.up.railway.app/contas/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}` // 🔒 Mostra a chave
        }
      });
      const dados = await resposta.json();
      if (dados.status === 'sucesso') {
        if (contaAtiva === id) {
          setContaAtiva(contas.find(c => c.id !== id).id);
        }
        setTimeout(() => window.location.reload(), 500);
      } else {
        alert(dados.detail || "Erro ao apagar conta.");
      }
    } catch (erro) {
      console.error("Erro ao apagar conta:", erro);
    }
  };

  return (
    <div className="max-w-6xl mx-auto flex flex-col h-[calc(100vh-100px)] overflow-hidden">
      
      <div className="mb-6 shrink-0">
        <h2 className="text-3xl font-bold text-gray-800">Gerir Contas de Instagram</h2>
        <p className="text-gray-500 mt-2">Adicione ou remova contas do sistema. O motor usa estas credenciais para publicar automaticamente.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 min-h-0 overflow-hidden mb-4">
        
        {/* COLUNA ESQUERDA: Adicionar Conta */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-fit shrink-0">
          <h3 className="text-xl font-semibold mb-5 flex items-center gap-2">
            ➕ Nova Conta
          </h3>
          <form onSubmit={adicionarConta} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Perfil (Apelido)</label>
              <input type="text" value={nomePerfil} onChange={(e) => setNomePerfil(e.target.value)} required placeholder="Ex: Conta Cliente X" className="w-full border p-2.5 rounded-lg bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Usuário do Instagram (@)</label>
              <input type="text" value={usuarioIg} onChange={(e) => setUsuarioIg(e.target.value)} required placeholder="Ex: seu_perfil" className="w-full border p-2.5 rounded-lg bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            {/* --- BLOCO NOVO: CHAVE DE SESSÃO COM TUTORIAL --- */}
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-1">🔑 Chave de Autenticação (Session ID)</label>
              <input 
                type="text" 
                value={senha} 
                onChange={(e) => setSenha(e.target.value)} 
                required 
                placeholder="Cole o código gigante que contém % aqui..." 
                className="w-full border p-2.5 rounded-lg bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500" 
              />
              <div className="bg-blue-50 border-l-4 border-blue-500 p-3 mt-3 text-xs text-gray-600 rounded-r-lg">
                <strong className="block mb-1 text-gray-800">Como encontrar a sua chave em 3 passos:</strong>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Faça login no <b>instagram.com</b> pelo computador.</li>
                  <li>Aperte <b>F12</b>, vá à aba <b>Application</b> e clique em <b>Cookies</b> no menu lateral.</li>
                  <li>Procure o item <b>sessionid</b>, copie o valor gigante e cole acima.</li>
                </ol>
              </div>
            </div>
            {/* --- FIM DO BLOCO NOVO --- */}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Foto de Perfil (Opcional)</label>
              <input id="input-foto-perfil" type="file" accept="image/*" onChange={(e) => setFotoPerfil(e.target.files[0])} className="w-full text-sm border p-2 rounded-lg bg-gray-50" />
            </div>

            <button type="submit" className="w-full bg-gray-900 hover:bg-black text-white font-semibold py-3 rounded-xl transition-colors mt-2 shadow-md">
              Adicionar Conta Segura
            </button>
            {mensagem && <p className="text-sm text-center font-medium text-blue-600 mt-2">{mensagem}</p>}
          </form>
        </div>

        {/* COLUNA DIREITA: Lista de Contas */}
        <div className="lg:col-span-2 h-full flex flex-col overflow-hidden">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col h-full min-h-0 overflow-hidden">
            <h3 className="text-xl font-semibold mb-4 shrink-0">Contas Registadas</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pr-2 flex-1 min-h-0 scrollbar-thin content-start">
              {contas.map((c) => (
                <div key={c.id} className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl bg-gray-50 hover:bg-white hover:shadow-md transition-all group">
                  <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg shrink-0 overflow-hidden border border-blue-200">
                    {c.foto_perfil ? (
                      <img src={`postvio-auto-poster-production.up.railway.app/${c.foto_perfil}`} alt="" className="w-full h-full object-cover" onError={(e) => {e.target.onerror = null; e.target.style.display='none'}} />
                    ) : c.nome_perfil ? c.nome_perfil.charAt(0).toUpperCase() : 'P'}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate">{c.nome_perfil}</p>
                    <p className="text-xs text-gray-500 truncate">@{c.usuario_ig}</p>
                    <p className="text-[10px] text-green-600 mt-0.5 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span> Credenciais Ativas
                    </p>
                  </div>
                  
                  <button 
                    onClick={() => apagarConta(c.id)}
                    className="text-gray-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                    title="Remover conta"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default GerirContas;
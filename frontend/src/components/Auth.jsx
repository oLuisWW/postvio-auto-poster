import React, { useState } from 'react';
import axios from 'axios';

const Auth = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    setSucesso('');

    try {
      if (isLogin) {
        // --- FAZER LOGIN ---
        // O OAuth2 do FastAPI exige os dados no formato URL Encoded (URLSearchParams)
        const formData = new URLSearchParams();
        formData.append('username', email); // O FastAPI OAuth2 chama username ao email
        formData.append('password', senha);

        const response = await axios.post('https://postvio-auto-poster.onrender.com/login', formData, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        // Guarda o token e o nome do utilizador no navegador (LocalStorage)
        localStorage.setItem('postvio_token', response.data.access_token);
        localStorage.setItem('postvio_user', response.data.nome);
        
        // Avisa o App.jsx que o login deu certo!
        onLoginSuccess();
      } else {
        // --- FAZER REGISTO ---
        const response = await axios.post('https://postvio-auto-poster.onrender.com/registrar', {
          nome: nome,
          email: email,
          senha: senha
        });
        
        setSucesso('Conta criada com sucesso! Pode fazer login.');
        setIsLogin(true); // Volta para a aba de login
      }
    } catch (error) {
      if (error.response && error.response.data.detail) {
        setErro(error.response.data.detail);
      } else {
        setErro('Erro de conexão com o servidor.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-800 rounded-xl shadow-2xl p-8 border border-gray-700">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">
            {isLogin ? 'Bem-vindo ao Postvio' : 'Criar Conta no Postvio'}
          </h2>
          <p className="text-gray-400">
            {isLogin ? 'Faça login para gerir as suas automações' : 'Registe-se e automatize o seu Instagram'}
          </p>
        </div>

        {erro && <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded mb-4 text-sm text-center">{erro}</div>}
        {sucesso && <div className="bg-green-900/50 border border-green-500 text-green-200 p-3 rounded mb-4 text-sm text-center">{sucesso}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-1">Nome Completo</label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full bg-gray-700 text-white border border-gray-600 rounded p-2 focus:outline-none focus:border-blue-500"
                required={!isLogin}
              />
            </div>
          )}
          
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-1">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-700 text-white border border-gray-600 rounded p-2 focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-1">Palavra-passe</label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full bg-gray-700 text-white border border-gray-600 rounded p-2 focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-200"
          >
            {isLogin ? 'Entrar no Painel' : 'Criar Minha Conta'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setErro('');
              setSucesso('');
            }}
            className="text-blue-400 hover:text-blue-300 text-sm"
          >
            {isLogin ? 'Não tem conta? Registe-se aqui.' : 'Já tem conta? Faça login.'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
import { useState, useEffect } from 'react'

const DIAS_SEMANA = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo']

function App() {
  const [fila, setFila] = useState([])
  const [horarios, setHorarios] = useState([])
  const [mensagem, setMensagem] = useState('')
  const [abaAtiva, setAbaAtiva] = useState('dashboard')

  const [arquivosMassa, setArquivosMassa] = useState([])
  const [legendaMassa, setLegendaMassa] = useState('')
  const [capaMassa, setCapaMassa] = useState(null) // Novo estado para a capa em massa
  const [progressoMassa, setProgressoMassa] = useState({ atual: 0, total: 0 })
  const [fazendoUpload, setFazendoUpload] = useState(false)
  const [mensagemMassa, setMensagemMassa] = useState('')

  const carregarFila = async () => {
    try {
      const resposta = await fetch(`http://localhost:8000/fila/?t=${new Date().getTime()}`)
      const dados = await resposta.json()
      if (dados.status === 'sucesso') {
        setFila(dados.fila)
      }
    } catch (erro) {
      console.error("Erro ao carregar a fila:", erro)
    }
  }

  const carregarHorarios = async () => {
    try {
      const resposta = await fetch('http://localhost:8000/horarios/')
      const dados = await resposta.json()
      if (dados.status === 'sucesso') {
        setHorarios(dados.horarios)
      }
    } catch (erro) {
      console.error("Erro ao carregar horários:", erro)
    }
  }

  useEffect(() => {
    carregarFila()
    carregarHorarios()
    const intervalo = setInterval(() => {
      carregarFila()
    }, 5000)
    return () => clearInterval(intervalo)
  }, [])

  const agendarVideo = async (e) => {
    e.preventDefault()
    setMensagem('A enviar vídeo e capa...')
    const formData = new FormData(e.target)
    const data = formData.get('data')
    const hora = formData.get('hora')
    formData.delete('data')
    formData.delete('hora')
    formData.append('data_hora', `${data} ${hora}:00`)

    try {
      const resposta = await fetch('http://localhost:8000/agendar/', {
        method: 'POST',
        body: formData,
      })
      const dados = await resposta.json()
      if (dados.status === 'sucesso') {
        setMensagem('Vídeo agendado com sucesso!')
        e.target.reset()
        carregarFila()
        setTimeout(() => setMensagem(''), 3000)
      }
    } catch (erro) {
      setMensagem('Erro ao conectar com o servidor.')
    }
  }

  const iniciarUploadEmMassa = async () => {
    if (arquivosMassa.length === 0) return
    if (horarios.length === 0) {
      setMensagemMassa('Erro crítico: Configure a Grade de Horários primeiro.')
      return
    }

    setFazendoUpload(true)
    setProgressoMassa({ atual: 0, total: arquivosMassa.length })
    setMensagemMassa('A iniciar distribuição mágica...')

    let sucessos = 0

    for (let i = 0; i < arquivosMassa.length; i++) {
      const video = arquivosMassa[i]
      const formData = new FormData()
      formData.append('video', video)
      formData.append('legenda', legendaMassa || 'Vídeo agendado automaticamente.') 
      
      // Anexa a capa se o utilizador tiver escolhido uma
      if (capaMassa) {
        formData.append('capa', capaMassa)
      }

      try {
        const resposta = await fetch('http://localhost:8000/agendar-auto/', {
          method: 'POST',
          body: formData,
        })
        const dados = await resposta.json()
        if (dados.status === 'sucesso') sucessos++
      } catch (erro) {
        console.error('Erro ao enviar:', video.name)
      }

      setProgressoMassa({ atual: i + 1, total: arquivosMassa.length })
    }

    setMensagemMassa(`${sucessos} vídeos agendados com sucesso!`)
    setFazendoUpload(false)
    setArquivosMassa([])
    setLegendaMassa('')
    setCapaMassa(null)
    carregarFila()
  }

  // Funções de Horários
  const adicionarHorario = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    try {
      const resposta = await fetch('http://localhost:8000/horarios/', { method: 'POST', body: formData })
      const dados = await resposta.json()
      if (dados.status === 'sucesso') { e.target.reset(); carregarHorarios() }
    } catch (erro) { console.error("Erro", erro) }
  }

  const apagarHorario = async (id) => {
    try {
      const resposta = await fetch(`http://localhost:8000/horarios/${id}`, { method: 'DELETE' })
      const dados = await resposta.json()
      if (dados.status === 'sucesso') carregarHorarios()
    } catch (erro) { console.error("Erro", erro) }
  }

  // Componente que desenha cada item da fila (agora com miniatura da capa)
  const renderItemFila = (video) => {
    // Corrige o caminho da capa trocando as barras do Windows caso necessário
    const urlCapa = video.caminho_capa ? `http://localhost:8000/${video.caminho_capa.replace(/\\/g, '/')}` : null;
    
    return (
      <div key={video.id} className="p-3 border border-gray-100 rounded-lg bg-white flex items-center gap-4 hover:shadow-md transition-all shadow-sm">
        
        {/* Espaço da Miniatura (Thumbnail) */}
        <div className="w-20 h-20 flex-shrink-0 bg-gray-100 rounded-md overflow-hidden border border-gray-200 flex items-center justify-center">
          {urlCapa ? (
            <img src={urlCapa} alt="Capa" className="w-full h-full object-cover" />
          ) : (
            <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
          )}
        </div>

        {/* Detalhes do Vídeo */}
        <div className="flex-1 flex flex-col justify-center min-w-0">
          <span className="font-semibold text-sm text-gray-800 truncate" title={video.legenda}>
            {video.caminho_video.replace('uploads/', '').replace('uploads\\', '')}
          </span>
          <p className="text-xs text-gray-500 truncate mt-0.5">{video.legenda}</p>
          
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
              {new Date(video.data_hora_agendamento).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
            </span>
            <span className={`px-2.5 py-1 rounded-full font-bold tracking-wide text-[10px] uppercase ${video.status === 'CONCLUIDO' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
              {video.status}
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-800 overflow-hidden">
      
      {/* BARRA LATERAL */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shadow-sm z-10">
        <div className="h-20 flex items-center px-8 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-md shadow-blue-200">P</div>
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Postvio</h1>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          <button onClick={() => setAbaAtiva('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${abaAtiva === 'dashboard' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>Dashboard</button>
          <button onClick={() => setAbaAtiva('massa')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${abaAtiva === 'massa' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>Upload em Massa</button>
          <button onClick={() => setAbaAtiva('horarios')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${abaAtiva === 'horarios' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>Grade de Horários</button>
        </nav>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <main className="flex-1 overflow-y-auto p-10">
        
        {/* PÁGINA 1: DASHBOARD */}
        {abaAtiva === 'dashboard' && (
          <div className="max-w-6xl mx-auto">
            <header className="mb-8">
              <h2 className="text-3xl font-bold text-gray-800">Visão Geral</h2>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              <section className="lg:col-span-2 bg-gray-50 rounded-xl">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Fila de Publicação</h3>
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  {fila.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-gray-400 bg-white rounded-xl border border-gray-200">
                      <p className="text-sm">Nenhum vídeo agendado.</p>
                    </div>
                  ) : (
                    fila.map(renderItemFila)
                  )}
                </div>
              </section>

              <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-fit">
                <h3 className="text-lg font-semibold mb-5 border-b pb-2 text-gray-800">Upload Rápido</h3>
                <form onSubmit={agendarVideo} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vídeo (MP4)</label>
                    <input type="file" name="video" accept="video/mp4" required className="w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:font-medium file:bg-blue-50 file:text-blue-700 cursor-pointer" />
                  </div>
                  
                  {/* NOVO CAMPO: Capa do Vídeo */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Capa do Vídeo (Opcional)</label>
                    <input type="file" name="capa" accept="image/*" className="w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:font-medium file:bg-purple-50 file:text-purple-700 cursor-pointer" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Legenda</label>
                    <textarea name="legenda" rows="2" required className="w-full border border-gray-300 rounded-md p-2.5 text-sm bg-gray-50"></textarea>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                      <input type="date" name="data" required className="w-full border border-gray-300 rounded-md p-2 text-sm bg-gray-50" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Hora</label>
                      <input type="time" name="hora" required className="w-full border border-gray-300 rounded-md p-2 text-sm bg-gray-50" />
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-blue-600 text-white py-2.5 rounded-md text-sm font-medium hover:bg-blue-700">Agendar</button>
                  {mensagem && <p className="text-xs text-center text-blue-600 mt-2">{mensagem}</p>}
                </form>
              </section>
            </div>
          </div>
        )}

        {/* PÁGINA 2: UPLOAD EM MASSA */}
        {abaAtiva === 'massa' && (
          <div className="max-w-3xl mx-auto">
            <header className="mb-8"><h2 className="text-3xl font-bold text-gray-800">Upload em Massa</h2></header>
            <section className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
              
              <div className="mb-6 grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Legenda Padrão (para todos)</label>
                  <textarea value={legendaMassa} onChange={(e) => setLegendaMassa(e.target.value)} rows="2" className="w-full border border-gray-300 rounded-md p-3 text-sm bg-gray-50"></textarea>
                </div>
                
                {/* NOVO CAMPO: Capa para Upload em Massa */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Capa Padrão (Opcional - mesma capa para todos)</label>
                  <input type="file" accept="image/*" onChange={(e) => setCapaMassa(e.target.files[0])} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:font-semibold file:bg-purple-50 file:text-purple-700 cursor-pointer" />
                </div>
              </div>

              <div className="border-dashed border-2 rounded-xl p-10 text-center mb-6 relative bg-gray-50">
                <input type="file" multiple accept="video/mp4" onChange={(e) => {setArquivosMassa(Array.from(e.target.files)); setMensagemMassa('')}} disabled={fazendoUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" />
                <div className="pointer-events-none">
                  {arquivosMassa.length === 0 ? <h3 className="text-lg font-medium">Selecione vários ficheiros MP4</h3> : <div className="text-blue-700 font-bold text-xl">{arquivosMassa.length} vídeo(s) na agulha!</div>}
                </div>
              </div>

              {fazendoUpload && progressoMassa.total > 0 && (
                <div className="mb-6">
                  <div className="flex justify-between text-sm mb-2"><span>A enviar...</span><span>{progressoMassa.atual} / {progressoMassa.total}</span></div>
                  <div className="w-full bg-gray-200 rounded-full h-3"><div className="bg-blue-600 h-3 rounded-full" style={{ width: `${(progressoMassa.atual / progressoMassa.total) * 100}%` }}></div></div>
                </div>
              )}

              <div className="text-center">
                <button onClick={iniciarUploadEmMassa} disabled={fazendoUpload || arquivosMassa.length === 0} className="px-10 py-3 rounded-md text-sm font-bold bg-blue-600 text-white">Iniciar Distribuição</button>
                {mensagemMassa && <p className="mt-4 text-sm font-bold text-blue-600">{mensagemMassa}</p>}
              </div>
            </section>
          </div>
        )}

        {/* PÁGINA 3: GRADE DE HORÁRIOS */}
        {abaAtiva === 'horarios' && (
          <div className="max-w-4xl mx-auto">
            <header className="mb-8"><h2 className="text-3xl font-bold text-gray-800">Grade de Horários</h2></header>
            <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-1 bg-gray-50 p-5 rounded-lg border border-gray-100 h-fit">
                  <form onSubmit={adicionarHorario} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Dia da Semana</label>
                      <select name="dia_semana" required className="w-full border border-gray-300 rounded-md p-2 text-sm bg-white">{DIAS_SEMANA.map((dia, i) => <option key={i} value={i}>{dia}</option>)}</select>
                    </div>
                    <div><label className="block text-xs font-medium text-gray-600 mb-1">Horário</label><input type="time" name="horario" required className="w-full border border-gray-300 rounded-md p-2 text-sm bg-white" /></div>
                    <button type="submit" className="w-full bg-gray-800 text-white py-2 rounded-md text-sm font-medium">Adicionar</button>
                  </form>
                </div>
                <div className="md:col-span-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {horarios.map((h) => (
                      <div key={h.id} className="p-4 border border-gray-200 rounded-lg flex justify-between items-center bg-white">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-blue-500 uppercase">{DIAS_SEMANA[h.dia_semana]}</span>
                          {/* A correção visual dos zeros à esquerda foi aplicada aqui! */}
                          <span className="text-xl font-bold text-gray-800">{h.horario.split(':').slice(0, 2).map(n => n.padStart(2, '0')).join(':')}</span>
                        </div>
                        <button onClick={() => apagarHorario(h.id)} className="text-red-400 hover:text-red-600 font-bold px-2">&times;</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

      </main>
    </div>
  )
}

export default App
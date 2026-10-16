'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://glbliekauxbmzsrwwovf.supabase.co';
const supabaseAnonKey = 'sb_publishable_xFXfRplbz_LnLrL8oROcBw_aH0d_FhV';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const perguntasSabados: Record<number, string> = {
  1: "O que o território grita e o que o nosso corpo acolhe hoje?",
  2: "Qual é a semente de cura que a nossa ancestralidade plantou aqui e agora?",
  3: "Onde a nossa saúde coletiva encontra a nossa autonomia e rebeldia?",
  4: "Que futuro a gente constrói quando tomamos a palavra e o espaço?"
};

export default function Home() {
  const [posts, setPosts] = useState<any[]>([]);
  const [comites, setComites] = useState<any[]>([]);
  const [estudantes, setEstudantes] = useState<any[]>([]);
  const [frequencias, setFrequencias] = useState<any[]>([]);

  const [sabadoAtual, setSabadoAtual] = useState<number>(1);
  const [filtroSabado, setFiltroSabado] = useState<number | 'todos'>('todos');
  const [autor, setAutor] = useState('');
  const [legenda, setLegenda] = useState('');
  const [arquivoFoto, setArquivoFoto] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);

  // Estados de Gestão e Navegação
  const [abaAtiva, setAbaAtiva] = useState<'mural' | 'comites' | 'frequencia'>('mural');
  const [subAbaGestao, setSubAbaGestao] = useState<'estudantes' | 'frequencia' | 'comites_gestao'>('estudantes');
  const [isAdmin, setIsAdmin] = useState(false);
  const [emailLogin, setEmailLogin] = useState('');

  // Formulários de Gestão
  const [novoComiteNome, setNovoComiteNome] = useState('');
  const [novoComiteRef, setNovoComiteRef] = useState('');
  const [novoEstudanteNome, setNovoEstudanteNome] = useState('');
  const [comiteSelecionadoId, setComiteSelecionadoId] = useState('');

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    // 1. Carregar Posts do Mural
    const { data: postsData } = await supabase.from('mural_feed').select('*').order('created_at', { ascending: false });
    if (postsData) setPosts(postsData);

    // 2. Carregar Comitês Regionais
    const { data: comitesData } = await supabase.from('comites').select('*').order('created_at', { ascending: true });
    if (comitesData) setComites(comitesData);

    // 3. Carregar Estudantes Matriculados
    const { data: estData } = await supabase.from('estudantes').select('*').order('nome', { ascending: true });
    if (estData) setEstudantes(estData);

    // 4. Carregar Registro de Frequências
    const { data: freqData } = await supabase.from('frequencias').select('*');
    if (freqData) setFrequencias(freqData);
  }

  // --- AÇÕES DE GESTÃO ---

  // Criar Novo Comitê Regional
  const handleCriarComite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoComiteNome) return;

    const { error } = await supabase.from('comites').insert([{
      nome: novoComiteNome,
      referencia: novoComiteRef || 'A definir'
    }]);

    if (error) alert('Erro ao criar comitê.');
    else {
      setNovoComiteNome('');
      setNovoComiteRef('');
      carregarDados();
    }
  };

  // Cadastrar Novo Estudante
  const handleCadastrarEstudante = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoEstudanteNome) return;

    const comiteObj = comites.find(c => c.id === comiteSelecionadoId);

    const { error } = await supabase.from('estudantes').insert([{
      nome: novoEstudanteNome,
      comite_id: comiteObj ? comiteObj.id : null,
      comite_nome: comiteObj ? comiteObj.nome : 'Sem comitê',
      referencia_nome: comiteObj ? comiteObj.referencia : 'A definir'
    }]);

    if (error) alert('Erro ao matricular estudante.');
    else {
      setNovoEstudanteNome('');
      carregarDados();
    }
  };

  // Alternar Frequência Bissetorial (Manhã / Tarde)
  const toggleFrequenciaDB = async (estudanteId: string, sabado: number, turno: 'M' | 'T') => {
    const registroExistente = frequencias.find(
      f => f.estudante_id === estudanteId && f.sabado === sabado && f.turno === turno
    );

    if (registroExistente) {
      await supabase
        .from('frequencias')
        .update({ presente: !registroExistente.presente })
        .eq('id', registroExistente.id);
    } else {
      await supabase.from('frequencias').insert([{
        estudante_id: estudanteId,
        sabado,
        turno,
        presente: true
      }]);
    }

    carregarDados();
  };

  // Moderação: Deletar Post no Mural
  async function deletarPost(id: string) {
    if (!confirm('Queres mesmo apagar este registo do mural?')) return;
    const { error } = await supabase.from('mural_feed').delete().eq('id', id);
    if (error) alert('Erro ao apagar post.');
    else carregarDados();
  }

  // Exportar Relatório de Gestão em CSV
  const exportarCSV = () => {
    const headers = ['Nome Estudante', 'Comitê', 'Liderança Referência', 'S1_M', 'S1_T', 'S2_M', 'S2_T', 'S3_M', 'S3_T', 'S4_M', 'S4_T'];
    const rows = estudantes.map(e => {
      const getP = (sab: number, tur: 'M' | 'T') => {
        const f = frequencias.find(item => item.estudante_id === e.id && item.sabado === sab && item.turno === tur);
        return f ? (f.presente ? 'P' : 'F') : 'F';
      };

      return [
        `"${e.nome}"`,
        `"${e.comite_nome || ''}"`,
        `"${e.referencia_nome || ''}"`,
        getP(1, 'M'), getP(1, 'T'),
        getP(2, 'M'), getP(2, 'T'),
        getP(3, 'M'), getP(3, 'T'),
        getP(4, 'M'), getP(4, 'T')
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'relatorio_presenca_promotores.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleVerificarAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (emailLogin.toLowerCase().includes('admin') || emailLogin.toLowerCase().includes('gestao') || emailLogin.includes('@')) {
      setIsAdmin(true);
      setAbaAtiva('frequencia');
    } else {
      alert('E-mail não autorizado para a gestão.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!arquivoFoto) {
      alert('Por favor, seleciona uma foto!');
      return;
    }

    setEnviando(true);

    try {
      const fileName = `${Date.now()}_${arquivoFoto.name}`;
      const { error: storageError } = await supabase.storage.from('mural-fotos').upload(fileName, arquivoFoto);
      if (storageError) throw storageError;

      const { data: publicUrlData } = supabase.storage.from('mural-fotos').getPublicUrl(fileName);
      const fotoUrl = publicUrlData.publicUrl;

      const { error: dbError } = await supabase.from('mural_feed').insert([{
        autor,
        legenda,
        comite: `Sábado ${sabadoAtual}`,
        foto_url: fotoUrl
      }]);

      if (dbError) throw dbError;

      setLegenda('');
      setArquivoFoto(null);
      setModalAberto(false);
      carregarDados();
    } catch (err) {
      console.error(err);
      alert('Erro ao publicar.');
    } finally {
      setEnviando(false);
    }
  };

  const fotosFundo = posts.map(p => p.foto_url).filter(Boolean);
  const postsFiltrados = filtroSabado === 'todos' ? posts : posts.filter(p => p.comite === `Sábado ${filtroSabado}`);

  return (
    <main className="min-h-screen bg-[#0a0a0d] text-[#f4f4f6] font-sans relative pb-28 select-none overflow-x-hidden">
      
      {/* 🔮 RECURSO GRÁFICO 1: Ambient Mesh Glows (Gradients Vivos de Neon) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-20 -left-20 w-80 h-80 bg-[#00ffcc]/10 rounded-full filter blur-[100px] animate-pulse duration-1000" />
        <div className="absolute top-1/3 -right-20 w-96 h-96 bg-[#ff007f]/15 rounded-full filter blur-[120px] animate-pulse duration-700" />
        <div className="absolute -bottom-20 left-1/4 w-96 h-96 bg-[#ffd700]/10 rounded-full filter blur-[130px]" />
        
        {/* RECURSO GRÁFICO 2: Textura Cyberpunk Grid Subtil */}
        <div 
          className="absolute inset-0 opacity-[0.04]" 
          style={{
            backgroundImage: `radial-gradient(#00ffcc 1px, transparent 1px), radial-gradient(#ff007f 1px, #0a0a0d 1px)`,
            backgroundSize: `24px 24px`,
            backgroundPosition: `0 0, 12px 12px`
          }}
        />
      </div>

      {/* RECURSO GRÁFICO 3: Mosaico Vivo das Fotos dos Jovens */}
      <div className="fixed inset-0 opacity-25 pointer-events-none z-0">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 p-2 h-full overflow-hidden filter contrast-125 saturate-150">
          {fotosFundo.length > 0 ? (
            fotosFundo.concat(fotosFundo).map((url, idx) => (
              <div key={idx} className="h-36 rounded-2xl overflow-hidden border border-[#ff007f]/20 shadow-inner">
                <img src={url} alt="Fundo vivo" className="w-full h-full object-cover scale-110 filter brightness-90" />
              </div>
            ))
          ) : (
            <div className="col-span-full h-full flex items-center justify-center">
              <div className="text-[10px] tracking-widest text-[#00ffcc]/60 font-mono border border-[#00ffcc]/20 px-4 py-2 rounded-full backdrop-blur-sm bg-black/40 animate-pulse">
                ⚡ AGUARDANDO OS PRIMEIRA REGISTOS DO TERRITÓRIO...
              </div>
            </div>
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0d]/80 via-transparent to-[#0a0a0d]" />
      </div>

      <div className="relative z-10">
        
        {/* Header Afropunk */}
        <header className="border-b-2 border-[#ff007f] bg-[#0a0a0d]/95 backdrop-blur-md px-4 py-4 sticky top-0 z-40 shadow-2xl">
          <div className="max-w-md mx-auto flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-[#00ffcc] rounded-full animate-ping" />
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#00ffcc] block leading-none">
                  Tecnologia Social & Saúde
                </span>
                <h1 className="text-lg font-black text-[#ffd700] tracking-tighter uppercase italic">
                  PROMOTORES JOVENS
                </h1>
              </div>
            </div>

            <button 
              onClick={() => {
                if (!isAdmin) {
                  const email = prompt('Digita o teu e-mail de Gestão:');
                  if (email) {
                    setEmailLogin(email);
                    setIsAdmin(true);
                    setAbaAtiva('frequencia');
                  }
                } else {
                  setAbaAtiva('frequencia');
                }
              }}
              className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border border-[#ff007f] text-[#ff007f] hover:bg-[#ff007f] hover:text-white transition-all active:scale-95"
            >
              {isAdmin ? '⚙️ Gestão' : '🔒 Restrito'}
            </button>
          </div>
        </header>

        <div className="max-w-md mx-auto p-4 space-y-6">

          {/* ABA 1: MURAL COLETIVO */}
          {abaAtiva === 'mural' && (
            <>
              {/* Card Disparador do Sábado */}
              <section className="bg-gradient-to-br from-[#181226]/90 to-[#0a0a0d]/90 border-2 border-[#ffd700] rounded-2xl p-5 shadow-[0_0_20px_rgba(255,215,0,0.15)] relative overflow-hidden backdrop-blur-sm">
                <div className="flex justify-between items-center mb-3">
                  <span className="bg-[#ffd700] text-black text-[10px] font-black uppercase px-2.5 py-1 rounded-md tracking-wider shadow-md">
                    Sábado {sabadoAtual} • Disparador
                  </span>
                  
                  <div className="flex space-x-1 bg-[#0a0a0d] p-1 rounded-lg border border-[#333]">
                    {[1, 2, 3, 4].map((s) => (
                      <button 
                        key={s} 
                        onClick={() => setSabadoAtual(s)}
                        className={`w-7 h-7 text-xs font-black rounded-md transition-all ${
                          sabadoAtual === s ? 'bg-[#ff007f] text-white shadow-lg scale-105' : 'text-gray-500 hover:text-white'
                        }`}
                      >
                        S{s}
                      </button>
                    ))}
                  </div>
                </div>

                <p className="text-base font-bold text-[#f4f4f6] leading-snug tracking-tight italic">
                  &ldquo;{perguntasSabados[sabadoAtual]}&rdquo;
                </p>
              </section>

              {/* Filtro por Sábado */}
              <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
                <span className="text-gray-400 font-bold uppercase text-[10px]">Filtrar:</span>
                <button 
                  onClick={() => setFiltroSabado('todos')}
                  className={`px-3 py-1 rounded-full font-bold whitespace-nowrap ${filtroSabado === 'todos' ? 'bg-[#00ffcc] text-black' : 'bg-[#121218] text-gray-400 border border-[#333]'}`}
                >
                  Todos ({posts.length})
                </button>
                {[1, 2, 3, 4].map(s => (
                  <button 
                    key={s} 
                    onClick={() => setFiltroSabado(s)}
                    className={`px-3 py-1 rounded-full font-bold whitespace-nowrap ${filtroSabado === s ? 'bg-[#ff007f] text-white' : 'bg-[#121218] text-gray-400 border border-[#333]'}`}
                  >
                    Sábado {s}
                  </button>
                ))}
              </div>

              {/* Feed de Relatos */}
              <div className="space-y-5">
                {postsFiltrados.map((post: any, idx) => (
                  <article key={idx} className="bg-[#121218]/90 border-2 border-[#262633] rounded-3xl overflow-hidden shadow-2xl relative backdrop-blur-sm">
                    {isAdmin && (
                      <button 
                        onClick={() => deletarPost(post.id)}
                        className="absolute top-3 right-3 bg-red-600 text-white p-2 rounded-full text-xs z-20 shadow-lg"
                        title="Apagar Post"
                      >
                        🗑️
                      </button>
                    )}

                    {post.foto_url && (
                      <div className="relative group">
                        <img src={post.foto_url} alt="Registro" className="w-full h-80 object-cover filter contrast-110" />
                        <span className="absolute bottom-3 left-3 bg-[#ff007f] text-white text-[10px] font-black uppercase px-3 py-1 rounded-full tracking-wider shadow-lg">
                          {post.comite || '#Território'}
                        </span>
                      </div>
                    )}
                    
                    <div className="p-5 space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[#00ffcc] font-black tracking-wide uppercase">👤 {post.autor}</span>
                        <span className="text-gray-500 font-mono text-[10px]">{new Date(post.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm text-gray-200 leading-relaxed">{post.legenda}</p>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}

          {/* ABA 2: COMITÊS REGIONAIS (Visão Estudante) */}
          {abaAtiva === 'comites' && (
            <div className="space-y-4">
              <h2 className="text-sm font-black text-[#ffd700] uppercase tracking-wider">Comitês Regionais de Saúde</h2>
              {comites.length === 0 ? (
                <p className="text-xs text-gray-500 italic bg-[#121218]/80 p-4 rounded-2xl border border-[#222]">
                  Nenhum comitê estruturado ainda.
                </p>
              ) : (
                comites.map((comite) => (
                  <div key={comite.id} className="bg-[#121218]/90 border border-[#2a2a38] p-4 rounded-2xl space-y-1 backdrop-blur-sm">
                    <h3 className="text-xs font-bold text-[#00ffcc]">{comite.nome}</h3>
                    <p className="text-[11px] text-gray-300">Referência: <strong className="text-white">{comite.referencia}</strong></p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ABA 3: PAINEL DE GESTÃO COMPLETO (SÓ ADMIN) */}
          {abaAtiva === 'frequencia' && (
            <div className="space-y-5 bg-[#121218]/95 border-2 border-[#ff007f] p-5 rounded-3xl shadow-2xl backdrop-blur-md">
              
              <div className="flex justify-between items-center border-b border-[#222] pb-3">
                <h2 className="text-sm font-black text-[#ff007f] uppercase tracking-wider">Painel de Gestão</h2>
                {isAdmin && (
                  <button onClick={exportarCSV} className="bg-[#ffd700] text-black font-black text-[10px] px-3 py-1.5 rounded-lg uppercase shadow-md">
                    📊 Exportar CSV
                  </button>
                )}
              </div>

              {!isAdmin ? (
                <form onSubmit={handleVerificarAdmin} className="space-y-3 pt-2">
                  <input 
                    type="email" 
                    placeholder="E-mail de gestão" 
                    value={emailLogin}
                    onChange={e => setEmailLogin(e.target.value)}
                    required
                    className="w-full bg-[#0a0a0d] border border-[#333] rounded-xl p-3 text-xs text-white"
                  />
                  <button type="submit" className="w-full bg-[#ff007f] text-white font-black py-2.5 rounded-xl text-xs uppercase">
                    Acessar Gestão
                  </button>
                </form>
              ) : (
                <>
                  <div className="flex space-x-1 bg-[#0a0a0d] p-1 rounded-xl border border-[#333]">
                    <button 
                      onClick={() => setSubAbaGestao('estudantes')}
                      className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded-lg ${subAbaGestao === 'estudantes' ? 'bg-[#00ffcc] text-black' : 'text-gray-400'}`}
                    >
                      Estudantes ({estudantes.length})
                    </button>
                    <button 
                      onClick={() => setSubAbaGestao('frequencia')}
                      className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded-lg ${subAbaGestao === 'frequencia' ? 'bg-[#ff007f] text-white' : 'text-gray-400'}`}
                    >
                      Chamada (M/T)
                    </button>
                    <button 
                      onClick={() => setSubAbaGestao('comites_gestao')}
                      className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded-lg ${subAbaGestao === 'comites_gestao' ? 'bg-[#ffd700] text-black' : 'text-gray-400'}`}
                    >
                      Comitês ({comites.length})
                    </button>
                  </div>

                  {/* CADASTRAR ESTUDANTE */}
                  {subAbaGestao === 'estudantes' && (
                    <div className="space-y-4">
                      <form onSubmit={handleCadastrarEstudante} className="bg-[#0a0a0d] p-3 rounded-2xl border border-[#333] space-y-2">
                        <span className="text-[10px] text-[#00ffcc] font-bold uppercase">Matricular Novo Promotor Jovem</span>
                        <input 
                          type="text" 
                          placeholder="Nome Completo do Jovem" 
                          value={novoEstudanteNome}
                          onChange={e => setNovoEstudanteNome(e.target.value)}
                          required
                          className="w-full bg-[#121218] border border-[#333] rounded-xl p-2.5 text-xs text-white"
                        />
                        <select 
                          value={comiteSelecionadoId}
                          onChange={e => setComiteSelecionadoId(e.target.value)}
                          className="w-full bg-[#121218] border border-[#333] rounded-xl p-2.5 text-xs text-white"
                        >
                          <option value="">Selecione o Comitê Regional...</option>
                          {comites.map(c => (
                            <option key={c.id} value={c.id}>{c.nome} (Ref: {c.referencia})</option>
                          ))}
                        </select>
                        <button type="submit" className="w-full bg-[#00ffcc] text-black font-black py-2 rounded-xl text-xs uppercase">
                          Salvar Matrícula
                        </button>
                      </form>

                      <div className="space-y-2">
                        {estudantes.map(est => (
                          <div key={est.id} className="bg-[#0a0a0d] p-3 rounded-xl border border-[#2a2a35] flex justify-between items-center text-xs">
                            <div>
                              <p className="font-bold text-white">{est.nome}</p>
                              <p className="text-[10px] text-gray-400">{est.comite_nome || 'Sem comitê'}</p>
                            </div>
                            <span className="bg-[#222] text-[#00ffcc] text-[9px] font-bold px-2 py-1 rounded">Ativo</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* FREQUÊNCIA MANHÃ / TARDE */}
                  {subAbaGestao === 'frequencia' && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-[#ffd700] font-bold">Sábado {sabadoAtual}:</span>
                        <div className="flex space-x-1">
                          {[1, 2, 3, 4].map(s => (
                            <button 
                              key={s} 
                              onClick={() => setSabadoAtual(s)}
                              className={`px-2 py-0.5 text-[10px] rounded font-bold ${sabadoAtual === s ? 'bg-[#ff007f] text-white' : 'bg-gray-800 text-gray-400'}`}
                            >
                              S{s}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3">
                        {estudantes.map(est => {
                          const fManha = frequencias.find(f => f.estudante_id === est.id && f.sabado === sabadoAtual && f.turno === 'M');
                          const fTarde = frequencias.find(f => f.estudante_id === est.id && f.sabado === sabadoAtual && f.turno === 'T');

                          const pManha = fManha ? fManha.presente : false;
                          const pTarde = fTarde ? fTarde.presente : false;

                          return (
                            <div key={est.id} className="bg-[#0a0a0d] p-3 rounded-2xl border border-[#333] space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-white">{est.nome}</span>
                                <span className="text-[9px] text-gray-400">{est.comite_nome}</span>
                              </div>

                              <div className="grid grid-cols-2 gap-2 pt-1">
                                <button 
                                  onClick={() => toggleFrequenciaDB(est.id, sabadoAtual, 'M')}
                                  className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border ${pManha ? 'bg-green-600 border-green-500 text-white' : 'bg-[#121218] border-[#333] text-gray-400'}`}
                                >
                                  Manhã: {pManha ? '✓ Presente' : '✕ Ausente'}
                                </button>
                                <button 
                                  onClick={() => toggleFrequenciaDB(est.id, sabadoAtual, 'T')}
                                  className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border ${pTarde ? 'bg-green-600 border-green-500 text-white' : 'bg-[#121218] border-[#333] text-gray-400'}`}
                                >
                                  Tarde: {pTarde ? '✓ Presente' : '✕ Ausente'}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* COMITÊS */}
                  {subAbaGestao === 'comites_gestao' && (
                    <div className="space-y-4">
                      <form onSubmit={handleCriarComite} className="bg-[#0a0a0d] p-3 rounded-2xl border border-[#333] space-y-2">
                        <span className="text-[10px] text-[#ffd700] font-bold uppercase">Cadastrar Novo Comitê Regional</span>
                        <input 
                          type="text" 
                          placeholder="Ex: Comitê Sul (Restinga & Extremo Sul)" 
                          value={novoComiteNome}
                          onChange={e => setNovoComiteNome(e.target.value)}
                          required
                          className="w-full bg-[#121218] border border-[#333] rounded-xl p-2.5 text-xs text-white"
                        />
                        <input 
                          type="text" 
                          placeholder="Liderança de Referência (opcional)" 
                          value={novoComiteRef}
                          onChange={e => setNovoComiteRef(e.target.value)}
                          className="w-full bg-[#121218] border border-[#333] rounded-xl p-2.5 text-xs text-white"
                        />
                        <button type="submit" className="w-full bg-[#ffd700] text-black font-black py-2 rounded-xl text-xs uppercase">
                          Criar Comitê
                        </button>
                      </form>

                      <div className="space-y-2">
                        {comites.map(com => (
                          <div key={com.id} className="bg-[#0a0a0d] p-3 rounded-xl border border-[#333]">
                            <p className="text-xs font-bold text-[#00ffcc]">{com.nome}</p>
                            <p className="text-[10px] text-gray-400">Referência: <strong className="text-white">{com.referencia}</strong></p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

            </div>
          )}

        </div>
      </div>

      {/* Botão Flutuante (Mural) */}
      {abaAtiva === 'mural' && (
        <div className="fixed bottom-20 right-5 z-40">
          <button 
            onClick={() => setModalAberto(true)}
            className="w-14 h-14 bg-gradient-to-tr from-[#ff007f] to-[#ffd700] text-black font-black rounded-full shadow-[0_0_25px_rgba(255,0,127,0.5)] flex items-center justify-center text-2xl active:scale-90 border-2 border-black transition-transform"
          >
            📸
          </button>
        </div>
      )}

      {/* Modal de Publicação */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#121218] border-2 border-[#00ffcc] w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#222] pb-3">
              <h2 className="text-sm font-black text-[#ffd700] uppercase tracking-wider">Publicar no Diário</h2>
              <button onClick={() => setModalAberto(false)} className="text-gray-400 text-lg">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <input 
                type="text" 
                placeholder="Teu Nome / Coletivo" 
                value={autor} 
                onChange={e => setAutor(e.target.value)}
                required
                className="w-full bg-[#0a0a0d] border border-[#333] rounded-xl p-3 text-xs text-white"
              />
              <input 
                type="file" 
                accept="image/*"
                capture="environment"
                onChange={e => setArquivoFoto(e.target.files?.[0] || null)}
                required
                className="w-full text-xs text-gray-400 file:py-2 file:px-4 file:rounded-xl file:bg-[#ffd700] file:text-black cursor-pointer bg-[#0a0a0d] border border-[#333] rounded-xl p-2"
              />
              <textarea 
                placeholder="Relato ou reflexão..." 
                value={legenda} 
                onChange={e => setLegenda(e.target.value)}
                rows={3}
                required
                className="w-full bg-[#0a0a0d] border border-[#333] rounded-xl p-3 text-xs text-white resize-none"
              />
              <button 
                type="submit" 
                disabled={enviando}
                className="w-full bg-gradient-to-r from-[#00ffcc] via-[#ffd700] to-[#ff007f] text-black font-black py-3.5 rounded-xl text-xs uppercase"
              >
                {enviando ? 'A enviar...' : 'Lançar no Mural 🚀'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Menu Inferior */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#0a0a0d]/95 backdrop-blur-lg border-t border-[#222] py-2 z-40">
        <div className="max-w-md mx-auto flex justify-around items-center">
          <button onClick={() => setAbaAtiva('mural')} className={`flex flex-col items-center py-1 px-4 ${abaAtiva === 'mural' ? 'text-[#ffd700]' : 'text-gray-500'}`}>
            <span className="text-lg">🖼️</span>
            <span className="text-[9px] font-black uppercase">Mural</span>
          </button>
          <button onClick={() => setAbaAtiva('comites')} className={`flex flex-col items-center py-1 px-4 ${abaAtiva === 'comites' ? 'text-[#00ffcc]' : 'text-gray-500'}`}>
            <span className="text-lg">📍</span>
            <span className="text-[9px] font-black uppercase">Comitês</span>
          </button>
          {isAdmin && (
            <button onClick={() => setAbaAtiva('frequencia')} className={`flex flex-col items-center py-1 px-4 ${abaAtiva === 'frequencia' ? 'text-[#ff007f]' : 'text-gray-500'}`}>
              <span className="text-lg">📋</span>
              <span className="text-[9px] font-black uppercase">Gestão</span>
            </button>
          )}
        </div>
      </nav>

    </main>
  );
}
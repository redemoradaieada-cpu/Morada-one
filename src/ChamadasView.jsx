import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import {
  BellRing, BedDouble, Users, CheckCircle2, XCircle, Clock,
  ChevronRight, X, AlertTriangle, RefreshCw, Plus, Search,
  Filter, Check, Minus, MessageSquare, ArrowLeft, Moon,
  ClipboardList, BarChart3, MapPin, ChevronDown, CalendarDays, UserX
} from 'lucide-react';
import Swal from 'sweetalert2';
import { useEventContext } from './contexts/EventContext';

// ─── Helpers de status ────────────────────────────────────────────────────────
const STATUS_CHAMADA = {
  pendente:     { label: 'Pendente',      cor: 'bg-slate-100 text-slate-500',    dot: 'bg-slate-400',    border: 'border-slate-200' },
  em_andamento: { label: 'Em Andamento',  cor: 'bg-amber-100 text-amber-700',    dot: 'bg-amber-500',    border: 'border-amber-300' },
  concluida:    { label: 'Concluída',     cor: 'bg-emerald-100 text-emerald-700',dot: 'bg-emerald-500',  border: 'border-emerald-300' },
  com_ausentes: { label: 'Com Ausentes',  cor: 'bg-red-100 text-red-700',        dot: 'bg-red-500',      border: 'border-red-300' },
};

function StatusBadge({ status }) {
  const s = STATUS_CHAMADA[status] || STATUS_CHAMADA.pendente;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${s.cor}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

// ─── Componente: Relatório de Histórico ──────────────────────────────────────
function TelaRelatorios({ sessoes, quartos, inscritos }) {
  const [sessaoExpandida, setSessaoExpandida] = useState(null);
  const [quartoExpandido, setQuartoExpandido] = useState(null);
  const [dadosSessao, setDadosSessao] = useState({ chamadas: [], itens: [], loading: false });

  // Garante apenas 1 registro por dia na interface (caso tenham sido criados duplicados por bug anterior)
  const sessoesUnicas = [];
  const datasVistas = new Set();
  for (const s of sessoes) {
    if (!datasVistas.has(s.nome)) {
      datasVistas.add(s.nome);
      sessoesUnicas.push(s);
    }
  }

  const carregarSessao = async (sessaoId) => {
    if (sessaoExpandida === sessaoId) {
      setSessaoExpandida(null);
      setQuartoExpandido(null);
      return;
    }
    setSessaoExpandida(sessaoId);
    setQuartoExpandido(null);
    setDadosSessao({ chamadas: [], itens: [], loading: true });

    const [cRes, iRes] = await Promise.all([
      supabase.from('chamadas').select('*').eq('sessao_id', sessaoId),
      supabase.from('chamada_itens').select('*, chamadas!inner(sessao_id)').eq('chamadas.sessao_id', sessaoId)
    ]);

    setDadosSessao({
      chamadas: cRes.data || [],
      itens: iRes.data || [],
      loading: false
    });
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-red-600 flex-shrink-0">
          <BarChart3 size={24} />
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-900">Histórico de Chamadas</h2>
          <p className="text-sm text-slate-500 mt-0.5">Selecione uma data para ver os quartos e quem estava ausente.</p>
        </div>
      </div>

      <div className="space-y-4">
        {sessoesUnicas.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
            Nenhuma sessão de chamadas registrada ainda.
          </div>
        )}

        {sessoesUnicas.map(sessao => {
          const isExp = sessaoExpandida === sessao.id;
          return (
            <div key={sessao.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden transition-all shadow-sm">
              <button
                onClick={() => carregarSessao(sessao.id)}
                className="w-full px-6 py-5 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                    <CalendarDays size={18} />
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-slate-900">{sessao.nome}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Criada em: {new Date(sessao.criado_em).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
                <ChevronDown size={20} className={`text-slate-400 transition-transform ${isExp ? 'rotate-180' : ''}`} />
              </button>

              {isExp && (
                <div className="border-t border-slate-100 bg-slate-50/50 p-6">
                  {dadosSessao.loading ? (
                    <div className="text-center py-6 text-slate-400 text-sm">Carregando quartos...</div>
                  ) : dadosSessao.chamadas.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-sm">Nenhuma chamada registrada para este dia.</div>
                  ) : (
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <BedDouble size={14} /> Situação dos Quartos
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {dadosSessao.chamadas.map(chamada => {
                          const quarto = quartos.find(q => q.id === chamada.quarto_id);
                          if (!quarto) return null;
                          const s = STATUS_CHAMADA[chamada.status] || STATUS_CHAMADA.pendente;
                          
                          // Ausentes específicos deste quarto
                          const itensQuarto = dadosSessao.itens.filter(i => i.chamada_id === chamada.id && i.status === 'ausente');
                          const hasFaltas = itensQuarto.length > 0;
                          const isQtoExp = quartoExpandido === chamada.id;

                          return (
                            <div key={chamada.id} className={`bg-white rounded-xl border-2 transition-all ${s.border} overflow-hidden`}>
                              <div 
                                onClick={() => hasFaltas && setQuartoExpandido(isQtoExp ? null : chamada.id)}
                                className={`p-4 flex items-center justify-between transition-colors ${hasFaltas ? 'cursor-pointer hover:bg-slate-50' : ''}`}
                              >
                                <div>
                                  <h4 className="font-bold text-slate-900">Quarto {quarto.nome}</h4>
                                  <span className={`text-[10px] font-bold uppercase mt-1 inline-block px-2 py-0.5 rounded ${s.cor}`}>
                                    {s.label}
                                  </span>
                                </div>
                                {hasFaltas && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-1 rounded-lg">
                                      {itensQuarto.length} ausente(s)
                                    </span>
                                    <ChevronDown size={16} className={`text-slate-400 transition-transform ${isQtoExp ? 'rotate-180' : ''}`} />
                                  </div>
                                )}
                              </div>
                              
                              {isQtoExp && hasFaltas && (
                                <div className="border-t border-red-100 bg-red-50/50 p-4">
                                  <ul className="space-y-3">
                                    {itensQuarto.map(item => {
                                      const pessoa = inscritos.find(p => p.id === item.inscricao_id);
                                      return (
                                        <li key={item.id} className="text-sm">
                                          <div className="font-bold text-red-800 flex items-center gap-2">
                                            <UserX size={14} className="text-red-500" /> 
                                            {pessoa?.nome_completo || 'Hóspede desconhecido'}
                                          </div>
                                          {item.observacao && (
                                            <div className="text-xs text-red-600 mt-1 italic pl-6">
                                              ↳ "{item.observacao}"
                                            </div>
                                          )}
                                        </li>
                                      );
                                    })}
                                  </ul>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Componente: Tela de Chamada Ativa (para o voluntário) ───────────────────
function TelaCalledRoom({ chamada, inscritos, onConcluir, onVoltar }) {
  const [itens, setItens] = useState([]);
  const [obs, setObs] = useState({});
  const [showObs, setShowObs] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [busca, setBusca] = useState('');

  // Carrega itens já salvos (se chamada já foi aberta antes)
  useEffect(() => {
    async function carregarItens() {
      const { data } = await supabase
        .from('chamada_itens')
        .select('*')
        .eq('chamada_id', chamada.id);

      if (data && data.length > 0) {
        setItens(data);
        const obsInit = {};
        data.forEach(it => { if (it.observacao) obsInit[it.inscricao_id] = it.observacao; });
        setObs(obsInit);
      } else {
        const novosItens = inscritos.map(p => ({
          chamada_id: chamada.id,
          inscricao_id: p.id,
          status: 'pendente',
          observacao: null,
          _local: true,
        }));
        setItens(novosItens);
      }

      if (chamada.status === 'pendente') {
        await supabase.from('chamadas').update({
          status: 'em_andamento',
          iniciada_em: new Date().toISOString()
        }).eq('id', chamada.id);
      }
    }
    carregarItens();
  }, [chamada.id, inscritos]);

  const marcar = async (inscricaoId, novoStatus) => {
    const item = itens.find(it => it.inscricao_id === inscricaoId);

    if (item?._local) {
      const { data } = await supabase.from('chamada_itens').insert([{
        chamada_id: chamada.id,
        inscricao_id: inscricaoId,
        status: novoStatus,
        observacao: obs[inscricaoId] || null,
        updated_at: new Date().toISOString()
      }]).select().single();

      setItens(prev => prev.map(it => it.inscricao_id === inscricaoId ? { ...data } : it));
    } else if (item?.id) {
      await supabase.from('chamada_itens').update({
        status: novoStatus,
        observacao: obs[inscricaoId] || null,
        updated_at: new Date().toISOString()
      }).eq('id', item.id);

      setItens(prev => prev.map(it => it.inscricao_id === inscricaoId ? { ...it, status: novoStatus } : it));
    }
  };

  const salvarObs = async (inscricaoId) => {
    const item = itens.find(it => it.inscricao_id === inscricaoId);
    const obsTexto = obs[inscricaoId] || null;

    try {
      if (item?._local) {
        const { data, error } = await supabase.from('chamada_itens').insert([{
          chamada_id: chamada.id,
          inscricao_id: inscricaoId,
          status: 'pendente',
          observacao: obsTexto,
          updated_at: new Date().toISOString()
        }]).select().single();

        if (error) throw error;
        if (data) {
          setItens(prev => prev.map(it => it.inscricao_id === inscricaoId ? { ...data } : it));
        }
      } else if (item?.id) {
        const { error } = await supabase.from('chamada_itens').update({
          observacao: obsTexto,
          updated_at: new Date().toISOString()
        }).eq('id', item.id);

        if (error) throw error;
        setItens(prev => prev.map(it => it.inscricao_id === inscricaoId ? { ...it, observacao: obsTexto } : it));
      }

      Swal.fire({
        title: 'Salvo!',
        text: 'Observação registrada com sucesso.',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
    } catch (err) {
      console.error("Erro ao salvar observação:", err);
      Swal.fire("Erro", "Não foi possível salvar a observação: " + err.message, "error");
    }
  };

  const handleConcluir = async () => {
    setSalvando(true);
    for (const it of itens.filter(it => it._local)) {
      await supabase.from('chamada_itens').insert([{
        chamada_id: chamada.id,
        inscricao_id: it.inscricao_id,
        status: 'pendente',
        observacao: null,
        updated_at: new Date().toISOString()
      }]);
    }

    const temAusente = itens.some(it => it.status === 'ausente');
    await supabase.from('chamadas').update({
      status: temAusente ? 'com_ausentes' : 'concluida',
      concluida_em: new Date().toISOString()
    }).eq('id', chamada.id);

    setSalvando(false);
    onConcluir();
  };

  const presentes = itens.filter(it => it.status === 'presente').length;
  const ausentes = itens.filter(it => it.status === 'ausente').length;
  const pendentes = itens.filter(it => it.status === 'pendente').length;
  const total = inscritos.length;

  const inscritosFiltrados = inscritos.filter(p =>
    p.nome_completo?.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto">
      <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 mb-5 relative overflow-hidden">
        <div className="relative">
          <button onClick={onVoltar} className="flex items-center gap-1.5 text-slate-400 hover:text-red-600 text-xs font-bold mb-4 transition-colors">
            <ArrowLeft size={14} /> Voltar ao Painel
          </button>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Moon size={16} className="text-red-600" />
                <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest">Chamada Ativa</span>
              </div>
              <h2 className="text-2xl font-black text-slate-800">Quarto {chamada._quarto?.nome}</h2>
              {chamada._quarto?.ala_andar && (
                <p className="text-slate-500 text-sm mt-0.5 flex items-center gap-1">
                  <MapPin size={12} className="text-slate-400" /> {chamada._quarto.ala_andar}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <div className="text-center bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-1.5 min-w-[70px]">
                <div className="text-[9px] text-emerald-700 font-bold uppercase">Presentes</div>
                <div className="text-lg font-black text-emerald-700">{presentes}</div>
              </div>
              <div className="text-center bg-red-50 border border-red-100 rounded-xl px-3 py-1.5 min-w-[70px]">
                <div className="text-[9px] text-red-700 font-bold uppercase">Ausentes</div>
                <div className="text-lg font-black text-red-700">{ausentes}</div>
              </div>
              <div className="text-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 min-w-[70px]">
                <div className="text-[9px] text-slate-500 font-bold uppercase">Faltam</div>
                <div className="text-lg font-black text-slate-700">{pendentes}</div>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex justify-between text-[10px] text-slate-400 mb-1.5">
              <span>Progresso da chamada</span>
              <span>{presentes + ausentes}/{total} chamados</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex">
              <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${total > 0 ? (presentes / total) * 100 : 0}%` }} />
              <div className="h-full bg-red-500 transition-all duration-500" style={{ width: `${total > 0 ? (ausentes / total) * 100 : 0}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
        <input
          placeholder="Buscar nome..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none transition-all"
        />
      </div>

      <div className="space-y-2 flex-1 overflow-y-auto pb-4">
        {inscritosFiltrados.map((pessoa, idx) => {
          const item = itens.find(it => it.inscricao_id === pessoa.id);
          const statusAtual = item?.status || 'pendente';
          const obsAtual = obs[pessoa.id] || '';

          return (
            <div key={pessoa.id} className={`bg-white rounded-2xl border-2 transition-all ${statusAtual === 'presente' ? 'border-emerald-300 bg-emerald-50/30' : statusAtual === 'ausente' ? 'border-red-300 bg-red-50/30' : 'border-slate-200'}`}>
              <div className="p-4 flex items-center gap-4">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-sm ${statusAtual === 'presente' ? 'bg-emerald-500 text-white' : statusAtual === 'ausente' ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  {statusAtual === 'presente' ? <Check size={16} /> : statusAtual === 'ausente' ? <X size={16} /> : idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-bold text-base leading-tight truncate ${statusAtual === 'presente' ? 'text-emerald-800' : statusAtual === 'ausente' ? 'text-red-800' : 'text-slate-900'}`}>
                    {pessoa.nome_completo}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                    {pessoa.cidade && <span>{pessoa.cidade}</span>}
                    {pessoa.regional && <><span>·</span><span>{pessoa.regional}</span></>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => setShowObs(prev => ({ ...prev, [pessoa.id]: !prev[pessoa.id] }))} className={`p-2 rounded-xl transition-all border ${obsAtual ? 'border-amber-300 bg-amber-50 text-amber-600' : 'border-slate-200 text-slate-400 hover:border-slate-300'}`}>
                    <MessageSquare size={14} />
                  </button>
                  <button onClick={() => marcar(pessoa.id, statusAtual === 'presente' ? 'pendente' : 'presente')} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-sm transition-all ${statusAtual === 'presente' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30' : 'bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-700'}`}>
                    <Check size={15} />{statusAtual === 'presente' ? '✓' : 'Presente'}
                  </button>
                  <button onClick={() => marcar(pessoa.id, statusAtual === 'ausente' ? 'pendente' : 'ausente')} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-sm transition-all ${statusAtual === 'ausente' ? 'bg-red-500 text-white shadow-md shadow-red-500/30' : 'bg-slate-100 text-slate-600 hover:bg-red-100 hover:text-red-700'}`}>
                    <X size={15} />{statusAtual === 'ausente' ? '✗' : 'Ausente'}
                  </button>
                </div>
              </div>
              {showObs[pessoa.id] && (
                <div className="px-4 pb-4 pt-0">
                  <div className="flex gap-2">
                    <input type="text" placeholder="Observação (ex: foi ao banheiro...)" value={obsAtual} onChange={e => setObs(prev => ({ ...prev, [pessoa.id]: e.target.value }))} className="flex-1 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-sm outline-none focus:border-amber-400" />
                    <button onClick={() => salvarObs(pessoa.id)} className="px-3 py-2 bg-amber-500 text-white rounded-xl text-xs font-bold hover:bg-amber-600">Salvar</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {inscritosFiltrados.length === 0 && (
          <div className="text-center py-12 text-slate-400"><Users size={40} className="mx-auto mb-3 opacity-30" /><p className="text-sm">Nenhum inscrito encontrado</p></div>
        )}
      </div>

      <div className="pt-4 border-t border-slate-100 mt-2">
        {ausentes > 0 && (
          <div className="flex items-center gap-2 mb-3 p-3 bg-red-50 border border-red-200 rounded-xl">
            <AlertTriangle size={15} className="text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700 font-medium"><strong>{ausentes}</strong> ausentes — notifique a coordenação!</p>
          </div>
        )}
        <button onClick={handleConcluir} disabled={salvando} className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 transition-colors">
          {salvando ? <RefreshCw size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
          {salvando ? 'Salvando...' : 'Concluir Chamada'}
        </button>
      </div>
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export function ChamadasView() {
  const [aba, setAba] = useState('chamadas'); // 'chamadas' | 'relatorios'
  
  const [sessoes, setSessoes] = useState([]);
  const [sessaoAtiva, setSessaoAtiva] = useState(null);
  const [quartos, setQuartos] = useState([]);
  const [inscritos, setInscritos] = useState([]);
  const [chamadas, setChamadas] = useState([]);

  const [loading, setLoading] = useState(true);
  const [chamadaAberta, setChamadaAberta] = useState(null);
  const { eventoSelecionado } = useEventContext();

  const [filtroBloco, setFiltroBloco] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [buscaNome, setBuscaNome] = useState('');

  const carregarDados = useCallback(async () => {
    if (!eventoSelecionado) return;
    try {
      const [sessRes, qRes, iRes] = await Promise.all([
        supabase.from('sessoes_chamada').select('*').eq('evento_id', eventoSelecionado.id).order('criado_em', { ascending: false }),
        supabase.from('quartos').select('*').eq('evento_id', eventoSelecionado.id).order('nome'),
        supabase.from('inscricoes_hospedagem').select('id, nome_completo, quarto_id, cidade, regional, sexo').eq('evento_id', eventoSelecionado.id),
      ]);

      let sessoesData = sessRes.data || [];
      const quartosData = qRes.data || [];
      const inscritosData = iRes.data || [];

      // Lógica do dia (vira às 06h00)
      const now = new Date();
      const dataLogica = new Date(now.getTime() - 6 * 60 * 60 * 1000); // 05h00 pertence a ontem
      const dataString = dataLogica.toISOString().split('T')[0];

      // Verifica se já tem sessão criada "hoje" (após as 06h00)
      let sAtiva = sessoesData.find(s => {
        const sDate = new Date(new Date(s.criado_em).getTime() - 6 * 60 * 60 * 1000);
        return sDate.toISOString().split('T')[0] === dataString;
      });

      // Cria automaticamente se não houver
      if (!sAtiva) {
        const diaFormatado = dataLogica.toLocaleDateString('pt-BR');
        const nomeNovaSessao = `Toque de Recolher — ${diaFormatado}`;
        
        const { data: novaSessao, error: errSessao } = await supabase.from('sessoes_chamada').insert([{
          nome: nomeNovaSessao,
          status: 'ativa',
          criado_em: new Date().toISOString(),
          evento_id: eventoSelecionado.id
        }]).select().single();
        
        if (errSessao) {
          Swal.fire("Erro", 'Erro ao tentar criar a sessão do dia: ' + errSessao.message, "error");
          console.error('Erro ao criar sessão automática:', errSessao);
        } else if (novaSessao) {
          sAtiva = novaSessao;
          sessoesData = [novaSessao, ...sessoesData];
        }
      }

      setSessoes(sessoesData);
      setQuartos(quartosData);
      setInscritos(inscritosData);

      if (sAtiva) {
        setSessaoAtiva(sAtiva);
        const { data: cData } = await supabase.from('chamadas').select('*').eq('sessao_id', sAtiva.id);
        setChamadas(cData || []);
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  }, [eventoSelecionado]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const abrirChamada = async (quarto) => {
    let sessaoUsar = sessaoAtiva;
    
    // Fallback: Se carregou sem sessão (ex. falha de net), tenta criar agora
    if (!sessaoUsar) {
      const dataLogica = new Date(new Date().getTime() - 6 * 60 * 60 * 1000);
      const { data: novaSessao, error: sessaoErr } = await supabase.from('sessoes_chamada').insert([{
        nome: `Toque de Recolher — ${dataLogica.toLocaleDateString('pt-BR')}`,
        status: 'ativa',
        criado_em: new Date().toISOString(),
        evento_id: eventoSelecionado.id
      }]).select().single();
      
      if (sessaoErr) {
        Swal.fire("Erro", 'Erro ao criar sessão de fallback: ' + sessaoErr.message, "error");
        return;
      }
      if (!novaSessao) {
        Swal.fire("Erro", 'Erro de conexão ao banco de dados. Recarregue a página.', "error");
        return;
      }
      sessaoUsar = novaSessao;
      setSessaoAtiva(novaSessao);
    }

    let chamada = chamadas.find(c => c.quarto_id === quarto.id);
    if (!chamada) {
      const { data, error } = await supabase.from('chamadas').insert([{
        sessao_id: sessaoUsar.id,
        quarto_id: quarto.id,
        status: 'pendente',
      }]).select().single();
      
      if (error) {
        Swal.fire("Erro", 'Erro ao iniciar chamada: ' + error.message, "error");
        return;
      }
      chamada = data;
      setChamadas(prev => [...prev, chamada]);
    }
    setChamadaAberta({ ...chamada, _quarto: quarto });
  };

  const fecharChamada = async () => {
    setChamadaAberta(null);
    await carregarDados(); 
  };

  const compartilharWhatsApp = (quarto, ocupantes) => {
    let msg = `🏨 *Quarto ${quarto.nome}*\n`;
    if (quarto.ala_andar) msg += `📍 ${quarto.ala_andar}\n`;
    msg += `👥 ${quarto.tipo}\n\n`;
    msg += `📋 *Lista de Chamada:*\n`;
    ocupantes.forEach((p) => {
      msg += `[  ] ${p.nome_completo}\n`;
    });
    msg += `\n_Dica: Se estiver sem internet no quarto, mande essa mensagem, marque um X nos ausentes, e depois atualize no sistema!_`;
    
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const quartosComStatus = quartos
    .filter(q => inscritos.some(i => i.quarto_id === q.id))
    .map(quarto => {
      const chamada = chamadas.find(c => c.quarto_id === quarto.id);
      const ocupantes = inscritos.filter(i => i.quarto_id === quarto.id);
      return { quarto, chamada, ocupantes, statusChamada: chamada?.status || 'pendente' };
    });

  const quartosFiltrados = quartosComStatus.filter(({ quarto, ocupantes, statusChamada }) => {
    if (filtroBloco && !quarto.ala_andar?.toLowerCase().includes(filtroBloco.toLowerCase())) return false;
    if (filtroTipo && quarto.tipo !== filtroTipo) return false;
    if (filtroStatus && statusChamada !== filtroStatus) return false;
    if (buscaNome && !ocupantes.some(p => p.nome_completo?.toLowerCase().includes(buscaNome.toLowerCase()))) return false;
    return true;
  });

  const totalQuartos = quartosComStatus.length;
  const qtdConcluidos = quartosComStatus.filter(q => q.statusChamada === 'concluida').length;
  const qtdComAusentes = quartosComStatus.filter(q => q.statusChamada === 'com_ausentes').length;
  const qtdEmAndamento = quartosComStatus.filter(q => q.statusChamada === 'em_andamento').length;
  const qtdPendentes = quartosComStatus.filter(q => q.statusChamada === 'pendente').length;
  const pctConcluido = totalQuartos > 0 ? Math.round(((qtdConcluidos + qtdComAusentes) / totalQuartos) * 100) : 0;

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-12 h-12 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
      <p className="text-slate-400 text-sm font-medium">Carregando chamadas...</p>
    </div>
  );

  if (chamadaAberta) {
    const inscritosDoQuarto = inscritos.filter(i => i.quarto_id === chamadaAberta.quarto_id);
    return (
      <TelaCalledRoom
        chamada={chamadaAberta}
        inscritos={inscritosDoQuarto}
        onConcluir={fecharChamada}
        onVoltar={() => setChamadaAberta(null)}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Abas Superiores */}
      <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm max-w-[400px]">
        <button
          onClick={() => setAba('chamadas')}
          className={`flex-1 flex justify-center items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${aba === 'chamadas' ? 'bg-red-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <BellRing size={16} /> Painel Hoje
        </button>
        <button
          onClick={() => setAba('relatorios')}
          className={`flex-1 flex justify-center items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${aba === 'relatorios' ? 'bg-red-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <BarChart3 size={16} /> Relatórios
        </button>
      </div>

      {aba === 'relatorios' ? (
        <TelaRelatorios sessoes={sessoes} quartos={quartos} inscritos={inscritos} />
      ) : (
        <>
          <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 relative overflow-hidden">
            <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-10 h-10 bg-red-50 rounded-2xl flex items-center justify-center border border-red-100">
                    <Moon size={20} className="text-red-600" />
                  </div>
                  <h2 className="text-2xl font-black text-slate-800">Toque de Recolher</h2>
                </div>
                <p className="text-slate-500 text-sm mt-1" style={{ paddingLeft: '52px' }}>
                  {sessaoAtiva ? <><span className="text-red-600 font-bold">{sessaoAtiva.nome}</span> (zera aut. às 06h00)</> : 'Carregando sessão do dia...'}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-center min-w-[120px]">
                  <div className="text-[10px] text-slate-400 uppercase tracking-widest">Conferidos</div>
                  <div className="text-2xl font-black text-slate-800">{pctConcluido}%</div>
                  <div className="text-[10px] text-slate-500">{qtdConcluidos + qtdComAusentes}/{totalQuartos} quartos</div>
                </div>
                <button onClick={carregarDados} className="p-3 bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all" title="Atualizar"><RefreshCw size={16} /></button>
              </div>
            </div>

            {totalQuartos > 0 && (
              <div className="relative mt-5">
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex">
                  <div className="h-full bg-emerald-500 transition-all duration-700" style={{ width: `${(qtdConcluidos / totalQuartos) * 100}%` }} />
                  <div className="h-full bg-red-500 transition-all duration-700" style={{ width: `${(qtdComAusentes / totalQuartos) * 100}%` }} />
                  <div className="h-full bg-amber-500 transition-all duration-700" style={{ width: `${(qtdEmAndamento / totalQuartos) * 100}%` }} />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[{ label: 'Pendentes', value: qtdPendentes, cor: 'text-slate-700', bg: 'bg-slate-100', icon: Clock },
              { label: 'Em Andamento', value: qtdEmAndamento, cor: 'text-amber-700', bg: 'bg-amber-100', icon: BellRing },
              { label: 'Concluídos', value: qtdConcluidos, cor: 'text-emerald-700', bg: 'bg-emerald-100', icon: CheckCircle2 },
              { label: 'Com Ausentes', value: qtdComAusentes, cor: 'text-red-700', bg: 'bg-red-100', icon: AlertTriangle }
            ].map(({ label, value, cor, bg, icon: Icon }) => (
              <div key={label} className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}><Icon size={18} className={cor} /></div>
                <div><div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</div><div className={`text-2xl font-black ${cor}`}>{value}</div></div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-4"><Filter size={13} className="text-slate-400" /><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Filtrar Quartos</span></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" /><input placeholder="Buscar hóspede..." value={buscaNome} onChange={e => setBuscaNome(e.target.value)} className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20" /></div>
              <input placeholder="Bloco / Ala..." value={filtroBloco} onChange={e => setFiltroBloco(e.target.value)} className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20" />
              <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-amber-400"><option value="">Todos</option><option value="Masculino">Masculino</option><option value="Feminino">Feminino</option></select>
              <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-amber-400"><option value="">Todos os Status</option><option value="pendente">Pendentes</option><option value="em_andamento">Em Andamento</option><option value="concluida">Concluídos</option><option value="com_ausentes">Com Ausentes</option></select>
            </div>
          </div>

          {quartosFiltrados.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <BedDouble size={40} className="mx-auto mb-3 text-slate-200" />
              <p className="text-slate-400 text-sm">Nenhum quarto para chamar com estes filtros.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {quartosFiltrados.map(({ quarto, chamada, ocupantes, statusChamada }) => {
                const sChamada = STATUS_CHAMADA[statusChamada] || STATUS_CHAMADA.pendente;
                return (
                  <div key={quarto.id} className={`bg-white rounded-2xl border-2 transition-all hover:shadow-md ${sChamada.border}`}>
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 min-w-0">
                          <StatusBadge status={statusChamada} />
                          <h3 className="text-lg font-black text-slate-900 mt-2">Quarto {quarto.nome}</h3>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {quarto.ala_andar && <span className="text-[10px] text-slate-400 font-medium bg-slate-100 rounded px-1.5 py-0.5">{quarto.ala_andar}</span>}
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${quarto.tipo === 'Feminino' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'}`}>{quarto.tipo === 'Feminino' ? '♀' : '♂'} {quarto.tipo}</span>
                          </div>
                        </div>
                        <div className="text-center bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 flex-shrink-0">
                          <div className="text-[9px] text-slate-400 uppercase font-bold">Inscritos</div>
                          <div className="text-xl font-black text-slate-700">{ocupantes.length}</div>
                        </div>
                      </div>
                      <div className="space-y-1 mb-4">
                        {ocupantes.slice(0, 4).map(p => (
                          <div key={p.id} className="flex items-center gap-2 text-xs text-slate-600">
                            <div className="w-1 h-1 rounded-full bg-slate-300 flex-shrink-0" /><span className="truncate font-medium">{p.nome_completo}</span>
                          </div>
                        ))}
                        {ocupantes.length > 4 && <p className="text-[10px] text-slate-400 italic pl-3">+ {ocupantes.length - 4} pessoas...</p>}
                      </div>
                    </div>
                    <div className="px-5 pb-5">
                      <div className="flex gap-2">
                        <button onClick={() => abrirChamada(quarto)} className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${statusChamada === 'concluida' || statusChamada === 'com_ausentes' ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : statusChamada === 'em_andamento' ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-red-600 text-white hover:bg-red-700'}`}>
                          {statusChamada === 'concluida' || statusChamada === 'com_ausentes' ? <><ClipboardList size={15} /> Ver Chamada</> : statusChamada === 'em_andamento' ? <><BellRing size={15} /> Continuar</> : <><BellRing size={15} /> Iniciar Chamada</>}
                        </button>
                        <button onClick={() => compartilharWhatsApp(quarto, ocupantes)} className="w-12 h-12 flex-shrink-0 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 rounded-xl flex items-center justify-center transition-all" title="Compartilhar lista no WhatsApp (Offline)">
                          <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a5.8 5.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

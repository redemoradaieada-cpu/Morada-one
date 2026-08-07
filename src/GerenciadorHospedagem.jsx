import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import {
  Wrench, UserPlus, X, BedDouble, Search, Info, Trash2,
  Users, Hotel, CheckCircle, AlertTriangle, MapPin,
  User, Hash, Filter, ArrowRight, Layers, ChevronLeft, ChevronRight,
  ClockArrowUp, RefreshCw, Landmark
} from 'lucide-react';
import { CidadeSearchInput } from './CidadeSearchInput';
import Swal from 'sweetalert2';
import { useEventContext } from './contexts/EventContext';

const PAGE_SIZE = 40; // Inscritos por página no modal de alocação

const formatarCPF = (cpf) => {
  const limpo = String(cpf || '').replace(/\D/g, '');
  if (limpo.length !== 11) return cpf || 'Sem CPF';
  return limpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

// --- Componente auxiliar: Barra de Ocupação ---
function OcupacaoBar({ ocupados, capacidade, isManutencao }) {
  const pct = capacidade > 0 ? Math.min((ocupados / capacidade) * 100, 100) : 0;
  const cor = isManutencao
    ? 'bg-amber-400'
    : pct >= 100
    ? 'bg-red-500'
    : pct >= 75
    ? 'bg-orange-400'
    : 'bg-emerald-500';

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Ocupação</span>
        <span className={`text-[11px] font-bold ${pct >= 100 ? 'text-red-600' : 'text-slate-600'}`}>
          {ocupados}/{capacidade}
        </span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${cor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// --- Componente auxiliar: Badge de tipo do quarto ---
function TipoBadge({ tipo }) {
  if (tipo === 'Feminino') return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-pink-100 text-pink-700 tracking-wide">
      ♀ Feminino
    </span>
  );
  if (tipo === 'Masculino') return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 tracking-wide">
      ♂ Masculino
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 tracking-wide">
      Misto
    </span>
  );
}

// --- Componente sub-card de Quarto com Paginação Interna de Hóspedes ---
function QuartoCard({
  quarto,
  ocupantes,
  isManutencao,
  toggleManutencao,
  setQuartoSelecionado,
  setModalDetalhes,
  setModalAlocacao
}) {
  const [paginaHospedes, setPaginaHospedes] = useState(1);
  const totalHospedes = ocupantes.length;
  const totalPaginasHosp = Math.ceil(totalHospedes / 5);
  const hospedesPagina = useMemo(() =>
    ocupantes.slice((paginaHospedes - 1) * 5, paginaHospedes * 5),
    [ocupantes, paginaHospedes]
  );
  const cheio = totalHospedes >= (quarto.capacidade || 0);

  // Reseta para a última página disponível se o número de hóspedes mudar e a página atual ficar fora do range
  useEffect(() => {
    if (paginaHospedes > totalPaginasHosp && totalPaginasHosp > 0) {
      setPaginaHospedes(totalPaginasHosp);
    }
  }, [totalHospedes, totalPaginasHosp, paginaHospedes]);

  return (
    <div
      className={`rounded-2xl border transition-all hover:shadow-md ${
        isManutencao
          ? 'bg-amber-50/60 border-amber-200'
          : cheio
          ? 'bg-red-50/40 border-red-200'
          : 'bg-white border-slate-200'
      }`}
    >
      {/* Card Header */}
      <div className="p-5 pb-4">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                isManutencao ? 'bg-amber-200 text-amber-800' : cheio ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'
              }`}>
                {isManutencao ? '⚠ Manutenção' : cheio ? '● Lotado' : '● Disponível'}
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900">
              {quarto.categoria === 'Apartamento' ? 'Apartamento' : 'Quarto'} {quarto.nome}
            </h3>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {quarto.ala_andar && (
                <span className="text-[10px] font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                  {quarto.ala_andar}
                </span>
              )}
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                quarto.categoria === 'Apartamento' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500'
              }`}>
                {quarto.categoria || 'Alojamento'}
              </span>
              <TipoBadge tipo={quarto.tipo} />
            </div>
          </div>
          <button
            onClick={() => toggleManutencao(quarto)}
            title={isManutencao ? 'Tirar da manutenção' : 'Colocar em manutenção'}
            className={`p-2.5 rounded-xl flex-shrink-0 transition-all ${
              isManutencao
                ? 'bg-amber-200 text-amber-800 hover:bg-amber-300'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            <Wrench size={16} />
          </button>
        </div>

        {/* Barra de Ocupação */}
        <OcupacaoBar
          ocupados={totalHospedes}
          capacidade={quarto.capacidade || 0}
          isManutencao={isManutencao}
        />
      </div>

      {/* Lista paginada de ocupantes */}
      {totalHospedes > 0 && (
        <div className="px-5 pb-4">
          <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 border border-slate-100">
            {hospedesPagina.map(p => (
              <div key={p.id} className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                  <User size={10} className="text-slate-500" />
                </div>
                <span className="text-xs font-medium text-slate-700 truncate">{p.nome_completo}</span>
                {p.cidade && (
                  <span className="text-[10px] text-slate-400 ml-auto flex-shrink-0">{p.cidade}</span>
                )}
              </div>
            ))}

            {/* Controles de paginação interna do card */}
            {totalPaginasHosp > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200/60 pt-2 mt-2">
                <span className="text-[9px] text-slate-400 font-semibold">
                  Hóspedes {((paginaHospedes - 1) * 5) + 1}-{Math.min(paginaHospedes * 5, totalHospedes)} de {totalHospedes}
                </span>
                <div className="flex gap-1">
                  <button
                    disabled={paginaHospedes === 1}
                    onClick={() => setPaginaHospedes(prev => Math.max(prev - 1, 1))}
                    className="p-1 border border-slate-200 rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <ChevronLeft size={10} />
                  </button>
                  <button
                    disabled={paginaHospedes === totalPaginasHosp}
                    onClick={() => setPaginaHospedes(prev => Math.min(prev + 1, totalPaginasHosp))}
                    className="p-1 border border-slate-200 rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <ChevronRight size={10} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Card Footer */}
      <div className="px-5 pb-5 flex gap-2">
        <button
          onClick={() => { setQuartoSelecionado(quarto); setModalDetalhes(true); }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all"
        >
          <Info size={13} /> Detalhes
        </button>
        {!isManutencao && (
          <button
            onClick={() => { setQuartoSelecionado(quarto); setModalAlocacao(true); }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700 transition-all shadow-sm"
          >
            <UserPlus size={13} /> Alocar
          </button>
        )}
      </div>
    </div>
  );
}

export function GerenciadorHospedagem() {
  const [quartos, setQuartos] = useState([]);
  const [inscritos, setInscritos] = useState([]);
  const [cidadesBanco, setCidadesBanco] = useState([]);
  const [loading, setLoading] = useState(true);
  const { eventos, eventoSelecionado } = useEventContext();

  const isGlobalUser = eventos && eventos.length > 1;
  const [filtroEvento, setFiltroEvento] = useState('todos');

  // Modais e Seleção
  const [modalAlocacao, setModalAlocacao] = useState(false);
  const [modalDetalhes, setModalDetalhes] = useState(false);
  const [quartoSelecionado, setQuartoSelecionado] = useState(null);
  const [selecionados, setSelecionados] = useState([]);

  // Filtros Globais da Tela
  const [buscaGlobal, setBuscaGlobal] = useState('');
  const [filtroRegional, setFiltroRegional] = useState('');
  const [filtroCidade, setFiltroCidade] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroVagas, setFiltroVagas] = useState(false);
  const [filtroBloco, setFiltroBloco] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');

  // Filtros de Alocação (Modal)
  const [buscaNome, setBuscaNome] = useState('');
  const [buscaCPF, setBuscaCPF] = useState('');
  const [buscandoCpf, setBuscandoCpf] = useState(false);
  const [filtroRegionalAloc, setFiltroRegionalAloc] = useState('');
  const [filtroCidadeAloc, setFiltroCidadeAloc] = useState('');
  const [filtroPastorAloc, setFiltroPastorAloc] = useState('');
  const [filtroSexoAloc, setFiltroSexoAloc] = useState('');

  // Paginação do modal de alocação
  const [paginaAloc, setPaginaAloc] = useState(1);

  // Seleção e remoção no modal de Detalhes
  const [selecionadosDetalhes, setSelecionadosDetalhes] = useState([]);

  useEffect(() => {
    if (!modalDetalhes) setSelecionadosDetalhes([]);
  }, [modalDetalhes]);

  useEffect(() => {
    if (!eventoSelecionado) return;
    fetchDados();

    const channelQuartos = supabase
      .channel('public:quartos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quartos' }, () => {
        fetchDados();
      })
      .subscribe();

    const channelInscricoes = supabase
      .channel('public:inscricoes_hospedagem')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inscricoes_hospedagem' }, () => {
        fetchDados();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channelQuartos);
      supabase.removeChannel(channelInscricoes);
    };
  }, [eventoSelecionado, filtroEvento]);

  async function fetchDados() {
    setLoading(true);
    try {
      let qQuartos = supabase.from('quartos').select('*');
      let qInsc = supabase.from('inscricoes_hospedagem').select('*');

      if (isGlobalUser && filtroEvento === 'todos') {
        const ids = eventos.map(e => e.id);
        qQuartos = qQuartos.in('evento_id', ids);
        qInsc = qInsc.in('evento_id', ids);
      } else {
        const eventoId = filtroEvento !== 'todos' ? filtroEvento : eventoSelecionado?.id;
        qQuartos = qQuartos.eq('evento_id', eventoId);
        qInsc = qInsc.eq('evento_id', eventoId);
      }

      const [resQuartos, resInscricoes, resCidades] = await Promise.all([
        qQuartos,
        qInsc,
        supabase.from('cidades').select('*').order('nome', { ascending: true })
      ]);
      setQuartos(resQuartos.data || []);
      setInscritos(resInscricoes.data || []);
      setCidadesBanco(resCidades.data || []);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
    setSelecionados([]);
  }

  const toggleSelect = (id) => { setSelecionados(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]); };
  const toggleSelectAll = (candidatos) => { setSelecionados(selecionados.length === candidatos.length ? [] : candidatos.map(i => i.id)); };

  const realizarAlocacaoMultipla = async () => {
    if (selecionados.length === 0) return;
    
    // Regra estrita de gênero no salvamento (apenas se NÃO for Apartamento)
    if (quartoSelecionado.categoria !== 'Apartamento' && (quartoSelecionado.tipo === 'Masculino' || quartoSelecionado.tipo === 'Feminino')) {
      const invalidos = selecionados.some(id => {
        const pessoa = inscritos.find(i => i.id === id);
        return pessoa && pessoa.sexo !== quartoSelecionado.tipo;
      });
      if (invalidos) {
        Swal.fire("Operação cancelada", `Apenas pessoas do sexo ${quartoSelecionado.tipo} podem ser alocadas neste quarto.`, "warning");
        return;
      }
    }

    await supabase.from('inscricoes_hospedagem').update({ quarto_id: quartoSelecionado.id }).in('id', selecionados);
    fetchDados();
    setModalAlocacao(false);
  };

  const buscarPorCpf = async (limpo) => {
    setBuscandoCpf(true);
    const { data } = await supabase
      .from('inscricoes_hospedagem')
      .select('id, nome_completo, sexo, cpf, quarto_id')
      .eq('cpf', limpo)
      .eq('evento_id', eventoSelecionado.id)
      .maybeSingle();
    setBuscandoCpf(false);
  };

  const removerDoQuarto = async (pessoaId) => {
    const { isConfirmed } = await Swal.fire({
      title: 'Tem certeza?',
      text: 'Tem certeza que deseja remover esta pessoa do quarto?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim',
      cancelButtonText: 'Não'
    });
    if (!isConfirmed) return;
    await supabase.from('inscricoes_hospedagem').update({ quarto_id: null }).eq('id', pessoaId);
    fetchDados();
  };

  const removerSelecionadosDetalhes = async () => {
    if (selecionadosDetalhes.length === 0) return;
    const { isConfirmed } = await Swal.fire({
      title: 'Tem certeza?',
      text: `Deseja remover as ${selecionadosDetalhes.length} pessoas selecionadas do quarto?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, remover',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626'
    });
    if (!isConfirmed) return;
    
    await supabase.from('inscricoes_hospedagem').update({ quarto_id: null }).in('id', selecionadosDetalhes);
    setSelecionadosDetalhes([]);
    fetchDados();
  };

  const toggleManutencao = async (quarto) => {
    const novoStatus = quarto.status === 'manutencao' ? 'disponivel' : 'manutencao';
    await supabase.from('quartos').update({ status: novoStatus }).eq('id', quarto.id);
    fetchDados();
  };

  // --- FILTRAGEM ---
  const normStr = (txt) => String(txt || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

  const quartosFiltrados = useMemo(() => {
    return quartos.filter(quarto => {
      const ocupantes = inscritos.filter(i => i.quarto_id === quarto.id);
      if (filtroTipo && quarto.tipo !== filtroTipo) return false;
      if (filtroCategoria && (quarto.categoria || 'Alojamento') !== filtroCategoria) return false;
      if (filtroVagas && (quarto.capacidade - ocupantes.length <= 0)) return false;
      if (filtroBloco && !quarto.ala_andar?.toLowerCase().includes(filtroBloco.toLowerCase())) return false;
      if (filtroCidade) {
        const cidadeObj = cidadesBanco.find(c => c.codigo === filtroCidade);
        const temCidade = ocupantes.some(p => 
          p.cidade_codigo === filtroCidade || 
          (cidadeObj && normStr(p.cidade) === normStr(cidadeObj.nome))
        );
        if (!temCidade) return false;
      }
      if (filtroRegional) {
        const temRegional = ocupantes.some(p => p.regional?.toLowerCase().includes(filtroRegional.toLowerCase()));
        if (!temRegional) return false;
      }
      if (buscaGlobal) {
        const temNome = ocupantes.some(p => p.nome_completo?.toLowerCase().includes(buscaGlobal.toLowerCase()));
        if (!temNome) return false;
      }
      return true;
    });
  }, [quartos, inscritos, buscaGlobal, filtroRegional, filtroCidade, filtroTipo, filtroVagas, filtroBloco, filtroCategoria, cidadesBanco]);

  const candidatosFiltrados = useMemo(() => {
    setPaginaAloc(1); // Volta pra página 1 sempre que os filtros mudam
    return inscritos.filter(i => !i.quarto_id)
      .filter(i => {
        // Aplica regra de gênero do quarto selecionado (apenas se NÃO for Apartamento)
        if (quartoSelecionado?.categoria !== 'Apartamento') {
          if (quartoSelecionado?.tipo === 'Masculino' && i.sexo !== 'Masculino') return false;
          if (quartoSelecionado?.tipo === 'Feminino' && i.sexo !== 'Feminino') return false;
        }

        return (
          (buscaNome ? i.nome_completo?.toLowerCase().includes(buscaNome.toLowerCase()) : true) &&
          (buscaCPF ? i.cpf?.includes(buscaCPF) : true) &&
          (filtroRegionalAloc ? i.regional === filtroRegionalAloc : true) &&
          (filtroCidadeAloc ? (() => {
            const cidadeObj = cidadesBanco.find(c => c.codigo === filtroCidadeAloc);
            return i.cidade_codigo === filtroCidadeAloc || 
                   (cidadeObj && normStr(i.cidade) === normStr(cidadeObj.nome));
          })() : true) &&
          (filtroPastorAloc ? i.nome_pastor === filtroPastorAloc : true) &&
          (filtroSexoAloc ? i.sexo === filtroSexoAloc : true)
        );
      });
  }, [inscritos, buscaNome, buscaCPF, filtroRegionalAloc, filtroCidadeAloc, filtroPastorAloc, filtroSexoAloc, quartoSelecionado, cidadesBanco]);

  // Página atual do modal de alocação (slice para performance)
  const totalPaginas = Math.ceil(candidatosFiltrados.length / PAGE_SIZE);
  const candidatosPagina = useMemo(() =>
    candidatosFiltrados.slice((paginaAloc - 1) * PAGE_SIZE, paginaAloc * PAGE_SIZE),
    [candidatosFiltrados, paginaAloc]
  );

  // --- Stats calculadas ---
  const totalLeitos = quartos.reduce((acc, q) => acc + (q.capacidade || 0), 0);
  const totalOcupados = inscritos.filter(i => i.quarto_id).length;
  const totalDisponiveis = totalLeitos - totalOcupados;
  const quartosComVagas = quartos.filter(q => q.status !== 'manutencao' && (inscritos.filter(i => i.quarto_id === q.id).length < q.capacidade)).length;
  const emManutencao = quartos.filter(q => q.status === 'manutencao').length;

  // Stats inscritos sem quarto
  const semQuarto = inscritos.filter(i => !i.quarto_id);
  const semQuartoM = semQuarto.filter(i => i.sexo === 'Masculino').length;
  const semQuartoF = semQuarto.filter(i => i.sexo === 'Feminino').length;
  const semQuartoTotal = semQuarto.length;
  const pctAlocado = inscritos.length > 0
    ? Math.round((totalOcupados / inscritos.length) * 100)
    : 0;

  const stats = [
    { label: 'Total de Leitos', value: totalLeitos, icon: <Hotel size={20} />, light: 'bg-slate-100 text-slate-600' },
    { label: 'Leitos Ocupados', value: totalOcupados, icon: <Users size={20} />, light: 'bg-red-100 text-red-600' },
    { label: 'Leitos Livres', value: totalDisponiveis, icon: <CheckCircle size={20} />, light: 'bg-emerald-100 text-emerald-600' },
    { label: 'Quartos c/ Vagas', value: quartosComVagas, icon: <BedDouble size={20} />, light: 'bg-blue-100 text-blue-600' },
    { label: 'Em Manutenção', value: emManutencao, icon: <AlertTriangle size={20} />, light: 'bg-amber-100 text-amber-600' },
  ];

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-12 h-12 border-4 border-red-200 border-t-red-600 rounded-full animate-spin" />
      <p className="text-slate-400 text-sm font-medium">Carregando painel de hospedagem...</p>
    </div>
  );

  return (
    <div className="space-y-6">

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-500 to-rose-700 flex items-center justify-center shadow-lg shadow-red-500/30">
              <BedDouble size={20} className="text-white" />
            </div>
            Gerenciador de Hospedagem
          </h2>
          <p className="text-slate-400 text-sm mt-1 ml-[52px]">Alocação e controle de quartos em tempo real</p>
        </div>
        <button
          onClick={fetchDados}
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
        >
          <RefreshCw size={15} />
          Atualizar
        </button>
      </div>

      {/* ── STATS CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((s, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.light}`}>
              {s.icon}
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{s.label}</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-0.5">{s.value}</p>
            </div>
          </div>
        ))}
        {/* Card Sem Quarto Separado com Breakdown M/F */}
        <div className={`rounded-2xl border p-5 flex flex-col gap-3 hover:shadow-md transition-all col-span-2 sm:col-span-1 lg:col-span-1 relative overflow-hidden ${
          semQuartoTotal > 0
            ? 'bg-gradient-to-br from-amber-50 to-orange-50/40 border-amber-300 shadow-md shadow-amber-500/5 animate-pulse'
            : 'bg-gradient-to-br from-slate-50 to-white border-slate-100'
        }`}>
          {semQuartoTotal > 0 && (
            <span className="absolute top-3 right-3 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
          )}
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
            semQuartoTotal > 0 ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500'
          }`}>
            <ClockArrowUp size={20} />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Aguardando Quarto</p>
            <p className={`text-2xl font-extrabold mt-0.5 ${semQuartoTotal > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
              {semQuartoTotal}
            </p>
            <div className="flex gap-2.5 mt-1.5 text-[10px] font-bold">
              <span className="text-blue-600">♂ {semQuartoM} M</span>
              <span className="text-pink-600">♀ {semQuartoF} F</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── FILTROS ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={14} className="text-slate-400" />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Filtrar Quartos</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">

          {/* Evento (Só se global) */}
          {isGlobalUser && (
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Evento</label>
              <div className="relative">
                <Landmark size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                <select
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-400 outline-none transition-all cursor-pointer"
                  value={filtroEvento}
                  onChange={(e) => setFiltroEvento(e.target.value)}
                >
                  <option value="todos">Todos</option>
                  {eventos.map(ev => (
                    <option key={ev.id} value={ev.id}>{ev.nome}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Busca por nome */}
          <div className="relative">
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Hóspede</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
              <input
                className="w-full pl-9 pr-3 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-400 outline-none transition-all"
                placeholder="Nome..."
                onChange={(e) => setBuscaGlobal(e.target.value)}
              />
            </div>
          </div>

          {/* Bloco/Ala */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Bloco / Ala</label>
            <div className="relative">
              <Layers size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
              <input
                className="w-full pl-9 pr-3 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-400 outline-none transition-all"
                placeholder="Bloco..."
                onChange={(e) => setFiltroBloco(e.target.value)}
              />
            </div>
          </div>

          {/* Cidade */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Cidade</label>
            <CidadeSearchInput
              cidades={cidadesBanco}
              value={filtroCidade}
              placeholder="Filtrar cidade..."
              onChange={({ codigo }) => setFiltroCidade(codigo)}
            />
          </div>

          {/* Regional */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Regional</label>
            <input
              className="w-full px-3 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-400 outline-none transition-all"
              placeholder="Regional..."
              onChange={(e) => setFiltroRegional(e.target.value)}
            />
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Tipo</label>
            <select
              className="w-full px-3 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-400 outline-none transition-all cursor-pointer"
              onChange={(e) => setFiltroTipo(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="Masculino">Masculino</option>
              <option value="Feminino">Feminino</option>
            </select>
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Categoria</label>
            <select
              className="w-full px-3 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-400 outline-none transition-all cursor-pointer"
              onChange={(e) => setFiltroCategoria(e.target.value)}
            >
              <option value="">Todas</option>
              <option value="Alojamento">Alojamento</option>
              <option value="Apartamento">Apartamento</option>
            </select>
          </div>

          {/* Com Vagas */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Disponibilidade</label>
            <label className="flex items-center gap-2.5 cursor-pointer px-3 py-2.5 border border-slate-200 bg-slate-50 rounded-xl w-full hover:bg-slate-100 transition-all">
              <input
                type="checkbox"
                className="w-4 h-4 accent-red-600 cursor-pointer rounded"
                onChange={(e) => setFiltroVagas(e.target.checked)}
              />
              <span className="text-sm font-medium text-slate-600">Com vagas</span>
            </label>
          </div>

        </div>
      </div>

      {/* ── RESULTADOS ── */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          {quartosFiltrados.length} quarto{quartosFiltrados.length !== 1 ? 's' : ''} encontrado{quartosFiltrados.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* ── GRID DE QUARTOS ── */}
      {quartosFiltrados.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center">
          <BedDouble size={48} className="mx-auto text-slate-200 mb-4" />
          <p className="text-slate-400 font-semibold">Nenhum quarto corresponde aos filtros</p>
          <p className="text-slate-300 text-sm mt-1">Tente ajustar os critérios de busca</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {quartosFiltrados.map((quarto) => {
            const ocupantes = inscritos.filter(i => i.quarto_id === quarto.id);
            const isManutencao = quarto.status === 'manutencao';

            return (
              <QuartoCard
                key={quarto.id}
                quarto={quarto}
                ocupantes={ocupantes}
                isManutencao={isManutencao}
                toggleManutencao={toggleManutencao}
                setQuartoSelecionado={setQuartoSelecionado}
                setModalDetalhes={setModalDetalhes}
                setModalAlocacao={setModalAlocacao}
              />
            );
          })}
        </div>
      )}

      {/* ════════════════════════════════════════
          MODAL DETALHES
      ════════════════════════════════════════ */}
      {modalDetalhes && quartoSelecionado && (() => {
        const hospedes = inscritos.filter(i => i.quarto_id === quartoSelecionado.id);
        return (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">

              {/* Header do modal */}
              <div className="relative bg-white border-b border-slate-100 px-6 py-4 flex-shrink-0">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
                        <BedDouble size={16} />
                      </div>
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Detalhes do {quartoSelecionado?.categoria === 'Apartamento' ? 'Apartamento' : 'Quarto'}
                      </span>
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">
                      {quartoSelecionado?.categoria === 'Apartamento' ? 'Apartamento' : 'Quarto'} <span className="text-red-600">{quartoSelecionado.nome}</span>
                    </h2>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      {quartoSelecionado.ala_andar && (
                        <span className="text-xs text-slate-500 font-medium">{quartoSelecionado.ala_andar}</span>
                      )}
                      <span className="text-slate-300">·</span>
                      <TipoBadge tipo={quartoSelecionado.tipo} />
                      <span className="text-slate-300">·</span>
                      <span className="text-xs text-slate-500 font-medium">{hospedes.length}/{quartoSelecionado.capacidade} camas</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setModalDetalhes(false)}
                    className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400 hover:text-slate-600"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Mini barra de ocupação no header */}
                <div className="mt-4">
                  <OcupacaoBar ocupados={hospedes.length} capacidade={quartoSelecionado.capacidade || 0} />
                </div>
              </div>

              {/* Conteúdo */}
              <div className="flex-1 overflow-y-auto bg-slate-50 p-6 flex flex-col gap-3">
                {hospedes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                      <BedDouble size={28} className="text-slate-300" />
                    </div>
                    <div className="text-center">
                      <p className="text-slate-500 font-semibold">
                        {quartoSelecionado?.categoria === 'Apartamento' ? 'Apartamento vazio' : 'Quarto vazio'}
                      </p>
                      <p className="text-slate-400 text-sm mt-1">Clique em "Alocar" para adicionar hóspedes</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Barra de seleção todos */}
                    <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-sm">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-4 h-4 accent-red-600 cursor-pointer rounded"
                          checked={selecionadosDetalhes.length === hospedes.length && hospedes.length > 0}
                          onChange={() => {
                            if (selecionadosDetalhes.length === hospedes.length) {
                              setSelecionadosDetalhes([]);
                            } else {
                              setSelecionadosDetalhes(hospedes.map(h => h.id));
                            }
                          }}
                        />
                        <span className="text-xs font-semibold text-slate-600">
                          Selecionar todos
                          <span className="ml-1.5 text-slate-400 font-normal">({hospedes.length} no quarto)</span>
                        </span>
                      </label>
                      {selecionadosDetalhes.length > 0 && (
                        <span className="px-2.5 py-0.5 bg-red-50 text-red-600 border border-red-100 rounded-full text-[10px] font-bold">
                          {selecionadosDetalhes.length} selecionado{selecionadosDetalhes.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    {/* Lista compacta de Hóspedes */}
                    <div className="space-y-1.5">
                      {hospedes.map((p, idx) => (
                        <div
                          key={p.id}
                          onClick={() => {
                            setSelecionadosDetalhes(prev =>
                              prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id]
                            );
                          }}
                          className={`py-2 px-4 border rounded-xl cursor-pointer transition-all flex items-center justify-between gap-4 text-xs ${
                            selecionadosDetalhes.includes(p.id)
                              ? 'bg-red-50/70 border-red-200 shadow-sm'
                              : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <input
                              type="checkbox"
                              className="w-4 h-4 accent-red-600 cursor-pointer rounded flex-shrink-0"
                              checked={selecionadosDetalhes.includes(p.id)}
                              onChange={() => {
                                setSelecionadosDetalhes(prev =>
                                  prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id]
                                );
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="w-6 h-6 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0 text-[10px] font-extrabold text-red-600">
                              {idx + 1}
                            </div>
                            <div className="min-w-0 flex flex-col sm:flex-row sm:items-center sm:gap-3">
                              <span className="font-bold text-slate-900 truncate block max-w-[200px] sm:max-w-xs">{p.nome_completo}</span>
                              <span className="inline-flex text-slate-500 font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/50 self-start sm:self-auto">
                                CPF: {formatarCPF(p.cpf)}
                              </span>
                            </div>
                          </div>

                          <div className="hidden md:flex items-center gap-4 text-slate-500 min-w-0">
                            <span className="truncate max-w-[120px]"><b>Cidade:</b> {p.cidade || '---'}</span>
                            <span className="truncate max-w-[80px]"><b>Reg:</b> {p.regional || '---'}</span>
                            <span className="truncate max-w-[120px]"><b>Pastor:</b> {p.nome_pastor || '---'}</span>
                          </div>

                          <div className="flex items-center gap-3 flex-shrink-0">
                            {p.sexo && (
                              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                                p.sexo === 'Feminino' ? 'bg-pink-50 text-pink-600 border border-pink-100' : 'bg-blue-50 text-blue-600 border border-blue-100'
                              }`}>
                                {p.sexo === 'Feminino' ? '♀' : '♂'} {p.sexo === 'Feminino' ? 'Fem' : 'Masc'}
                              </span>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removerDoQuarto(p.id);
                              }}
                              title="Remover este hóspede"
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-4">
                <div className="text-sm text-slate-500 font-medium">
                  {selecionadosDetalhes.length > 0 && (
                    <span className="text-slate-800 font-semibold">{selecionadosDetalhes.length} pessoa{selecionadosDetalhes.length !== 1 ? 's' : ''} selecionada{selecionadosDetalhes.length !== 1 ? 's' : ''}</span>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setModalDetalhes(false)}
                    className="px-5 py-2.5 border border-slate-200 text-slate-700 rounded-xl font-semibold text-sm hover:bg-slate-100 transition-all bg-white"
                  >
                    Fechar
                  </button>
                  {selecionadosDetalhes.length > 0 && (
                    <button
                      onClick={removerSelecionadosDetalhes}
                      className="px-5 py-2.5 bg-red-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-red-600/20 hover:bg-red-700 transition-all flex items-center gap-2"
                    >
                      <Trash2 size={16} /> Remover Selecionados ({selecionadosDetalhes.length})
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ════════════════════════════════════════
          MODAL ALOCAÇÃO
      ════════════════════════════════════════ */}
      {modalAlocacao && quartoSelecionado && (() => {
        const ocupantesAtuais = inscritos.filter(i => i.quarto_id === quartoSelecionado.id);
        const vagasRestantes = quartoSelecionado.capacidade - ocupantesAtuais.length;

        return (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

              {/* Header do modal */}
              <div className="relative bg-white border-b border-slate-100 px-6 py-4 flex-shrink-0">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
                        <UserPlus size={16} />
                      </div>
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Alocar Hóspedes</span>
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">
                      {quartoSelecionado?.categoria === 'Apartamento' ? 'Apartamento' : 'Quarto'} <span className="text-red-600">{quartoSelecionado.nome}</span>
                    </h2>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      {quartoSelecionado.ala_andar && (
                        <span className="text-xs text-slate-500 font-medium">{quartoSelecionado.ala_andar}</span>
                      )}
                      <span className="text-slate-300">·</span>
                      <TipoBadge tipo={quartoSelecionado.tipo} />
                      <span className="text-slate-300">·</span>
                      <span className={`text-xs font-bold ${vagasRestantes <= 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                        {vagasRestantes} vaga{vagasRestantes !== 1 ? 's' : ''} restante{vagasRestantes !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setModalAlocacao(false)}
                    className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400 hover:text-slate-600"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="mt-4">
                  <OcupacaoBar ocupados={ocupantesAtuais.length} capacidade={quartoSelecionado.capacidade || 0} />
                </div>
              </div>

              {/* FILTROS DO MODAL */}
              <div className="bg-slate-50 border-b border-slate-200 px-6 py-3.5 flex-shrink-0">
                <div className="flex items-center gap-2 mb-2">
                  <Filter size={12} className="text-slate-400" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Filtrar Inscritos Disponíveis</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Nome</label>
                    <input
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-red-500/20 focus:border-red-400 outline-none transition-all"
                      placeholder="Nome..."
                      onChange={(e) => setBuscaNome(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">CPF</label>
                    <input
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-red-500/20 focus:border-red-400 outline-none transition-all"
                      placeholder="CPF..."
                      onChange={(e) => setBuscaCPF(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Regional</label>
                    <select
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-red-500/20 focus:border-red-400 outline-none transition-all cursor-pointer"
                      onChange={(e) => setFiltroRegionalAloc(e.target.value)}
                    >
                      <option value="">Todas</option>
                      {[...new Set(inscritos.filter(i => !i.quarto_id).map(i => i.regional).filter(Boolean))].map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Cidade</label>
                    <CidadeSearchInput
                      cidades={cidadesBanco}
                      value={filtroCidadeAloc}
                      placeholder="Cidade..."
                      onChange={({ codigo }) => setFiltroCidadeAloc(codigo)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Pastor</label>
                    <select
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-red-500/20 focus:border-red-400 outline-none transition-all cursor-pointer"
                      onChange={(e) => setFiltroPastorAloc(e.target.value)}
                    >
                      <option value="">Todos</option>
                      {[...new Set(inscritos.filter(i => !i.quarto_id).map(i => i.nome_pastor).filter(Boolean))].map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Sexo</label>
                    <select
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-red-500/20 focus:border-red-400 outline-none transition-all cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                      disabled={quartoSelecionado?.categoria !== 'Apartamento' && (quartoSelecionado?.tipo === 'Masculino' || quartoSelecionado?.tipo === 'Feminino')}
                      value={quartoSelecionado?.categoria !== 'Apartamento' && (quartoSelecionado?.tipo === 'Masculino' || quartoSelecionado?.tipo === 'Feminino') ? quartoSelecionado.tipo : filtroSexoAloc}
                      onChange={(e) => setFiltroSexoAloc(e.target.value)}
                    >
                      <option value="">Todos</option>
                      <option value="Masculino">Masculino</option>
                      <option value="Feminino">Feminino</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* LISTA DE INSCRITOS */}
              <div className="flex-1 overflow-y-auto p-5">
                {/* Controle de Seleção */}
                <div className="mb-4 p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 accent-red-600 cursor-pointer rounded"
                      checked={selecionados.length === candidatosFiltrados.length && candidatosFiltrados.length > 0}
                      onChange={() => toggleSelectAll(candidatosFiltrados)}
                    />
                    <span className="text-sm font-semibold text-slate-600">
                      Selecionar todos
                      <span className="ml-1.5 text-slate-400 font-normal">({candidatosFiltrados.length} encontrados)</span>
                    </span>
                  </label>
                  {selecionados.length > 0 && (
                    <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                      {selecionados.length} selecionado{selecionados.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {/* Cards de Inscritos */}
                {candidatosFiltrados.length === 0 ? (
                  <div className="py-16 text-center">
                    <Users size={32} className="mx-auto text-slate-200 mb-3" />
                    <p className="text-slate-400 text-sm font-medium">Nenhum inscrito disponível</p>
                    <p className="text-slate-300 text-xs mt-1">Ajuste os filtros para encontrar hóspedes</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {candidatosPagina.map(i => (
                      <div
                        key={i.id}
                        onClick={() => toggleSelect(i.id)}
                        className={`py-2 px-4 border rounded-xl cursor-pointer transition-all flex items-center justify-between gap-4 text-xs ${
                          selecionados.includes(i.id)
                            ? 'bg-red-50/70 border-red-200 shadow-sm'
                            : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <input
                            type="checkbox"
                            className="w-4 h-4 accent-red-600 cursor-pointer rounded flex-shrink-0"
                            checked={selecionados.includes(i.id)}
                            onChange={() => toggleSelect(i.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="min-w-0 flex flex-col sm:flex-row sm:items-center sm:gap-3">
                            <span className="font-bold text-slate-900 truncate block max-w-[200px] sm:max-w-xs">{i.nome_completo}</span>
                            <span className="inline-flex text-slate-500 font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/50 self-start sm:self-auto">
                              CPF: {formatarCPF(i.cpf)}
                            </span>
                          </div>
                        </div>

                        <div className="hidden md:flex items-center gap-4 text-slate-500 min-w-0">
                          <span className="truncate max-w-[120px]"><b>Cidade:</b> {i.cidade || '---'}</span>
                          <span className="truncate max-w-[80px]"><b>Reg:</b> {i.regional || '---'}</span>
                          <span className="truncate max-w-[120px]"><b>Pastor:</b> {i.nome_pastor || '---'}</span>
                        </div>

                        {i.sexo && (
                          <span className={`flex-shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                            i.sexo === 'Feminino' ? 'bg-pink-50 text-pink-600 border border-pink-100' : 'bg-blue-50 text-blue-600 border border-blue-100'
                          }`}>
                            {i.sexo === 'Feminino' ? '♀' : '♂'} {i.sexo === 'Feminino' ? 'Fem' : 'Masc'}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Controles de Paginação Visual */}
                {totalPaginas > 1 && (
                  <div className="flex items-center justify-between border-t border-slate-100 mt-6 pt-4">
                    <span className="text-xs text-slate-400 font-medium">
                      Página {paginaAloc} de {totalPaginas} ({candidatosFiltrados.length} no total)
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={paginaAloc === 1}
                        onClick={() => setPaginaAloc(prev => Math.max(prev - 1, 1))}
                        className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-40 disabled:hover:bg-transparent"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        type="button"
                        disabled={paginaAloc === totalPaginas}
                        onClick={() => setPaginaAloc(prev => Math.min(prev + 1, totalPaginas))}
                        className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-40 disabled:hover:bg-transparent"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-4">
                <div className="text-sm text-slate-500 font-medium">
                  {selecionados.length > 0
                    ? <span className="text-slate-800 font-semibold">{selecionados.length} inscrito{selecionados.length !== 1 ? 's' : ''} selecionado{selecionados.length !== 1 ? 's' : ''}</span>
                    : 'Selecione os inscritos para alocar'}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setModalAlocacao(false)}
                    className="px-5 py-2.5 border border-slate-200 text-slate-700 rounded-xl font-semibold text-sm hover:bg-slate-100 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={realizarAlocacaoMultipla}
                    disabled={selecionados.length === 0}
                    className="px-6 py-2.5 bg-red-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-red-600/20 hover:bg-red-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <UserPlus size={16} />
                    Alocar {selecionados.length > 0 ? selecionados.length : ''} ao {quartoSelecionado?.categoria === 'Apartamento' ? 'Apartamento' : 'Quarto'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
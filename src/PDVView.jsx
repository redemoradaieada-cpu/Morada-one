import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import {
  ShoppingCart, Package, Trash2, History, XCircle,
  ChevronDown, ChevronUp, Filter, Search, Tag, Palette,
  Banknote, CreditCard, Smartphone, RefreshCw, CheckCircle,
  TrendingUp, AlertTriangle, ArrowRight, BarChart3, PlusCircle, X
} from 'lucide-react';
import Swal from 'sweetalert2';
import { useEventContext } from './contexts/EventContext';

const SENHA_ADMIN = "526811";

const FORMAS_PAGAMENTO = [
  { id: 'dinheiro', label: 'Dinheiro', icon: Banknote, color: 'emerald', bg: 'bg-emerald-500', light: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-500', ring: 'ring-emerald-500/30' },
  { id: 'pix',      label: 'PIX',      icon: Smartphone, color: 'violet', bg: 'bg-violet-500',  light: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-500',  ring: 'ring-violet-500/30'  },
  { id: 'debito',   label: 'Débito',   icon: CreditCard, color: 'blue',   bg: 'bg-blue-500',    light: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-500',    ring: 'ring-blue-500/30'    },
  { id: 'credito',  label: 'Crédito',  icon: CreditCard, color: 'amber',  bg: 'bg-amber-500',   light: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-500',   ring: 'ring-amber-500/30'   },
];

const PAGAMENTO_CORES = {
  dinheiro: { badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  pix:      { badge: 'bg-violet-100  text-violet-700',  dot: 'bg-violet-500'  },
  debito:   { badge: 'bg-blue-100    text-blue-700',    dot: 'bg-blue-500'    },
  credito:  { badge: 'bg-amber-100   text-amber-700',   dot: 'bg-amber-500'   },
};

export function PDVView() {
  const [produtos, setProdutos] = useState([]);
  const [grupos, setGrupos] = useState([]);

  const [carrinho, setCarrinho] = useState([]);
  const [carrinhoDevolucao, setCarrinhoDevolucao] = useState([]);

  const [tipoVenda, setTipoVenda] = useState('venda');
  const [modoGrid, setModoGrid] = useState('saida');
  // Múltiplas formas de pagamento: [{ forma: 'dinheiro', valor: '' }, ...]
  const [pagamentos, setPagamentos] = useState([{ forma: 'dinheiro', valor: '' }]);
  const [nomePracaAlimentacao, setNomePracaAlimentacao] = useState('');
  const [senhaPracaAlimentacao, setSenhaPracaAlimentacao] = useState('');

  const [dadosDoacao, setDadosDoacao] = useState({ doador: '', beneficiario: '' });
  const [historico, setHistorico] = useState([]);
  const [senha, setSenha] = useState('');
  const [telaAtiva, setTelaAtiva] = useState('pdv');

  const [filtroDescricao, setFiltroDescricao] = useState('');
  const [filtroGrupo, setFiltroGrupo] = useState('');
  const [filtroCor, setFiltroCor] = useState('');

  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroFormaPgto, setFiltroFormaPgto] = useState('todas');
  const [filtroGrupoRelatorio, setFiltroGrupoRelatorio] = useState('todos');

  const [expandidos, setExpandidos] = useState({});
  const { eventos, eventoSelecionado } = useEventContext();
  const isGlobalUser = eventos && eventos.length > 1;
  const [eventoPDV, setEventoPDV] = useState(eventoSelecionado?.id || '');

  useEffect(() => {
    if (eventoSelecionado && !eventoPDV) {
      setEventoPDV(eventoSelecionado.id);
    }
  }, [eventoSelecionado, eventoPDV]);

  useEffect(() => {
    if (!eventoPDV && !eventoSelecionado) return;
    fetchProdutos();
    fetchHistorico();
    fetchGrupos();
  }, [eventoPDV, eventoSelecionado]);

  async function fetchProdutos() {
    const evId = eventoPDV || eventoSelecionado?.id;
    if (!evId) return;
    const { data } = await supabase.from('produtos').select('*, grupos(nome)').eq('status', 'Ativo').eq('evento_id', evId);
    if (data) setProdutos(data);
  }

  async function fetchGrupos() {
    const evId = eventoPDV || eventoSelecionado?.id;
    if (!evId) return;
    const { data } = await supabase.from('grupos').select('*').eq('evento_id', evId);
    if (data) setGrupos(data);
  }

  async function fetchHistorico() {
    const evId = eventoPDV || eventoSelecionado?.id;
    if (!evId) return;
    const { data } = await supabase
      .from('vendas')
      .select('*, itens_venda(produto_id, nome, quantidade, produtos(grupo_id))')
      .eq('evento_id', evId)
      .order('created_at', { ascending: false });
    if (data) setHistorico(data);
  }

  const normalizeText = (text) => text?.normalize('NFD').replace(/[-]/g, c => c).replace(/[-]/g, '').normalize('NFC');
  const normalizeName = (text) => text?.normalize('NFD').replace(/[-]/g, c => c).replace(/[-]/g, '').normalize('NFC');
  const produtosFiltrados = produtos.filter(p => {
    const matchDesc = p.nome?.toLowerCase().includes(filtroDescricao.toLowerCase());
    const matchGrupo = filtroGrupo === '' || p.grupo_id?.toString() === filtroGrupo;
    const matchCor = filtroCor === '' || p.cor?.toLowerCase().includes(filtroCor.toLowerCase());
    return matchDesc && matchGrupo && matchCor;
  });

  const isPracaDeAlimentacao = (nome) => {
    if (!nome) return false;
    const normalized = nome
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .normalize('NFC')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
    return normalized === 'praca de alimentacao' || normalized === 'praca alimentacao';
  };

  const isFiltroPraca = grupos.find(g => g.id?.toString() === filtroGrupo && isPracaDeAlimentacao(g.nome));
  const hasItemPraca = carrinho.some(item => item.grupos?.nome && isPracaDeAlimentacao(item.grupos.nome));
  const exigeDadosPraca = isFiltroPraca || hasItemPraca;

  useEffect(() => {
    if (!exigeDadosPraca) {
      setNomePracaAlimentacao('');
      setSenhaPracaAlimentacao('');
    }
  }, [exigeDadosPraca]);

  const handleTipoVendaChange = (e) => {
    const novoTipo = e.target.value;
    setTipoVenda(novoTipo);
    if (novoTipo !== 'troca') {
      setCarrinhoDevolucao([]);
      setModoGrid('saida');
    }
  };

  const adicionarAoCarrinho = (produto) => {
    if (tipoVenda === 'troca' && modoGrid === 'devolucao') {
      const itemExistente = carrinhoDevolucao.find(item => item.id === produto.id);
      if (itemExistente) {
        setCarrinhoDevolucao(carrinhoDevolucao.map(item => item.id === produto.id ? { ...item, qtd: item.qtd + 1 } : item));
      } else {
        setCarrinhoDevolucao([...carrinhoDevolucao, { ...produto, qtd: 1 }]);
      }
      return;
    }

    if (produto.quantidade <= 0) {
      Swal.fire("Atenção", `O produto "${produto.nome}" está fora de estoque!`, "warning");
      return;
    }

    const itemExistente = carrinho.find(item => item.id === produto.id);
    if (itemExistente) {
      if (itemExistente.qtd < produto.quantidade) {
        setCarrinho(carrinho.map(item => item.id === produto.id ? { ...item, qtd: item.qtd + 1 } : item));
      } else {
        Swal.fire("Atenção", `Limite atingido! Há apenas ${produto.quantidade} unidades de "${produto.nome}" no estoque.`, "warning");
      }
    } else {
      setCarrinho([...carrinho, { ...produto, qtd: 1 }]);
    }
  };

  const removerDoCarrinho = (produtoId) => setCarrinho(carrinho.filter(item => item.id !== produtoId));
  const removerDaDevolucao = (produtoId) => setCarrinhoDevolucao(carrinhoDevolucao.filter(item => item.id !== produtoId));

  const totalSaida = carrinho.reduce((acc, i) => acc + (i.preco * i.qtd), 0);
  const totalDevolucao = tipoVenda === 'troca' ? carrinhoDevolucao.reduce((acc, i) => acc + (i.preco * i.qtd), 0) : 0;
  const totalGeralOperacao = totalSaida - totalDevolucao;

  // Helpers pagamentos múltiplos
  const totalPago = pagamentos.reduce((acc, p) => acc + (parseFloat(p.valor) || 0), 0);
  const saldoRestante = totalGeralOperacao - totalPago;
  const troco = Math.max(0, totalPago - totalGeralOperacao);

  const adicionarPagamento = () => {
    const formasUsadas = pagamentos.map(p => p.forma);
    const proxForma = FORMAS_PAGAMENTO.find(f => !formasUsadas.includes(f.id));
    if (!proxForma) return;
    setPagamentos([...pagamentos, { forma: proxForma.id, valor: '' }]);
  };

  const removerPagamento = (idx) => {
    if (pagamentos.length <= 1) return;
    setPagamentos(pagamentos.filter((_, i) => i !== idx));
  };

  const atualizarPagamento = (idx, campo, valor) => {
    setPagamentos(pagamentos.map((p, i) => i === idx ? { ...p, [campo]: valor } : p));
  };

  const finalizarVenda = async () => {
    if (carrinho.length === 0 && carrinhoDevolucao.length === 0) {
      Swal.fire("Atenção", "A operação está vazia!", "warning");
      return;
    }

    if (tipoVenda === 'troca' && (carrinho.length === 0 || carrinhoDevolucao.length === 0)) {
      Swal.fire("Atenção", "Para uma troca, informe ao menos um produto devolvido e um produto levado.", "warning");
      return;
    }

    if (tipoVenda === 'doacao' && senha !== SENHA_ADMIN) {
      Swal.fire("Atenção", "Senha de doação inválida!", "error");
      return;
    }

    if (exigeDadosPraca) {
      if (!nomePracaAlimentacao.trim()) {
        Swal.fire("Atenção", "Por favor, preencha o NOME DO CLIENTE para a Praça de Alimentação.", "warning");
        return;
      }
      if (!senhaPracaAlimentacao.trim()) {
        Swal.fire("Atenção", "Por favor, preencha a SENHA para a Praça de Alimentação.", "warning");
        return;
      }
    }

    for (const item of carrinho) {
      const prod = produtos.find(p => p.id === item.id);
      if (!prod || prod.quantidade < item.qtd) {
        Swal.fire("Erro", `Estoque insuficiente para "${item.nome}". Disponível: ${prod?.quantidade || 0}.`, "error");
        return;
      }
    }

    // Valida pagamentos
    if (tipoVenda !== 'doacao') {
      const totalInformado = pagamentos.reduce((acc, p) => acc + (parseFloat(p.valor) || 0), 0);
      if (totalInformado < totalGeralOperacao - 0.001) {
        Swal.fire("Atenção", `O total pago (R$ ${totalInformado.toFixed(2)}) é menor que o total da venda (R$ ${totalGeralOperacao.toFixed(2)}).`, "warning");
        return;
      }
      for (const p of pagamentos) {
        if (!p.valor || parseFloat(p.valor) <= 0) {
          Swal.fire("Atenção", "Informe o valor para todas as formas de pagamento adicionadas.", "warning");
          return;
        }
      }
    }

    // Monta string resumida das formas de pagamento
    const formasPgtoStr = tipoVenda === 'doacao' ? null
      : pagamentos.length === 1 ? pagamentos[0].forma
      : pagamentos.map(p => `${p.forma}:${parseFloat(p.valor).toFixed(2)}`).join('|');

    const { data: venda, error: vendaError } = await supabase.from('vendas').insert([{
      tipo: tipoVenda,
      valor_total: totalGeralOperacao,
      doador: dadosDoacao.doador,
      beneficiario: dadosDoacao.beneficiario,
      status: 'finalizada',
      forma_pagamento: formasPgtoStr,
      cliente_nome_praca: exigeDadosPraca ? nomePracaAlimentacao : null,
      senha_pedido_praca: exigeDadosPraca ? senhaPracaAlimentacao : null,
      status_cozinha: exigeDadosPraca ? 'pendente' : null,
      evento_id: eventoPDV || eventoSelecionado.id
    }]).select().single();

    if (vendaError) {
      Swal.fire("Erro", "Erro ao salvar operação: " + vendaError.message, "error");
      return;
    }

    for (const item of carrinho) {
      await supabase.from('itens_venda').insert([{
        venda_id: venda.id,
        produto_id: item.id,
        nome: item.nome,
        quantidade: item.qtd
      }]);
      const prodAtual = produtos.find(p => p.id === item.id);
      await supabase.from('produtos').update({ quantidade: prodAtual.quantidade - item.qtd, sincronizado_nuvem: false }).eq('id', item.id);
    }

    if (tipoVenda === 'troca') {
      for (const item of carrinhoDevolucao) {
        await supabase.from('itens_venda').insert([{
          venda_id: venda.id,
          produto_id: item.id,
          nome: item.nome + ' (DEVOLUÇÃO)',
          quantidade: -item.qtd
        }]);
        const prodAtual = produtos.find(p => p.id === item.id);
        await supabase.from('produtos').update({ quantidade: prodAtual.quantidade + item.qtd, sincronizado_nuvem: false }).eq('id', item.id);
      }
    }

    Swal.fire("Sucesso", "Operação registrada com sucesso!", "success");
    limparCarrinho();
    fetchProdutos();
    fetchHistorico();
  };

  const cancelarVenda = async (venda) => {
    if (venda.status === 'cancelada') {
      Swal.fire("Atenção", "Esta operação já está cancelada!", "warning");
      return;
    }

    const { value: input } = await Swal.fire({
      title: 'Senha de administrador',
      input: 'password',
      inputLabel: 'Digite a senha de administrador para estornar esta operação:',
      showCancelButton: true
    });
    
    if (input !== SENHA_ADMIN) { 
      if (input !== undefined) Swal.fire("Erro", "Senha incorreta!", "error"); 
      return; 
    }

    for (const item of venda.itens_venda) {
      const { data: produto } = await supabase.from('produtos').select('quantidade').eq('id', item.produto_id).single();
      if (produto) {
        await supabase.from('produtos').update({ quantidade: produto.quantidade + item.quantidade, sincronizado_nuvem: false }).eq('id', item.produto_id);
      }
    }

    await supabase.from('vendas').update({ status: 'cancelada' }).eq('id', venda.id);

    if (venda.tipo === 'reserva') {
      await supabase.from('reservas').delete().eq('venda_id', venda.id);
    }

    fetchHistorico();
    fetchProdutos();
  };

  const limparCarrinho = () => {
    setCarrinho([]);
    setCarrinhoDevolucao([]);
    setDadosDoacao({ doador: '', beneficiario: '' });
    setSenha('');
    setTipoVenda('venda');
    setModoGrid('saida');
    setPagamentos([{ forma: 'dinheiro', valor: '' }]);
    setNomePracaAlimentacao('');
    setSenhaPracaAlimentacao('');
  };

  const toggleExpandido = (id) => {
    setExpandidos(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // ─── Filtros do Relatório ──────────────────────────────
  const historicoFiltrado = historico.filter(h => {
    const dataVenda = new Date(h.created_at);
    if (filtroDataInicio && dataVenda < new Date(filtroDataInicio + 'T00:00:00')) return false;
    if (filtroDataFim && dataVenda > new Date(filtroDataFim + 'T23:59:59')) return false;
    if (filtroTipo !== 'todos' && h.tipo !== filtroTipo) return false;
    if (filtroFormaPgto !== 'todas' && h.forma_pagamento !== filtroFormaPgto) return false;
    if (filtroGrupoRelatorio !== 'todos' && (!h.itens_venda || !h.itens_venda.some(item => item.produtos?.grupo_id?.toString() === filtroGrupoRelatorio))) return false;
    return true;
  });

  const totalGeral = historicoFiltrado.filter(h => h.status !== 'cancelada').reduce((acc, h) => acc + (parseFloat(h.valor_total) || 0), 0);
  const totalPorTipo = (tipo) => historicoFiltrado.filter(h => h.status !== 'cancelada' && h.tipo === tipo).reduce((acc, h) => acc + (parseFloat(h.valor_total) || 0), 0);
  const totalPorPagamento = (pgto) => historicoFiltrado.filter(h => h.status !== 'cancelada' && h.forma_pagamento === pgto).reduce((acc, h) => acc + (parseFloat(h.valor_total) || 0), 0);

  const labelTipo = (tipo) => {
    const labels = { venda: 'Venda', reserva: 'Reserva', doacao: 'Doação', troca: 'Troca' };
    return labels[tipo] || tipo?.toUpperCase() || '-';
  };

  const labelPagamento = (pgto) => {
    if (!pgto) return '-';
    // Suporte a múltiplas formas salvas no formato 'forma:valor|forma:valor'
    if (pgto.includes('|')) {
      const labels = { dinheiro: 'Dinheiro', pix: 'PIX', debito: 'Débito', credito: 'Crédito' };
      return pgto.split('|').map(p => {
        const [forma, val] = p.split(':');
        return `${labels[forma] || forma} R$${parseFloat(val).toFixed(2)}`;
      }).join(' + ');
    }
    const labels = { dinheiro: 'Dinheiro', pix: 'PIX', debito: 'Débito', credito: 'Crédito' };
    return labels[pgto] || pgto || '-';
  };

  const totalItensCarrinho = carrinho.reduce((acc, i) => acc + i.qtd, 0);

  // ─── Render ───────────────────────────────────────────
  return (
    <div className="flex flex-col space-y-5">

      {/* ── Cabeçalho Clean ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

          {/* Título */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                <ShoppingCart size={22} className="text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-800 tracking-tight">Ponto de Venda</h2>
                <p className="text-slate-400 text-xs font-medium mt-0.5">Vendas, trocas e operações em tempo real</p>
              </div>
            </div>
            {isGlobalUser && (
              <div className="mt-1">
                <select
                  value={eventoPDV || eventoSelecionado?.id}
                  onChange={(e) => {
                    setEventoPDV(e.target.value);
                    setCarrinho([]); // limpa o carrinho ao trocar
                    setCarrinhoDevolucao([]);
                  }}
                  className="w-full max-w-[220px] p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 outline-none cursor-pointer hover:border-red-300 transition-colors"
                >
                  {eventos.map(ev => (
                    <option key={ev.id} value={ev.id}>{ev.nome}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Métricas + Tabs */}
          <div className="flex flex-wrap items-center gap-3">
            {telaAtiva === 'pdv' && (
              <>
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-center min-w-[70px]">
                  <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Itens</div>
                  <div className="text-lg font-black text-slate-800">{totalItensCarrinho}</div>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2 text-center min-w-[110px]">
                  <div className="text-[10px] text-emerald-600 uppercase tracking-widest font-bold">Total</div>
                  <div className="text-lg font-black text-emerald-700 font-mono">R$ {totalGeralOperacao.toFixed(2)}</div>
                </div>
              </>
            )}

            {/* Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
              <button
                onClick={() => setTelaAtiva('pdv')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  telaAtiva === 'pdv'
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white'
                }`}
              >
                <ShoppingCart size={14} /> Caixa
              </button>
              <button
                onClick={() => setTelaAtiva('historico')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  telaAtiva === 'historico'
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white'
                }`}
              >
                <BarChart3 size={14} /> Relatórios
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════ TELA PDV ════════════════ */}
      {telaAtiva === 'pdv' ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* ── Coluna Esquerda: Filtros + Produtos ── */}
          <div className="xl:col-span-2 space-y-4">

            {/* Filtros */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
              <h3 className="font-bold text-slate-600 mb-4 text-[11px] uppercase tracking-widest flex items-center gap-2">
                <Filter size={13} className="text-red-400" /> Filtrar Produtos
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={15} />
                  <input
                    placeholder="Buscar por nome..."
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-400 outline-none transition-all"
                    onChange={e => setFiltroDescricao(e.target.value)}
                  />
                </div>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={15} />
                  <select
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-400 outline-none transition-all appearance-none cursor-pointer"
                    onChange={e => setFiltroGrupo(e.target.value)}
                  >
                    <option value="">Todos os Grupos</option>
                    {grupos.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
                  </select>
                </div>
                <div className="relative">
                  <Palette className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={15} />
                  <input
                    placeholder="Filtrar por cor..."
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-400 outline-none transition-all"
                    onChange={e => setFiltroCor(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Grid de Produtos */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
              <div className="flex justify-between items-center mb-4 flex-shrink-0">
                <h3 className="font-bold text-slate-600 text-[11px] uppercase tracking-widest flex items-center gap-2">
                  <Package size={13} className="text-red-400" />
                  {tipoVenda === 'troca' && modoGrid === 'devolucao' ? 'Selecione o que Retorna' : 'Estoque Disponível'}
                </h3>
                <span className="text-xs text-slate-400 font-medium">{produtosFiltrados.length} produto(s)</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 xl:overflow-y-auto xl:scrollbar-hide">
                {produtosFiltrados.map(p => {
                  const esgotado = p.quantidade <= 0;
                  const isBloqueado = esgotado && !(tipoVenda === 'troca' && modoGrid === 'devolucao');
                  const isDevolucaoMode = tipoVenda === 'troca' && modoGrid === 'devolucao';

                  return (
                    <button
                      key={p.id}
                      onClick={() => adicionarAoCarrinho(p)}
                      disabled={isBloqueado}
                      className={`relative p-3.5 border-2 rounded-xl transition-all text-left group ${
                        isBloqueado
                          ? 'bg-slate-50 opacity-40 cursor-not-allowed border-slate-100'
                          : isDevolucaoMode
                            ? 'bg-white hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-50 hover:-translate-y-0.5 border-slate-200 active:scale-95'
                            : 'bg-white hover:border-red-400 hover:shadow-lg hover:shadow-red-50 hover:-translate-y-0.5 border-slate-200 active:scale-95'
                      }`}
                    >
                      {/* Badge grupo */}
                      {p.grupos?.nome && (
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 rounded px-1.5 py-0.5 mb-2 inline-block">
                          {p.grupos.nome}
                        </span>
                      )}
                      <div className="font-bold text-slate-800 text-sm leading-tight mb-2">{p.nome}</div>
                      <div className="text-[10px] text-slate-500 space-y-0.5">
                        {p.cor && <div>Cor: <span className="text-slate-700 font-semibold">{p.cor}</span></div>}
                        {p.tamanho && <div>Tam: <span className="text-slate-700 font-semibold">{p.tamanho}</span></div>}
                      </div>
                      <div className="mt-3 flex justify-between items-center">
                        <span className="text-sm font-black text-slate-900">
                          R$ {parseFloat(p.preco).toFixed(2)}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                          esgotado ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'
                        }`}>
                          {esgotado ? '✗' : p.quantidade}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
                {produtosFiltrados.length === 0 && (
                  <div className="text-center py-12 text-slate-400">
                    <Package size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Nenhum produto encontrado</p>
                  </div>
                )}
            </div>
          </div>

          {/* ── Coluna Direita: Checkout ── */}
          <div className="xl:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden xl:sticky xl:top-4">

              {/* Header do carrinho */}
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-white">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-red-50 border border-red-100 rounded-lg flex items-center justify-center">
                    <ShoppingCart size={14} className="text-red-600" />
                  </div>
                  <span className="font-bold text-slate-800 text-sm">Carrinho</span>
                  {totalItensCarrinho > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{totalItensCarrinho}</span>
                  )}
                </div>
                <button onClick={limparCarrinho} className="text-slate-400 hover:text-red-500 transition-colors text-xs font-bold flex items-center gap-1">
                  <Trash2 size={12} /> Limpar
                </button>
              </div>

              {/* Body do carrinho */}
              <div className="flex flex-col">

                {/* === Tipo de Operação === */}
                <div className="px-4 pt-4 pb-3 border-b border-slate-100">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Tipo de Operação</label>
                  <select
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-all appearance-none cursor-pointer"
                    value={tipoVenda}
                    onChange={handleTipoVendaChange}
                  >
                    <option value="venda">💰 Venda Tradicional</option>
                    <option value="troca">🔄 Troca de Produtos</option>
                    <option value="doacao">🎁 Doação</option>
                  </select>
                </div>

                {exigeDadosPraca && (
                  <div className="px-4 pb-3 border-b border-slate-100 grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Nome do Cliente</label>
                      <input
                        type="text"
                        placeholder="Nome do cliente"
                        value={nomePracaAlimentacao}
                        onChange={e => setNomePracaAlimentacao(e.target.value)}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Senha Pedido</label>
                      <input
                        type="text"
                        placeholder="Ex: 042"
                        value={senhaPracaAlimentacao}
                        onChange={e => setSenhaPracaAlimentacao(e.target.value)}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-all"
                      />
                    </div>
                  </div>
                )}

                {/* === Modo Troca: SEMPRE VISÍVEL === */}
                {tipoVenda === 'troca' && (
                  <div className="px-4 pb-3 border-b border-slate-100">
                    <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                      <button
                        onClick={() => setModoGrid('saida')}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${modoGrid === 'saida' ? 'bg-white shadow-sm text-red-600' : 'text-slate-500'}`}
                      >
                        ↑ LEVADO
                      </button>
                      <button
                        onClick={() => setModoGrid('devolucao')}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${modoGrid === 'devolucao' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500'}`}
                      >
                        ↓ DEVOLVIDO
                      </button>
                    </div>
                  </div>
                )}

                {/* === Doação: SEMPRE VISÍVEL === */}
                {tipoVenda === 'doacao' && (
                  <div className="px-4 pb-3 border-b border-slate-100">
                    <div className="space-y-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">Dados da Doação</p>
                      <input placeholder="Nome do Doador" className="w-full p-2 border border-amber-200 bg-white rounded-lg text-sm outline-none focus:border-amber-400" onChange={e => setDadosDoacao({ ...dadosDoacao, doador: e.target.value })} />
                      <input placeholder="Beneficiário" className="w-full p-2 border border-amber-200 bg-white rounded-lg text-sm outline-none focus:border-amber-400" onChange={e => setDadosDoacao({ ...dadosDoacao, beneficiario: e.target.value })} />
                      <input type="password" placeholder="Senha Administrador" className="w-full p-2 border border-amber-200 bg-white rounded-lg text-sm outline-none focus:border-amber-400" value={senha} onChange={e => setSenha(e.target.value)} />
                    </div>
                  </div>
                )}

                {/* === LISTA DE ITENS: Única área com scroll, limitada em altura === */}
                <div className="px-4 py-2 max-h-40 overflow-y-auto scrollbar-hide">
                  {tipoVenda === 'troca' && <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 pb-1">Saída (Levados)</p>}
                  {carrinho.length === 0 ? (
                    <div className="py-4 text-center text-slate-400 text-xs border-2 border-dashed border-slate-100 rounded-xl">
                      Clique nos produtos para adicionar
                    </div>
                  ) : (
                    carrinho.map((item, idx) => (
                      <div key={`saida-${idx}`} className="flex justify-between items-center py-1.5 px-2 rounded-lg hover:bg-slate-50 group transition-colors">
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="font-bold text-slate-800 text-sm truncate">{item.nome}</span>
                          <span className="text-xs text-slate-500">x{item.qtd} · R$ {(item.preco * item.qtd).toFixed(2)}</span>
                        </div>
                        <button onClick={() => removerDoCarrinho(item.id)} className="ml-2 text-slate-300 hover:text-red-500 p-1 rounded-lg transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  )}

                  {tipoVenda === 'troca' && (
                    <div className="mt-2">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-600 pb-1 border-t border-slate-100 pt-2">Entrada (Devolvidos)</p>
                      {carrinhoDevolucao.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-1">Nenhum produto devolvido.</p>
                      ) : (
                        carrinhoDevolucao.map((item, idx) => (
                          <div key={`dev-${idx}`} className="flex justify-between items-center py-1.5 px-2 rounded-lg hover:bg-emerald-50 group transition-colors">
                            <div className="flex flex-col">
                              <span className="font-bold text-emerald-700 text-sm">{item.nome}</span>
                              <span className="text-xs text-emerald-600">x{item.qtd} · - R$ {(item.preco * item.qtd).toFixed(2)}</span>
                            </div>
                            <button onClick={() => removerDaDevolucao(item.id)} className="text-slate-300 hover:text-red-500 p-1 rounded-lg transition-colors">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* === Formas de Pagamento Múltiplas === */}
                {tipoVenda !== 'doacao' && (
                  <div className="px-4 pt-3 pb-3 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pagamento</label>
                      {pagamentos.length < FORMAS_PAGAMENTO.length && (
                        <button
                          type="button"
                          onClick={adicionarPagamento}
                          className="flex items-center gap-1 text-[10px] font-bold text-red-500 hover:text-red-600 transition-colors"
                        >
                          <PlusCircle size={12} /> Adicionar forma
                        </button>
                      )}
                    </div>

                    <div className="space-y-2">
                      {pagamentos.map((pgto, idx) => {
                        const fp = FORMAS_PAGAMENTO.find(f => f.id === pgto.forma);
                        const Icon = fp?.icon || Banknote;
                        const formasDisponiveis = FORMAS_PAGAMENTO.filter(
                          f => f.id === pgto.forma || !pagamentos.some(p => p.forma === f.id)
                        );
                        const temTroco = pgto.forma === 'dinheiro' && parseFloat(pgto.valor) > 0;

                        return (
                          <div key={idx} className={`rounded-xl border-2 overflow-hidden transition-all ${
                            fp ? `${fp.border}` : 'border-slate-200'
                          }`}>
                            <div className={`flex items-center gap-2 p-2 ${ fp ? fp.light : 'bg-slate-50' }`}>
                              {/* Seletor de forma */}
                              <select
                                value={pgto.forma}
                                onChange={e => atualizarPagamento(idx, 'forma', e.target.value)}
                                className={`flex-1 text-xs font-bold bg-transparent outline-none cursor-pointer ${ fp ? fp.text : 'text-slate-600' }`}
                              >
                                {formasDisponiveis.map(f => (
                                  <option key={f.id} value={f.id}>{f.label}</option>
                                ))}
                              </select>

                              {/* Input de valor */}
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="R$ 0,00"
                                value={pgto.valor}
                                onChange={e => atualizarPagamento(idx, 'valor', e.target.value)}
                                className={`w-24 text-right text-xs font-black bg-white border rounded-lg px-2 py-1.5 outline-none ${
                                  fp ? `${fp.border} focus:border-current` : 'border-slate-200'
                                }`}
                              />

                              {/* Botão remover */}
                              {pagamentos.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removerPagamento(idx)}
                                  className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                                >
                                  <X size={13} />
                                </button>
                              )}
                            </div>

                            {/* Troco (só para dinheiro) */}
                            {pgto.forma === 'dinheiro' && parseFloat(pgto.valor) > 0 && (
                              <div className="px-3 py-1.5 bg-emerald-50 border-t border-emerald-200 flex justify-between items-center">
                                <span className="text-[10px] text-emerald-700 font-bold">💵 Troco desta parte:</span>
                                <span className="text-xs font-black text-emerald-700">
                                  R$ {Math.max(0, parseFloat(pgto.valor) - Math.min(parseFloat(pgto.valor), totalGeralOperacao)).toFixed(2)}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Saldo restante */}
                    {pagamentos.length > 0 && (
                      <div className={`mt-2 flex justify-between items-center px-2 py-1.5 rounded-lg ${
                        saldoRestante <= 0.001 ? 'bg-emerald-50' : 'bg-amber-50'
                      }`}>
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${
                          saldoRestante <= 0.001 ? 'text-emerald-600' : 'text-amber-600'
                        }`}>
                          {saldoRestante <= 0.001 ? '✓ Pagamento completo' : 'Falta pagar'}
                        </span>
                        <span className={`text-xs font-black ${
                          saldoRestante <= 0.001 ? 'text-emerald-600' : 'text-amber-700'
                        }`}>
                          {saldoRestante > 0.001 ? `R$ ${saldoRestante.toFixed(2)}` : troco > 0 ? `Troco R$ ${troco.toFixed(2)}` : ''}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer: Totalizador + Botão */}
              <div className="border-t border-slate-100 p-4 bg-slate-50/50">
                {tipoVenda === 'troca' && (
                  <div className="space-y-1.5 mb-4 pb-4 border-b border-slate-200">
                    <div className="flex justify-between text-xs font-bold text-slate-500">
                      <span>Total Levado:</span>
                      <span className="text-slate-800">R$ {totalSaida.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold text-emerald-600">
                      <span>Crédito (Devolvido):</span>
                      <span>- R$ {totalDevolucao.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-end mb-5">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    {tipoVenda === 'troca' && totalGeralOperacao < 0 ? 'Crédito Restante' : 'Total a Cobrar'}
                  </span>
                  <span className={`text-3xl font-black ${tipoVenda === 'troca' && totalGeralOperacao < 0 ? 'text-emerald-600' : 'text-slate-900'}`}>
                    R$ {Math.abs(totalGeralOperacao).toFixed(2)}
                  </span>
                </div>

                <button
                  onClick={finalizarVenda}
                  className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-500/30 active:scale-[0.98]"
                >
                  <CheckCircle size={18} />
                  Confirmar Venda
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

      ) : (
        /* ════════════════ TELA RELATÓRIO ════════════════ */
        <div className="flex-1 overflow-y-auto scrollbar-hide pb-10 space-y-5">

          {/* Cards de resumo por Forma de Pagamento */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {FORMAS_PAGAMENTO.map(fp => {
              const val = totalPorPagamento(fp.id);
              const count = historicoFiltrado.filter(h => h.status !== 'cancelada' && h.forma_pagamento === fp.id).length;
              const Icon = fp.icon;
              return (
                <div key={fp.id} className={`bg-white rounded-2xl border-2 p-4 md:p-5 transition-all cursor-pointer ${
                  filtroFormaPgto === fp.id ? `${fp.border} shadow-md` : 'border-slate-200 hover:border-slate-300'
                }`}
                  onClick={() => setFiltroFormaPgto(filtroFormaPgto === fp.id ? 'todas' : fp.id)}
                >
                  <div className={`w-8 h-8 md:w-9 md:h-9 ${fp.light} rounded-xl flex items-center justify-center mb-2 md:mb-3`}>
                    <Icon size={16} className={fp.text} />
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{fp.label}</div>
                  <div className="text-lg md:text-xl font-black text-slate-900">R$ {val.toFixed(2)}</div>
                  <div className="text-xs text-slate-400 mt-1">{count} transação(ões)</div>
                </div>
              );
            })}
          </div>

          {/* Relatório principal */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

            {/* Header filtros */}
            <div className="p-4 md:p-5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex flex-col gap-3">
                <h3 className="font-bold text-slate-700 text-sm uppercase tracking-widest flex items-center gap-2">
                  <History size={15} className="text-red-400" /> Histórico de Transações
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:flex-wrap gap-2">
                  <input type="date" className="p-2 md:p-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-500/20" value={filtroDataInicio} onChange={e => setFiltroDataInicio(e.target.value)} />
                  <input type="date" className="p-2 md:p-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-500/20" value={filtroDataFim} onChange={e => setFiltroDataFim(e.target.value)} />
                  <select className="p-2 md:p-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-500/20" value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
                    <option value="todos">Todos os Tipos</option>
                    <option value="venda">Vendas</option>
                    <option value="troca">Trocas</option>
                    <option value="reserva">Reservas</option>
                    <option value="doacao">Doações</option>
                  </select>
                  <select className="p-2 md:p-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-500/20" value={filtroGrupoRelatorio} onChange={e => setFiltroGrupoRelatorio(e.target.value)}>
                    <option value="todos">Todos os Grupos</option>
                    {grupos.map(g => (
                      <option key={g.id} value={g.id}>{g.nome}</option>
                    ))}
                  </select>
                  {(filtroDataInicio || filtroDataFim || filtroTipo !== 'todos' || filtroFormaPgto !== 'todas' || filtroGrupoRelatorio !== 'todos') && (
                    <button
                      onClick={() => { setFiltroDataInicio(''); setFiltroDataFim(''); setFiltroTipo('todos'); setFiltroFormaPgto('todas'); setFiltroGrupoRelatorio('todos'); }}
                      className="flex items-center justify-center gap-1.5 p-2 md:p-2.5 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-bold hover:bg-red-100 transition-colors"
                    >
                      <RefreshCw size={13} /> Limpar
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Lista de transações */}
            <div className="divide-y divide-slate-100">
              {historicoFiltrado.length === 0 ? (
                <div className="p-16 text-center">
                  <History size={40} className="mx-auto mb-4 text-slate-200" />
                  <p className="text-slate-400 text-sm">Nenhuma transação encontrada no período.</p>
                </div>
              ) : (
                historicoFiltrado.map(h => {
                  const pgto = h.forma_pagamento;
                  const pgtoCores = pgto ? PAGAMENTO_CORES[pgto] : null;

                  return (
                    <div key={h.id} className={`group transition-colors ${h.status === 'cancelada' ? 'bg-red-50/60' : 'hover:bg-slate-50/60'}`}>
                      <div className="px-4 md:px-5 py-4 flex flex-col sm:flex-row justify-between items-start gap-3">

                        {/* Info esquerda */}
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          {/* Coluna de cor por tipo */}
                          <div className={`w-1 self-stretch rounded-full flex-shrink-0 mt-1 ${
                            h.tipo === 'venda' ? 'bg-blue-400' :
                            h.tipo === 'troca' ? 'bg-purple-400' :
                            h.tipo === 'doacao' ? 'bg-amber-400' : 'bg-orange-400'
                          }`} />

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex-shrink-0 ${
                                h.tipo === 'venda' ? 'bg-blue-100 text-blue-700' :
                                h.tipo === 'troca' ? 'bg-purple-100 text-purple-700' :
                                h.tipo === 'doacao' ? 'bg-amber-100 text-amber-700' : 'bg-orange-100 text-orange-700'
                              }`}>
                                {labelTipo(h.tipo)}
                              </span>

                              {pgto && (
                                <span className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold flex-shrink-0 ${
                                  pgtoCores ? pgtoCores.badge : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {pgtoCores && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${pgtoCores.dot}`} />}
                                  <span className="truncate max-w-[160px]">{labelPagamento(pgto)}</span>
                                </span>
                              )}

                              {h.status === 'cancelada' && (
                                <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase flex-shrink-0">✗ Cancelada</span>
                              )}
                            </div>

                            <div className="flex items-baseline gap-2">
                              <p className={`font-black text-xl ${h.status === 'cancelada' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                                R$ {parseFloat(h.valor_total).toFixed(2)}
                              </p>
                            </div>

                            <p className="text-xs text-slate-400 mt-0.5 font-medium">
                              {new Date(h.created_at).toLocaleString('pt-BR')}
                            </p>

                            {h.cliente_nome_praca && (
                              <div className="mt-2 text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg font-bold inline-flex flex-wrap items-center gap-2">
                                <span className="text-slate-500 uppercase tracking-widest text-[9px]">Cliente</span>
                                <span className="text-slate-800">{h.cliente_nome_praca}</span>
                                <span className="text-slate-300">|</span>
                                <span className="text-slate-500 uppercase tracking-widest text-[9px]">Senha</span>
                                <span className="text-slate-800">{h.senha_pedido_praca}</span>
                              </div>
                            )}

                            {h.tipo === 'doacao' && h.doador && (
                              <p className="text-xs text-amber-700 mt-2 bg-amber-50 px-3 py-1.5 rounded-lg inline-flex flex-wrap items-center gap-2">
                                Doador: <strong>{h.doador}</strong> → Ben: <strong>{h.beneficiario}</strong>
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Ações direita */}
                        <div className="flex items-center gap-2 flex-shrink-0 self-start sm:self-center">
                          <button
                            onClick={() => toggleExpandido(h.id)}
                            className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-700 bg-white border border-slate-200 px-3 py-2 rounded-xl transition-all hover:shadow-sm"
                          >
                            {expandidos[h.id] ? <><ChevronUp size={13} /> Fechar</> : <><ChevronDown size={13} /> Itens</>}
                          </button>
                          {h.status !== 'cancelada' && (
                            <button
                              onClick={() => cancelarVenda(h)}
                              className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-xl transition-all border border-transparent hover:border-red-200"
                              title="Estornar"
                            >
                              <XCircle size={16} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Itens expandidos */}
                      {expandidos[h.id] && (
                        <div className="px-5 pb-5 pt-0">
                          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 ml-5">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Itens da Operação</p>
                            {h.itens_venda && h.itens_venda.length > 0 ? (
                              <div className="space-y-2">
                                {h.itens_venda.map((item, idx) => {
                                  const isDevolucao = item.quantidade < 0;
                                  return (
                                    <div key={idx} className="flex justify-between items-center">
                                      <span className={`text-sm font-semibold ${isDevolucao ? 'text-emerald-700' : 'text-slate-700'}`}>{item.nome}</span>
                                      <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${isDevolucao ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                                        {isDevolucao ? `↩ ${Math.abs(item.quantidade)} devolvido(s)` : `${item.quantidade} un.`}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-xs text-slate-400 italic">Nenhum item detalhado.</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer com resumo completo */}
            <div className="bg-slate-50/80 border-t border-slate-100 p-4 md:p-6 rounded-b-2xl">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                <TrendingUp size={11} /> Resumo do Período
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">

                {/* Resumo por tipo */}
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Por Tipo de Operação</p>
                  <div className="flex flex-wrap gap-4">
                    {['venda', 'troca', 'reserva', 'doacao'].map(tipo => {
                      const val = totalPorTipo(tipo);
                      if (val === 0) return null;
                      return (
                        <div key={tipo} className="flex flex-col">
                          <span className={`text-[10px] uppercase font-bold tracking-widest mb-0.5 ${
                            tipo === 'venda' ? 'text-blue-500' :
                            tipo === 'troca' ? 'text-purple-500' :
                            tipo === 'doacao' ? 'text-amber-500' : 'text-orange-500'
                          }`}>{labelTipo(tipo)}</span>
                          <span className="font-black text-slate-800 text-lg">R$ {val.toFixed(2)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Resumo por forma de pagamento */}
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Por Forma de Pagamento</p>
                  <div className="flex flex-wrap gap-4">
                    {FORMAS_PAGAMENTO.map(fp => {
                      const val = totalPorPagamento(fp.id);
                      if (val === 0) return null;
                      const Icon = fp.icon;
                      return (
                        <div key={fp.id} className="flex items-center gap-2">
                          <div className={`w-7 h-7 ${fp.light} rounded-lg flex items-center justify-center flex-shrink-0`}>
                            <Icon size={13} className={fp.text} />
                          </div>
                          <div>
                            <div className="text-[10px] font-bold text-slate-400">{fp.label}</div>
                            <div className="font-black text-slate-800 text-base">R$ {val.toFixed(2)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Total geral */}
                <div className="flex flex-col sm:border-l sm:border-slate-200 sm:pl-5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest flex items-center gap-1.5">
                    <TrendingUp size={12} /> Total Líquido
                  </span>
                  <span className="font-black text-3xl text-emerald-600 mt-1">R$ {totalGeral.toFixed(2)}</span>
                  <span className="text-xs text-slate-400 mt-0.5">{historicoFiltrado.filter(h => h.status !== 'cancelada').length} transações</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
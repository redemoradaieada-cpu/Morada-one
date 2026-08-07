import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Swal from 'sweetalert2';
import { 
  Landmark, Plus, Trash2, Calendar, DollarSign, 
  TrendingUp, TrendingDown, CheckCircle, Search, 
  AlertCircle, ShieldCheck, CreditCard, Banknote, 
  Smartphone, ArrowRightLeft, FileText, Layers, X
} from 'lucide-react';
import { useEventContext } from './contexts/EventContext';

export function LancamentosFinanceirosView({ userId }) {
  const [activeTab, setActiveTab] = useState('fluxo'); // fluxo | acertos
  const [loading, setLoading] = useState(true);
  
  // ==========================================
  // ESTADOS - ABA FLUXO DE CAIXA (MANUAL)
  // ==========================================
  const [lancamentos, setLancamentos] = useState([]);
  const [modalFluxoAberto, setModalFluxoAberto] = useState(false);
  const [salvandoFluxo, setSalvandoFluxo] = useState(false);
  const [formDataFluxo, setFormDataFluxo] = useState({
    tipo: 'entrada',
    categoria: 'Oferta',
    valor: '',
    data_lancamento: new Date().toISOString().split('T')[0],
    descricao: ''
  });

  const [filtroMesFluxo, setFiltroMesFluxo] = useState(new Date().toISOString().slice(0,7));

  // ==========================================
  // ESTADOS - ABA ACERTOS DE CAIXA
  // ==========================================
  const [vendasPendentes, setVendasPendentes] = useState([]);
  const [parcelasPendentes, setParcelasPendentes] = useState([]);
  const [transferindo, setTransferindo] = useState(false);
  const { eventos, eventoSelecionado } = useEventContext();
  const isGlobalUser = eventos && eventos.length > 1;
  const [filtroEvento, setFiltroEvento] = useState('todos');

  useEffect(() => {
    if (!eventoSelecionado) return;
    if (activeTab === 'fluxo') {
      fetchLancamentos();
    } else {
      fetchAcertosPendentes();
    }
  }, [activeTab, filtroMesFluxo, eventoSelecionado, filtroEvento]);

  // ==========================================
  // FUNÇÕES - FLUXO DE CAIXA
  // ==========================================
  async function fetchLancamentos() {
    setLoading(true);
    const [ano, mes] = filtroMesFluxo.split('-');
    
    // Pegar o primeiro e último dia do mês
    const startData = `${filtroMesFluxo}-01`;
    const endData = new Date(ano, mes, 0).toISOString().split('T')[0];

    let query = supabase
      .from('lancamentos_financeiros')
      .select('*')
      .gte('data_lancamento', startData)
      .lte('data_lancamento', endData)
      .order('data_lancamento', { ascending: false })
      .order('created_at', { ascending: false });

    if (isGlobalUser && filtroEvento === 'todos') {
      const ids = eventos.map(e => e.id);
      query = query.in('evento_id', ids);
    } else {
      const eventoId = filtroEvento !== 'todos' ? filtroEvento : eventoSelecionado?.id;
      query = query.eq('evento_id', eventoId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Erro ao buscar lançamentos:", error);
    } else if (data) {
      setLancamentos(data);
    }
    setLoading(false);
  }

  const parseMoeda = (valorFormatado) => {
    return Number(valorFormatado.replace(/\./g, '').replace(',', '.'));
  };

  const handleSalvarFluxo = async (e) => {
    e.preventDefault();
    setSalvandoFluxo(true);
    
    const valNumerico = parseMoeda(formDataFluxo.valor);
    if (!valNumerico || valNumerico <= 0) {
      Swal.fire("Erro", "Valor inválido.", "error");
      setSalvandoFluxo(false);
      return;
    }

    try {
      const payload = {
        tipo: formDataFluxo.tipo,
        categoria: formDataFluxo.categoria,
        valor: valNumerico,
        data_lancamento: formDataFluxo.data_lancamento,
        descricao: formDataFluxo.descricao,
        usuario_id: userId,
        evento_id: filtroEvento !== 'todos' ? filtroEvento : eventoSelecionado.id
      };

      const { error } = await supabase.from('lancamentos_financeiros').insert([payload]);
      
      if (error) throw error;

      Swal.fire({
        icon: 'success',
        title: 'Sucesso!',
        text: 'Lançamento registrado com sucesso.',
        timer: 1500,
        showConfirmButton: false
      });
      setModalFluxoAberto(false);
      setFormDataFluxo({
        tipo: 'entrada', categoria: 'Oferta', valor: '', 
        data_lancamento: new Date().toISOString().split('T')[0], descricao: ''
      });
      fetchLancamentos();
    } catch (error) {
      Swal.fire("Erro", "Erro ao salvar lançamento: " + error.message, "error");
    } finally {
      setSalvandoFluxo(false);
    }
  };

  const handleDeleteFluxo = async (id) => {
    const res = await Swal.fire({
      title: 'Deseja excluir?',
      text: "Isso afetará o saldo final do caixa.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, excluir',
      cancelButtonText: 'Cancelar'
    });

    if (res.isConfirmed) {
      const { error } = await supabase.from('lancamentos_financeiros').delete().eq('id', id);
      if (error) {
        Swal.fire("Erro", "Erro ao excluir: " + error.message, "error");
      } else {
        fetchLancamentos();
      }
    }
  };

  // ==========================================
  // FUNÇÕES - ACERTO DE CAIXA
  // ==========================================
  async function fetchAcertosPendentes() {
    setLoading(true);
    
    let vQuery = supabase
      .from('vendas')
      .select('id, valor_total, forma_pagamento, status, itens_venda(produtos(grupos(nome)))')
      .is('acerto_id', null)
      .neq('status', 'cancelada');

    let iQuery = supabase
      .from('inscricao_parcelas')
      .select('id, valor, descricao, inscricao_id, inscricoes_hospedagem(forma_pagamento)')
      .eq('status', 'pago')
      .is('acerto_id', null);

    if (isGlobalUser && filtroEvento === 'todos') {
      const ids = eventos.map(e => e.id);
      vQuery = vQuery.in('evento_id', ids);
      iQuery = iQuery.in('evento_id', ids);
    } else {
      const eventoId = filtroEvento !== 'todos' ? filtroEvento : eventoSelecionado?.id;
      vQuery = vQuery.eq('evento_id', eventoId);
      iQuery = iQuery.eq('evento_id', eventoId);
    }

    // Buscar vendas de PDV sem acerto_id
    const { data: vData, error: vErr } = await vQuery;

    if (!vErr && vData) {
      setVendasPendentes(vData);
    }

    // Buscar Parcelas de Inscrições sem acerto_id que estão pagas
    const { data: iData, error: iErr } = await iQuery;

    if (!iErr && iData) {
      setParcelasPendentes(iData);
    }

    setLoading(false);
  }

  // Consolidação dos caixas pendentes
  const consolidarCaixas = () => {
    const caixas = {
      'PRAÇA ALIMENTAÇÃO': { ids_vendas: [], ids_parcelas: [], dinheiro: 0, pix: 0, credito: 0, debito: 0 },
      'CAMISETAS': { ids_vendas: [], ids_parcelas: [], dinheiro: 0, pix: 0, credito: 0, debito: 0 },
      'SECRETARIA': { ids_vendas: [], ids_parcelas: [], dinheiro: 0, pix: 0, credito: 0, debito: 0 }
    };

    // Vendas do PDV
    vendasPendentes.forEach(venda => {
      // Descobrir o grupo predominante da venda
      let grupoVenda = 'OUTROS';
      if (venda.itens_venda && venda.itens_venda.length > 0) {
        const firstGroup = venda.itens_venda[0]?.produtos?.grupos?.nome?.toUpperCase();
        if (firstGroup && firstGroup.includes('PRAÇA')) grupoVenda = 'PRAÇA ALIMENTAÇÃO';
        else if (firstGroup && firstGroup.includes('CAMISETA')) grupoVenda = 'CAMISETAS';
      }

      if (!caixas[grupoVenda]) {
        caixas[grupoVenda] = { ids_vendas: [], ids_parcelas: [], dinheiro: 0, pix: 0, credito: 0, debito: 0 };
      }

      caixas[grupoVenda].ids_vendas.push(venda.id);

      // Distribuir as formas de pagamento
      const strPag = (venda.forma_pagamento || '').toLowerCase();
      // O formato em PDV pode ser "dinheiro" ou "dinheiro:100|pix:50"
      if (strPag.includes(':')) {
        strPag.split('|').forEach(parte => {
          const [f, v] = parte.split(':');
          const valNum = Number(v) || 0;
          if (f.includes('dinheiro')) caixas[grupoVenda].dinheiro += valNum;
          else if (f.includes('pix')) caixas[grupoVenda].pix += valNum;
          else if (f.includes('credit') || f.includes('crédit')) caixas[grupoVenda].credito += valNum;
          else if (f.includes('debit') || f.includes('débit')) caixas[grupoVenda].debito += valNum;
        });
      } else {
        const valTot = Number(venda.valor_total) || 0;
        if (strPag.includes('dinheiro')) caixas[grupoVenda].dinheiro += valTot;
        else if (strPag.includes('pix')) caixas[grupoVenda].pix += valTot;
        else if (strPag.includes('credit') || strPag.includes('crédit')) caixas[grupoVenda].credito += valTot;
        else if (strPag.includes('debit') || strPag.includes('débit')) caixas[grupoVenda].debito += valTot;
      }
    });

    // Parcelas de Inscrições (Sempre vão para Secretaria)
    parcelasPendentes.forEach(parcela => {
      caixas['SECRETARIA'].ids_parcelas.push(parcela.id);
      const val = Number(parcela.valor) || 0;
      
      // Tentar descobrir a forma de pagamento pela descrição da parcela (ex: "À Vista - PIX" ou "Parcela 1/2 (Pix Parcelado (mensal))")
      // ou fazendo fallback para a forma de pagamento geral da inscrição
      const descr = (parcela.descricao || '').toLowerCase();
      const fpGeral = (parcela.inscricoes_hospedagem?.forma_pagamento || '').toLowerCase();
      
      if (descr.includes('dinheiro') || fpGeral.includes('dinheiro')) caixas['SECRETARIA'].dinheiro += val;
      else if (descr.includes('pix') || fpGeral.includes('pix')) caixas['SECRETARIA'].pix += val;
      else if (descr.includes('credit') || descr.includes('crédit') || fpGeral.includes('credit') || fpGeral.includes('crédit')) caixas['SECRETARIA'].credito += val;
      else if (descr.includes('debit') || descr.includes('débit') || fpGeral.includes('debit') || fpGeral.includes('débit')) caixas['SECRETARIA'].debito += val;
      else caixas['SECRETARIA'].pix += val; // Default se vazio ou não reconhecido
    });

    return Object.entries(caixas).map(([nome, dados]) => ({ nome, ...dados })).filter(c => 
      c.dinheiro > 0 || c.pix > 0 || c.credito > 0 || c.debito > 0
    );
  };

  const handleTransferirCaixa = async (caixa) => {
    const totalGuiche = caixa.dinheiro + caixa.pix + caixa.credito + caixa.debito;
    const descText = `Valores Esperados:\nPIX: R$ ${caixa.pix.toFixed(2)}\nDinheiro: R$ ${caixa.dinheiro.toFixed(2)}\nCrédito: R$ ${caixa.credito.toFixed(2)}\nDébito: R$ ${caixa.debito.toFixed(2)}`;

    const res = await Swal.fire({
      title: `Transferir Caixa: ${caixa.nome}`,
      html: `
        <div class="text-left text-sm mt-4 p-4 bg-slate-50 rounded-xl">
          <p class="font-bold text-slate-700 mb-2">Resumo em Tempo Real:</p>
          <pre class="font-mono text-xs text-slate-600">${descText}</pre>
          <p class="font-black text-red-600 mt-3 text-lg">Total a transferir: R$ ${totalGuiche.toFixed(2)}</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Confirmar e Efetivar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#10b981'
    });

    if (res.isConfirmed) {
      setTransferindo(true);
      try {
        // 1. Criar Acerto de Caixa
        const { data: acerto, error: acertoErr } = await supabase.from('acertos_caixa').insert([{
          setor: caixa.nome,
          valor_dinheiro: caixa.dinheiro,
          valor_pix: caixa.pix,
          valor_credito: caixa.credito,
          valor_debito: caixa.debito,
          total_transferido: totalGuiche,
          responsavel_id: userId,
          evento_id: eventoSelecionado.id
        }]).select().single();

        if (acertoErr) throw acertoErr;

        // 2. Atualizar vendas
        if (caixa.ids_vendas.length > 0) {
          const { error: vErr } = await supabase
            .from('vendas')
            .update({ acerto_id: acerto.id })
            .in('id', caixa.ids_vendas);
          if (vErr) throw vErr;
        }

        // 3. Atualizar parcelas das inscrições
        if (caixa.ids_parcelas.length > 0) {
          const { error: iErr } = await supabase
            .from('inscricao_parcelas')
            .update({ acerto_id: acerto.id })
            .in('id', caixa.ids_parcelas);
          if (iErr) throw iErr;
        }

        // 4. Lançar no Caixa Principal (Entradas e Saídas)
        const { error: lErr } = await supabase.from('lancamentos_financeiros').insert([{
          tipo: 'entrada',
          categoria: `Fechamento ${caixa.nome}`,
          descricao: `Acerto automático ID: ${acerto.id}`,
          valor: totalGuiche,
          data_lancamento: new Date().toISOString().split('T')[0],
          usuario_id: userId,
          evento_id: filtroEvento !== 'todos' ? filtroEvento : eventoSelecionado.id
        }]);

        if (lErr) throw lErr;

        Swal.fire('Transferido!', 'O saldo do guichê foi transferido para o seu Caixa Principal.', 'success');
        fetchAcertosPendentes();
      } catch (error) {
        Swal.fire('Erro', 'Ocorreu um erro no acerto: ' + error.message, 'error');
      } finally {
        setTransferindo(false);
      }
    }
  };


  // ==========================================
  // HELPERS DE RENDERIZAÇÃO
  // ==========================================
  const formatarMoeda = (valor) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);

  const entradasFluxo = lancamentos.filter(l => l.tipo === 'entrada').reduce((acc, curr) => acc + Number(curr.valor), 0);
  const saidasFluxo = lancamentos.filter(l => l.tipo === 'saida').reduce((acc, curr) => acc + Number(curr.valor), 0);
  const saldoFluxo = entradasFluxo - saidasFluxo;

  const caixasDisponiveis = consolidarCaixas();

  return (
    <div className="space-y-6">
      
      {/* ── HEADER & TABS ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-2">
            <Landmark className="text-red-600" size={32} /> Central Financeira
          </h2>
          <p className="text-slate-500 text-sm mt-1 mb-3">Gerencie Entradas, Saídas e Acertos de Guichês</p>
          {isGlobalUser && (
            <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Evento:</span>
              <select 
                className="bg-transparent font-bold text-sm text-slate-700 outline-none cursor-pointer"
                value={filtroEvento}
                onChange={(e) => setFiltroEvento(e.target.value)}
              >
                <option value="todos">Todos os Eventos</option>
                {eventos.map(ev => (
                  <option key={ev.id} value={ev.id}>{ev.nome}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex bg-slate-200/50 p-1 rounded-xl shadow-inner w-full md:w-auto">
          <button 
            onClick={() => setActiveTab('fluxo')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'fluxo' ? 'bg-white text-slate-800 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <ArrowRightLeft size={16} /> Caixa Principal
          </button>
          <button 
            onClick={() => setActiveTab('acertos')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'acertos' ? 'bg-white text-slate-800 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <ShieldCheck size={16} /> Acerto de Guichês
            {caixasDisponiveis.length > 0 && (
              <span className="bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded-full ml-1 animate-pulse">
                {caixasDisponiveis.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── ABA 1: CAIXA PRINCIPAL (FLUXO) ── */}
      {activeTab === 'fluxo' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center"><TrendingUp size={24} /></div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Entradas</p>
                <p className="text-2xl font-black text-slate-800">{formatarMoeda(entradasFluxo)}</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex items-center gap-4">
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center"><TrendingDown size={24} /></div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Saídas</p>
                <p className="text-2xl font-black text-slate-800">{formatarMoeda(saidasFluxo)}</p>
              </div>
            </div>
            <div className={`rounded-2xl p-5 shadow-sm border flex items-center gap-4 ${saldoFluxo >= 0 ? 'bg-slate-900 border-slate-800' : 'bg-red-600 border-red-700'}`}>
              <div className="w-12 h-12 bg-white/10 text-white rounded-full flex items-center justify-center"><DollarSign size={24} /></div>
              <div>
                <p className="text-xs font-bold text-white/50 uppercase tracking-wider">Saldo Líquido</p>
                <p className="text-2xl font-black text-white">{formatarMoeda(saldoFluxo)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-slate-400" />
                <input 
                  type="month" 
                  value={filtroMesFluxo}
                  onChange={(e) => setFiltroMesFluxo(e.target.value)}
                  className="bg-transparent font-bold text-sm text-slate-700 outline-none cursor-pointer"
                />
              </div>
              <button 
                onClick={() => setModalFluxoAberto(true)}
                className="w-full sm:w-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-600/20"
              >
                <Plus size={16} /> Novo Lançamento
              </button>
            </div>

            {loading ? (
              <div className="p-12 flex justify-center"><div className="w-8 h-8 border-4 border-slate-200 border-t-red-600 rounded-full animate-spin"></div></div>
            ) : lancamentos.length === 0 ? (
              <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
                <FileText size={40} className="opacity-20" />
                <p>Nenhum lançamento encontrado neste mês.</p>
              </div>
            ) : (
              <>
                {/* Celular: Feed de Cards */}
                <div className="block sm:hidden divide-y divide-slate-100">
                  {lancamentos.map(lanc => (
                    <div key={lanc.id} className="p-4 hover:bg-slate-50/50 transition-colors flex justify-between items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${lanc.tipo === 'entrada' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                            {lanc.categoria}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {lanc.data_lancamento.split('-').reverse().join('/')}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-700 truncate">{lanc.descricao || '-'}</p>
                        {lanc.descricao && (
                          <div className="text-[9px] text-slate-400 mt-0.5">Automático / Sistema</div>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className={`text-sm font-black whitespace-nowrap ${lanc.tipo === 'entrada' ? 'text-emerald-600' : 'text-red-600'}`}>
                          {lanc.tipo === 'entrada' ? '+ ' : '- '}{formatarMoeda(lanc.valor)}
                        </span>
                        <button onClick={() => handleDeleteFluxo(lanc.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tablet/Desktop: Tabela Tradicional */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-medium">
                      <tr>
                        <th className="py-3 px-4">Data</th>
                        <th className="py-3 px-4">Categoria</th>
                        <th className="py-3 px-4">Descrição</th>
                        <th className="py-3 px-4 text-right">Valor</th>
                        <th className="py-3 px-4 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {lancamentos.map(lanc => (
                        <tr key={lanc.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                            {lanc.data_lancamento.split('-').reverse().join('/')}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider ${lanc.tipo === 'entrada' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                              {lanc.categoria}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600 max-w-[200px] truncate" title={lanc.descricao}>
                            {lanc.descricao || '-'}
                            <div className="text-[10px] text-slate-400 mt-0.5">Automático / Sistema</div>
                          </td>
                          <td className={`py-3 px-4 text-right font-bold whitespace-nowrap ${lanc.tipo === 'entrada' ? 'text-emerald-600' : 'text-red-600'}`}>
                            {lanc.tipo === 'entrada' ? '+ ' : '- '}{formatarMoeda(lanc.valor)}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex justify-center">
                              <button onClick={() => handleDeleteFluxo(lanc.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── ABA 2: ACERTOS DE CAIXA ── */}
      {activeTab === 'acertos' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 flex items-start gap-4">
            <ShieldCheck className="text-indigo-600 shrink-0" size={24} />
            <div>
              <h3 className="font-bold text-indigo-900">Transferência Oficial para Tesouraria</h3>
              <p className="text-sm text-indigo-700 mt-1">
                Os painéis abaixo refletem os valores arrecadados pelos guichês em tempo real. Receba os malotes, confira os valores em dinheiro físico e canhotos de maquininha, e efetive a transferência para o Caixa Principal.
              </p>
            </div>
          </div>

          {loading ? (
             <div className="p-12 flex justify-center"><div className="w-8 h-8 border-4 border-slate-200 border-t-red-600 rounded-full animate-spin"></div></div>
          ) : caixasDisponiveis.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 flex flex-col items-center justify-center gap-3 text-slate-400">
              <CheckCircle size={48} className="text-emerald-400 mb-2" />
              <p className="text-lg font-bold text-slate-600">Tudo limpo!</p>
              <p className="text-sm">Nenhum guichê possui valores pendentes de acerto no momento.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {caixasDisponiveis.map(caixa => {
                const total = caixa.dinheiro + caixa.pix + caixa.credito + caixa.debito;
                return (
                  <div key={caixa.nome} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                    <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Layers size={18} className="text-red-500" />
                        <h3 className="font-bold text-sm uppercase tracking-wider">{caixa.nome}</h3>
                      </div>
                    </div>
                    
                    <div className="p-5 flex-1 space-y-4">
                      {/* Metodos */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 text-slate-500"><Banknote size={16} className="text-emerald-500"/> Dinheiro Fisíco</span>
                          <span className="font-bold text-slate-800">{formatarMoeda(caixa.dinheiro)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 text-slate-500"><Smartphone size={16} className="text-violet-500"/> PIX</span>
                          <span className="font-bold text-slate-800">{formatarMoeda(caixa.pix)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 text-slate-500"><CreditCard size={16} className="text-amber-500"/> Crédito</span>
                          <span className="font-bold text-slate-800">{formatarMoeda(caixa.credito)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 text-slate-500"><CreditCard size={16} className="text-blue-500"/> Débito</span>
                          <span className="font-bold text-slate-800">{formatarMoeda(caixa.debito)}</span>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-100 flex items-end justify-between">
                        <span className="text-xs font-bold text-slate-400 uppercase">Soma do Guichê</span>
                        <span className="text-xl font-black text-slate-800">{formatarMoeda(total)}</span>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 border-t border-slate-100">
                      <button 
                        onClick={() => handleTransferirCaixa(caixa)}
                        disabled={transferindo}
                        className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-emerald-500/30 flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        <ShieldCheck size={18} /> Validar e Transferir Saldo
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── MODAL NOVO LANÇAMENTO (FLUXO) ── */}
      {modalFluxoAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800">Registrar Lançamento</h3>
              <button onClick={() => setModalFluxoAberto(false)} className="text-slate-400 hover:text-slate-600 bg-white rounded-lg p-1.5 shadow-sm">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSalvarFluxo} className="p-6 space-y-5">
              
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setFormDataFluxo({...formDataFluxo, tipo: 'entrada'})}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${formDataFluxo.tipo === 'entrada' ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-500/20' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                  <TrendingUp size={20} className={formDataFluxo.tipo === 'entrada' ? 'text-emerald-500' : ''} />
                  <span className="text-xs font-bold uppercase tracking-wider">Entrada</span>
                </button>
                <button type="button" onClick={() => setFormDataFluxo({...formDataFluxo, tipo: 'saida'})}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${formDataFluxo.tipo === 'saida' ? 'bg-red-50 border-red-500 text-red-700 ring-2 ring-red-500/20' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                  <TrendingDown size={20} className={formDataFluxo.tipo === 'saida' ? 'text-red-500' : ''} />
                  <span className="text-xs font-bold uppercase tracking-wider">Saída</span>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Categoria</label>
                  <select 
                    value={formDataFluxo.categoria}
                    onChange={e => setFormDataFluxo({...formDataFluxo, categoria: e.target.value})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600"
                  >
                    {formDataFluxo.tipo === 'entrada' ? (
                      <>
                        <option value="Oferta">Oferta</option>
                        <option value="Dízimo">Dízimo</option>
                        <option value="Doação">Doação</option>
                        <option value="Outras Entradas">Outras Entradas</option>
                      </>
                    ) : (
                      <>
                        <option value="Fornecedores">Fornecedores</option>
                        <option value="Contas Fixas">Contas Fixas</option>
                        <option value="Manutenção">Manutenção</option>
                        <option value="Falta de Caixa">Falta de Caixa / Quebra</option>
                        <option value="Outras Saídas">Outras Saídas</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Valor (R$)</label>
                    <input 
                      type="text" 
                      placeholder="0,00"
                      value={formDataFluxo.valor}
                      onChange={e => {
                        let val = e.target.value.replace(/\D/g, '');
                        val = (Number(val) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                        if(val !== '0,00') setFormDataFluxo({...formDataFluxo, valor: val});
                        else setFormDataFluxo({...formDataFluxo, valor: ''});
                      }}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Data</label>
                    <input 
                      type="date" 
                      value={formDataFluxo.data_lancamento}
                      onChange={e => setFormDataFluxo({...formDataFluxo, data_lancamento: e.target.value})}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Descrição/Histórico</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Pagamento referente a..."
                    value={formDataFluxo.descricao}
                    onChange={e => setFormDataFluxo({...formDataFluxo, descricao: e.target.value})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button type="submit" disabled={salvandoFluxo} className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-red-600/30 disabled:opacity-70 flex justify-center">
                  {salvandoFluxo ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Registrar Lançamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

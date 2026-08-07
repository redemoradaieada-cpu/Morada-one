import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { 
  Landmark, Search, Calendar, CheckCircle2, Clock, 
  AlertCircle, DollarSign, RefreshCw, Eye
} from 'lucide-react';
import Swal from 'sweetalert2';
import { useEventContext } from './contexts/EventContext';

export function ContasReceberView() {
  const [parcelas, setParcelas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos'); // 'todos' | 'aberto' | 'pago' | 'vencido'
  const [baixando, setBaixando] = useState(false);
  const { eventos, eventoSelecionado } = useEventContext();
  const isGlobalUser = eventos && eventos.length > 1;
  const [filtroEvento, setFiltroEvento] = useState('todos');

  useEffect(() => {
    if (!eventoSelecionado) return;
    fetchContas();

    const channel = supabase
      .channel('public:inscricao_parcelas_financeiro')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inscricao_parcelas' }, () => {
        fetchContas();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventoSelecionado, filtroEvento]);

  const fetchContas = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('inscricao_parcelas')
        .select('*, inscricoes_hospedagem(nome_completo, cpf, telefone)')
        .order('data_vencimento', { ascending: true });

      if (isGlobalUser && filtroEvento === 'todos') {
        const ids = eventos.map(e => e.id);
        query = query.in('evento_id', ids);
      } else {
        const eventoId = filtroEvento !== 'todos' ? filtroEvento : eventoSelecionado?.id;
        query = query.eq('evento_id', eventoId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setParcelas(data || []);
    } catch (err) {
      console.error('Erro ao buscar contas a receber:', err);
      Swal.fire('Erro', 'Não foi possível carregar as contas: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const darBaixa = async (parcelaId, novoStatus = 'pago') => {
    const confirmacao = await Swal.fire({
      title: novoStatus === 'pago' ? 'Confirmar Recebimento?' : 'Reverter Baixa?',
      text: novoStatus === 'pago' 
        ? "Você está confirmando que esta parcela foi paga?" 
        : "Tem certeza que deseja reverter o status desta parcela para pendente?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: novoStatus === 'pago' ? '#10b981' : '#f43f5e',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Sim, confirmar',
      cancelButtonText: 'Cancelar'
    });

    if (!confirmacao.isConfirmed) return;

    setBaixando(true);
    const dataPagto = novoStatus === 'pago' ? new Date().toISOString() : null;

    try {
      const { error } = await supabase
        .from('inscricao_parcelas')
        .update({
          status: novoStatus,
          data_pagamento: dataPagto
        })
        .eq('id', parcelaId);

      if (error) throw error;

      Swal.fire({
        title: 'Sucesso!',
        text: novoStatus === 'pago' ? 'Pagamento registrado!' : 'Baixa de pagamento desfeita!',
        icon: 'success',
        timer: 1200,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
      fetchContas();
    } catch (err) {
      console.error(err);
      Swal.fire('Erro', 'Erro ao processar baixa: ' + err.message, 'error');
    } finally {
      setBaixando(false);
    }
  };

  const formatarMoeda = (val) => {
    return parseFloat(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const isOverdue = (vencimento, status) => {
    if (status === 'pago') return false;
    const hoje = new Date().toISOString().split('T')[0];
    return vencimento < hoje;
  };

  // Filtragem local
  const filteredParcelas = parcelas.filter(p => {
    const nomeInscrito = p.inscricoes_hospedagem?.nome_completo || '';
    const cpfInscrito = p.inscricoes_hospedagem?.cpf || '';
    const matchesSearch = nomeInscrito.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          cpfInscrito.includes(searchTerm);

    const vencida = isOverdue(p.data_vencimento, p.status);
    let matchesStatus = true;
    if (statusFilter === 'aberto') {
      matchesStatus = p.status === 'aberto' && !vencida;
    } else if (statusFilter === 'pago') {
      matchesStatus = p.status === 'pago';
    } else if (statusFilter === 'vencido') {
      matchesStatus = vencida;
    }

    return matchesSearch && matchesStatus;
  });

  // Métricas financeiras
  const totalGeral = parcelas.reduce((acc, curr) => acc + parseFloat(curr.valor), 0);
  const totalRecebido = parcelas.filter(p => p.status === 'pago').reduce((acc, curr) => acc + parseFloat(curr.valor), 0);
  const totalPendente = parcelas.filter(p => p.status === 'aberto' && !isOverdue(p.data_vencimento, p.status)).reduce((acc, curr) => acc + parseFloat(curr.valor), 0);
  const totalVencido = parcelas.filter(p => isOverdue(p.data_vencimento, p.status)).reduce((acc, curr) => acc + parseFloat(curr.valor), 0);

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Landmark className="text-red-600" /> Contas a Receber (Secretaria)
          </h2>
          <p className="text-slate-500 text-sm mb-3">Controle de recebimentos e baixa de parcelas de inscrições</p>
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

        <button 
          onClick={fetchContas}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 font-semibold text-xs text-slate-600 shadow-sm transition-all"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Recarregar Dados
        </button>
      </div>

      {/* Cartões de Indicadores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">Total Lançado</span>
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                <DollarSign size={16} />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-800">{formatarMoeda(totalGeral)}</div>
          </div>
          <span className="text-[10px] text-slate-400 mt-3 font-medium">Soma de todas as inscrições</span>
        </div>

        <div className="bg-emerald-50/50 p-5 rounded-2xl shadow-sm border border-emerald-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-emerald-700 text-xs font-bold uppercase tracking-widest">Total Recebido</span>
              <div className="w-8 h-8 rounded-full bg-emerald-100/50 flex items-center justify-center text-emerald-600">
                <CheckCircle2 size={16} />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-700">{formatarMoeda(totalRecebido)}</div>
          </div>
          <span className="text-[10px] text-emerald-600/70 mt-3 font-semibold">
            {totalGeral > 0 ? ((totalRecebido / totalGeral) * 100).toFixed(1) : 0}% quitado
          </span>
        </div>

        <div className="bg-amber-50/30 p-5 rounded-2xl shadow-sm border border-amber-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-amber-700 text-xs font-bold uppercase tracking-widest">A Receber (No Prazo)</span>
              <div className="w-8 h-8 rounded-full bg-amber-100/50 flex items-center justify-center text-amber-600">
                <Clock size={16} />
              </div>
            </div>
            <div className="text-2xl font-black text-amber-700">{formatarMoeda(totalPendente)}</div>
          </div>
          <span className="text-[10px] text-amber-600/70 mt-3 font-semibold">Aguardando vencimento</span>
        </div>

        <div className="bg-rose-50/50 p-5 rounded-2xl shadow-sm border border-rose-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-rose-700 text-xs font-bold uppercase tracking-widest">Total Vencido</span>
              <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                <AlertCircle size={16} />
              </div>
            </div>
            <div className="text-2xl font-black text-rose-700">{formatarMoeda(totalVencido)}</div>
          </div>
          <span className="text-[10px] text-rose-600/70 mt-3 font-semibold">Exige cobrança/baixa</span>
        </div>
      </div>

      {/* Painel de Filtros */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex-1 min-w-[260px] relative">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Pesquisar por campista ou CPF..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-red-500 transition-all text-sm"
          />
        </div>

        <div className="flex gap-2">
          {['todos', 'aberto', 'pago', 'vencido'].map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${
                statusFilter === filter
                  ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                  : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
            >
              {filter === 'todos' && 'Todas'}
              {filter === 'aberto' && 'No Prazo'}
              {filter === 'pago' && 'Pagas'}
              {filter === 'vencido' && 'Vencidas'}
            </button>
          ))}
        </div>
      </div>

      {/* Listagem de Contas */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-red-600 rounded-full animate-spin" />
            <span>Processando lançamentos...</span>
          </div>
        ) : filteredParcelas.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            Nenhuma parcela encontrada para os filtros selecionados.
          </div>
        ) : (
          <>
            {/* Tabela Desktop */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-600 font-semibold">
                  <tr>
                    <th className="p-4">Cód. Parcela</th>
                    <th className="p-4">Inscrito / Campista</th>
                    <th className="p-4">Descrição</th>
                    <th className="p-4">Valor</th>
                    <th className="p-4">Vencimento</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredParcelas.map((p) => {
                    const vencida = isOverdue(p.data_vencimento, p.status);
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 font-mono text-xs text-slate-500 font-bold">#{String(p.codigo).padStart(5, '0')}</td>
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-900">{p.inscricoes_hospedagem?.nome_completo}</span>
                            <span className="text-[10px] text-slate-400 font-medium">CPF: {p.inscricoes_hospedagem?.cpf || 'Não cadastrado'}</span>
                          </div>
                        </td>
                        <td className="p-4 text-slate-600 font-medium">{p.descricao}</td>
                        <td className="p-4 font-black text-slate-900 font-mono">{formatarMoeda(p.valor)}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-1.5 font-medium">
                            <Calendar size={14} className={vencida ? 'text-rose-500' : 'text-slate-400'} />
                            <span className={vencida ? 'text-rose-600 font-bold' : 'text-slate-600'}>
                              {new Date(p.data_vencimento + 'T12:00:00').toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          {p.status === 'pago' && p.data_pagamento && (
                            <div className="text-[10px] text-emerald-600 font-bold mt-1">
                              Baixa: {new Date(p.data_pagamento).toLocaleDateString('pt-BR')}
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                            p.status === 'pago' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                            vencida ? 'bg-rose-100 text-rose-700 border border-rose-200 animate-pulse' :
                            'bg-amber-100 text-amber-700 border border-amber-200'
                          }`}>
                            {p.status === 'pago' ? 'Pago' : vencida ? 'Vencido' : 'Pendente'}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            disabled={baixando}
                            onClick={() => darBaixa(p.id, p.status === 'pago' ? 'aberto' : 'pago')}
                            className={`px-4 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-sm flex items-center gap-1 mx-auto ${
                              p.status === 'pago'
                                ? 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100'
                                : 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100'
                            }`}
                          >
                            <DollarSign size={13} />
                            {p.status === 'pago' ? 'Reverter Baixa' : 'Dar Baixa'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Listagem Mobile */}
            <div className="block sm:hidden divide-y divide-slate-100">
              {filteredParcelas.map((p) => {
                const vencida = isOverdue(p.data_vencimento, p.status);
                return (
                  <div key={p.id} className="p-4 space-y-3 bg-white">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-mono text-[10px] text-slate-400 font-bold">#{String(p.codigo).padStart(5, '0')}</span>
                        <h4 className="font-bold text-slate-800 text-sm leading-tight">{p.inscricoes_hospedagem?.nome_completo}</h4>
                        <p className="text-[10px] text-slate-500 font-medium mt-0.5">{p.descricao}</p>
                      </div>
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        p.status === 'pago' ? 'bg-emerald-100 text-emerald-700' :
                        vencida ? 'bg-rose-100 text-rose-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {p.status === 'pago' ? 'Pago' : vencida ? 'Vencido' : 'Pendente'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div>
                        <div className="text-[10px] text-slate-400 font-medium">Vencimento</div>
                        <div className={`text-xs font-bold flex items-center gap-1 ${vencida ? 'text-rose-600' : 'text-slate-700'}`}>
                          <Calendar size={12} /> {new Date(p.data_vencimento + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </div>
                        {p.status === 'pago' && p.data_pagamento && (
                           <div className="text-[9px] text-emerald-600 font-bold mt-0.5">
                             Baixa: {new Date(p.data_pagamento).toLocaleDateString('pt-BR')}
                           </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400 font-medium">Valor</div>
                        <div className="text-sm font-black text-slate-800 font-mono">{formatarMoeda(p.valor)}</div>
                      </div>
                    </div>

                    <button
                      disabled={baixando}
                      onClick={() => darBaixa(p.id, p.status === 'pago' ? 'aberto' : 'pago')}
                      className={`w-full py-2.5 rounded-xl border text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1 ${
                        p.status === 'pago'
                          ? 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100'
                          : 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100'
                      }`}
                    >
                      <DollarSign size={13} />
                      {p.status === 'pago' ? 'Reverter Baixa de Pagamento' : 'Registrar Recebimento (Dar Baixa)'}
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

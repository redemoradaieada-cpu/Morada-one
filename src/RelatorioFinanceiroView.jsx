import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { 
  BarChart3, PieChart, TrendingUp, TrendingDown, DollarSign, 
  Calendar, ShoppingBag, Banknote, Users, Activity, Shirt, Heart, Landmark
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart as RechartsPieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import Swal from 'sweetalert2';
import { useEventContext } from './contexts/EventContext';

const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];

export function RelatorioFinanceiroView() {
  const [loading, setLoading] = useState(true);
  const [dataInicial, setDataInicial] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30); // 30 dias atrás
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  });
  const [dataFinal, setDataFinal] = useState(() => {
    const d = new Date();
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  });

  // Totais
  const [totalEntradasAvulsas, setTotalEntradasAvulsas] = useState(0);
  const [totalOfertas, setTotalOfertas] = useState(0);
  const [totalCamisetas, setTotalCamisetas] = useState(0);
  const [totalAlimentacao, setTotalAlimentacao] = useState(0);
  const [totalVendas, setTotalVendas] = useState(0);
  const [totalInscricoes, setTotalInscricoes] = useState(0);
  const [totalSaidas, setTotalSaidas] = useState(0);

  // Gráficos
  const [dadosTimeline, setDadosTimeline] = useState([]);
  const [dadosReceitas, setDadosReceitas] = useState([]);
  const [dadosSaidas, setDadosSaidas] = useState([]);
  const { eventos, eventoSelecionado } = useEventContext();
  const isGlobalUser = eventos && eventos.length > 1;
  const [filtroEvento, setFiltroEvento] = useState('todos');

  useEffect(() => {
    if (!eventoSelecionado) return;
    if (dataInicial && dataFinal && dataInicial.length === 10 && dataFinal.length === 10) {
      carregarDados();
    }
  }, [dataInicial, dataFinal, eventoSelecionado, filtroEvento]);

  async function carregarDados() {
    if (!dataInicial || !dataFinal || dataInicial.length !== 10 || dataFinal.length !== 10) {
      return;
    }
    setLoading(true);
    try {
      // 1. LANÇAMENTOS (Entradas Avulsas e Saídas)
      let qLanc = supabase
        .from('lancamentos_financeiros')
        .select('tipo, categoria, valor, data_lancamento')
        .gte('data_lancamento', dataInicial)
        .lte('data_lancamento', dataFinal);

      // 2. VENDAS (incluindo grupos de itens)
      let qVendas = supabase
        .from('vendas')
        .select(`
          created_at, 
          valor_total,
          status,
          itens_venda(
            quantidade,
            produtos(
              preco,
              grupos(nome)
            )
          )
        `)
        .gte('created_at', `${dataInicial}T00:00:00`)
        .lte('created_at', `${dataFinal}T23:59:59`)
        .neq('status', 'cancelada');

      // 3. INSCRIÇÕES (Apenas Parcelas Pagas)
      let qInsc = supabase
        .from('inscricao_parcelas')
        .select(`
          data_pagamento,
          valor
        `)
        .eq('status', 'pago')
        .gte('data_pagamento', `${dataInicial}T00:00:00`)
        .lte('data_pagamento', `${dataFinal}T23:59:59`);

      if (isGlobalUser && filtroEvento === 'todos') {
        const ids = eventos.map(e => e.id);
        qLanc = qLanc.in('evento_id', ids);
        qVendas = qVendas.in('evento_id', ids);
        qInsc = qInsc.in('evento_id', ids);
      } else {
        const eventoId = filtroEvento !== 'todos' ? filtroEvento : eventoSelecionado?.id;
        qLanc = qLanc.eq('evento_id', eventoId);
        qVendas = qVendas.eq('evento_id', eventoId);
        qInsc = qInsc.eq('evento_id', eventoId);
      }

      const { data: lancamentos, error: errLancamentos } = await qLanc;
      if (errLancamentos) throw errLancamentos;

      const { data: vendas, error: errVendas } = await qVendas;
      if (errVendas) throw errVendas;

      const { data: inscricoes, error: errInscricoes } = await qInsc;
      if (errInscricoes) throw errInscricoes;

      // --- PROCESSAMENTO DOS DADOS ---
      let sumEntradasAvulsas = 0;
      let sumOfertas = 0;
      let sumSaidas = 0;
      let sumInscricoes = 0;
      const categoriasSaidasMap = {};

      // Agrupadores diários
      const timeline = {};
      const addTimeline = (dateStr, tipo, valor) => {
        if (!timeline[dateStr]) timeline[dateStr] = { data: dateStr, 'Entradas Avulsas': 0, 'Ofertas': 0, 'Camisetas': 0, 'Praça de Alimentação': 0, 'Inscrições': 0, 'Saídas': 0 };
        timeline[dateStr][tipo] += Number(valor);
      };

      // Processar Lançamentos
      lancamentos?.forEach(lanc => {
        const val = Number(lanc.valor) || 0;
        // Não conta os fechamentos como receita nova, pois o dinheiro vem de Vendas e Inscrições (já computados)
        if (lanc.tipo === 'entrada' && !(lanc.categoria || '').startsWith('Fechamento')) {
          if (lanc.categoria === 'Oferta') {
            sumOfertas += val;
            addTimeline(lanc.data_lancamento, 'Ofertas', val);
          } else {
            sumEntradasAvulsas += val;
            addTimeline(lanc.data_lancamento, 'Entradas Avulsas', val);
          }
        } else if (lanc.tipo === 'saida') {
          sumSaidas += val;
          addTimeline(lanc.data_lancamento, 'Saídas', val);
          const cat = lanc.categoria || 'Outras Saídas';
          categoriasSaidasMap[cat] = (categoriasSaidasMap[cat] || 0) + val;
        }
      });

      // Processar Inscrições (Parcelas Pagas)
      inscricoes?.forEach(ins => {
        const val = Number(ins.valor) || 0;
        sumInscricoes += val;
        // Usa data_pagamento. Se por algum motivo for null (antigo), usa a data atual do loop (fallback raro)
        const dataStr = ins.data_pagamento ? ins.data_pagamento.split('T')[0] : dataInicial;
        addTimeline(dataStr, 'Inscrições', val);
      });

      // Processar Vendas e separar por grupos
      const gruposMap = {};
      vendas?.forEach(ven => {
        const val = Number(ven.valor_total) || 0;
        const dataStr = ven.created_at.split('T')[0];

        // Ratear valor total da venda pelos itens (usando quantidade * preco)
        let somaItensNominal = 0;
        const itensMapeados = [];

        ven.itens_venda?.forEach(item => {
          const qtd = Number(item.quantidade) || 0;
          const preco = Number(item.produtos?.preco) || 0;
          const grupoNome = (item.produtos?.grupos?.nome || 'Outros').toUpperCase();
          const subtotal = qtd * preco;
          somaItensNominal += subtotal;
          itensMapeados.push({ grupo: grupoNome, subtotal });
        });

        // Aplicar o valor rateado
        if (somaItensNominal > 0) {
          const fatorDesconto = val / somaItensNominal;
          itensMapeados.forEach(item => {
            const valorRealItem = item.subtotal * fatorDesconto;
            gruposMap[item.grupo] = (gruposMap[item.grupo] || 0) + valorRealItem;
            if (item.grupo === 'CAMISETAS') {
              addTimeline(dataStr, 'Camisetas', valorRealItem);
            } else {
              addTimeline(dataStr, 'Praça de Alimentação', valorRealItem);
            }
          });
        } else {
          gruposMap['Outros'] = (gruposMap['Outros'] || 0) + val;
          addTimeline(dataStr, 'Praça de Alimentação', val);
        }
      });

      // Consolidar totais de camisetas e alimentação
      let sumCamisetas = 0;
      let sumAlimentacao = 0;
      let sumVendas = 0;
      Object.keys(gruposMap).forEach(key => {
        const v = gruposMap[key];
        sumVendas += v;
        if (key === 'CAMISETAS') {
          sumCamisetas += v;
        } else {
          sumAlimentacao += v;
        }
      });

      setTotalEntradasAvulsas(sumEntradasAvulsas);
      setTotalOfertas(sumOfertas);
      setTotalSaidas(sumSaidas);
      setTotalCamisetas(sumCamisetas);
      setTotalAlimentacao(sumAlimentacao);
      setTotalVendas(sumVendas);
      setTotalInscricoes(sumInscricoes);

      // Formatar Timeline
      const arrTimeline = Object.values(timeline).sort((a, b) => a.data.localeCompare(b.data));
      // Arredondar valores
      arrTimeline.forEach(t => {
        t['Entradas Avulsas'] = Number(t['Entradas Avulsas'].toFixed(2));
        t['Ofertas'] = Number(t['Ofertas'].toFixed(2));
        t['Camisetas'] = Number(t['Camisetas'].toFixed(2));
        t['Praça de Alimentação'] = Number(t['Praça de Alimentação'].toFixed(2));
        t.Inscrições = Number(t.Inscrições.toFixed(2));
        t.Saídas = Number(t.Saídas.toFixed(2));
      });
      setDadosTimeline(arrTimeline);

      // Formatar Receitas por Categoria
      const arrReceitas = [
        { name: 'Inscrições', value: Number(sumInscricoes.toFixed(2)), color: '#10b981' },
        { name: 'Praça de Alimentação', value: Number(sumAlimentacao.toFixed(2)), color: '#f59e0b' },
        { name: 'Camisetas', value: Number(sumCamisetas.toFixed(2)), color: '#8b5cf6' },
        { name: 'Ofertas', value: Number(sumOfertas.toFixed(2)), color: '#14b8a6' },
        { name: 'Entradas Avulsas', value: Number(sumEntradasAvulsas.toFixed(2)), color: '#3b82f6' }
      ].filter(r => r.value > 0).sort((a, b) => b.value - a.value);

      setDadosReceitas(arrReceitas);

      // Formatar Saídas por Categoria
      const coresSaidas = ['#ef4444', '#f43f5e', '#ec4899', '#d97706', '#8b5cf6', '#6b7280'];
      const arrSaidas = Object.keys(categoriasSaidasMap).map((cat, idx) => ({
        name: cat,
        value: Number(categoriasSaidasMap[cat].toFixed(2)),
        color: coresSaidas[idx % coresSaidas.length]
      })).filter(s => s.value > 0).sort((a, b) => b.value - a.value);

      setDadosSaidas(arrSaidas);

    } catch (error) {
      console.error("Erro ao gerar relatório:", error);
      Swal.fire("Erro", "Falha ao carregar dados financeiros: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  }

  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
  };

  const totalGeral = totalEntradasAvulsas + totalOfertas + totalVendas + totalInscricoes;
  const saldoLiquido = totalGeral - totalSaidas;

  return (
    <div className="space-y-6">
      
      {/* ── Header e Filtros ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="text-red-600" /> Relatório Financeiro (B.I.)
          </h2>
          <p className="text-slate-500 text-sm mt-1">Visão geral de receitas por categoria</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-2 shadow-sm flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          {isGlobalUser && (
            <div className="flex items-center gap-2 px-2 sm:border-r border-slate-200 pr-4">
              <Landmark size={16} className="text-slate-400" />
              <select 
                value={filtroEvento}
                onChange={e => setFiltroEvento(e.target.value)}
                className="text-sm font-bold text-slate-700 outline-none bg-transparent cursor-pointer w-full sm:w-auto"
              >
                <option value="todos">Todos os Eventos</option>
                {eventos.map(ev => (
                  <option key={ev.id} value={ev.id}>{ev.nome}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex items-center gap-2 px-2">
            <Calendar size={16} className="text-slate-400" />
            <input 
              type="date" 
              value={dataInicial} 
              onChange={e => setDataInicial(e.target.value)}
              className="text-sm font-bold text-slate-700 outline-none bg-transparent"
            />
          </div>
          <span className="text-slate-300 font-bold">até</span>
          <div className="flex items-center gap-2 px-2">
            <Calendar size={16} className="text-slate-400" />
            <input 
              type="date" 
              value={dataFinal} 
              onChange={e => setDataFinal(e.target.value)}
              className="text-sm font-bold text-slate-700 outline-none bg-transparent"
            />
          </div>
        </div>
      </div>
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-red-600 rounded-full animate-spin" />
          <p className="text-slate-400 font-medium animate-pulse">Processando dados financeiros...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
            
            {/* KPI Geral */}
            <div className="bg-slate-900 rounded-2xl p-4 shadow-lg border border-slate-800 flex flex-col justify-between overflow-hidden relative group">
              <div className="absolute -right-6 -top-6 text-slate-800/50 group-hover:scale-110 transition-transform duration-500">
                <DollarSign size={100} />
              </div>
              <div className="relative z-10">
                <div className="text-slate-400 text-[10px] xl:text-[9px] font-bold uppercase tracking-widest mb-1.5 leading-tight mr-2">Saldo (Receitas - Saídas)</div>
                <div className="text-2xl md:text-3xl xl:text-xl font-black text-white whitespace-nowrap">{formatarMoeda(saldoLiquido)}</div>
              </div>
              <div className="relative z-10 mt-4 flex items-center gap-1.5 text-emerald-400 text-xs font-bold bg-emerald-400/10 w-max px-2 py-1 rounded-lg">
                <TrendingUp size={12} /> Líquido Acumulado
              </div>
            </div>

            {/* KPI Entradas */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-slate-500 text-[10px] xl:text-[9px] font-bold uppercase tracking-widest leading-tight mr-2">Entradas (Avulsas)</div>
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 flex-shrink-0">
                    <Banknote size={16} />
                  </div>
                </div>
                <div className="text-xl md:text-2xl xl:text-[18px] font-black text-slate-800 whitespace-nowrap">{formatarMoeda(totalEntradasAvulsas)}</div>
              </div>
              <div className="mt-4 text-[10px] font-medium text-slate-400">
                {((totalEntradasAvulsas / (totalGeral || 1)) * 100).toFixed(1)}% das receitas
              </div>
            </div>

            {/* KPI Ofertas */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-slate-500 text-[10px] xl:text-[9px] font-bold uppercase tracking-widest leading-tight mr-2">Ofertas</div>
                  <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center text-teal-500 flex-shrink-0">
                    <Heart size={16} />
                  </div>
                </div>
                <div className="text-xl md:text-2xl xl:text-[18px] font-black text-slate-800 whitespace-nowrap">{formatarMoeda(totalOfertas)}</div>
              </div>
              <div className="mt-4 text-[10px] font-medium text-slate-400">
                {((totalOfertas / (totalGeral || 1)) * 100).toFixed(1)}% das receitas
              </div>
            </div>

            {/* KPI Alimentação */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-slate-500 text-[10px] xl:text-[9px] font-bold uppercase tracking-widest leading-tight mr-2">Praça de Alimentação</div>
                  <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 flex-shrink-0">
                    <ShoppingBag size={16} />
                  </div>
                </div>
                <div className="text-xl md:text-2xl xl:text-[18px] font-black text-slate-800 whitespace-nowrap">{formatarMoeda(totalAlimentacao)}</div>
              </div>
              <div className="mt-4 text-[10px] font-medium text-slate-400">
                {((totalAlimentacao / (totalGeral || 1)) * 100).toFixed(1)}% das receitas
              </div>
            </div>

            {/* KPI Camisetas */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-slate-500 text-[10px] xl:text-[9px] font-bold uppercase tracking-widest leading-tight mr-2">Camisetas</div>
                  <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-500 flex-shrink-0">
                    <Shirt size={16} />
                  </div>
                </div>
                <div className="text-xl md:text-2xl xl:text-[18px] font-black text-slate-800 whitespace-nowrap">{formatarMoeda(totalCamisetas)}</div>
              </div>
              <div className="mt-4 text-[10px] font-medium text-slate-400">
                {((totalCamisetas / (totalGeral || 1)) * 100).toFixed(1)}% das receitas
              </div>
            </div>

            {/* KPI Inscrições */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-slate-500 text-[10px] xl:text-[9px] font-bold uppercase tracking-widest leading-tight mr-2">Inscrições</div>
                  <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 flex-shrink-0">
                    <Users size={16} />
                  </div>
                </div>
                <div className="text-xl md:text-2xl xl:text-[18px] font-black text-slate-800 whitespace-nowrap">{formatarMoeda(totalInscricoes)}</div>
              </div>
              <div className="mt-4 text-[10px] font-medium text-slate-400">
                {((totalInscricoes / (totalGeral || 1)) * 100).toFixed(1)}% das receitas
              </div>
            </div>

            {/* KPI Saídas */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-slate-500 text-[10px] xl:text-[9px] font-bold uppercase tracking-widest leading-tight mr-2">Saídas</div>
                  <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-500 flex-shrink-0">
                    <TrendingDown size={16} />
                  </div>
                </div>
                <div className="text-xl md:text-2xl xl:text-[18px] font-black text-slate-800 whitespace-nowrap">{formatarMoeda(totalSaidas)}</div>
              </div>
              <div className="mt-4 text-[10px] font-medium text-slate-400">
                {((totalSaidas / (totalGeral || 1)) * 100).toFixed(1)}% das receitas
              </div>
            </div>

          </div>

          {/* ── Gráficos ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Evolução Diária */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 lg:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Evolução de Receitas</h3>
                  <p className="text-xs text-slate-500">Tendência diária de entradas (Ofertas, Vendas e Inscrições)</p>
                </div>
                <Activity className="text-slate-300" />
              </div>
              
              <div className="h-[300px] w-full">
                {dadosTimeline.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dadosTimeline} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="data" 
                        tick={{ fontSize: 11, fill: '#94a3b8' }} 
                        axisLine={false} 
                        tickLine={false}
                        tickFormatter={(val) => {
                          const [y, m, d] = val.split('-');
                          return `${d}/${m}`;
                        }}
                      />
                      <YAxis 
                        tick={{ fontSize: 11, fill: '#94a3b8' }} 
                        axisLine={false} 
                        tickLine={false} 
                        tickFormatter={(val) => `R$ ${val}`}
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value) => formatarMoeda(value)}
                        labelFormatter={(label) => {
                          const [y, m, d] = label.split('-');
                          return `${d}/${m}/${y}`;
                        }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                      <Line type="monotone" dataKey="Entradas Avulsas" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="Inscrições" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="Praça de Alimentação" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="Camisetas" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="Saídas" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                    Nenhum dado encontrado para este período.
                  </div>
                )}
              </div>
            </div>

            {/* Distribuição de Receitas */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Receitas</h3>
                  <p className="text-xs text-slate-500">Distribuição por categoria</p>
                </div>
                <PieChart className="text-slate-300" />
              </div>

              <div className="h-[250px] w-full">
                {dadosReceitas.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={dadosReceitas}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {dadosReceitas.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => formatarMoeda(value)}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                    Nenhuma receita no período.
                  </div>
                )}
              </div>

              {/* Legenda Customizada */}
              <div className="mt-4 space-y-2">
                {dadosReceitas.map((receita, index) => (
                  <div key={receita.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: receita.color }} />
                      <span className="text-slate-600 font-medium truncate max-w-[150px]">{receita.name}</span>
                    </div>
                    <span className="font-bold text-slate-800">{formatarMoeda(receita.value)}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* ── Gráficos de Saídas ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            
            {/* Evolução Diária de Saídas */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 lg:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Evolução de Saídas</h3>
                  <p className="text-xs text-slate-500">Tendência diária de saídas (Despesas e Pagamentos)</p>
                </div>
                <Activity className="text-red-500" />
              </div>
              
              <div className="h-[300px] w-full">
                {dadosTimeline.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dadosTimeline} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="data" 
                        tick={{ fontSize: 11, fill: '#94a3b8' }} 
                        axisLine={false} 
                        tickLine={false}
                        tickFormatter={(val) => {
                          const [y, m, d] = val.split('-');
                          return `${d}/${m}`;
                        }}
                      />
                      <YAxis 
                        tick={{ fontSize: 11, fill: '#94a3b8' }} 
                        axisLine={false} 
                        tickLine={false} 
                        tickFormatter={(val) => `R$ ${val}`}
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value) => formatarMoeda(value)}
                        labelFormatter={(label) => {
                          const [y, m, d] = label.split('-');
                          return `${d}/${m}/${y}`;
                        }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                      <Line type="monotone" dataKey="Saídas" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                    Nenhum dado encontrado para este período.
                  </div>
                )}
              </div>
            </div>

            {/* Distribuição de Saídas */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Saídas</h3>
                    <p className="text-xs text-slate-500">Distribuição de despesas por categoria</p>
                  </div>
                  <PieChart className="text-red-500" />
                </div>

                <div className="h-[250px] w-full">
                  {dadosSaidas.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={dadosSaidas}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {dadosSaidas.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value) => formatarMoeda(value)}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                      Nenhuma saída no período.
                    </div>
                  )}
                </div>
              </div>

              {/* Legenda Customizada */}
              <div className="mt-4 space-y-2 max-h-[150px] overflow-y-auto pr-1">
                {dadosSaidas.map((saida) => (
                  <div key={saida.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: saida.color }} />
                      <span className="text-slate-600 font-medium truncate max-w-[150px]">{saida.name}</span>
                    </div>
                    <span className="font-bold text-slate-800">{formatarMoeda(saida.value)}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
}

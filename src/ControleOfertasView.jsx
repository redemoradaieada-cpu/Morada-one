import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Swal from 'sweetalert2';
import { 
  Landmark, Plus, Trash2, Calendar, Clock, DollarSign, 
  TrendingUp, FileText, Search, AlertCircle
} from 'lucide-react';

export function ControleOfertasView({ userId }) {
  const [ofertas, setOfertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroPeriodo, setFiltroPeriodo] = useState('Todos');
  
  // Modal State
  const [modalAberto, setModalAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [formData, setFormData] = useState({
    data_culto: new Date().toISOString().split('T')[0],
    periodo: 'Noite',
    valor_total: '',
    observacao: ''
  });

  useEffect(() => {
    fetchOfertas();
  }, []);

  async function fetchOfertas() {
    setLoading(true);
    const { data, error } = await supabase
      .from('ofertas_culto')
      .select('*, perfis(nome_completo)')
      .order('data_culto', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Erro ao buscar ofertas:", error);
      Swal.fire('Erro', 'Não foi possível carregar as ofertas. ' + error.message, 'error');
    } else if (data) {
      setOfertas(data);
    }
    setLoading(false);
  }

  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
  };

  const parseMoeda = (valorFormatado) => {
    const limpo = valorFormatado.replace(/\D/g, '');
    return (Number(limpo) / 100).toFixed(2);
  };

  const handleValorChange = (e) => {
    const limpo = e.target.value.replace(/\D/g, '');
    const formatado = (Number(limpo) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    setFormData({ ...formData, valor_total: formatado });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.data_culto || !formData.periodo || !formData.valor_total) {
      Swal.fire('Atenção', 'Preencha todos os campos obrigatórios.', 'warning');
      return;
    }

    const valorNumerico = Number(parseMoeda(formData.valor_total));
    if (valorNumerico <= 0) {
      Swal.fire('Atenção', 'O valor deve ser maior que zero.', 'warning');
      return;
    }

    setSalvando(true);
    const { error } = await supabase.from('ofertas_culto').insert([{
      data_culto: formData.data_culto,
      periodo: formData.periodo,
      valor_total: valorNumerico,
      observacao: formData.observacao || null,
      criado_por: userId
    }]);

    setSalvando(false);

    if (error) {
      Swal.fire('Erro', 'Falha ao registrar oferta: ' + error.message, 'error');
    } else {
      Swal.fire({ title: 'Sucesso!', text: 'Oferta registrada com sucesso.', icon: 'success', timer: 1500, showConfirmButton: false });
      setModalAberto(false);
      setFormData({
        data_culto: new Date().toISOString().split('T')[0],
        periodo: 'Noite',
        valor_total: '',
        observacao: ''
      });
      fetchOfertas();
    }
  };

  const handleExcluir = async (id) => {
    const { isConfirmed } = await Swal.fire({
      title: 'Deseja excluir este registro?',
      text: 'Esta ação não poderá ser desfeita!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, excluir',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444'
    });

    if (isConfirmed) {
      const { error } = await supabase.from('ofertas_culto').delete().eq('id', id);
      if (error) {
        Swal.fire('Erro', 'Não foi possível excluir: ' + error.message, 'error');
      } else {
        fetchOfertas();
      }
    }
  };

  // Filtragem e Cálculos
  const ofertasFiltradas = ofertas.filter(o => {
    const dataStr = new Date(o.data_culto + 'T00:00:00').toLocaleDateString('pt-BR');
    const matchBusca = dataStr.includes(busca) || o.periodo.toLowerCase().includes(busca.toLowerCase());
    const matchPeriodo = filtroPeriodo === 'Todos' || o.periodo === filtroPeriodo;
    return matchBusca && matchPeriodo;
  });

  // Cálculo de total arrecadado no mês atual
  const dataAtual = new Date();
  const mesAtual = dataAtual.getMonth();
  const anoAtual = dataAtual.getFullYear();
  
  const totalMesAtual = ofertas.reduce((acc, o) => {
    const dataO = new Date(o.data_culto + 'T00:00:00');
    if (dataO.getMonth() === mesAtual && dataO.getFullYear() === anoAtual) {
      return acc + Number(o.valor_total);
    }
    return acc;
  }, 0);

  const totalGeral = ofertas.reduce((acc, o) => acc + Number(o.valor_total), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <Landmark className="text-red-600" size={32} /> Controle de Ofertas
          </h2>
          <p className="text-slate-500 text-sm font-medium pl-11">Gestão financeira dos cultos</p>
        </div>
          
        <button onClick={() => setModalAberto(true)}
          className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-red-600/20 active:scale-95">
          <Plus size={18} /> Novo Lançamento
        </button>
      </div>

      {/* ── Cards de Resumo ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-5">
          <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center">
            <Calendar size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Arrecadado neste Mês</p>
            <p className="text-2xl font-black text-slate-800">{formatarMoeda(totalMesAtual)}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-5">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-emerald-600/70 uppercase tracking-widest mb-1">Total Histórico</p>
            <p className="text-2xl font-black text-emerald-600">{formatarMoeda(totalGeral)}</p>
          </div>
        </div>
      </div>

      {/* ── Filtros ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            value={busca} 
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por data (ex: 25/12/2023) ou período..."
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-slate-400" />
          <select 
            value={filtroPeriodo} 
            onChange={e => setFiltroPeriodo(e.target.value)}
            className="py-2.5 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 cursor-pointer appearance-none"
          >
            <option value="Todos">Todos os Períodos</option>
            <option value="Manhã">Manhã</option>
            <option value="Tarde">Tarde</option>
            <option value="Noite">Noite</option>
          </select>
        </div>
      </div>

      {/* ── Lista de Ofertas ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-red-600 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-slate-400 text-sm font-medium">Carregando histórico...</p>
          </div>
        ) : ofertasFiltradas.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <AlertCircle size={40} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">Nenhum registro de oferta encontrado.</p>
          </div>
          <>
            {/* Celular: Feed de Cards */}
            <div className="block sm:hidden divide-y divide-slate-100">
              {ofertasFiltradas.map(oferta => (
                <div key={oferta.id} className="p-4 hover:bg-slate-50/50 transition-colors flex justify-between items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                        oferta.periodo === 'Manhã' ? 'bg-amber-50 text-amber-600' :
                        oferta.periodo === 'Tarde' ? 'bg-orange-50 text-orange-600' :
                        'bg-indigo-50 text-indigo-600'
                      }`}>
                        {oferta.periodo}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {new Date(oferta.data_culto + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    {oferta.observacao && (
                      <p className="text-xs text-slate-500 truncate max-w-[200px]">{oferta.observacao}</p>
                    )}
                    <div className="text-[9px] text-slate-400 mt-0.5">
                      Registrado por: {oferta.perfis?.nome_completo || 'Sistema'}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="font-black text-emerald-600 text-sm">
                      {formatarMoeda(oferta.valor_total)}
                    </span>
                    <button onClick={() => handleExcluir(oferta.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Excluir Lançamento">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Tablet/Desktop: Tabela Tradicional */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data do Culto</th>
                    <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Período</th>
                    <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hidden md:table-cell">Registrado por</th>
                    <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hidden lg:table-cell">Observações</th>
                    <th className="text-right px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor Arrecadado</th>
                    <th className="px-6 py-4" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ofertasFiltradas.map(oferta => (
                    <tr key={oferta.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800 flex items-center gap-2">
                          <Calendar size={14} className="text-slate-400" />
                          {new Date(oferta.data_culto + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${
                          oferta.periodo === 'Manhã' ? 'bg-amber-50 text-amber-600' :
                          oferta.periodo === 'Tarde' ? 'bg-orange-50 text-orange-600' :
                          'bg-indigo-50 text-indigo-600'
                        }`}>
                          {oferta.periodo}
                        </span>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <span className="text-xs text-slate-500 font-medium">
                          {oferta.perfis?.nome_completo || 'Sistema'}
                        </span>
                      </td>
                      <td className="px-6 py-4 hidden lg:table-cell">
                        <span className="text-xs text-slate-400 truncate max-w-[200px] block">
                          {oferta.observacao || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-black text-green-600 text-base">
                          {formatarMoeda(oferta.valor_total)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => handleExcluir(oferta.id)}
                          className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                          title="Excluir Lançamento">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* ── Modal de Lançamento ── */}
      {modalAberto && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 md:p-8 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-600">
                  <DollarSign size={20} />
                </div>
                <h3 className="font-black text-xl text-slate-800">Lançar Oferta</h3>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-5">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Data do Culto</label>
                  <input type="date" required
                    value={formData.data_culto} 
                    onChange={e => setFormData({...formData, data_culto: e.target.value})}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Período</label>
                  <select required
                    value={formData.periodo} 
                    onChange={e => setFormData({...formData, periodo: e.target.value})}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all cursor-pointer"
                  >
                    <option value="Manhã">Manhã</option>
                    <option value="Tarde">Tarde</option>
                    <option value="Noite">Noite</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Valor Arrecadado (R$)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-300">R$</span>
                  <input type="text" required placeholder="0,00"
                    value={formData.valor_total} 
                    onChange={handleValorChange}
                    className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xl font-black text-slate-900 outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Observações (Opcional)</label>
                <div className="relative">
                  <FileText size={16} className="absolute left-4 top-3.5 text-slate-300" />
                  <textarea rows={2} placeholder="Ex: Oferta de missões, problemas na contagem..."
                    value={formData.observacao} 
                    onChange={e => setFormData({...formData, observacao: e.target.value})}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all resize-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setModalAberto(false)}
                  className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all">
                  Cancelar
                </button>
                <button type="submit" disabled={salvando}
                  className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-red-600/30 active:scale-95 flex items-center justify-center gap-2">
                  {salvando ? (
                    <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/> Salvando...</>
                  ) : (
                    'Confirmar Lançamento'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import {
  Save, ClipboardList, Hash, DollarSign, CalendarClock,
  Plus, Search, Edit2, Trash2, AlertCircle,
  CheckCircle2, List, BedDouble, Landmark
} from 'lucide-react';
import { useEventContext } from './contexts/EventContext';

export function CadastroInscricoes() {
  const [isListView, setIsListView] = useState(false);
  const [inscricoes, setInscricoes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });
  const [editingId, setEditingId] = useState(null);
  const { eventos, eventoSelecionado } = useEventContext();
  const [selectedTargetEvent, setSelectedTargetEvent] = useState('');
  const [filtroEvento, setFiltroEvento] = useState('todos');

  useEffect(() => {
    if (eventoSelecionado) {
      setSelectedTargetEvent(eventoSelecionado.id);
    }
  }, [eventoSelecionado]);

  const [formData, setFormData] = useState({
    nome: '',
    limite_vagas: '',
    valor: '',
    data_validade: '',
    inclui_hospedagem: false
  });

  useEffect(() => {
    if (!eventoSelecionado) return;
    if (isListView) fetchInscricoes();
  }, [isListView, eventoSelecionado, filtroEvento]);

  async function fetchInscricoes() {
    setFetching(true);
    if (eventos && eventos.length > 1 && filtroEvento === 'todos') {
      const ids = eventos.map(e => e.id);
      const { data, error } = await supabase
        .from('tipos_inscricao')
        .select('*, eventos(nome)')
        .in('evento_id', ids)
        .order('created_at', { ascending: false });
      if (error) setMensagem({ tipo: 'erro', texto: 'Erro: ' + error.message });
      else setInscricoes(data || []);
    } else {
      const eventoId = filtroEvento !== 'todos' ? filtroEvento : eventoSelecionado?.id;
      if (!eventoId) { setFetching(false); return; }
      const { data, error } = await supabase
        .from('tipos_inscricao')
        .select('*, eventos(nome)')
        .eq('evento_id', eventoId)
        .order('created_at', { ascending: false });
      if (error) setMensagem({ tipo: 'erro', texto: 'Erro: ' + error.message });
      else setInscricoes(data || []);
    }
    setFetching(false);
  }

  const handleEdit = (inscricao) => {
    setEditingId(inscricao.id);
    setFormData({
      nome: inscricao.nome,
      limite_vagas: inscricao.limite_vagas ?? '',
      valor: inscricao.valor ?? '',
      data_validade: inscricao.data_validade || '',
      inclui_hospedagem: !!inscricao.inclui_hospedagem
    });
    setIsListView(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja excluir esta inscrição?')) return;
    const { error } = await supabase.from('tipos_inscricao').delete().eq('id', id);
    if (!error) {
      fetchInscricoes();
    } else {
      setMensagem({ tipo: 'erro', texto: 'Erro ao excluir: ' + error.message });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMensagem({ tipo: '', texto: '' });

    const targetEventId = selectedTargetEvent || eventoSelecionado.id;

    const payload = {
      nome: formData.nome,
      limite_vagas: formData.limite_vagas ? Number(formData.limite_vagas) : 0,
      valor: formData.valor ? Number(formData.valor) : 0,
      data_validade: formData.data_validade || null,
      inclui_hospedagem: formData.inclui_hospedagem === true,
      evento_id: targetEventId
    };

    try {
      if (editingId) {
        const { data, error } = await supabase.from('tipos_inscricao').update(payload).eq('id', editingId).select();
        if (error) {
          console.error('Erro no update:', error);
          throw error;
        }
        if (!data || data.length === 0) {
          throw new Error('Nenhuma linha foi atualizada. Verifique as permissões (RLS) ou se o registro existe.');
        }
        console.log('Update bem-sucedido:', data);
        setMensagem({ tipo: 'sucesso', texto: 'Inscrição atualizada com sucesso!' });
      } else {
        const { error } = await supabase.from('tipos_inscricao').insert([payload]);
        if (error) throw error;
        setMensagem({ tipo: 'sucesso', texto: 'Inscrição cadastrada com sucesso!' });
      }

      setFormData({ nome: '', limite_vagas: '', valor: '', data_validade: '', inclui_hospedagem: false });
      setEditingId(null);
      
      // Força a atualização da lista e redireciona para que veja a alteração salva na hora
      fetchInscricoes();
      setIsListView(true);
      
    } catch (err) {
      console.error('Erro geral:', err);
      setMensagem({ tipo: 'erro', texto: 'Erro na operação: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const filteredInscricoes = inscricoes.filter(i =>
    i.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isVencida = (data) => {
    if (!data) return false;
    return new Date(data) < new Date(new Date().toDateString());
  };

  const isGlobalUser = eventos && eventos.length > 1;

  return (
    <div className="space-y-6">
      {/* Header com Toggle de Visão */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ClipboardList className="text-red-600" /> Cadastro de Inscrições
          </h2>
          <p className="text-slate-500 text-sm">Controle de tipos de inscrição, vagas e validade</p>
        </div>

        <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
          <button
            onClick={() => { setIsListView(false); setEditingId(null); setFormData({ nome: '', limite_vagas: '', valor: '', data_validade: '', inclui_hospedagem: false }); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${!isListView ? 'bg-red-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Plus size={16} /> {editingId ? 'Editar' : 'Novo'}
          </button>
          <button
            onClick={() => setIsListView(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${isListView ? 'bg-red-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <List size={16} /> Relatório
          </button>
        </div>
      </div>

      {mensagem.texto && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${mensagem.tipo === 'sucesso' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
          {mensagem.tipo === 'sucesso' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span className="text-sm font-medium">{mensagem.texto}</span>
        </div>
      )}

      {!isListView ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
            <h3 className="font-bold text-slate-700 uppercase text-xs tracking-widest flex items-center gap-2">
              <ClipboardList size={16} className="text-red-500" />
              {editingId ? 'Informações da Inscrição' : 'Cadastro de Novo Tipo de Inscrição'}
            </h3>
            {eventoSelecionado && (
              <span className="text-[10px] font-bold px-2.5 py-1 bg-red-100 text-red-700 rounded-lg uppercase tracking-wider border border-red-200 shadow-sm w-max">
                Evento: {eventoSelecionado.nome}
              </span>
            )}
          </div>

          <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {eventos && eventos.length > 1 && (
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Evento Destino</label>
                <select
                  required
                  className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-semibold text-slate-700 text-sm appearance-none cursor-pointer"
                  value={selectedTargetEvent}
                  onChange={(e) => setSelectedTargetEvent(e.target.value)}
                >
                  {eventos.map(ev => (
                    <option key={ev.id} value={ev.id}>{ev.nome}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 md:col-span-2">
              {/* Nome da Inscrição */}
              <div className="lg:col-span-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">Nome da Inscrição</label>
                <div className="relative">
                  <ClipboardList className="absolute left-3 top-3 text-slate-300" size={18} />
                  <input
                    required
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                    placeholder="Ex: Inscrição Evento Anual"
                    value={formData.nome}
                    onChange={e => setFormData({ ...formData, nome: e.target.value })}
                  />
                </div>
              </div>

              {/* Vagas */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">Vagas</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-3 text-slate-300" size={18} />
                  <input
                    required
                    type="number"
                    min="0"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                    placeholder="Ex: 50"
                    value={formData.limite_vagas}
                    onChange={e => setFormData({ ...formData, limite_vagas: e.target.value })}
                  />
                </div>
              </div>

              {/* Valor */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">Valor</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 text-slate-300" size={18} />
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                    placeholder="0.00"
                    value={formData.valor}
                    onChange={e => setFormData({ ...formData, valor: e.target.value })}
                  />
                </div>
              </div>

              {/* Data de Validade */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">Data de Validade</label>
                <div className="relative">
                  <CalendarClock className="absolute left-3 top-3 text-slate-300" size={18} />
                  <input
                    type="date"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                    value={formData.data_validade}
                    onChange={e => setFormData({ ...formData, data_validade: e.target.value })}
                  />
                </div>
              </div>

              {/* Hospedagem */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">Hospedagem</label>
                <label className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors h-[50px]">
                  <input 
                    type="checkbox" 
                    checked={formData.inclui_hospedagem === true} 
                    onChange={e => setFormData({...formData, inclui_hospedagem: e.target.checked})}
                    className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500"
                  />
                  <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <BedDouble size={18} className="text-slate-400" /> Inclui Hospedagem
                  </span>
                </label>
              </div>
            </div>

            <div className="mt-10 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="bg-red-600 text-white px-10 py-4 rounded-2xl font-bold flex items-center gap-2 hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 disabled:opacity-50"
              >
                {loading ? 'A guardar...' : <><Save size={20} /> {editingId ? 'Atualizar Inscrição' : 'Finalizar Cadastro'}</>}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
              <input
                placeholder="Pesquisar por nome..."
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500/20 outline-none"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            {isGlobalUser && (
              <div className="relative">
                <Landmark className="absolute left-3 top-2.5 text-slate-400" size={18} />
                <select
                  className="pl-10 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500/20 outline-none appearance-none cursor-pointer font-semibold text-slate-700"
                  value={filtroEvento}
                  onChange={e => setFiltroEvento(e.target.value)}
                >
                  <option value="todos">Todos os Eventos</option>
                  {eventos.map(ev => (
                    <option key={ev.id} value={ev.id}>{ev.nome}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-100">
                  <th className="p-4">Inscrição</th>
                  <th className="p-4">Vagas</th>
                  <th className="p-4 text-right">Valor</th>
                  <th className="p-4">Hospedagem</th>
                  <th className="p-4">Validade</th>
                  {isGlobalUser && <th className="p-4">Evento</th>}
                  <th className="p-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {fetching ? (
                  <tr><td colSpan="6" className="p-10 text-center text-slate-400 text-sm">A carregar inscrições...</td></tr>
                ) : filteredInscricoes.length === 0 ? (
                  <tr><td colSpan="6" className="p-10 text-center text-slate-400 text-sm">Nenhuma inscrição encontrada.</td></tr>
                ) : (
                  filteredInscricoes.map(i => (
                    <tr key={i.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="p-4">
                        <div className="font-bold text-slate-800 text-sm">{i.nome}</div>
                      </td>
                      <td className="p-4 text-xs text-slate-600">
                        {i.limite_vagas}
                      </td>
                      <td className="p-4 text-right font-bold text-slate-800 text-sm">
                        R$ {parseFloat(i.valor).toFixed(2)}
                      </td>
                      <td className="p-4">
                        {i.inclui_hospedagem === true ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase bg-blue-50 text-blue-600">
                            <BedDouble size={12} /> Sim
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">Não</span>
                        )}
                      </td>
                      <td className="p-4">
                        {i.data_validade ? (
                          <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${isVencida(i.data_validade) ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                            {new Date(i.data_validade + 'T00:00:00').toLocaleDateString('pt-BR')}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Sem validade</span>
                        )}
                      </td>
                      {isGlobalUser && (
                        <td className="p-4">
                          <span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase bg-blue-50 text-blue-600">
                            {i.eventos?.nome || '-'}
                          </span>
                        </td>
                      )}
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleEdit(i)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(i.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
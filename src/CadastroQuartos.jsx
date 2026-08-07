import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import {
  Save, BedDouble, MapPin, Users, Activity,
  Plus, Search, Edit2, Trash2, AlertCircle,
  CheckCircle2, List, Landmark
} from 'lucide-react';
import { useEventContext } from './contexts/EventContext';

const STATUS_OPTIONS = [
  { value: 'disponivel', label: 'Disponível' },
  { value: 'ocupado', label: 'Ocupado' },
  { value: 'manutencao', label: 'Manutenção' },
];

const TIPO_OPTIONS = [
  { value: 'Masculino', label: 'Masculino' },
  { value: 'Feminino', label: 'Feminino' },
];

const TIPO_BADGE = {
  Masculino: 'bg-blue-50 text-blue-600',
  Feminino: 'bg-pink-50 text-pink-600',
};

const STATUS_BADGE = {
  disponivel: 'bg-green-50 text-green-600',
  ocupado: 'bg-red-50 text-red-600',
  manutencao: 'bg-amber-50 text-amber-600',
};

export function GestorQuartos() {
  const [isListView, setIsListView] = useState(false);
  const [quartos, setQuartos] = useState([]);
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
    ala_andar: '',
    capacidade: '',
    status: 'disponivel',
    tipo: 'Masculino',
    categoria: 'Alojamento'
  });

  useEffect(() => {
    if (!eventoSelecionado) return;
    if (isListView) fetchQuartos();
  }, [isListView, eventoSelecionado, filtroEvento]);

  async function fetchQuartos() {
    setFetching(true);
    // Se tem acesso a múltiplos eventos e filtro = todos, busca de todos
    if (eventos && eventos.length > 1 && filtroEvento === 'todos') {
      const ids = eventos.map(e => e.id);
      const { data } = await supabase.from('quartos').select('*, eventos(nome)').in('evento_id', ids).order('nome');
      if (data) setQuartos(data);
    } else {
      const eventoId = filtroEvento !== 'todos' ? filtroEvento : eventoSelecionado?.id;
      if (!eventoId) { setFetching(false); return; }
      const { data } = await supabase.from('quartos').select('*, eventos(nome)').eq('evento_id', eventoId).order('nome');
      if (data) setQuartos(data);
    }
    setFetching(false);
  }

  const handleEdit = (quarto) => {
    setEditingId(quarto.id);
    setFormData({
      nome: quarto.nome,
      ala_andar: quarto.ala_andar || '',
      capacidade: quarto.capacidade || '',
      status: quarto.status || 'disponivel',
      tipo: quarto.tipo || 'Masculino',
      categoria: quarto.categoria || 'Alojamento'
    });
    setIsListView(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este quarto?')) return;
    const { error } = await supabase.from('quartos').delete().eq('id', id);
    if (!error) {
      fetchQuartos();
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
      ala_andar: formData.ala_andar,
      capacidade: formData.capacidade ? Number(formData.capacidade) : null,
      status: formData.status,
      tipo: formData.tipo,
      categoria: formData.categoria,
      evento_id: targetEventId
    };

    try {
      if (editingId) {
        const { error } = await supabase.from('quartos').update(payload).eq('id', editingId);
        if (error) throw error;
        setMensagem({ tipo: 'sucesso', texto: 'Quarto atualizado com sucesso!' });
      } else {
        const { error } = await supabase.from('quartos').insert([payload]);
        if (error) throw error;
        setMensagem({ tipo: 'sucesso', texto: 'Quarto cadastrado com sucesso!' });
      }

      setFormData({ nome: '', ala_andar: '', capacidade: '', status: 'disponivel', tipo: 'Masculino', categoria: 'Alojamento' });
      setEditingId(null);
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: 'Erro na operação: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const filteredQuartos = quartos.filter(q =>
    q.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (q.ala_andar && q.ala_andar.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const isGlobalUser = eventos && eventos.length > 1;

  return (
    <div className="space-y-6">
      {/* Header com Toggle de Visão */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BedDouble className="text-red-600" /> Gestão de Quartos
          </h2>
          <p className="text-slate-500 text-sm">Cadastro e controle dos quartos do estabelecimento</p>
        </div>

        <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
          <button
            onClick={() => { setIsListView(false); setEditingId(null); }}
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
              <BedDouble size={16} className="text-red-500" />
              {editingId ? 'Informações do Quarto' : 'Cadastro de Novo Quarto'}
            </h3>
            {eventoSelecionado && (
              <span className="text-[10px] font-bold px-2.5 py-1 bg-red-100 text-red-700 rounded-lg uppercase tracking-wider border border-red-200 shadow-sm w-max">
                Evento: {eventoSelecionado.nome}
              </span>
            )}
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

              {eventos && eventos.length > 1 && (
                <div className="md:col-span-2 lg:col-span-3">
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

              <div className="lg:col-span-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">Quarto</label>
                <div className="relative">
                  <BedDouble className="absolute left-3 top-3 text-slate-300" size={18} />
                  <input
                    required
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                    placeholder="Ex: 101"
                    value={formData.nome}
                    onChange={e => setFormData({ ...formData, nome: e.target.value })}
                  />
                </div>
              </div>

              {/* Ala / Bloco / Andar */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">Ala / Bloco / Andar</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 text-slate-300" size={18} />
                  <input
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                    placeholder="Ex: Bloco A - 1º andar"
                    value={formData.ala_andar}
                    onChange={e => setFormData({ ...formData, ala_andar: e.target.value })}
                  />
                </div>
              </div>

              {/* Capacidade */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">Capacidade</label>
                <div className="relative">
                  <Users className="absolute left-3 top-3 text-slate-300" size={18} />
                  <input
                    type="number"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                    placeholder="Ex: 2"
                    value={formData.capacidade}
                    onChange={e => setFormData({ ...formData, capacidade: e.target.value })}
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">Status</label>
                <div className="relative">
                  <Activity className="absolute left-3 top-3 text-slate-300" size={18} />
                  <select
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all appearance-none cursor-pointer"
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                  >
                    {STATUS_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tipo (Masculino/Feminino) */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">Tipo</label>
                <div className="relative">
                  <Users className="absolute left-3 top-3 text-slate-300" size={18} />
                  <select
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all appearance-none cursor-pointer"
                    value={formData.tipo}
                    onChange={e => setFormData({ ...formData, tipo: e.target.value })}
                  >
                    {TIPO_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Categoria (Alojamento/Apartamento) */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">Categoria</label>
                <div className="relative">
                  <BedDouble className="absolute left-3 top-3 text-slate-300" size={18} />
                  <select
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all appearance-none cursor-pointer"
                    value={formData.categoria}
                    onChange={e => setFormData({ ...formData, categoria: e.target.value })}
                  >
                    <option value="Alojamento">Alojamento</option>
                    <option value="Apartamento">Apartamento</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-10 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="bg-red-600 text-white px-10 py-4 rounded-2xl font-bold flex items-center gap-2 hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 disabled:opacity-50"
              >
                {loading ? 'A guardar...' : <><Save size={20} /> {editingId ? 'Atualizar Quarto' : 'Finalizar Cadastro'}</>}
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
                placeholder="Pesquisar por quarto ou ala..."
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
                  <th className="p-4">Quarto</th>
                  <th className="p-4">Ala / Bloco / Andar</th>
                  <th className="p-4">Capacidade</th>
                  <th className="p-4">Tipo</th>
                  <th className="p-4">Categoria</th>
                  <th className="p-4">Status</th>
                  {isGlobalUser && <th className="p-4">Evento</th>}
                  <th className="p-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {fetching ? (
                  <tr><td colSpan="5" className="p-10 text-center text-slate-400 text-sm">A carregar quartos...</td></tr>
                ) : filteredQuartos.length === 0 ? (
                  <tr><td colSpan="5" className="p-10 text-center text-slate-400 text-sm">Nenhum quarto encontrado.</td></tr>
                ) : (
                  filteredQuartos.map(q => (
                    <tr key={q.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="p-4">
                        <div className="font-bold text-slate-800 text-sm">{q.nome}</div>
                      </td>
                      <td className="p-4 text-xs text-slate-600">
                        {q.ala_andar || '-'}
                      </td>
                      <td className="p-4 text-xs text-slate-600">
                        {q.capacidade || '-'}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${TIPO_BADGE[q.tipo] || 'bg-slate-100 text-slate-400'}`}>
                          {TIPO_OPTIONS.find(t => t.value === q.tipo)?.label || q.tipo || 'Indefinido'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${q.categoria === 'Apartamento' ? 'bg-purple-50 text-purple-600' : 'bg-slate-50 text-slate-600'}`}>
                          {q.categoria || 'Alojamento'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${STATUS_BADGE[q.status] || 'bg-slate-100 text-slate-400'}`}>
                          {STATUS_OPTIONS.find(s => s.value === q.status)?.label || q.status || 'Indefinido'}
                        </span>
                      </td>
                      {isGlobalUser && (
                        <td className="p-4">
                          <span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase bg-blue-50 text-blue-600">
                            {q.eventos?.nome || '-'}
                          </span>
                        </td>
                      )}
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleEdit(q)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(q.id)}
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
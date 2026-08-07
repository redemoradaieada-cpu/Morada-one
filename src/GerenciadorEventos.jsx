import React, { useState, useEffect } from 'react';
import { Landmark, Plus, Edit2, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from './supabaseClient';
import Swal from 'sweetalert2';
import { useEventContext } from './contexts/EventContext';

export function GerenciadorEventos() {
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  
  const [formData, setFormData] = useState({ id: null, nome: '', status: 'ativo' });
  const { carregarEventos: atualizarContextoEventos } = useEventContext();

  useEffect(() => {
    fetchEventos();
  }, []);

  const fetchEventos = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('eventos').select('*').order('created_at', { ascending: false });
    if (!error) setEventos(data);
    setLoading(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editMode) {
        const { error } = await supabase.from('eventos').update({ nome: formData.nome, status: formData.status }).eq('id', formData.id);
        if (error) throw error;
        Swal.fire('Sucesso', 'Evento atualizado!', 'success');
      } else {
        const { error } = await supabase.from('eventos').insert([{ nome: formData.nome, status: formData.status }]);
        if (error) throw error;
        Swal.fire('Sucesso', 'Evento criado!', 'success');
      }
      setShowModal(false);
      fetchEventos();
      atualizarContextoEventos(); // Atualiza o contexto global também
    } catch (err) {
      Swal.fire('Erro', err.message, 'error');
    }
  };

  const handleDelete = async (id) => {
    const confirm = await Swal.fire({
      title: 'Tem certeza?',
      text: "Todos os dados vinculados a este evento serão apagados (Vendas, Inscrições, Financeiro). ISSO É IRREVERSÍVEL!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sim, excluir evento!'
    });

    if (confirm.isConfirmed) {
      const { error } = await supabase.from('eventos').delete().eq('id', id);
      if (error) {
        Swal.fire('Erro', error.message, 'error');
      } else {
        Swal.fire('Excluído!', 'O evento e todos os seus dados foram apagados.', 'success');
        fetchEventos();
        atualizarContextoEventos();
      }
    }
  };

  const openNew = () => {
    setFormData({ id: null, nome: '', status: 'ativo' });
    setEditMode(false);
    setShowModal(true);
  };

  const openEdit = (evento) => {
    setFormData({ id: evento.id, nome: evento.nome, status: evento.status });
    setEditMode(true);
    setShowModal(true);
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <Landmark className="text-red-600" size={28} />
            Gerenciador de Eventos
          </h2>
          <p className="text-slate-500 mt-1">Crie e gerencie os eventos ativos no sistema.</p>
        </div>
        <button onClick={openNew} className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-red-500/30 flex items-center gap-2">
          <Plus size={20} /> Novo Evento
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex justify-center p-12">
            <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {eventos.map(evento => (
              <div key={evento.id} className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
                    <Landmark size={24} />
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${evento.status === 'ativo' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {evento.status}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">{evento.nome}</h3>
                
                <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
                  <button onClick={() => openEdit(evento)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    <Edit2 size={18} />
                  </button>
                  <button onClick={() => handleDelete(evento.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
            {eventos.length === 0 && (
              <div className="col-span-full text-center py-12 text-slate-500">
                Nenhum evento cadastrado.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Form */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">{editMode ? 'Editar Evento' : 'Novo Evento'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-2"><XCircle size={24} /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Evento</label>
                <input
                  required
                  value={formData.nome}
                  onChange={e => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all"
                  placeholder="Ex: Acampamento Jovem 2026"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all appearance-none bg-white"
                >
                  <option value="ativo">Ativo (Pode receber inscrições e login)</option>
                  <option value="inativo">Inativo (Apenas leitura do histórico)</option>
                </select>
              </div>
              
              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="flex-1 px-4 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-500/30">
                  {editMode ? 'Atualizar' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

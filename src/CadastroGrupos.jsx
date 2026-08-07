import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Plus, Trash2, Tag, Loader2, AlertCircle, LayoutGrid, Search, Landmark } from 'lucide-react';
import Swal from 'sweetalert2';
import { useEventContext } from './contexts/EventContext';

export function CadastroGrupos() {
  const [grupos, setGrupos] = useState([]);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEvento, setFiltroEvento] = useState('todos');
  const { eventos, eventoSelecionado } = useEventContext();
  const [selectedTargetEvent, setSelectedTargetEvent] = useState('');

  const isGlobalUser = eventos && eventos.length > 1;

  useEffect(() => {
    if (eventoSelecionado) {
      setSelectedTargetEvent(eventoSelecionado.id);
    }
  }, [eventoSelecionado]);

  useEffect(() => {
    if (!eventoSelecionado) return;
    fetchGrupos();
  }, [eventoSelecionado, filtroEvento]);

  async function fetchGrupos() {
    setFetching(true);
    if (isGlobalUser && filtroEvento === 'todos') {
      const ids = eventos.map(e => e.id);
      const { data, error } = await supabase
        .from('grupos')
        .select('*, eventos(nome)')
        .in('evento_id', ids)
        .order('nome');
      if (error) console.error('Erro ao buscar grupos:', error);
      else setGrupos(data || []);
    } else {
      const eventoId = filtroEvento !== 'todos' ? filtroEvento : eventoSelecionado?.id;
      if (!eventoId) { setFetching(false); return; }
      const { data, error } = await supabase
        .from('grupos')
        .select('*, eventos(nome)')
        .eq('evento_id', eventoId)
        .order('nome');
      if (error) console.error('Erro ao buscar grupos:', error);
      else setGrupos(data || []);
    }
    setFetching(false);
  }

  const handleSave = async (e) => {
    e.preventDefault();
    if (!nome) return;

    setLoading(true);
    setMensagem({ tipo: '', texto: '' });

    const targetEventId = selectedTargetEvent || eventoSelecionado.id;

    const { error } = await supabase
      .from('grupos')
      .insert([{ nome, descricao, sincronizado_nuvem: false, evento_id: targetEventId }]);

    if (!error) {
      setNome('');
      setDescricao('');
      setMensagem({ tipo: 'sucesso', texto: 'Grupo cadastrado com sucesso!' });
      fetchGrupos();
    } else {
      setMensagem({ tipo: 'erro', texto: 'Erro ao salvar: ' + error.message });
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    const { isConfirmed } = await Swal.fire({
      title: 'Tem certeza?',
      text: 'Tem certeza que deseja excluir este grupo?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim',
      cancelButtonText: 'Não'
    });
    if (!isConfirmed) return;

    const { error } = await supabase.from('grupos').delete().eq('id', id);
    if (!error) {
      fetchGrupos();
    } else {
      Swal.fire('Atenção', 'Não foi possível excluir o grupo. Verifique se existem produtos vinculados a ele.', 'error');
    }
  };

  const filteredGrupos = grupos.filter(g =>
    g.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (g.descricao && g.descricao.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <LayoutGrid className="text-red-600" /> Grupos de Produtos
        </h2>
        <p className="text-slate-500 text-sm">Organize seu inventário em categorias lógicas</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulário de Cadastro */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 sticky top-10">
            <div className="flex flex-col gap-2 mb-4">
              <h3 className="font-bold text-slate-700 text-xs uppercase tracking-widest flex items-center gap-2">
                <Plus size={14} className="text-red-500" /> Novo Grupo
              </h3>
              {eventoSelecionado && (
                <span className="text-[10px] font-bold px-2.5 py-1 bg-red-100 text-red-700 rounded-lg uppercase tracking-wider border border-red-200 shadow-sm w-max">
                  Evento: {eventoSelecionado.nome}
                </span>
              )}
            </div>

            {mensagem.texto && (
              <div className={`p-3 mb-4 rounded-xl text-xs font-medium flex items-center gap-2 animate-in fade-in zoom-in duration-300 ${
                mensagem.tipo === 'sucesso' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
              }`}>
                {mensagem.tipo === 'sucesso' ? <Tag size={14} /> : <AlertCircle size={14} />}
                {mensagem.texto}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Nome do Grupo</label>
                <input
                  required
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-sm"
                  placeholder="Ex: Camisetas, Acessórios..."
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                />
              </div>

              {isGlobalUser && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Evento Destino</label>
                  <select
                    required
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-sm appearance-none cursor-pointer"
                    value={selectedTargetEvent}
                    onChange={(e) => setSelectedTargetEvent(e.target.value)}
                  >
                    {eventos.map(ev => (
                      <option key={ev.id} value={ev.id}>{ev.nome}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Descrição (Opcional)</label>
                <textarea
                  rows="3"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-sm resize-none"
                  placeholder="Breve detalhe sobre esta categoria"
                  value={descricao}
                  onChange={e => setDescricao(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-red-600 text-white p-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 active:scale-95 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={18}/> : <><Plus size={18}/> Adicionar Grupo</>}
              </button>
            </form>
          </div>
        </div>

        {/* Relatório de Grupos */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Header do relatório */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-slate-700 text-[10px] uppercase tracking-widest">Relatório de Grupos</h3>
                <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{filteredGrupos.length}</span>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {/* Busca */}
                <div className="relative flex-1 sm:flex-none">
                  <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
                  <input
                    placeholder="Pesquisar grupo..."
                    className="w-full sm:w-52 pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-red-500/20 outline-none transition-all"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
                {/* Filtro de evento - só para global */}
                {isGlobalUser && (
                  <div className="relative">
                    <Landmark className="absolute left-3 top-2.5 text-slate-400" size={15} />
                    <select
                      className="pl-9 pr-7 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-red-500/20 outline-none appearance-none cursor-pointer font-semibold text-slate-700"
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
            </div>

            {/* Lista */}
            <div className="divide-y divide-slate-100">
              {fetching ? (
                <div className="p-12 text-center flex flex-col items-center gap-3">
                  <Loader2 className="animate-spin text-slate-300" size={32} />
                  <p className="text-slate-400 text-sm italic">Carregando grupos...</p>
                </div>
              ) : filteredGrupos.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-slate-200">
                    <Tag className="text-slate-300" size={24} />
                  </div>
                  <p className="text-slate-500 font-medium">Nenhum grupo encontrado.</p>
                  <p className="text-slate-400 text-xs mt-1">Tente ajustar os filtros ou adicione um novo grupo.</p>
                </div>
              ) : (
                filteredGrupos.map(g => (
                  <div key={g.id} className="flex justify-between items-center p-4 hover:bg-slate-50 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
                        <LayoutGrid size={16} className="text-red-500" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="font-bold text-slate-800 text-sm">{g.nome}</p>
                        {g.descricao && (
                          <p className="text-xs text-slate-400 leading-relaxed">{g.descricao}</p>
                        )}
                        {isGlobalUser && g.eventos?.nome && (
                          <span className="inline-block text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md uppercase tracking-wider">
                            {g.eventos.nome}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(g.id)}
                      className="text-slate-300 hover:text-red-500 p-2 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                      title="Excluir Grupo"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
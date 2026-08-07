import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { 
  Save, Barcode, DollarSign, Palette, Ruler, 
  Plus, Search, Edit2, LayoutGrid, AlertCircle, 
  Package, CheckCircle2, List, Landmark, Globe
} from 'lucide-react';
import { useEventContext } from './contexts/EventContext';

export function CadastroProdutoView() {
  const [isListView, setIsListView] = useState(false);
  const [produtos, setProdutos] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });
  const [editingId, setEditingId] = useState(null);
  const { eventos, eventoSelecionado } = useEventContext();
  const [selectedTargetEvent, setSelectedTargetEvent] = useState('');
  const [filtroEvento, setFiltroEvento] = useState('todos');
  
  const isGlobalUser = eventos && eventos.length > 1;
  const [cadastrarTodosEventos, setCadastrarTodosEventos] = useState(false);

  useEffect(() => {
    if (eventoSelecionado) {
      setSelectedTargetEvent(eventoSelecionado.id);
    }
  }, [eventoSelecionado]);
  
  const [formData, setFormData] = useState({
    nome: '',
    codigo_barras: '',
    preco: '',
    cor: '',
    tamanho: '',
    status: 'Ativo',
    grupo_id: '' // Novo campo
  });

  // Carregar dados iniciais
  useEffect(() => {
    if (!eventoSelecionado) return;
    fetchGrupos();
    if (isListView) fetchProdutos();
  }, [isListView, eventoSelecionado, filtroEvento]);

  async function fetchGrupos() {
    const { data } = await supabase.from('grupos').select('id, nome').eq('evento_id', eventoSelecionado.id).order('nome');
    if (data) setGrupos(data);
  }

  async function fetchProdutos() {
    setFetching(true);
    if (isGlobalUser && filtroEvento === 'todos') {
      const ids = eventos.map(e => e.id);
      const { data } = await supabase
        .from('produtos')
        .select('*, grupos(nome), eventos(nome)')
        .in('evento_id', ids)
        .order('created_at', { ascending: false });
      if (data) setProdutos(data);
    } else {
      const eventoId = filtroEvento !== 'todos' ? filtroEvento : eventoSelecionado?.id;
      if (!eventoId) { setFetching(false); return; }
      const { data } = await supabase
        .from('produtos')
        .select('*, grupos(nome), eventos(nome)')
        .eq('evento_id', eventoId)
        .order('created_at', { ascending: false });
      if (data) setProdutos(data);
    }
    setFetching(false);
  }

  const handleEdit = (produto) => {
    setEditingId(produto.id);
    setFormData({
      nome: produto.nome,
      codigo_barras: produto.codigo_barras || '',
      preco: produto.preco,
      cor: produto.cor || '',
      tamanho: produto.tamanho || '',
      status: produto.status,
      grupo_id: produto.grupo_id || ''
    });
    setIsListView(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMensagem({ tipo: '', texto: '' });

    const basePayload = { 
      ...formData, 
      grupo_id: formData.grupo_id === "" ? null : formData.grupo_id,
      sincronizado_nuvem: false,
    };

    try {
      if (editingId) {
        // Edição: sempre salva no evento original do produto
        const { error } = await supabase.from('produtos').update({
          ...basePayload,
          evento_id: selectedTargetEvent || eventoSelecionado.id
        }).eq('id', editingId);
        if (error) throw error;
        setMensagem({ tipo: 'sucesso', texto: 'Produto atualizado com sucesso!' });
      } else if (isGlobalUser && cadastrarTodosEventos) {
        // Cadastrar para TODOS os eventos
        const payloads = eventos.map(ev => ({ ...basePayload, evento_id: ev.id }));
        const { error } = await supabase.from('produtos').insert(payloads);
        if (error) throw error;
        setMensagem({ tipo: 'sucesso', texto: `Produto cadastrado em ${eventos.length} eventos com sucesso!` });
      } else {
        // Cadastrar para evento específico
        const targetEventId = selectedTargetEvent || eventoSelecionado.id;
        const { error } = await supabase.from('produtos').insert([{ ...basePayload, evento_id: targetEventId }]);
        if (error) throw error;
        setMensagem({ tipo: 'sucesso', texto: 'Produto cadastrado com sucesso!' });
      }

      // Limpar formulário
      setFormData({ nome: '', codigo_barras: '', preco: '', cor: '', tamanho: '', status: 'Ativo', grupo_id: '' });
      setEditingId(null);
      setCadastrarTodosEventos(false);
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: 'Erro na operação: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const filteredProdutos = produtos.filter(p => 
    p.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.codigo_barras && p.codigo_barras.includes(searchTerm))
  );

  return (
    <div className="space-y-6">
      {/* Header com Toggle de Visão */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Package className="text-red-600" /> Cadastro de Produtos
          </h2>
          <p className="text-slate-500 text-sm">Controle de inventário e categorias</p>
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
            <h3 className="font-bold text-slate-700 uppercase text-xs tracking-widest">
              {editingId ? 'Informações do Produto' : 'Cadastro de Novo Item'}
            </h3>
            {eventoSelecionado && (
              <span className="text-[10px] font-bold px-2.5 py-1 bg-red-100 text-red-700 rounded-lg uppercase tracking-wider border border-red-200 shadow-sm">
                Evento: {eventoSelecionado.nome}
              </span>
            )}
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Evento Destino / Opção todos os eventos */}
              {isGlobalUser && !editingId && (
                <div className="md:col-span-2 lg:col-span-3 space-y-3">
                  {/* Checkbox: cadastrar para todos */}
                  <label className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl cursor-pointer hover:bg-blue-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={cadastrarTodosEventos}
                      onChange={e => setCadastrarTodosEventos(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                    />
                    <Globe size={16} className="text-blue-500 flex-shrink-0" />
                    <span className="text-sm font-semibold text-blue-700">
                      Cadastrar para todos os eventos ({eventos.length} eventos)
                    </span>
                  </label>

                  {/* Select de evento específico — some quando "todos" está marcado */}
                  {!cadastrarTodosEventos && (
                    <div>
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
                </div>
              )}
              
              <div className="lg:col-span-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">Nome do Produto</label>
                <div className="relative">
                  <Package className="absolute left-3 top-3 text-slate-300" size={18} />
                  <input 
                    required
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                    placeholder="Ex: Camiseta Morada One Branca"
                    value={formData.nome}
                    onChange={e => setFormData({...formData, nome: e.target.value})}
                  />
                </div>
              </div>

              {/* Seleção de Grupo */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">Grupo / Categoria</label>
                <div className="relative">
                  <LayoutGrid className="absolute left-3 top-3 text-slate-300" size={18} />
                  <select 
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all appearance-none cursor-pointer"
                    value={formData.grupo_id}
                    onChange={e => setFormData({...formData, grupo_id: e.target.value})}
                  >
                    <option value="">Sem Grupo</option>
                    {grupos.map(g => (
                      <option key={g.id} value={g.id}>{g.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Código de Barras */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">Código de Barras</label>
                <div className="relative">
                  <Barcode className="absolute left-3 top-3 text-slate-300" size={18} />
                  <input 
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                    placeholder="Opcional"
                    value={formData.codigo_barras}
                    onChange={e => setFormData({...formData, codigo_barras: e.target.value})}
                  />
                </div>
              </div>

              {/* Preço */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">Preço de Venda</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 text-slate-300" size={18} />
                  <input 
                    required
                    type="number"
                    step="0.01"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                    placeholder="0.00"
                    value={formData.preco}
                    onChange={e => setFormData({...formData, preco: e.target.value})}
                  />
                </div>
              </div>

              {/* Cor e Tamanho */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">Cor</label>
                  <div className="relative">
                    <Palette className="absolute left-3 top-3 text-slate-300" size={18} />
                    <input 
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all text-sm"
                      value={formData.cor}
                      onChange={e => setFormData({...formData, cor: e.target.value})}
                    />
                  </div>
                </div>
                <div className="w-24">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">Tam.</label>
                  <div className="relative">
                    <Ruler className="absolute left-3 top-3 text-slate-300" size={18} />
                    <input 
                      className="w-full pl-10 pr-2 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all text-sm uppercase"
                      value={formData.tamanho}
                      onChange={e => setFormData({...formData, tamanho: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 flex justify-end">
              <button 
                type="submit"
                disabled={loading}
                className="bg-red-600 text-white px-10 py-4 rounded-2xl font-bold flex items-center gap-2 hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 disabled:opacity-50"
              >
                {loading ? 'A guardar...' : <><Save size={20} /> {editingId ? 'Atualizar Produto' : 'Finalizar Cadastro'}</>}
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
                placeholder="Pesquisar por nome ou código..."
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
                  <th className="p-4">Produto</th>
                  <th className="p-4">Grupo</th>
                  <th className="p-4">Cor/Tam</th>
                  <th className="p-4 text-right">Preço</th>
                  {isGlobalUser && <th className="p-4">Evento</th>}
                  <th className="p-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {fetching ? (
                  <tr><td colSpan="5" className="p-10 text-center text-slate-400 text-sm">A carregar inventário...</td></tr>
                ) : filteredProdutos.length === 0 ? (
                  <tr><td colSpan="5" className="p-10 text-center text-slate-400 text-sm">Nenhum produto encontrado.</td></tr>
                ) : (
                  filteredProdutos.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="p-4">
                        <div className="font-bold text-slate-800 text-sm">{p.nome}</div>
                        <div className="text-[10px] text-slate-400">{p.codigo_barras || 'Sem código'}</div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${p.grupos ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                          {p.grupos?.nome || 'Geral'}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-slate-600">
                        {p.cor || '-'} / <span className="font-bold">{p.tamanho || '-'}</span>
                      </td>
                      <td className="p-4 text-right font-bold text-slate-800 text-sm">
                        R$ {parseFloat(p.preco).toFixed(2)}
                      </td>
                      {isGlobalUser && (
                        <td className="p-4">
                          <span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase bg-blue-50 text-blue-600">
                            {p.eventos?.nome || '-'}
                          </span>
                        </td>
                      )}
                      <td className="p-4 text-center">
                        <button 
                          onClick={() => handleEdit(p)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Edit2 size={16} />
                        </button>
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
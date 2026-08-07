import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { 
  Search, Edit2, Trash2, Package, AlertTriangle, XCircle, 
  Layers, ChevronDown, Minus, Plus, AlertOctagon, LayoutGrid, Landmark
} from 'lucide-react';
import { useEventContext } from './contexts/EventContext';

export function EstoqueView() {
  const [produtos, setProdutos] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [busca, setBusca] = useState('');
  const [filtroEstoque, setFiltroEstoque] = useState('todos'); // 'todos' | 'baixo' | 'esgotado'
  const [filtroGrupo, setFiltroGrupo] = useState('todos'); // 'todos' | [id_do_grupo]
  const [filtroEvento, setFiltroEvento] = useState('todos');
  const [loading, setLoading] = useState(true);

  // Estados dos modais
  const [modalEdit, setModalEdit] = useState({ isOpen: false, produto: null, novaQtd: 0 });
  const [modalDelete, setModalDelete] = useState({ isOpen: false, produto: null });
  const { eventos, eventoSelecionado } = useEventContext();

  const isGlobalUser = eventos && eventos.length > 1;

  useEffect(() => {
    if (!eventoSelecionado) return;
    carregarDados();
  }, [eventoSelecionado, filtroEvento]);

  async function carregarDados() {
    setLoading(true);
    
    // Busca grupos para o filtro
    let gruposQuery = supabase.from('grupos').select('id, nome').order('nome');
    if (!(isGlobalUser && filtroEvento === 'todos')) {
        const eventoId = filtroEvento !== 'todos' ? filtroEvento : eventoSelecionado?.id;
        gruposQuery = gruposQuery.eq('evento_id', eventoId);
    }
    const { data: gruposData } = await gruposQuery;
    if (gruposData) setGrupos(gruposData);

    // Busca produtos com seus respectivos grupos
    if (isGlobalUser && filtroEvento === 'todos') {
      const ids = eventos.map(e => e.id);
      const { data: produtosData, error: produtosError } = await supabase
        .from('produtos')
        .select('*, grupos(nome), eventos(nome)')
        .in('evento_id', ids)
        .order('id', { ascending: true });

      if (produtosError) {
        console.error("Erro ao buscar estoque:", produtosError);
      } else {
        setProdutos(produtosData || []);
      }
    } else {
      const eventoId = filtroEvento !== 'todos' ? filtroEvento : eventoSelecionado?.id;
      if (!eventoId) { setLoading(false); return; }
      
      const { data: produtosData, error: produtosError } = await supabase
        .from('produtos')
        .select('*, grupos(nome), eventos(nome)')
        .eq('evento_id', eventoId)
        .order('id', { ascending: true });

      if (produtosError) {
        console.error("Erro ao buscar estoque:", produtosError);
      } else {
        setProdutos(produtosData || []);
      }
    }
    setLoading(false);
  }

  // Lógica de Edição
  const abrirModalEdit = (produto) => {
    setModalEdit({ isOpen: true, produto, novaQtd: produto.quantidade });
  };

  const confirmarEdicao = async () => {
    const { produto, novaQtd } = modalEdit;
    const { error } = await supabase
      .from('produtos')
      .update({ quantidade: novaQtd, sincronizado_nuvem: false })
      .eq('id', produto.id);
    
    if (!error) {
      setProdutos(produtos.map(p => p.id === produto.id ? { ...p, quantidade: novaQtd } : p));
      setModalEdit({ isOpen: false, produto: null, novaQtd: 0 });
    }
  };

  // Lógica de Exclusão
  const confirmarExclusao = async () => {
    const { produto } = modalDelete;
    const { error } = await supabase
      .from('produtos')
      .delete().eq('id', produto.id);

    if (!error) {
      setProdutos(produtos.filter(p => p.id !== produto.id));
      setModalDelete({ isOpen: false, produto: null });
    }
  };

  const produtosFiltrados = produtos.filter((p) => {
    const matchBusca = p.nome.toLowerCase().includes(busca.toLowerCase());
    
    const matchEstoque = filtroEstoque === 'baixo'
      ? p.quantidade > 0 && p.quantidade < 5
      : (filtroEstoque === 'esgotado' ? p.quantidade <= 0 : true);

    const matchGrupo = filtroGrupo === 'todos' || String(p.grupo_id) === String(filtroGrupo);

    return matchBusca && matchEstoque && matchGrupo;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <Package className="text-red-600" size={32} /> Estoque de Produtos
          </h2>
          <p className="text-slate-500 text-sm font-medium pl-11">Controle o saldo físico do inventário e alertas de reposição.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total de Itens */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xl shadow-slate-200/30 flex items-center gap-4 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-slate-900"></div>
          <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-700 shadow-inner group-hover:bg-slate-900 group-hover:text-white transition-all duration-300">
            <Package size={22} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total de Itens</p>
            <h4 className="text-2xl font-black text-slate-900 mt-1">{produtos.length}</h4>
          </div>
        </div>

        {/* Unidades Totais */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xl shadow-slate-200/30 flex items-center gap-4 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-red-600"></div>
          <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-600 shadow-inner group-hover:bg-red-600 group-hover:text-white transition-all duration-300">
            <Layers size={22} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Unidades Totais</p>
            <h4 className="text-2xl font-black text-slate-900 mt-1">
              {produtos.reduce((acc, p) => acc + (p.quantidade || 0), 0)}
            </h4>
          </div>
        </div>

        {/* Estoque Baixo */}
        <button 
          onClick={() => setFiltroEstoque(filtroEstoque === 'baixo' ? 'todos' : 'baixo')}
          className={`text-left w-full bg-white rounded-3xl border p-6 shadow-xl shadow-slate-200/30 flex items-center gap-4 relative overflow-hidden group cursor-pointer transition-all ${
            filtroEstoque === 'baixo' ? 'border-amber-300 ring-2 ring-amber-300/30' : 'border-slate-100'
          }`}
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-amber-500"></div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner transition-all duration-300 ${
            filtroEstoque === 'baixo' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-600 group-hover:bg-amber-500 group-hover:text-white'
          }`}>
            <AlertTriangle size={22} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estoque Baixo</p>
            <h4 className="text-2xl font-black text-slate-900 mt-1">
              {produtos.filter(p => p.quantidade > 0 && p.quantidade < 5).length}
            </h4>
          </div>
        </button>

        {/* Esgotados */}
        <button 
          onClick={() => setFiltroEstoque(filtroEstoque === 'esgotado' ? 'todos' : 'esgotado')}
          className={`text-left w-full bg-white rounded-3xl border p-6 shadow-xl shadow-slate-200/30 flex items-center gap-4 relative overflow-hidden group cursor-pointer transition-all ${
            filtroEstoque === 'esgotado' ? 'border-red-300 ring-2 ring-red-300/30' : 'border-slate-100'
          }`}
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner transition-all duration-300 ${
            filtroEstoque === 'esgotado' ? 'bg-red-500 text-white' : 'bg-red-50 text-red-600 group-hover:bg-red-500 group-hover:text-white'
          }`}>
            <XCircle size={22} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sem Estoque</p>
            <h4 className="text-2xl font-black text-slate-900 mt-1">
              {produtos.filter(p => p.quantidade <= 0).length}
            </h4>
          </div>
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-5 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col lg:flex-row gap-4 items-center">
        {/* Campo de Busca */}
        <div className="flex-1 w-full relative group">
          <Search className="absolute left-4 top-4 text-slate-400 group-focus-within:text-red-600 transition-colors" size={20} />
          <input
            type="text"
            placeholder="Pesquisar por nome do produto..."
            className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-red-600/10 focus:border-red-600 outline-none transition-all text-sm font-bold text-slate-700"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        
        {/* Filtro de Status de Estoque */}
        <div className="w-full lg:w-60 relative group">
          <Package className="absolute left-4 top-4 text-slate-400 group-focus-within:text-red-600 transition-colors" size={20} />
          <select 
            className="w-full pl-12 pr-10 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-bold text-slate-700 cursor-pointer appearance-none focus:ring-4 focus:ring-red-600/10 focus:border-red-600 transition-all"
            value={filtroEstoque}
            onChange={(e) => setFiltroEstoque(e.target.value)}
          >
            <option value="todos">Todos os Status</option>
            <option value="baixo">Estoque Baixo</option>
            <option value="esgotado">Esgotados</option>
          </select>
          <div className="absolute right-4 top-4.5 pointer-events-none text-slate-400">
            <ChevronDown size={18} />
          </div>
        </div>

        {/* Filtro de Grupo/Categoria */}
        <div className="w-full lg:w-60 relative group">
          <LayoutGrid className="absolute left-4 top-4 text-slate-400 group-focus-within:text-red-600 transition-colors" size={20} />
          <select 
            className="w-full pl-12 pr-10 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-bold text-slate-700 cursor-pointer appearance-none focus:ring-4 focus:ring-red-600/10 focus:border-red-600 transition-all"
            value={filtroGrupo}
            onChange={(e) => setFiltroGrupo(e.target.value)}
          >
            <option value="todos">Todos os Grupos</option>
            {grupos.map(g => (
              <option key={g.id} value={g.id}>{g.nome}</option>
            ))}
          </select>
          <div className="absolute right-4 top-4.5 pointer-events-none text-slate-400">
            <ChevronDown size={18} />
          </div>
        </div>

        {/* Filtro de Evento */}
        {isGlobalUser && (
          <div className="w-full lg:w-60 relative group">
            <Landmark className="absolute left-4 top-4 text-slate-400 group-focus-within:text-red-600 transition-colors" size={20} />
            <select
              className="w-full pl-12 pr-10 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-bold text-slate-700 cursor-pointer appearance-none focus:ring-4 focus:ring-red-600/10 focus:border-red-600 transition-all"
              value={filtroEvento}
              onChange={(e) => setFiltroEvento(e.target.value)}
            >
              <option value="todos">Todos os Eventos</option>
              {eventos.map(ev => (
                <option key={ev.id} value={ev.id}>{ev.nome}</option>
              ))}
            </select>
            <div className="absolute right-4 top-4.5 pointer-events-none text-slate-400">
              <ChevronDown size={18} />
            </div>
          </div>
        )}
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center gap-3">
            <span className="w-10 h-10 border-4 border-slate-200 border-t-red-600 rounded-full animate-spin"></span>
            <p className="text-slate-400 text-sm font-medium italic">Sincronizando inventário...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Produto</th>
                  <th className="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Grupo</th>
                  <th className="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Cor</th>
                  <th className="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Tamanho</th>
                  <th className="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Preço</th>
                  <th className="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center">Quantidade</th>
                  {isGlobalUser && <th className="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Evento</th>}
                  <th className="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {produtosFiltrados.length > 0 ? (
                  produtosFiltrados.map((p) => {
                    const statusEstoque = p.quantidade <= 0 
                      ? 'esgotado' 
                      : (p.quantidade < 5 ? 'baixo' : 'ok');
                    
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="px-6 py-5 text-sm font-extrabold text-slate-900 group-hover:text-red-600 transition-colors">
                          {p.nome}
                        </td>
                        <td className="px-6 py-5">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                            p.grupos ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {p.grupos?.nome || 'Geral'}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-sm font-semibold text-slate-500">{p.cor || '-'}</td>
                        <td className="px-6 py-5 text-sm font-semibold text-slate-500">{p.tamanho || '-'}</td>
                        <td className="px-6 py-5 text-sm font-bold text-slate-900">
                          {p.preco ? `R$ ${p.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'R$ 0,00'}
                        </td>
                        <td className="px-6 py-5 text-center">
                          {statusEstoque === 'esgotado' && (
                            <span className="bg-red-50 text-red-600 px-3 py-1 rounded-lg text-xs font-extrabold uppercase tracking-wider">
                              Esgotado
                            </span>
                          )}
                          {statusEstoque === 'baixo' && (
                            <span className="bg-amber-50 text-amber-700 px-3 py-1 rounded-lg text-xs font-extrabold uppercase tracking-wider">
                              {p.quantidade} un (Baixo)
                            </span>
                          )}
                          {statusEstoque === 'ok' && (
                            <span className="bg-green-50 text-green-700 px-3 py-1 rounded-lg text-xs font-extrabold uppercase tracking-wider">
                              {p.quantidade} un
                            </span>
                          )}
                        </td>
                        {isGlobalUser && (
                          <td className="px-6 py-5">
                            <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase bg-blue-50 text-blue-600">
                              {p.eventos?.nome || '-'}
                            </span>
                          </td>
                        )}
                        <td className="px-6 py-5 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => abrirModalEdit(p)} 
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                              title="Ajustar Estoque"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button 
                              onClick={() => setModalDelete({ isOpen: true, produto: p })} 
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              title="Excluir Produto"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="7" className="px-8 py-20 text-center text-slate-400">
                      <Package size={48} className="mx-auto mb-4 opacity-20" />
                      <p className="font-bold">Nenhum produto no inventário.</p>
                      <p className="text-sm mt-1">Tente ajustar seus termos ou filtros de busca.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Edição */}
      {modalEdit.isOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                <Edit2 size={20} className="text-red-600" />
                Ajustar Quantidade em Estoque
              </h3>
              <p className="text-xs text-slate-500 mt-1 pl-7">
                Defina o saldo físico do item no estoque.
              </p>
            </div>

            <div className="p-8 space-y-6">
              {/* Detalhes do Produto */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2">
                <h4 className="font-extrabold text-slate-800 text-sm">{modalEdit.produto.nome}</h4>
                <div className="flex gap-4 text-xs font-semibold text-slate-500">
                  <span>Cor: <strong className="text-slate-700">{modalEdit.produto.cor || '-'}</strong></span>
                  <span>Tamanho: <strong className="text-slate-700">{modalEdit.produto.tamanho || '-'}</strong></span>
                </div>
              </div>

              {/* Input de Quantidade */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2.5 ml-1">Quantidade Física</label>
                <div className="flex items-center gap-3">
                  <button 
                    type="button"
                    onClick={() => setModalEdit({ ...modalEdit, novaQtd: Math.max(0, modalEdit.novaQtd - 1) })}
                    className="w-12 h-12 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 rounded-xl flex items-center justify-center transition-all font-black text-lg active:scale-95"
                  >
                    <Minus size={18} />
                  </button>
                  
                  <input 
                    type="number" 
                    min="0"
                    className="flex-1 h-12 text-center bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-red-600/10 focus:border-red-600 outline-none transition-all font-black text-slate-800 text-lg"
                    value={modalEdit.novaQtd}
                    onChange={(e) => setModalEdit({...modalEdit, novaQtd: Math.max(0, parseInt(e.target.value) || 0)})}
                  />

                  <button 
                    type="button"
                    onClick={() => setModalEdit({ ...modalEdit, novaQtd: modalEdit.novaQtd + 1 })}
                    className="w-12 h-12 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 rounded-xl flex items-center justify-center transition-all font-black text-lg active:scale-95"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => setModalEdit({isOpen: false, produto: null, novaQtd: 0})} 
                className="px-6 py-3 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-xl font-bold transition-all text-sm"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmarEdicao} 
                className="px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all text-sm shadow-lg shadow-slate-900/15"
              >
                Confirmar Saldo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Exclusão */}
      {modalDelete.isOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-100 bg-red-50/20">
              <h3 className="font-extrabold text-red-600 text-lg flex items-center gap-2">
                <AlertOctagon size={22} className="text-red-600" />
                Confirmar Exclusão
              </h3>
            </div>

            <div className="p-8 space-y-4">
              <p className="text-slate-600 text-sm leading-relaxed">
                Tem certeza absoluta que deseja excluir o produto <strong className="text-slate-950">{modalDelete.produto.nome}</strong>?
              </p>
              <p className="text-xs text-red-500 font-bold bg-red-50 border border-red-100 p-3.5 rounded-xl">
                Atenção: Esta ação não pode ser desfeita e removerá o produto permanentemente do inventário e de relatórios históricos.
              </p>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => setModalDelete({ isOpen: false, produto: null })} 
                className="px-6 py-3 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-xl font-bold transition-all text-sm"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmarExclusao} 
                className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all text-sm shadow-lg shadow-red-600/20"
              >
                Excluir Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
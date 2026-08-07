import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  CheckSquare, Plus, X, Calendar, Flag, User, MessageSquare,
  AlertTriangle, Clock, ChevronDown, Search, Filter, Edit2,
  Trash2, Eye, MoreVertical, Send, CheckCircle2, Circle,
  ArrowRight, Tag, Users, LayoutGrid, List, Star
} from 'lucide-react';
import Swal from 'sweetalert2';
import { useEventContext } from './contexts/EventContext';

// ─── Constantes visuais ───────────────────────────────────────────────────────

const COLUNAS_STATUS = [
  { id: 'pendente',      label: 'Pendente',      color: 'bg-slate-500',   light: 'bg-slate-50',   border: 'border-slate-300',  dot: 'bg-slate-400'   },
  { id: 'em_progresso',  label: 'Em Progresso',  color: 'bg-blue-500',    light: 'bg-blue-50',    border: 'border-blue-300',   dot: 'bg-blue-500'    },
  { id: 'em_revisao',    label: 'Em Revisão',    color: 'bg-amber-500',   light: 'bg-amber-50',   border: 'border-amber-300',  dot: 'bg-amber-500'   },
  { id: 'concluida',     label: 'Concluída',     color: 'bg-emerald-500', light: 'bg-emerald-50', border: 'border-emerald-300',dot: 'bg-emerald-500' },
  { id: 'cancelada',     label: 'Cancelada',     color: 'bg-red-400',     light: 'bg-red-50',     border: 'border-red-200',    dot: 'bg-red-400'     },
];

const PRIORIDADES = [
  { id: 'baixa',   label: 'Baixa',   color: 'text-emerald-700', bg: 'bg-emerald-100', icon: '▽' },
  { id: 'media',   label: 'Média',   color: 'text-blue-700',    bg: 'bg-blue-100',    icon: '◇' },
  { id: 'alta',    label: 'Alta',    color: 'text-amber-700',   bg: 'bg-amber-100',   icon: '△' },
  { id: 'urgente', label: 'Urgente', color: 'text-red-700',     bg: 'bg-red-100',     icon: '▲' },
];

const INITIAL_FORM = {
  titulo: '', descricao: '', prioridade: 'media', status: 'pendente',
  data_inicio: '', data_vencimento: '', responsaveis: []
};

// ─── Utilitários ──────────────────────────────────────────────────────────────

const getPrioridade = (id) => PRIORIDADES.find(p => p.id === id) || PRIORIDADES[1];
const getColuna    = (id) => COLUNAS_STATUS.find(c => c.id === id) || COLUNAS_STATUS[0];

const isAtrasada = (data_vencimento, status) => {
  if (!data_vencimento || status === 'concluida' || status === 'cancelada') return false;
  return new Date(data_vencimento) < new Date(new Date().toDateString());
};

const iniciaisNome = (nome = '') =>
  nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();

const AVATAR_COLORS = [
  'bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-teal-500'
];
const avatarColor = (nome = '') => AVATAR_COLORS[nome.charCodeAt(0) % AVATAR_COLORS.length];

// ─── Componentes visuais simples ──────────────────────────────────────────────

function Avatar({ nome, size = 'sm' }) {
  const s = size === 'sm' ? 'w-6 h-6 text-[9px]' : 'w-9 h-9 text-xs';
  return (
    <div title={nome} className={`${s} ${avatarColor(nome)} rounded-full flex items-center justify-center text-white font-black flex-shrink-0`}>
      {iniciaisNome(nome)}
    </div>
  );
}

function BadgePrioridade({ prioridade }) {
  const p = getPrioridade(prioridade);
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold ${p.bg} ${p.color}`}>
      {p.icon} {p.label}
    </span>
  );
}

function BadgeStatus({ status }) {
  const c = getColuna(status);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white border ${c.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function TarefasView({ podecriar = false, userId }) {
  const [tarefas, setTarefas]         = useState([]);
  const [usuarios, setUsuarios]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [visao, setVisao]             = useState('kanban'); // 'kanban' | 'lista' | 'minhas'
  const [busca, setBusca]             = useState('');
  const [filtroPrioridade, setFiltroPrioridade] = useState('todas');

  const [modalAberto, setModalAberto] = useState(false);
  const [detalheId, setDetalheId]     = useState(null);
  const [formData, setFormData]       = useState(INITIAL_FORM);
  const [salvando, setSalvando]       = useState(false);

  const [comentarios, setComentarios] = useState([]);
  const [novoComentario, setNovoComentario] = useState('');
  const [enviandoComentario, setEnviandoComentario] = useState(false);
  const { eventoSelecionado } = useEventContext();

  // ── Fetch ──────────────────────────────────────────────────────────────────

  useEffect(() => { 
    if (eventoSelecionado) fetchTudo(); 
  }, [eventoSelecionado]);

  async function fetchTudo() {
    setLoading(true);
    const [{ data: t, error: errT }, { data: u, error: errU }] = await Promise.all([
      supabase.from('tarefas')
        .select('*, tarefas_responsaveis(usuario_id, perfis(id, nome_completo)), tarefas_comentarios(id)')
        .eq('evento_id', eventoSelecionado.id)
        .order('created_at', { ascending: false }),
      supabase.from('perfis').select('id, nome_completo').order('nome_completo')
    ]);
    
    if (errT) {
      console.error("Erro ao buscar tarefas:", errT);
      Swal.fire('Erro', 'Não foi possível carregar as tarefas. ' + errT.message, 'error');
    } else if (t) {
      setTarefas(t);
    }
    
    if (u) setUsuarios(u);
    setLoading(false);
  }

  async function fetchComentarios(tarefaId) {
    const { data } = await supabase
      .from('tarefas_comentarios')
      .select('*, perfis(nome_completo)')
      .eq('tarefa_id', tarefaId)
      .order('created_at', { ascending: true });
    if (data) setComentarios(data);
  }

  // ── Filtragem ──────────────────────────────────────────────────────────────

  const tarefasFiltradas = tarefas.filter(t => {
    const matchBusca = t.titulo.toLowerCase().includes(busca.toLowerCase());
    const matchPrioridade = filtroPrioridade === 'todas' || t.prioridade === filtroPrioridade;
    const matchMinhas = visao !== 'minhas' || t.tarefas_responsaveis?.some(r => r.usuario_id === userId);
    return matchBusca && matchPrioridade && matchMinhas;
  });

  // ── Operações ──────────────────────────────────────────────────────────────

  const abrirNovaTarefa = () => {
    setFormData(INITIAL_FORM);
    setDetalheId(null);
    setModalAberto(true);
  };

  const abrirDetalhe = async (tarefa) => {
    setFormData({
      titulo: tarefa.titulo,
      descricao: tarefa.descricao || '',
      prioridade: tarefa.prioridade,
      status: tarefa.status,
      data_inicio: tarefa.data_inicio || '',
      data_vencimento: tarefa.data_vencimento || '',
      responsaveis: tarefa.tarefas_responsaveis?.map(r => r.usuario_id) || []
    });
    setDetalheId(tarefa.id);
    await fetchComentarios(tarefa.id);
    setModalAberto(true);
  };

  const salvarTarefa = async () => {
    if (!formData.titulo.trim()) {
      Swal.fire('Atenção', 'O título da tarefa é obrigatório.', 'warning'); return;
    }
    setSalvando(true);
    try {
      let tarefaId = detalheId;

      if (detalheId) {
        // Atualização
        const { error: errorUpdate } = await supabase.from('tarefas').update({
          titulo: formData.titulo,
          descricao: formData.descricao,
          prioridade: formData.prioridade,
          status: formData.status,
          data_inicio: formData.data_inicio || null,
          data_vencimento: formData.data_vencimento || null,
        }).eq('id', detalheId);

        if (errorUpdate) throw errorUpdate;

        // Detectar mudança de status para notificar
        const tarefaAntiga = tarefas.find(t => t.id === detalheId);
        if (tarefaAntiga && tarefaAntiga.status !== formData.status) {
          await notificarResponsaveis(detalheId, formData.responsaveis,
            'status_alterado',
            `Status de "${formData.titulo}" alterado para "${getColuna(formData.status).label}"`
          );
        }
      } else {
        // Nova tarefa
        const { data: nova, error: errorInsert } = await supabase.from('tarefas').insert([{
          titulo: formData.titulo,
          descricao: formData.descricao,
          prioridade: formData.prioridade,
          status: formData.status,
          data_inicio: formData.data_inicio || null,
          data_vencimento: formData.data_vencimento || null,
          criado_por: userId,
          evento_id: eventoSelecionado.id
        }]).select().single();

        if (errorInsert) throw errorInsert;
        if (!nova) throw new Error("A tarefa foi inserida, mas não retornou dados. Verifique as políticas de segurança (RLS).");

        tarefaId = nova.id;
      }

      // Atualizar responsáveis
      await supabase.from('tarefas_responsaveis').delete().eq('tarefa_id', tarefaId);
      if (formData.responsaveis.length > 0) {
        await supabase.from('tarefas_responsaveis').insert(
          formData.responsaveis.map(uid => ({ tarefa_id: tarefaId, usuario_id: uid }))
        );
        if (!detalheId) {
          await notificarResponsaveis(tarefaId, formData.responsaveis,
            'nova_tarefa',
            `Você recebeu uma nova tarefa: "${formData.titulo}"`
          );
        }
      }

      await fetchTudo();
      setModalAberto(false);
    } catch (err) {
      Swal.fire('Erro', err.message, 'error');
    } finally { setSalvando(false); }
  };

  const excluirTarefa = async (id) => {
    const { isConfirmed } = await Swal.fire({
      title: 'Excluir tarefa?',
      text: 'Esta ação não pode ser desfeita.',
      icon: 'warning', showCancelButton: true,
      confirmButtonText: 'Excluir', cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444'
    });
    if (!isConfirmed) return;
    await supabase.from('tarefas').delete().eq('id', id);
    setModalAberto(false);
    fetchTudo();
  };

  const atualizarStatusRapido = async (tarefaId, novoStatus) => {
    const tarefa = tarefas.find(t => t.id === tarefaId);
    await supabase.from('tarefas').update({ status: novoStatus }).eq('id', tarefaId);
    if (tarefa) {
      const resp = tarefa.tarefas_responsaveis?.map(r => r.usuario_id) || [];
      await notificarResponsaveis(tarefaId, resp, 'status_alterado',
        `Status de "${tarefa.titulo}" alterado para "${getColuna(novoStatus).label}"`);
    }
    fetchTudo();
  };

  const enviarComentario = async () => {
    if (!novoComentario.trim() || !detalheId) return;
    setEnviandoComentario(true);
    await supabase.from('tarefas_comentarios').insert([{
      tarefa_id: detalheId,
      usuario_id: userId,
      texto: novoComentario.trim()
    }]);
    const tarefa = tarefas.find(t => t.id === detalheId);
    if (tarefa) {
      const resp = tarefa.tarefas_responsaveis?.map(r => r.usuario_id).filter(id => id !== userId) || [];
      await notificarResponsaveis(detalheId, resp, 'comentario',
        `Novo comentário em "${tarefa.titulo}"`);
    }
    setNovoComentario('');
    await fetchComentarios(detalheId);
    setEnviandoComentario(false);
  };

  // ── Notificações ───────────────────────────────────────────────────────────

  async function notificarResponsaveis(tarefaId, responsaveis, tipo, mensagem) {
    if (!responsaveis || responsaveis.length === 0) return;
    await supabase.from('tarefas_notificacoes').insert(
      responsaveis.map(uid => ({ usuario_id: uid, tarefa_id: tarefaId, tipo, mensagem, lida: false }))
    );
  }

  // ── Drag and Drop ──────────────────────────────────────────────────────────

  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination || destination.droppableId === source.droppableId) return;
    await atualizarStatusRapido(draggableId, destination.droppableId);
  };

  // ── Toggle responsável no form ─────────────────────────────────────────────

  const toggleResponsavel = (uid) => {
    setFormData(prev => ({
      ...prev,
      responsaveis: prev.responsaveis.includes(uid)
        ? prev.responsaveis.filter(id => id !== uid)
        : [...prev.responsaveis, uid]
    }));
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Carregando tarefas...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <CheckSquare className="text-red-600" size={32} /> Gestor de Tarefas
          </h2>
          <p className="text-slate-500 text-sm font-medium pl-11">Organize, delegue e acompanhe em tempo real</p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Métricas */}
            <div className="flex gap-3 flex-wrap">
              {COLUNAS_STATUS.slice(0, 4).map(c => {
                const count = tarefas.filter(t => t.status === c.id).length;
                return (
                  <div key={c.id} className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-center shadow-sm">
                    <div className="text-[9px] text-slate-400 uppercase tracking-widest">{c.label}</div>
                    <div className="text-lg font-black text-slate-800">{count}</div>
                  </div>
                );
              })}
            </div>

            {/* Ações */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Visão */}
              <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                {[
                  { id: 'kanban', icon: <LayoutGrid size={14} />, label: 'Board' },
                  { id: 'lista',  icon: <List size={14} />,        label: 'Lista' },
                  { id: 'minhas', icon: <Star size={14} />,        label: 'Minhas' },
                ].map(v => (
                  <button key={v.id} onClick={() => setVisao(v.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                      visao === v.id ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-slate-500 hover:text-slate-800'
                    }`}>
                    {v.icon} {v.label}
                  </button>
                ))}
              </div>

              {podecriar && (
                <button onClick={abrirNovaTarefa}
                  className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-red-600/30 active:scale-95">
                  <Plus size={16} /> Nova Tarefa
                </button>
              )}
            </div>
      </div>
      </div>

      {/* ── Filtros ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
          <input value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar tarefa..."
            className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all" />
        </div>
        <div className="flex items-center gap-2">
          <Flag size={14} className="text-slate-300" />
          <select value={filtroPrioridade} onChange={e => setFiltroPrioridade(e.target.value)}
            className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 cursor-pointer appearance-none">
            <option value="todas">Todas as prioridades</option>
            {PRIORIDADES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
        <div className="text-xs text-slate-400 font-medium ml-auto">
          {tarefasFiltradas.length} tarefa(s)
        </div>
      </div>

      {/* ════════════════ KANBAN ════════════════ */}
      {(visao === 'kanban' || visao === 'minhas') && (
        <DragDropContext onDragEnd={podecriar ? onDragEnd : () => {}}>
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-4 min-w-max">
              {COLUNAS_STATUS.map(coluna => {
                const cartoes = tarefasFiltradas.filter(t => t.status === coluna.id);
                return (
                  <div key={coluna.id} className="w-72 flex-shrink-0">
                    {/* Header da coluna */}
                    <div className={`flex items-center justify-between px-4 py-3 rounded-t-2xl ${coluna.light} border ${coluna.border} border-b-0`}>
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${coluna.dot}`} />
                        <span className="text-xs font-black text-slate-700 uppercase tracking-wider">{coluna.label}</span>
                      </div>
                      <span className="bg-white/70 text-slate-600 text-[10px] font-black px-2 py-0.5 rounded-full">{cartoes.length}</span>
                    </div>

                    <Droppable droppableId={coluna.id}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`min-h-[200px] p-2 rounded-b-2xl border ${coluna.border} border-t-0 transition-colors ${
                            snapshot.isDraggingOver ? `${coluna.light}` : 'bg-slate-50/50'
                          }`}
                        >
                          <div className="space-y-2">
                            {cartoes.map((tarefa, index) => (
                              <KanbanCard
                                key={tarefa.id}
                                tarefa={tarefa}
                                index={index}
                                podecriar={podecriar}
                                onAbrir={() => abrirDetalhe(tarefa)}
                                onExcluir={() => excluirTarefa(tarefa.id)}
                                onAtualizarStatus={(status) => atualizarStatusRapido(tarefa.id, status)}
                              />
                            ))}
                          </div>
                          {provided.placeholder}

                          {/* Botão nova tarefa na coluna */}
                          {podecriar && (
                            <button onClick={() => { setFormData({...INITIAL_FORM, status: coluna.id}); setDetalheId(null); setModalAberto(true); }}
                              className="mt-2 w-full py-2 flex items-center justify-center gap-2 text-xs text-slate-400 hover:text-indigo-600 hover:bg-white border border-dashed border-slate-200 hover:border-indigo-300 rounded-xl transition-all">
                              <Plus size={13} /> Nova tarefa
                            </button>
                          )}
                        </div>
                      )}
                    </Droppable>
                  </div>
                );
              })}
            </div>
          </div>
        </DragDropContext>
      )}

      {/* ════════════════ LISTA ════════════════ */}
      {visao === 'lista' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tarefa</th>
                <th className="text-left px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest hidden sm:table-cell">Status</th>
                <th className="text-left px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest hidden md:table-cell">Prioridade</th>
                <th className="text-left px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest hidden lg:table-cell">Responsáveis</th>
                <th className="text-left px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest hidden lg:table-cell">Prazo</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tarefasFiltradas.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400 text-sm">
                    <CheckSquare size={32} className="mx-auto mb-2 opacity-20" />
                    Nenhuma tarefa encontrada
                  </td>
                </tr>
              )}
              {tarefasFiltradas.map(tarefa => {
                const atrasada = isAtrasada(tarefa.data_vencimento, tarefa.status);
                const nomes = tarefa.tarefas_responsaveis?.map(r => r.perfis?.nome_completo).filter(Boolean) || [];
                return (
                  <tr key={tarefa.id}
                    className="hover:bg-slate-50/60 cursor-pointer transition-colors"
                    onClick={() => abrirDetalhe(tarefa)}>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-800 text-sm">{tarefa.titulo}</div>
                      {tarefa.descricao && (
                        <div className="text-xs text-slate-400 truncate max-w-[220px]">{tarefa.descricao}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell"><BadgeStatus status={tarefa.status} /></td>
                    <td className="px-4 py-3 hidden md:table-cell"><BadgePrioridade prioridade={tarefa.prioridade} /></td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex -space-x-1">
                        {nomes.slice(0, 4).map((n, i) => <Avatar key={i} nome={n} />)}
                        {nomes.length > 4 && (
                          <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-[9px] font-black text-slate-600">+{nomes.length - 4}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {tarefa.data_vencimento ? (
                        <span className={`text-xs font-bold flex items-center gap-1 ${atrasada ? 'text-red-600' : 'text-slate-500'}`}>
                          {atrasada && <AlertTriangle size={11} />}
                          {new Date(tarefa.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end text-slate-300">
                        <MessageSquare size={13} />
                        <span className="text-[10px] font-bold">{tarefa.tarefas_comentarios?.length || 0}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ════════════════ MODAL ════════════════ */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setModalAberto(false); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
              <h3 className="font-black text-slate-900 text-base">
                {detalheId ? (podecriar ? 'Editar Tarefa' : 'Detalhes da Tarefa') : 'Nova Tarefa'}
              </h3>
              <div className="flex items-center gap-2">
                {podecriar && detalheId && (
                  <button onClick={() => excluirTarefa(detalheId)}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                    <Trash2 size={16} />
                  </button>
                )}
                <button onClick={() => setModalAberto(false)}
                  className="p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto flex-1 p-6 space-y-5">

              {/* Título */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Título *</label>
                <input value={formData.titulo} onChange={e => setFormData({...formData, titulo: e.target.value})}
                  disabled={!podecriar}
                  placeholder="Descreva a tarefa brevemente..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all disabled:opacity-70 disabled:cursor-not-allowed" />
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Descrição</label>
                <textarea value={formData.descricao} onChange={e => setFormData({...formData, descricao: e.target.value})}
                  disabled={!podecriar}
                  rows={3} placeholder="Instruções, contexto, links relevantes..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 resize-none transition-all disabled:opacity-70 disabled:cursor-not-allowed" />
              </div>

              {/* Status + Prioridade */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Status</label>
                  <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 cursor-pointer appearance-none">
                    {COLUNAS_STATUS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Prioridade</label>
                  <select value={formData.prioridade} onChange={e => setFormData({...formData, prioridade: e.target.value})}
                    disabled={!podecriar}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-red-600 cursor-pointer appearance-none disabled:opacity-70 disabled:cursor-not-allowed">
                    {PRIORIDADES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Datas */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Data de Início</label>
                  <input type="date" value={formData.data_inicio} onChange={e => setFormData({...formData, data_inicio: e.target.value})}
                    disabled={!podecriar}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-red-600 disabled:opacity-70 disabled:cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Data de Vencimento</label>
                  <input type="date" value={formData.data_vencimento} onChange={e => setFormData({...formData, data_vencimento: e.target.value})}
                    disabled={!podecriar}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-red-600 disabled:opacity-70 disabled:cursor-not-allowed" />
                </div>
              </div>

              {/* Responsáveis */}
              {podecriar && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                    Responsáveis ({formData.responsaveis.length} selecionado(s))
                  </label>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto scrollbar-hide pr-1">
                    {usuarios.map(u => {
                      const sel = formData.responsaveis.includes(u.id);
                      return (
                        <button key={u.id} type="button" onClick={() => toggleResponsavel(u.id)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-left text-sm transition-all ${
                            sel ? 'border-red-400 bg-red-50 text-red-800' : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                          }`}>
                          <Avatar nome={u.nome_completo} />
                          <span className="font-medium truncate text-xs flex-1">{u.nome_completo}</span>
                          {sel && <CheckCircle2 size={14} className="text-red-500 flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Responsáveis (modo somente leitura) */}
              {!podecriar && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Responsáveis</label>
                  <div className="flex flex-wrap gap-2">
                    {(tarefas.find(t => t.id === detalheId)?.tarefas_responsaveis || []).map((r, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-xl">
                        <Avatar nome={r.perfis?.nome_completo} />
                        <span className="text-xs font-medium text-slate-700">{r.perfis?.nome_completo}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Comentários (só no modo edição/detalhe) */}
              {detalheId && (
                <div className="border-t border-slate-100 pt-4">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <MessageSquare size={12} /> Comentários ({comentarios.length})
                  </label>

                  {comentarios.length === 0 && (
                    <p className="text-xs text-slate-400 italic mb-3">Nenhum comentário ainda.</p>
                  )}
                  <div className="space-y-3 max-h-48 overflow-y-auto scrollbar-hide mb-3">
                    {comentarios.map(c => (
                      <div key={c.id} className="flex gap-2.5">
                        <Avatar nome={c.perfis?.nome_completo || '?'} />
                        <div className="flex-1 bg-slate-50 rounded-xl px-3 py-2.5">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-black text-slate-700">{c.perfis?.nome_completo || 'Usuário'}</span>
                            <span className="text-[9px] text-slate-400">
                              {new Date(c.created_at).toLocaleString('pt-BR')}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed">{c.texto}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Input comentário */}
                  <div className="relative flex gap-2">
                    <input value={novoComentario} onChange={e => setNovoComentario(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarComentario(); }}}
                      placeholder="Escreva uma observação..."
                      className="flex-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all" />
                    <button onClick={enviarComentario} disabled={enviandoComentario || !novoComentario.trim()}
                      className="absolute right-2 top-2 p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all shadow-md active:scale-95 disabled:opacity-50">
                      <Send size={15} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end gap-3 flex-shrink-0">
              <button onClick={() => setModalAberto(false)}
                className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-100 transition-all">
                {podecriar ? 'Cancelar' : 'Fechar'}
              </button>
              {podecriar && (
                <button onClick={salvarTarefa} disabled={salvando}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-red-600/30 active:scale-95 flex items-center justify-center gap-2">
                  {salvando ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Salvando...</>
                  ) : (
                    <><CheckCircle2 size={15} /> {detalheId ? 'Salvar Alterações' : 'Criar Tarefa'}</>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Card Kanban ──────────────────────────────────────────────────────────────

function KanbanCard({ tarefa, index, podecriar, onAbrir, onExcluir, onAtualizarStatus }) {
  const atrasada = isAtrasada(tarefa.data_vencimento, tarefa.status);
  const nomes = tarefa.tarefas_responsaveis?.map(r => r.perfis?.nome_completo).filter(Boolean) || [];
  const nComentarios = tarefa.tarefas_comentarios?.length || 0;

  return (
    <Draggable draggableId={tarefa.id} index={index} isDragDisabled={!podecriar}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onAbrir}
          className={`bg-white rounded-xl border border-slate-200 p-3 cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 group ${
            snapshot.isDragging ? 'shadow-xl rotate-1 scale-105' : ''
          } ${atrasada ? 'border-l-4 border-l-red-400' : ''}`}
        >
          {/* Prioridade + ação */}
          <div className="flex items-center justify-between mb-2">
            <BadgePrioridade prioridade={tarefa.prioridade} />
            {podecriar && (
              <button onClick={e => { e.stopPropagation(); onExcluir(); }}
                className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500 rounded-lg transition-all">
                <Trash2 size={12} />
              </button>
            )}
          </div>

          {/* Título */}
          <p className="font-bold text-slate-800 text-sm leading-snug mb-2">{tarefa.titulo}</p>

          {/* Descrição */}
          {tarefa.descricao && (
            <p className="text-[11px] text-slate-400 leading-relaxed mb-2 line-clamp-2">{tarefa.descricao}</p>
          )}

          {/* Footer do card */}
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
            {/* Avatares */}
            <div className="flex -space-x-1">
              {nomes.slice(0, 3).map((n, i) => <Avatar key={i} nome={n} />)}
              {nomes.length > 3 && (
                <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-[9px] font-black text-slate-600 border border-white">
                  +{nomes.length - 3}
                </div>
              )}
              {nomes.length === 0 && (
                <span className="text-[10px] text-slate-300 italic">Sem responsável</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {atrasada && <AlertTriangle size={12} className="text-red-500" />}
              {tarefa.data_vencimento && !atrasada && (
                <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                  <Calendar size={10} />
                  {new Date(tarefa.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                </span>
              )}
              {nComentarios > 0 && (
                <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                  <MessageSquare size={10} /> {nComentarios}
                </span>
              )}
            </div>
          </div>

          {/* Ações Rápidas de Status */}
          { (tarefa.status === 'pendente' || tarefa.status === 'em_progresso' || tarefa.status === 'em_revisao') && (
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
               {tarefa.status === 'pendente' && (
                 <button onClick={(e) => { e.stopPropagation(); onAtualizarStatus('em_progresso'); }} 
                   className="flex-1 py-1.5 text-[10px] font-bold bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">
                   Iniciar Tarefa
                 </button>
               )}
               {tarefa.status === 'em_progresso' && (
                 <button onClick={(e) => { e.stopPropagation(); onAtualizarStatus('concluida'); }} 
                   className="flex-1 py-1.5 text-[10px] font-bold bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors">
                   Finalizar Tarefa
                 </button>
               )}
               {tarefa.status === 'em_revisao' && (
                 <button onClick={(e) => { e.stopPropagation(); onAtualizarStatus('concluida'); }} 
                   className="flex-1 py-1.5 text-[10px] font-bold bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors">
                   Aprovar
                 </button>
               )}
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}

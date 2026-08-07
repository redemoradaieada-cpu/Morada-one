import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import { Utensils, CheckCircle, Clock, AlertTriangle, Play, Volume2, VolumeX } from 'lucide-react';
import Swal from 'sweetalert2';
import { useEventContext } from './contexts/EventContext';

export function PainelCozinhaView() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [audioAtivo, setAudioAtivo] = useState(false);
  const pedidosAnterioresRef = useRef([]);
  const { eventoSelecionado } = useEventContext();

  useEffect(() => {
    if (!eventoSelecionado) return;
    fetchPedidos();

    const intervalId = setInterval(() => {
      fetchPedidos();
    }, 10000);

    const channel = supabase
      .channel('vendas-cozinha')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendas' }, () => {
        fetchPedidos();
      })
      .subscribe();

    return () => {
      clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [eventoSelecionado]);

  async function fetchPedidos() {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('vendas')
      .select('*, itens_venda(produto_id, nome, quantidade)')
      .neq('status', 'cancelada')
      .neq('status_cozinha', 'entregue')
      .not('status_cozinha', 'is', null)
      .eq('evento_id', eventoSelecionado.id)
      .gte('created_at', hoje.toISOString())
      .order('created_at', { ascending: true });

    if (!error && data) {
      setPedidos(data);
    }
    setLoading(false);
  }

  const atualizarStatus = async (id, novoStatus) => {
    const { error } = await supabase
      .from('vendas')
      .update({ status_cozinha: novoStatus })
      .eq('id', id);

    if (error) {
      Swal.fire("Erro", 'Erro ao atualizar status: ' + error.message, "error");
    } else {
      fetchPedidos();
    }
  };

  useEffect(() => {
    if (audioAtivo) {
      const pedidosPendentes = pedidos.filter(p => p.status_cozinha === 'pendente');
      const novosPedidos = pedidosPendentes.filter(p => !pedidosAnterioresRef.current.includes(p.id));
      novosPedidos.forEach(p => tocarAlertaNovoPedido(p));
      pedidosAnterioresRef.current = pedidosPendentes.map(p => p.id);
    } else {
      pedidosAnterioresRef.current = pedidos.filter(p => p.status_cozinha === 'pendente').map(p => p.id);
    }
  }, [pedidos, audioAtivo]);

  const tocarAlertaNovoPedido = (pedido) => {
    if (!window.speechSynthesis) return;
    const texto = `Novo pedido, senha ${pedido.senha_pedido_praca}.`;
    const fala = new SpeechSynthesisUtterance(texto);
    fala.lang = 'pt-BR';
    fala.rate = 1.1;
    window.speechSynthesis.speak(fala);
  };

  if (loading) {
    return <div className="p-10 text-center text-slate-500">Carregando pedidos...</div>;
  }

  return (
    <div className="space-y-4 md:space-y-6">

      {/* ── Header ── */}
      <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

          {/* Título */}
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-red-500/10 rounded-xl flex items-center justify-center border border-red-500/20 flex-shrink-0">
              <Utensils size={22} className="text-red-500" />
            </div>
            <div>
              <h2 className="text-lg md:text-2xl font-black text-slate-900 tracking-tight">Painel de Separação</h2>
              <p className="text-slate-500 text-xs md:text-sm">Praça de Alimentação</p>
            </div>
          </div>

          {/* Controles */}
          <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6">
            <button
              onClick={() => setAudioAtivo(!audioAtivo)}
              className={`flex items-center gap-2 px-3 py-2 md:px-4 rounded-xl text-sm font-bold transition-all shadow-sm ${
                audioAtivo
                  ? 'bg-red-50 text-red-600 border border-red-200'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {audioAtivo ? <Volume2 size={16} /> : <VolumeX size={16} />}
              <span>{audioAtivo ? 'Som Ativado' : 'Ativar Som'}</span>
            </button>

            <div className="text-right">
              <div className="text-2xl md:text-3xl font-black text-red-600">{pedidos.length}</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Fila Total</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Contadores por status ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Pendentes',  status: 'pendente',   color: 'bg-slate-100 text-slate-700',     dot: 'bg-slate-400'   },
          { label: 'Preparando', status: 'preparando', color: 'bg-orange-100 text-orange-700',   dot: 'bg-orange-500'  },
          { label: 'Prontos',    status: 'pronto',     color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
        ].map(({ label, status, color, dot }) => {
          const count = pedidos.filter(p => p.status_cozinha === status).length;
          return (
            <div key={status} className={`rounded-2xl p-3 md:p-4 flex items-center gap-3 ${color}`}>
              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dot}`} />
              <div>
                <div className="text-xl md:text-2xl font-black">{count}</div>
                <div className="text-[10px] font-bold uppercase tracking-wider opacity-70">{label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Cards de pedidos ── */}
      {pedidos.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-10 md:p-16 text-center">
          <CheckCircle size={48} className="mx-auto mb-4 text-emerald-400 opacity-50" />
          <h3 className="text-lg font-bold text-slate-700">Nenhum pedido na fila!</h3>
          <p className="text-slate-500 text-sm">Aguarde novas vendas no PDV.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
          {pedidos.map(pedido => {
            const isPendente   = pedido.status_cozinha === 'pendente';
            const isPreparando = pedido.status_cozinha === 'preparando';
            const isPronto     = pedido.status_cozinha === 'pronto';
            const minutosEspera = Math.floor((new Date() - new Date(pedido.created_at)) / 60000);
            const urgente = minutosEspera > 10;

            return (
              <div
                key={pedido.id}
                className={`bg-white rounded-2xl shadow-sm border-2 overflow-hidden flex flex-col transition-all ${
                  isPronto     ? 'border-emerald-300 shadow-emerald-100' :
                  isPreparando ? 'border-orange-300 shadow-orange-100'  :
                  urgente      ? 'border-red-300 shadow-red-50'         :
                  'border-slate-200'
                }`}
              >
                {/* Card Header */}
                <div className={`p-4 border-b flex justify-between items-center ${
                  isPronto     ? 'bg-emerald-50 border-emerald-100' :
                  isPreparando ? 'bg-orange-50 border-orange-100'   :
                  'bg-slate-50 border-slate-100'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center font-black shadow-inner text-lg md:text-xl flex-shrink-0 ${
                      isPronto     ? 'bg-emerald-500 text-white' :
                      isPreparando ? 'bg-orange-500 text-white'  :
                      'bg-slate-200 text-slate-700'
                    }`}>
                      {pedido.senha_pedido_praca}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Cliente</div>
                      <div className="font-bold text-slate-800 leading-none text-sm md:text-base truncate max-w-[140px]">
                        {pedido.cliente_nome_praca || 'Sem nome'}
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0 ml-2">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Espera</div>
                    <div className={`text-sm font-black ${urgente ? 'text-red-500' : 'text-slate-600'}`}>
                      {minutosEspera} min
                    </div>
                    {urgente && (
                      <div className="text-[9px] text-red-500 font-bold flex items-center gap-1 justify-end mt-0.5">
                        <AlertTriangle size={10} /> Urgente
                      </div>
                    )}
                  </div>
                </div>

                {/* Itens do Pedido */}
                <div className="p-4 flex-1">
                  <ul className="space-y-2">
                    {pedido.itens_venda?.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <span className="bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded text-sm flex-shrink-0">
                          {item.quantidade}x
                        </span>
                        <span className="font-medium text-slate-700 text-sm leading-snug">{item.nome}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Botões de Ação */}
                <div className="p-3 md:p-4 bg-slate-50 border-t border-slate-100 grid grid-cols-2 gap-2">
                  {isPendente && (
                    <button
                      onClick={() => atualizarStatus(pedido.id, 'preparando')}
                      className="col-span-2 py-3.5 bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm"
                    >
                      <Play size={16} /> Iniciar Preparo
                    </button>
                  )}

                  {isPreparando && (
                    <>
                      <button
                        onClick={() => atualizarStatus(pedido.id, 'pendente')}
                        className="py-3.5 bg-white border border-slate-200 hover:bg-slate-100 active:scale-[0.98] text-slate-600 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
                      >
                        Voltar
                      </button>
                      <button
                        onClick={() => atualizarStatus(pedido.id, 'pronto')}
                        className="py-3.5 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm"
                      >
                        <CheckCircle size={16} /> Pronto
                      </button>
                    </>
                  )}

                  {isPronto && (
                    <button
                      onClick={() => atualizarStatus(pedido.id, 'entregue')}
                      className="col-span-2 py-3.5 bg-slate-800 hover:bg-slate-900 active:scale-[0.98] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm"
                    >
                      <Clock size={16} /> Marcar como Entregue
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

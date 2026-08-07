import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { CheckSquare, X, Bell, BellOff, ExternalLink, AlertTriangle, ChevronRight } from 'lucide-react';

const INTERVALO_REEXIBIR_MS = 5 * 60 * 1000; // 5 minutos

// Cores por tipo de notificação
const TIPO_CONFIG = {
  nova_tarefa:      { label: 'Nova Tarefa',        cor: 'bg-indigo-500',  icon: '📋' },
  status_alterado:  { label: 'Status Alterado',     cor: 'bg-blue-500',    icon: '🔄' },
  comentario:       { label: 'Novo Comentário',     cor: 'bg-amber-500',   icon: '💬' },
  prazo_proximo:    { label: 'Prazo se Aproximando',cor: 'bg-red-500',     icon: '⏰' },
};

export function NotificacoesManager({ userId, onNavigateTarefas }) {
  const [notificacoes, setNotificacoes]   = useState([]);
  const [bannerVisivel, setBannerVisivel] = useState(false);
  const [toastAtual, setToastAtual]       = useState(null);
  const [pushPermitido, setPushPermitido] = useState(false);
  const timerRef = useRef(null);
  const reexibirTimerRef = useRef(null);

  // ── Solicitar permissão de push ao montar ──────────────────────────────────
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(perm => {
        setPushPermitido(perm === 'granted');
      });
    } else if ('Notification' in window) {
      setPushPermitido(Notification.permission === 'granted');
    }
  }, []);

  // ── Buscar notificações não lidas ──────────────────────────────────────────
  const fetchNotificacoes = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('tarefas_notificacoes')
      .select('*')
      .eq('usuario_id', userId)
      .eq('lida', false)
      .order('created_at', { ascending: false });
    
    if (data && data.length > 0) {
      setNotificacoes(data);
      setBannerVisivel(true);
    } else {
      setNotificacoes([]);
      setBannerVisivel(false);
    }
  }, [userId]);

  // ── Polling inicial e a cada 5 min para reexibir ───────────────────────────
  useEffect(() => {
    if (!userId) return;
    fetchNotificacoes();

    // Reexibe a cada 5 minutos se ainda houver não lidas
    reexibirTimerRef.current = setInterval(() => {
      fetchNotificacoes();
    }, INTERVALO_REEXIBIR_MS);

    return () => clearInterval(reexibirTimerRef.current);
  }, [fetchNotificacoes, userId]);

  // ── Realtime: escuta novas notificações em tempo real ─────────────────────
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notificacoes-user-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'tarefas_notificacoes',
        filter: `usuario_id=eq.${userId}`
      }, (payload) => {
        const nova = payload.new;
        const cfg = TIPO_CONFIG[nova.tipo] || TIPO_CONFIG.nova_tarefa;

        // Toast pop-up imediato
        setToastAtual({ ...nova, cfg });
        setTimeout(() => setToastAtual(null), 6000);

        // Banner
        setNotificacoes(prev => [nova, ...prev]);
        setBannerVisivel(true);

        // Push nativo (mobile / desktop)
        enviarPushNativo(nova.mensagem, cfg);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [userId, pushPermitido]);

  // ── Push nativo estilo iFood ───────────────────────────────────────────────
  function enviarPushNativo(mensagem, cfg) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try {
      const n = new Notification(`${cfg.icon} Morada One — Tarefas`, {
        body: mensagem,
        icon: '/imagens/logo.png',
        badge: '/imagens/logo.png',
        tag: 'morada-tarefas',       // Agrupa notificações no mobile
        renotify: true,              // Re-exibe mesmo com mesma tag
        vibrate: [200, 100, 200],    // Vibração (mobile)
        requireInteraction: false,
      });
      n.onclick = () => {
        window.focus();
        onNavigateTarefas?.();
        n.close();
      };
    } catch (e) {
      // Silencia erros de push (ex: iframe)
    }
  }

  // ── Marcar como lidas ─────────────────────────────────────────────────────
  const marcarComoLidas = async () => {
    if (notificacoes.length === 0) return;
    const ids = notificacoes.map(n => n.id);
    await supabase
      .from('tarefas_notificacoes')
      .update({ lida: true })
      .in('id', ids);
    setNotificacoes([]);
    setBannerVisivel(false);
  };

  const abrirTarefas = () => {
    marcarComoLidas();
    onNavigateTarefas?.();
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Banner fixo no topo (dentro do layout) ── */}
      {bannerVisivel && notificacoes.length > 0 && (
        <div className="mx-auto mb-4 max-w-7xl animate-in slide-in-from-top-3 duration-400">
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-2xl px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-3 shadow-lg shadow-indigo-500/20">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Bell size={18} className="text-white animate-bounce" />
              </div>
              <div className="min-w-0">
                <p className="text-white font-black text-sm">
                  {notificacoes.length} notificação{notificacoes.length > 1 ? 'ões' : ''} não lida{notificacoes.length > 1 ? 's' : ''}
                </p>
                <p className="text-indigo-200 text-xs truncate">
                  {notificacoes[0]?.mensagem}
                  {notificacoes.length > 1 && ` e mais ${notificacoes.length - 1}...`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={abrirTarefas}
                className="flex items-center gap-1.5 px-4 py-2 bg-white text-indigo-700 rounded-xl text-xs font-black hover:bg-indigo-50 transition-all active:scale-95">
                Ver Tarefas <ChevronRight size={13} />
              </button>
              <button onClick={marcarComoLidas}
                className="p-2 text-indigo-300 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                title="Marcar como lidas">
                <X size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast pop-up (canto inferior direito) ── */}
      {toastAtual && (
        <div
          className="fixed bottom-6 right-6 z-[100] w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-4 duration-300"
          style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}
        >
          {/* Barra colorida por tipo */}
          <div className={`h-1 w-full ${toastAtual.cfg?.cor || 'bg-indigo-500'}`} />

          <div className="p-4 flex gap-3">
            <div className={`w-10 h-10 ${toastAtual.cfg?.cor || 'bg-indigo-500'} rounded-xl flex items-center justify-center text-lg flex-shrink-0`}>
              {toastAtual.cfg?.icon || '📋'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {toastAtual.cfg?.label || 'Notificação'}
                </p>
                <button onClick={() => setToastAtual(null)}
                  className="text-slate-300 hover:text-slate-600 transition-colors flex-shrink-0">
                  <X size={13} />
                </button>
              </div>
              <p className="text-sm font-bold text-slate-800 leading-snug">{toastAtual.mensagem}</p>
              <button onClick={abrirTarefas}
                className="mt-2 text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors">
                Abrir tarefas <ExternalLink size={11} />
              </button>
            </div>
          </div>

          {/* Barra de progresso (auto-dismiss 6s) */}
          <div className="h-0.5 bg-slate-100">
            <div className={`h-full ${toastAtual.cfg?.cor || 'bg-indigo-500'} opacity-40 animate-[shrink_6s_linear_forwards]`}
              style={{ animation: 'tarefaToastProgress 6s linear forwards' }} />
          </div>
        </div>
      )}
    </>
  );
}

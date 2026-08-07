import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import { Volume2, VolumeX } from 'lucide-react';

export function PainelClienteView() {
  const [preparando, setPreparando] = useState([]);
  const [prontos, setProntos] = useState([]);
  const [audioAtivo, setAudioAtivo] = useState(false);
  const [eventoAtivoId, setEventoAtivoId] = useState(null);
  const prontosAnterioresRef = useRef([]);

  useEffect(() => {
    let evtId = null;

    async function init() {
      const { data: evt } = await supabase
        .from('eventos')
        .select('id')
        .eq('status', 'ativo')
        .limit(1)
        .maybeSingle();
      
      if (evt) {
        evtId = evt.id;
        setEventoAtivoId(evt.id);
        fetchPedidos(evt.id);
      }
    }

    init();

    const intervalId = setInterval(() => {
      if (evtId) fetchPedidos(evtId);
    }, 10000); // Atualiza a cada 10 segundos

    const channel = supabase
      .channel('vendas-cliente')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendas' }, payload => {
        if (evtId) fetchPedidos(evtId); 
      })
      .subscribe();

    return () => {
      clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchPedidos(eventId) {
    if (!eventId) return;
    const hoje = new Date();
    hoje.setHours(0,0,0,0);

    const { data, error } = await supabase
      .from('vendas')
      .select('id, cliente_nome_praca, senha_pedido_praca, status_cozinha')
      .eq('evento_id', eventId)
      .neq('status', 'cancelada')
      .in('status_cozinha', ['pendente', 'preparando', 'pronto'])
      .gte('created_at', hoje.toISOString())
      .order('created_at', { ascending: true });

    if (!error && data) {
      setPreparando(data.filter(p => p.status_cozinha === 'pendente' || p.status_cozinha === 'preparando'));
      setProntos(data.filter(p => p.status_cozinha === 'pronto'));
    }
  }

  // Efeito dedicado para monitorar mudanças nos pedidos prontos e disparar o áudio
  useEffect(() => {
    if (audioAtivo) {
      // Descobre quem são os novos "prontos" que não estavam na lista de referência
      const novosParaTocar = prontos.filter(p => !prontosAnterioresRef.current.includes(p.id));
      
      novosParaTocar.forEach(p => {
        falarNome(p);
      });
      
      // Atualiza a referência com a lista atual
      prontosAnterioresRef.current = prontos.map(p => p.id);
    } else {
      // Se o áudio estiver desligado, apenas mantemos a referência atualizada em silêncio
      prontosAnterioresRef.current = prontos.map(p => p.id);
    }
  }, [prontos, audioAtivo]);

  const falarNome = (pedido) => {
    if (!window.speechSynthesis) return;
    
    window.speechSynthesis.cancel(); // Evita sobrepor muitas vozes seguidas
    
    const nome = pedido.cliente_nome_praca || 'Cliente';
    const texto = `Atenção. Senha ${pedido.senha_pedido_praca}. Pedido de ${nome}, pronto para retirar.`;
    
    const fala = new SpeechSynthesisUtterance(texto);
    fala.lang = 'pt-BR';
    fala.rate = 0.9;
    
    window.speechSynthesis.speak(fala);
  };

  // Garante que os mais recentes prontos fiquem no topo
  const prontosOrdenados = [...prontos].reverse(); 
  const todosPedidos = [...prontosOrdenados, ...preparando];

  return (
    <div className="bg-slate-50 min-h-screen flex flex-col font-sans p-6 md:p-10">
      
      {/* HEADER IDENTIDADE MORADA (Igual ao PDV) */}
      <div className="bg-white rounded-[2rem] py-6 px-10 border border-slate-100 shadow-xl shadow-slate-200/50 flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-4">
            <span className="relative flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-red-600"></span>
            </span>
            PAINEL DE <span className="text-red-600">PEDIDOS</span>
          </h1>
          <p className="text-slate-500 text-sm font-bold pl-8 mt-1 uppercase tracking-widest">Acompanhe a sua senha</p>
        </div>
        <div className="text-right flex items-center gap-6">
          <button 
            onClick={() => setAudioAtivo(!audioAtivo)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-md ${
              audioAtivo ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-slate-100 text-slate-400 border border-slate-200'
            }`}
          >
            {audioAtivo ? <Volume2 size={20} /> : <VolumeX size={20} />}
            {audioAtivo ? 'Voz Ativada' : 'Ativar Voz'}
          </button>

          <div className="flex items-center gap-4 border-l border-slate-200 pl-6">
            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 shadow-inner">
              <img src="/imagens/logo.png" alt="Logo" className="w-8 h-8 object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">Morada <span className="text-red-600">One</span></div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col max-w-[1600px] mx-auto w-full">
        {/* Corpo da Fila em Grid de 2 Colunas */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 content-start">
          {todosPedidos.map((p, index) => {
            const isPronto = p.status_cozinha === 'pronto';
            return (
              <div 
                key={p.id} 
                className={`flex items-center justify-between py-5 px-8 rounded-[2rem] transition-all animate-in zoom-in duration-500 relative overflow-hidden ${
                  isPronto 
                    ? 'bg-emerald-500 border-2 border-emerald-400 shadow-2xl shadow-emerald-500/40 animate-pulse' 
                    : 'bg-white border border-slate-100 shadow-xl shadow-slate-200/50 hover:-translate-y-1'
                }`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Detalhe de cor lateral (apenas para o preparando) */}
                {!isPronto && <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-200"></div>}
                
                <div className="flex items-center gap-6 overflow-hidden">
                  <span className={`text-6xl font-black tracking-tighter ${isPronto ? 'text-white drop-shadow-md' : 'text-slate-900'}`}>
                    {p.senha_pedido_praca}
                  </span>
                  
                  <div className="flex flex-col justify-center truncate">
                    <span className={`text-[10px] font-bold uppercase tracking-widest mb-0.5 ${isPronto ? 'text-emerald-200' : 'text-slate-400'}`}>Cliente</span>
                    <span className={`text-2xl font-extrabold uppercase truncate ${isPronto ? 'text-emerald-50' : 'text-slate-700'}`}>
                      {p.cliente_nome_praca || '---'}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center flex-shrink-0 ml-4">
                  <div className={`px-5 py-3 rounded-2xl font-black uppercase tracking-widest text-sm shadow-lg flex items-center gap-2 ${
                    isPronto 
                      ? 'bg-white text-emerald-600 shadow-black/10' 
                      : 'bg-slate-100 text-slate-500 shadow-transparent'
                  }`}>
                    {isPronto ? (
                      <>
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                        Pronto
                      </>
                    ) : (
                      <>
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                        Preparo
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {todosPedidos.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center text-slate-400 bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 py-20 mt-4">
              <div className="text-6xl mb-4 opacity-30">🍔</div>
              <h2 className="text-2xl font-black uppercase tracking-widest text-slate-600">Fila Vazia</h2>
              <p className="text-sm mt-1 font-bold">Nenhum pedido no momento</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

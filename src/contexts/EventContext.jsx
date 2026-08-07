import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const EventContext = createContext();

export const EventProvider = ({ children }) => {
  const [eventos, setEventos] = useState([]);
  const [eventoSelecionado, setEventoSelecionado] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarEventos();
  }, []);

  const carregarEventos = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      
      let eventosData = [];

      if (userId) {
        // Obter nível do usuário
        const { data: perfil } = await supabase.from('perfis').select('nivel_acesso_id').eq('id', userId).maybeSingle();
        let isGlobal = false;
        
        if (perfil?.nivel_acesso_id) {
          const { data: nivel } = await supabase.from('niveis_acesso').select('acesso_global_eventos').eq('id', perfil.nivel_acesso_id).maybeSingle();
          isGlobal = nivel?.acesso_global_eventos === true;
        }

        if (isGlobal) {
          const { data } = await supabase.from('eventos').select('*').eq('status', 'ativo').order('created_at', { ascending: false });
          eventosData = data || [];
        } else {
          // Busca apenas eventos vinculados ao usuário
          const { data } = await supabase
            .from('eventos')
            .select('*, perfil_eventos!inner(perfil_id)')
            .eq('perfil_eventos.perfil_id', userId)
            .eq('status', 'ativo')
            .order('created_at', { ascending: false });
          eventosData = data || [];
        }
      }

      setEventos(eventosData);

      // Se houver um evento selecionado no localStorage, tenta usá-lo
      const eventoSalvoId = localStorage.getItem('eventoAtivoId');
      if (eventoSalvoId && eventosData.length > 0) {
        const eventoSalvo = eventosData.find(e => e.id === eventoSalvoId);
        if (eventoSalvo) {
          setEventoSelecionado(eventoSalvo);
        } else {
          // Fallback para o primeiro
          setEventoSelecionado(eventosData[0]);
          localStorage.setItem('eventoAtivoId', eventosData[0].id);
        }
      } else if (eventosData.length > 0) {
        setEventoSelecionado(eventosData[0]);
        localStorage.setItem('eventoAtivoId', eventosData[0].id);
      }
    } catch (err) {
      console.error('Erro ao carregar eventos:', err);
    } finally {
      setLoading(false);
    }
  };

  const trocarEvento = (evento) => {
    setEventoSelecionado(evento);
    localStorage.setItem('eventoAtivoId', evento.id);
    // Recarrega a página para limpar todos os estados globais/locais e buscar do novo evento
    window.location.reload();
  };

  return (
    <EventContext.Provider value={{ eventos, eventoSelecionado, trocarEvento, carregarEventos, loading }}>
      {children}
    </EventContext.Provider>
  );
};

export const useEventContext = () => useContext(EventContext);

import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Swal from 'sweetalert2';
import { Landmark } from 'lucide-react';

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    setLoading(true);
    
    // 1. Tenta autenticar o usuário
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    
    if (authError) {
      let msg = authError.message;
      if (msg === 'Invalid login credentials') {
        msg = 'E-mail ou senha incorretos. Por favor, verifique e tente novamente.';
      }
      Swal.fire("Acesso Negado", msg, "error");
      setLoading(false);
      return;
    }

    const userId = authData.user?.id;
    let targetEventId = null;

    // 2. Verifica o nível de acesso do usuário
    const { data: perfil } = await supabase.from('perfis').select('nivel_acesso_id').eq('id', userId).maybeSingle();
    let isGlobal = false;
    
    if (perfil?.nivel_acesso_id) {
      const { data: nivel } = await supabase.from('niveis_acesso').select('acesso_global_eventos').eq('id', perfil.nivel_acesso_id).maybeSingle();
      isGlobal = nivel?.acesso_global_eventos === true;
    }

    if (isGlobal) {
      // Pega o primeiro evento ativo
      const { data: eventos } = await supabase.from('eventos').select('id').eq('status', 'ativo').order('created_at', { ascending: false }).limit(1);
      if (eventos && eventos.length > 0) {
        targetEventId = eventos[0].id;
      }
    } else {
      // Verifica os eventos vinculados ao usuário
      const { data: vinculos } = await supabase
        .from('perfil_eventos')
        .select('evento_id, eventos!inner(status)')
        .eq('perfil_id', userId)
        .eq('eventos.status', 'ativo');

      if (vinculos && vinculos.length > 0) {
        targetEventId = vinculos[0].evento_id;
      }
    }

    if (!targetEventId) {
      // Se não houver evento disponível ou vínculo
      await supabase.auth.signOut();
      Swal.fire("Acesso Negado", "Seu usuário não possui permissão para acessar nenhum evento ativo. Contate o administrador.", "error");
      setLoading(false);
      return;
    }

    // 3. Sucesso! Salva o evento e prossegue
    localStorage.setItem('eventoAtivoId', targetEventId);
    sessionStorage.setItem('sync_email', email);
    sessionStorage.setItem('sync_password', password);
    setLoading(false);
    
    window.location.reload(); // Recarrega para forçar o App e EventContext a pegarem o evento_id
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        {/* Cabeçalho com a Logo */}
        <div className="bg-slate-900 p-8 text-center flex flex-col items-center">
          <img
            src="/logo.png"
            alt="Logotipo da Empresa"
            className="w-32 mb-4 bg-white rounded-xl p-2 shadow-sm border border-slate-700"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = "https://placehold.co/400x400/1e293b/ffffff?text=Logotipo";
            }}
          />
          <h1 className="text-white font-bold text-xl">Bem-vindo ao Sistema</h1>
        </div>

        {/* Formulário de Login */}
        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
              <input
                type="email"
                placeholder="Digite o seu e-mail"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none transition-all"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none transition-all"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-md shadow-red-500/30 flex justify-center items-center mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'A autenticar...' : 'Acessar Evento'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
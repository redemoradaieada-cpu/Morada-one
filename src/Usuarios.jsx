import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { 
  Users, UserPlus, Mail, Lock, ShieldCheck, 
  Search, Edit2, CheckCircle2, AlertCircle, Save, X, User, List, ChevronDown, Landmark
} from 'lucide-react';

const initialFormData = {
  id: null,
  nome_completo: '',
  email: '',
  senha: '',
  nivel_acesso_id: '',
  evento_id: ''
};

export function Usuarios() {
  const [viewMode, setViewMode] = useState('lista'); // 'lista' | 'novo'
  const [usuarios, setUsuarios] = useState([]);
  const [niveis, setNiveis] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroNivel, setFiltroNivel] = useState('');
  const [formData, setFormData] = useState(initialFormData);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    setLoading(true);
    
    // Busca os perfis (usuários) e faz o JOIN com a tabela de níveis de acesso
    const { data: perfisData, error: perfisError } = await supabase
      .from('perfis')
      .select('*, niveis_acesso(nome)')
      .order('nome_completo');
      
    // Busca os níveis de acesso para preencher o select do formulário
    const { data: niveisData } = await supabase
      .from('niveis_acesso')
      .select('id, nome, acesso_global_eventos')
      .order('nome');

    // Busca eventos ativos
    const { data: eventosData } = await supabase
      .from('eventos')
      .select('id, nome')
      .eq('status', 'ativo')
      .order('nome');

    if (!perfisError) setUsuarios(perfisData || []);
    if (niveisData) setNiveis(niveisData);
    if (eventosData) setEventos(eventosData);
    
    setLoading(false);
  }

  const handleEdit = async (usuario) => {
    // Busca o vínculo atual do usuário com algum evento
    const { data: vinculo } = await supabase
      .from('perfil_eventos')
      .select('evento_id')
      .eq('perfil_id', usuario.id)
      .maybeSingle();

    setFormData({
      id: usuario.id,
      nome_completo: usuario.nome_completo,
      email: usuario.email,
      senha: '', // Senha fica vazia na edição
      nivel_acesso_id: usuario.nivel_acesso_id || '',
      evento_id: vinculo?.evento_id || ''
    });
    setViewMode('novo');
    setMensagem({ tipo: '', texto: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMensagem({ tipo: '', texto: '' });

    if (!formData.nivel_acesso_id) {
      setMensagem({ tipo: 'erro', texto: 'Selecione um nível de acesso obrigatório.' });
      setSaving(false);
      return;
    }

    try {
      if (formData.id) {
        // EDIÇÃO: Apenas atualiza dados do perfil, não mexe na senha do auth
        const { error: updateError } = await supabase
          .from('perfis')
          .update({
            nome_completo: formData.nome_completo,
            nivel_acesso_id: formData.nivel_acesso_id
          })
          .eq('id', formData.id);

        if (updateError) throw updateError;
        setMensagem({ tipo: 'sucesso', texto: 'Usuário atualizado com sucesso!' });

      } else {
        // CRIAÇÃO: Cria no Auth do Supabase
        if (formData.senha.length < 6) {
          throw new Error('A senha deve ter pelo menos 6 caracteres.');
        }

        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.senha,
          options: {
            // Passamos o nome_completo aqui para o Trigger do SQL pegar
            data: { nome_completo: formData.nome_completo } 
          }
        });

        if (authError) throw authError;

        // Após criar no Auth, o trigger cria o perfil. Vamos aguardar um instante e vincular o Nível de Acesso.
        if (authData.user) {
          const { error: linkError } = await supabase
            .from('perfis')
            .update({ nivel_acesso_id: formData.nivel_acesso_id })
            .eq('id', authData.user.id);
            
          if (linkError) throw linkError;
        }

        setMensagem({ tipo: 'sucesso', texto: 'Usuário cadastrado com sucesso!' });
      }

      const userId = formData.id || authData?.user?.id;

      if (userId) {
        // Atualiza ou insere o vínculo com o evento
        if (formData.evento_id) {
          // Remove vínculo antigo se houver (para garantir apenas 1 evento principal na tela)
          await supabase.from('perfil_eventos').delete().eq('perfil_id', userId);
          // Insere o novo
          await supabase.from('perfil_eventos').insert([{ perfil_id: userId, evento_id: formData.evento_id }]);
        } else {
          // Se deixou o evento vazio, remove vínculos
          await supabase.from('perfil_eventos').delete().eq('perfil_id', userId);
        }
      }

      carregarDados();
      setTimeout(() => {
        setViewMode('lista');
        setFormData(initialFormData);
      }, 1500);

    } catch (err) {
      setMensagem({ tipo: 'erro', texto: 'Erro: ' + (err.message || 'Ocorreu um erro inesperado.') });
    } finally {
      setSaving(false);
    }
  };

  // Filtragem da lista
  const usuariosFiltrados = usuarios.filter(u => {
    const matchBusca = u.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) || 
                       u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchNivel = filtroNivel === '' || u.nivel_acesso_id === filtroNivel;
    return matchBusca && matchNivel;
  });

  const selectedNivel = niveis.find(n => n.id === formData.nivel_acesso_id);
  const isGlobalLevel = selectedNivel?.acesso_global_eventos === true;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <Users className="text-red-600" size={32} /> Gestão de Usuários
          </h2>
          <p className="text-slate-500 text-sm font-medium pl-11">Cadastre a equipe e defina seus níveis de acesso.</p>
        </div>

        <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
          <button
            onClick={() => { setViewMode('novo'); setFormData(initialFormData); setMensagem({ tipo: '', texto: '' }); }}
            className={`flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${viewMode === 'novo' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <UserPlus size={18} /> {formData.id ? 'Editar Usuário' : 'Novo Usuário'}
          </button>
          <button
            onClick={() => setViewMode('lista')}
            className={`flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${viewMode === 'lista' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <List size={18} /> Listagem
          </button>
        </div>
      </div>

      {mensagem.texto && (
        <div className={`p-5 rounded-2xl border flex items-center gap-4 animate-in slide-in-from-top-4 ${mensagem.tipo === 'sucesso' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {mensagem.tipo === 'sucesso' ? <CheckCircle2 size={24} className="text-green-600" /> : <AlertCircle size={24} className="text-red-600" />}
          <span className="font-bold text-sm tracking-wide">{mensagem.texto}</span>
        </div>
      )}

      {/* VIEW: LISTA */}
      {viewMode === 'lista' && (
        <div className="space-y-6">
          {/* Filtros */}
          <div className="bg-white p-5 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col md:flex-row gap-4 items-center">
            <div className="flex-1 w-full relative group">
              <Search className="absolute left-4 top-4 text-slate-400 group-focus-within:text-red-500 transition-colors" size={20} />
              <input
                type="text"
                placeholder="Pesquisar por nome ou e-mail..."
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-red-500/10 focus:border-red-500 outline-none transition-all text-sm font-bold text-slate-700"
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="w-full md:w-64 relative group">
              <ShieldCheck className="absolute left-4 top-4 text-slate-400 group-focus-within:text-red-500 transition-colors" size={20} />
              <select 
                className="w-full pl-12 pr-10 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-bold text-slate-700 cursor-pointer appearance-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all"
                onChange={(e) => setFiltroNivel(e.target.value)}
              >
                <option value="">Todos os Níveis</option>
                {niveis.map(n => <option key={n.id} value={n.id}>{n.nome}</option>)}
              </select>
              <div className="absolute right-4 top-4.5 pointer-events-none text-slate-400">
                <ChevronDown size={18} />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="py-20 text-center flex flex-col items-center gap-3 bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50">
              <span className="w-10 h-10 border-4 border-slate-200 border-t-red-600 rounded-full animate-spin"></span>
              <p className="text-slate-400 text-sm font-medium italic">Sincronizando usuários...</p>
            </div>
          ) : (
            /* Grid de Usuários */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
              {usuariosFiltrados.map((usuario) => (
                <div key={usuario.id} className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-slate-300/60 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
                  {/* Linha colorida no topo (Design Detail) */}
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-600 to-red-400"></div>
                  
                  <div className="flex justify-between items-start mb-6 mt-2">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 shadow-inner">
                        <User size={24} />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-base text-slate-900 group-hover:text-red-600 transition-colors">{usuario.nome_completo}</h3>
                        <p className="text-xs font-semibold text-slate-400 mt-0.5">{usuario.email}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleEdit(usuario)} 
                      className="p-2.5 text-slate-400 bg-slate-50 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                      title="Editar Usuário"
                    >
                      <Edit2 size={16} />
                    </button>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Nível de Acesso</p>
                      <div className="flex items-center gap-1.5 text-sm font-extrabold text-slate-700">
                        <ShieldCheck size={16} className="text-slate-400" />
                        {usuario.niveis_acesso?.nome ? (
                          <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">
                            {usuario.niveis_acesso.nome}
                          </span>
                        ) : (
                          <span className="bg-red-50 text-red-600 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">
                            Sem Acesso
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {usuariosFiltrados.length === 0 && (
                <div className="col-span-full py-16 text-center text-slate-400 bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50">
                  <Users size={48} className="mx-auto mb-4 opacity-20" />
                  <p className="font-bold text-slate-600">Nenhum usuário encontrado.</p>
                  <p className="text-sm mt-1">Tente ajustar seus filtros ou termo de pesquisa.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* VIEW: NOVO / EDITAR */}
      {viewMode === 'novo' && (
        <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden max-w-3xl animate-in fade-in zoom-in duration-300">
          <div className="p-8 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
              <UserPlus size={22} className="text-red-600" />
              {formData.id ? 'Editar Dados do Usuário' : 'Novo Cadastro de Usuário'}
            </h3>
            <p className="text-sm text-slate-500 mt-1 pl-7">Preencha os dados e defina as permissões deste colaborador.</p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Nome */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Nome Completo</label>
                <div className="relative group">
                  <User className="absolute left-4 top-4 text-slate-300 group-focus-within:text-red-500 transition-colors" size={20} />
                  <input
                    required
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-red-500/10 focus:border-red-500 outline-none transition-all font-bold text-slate-800"
                    placeholder="Nome do colaborador"
                    value={formData.nome_completo}
                    onChange={e => setFormData({ ...formData, nome_completo: e.target.value })}
                  />
                </div>
              </div>

              {/* Nível de Acesso */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Nível de Acesso</label>
                <div className="relative group">
                  <ShieldCheck className="absolute left-4 top-4 text-slate-300 group-focus-within:text-red-500 transition-colors" size={20} />
                  <select
                    required
                    className="w-full pl-12 pr-10 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-red-500/10 focus:border-red-500 outline-none transition-all font-bold text-slate-700 cursor-pointer appearance-none"
                    value={formData.nivel_acesso_id}
                    onChange={e => setFormData({ ...formData, nivel_acesso_id: e.target.value })}
                  >
                    <option value="">Selecione um nível...</option>
                    {niveis.map(n => <option key={n.id} value={n.id}>{n.nome}</option>)}
                  </select>
                  <div className="absolute right-4 top-5 pointer-events-none text-slate-400">
                    <ChevronDown size={18} />
                  </div>
                </div>
              </div>

              {/* Evento (Só faz sentido se o nível não for global, mas podemos mostrar sempre com aviso) */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Evento Principal do Usuário</label>
                {isGlobalLevel ? (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center gap-3">
                    <Landmark className="text-blue-500" size={20} />
                    <span className="text-sm font-bold text-blue-800">
                      Este nível de acesso possui acesso global. O usuário poderá acessar todos os eventos livremente.
                    </span>
                  </div>
                ) : (
                  <div className="relative group">
                    <Landmark className="absolute left-4 top-4 text-slate-300 group-focus-within:text-red-500 transition-colors" size={20} />
                    <select
                      required={!isGlobalLevel}
                      className="w-full pl-12 pr-10 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-red-500/10 focus:border-red-500 outline-none transition-all font-bold text-slate-700 cursor-pointer appearance-none"
                      value={formData.evento_id}
                      onChange={e => setFormData({ ...formData, evento_id: e.target.value })}
                    >
                      <option value="">Selecione um evento...</option>
                      {eventos.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                    </select>
                    <div className="absolute right-4 top-5 pointer-events-none text-slate-400">
                      <ChevronDown size={18} />
                    </div>
                  </div>
                )}
              </div>

              {/* Email (Apenas leitura se estiver editando) */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">E-mail de Acesso</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-4 text-slate-300 group-focus-within:text-red-500 transition-colors" size={20} />
                  <input
                    required
                    type="email"
                    disabled={!!formData.id}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-red-500/10 focus:border-red-500 outline-none transition-all font-bold text-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
                    placeholder="email@sistema.com"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              {/* Senha (Escondido se estiver editando) */}
              {!formData.id && (
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Senha Provisória</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-4 text-slate-300 group-focus-within:text-red-500 transition-colors" size={20} />
                    <input
                      required
                      type="password"
                      minLength={6}
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-red-500/10 focus:border-red-500 outline-none transition-all font-bold text-slate-800"
                      placeholder="Mínimo 6 caracteres"
                      value={formData.senha}
                      onChange={e => setFormData({ ...formData, senha: e.target.value })}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 ml-1 mt-2 font-medium">O usuário poderá alterar essa senha posteriormente usando a recuperação de senha.</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-6 border-t border-slate-100 mt-6">
              <button
                type="submit"
                disabled={saving}
                className="bg-red-600 text-white px-10 py-4 rounded-2xl font-bold flex items-center gap-2 hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 active:scale-95 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save size={20} /> {formData.id ? 'Salvar Alterações' : 'Criar Usuário'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
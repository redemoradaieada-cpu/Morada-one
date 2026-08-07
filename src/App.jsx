import React, { useState, useEffect } from 'react';
import { Package, ShoppingCart, LogOut, Plus, Menu, X, ChevronDown, ChevronUp, BedDouble, ClipboardList, Shield, Utensils, CheckSquare, Landmark } from 'lucide-react';
import { supabase } from './supabaseClient';

import { LoginScreen } from './LoginScreen';
import { EstoqueView } from './EstoqueView';
import { CadastroProdutoView } from './CadastroProduto';
import { CadastroGrupos } from './CadastroGrupos';
import { GestorQuartos as CadastroQuartos } from './CadastroQuartos'; 
import { CadastroInscricoes } from './CadastroInscricoes';
import { Inscricoes } from './Inscricoes';
import { GerenciadorHospedagem } from './GerenciadorHospedagem';
import { CadastroCidades } from './CadastroCidades';
import { ReservasView } from './ReservasView';
import { CheckinView } from './CheckinView';
import { PDVView } from './PDVView';
import { ChamadasView } from './ChamadasView';
import { Usuarios } from './Usuarios';
import { NiveisAcesso } from './NiveisAcesso';
import { PainelCozinhaView } from './PainelCozinhaView';
import { PainelClienteView } from './PainelClienteView';
import { TarefasView } from './TarefasView';
import { NotificacoesManager } from './NotificacoesManager';
import { LancamentosFinanceirosView } from './LancamentosFinanceirosView';
import { RelatorioFinanceiroView } from './RelatorioFinanceiroView';
import { startSyncService, stopSyncService } from './SyncService';
import { AutoInscricaoView } from './AutoInscricaoView';
import { ContasReceberView } from './ContasReceberView';
import { GerenciadorEventos } from './GerenciadorEventos';
import { useEventContext } from './contexts/EventContext';

export default function App() {
  const [session, setSession] = useState(null);
  const [activeTab, setActiveTab] = useState('estoque');
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { eventoSelecionado, eventos, trocarEvento, loading: eventLoading } = useEventContext();
  
  // Estados de segurança
  const [permissoes, setPermissoes] = useState([]);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const [userData, setUserData] = useState({ nome: '', nivel: '' });
  const [syncStatus, setSyncStatus] = useState(null); // sincronizando | sucesso | erro | null

  const [openMenus, setOpenMenus] = useState({
    estoque: false,
    cadastro: true,
    vendas: false,
    hospedagem: false,
    secretaria: false,
    gestaoAcessos: false,
    praca: false,
    tarefas: false,
    financeiro: false
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchPermissoes(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchPermissoes(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      startSyncService(setSyncStatus);
    }
    return () => {
      stopSyncService();
    };
  }, [session]);

  async function fetchPermissoes(userId) {
    try {
      const { data, error } = await supabase
        .from('perfis')
        .select('nome_completo, niveis_acesso(nome, telas_permitidas)')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      
      const telas = data?.niveis_acesso?.telas_permitidas || [];
      console.log("Telas liberadas para o usuário:", telas); // DEPURADOR: Abra o console do navegador (F12)
      
      setPermissoes(telas);
      setUserData({
        nome: data?.nome_completo || 'Usuário',
        nivel: data?.niveis_acesso?.nome || 'Sem Nível'
      });
    } catch (err) {
      console.error("Erro ao carregar permissões:", err);
      setPermissoes([]);
    } finally {
      setPermissionsLoaded(true);
      setLoading(false);
    }
  }

  // Verifica se o usuário tem a permissão
  const canAccess = (id) => {
    // Se ainda não carregou, não permita acesso por segurança
    if (!permissionsLoaded) return false;
    return permissoes.includes(id);
  };

  const urlParams = new URLSearchParams(window.location.search);
  const telaIsolada = urlParams.get('tela');

  // Rota pública de Auto-Inscrição sem login
  if (telaIsolada === 'auto-inscricao') {
    return <AutoInscricaoView />;
  }

  if (loading) return <div className="h-screen flex items-center justify-center bg-gray-100 font-sans">Carregando permissões...</div>;
  if (!session) return <LoginScreen />;

  if (telaIsolada === 'painel-cozinha' && canAccess('painel-cozinha')) {
    return <div className="p-4 bg-slate-50 min-h-screen"><PainelCozinhaView /></div>;
  }
  if (telaIsolada === 'painel-cliente' && canAccess('painel-cliente')) {
    return <div className="p-4 bg-slate-950 min-h-screen"><PainelClienteView /></div>;
  }
  if (telaIsolada === 'pre-inscricoes' && canAccess('inscricoes-hospedagem')) {
    return <div className="p-6 bg-slate-50 min-h-screen"><Inscricoes initialViewMode="pre-inscricoes" /></div>;
  }

  const toggleMenu = (menu) => {
    setOpenMenus(prev => ({ ...prev, [menu]: !prev[menu] }));
  };

  const podeVerTarefas  = canAccess('tarefas-ver') || canAccess('tarefas-criar');
  const podeCriarTarefas = canAccess('tarefas-criar');

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800">
      {/* Botão Mobile */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-3 bg-slate-950 text-white rounded-2xl shadow-xl hover:bg-slate-800 transition-all">
          {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`fixed lg:relative z-40 w-72 h-full bg-slate-950 text-slate-300 flex-shrink-0 flex flex-col transition-transform duration-300 ease-in-out ${isMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-8 flex flex-col items-center gap-3">
          <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center border border-white/10 shadow-inner">
            <img src="/imagens/logo.png" alt="Logo" className="w-12 h-12 object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">Morada <span className="text-red-500">One</span></h1>
          
          <div className="mt-2 text-center border-t border-slate-800 pt-3 w-full">
            <div className="text-sm font-bold text-white truncate px-2">{userData.nome}</div>
            <div className="text-[10px] uppercase tracking-widest text-red-400 font-bold bg-red-400/10 inline-block px-2 py-0.5 rounded-md mt-1">
              {userData.nivel}
            </div>

            {/* Event Switcher */}
            {eventoSelecionado && (
              <div className="mt-3 relative px-2">
                <select
                  value={eventoSelecionado.id}
                  onChange={(e) => {
                    const novoEvento = eventos.find(ev => ev.id === e.target.value);
                    if (novoEvento) trocarEvento(novoEvento);
                  }}
                  className="w-full bg-slate-800 border border-slate-700 text-white text-xs py-2 px-2 rounded-lg appearance-none outline-none focus:border-red-500 text-center"
                >
                  {eventos.map(ev => (
                    <option key={ev.id} value={ev.id}>{ev.nome}</option>
                  ))}
                </select>
              </div>
            )}
            {syncStatus && (
              <div className="mt-2 flex items-center justify-center gap-1.5 text-[10px] font-bold">
                <span className={`w-2 h-2 rounded-full ${
                  syncStatus === 'sincronizando' ? 'bg-amber-500 animate-pulse' :
                  syncStatus === 'sucesso' ? 'bg-emerald-500' :
                  syncStatus === 'erro' ? 'bg-rose-500' : 'bg-slate-500'
                }`} />
                <span className={
                  syncStatus === 'sincronizando' ? 'text-amber-400' :
                  syncStatus === 'sucesso' ? 'text-emerald-400' :
                  syncStatus === 'erro' ? 'text-rose-400' : 'text-slate-400'
                }>
                  {syncStatus === 'sincronizando' ? 'Sincronizando...' :
                   syncStatus === 'sucesso' ? 'Estoque Nuvem OK' :
                   syncStatus === 'erro' ? 'Erro de Conexão' : ''}
                </span>
              </div>
            )}
          </div>
        </div>
        
        <nav className="flex-1 py-4 px-4 space-y-1 overflow-y-auto">
          
          { (canAccess('cadastro') || canAccess('cadastro-quartos') || canAccess('inscricoes') || canAccess('grupos') || canAccess('cadastro-cidades') || canAccess('gerenciador-eventos')) && (
            <CollapsibleMenu label="Cadastros" icon={<Plus size={20} />} isOpen={openMenus.cadastro} onToggle={() => toggleMenu('cadastro')}>
              {canAccess('gerenciador-eventos') && <SubMenuItem active={activeTab === 'gerenciador-eventos'} label="Cadastro de Eventos" onClick={() => { setActiveTab('gerenciador-eventos'); setIsMenuOpen(false); }} />}
              {canAccess('cadastro-cidades') && <SubMenuItem active={activeTab === 'cadastro-cidades'} label="Cadastro de Cidades" onClick={() => { setActiveTab('cadastro-cidades'); setIsMenuOpen(false); }} />}
              {canAccess('grupos') && <SubMenuItem active={activeTab === 'grupos'} label="Cadastro de Grupos" onClick={() => { setActiveTab('grupos'); setIsMenuOpen(false); }} />}
              {canAccess('inscricoes') && <SubMenuItem active={activeTab === 'inscricoes'} label="Cadastro de Inscrições" onClick={() => { setActiveTab('inscricoes'); setIsMenuOpen(false); }} />}
              {canAccess('cadastro-quartos') && <SubMenuItem active={activeTab === 'cadastro-quartos'} label="Cadastro de Quartos" onClick={() => { setActiveTab('cadastro-quartos'); setIsMenuOpen(false); }} />}
              {canAccess('cadastro') && <SubMenuItem active={activeTab === 'cadastro'} label="Cadastro de Produtos" onClick={() => { setActiveTab('cadastro'); setIsMenuOpen(false); }} />}
            </CollapsibleMenu>
          )}

          {canAccess('estoque') && (
            <CollapsibleMenu label="Estoque" icon={<Package size={20} />} isOpen={openMenus.estoque} onToggle={() => toggleMenu('estoque')}>
              <SubMenuItem active={activeTab === 'estoque'} label="Ajuste de Estoque" onClick={() => { setActiveTab('estoque'); setIsMenuOpen(false); }} />
            </CollapsibleMenu>
          )}

          { (canAccess('usuarios') || canAccess('niveis')) && (
            <CollapsibleMenu label="Gestão de Acessos" icon={<Shield size={20} />} isOpen={openMenus.gestaoAcessos} onToggle={() => toggleMenu('gestaoAcessos')}>
              {canAccess('niveis') && <SubMenuItem active={activeTab === 'niveis'} label="Níveis de Acesso" onClick={() => { setActiveTab('niveis'); setIsMenuOpen(false); }} />}
              {canAccess('usuarios') && <SubMenuItem active={activeTab === 'usuarios'} label="Usuários" onClick={() => { setActiveTab('usuarios'); setIsMenuOpen(false); }} />}
            </CollapsibleMenu>
          )}

          { (canAccess('gerenciador-hospedagem') || canAccess('chamadas')) && (
            <CollapsibleMenu label="Hospedagem" icon={<BedDouble size={20} />} isOpen={openMenus.hospedagem} onToggle={() => toggleMenu('hospedagem')}>
              {canAccess('chamadas') && <SubMenuItem active={activeTab === 'chamadas'} label="Chamadas" onClick={() => { setActiveTab('chamadas'); setIsMenuOpen(false); }} />}
              {canAccess('gerenciador-hospedagem') && <SubMenuItem active={activeTab === 'gerenciador-hospedagem'} label="Gerenciador de Hospedagem" onClick={() => { setActiveTab('gerenciador-hospedagem'); setIsMenuOpen(false); }} />}
            </CollapsibleMenu>
          )}

          { (canAccess('painel-cozinha') || canAccess('painel-cliente')) && (
            <CollapsibleMenu label="Praça de Alimentação" icon={<Utensils size={20} />} isOpen={openMenus.praca} onToggle={() => toggleMenu('praca')}>
              {canAccess('painel-cliente') && <SubMenuItem active={false} label="Painel Cliente (Monitor)" onClick={() => { window.open(window.location.pathname + '?tela=painel-cliente', '_blank'); setIsMenuOpen(false); }} />}
              {canAccess('painel-cozinha') && <SubMenuItem active={false} label="Painel Cozinha" onClick={() => { window.open(window.location.pathname + '?tela=painel-cozinha', '_blank'); setIsMenuOpen(false); }} />}
            </CollapsibleMenu>
          )}

        {/* ── Tarefas ── */}
          {podeVerTarefas && (
            <CollapsibleMenu label="Tarefas" icon={<CheckSquare size={20} />} isOpen={openMenus.tarefas} onToggle={() => toggleMenu('tarefas')}>
              <SubMenuItem active={activeTab === 'tarefas'} label="Gestor de Tarefas" onClick={() => { setActiveTab('tarefas'); setIsMenuOpen(false); }} />
            </CollapsibleMenu>
          )}

        {/* ── Financeiro ── */}
          {(canAccess('controle-ofertas') || canAccess('relatorio-financeiro') || canAccess('contas-receber')) && (
            <CollapsibleMenu label="Financeiro" icon={<Landmark size={20} />} isOpen={openMenus.financeiro} onToggle={() => toggleMenu('financeiro')}>
              {canAccess('controle-ofertas') && <SubMenuItem active={activeTab === 'controle-ofertas'} label="Central Financeira" onClick={() => { setActiveTab('controle-ofertas'); setIsMenuOpen(false); }} />}
              {canAccess('relatorio-financeiro') && <SubMenuItem active={activeTab === 'relatorio-financeiro'} label="Dashboard B.I." onClick={() => { setActiveTab('relatorio-financeiro'); setIsMenuOpen(false); }} />}
              {canAccess('contas-receber') && <SubMenuItem active={activeTab === 'contas-receber'} label="Contas a Receber" onClick={() => { setActiveTab('contas-receber'); setIsMenuOpen(false); }} />}
            </CollapsibleMenu>
          )}

          {canAccess('inscricoes-hospedagem') && (
            <CollapsibleMenu label="Secretaria" icon={<ClipboardList size={20} />} isOpen={openMenus.secretaria} onToggle={() => toggleMenu('secretaria')}>
              <SubMenuItem active={activeTab === 'inscricoes-hospedagem'} label="Inscrições" onClick={() => { setActiveTab('inscricoes-hospedagem'); setIsMenuOpen(false); }} />
            </CollapsibleMenu>
          )}

          { (canAccess('pdv') || canAccess('reservas') || canAccess('checkin')) && (
            <CollapsibleMenu label="Vendas" icon={<ShoppingCart size={20} />} isOpen={openMenus.vendas} onToggle={() => toggleMenu('vendas')}>
              {canAccess('checkin') && <SubMenuItem active={activeTab === 'checkin'} label="Check-in" onClick={() => { setActiveTab('checkin'); setIsMenuOpen(false); }} />}
              {canAccess('pdv') && <SubMenuItem active={activeTab === 'pdv'} label="PDV" onClick={() => { setActiveTab('pdv'); setIsMenuOpen(false); }} />}
              {canAccess('reservas') && <SubMenuItem active={activeTab === 'reservas'} label="Reservas" onClick={() => { setActiveTab('reservas'); setIsMenuOpen(false); }} />}
            </CollapsibleMenu>
          )}
        </nav>
        
        <div className="p-4 border-t border-slate-800">
          <button onClick={() => supabase.auth.signOut()} className="w-full p-3 text-red-400 hover:text-white flex items-center gap-3 hover:bg-slate-800/50 rounded-xl transition-all text-sm font-medium">
            <LogOut size={18} /> Sair do Sistema
          </button>
        </div>
      </aside>

      {/* Overlay mobile */}
      {isMenuOpen && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 lg:hidden" onClick={() => setIsMenuOpen(false)}></div>}

      {/* Main */}
      <main className="flex-1 overflow-y-auto p-4 lg:p-10 w-full">
        {/* Notificações globais */}
        {session && (
          <NotificacoesManager
            userId={session.user.id}
            onNavigateTarefas={() => { setActiveTab('tarefas'); setIsMenuOpen(false); }}
          />
        )}

        <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
          {activeTab === 'estoque' && canAccess('estoque') && <EstoqueView />}
          {activeTab === 'cadastro' && canAccess('cadastro') && <CadastroProdutoView />}
          {activeTab === 'grupos' && canAccess('grupos') && <CadastroGrupos />}
          {activeTab === 'cadastro-quartos' && canAccess('cadastro-quartos') && <CadastroQuartos />}
          {activeTab === 'inscricoes' && canAccess('inscricoes') && <CadastroInscricoes />}
          {activeTab === 'pdv' && canAccess('pdv') && <PDVView />}
          {activeTab === 'reservas' && canAccess('reservas') && <ReservasView />}
          {activeTab === 'checkin' && canAccess('checkin') && <CheckinView />}
          {activeTab === 'inscricoes-hospedagem' && canAccess('inscricoes-hospedagem') && <Inscricoes />}
          {activeTab === 'gerenciador-eventos' && canAccess('gerenciador-eventos') && <GerenciadorEventos />}
          {activeTab === 'contas-receber' && canAccess('contas-receber') && <ContasReceberView />}

          {activeTab === 'gerenciador-hospedagem' && canAccess('gerenciador-hospedagem') && <GerenciadorHospedagem />}
          {activeTab === 'chamadas' && canAccess('chamadas') && <ChamadasView />}
          {activeTab === 'cadastro-cidades' && canAccess('cadastro-cidades') && <CadastroCidades />}
          {activeTab === 'usuarios' && canAccess('usuarios') && <Usuarios />}
          {activeTab === 'niveis' && canAccess('niveis') && <NiveisAcesso />}
          {activeTab === 'tarefas' && podeVerTarefas && (
            <TarefasView podecriar={podeCriarTarefas} userId={session?.user?.id} />
          )}
          {activeTab === 'controle-ofertas' && canAccess('controle-ofertas') && (
            <LancamentosFinanceirosView userId={session?.user?.id} />
          )}
          {activeTab === 'relatorio-financeiro' && canAccess('relatorio-financeiro') && (
            <RelatorioFinanceiroView />
          )}
        </div>
      </main>
    </div>
  );
}

function CollapsibleMenu({ label, icon, isOpen, onToggle, children }) {
  if (!children || React.Children.count(children) === 0) return null;
  return (
    <div className="mb-1">
      <button onClick={onToggle} className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition-all ${isOpen ? 'bg-white/5 text-white' : 'hover:bg-white/5 hover:text-white'}`}>
        <div className="flex items-center gap-3 font-medium text-sm">{icon} {label}</div>
        {isOpen ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
      </button>
      {isOpen && <div className="pl-10 space-y-1 mt-1 animate-in slide-in-from-top-2">{children}</div>}
    </div>
  );
}

function SubMenuItem({ active, label, onClick }) {
  return (
    <button onClick={onClick} className={`w-full text-left px-4 py-2.5 rounded-lg text-xs transition-all border-l-2 ${active ? 'bg-red-600/10 border-red-600 text-white font-bold' : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'}`}>
      {label}
    </button>
  );
}
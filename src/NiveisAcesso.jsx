import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { 
  Shield, ShieldCheck, Plus, Edit2, Trash2, 
  CheckCircle2, AlertCircle, Save, X, Layers, CheckSquare, Square, ChevronDown, List
} from 'lucide-react';

const MODULOS_CONFIG = {
  'Estoque': [ { id: 'estoque', nome: 'Ajuste de Estoque' } ],
  'Cadastros': [
    { id: 'gerenciador-eventos', nome: 'Cadastro de Eventos' },
    { id: 'cadastro', nome: 'Produtos' },
    { id: 'cadastro-quartos', nome: 'Cadastro de Quartos' },
    { id: 'inscricoes', nome: 'Cadastro de Inscrições' },
    { id: 'grupos', nome: 'Cadastro de Grupos' },
    { id: 'cadastro-cidades', nome: 'Cadastro de Cidades' }
  ],
  'Vendas': [
    { id: 'pdv', nome: 'PDV' },
    { id: 'reservas', nome: 'Reservas' },
    { id: 'checkin', nome: 'Check-in' }
  ],
  'Praça de Alimentação': [
    { id: 'painel-cozinha', nome: 'Painel Cozinha' },
    { id: 'painel-cliente', nome: 'Painel Cliente' }
  ],
  'Secretaria': [ { id: 'inscricoes-hospedagem', nome: 'Inscrições' } ],
  'Hospedagem': [
    { id: 'gerenciador-hospedagem', nome: 'Gerenciador de Hospedagem' },
    { id: 'chamadas', nome: 'Chamadas' }
  ],
  'Gestão de Acessos': [
    { id: 'usuarios', nome: 'Usuários' },
    { id: 'niveis', nome: 'Níveis de Acesso' }
  ],
  'Tarefas': [
    { id: 'tarefas-ver',   nome: 'Visualizar Tarefas'       },
    { id: 'tarefas-criar', nome: 'Criar & Gerenciar Tarefas' }
  ],
  'Financeiro': [
    { id: 'controle-ofertas', nome: 'Controle de Ofertas' },
    { id: 'relatorio-financeiro', nome: 'Dashboard B.I.' },
    { id: 'contas-receber', nome: 'Contas a Receber' }
  ]
};

const TELAS_DESCRICOES = {
  'gerenciador-eventos': 'Gerenciar e cadastrar os eventos e acampamentos do sistema.',
  'estoque': 'Ajustar quantidades, entradas e saídas físicas do estoque.',
  'cadastro': 'Cadastrar, inativar, precificar e editar informações de produtos.',
  'cadastro-quartos': 'Cadastrar e gerenciar configurações de leitos e quartos.',
  'inscricoes': 'Cadastrar e atualizar fichas de inscrições no sistema.',
  'grupos': 'Organizar o inventário em categorias e subcategorias lógicas.',
  'cadastro-cidades': 'Cadastrar as cidades e respectivos códigos de UF.',
  'pdv': 'Operar faturamento rápido de itens com baixa automatizada.',
  'painel-cozinha': 'Gerenciar fila e status de preparo dos lanches da praça.',
  'painel-cliente': 'Monitor de acompanhamento de pedidos para os clientes.',
  'reservas': 'Preencher reservas de produtos integrando upload de PIX.',
  'checkin': 'Confirmar a chegada de hóspedes e realizar entregas vinculadas.',
  'inscricoes-hospedagem': 'Gerenciar fichas e listagens gerais da secretaria.',
  'gerenciador-hospedagem': 'Painel geral de controle de acomodações e quartos.',
  'chamadas': 'Realizar chamadas e controle de presença nos quartos.',
  'usuarios': 'Adicionar colaboradores e definir seus cargos na plataforma.',
  'niveis': 'Gerenciar permissões de acesso e segurança das abas.',
  'tarefas-ver':   'Visualizar tarefas atribuídas, alterar status e adicionar comentários.',
  'tarefas-criar': 'Criar tarefas, definir responsáveis, prioridades e prazos.',
  'controle-ofertas': 'Lançar, consultar e excluir registros de ofertas dos cultos.',
  'relatorio-financeiro': 'Acesso aos relatórios B.I. e análises consolidadas de receitas.',
  'contas-receber': 'Controlar recebimentos e dar baixa em parcelas de inscrições.'
};

const initialFormData = { id: null, nome: '', telas_permitidas: [], acesso_global_eventos: false };

export function NiveisAcesso() {
  const [viewMode, setViewMode] = useState('lista');
  const [niveis, setNiveis] = useState([]);
  const [usuariosCount, setUsuariosCount] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });

  useEffect(() => { fetchNiveis(); }, []);

  async function fetchNiveis() {
    setLoading(true);
    const { data: niveisData } = await supabase.from('niveis_acesso').select('*').order('nome');
    const { data: perfisData } = await supabase.from('perfis').select('nivel_acesso_id');
    
    if (niveisData) {
      setNiveis(niveisData);
      
      // Contabiliza a quantidade de colaboradores associados a cada cargo/nível
      const counts = {};
      niveisData.forEach(n => {
        counts[n.id] = perfisData ? perfisData.filter(p => p.nivel_acesso_id === n.id).length : 0;
      });
      setUsuariosCount(counts);
    }
    setLoading(false);
  }

  const isGrupoSelecionado = (grupo) => {
    const idsDoGrupo = MODULOS_CONFIG[grupo].map(m => m.id);
    return idsDoGrupo.every(id => formData.telas_permitidas.includes(id));
  };

  const toggleGrupo = (grupo) => {
    const idsDoGrupo = MODULOS_CONFIG[grupo].map(m => m.id);
    const tudoSelecionado = isGrupoSelecionado(grupo);
    setFormData(prev => ({
      ...prev,
      telas_permitidas: tudoSelecionado 
        ? prev.telas_permitidas.filter(id => !idsDoGrupo.includes(id))
        : [...new Set([...prev.telas_permitidas, ...idsDoGrupo])]
    }));
  };

  const toggleItem = (id) => {
    setFormData(prev => ({
      ...prev,
      telas_permitidas: prev.telas_permitidas.includes(id) 
        ? prev.telas_permitidas.filter(t => t !== id)
        : [...prev.telas_permitidas, id]
    }));
  };

  const handleDelete = async (id, nome) => {
    if (!window.confirm(`Tem certeza que deseja excluir o nível de acesso "${nome}"?`)) return;
    setMensagem({ tipo: '', texto: '' });

    // Verifica se existem perfis associados a este nível
    const { count, error: countError } = await supabase
      .from('perfis')
      .select('*', { count: 'exact', head: true })
      .eq('nivel_acesso_id', id);

    if (countError) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao verificar dependências.' });
      return;
    }

    if (count > 0) {
      setMensagem({ 
        tipo: 'erro', 
        texto: `Atenção: O nível "${nome}" possui ${count} usuário(s) vinculado(s) e não pode ser excluído.` 
      });
      return;
    }

    const { error } = await supabase.from('niveis_acesso').delete().eq('id', id);
    if (!error) {
      setMensagem({ tipo: 'sucesso', texto: 'Nível de acesso excluído com sucesso!' });
      fetchNiveis();
    } else {
      setMensagem({ tipo: 'erro', texto: 'Erro ao excluir: ' + error.message });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMensagem({ tipo: '', texto: '' });
    try {
      if (formData.id) {
        await supabase.from('niveis_acesso').update({ nome: formData.nome, telas_permitidas: formData.telas_permitidas, acesso_global_eventos: formData.acesso_global_eventos }).eq('id', formData.id);
        setMensagem({ tipo: 'sucesso', texto: 'Nível de acesso atualizado com sucesso!' });
      } else {
        await supabase.from('niveis_acesso').insert([{ nome: formData.nome, telas_permitidas: formData.telas_permitidas, acesso_global_eventos: formData.acesso_global_eventos }]);
        setMensagem({ tipo: 'sucesso', texto: 'Nível de acesso cadastrado com sucesso!' });
      }
      fetchNiveis();
      setTimeout(() => {
        setViewMode('lista');
      }, 1500);
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao salvar: ' + err.message });
    } finally { setSaving(false); }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <Shield className="text-red-600" size={32} /> Níveis de Acesso
          </h2>
          <p className="text-slate-500 text-sm font-medium pl-11">Configure os papéis de segurança e permissões da equipe.</p>
        </div>

        <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
          <button
            onClick={() => { setFormData(initialFormData); setViewMode('novo'); setMensagem({ tipo: '', texto: '' }); }}
            className={`flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${viewMode === 'novo' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <Plus size={18} /> {formData.id ? 'Editar Nível' : 'Novo Nível'}
          </button>
          <button
            onClick={() => { setViewMode('lista'); setMensagem({ tipo: '', texto: '' }); }}
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

      {viewMode === 'lista' ? (
        loading ? (
          <div className="py-20 text-center flex flex-col items-center gap-3 bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 animate-in fade-in duration-300">
            <span className="w-10 h-10 border-4 border-slate-200 border-t-red-600 rounded-full animate-spin"></span>
            <p className="text-slate-400 text-sm font-medium italic">Carregando níveis de acesso...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
            {niveis.map(n => (
              <div key={n.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-slate-300/60 hover:-translate-y-1 transition-all duration-300 flex justify-between items-center group relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-600 to-red-400"></div>
                <div className="flex items-center gap-4 mt-2">
                  <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-red-50 group-hover:text-red-600 group-hover:border-red-100 shadow-inner transition-all duration-300">
                    <Shield size={26} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-lg group-hover:text-red-600 transition-colors">{n.nome}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded-lg font-extrabold text-[10px] uppercase tracking-wider">
                        {n.telas_permitidas?.length || 0} telas
                      </span>
                      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg font-bold text-[10px] uppercase tracking-wider">
                        {usuariosCount[n.id] || 0} {usuariosCount[n.id] === 1 ? 'colaborador' : 'colaboradores'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => { setFormData(n); setViewMode('novo'); setMensagem({ tipo: '', texto: '' }); }} 
                    className="p-2.5 text-slate-400 bg-slate-50 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                    title="Editar Nível"
                  >
                    <Edit2 size={18}/>
                  </button>
                  <button 
                    onClick={() => handleDelete(n.id, n.nome)} 
                    className="p-2.5 text-slate-400 bg-slate-50 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                    title="Excluir Nível"
                  >
                    <Trash2 size={18}/>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden animate-in fade-in zoom-in duration-300">
          <div className="p-8 md:p-10 border-b border-slate-100 bg-slate-50/50">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">Nome do Nível de Acesso</label>
            <div className="relative group max-w-xl">
              <Shield className="absolute left-4 top-4 text-slate-300 group-focus-within:text-red-500 transition-colors" size={22} />
              <input
                required
                className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-red-500/10 focus:border-red-500 outline-none transition-all font-extrabold text-slate-800 text-lg shadow-sm"
                placeholder="Ex: Gerente Geral, Vendedor, Caixa..."
                value={formData.nome}
                onChange={e => setFormData({ ...formData, nome: e.target.value })}
              />
            </div>
            
            <div className="mt-6 flex items-center justify-between p-5 bg-white border border-slate-200 rounded-2xl">
              <div>
                <h4 className="font-extrabold text-slate-800 flex items-center gap-2 text-sm">
                  Acesso a todos os Eventos
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Permite visualizar e alternar entre todos os eventos cadastrados. Se desmarcado, o usuário só verá o evento onde ele estiver matriculado pela secretaria.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, acesso_global_eventos: !prev.acesso_global_eventos }))}
                className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  formData.acesso_global_eventos ? 'bg-red-600' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    formData.acesso_global_eventos ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="p-8 md:p-10 space-y-10">
            <div>
              <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2 mb-1">
                <Layers className="text-red-600" size={20} /> Controle de Telas & Permissões
              </h3>
              <p className="text-sm text-slate-500 pl-7">Selecione quais telas e funcionalidades este nível de acesso poderá visualizar e operar.</p>
            </div>

            <div className="grid grid-cols-1 gap-8">
              {Object.entries(MODULOS_CONFIG).map(([grupo, telas]) => (
                <div key={grupo} className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xl shadow-slate-100/50 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h4 className="font-extrabold text-slate-900 flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-red-500"></span>
                      {grupo}
                    </h4>
                    <button 
                      type="button" 
                      onClick={() => toggleGrupo(grupo)} 
                      className="text-xs font-bold text-slate-400 hover:text-red-600 transition-colors uppercase tracking-wider flex items-center gap-1.5 bg-slate-50 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-slate-100 hover:border-red-100"
                    >
                      {isGrupoSelecionado(grupo) ? (
                        <>
                          <CheckSquare size={14} className="text-red-600" />
                          Desmarcar Grupo
                        </>
                      ) : (
                        <>
                          <Square size={14} className="text-slate-400" />
                          Selecionar Grupo
                        </>
                      )}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {telas.map(tela => {
                      const isSelected = formData.telas_permitidas.includes(tela.id);
                      return (
                        <div 
                          key={tela.id} 
                          className={`p-5 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                            isSelected 
                              ? 'bg-red-50/20 border-red-200 text-red-700 shadow-sm' 
                              : 'bg-slate-50/50 border-slate-100 hover:border-slate-300 hover:bg-white'
                          }`}
                        >
                          <div className="space-y-1">
                            <span className={`text-sm tracking-wide ${isSelected ? 'font-extrabold text-red-900' : 'font-bold text-slate-800'}`}>
                              {tela.nome}
                            </span>
                            <p className="text-xs text-slate-400 font-medium leading-relaxed max-w-[200px]">
                              {TELAS_DESCRICOES[tela.id] || `Acesso à tela de ${tela.nome.toLowerCase()}`}
                            </p>
                          </div>

                          <button 
                            type="button"
                            onClick={() => toggleItem(tela.id)}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              isSelected ? 'bg-red-600' : 'bg-slate-200'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                isSelected ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-8 md:p-10 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm font-bold text-slate-500">
              Atualmente, <span className="text-red-600 text-base font-extrabold">{formData.telas_permitidas.length}</span> {formData.telas_permitidas.length === 1 ? 'tela está liberada' : 'telas estão liberadas'} para este nível.
            </p>
            <button 
              type="submit" 
              disabled={saving} 
              className="w-full sm:w-auto bg-red-600 text-white px-10 py-4 rounded-2xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Salvando...
                </>
              ) : (
                <>
                  <Save size={20} />
                  Salvar Permissões
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
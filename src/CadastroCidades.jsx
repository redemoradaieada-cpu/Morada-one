import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { 
  Save, MapPin, Hash, Map, Plus, Search, Edit2, Trash2, 
  AlertCircle, CheckCircle2, List, Building2 
} from 'lucide-react';
import { useEventContext } from './contexts/EventContext';

export function CadastroCidades() {
  const [isListView, setIsListView] = useState(false);
  const [cidades, setCidades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });
  const [editingId, setEditingId] = useState(null);
  const { eventoSelecionado } = useEventContext();

  const [formData, setFormData] = useState({
    codigo: '',
    nome: '',
    uf: 'GO' // Valor padrão
  });

  const estadosBrasileiros = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 
    'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ];

  useEffect(() => {
    if (isListView) fetchCidades();
  }, [isListView]);

  async function fetchCidades() {
    setLoading(true);
    const { data, error } = await supabase
      .from('cidades')
      .select('*')
      .order('nome', { ascending: true });

    if (error) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao carregar cidades: ' + error.message });
    } else {
      setCidades(data || []);
    }
    setLoading(false);
  }

  const handleEdit = (cidade) => {
    setEditingId(cidade.id);
    setFormData({
      codigo: cidade.codigo,
      nome: cidade.nome,
      uf: cidade.uf
    });
    setIsListView(false);
    setMensagem({ tipo: '', texto: '' });
  };

  const handleDelete = async (cidade) => {
    if (!window.confirm(`Tem certeza que deseja excluir a cidade ${cidade.nome}?`)) return;

    // VERIFICAÇÃO DE SEGURANÇA: Checa se a cidade está sendo usada em inscrições
    const { count, error: countError } = await supabase
      .from('inscricoes_hospedagem')
      .select('*', { count: 'exact', head: true })
      .eq('cidade', cidade.nome);

    if (countError) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao verificar dependências.' });
      return;
    }

    if (count > 0) {
      setMensagem({ 
        tipo: 'erro', 
        texto: `Atenção: A cidade ${cidade.nome} possui ${count} inscrito(s) vinculado(s) e não pode ser excluída.` 
      });
      return;
    }

    // Se passou na verificação, exclui
    const { error } = await supabase.from('cidades').delete().eq('id', cidade.id);
    
    if (!error) {
      setMensagem({ tipo: 'sucesso', texto: 'Cidade excluída com sucesso!' });
      fetchCidades();
    } else {
      setMensagem({ tipo: 'erro', texto: 'Erro ao excluir: ' + error.message });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMensagem({ tipo: '', texto: '' });

    const payload = {
      codigo: formData.codigo,
      nome: formData.nome,
      uf: formData.uf
    };

    try {
      if (editingId) {
        const { error } = await supabase.from('cidades').update(payload).eq('id', editingId);
        if (error) throw error;
        setMensagem({ tipo: 'sucesso', texto: 'Cidade atualizada com sucesso!' });
      } else {
        const { error } = await supabase.from('cidades').insert([payload]);
        if (error) throw error;
        setMensagem({ tipo: 'sucesso', texto: 'Cidade cadastrada com sucesso!' });
      }

      setFormData({ codigo: '', nome: '', uf: 'GO' });
      setEditingId(null);
      
      // Retorna para a lista após sucesso
      setTimeout(() => {
        setIsListView(true);
      }, 1500);

    } catch (err) {
      setMensagem({ tipo: 'erro', texto: 'Erro na operação: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const cidadesFiltradas = cidades.filter(c =>
    c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.codigo.includes(searchTerm)
  );

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
      
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <Building2 className="text-red-600" size={32} /> Cadastro de Cidades
          </h2>
          <p className="text-slate-500 text-sm font-medium pl-11">Gerencie a base de cidades e códigos UF</p>
        </div>

        <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
          <button
            onClick={() => { setIsListView(false); setEditingId(null); setMensagem({tipo:'', texto:''}); }}
            className={`flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${!isListView ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <Plus size={18} /> {editingId ? 'Editar' : 'Nova'}
          </button>
          <button
            onClick={() => { setIsListView(true); setMensagem({tipo:'', texto:''}); }}
            className={`flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${isListView ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <List size={18} /> Relatório
          </button>
        </div>
      </div>

      {mensagem.texto && (
        <div className={`p-5 rounded-2xl border flex items-center gap-4 animate-in slide-in-from-top-4 ${mensagem.tipo === 'sucesso' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {mensagem.tipo === 'sucesso' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
          <span className="font-bold text-sm tracking-wide">{mensagem.texto}</span>
        </div>
      )}

      {/* Main Content Card */}
      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        {!isListView ? (
          <form onSubmit={handleSubmit} className="p-8 md:p-10">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              
              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Código da Cidade</label>
                <div className="relative group">
                  <Hash className="absolute left-4 top-4 text-slate-300 group-focus-within:text-red-500 transition-colors" size={20} />
                  <input
                    required
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-red-500/10 focus:border-red-500 outline-none transition-all text-slate-900 font-bold"
                    placeholder="Ex: 5208707"
                    value={formData.codigo}
                    onChange={e => setFormData({ ...formData, codigo: e.target.value })}
                  />
                </div>
              </div>

              <div className="md:col-span-6">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Nome da Cidade</label>
                <div className="relative group">
                  <MapPin className="absolute left-4 top-4 text-slate-300 group-focus-within:text-red-500 transition-colors" size={20} />
                  <input
                    required
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-red-500/10 focus:border-red-500 outline-none transition-all text-slate-900 font-bold"
                    placeholder="Ex: Goiânia"
                    value={formData.nome}
                    onChange={e => setFormData({ ...formData, nome: e.target.value })}
                  />
                </div>
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">UF</label>
                <div className="relative group">
                  <Map className="absolute left-4 top-4 text-slate-300 group-focus-within:text-red-500 transition-colors" size={20} />
                  <select
                    required
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-red-500/10 focus:border-red-500 outline-none transition-all text-slate-900 font-bold appearance-none cursor-pointer"
                    value={formData.uf}
                    onChange={e => setFormData({ ...formData, uf: e.target.value })}
                  >
                    {estadosBrasileiros.map(uf => (
                      <option key={uf} value={uf}>{uf}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-10 flex justify-end">
              <button
                type="submit" disabled={loading}
                className="bg-red-600 text-white px-10 py-4 rounded-2xl font-bold flex items-center gap-2 hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 disabled:opacity-50"
              >
                <Save size={20} /> {editingId ? 'Atualizar Cidade' : 'Gravar Cidade'}
              </button>
            </div>
          </form>
        ) : (
          <div className="overflow-x-auto">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <div className="relative w-full max-w-md">
                <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
                <input
                  placeholder="Pesquisar por nome ou código..."
                  className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500/20 font-medium text-slate-700"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-8 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Código</th>
                  <th className="px-8 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Cidade</th>
                  <th className="px-8 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">UF</th>
                  <th className="px-8 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {cidadesFiltradas.length > 0 ? (
                  cidadesFiltradas.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-8 py-5 text-sm font-bold text-slate-500">{c.codigo}</td>
                      <td className="px-8 py-5 text-sm font-bold text-slate-900">{c.nome}</td>
                      <td className="px-8 py-5">
                        <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">
                          {c.uf}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleEdit(c)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Editar">
                            <Edit2 size={18} />
                          </button>
                          <button onClick={() => handleDelete(c)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Excluir">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-8 py-20 text-center text-slate-400">
                      <MapPin size={48} className="mx-auto mb-4 opacity-20" />
                      <p className="font-bold">Nenhuma cidade encontrada.</p>
                      <p className="text-sm mt-1">Tente ajustar o termo de pesquisa.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
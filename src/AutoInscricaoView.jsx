import React, { useState, useEffect } from 'react';
import { supabaseCloud } from './supabaseClient';
import { Ticket, User, Phone, MapPin, Calendar, CheckCircle2, ChevronRight, Loader2, CreditCard } from 'lucide-react';
import Swal from 'sweetalert2';

export function AutoInscricaoView() {
  const [step, setStep] = useState(1); // 1: Ficha, 2: Sucesso
  const [loading, setLoading] = useState(false);
  const [fetchingConfig, setFetchingConfig] = useState(true);
  
  // Dados vindos do banco na nuvem
  const [tiposInscricao, setTiposInscricao] = useState([]);
  const [cidades, setCidades] = useState([]);
  const [buscaCidade, setBuscaCidade] = useState('');
  const [mostrarCidades, setMostrarCidades] = useState(false);
  const [eventoAtivo, setEventoAtivo] = useState(null);

  // Form
  const [formData, setFormData] = useState({
    nome_completo: '',
    cpf: '',
    data_nascimento: '',
    sexo: 'Masculino',
    telefone: '',
    email: '',
    nome_pastor: '',
    regional: '',
    endereco: '',
    cidade: '',
    estado: 'GO',
    cidade_codigo: '',
    tipo_inscricao_id: '',
    forma_pagamento: 'Pix'
  });

  useEffect(() => {
    async function loadConfig() {
      try {
        // Carrega o evento ativo
        const { data: evtData, error: errEvt } = await supabaseCloud
          .from('eventos')
          .select('id, nome')
          .eq('status', 'ativo')
          .limit(1)
          .maybeSingle();

        let eventoId = null;
        if (evtData) {
          setEventoAtivo(evtData);
          eventoId = evtData.id;
        } else {
          console.warn("Nenhum evento ativo encontrado");
        }

        // Carrega tipos de inscrição da Nuvem
        const hoje = new Date().toISOString().split('T')[0];
        let queryTipos = supabaseCloud
          .from('tipos_inscricao')
          .select('id, nome, valor, data_validade')
          .or(`data_validade.is.null,data_validade.gte.${hoje}`)
          .order('nome');
        
        if (eventoId) {
          queryTipos = queryTipos.eq('evento_id', eventoId);
        }

        const { data: tipos } = await queryTipos;
        if (tipos) setTiposInscricao(tipos);

        // Carrega as cidades para busca
        const { data: cids } = await supabaseCloud
          .from('cidades')
          .select('codigo, nome, uf')
          .order('nome');
        
        if (cids) setCidades(cids);
      } catch (err) {
        console.error('Erro ao carregar dados da nuvem:', err);
      } finally {
        setFetchingConfig(false);
      }
    }
    loadConfig();
  }, []);

  const formatCPF = (cpf) => {
    if (!cpf) return '';
    const cleaned = cpf.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,3})(\d{0,2})$/);
    if (!match) return cpf;
    return !match[2] ? match[1] : `${match[1]}.${match[2]}` + (match[3] ? `.${match[3]}` : '') + (match[4] ? `-${match[4]}` : '');
  };

  const formatTelefone = (tel) => {
    if (!tel) return '';
    const cleaned = tel.replace(/\D/g, '');
    const match = cleaned.length >= 11 
      ? cleaned.match(/^(\d{0,2})(\d{0,5})(\d{0,4})$/)
      : cleaned.match(/^(\d{0,2})(\d{0,4})(\d{0,4})$/);
    if (!match) return tel;
    return !match[2] ? (match[1] ? `(${match[1]}` : '') : `(${match[1]}) ${match[2]}` + (match[3] ? `-${match[3]}` : '');
  };

  const handleInputChange = (e) => {
    let { name, value } = e.target;
    if (name === 'cpf') value = formatCPF(value);
    if (name === 'telefone') value = formatTelefone(value);
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const selecionarCidade = (cid) => {
    setFormData(prev => ({
      ...prev,
      cidade: cid.nome,
      estado: cid.uf,
      cidade_codigo: cid.codigo
    }));
    setBuscaCidade(cid.nome);
    setMostrarCidades(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nome_completo || !formData.tipo_inscricao_id) {
      Swal.fire('Atenção', 'Por favor, preencha seu nome e escolha o tipo de inscrição!', 'warning');
      return;
    }
    
    if (!eventoAtivo) {
      Swal.fire('Atenção', 'Nenhum evento ativo no momento. Inscrições temporariamente indisponíveis.', 'warning');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabaseCloud
        .from('pre_inscricoes')
        .insert([{
          nome_completo: formData.nome_completo.toUpperCase(),
          cpf: formData.cpf.replace(/\D/g, ''),
          data_nascimento: formData.data_nascimento || null,
          sexo: formData.sexo,
          telefone: formData.telefone,
          email: formData.email,
          nome_pastor: formData.nome_pastor,
          regional: formData.regional,
          endereco: formData.endereco,
          cidade: formData.cidade,
          estado: formData.estado,
          cidade_codigo: formData.cidade_codigo,
          tipo_inscricao_id: Number(formData.tipo_inscricao_id),
          forma_pagamento: formData.forma_pagamento,
          evento_id: eventoAtivo.id
        }]);

      if (error) throw error;

      setStep(2);
    } catch (err) {
      console.error(err);
      Swal.fire('Erro', 'Não foi possível registrar a pré-inscrição: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar lista de cidades
  const cidadesFiltradas = cidades.filter(c => 
    c.nome.toLowerCase().includes(buscaCidade.toLowerCase())
  ).slice(0, 5);

  if (fetchingConfig) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="animate-spin text-red-600 w-10 h-10 mb-4" />
        <p className="text-slate-600 font-medium">Carregando formulário...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-slate-950 text-white py-6 px-4 shadow-md flex flex-col items-center gap-2">
        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20">
          <Ticket className="text-red-500 w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold tracking-tight">Morada <span className="text-red-500">One</span></h1>
        <p className="text-slate-400 text-xs uppercase tracking-widest font-bold">Ficha de Pré-Inscrição</p>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-md mx-auto p-4 flex flex-col justify-center">
        {step === 1 ? (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xl shadow-slate-200/50 space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <User size={18} className="text-red-600" /> Dados Pessoais
              </h2>
              <p className="text-slate-500 text-xs mt-0.5">Preencha sua ficha para agilizar seu check-in no acampamento.</p>
            </div>

            {/* Nome Completo */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 uppercase">Nome Completo *</label>
              <input
                type="text"
                name="nome_completo"
                value={formData.nome_completo}
                onChange={handleInputChange}
                required
                placeholder="Ex: JOÃO SILVA PINTO"
                className="w-full p-3 border border-slate-200 rounded-xl focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all outline-none text-sm"
              />
            </div>

            {/* CPF e Data Nasc */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase">CPF</label>
                <input
                  type="text"
                  name="cpf"
                  value={formData.cpf}
                  onChange={handleInputChange}
                  placeholder="000.000.000-00"
                  className="w-full p-3 border border-slate-200 rounded-xl focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all outline-none text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase">Data Nascimento</label>
                <input
                  type="date"
                  name="data_nascimento"
                  value={formData.data_nascimento}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-slate-200 rounded-xl focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all outline-none text-sm text-slate-600"
                />
              </div>
            </div>

            {/* Sexo e Telefone */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase">Sexo</label>
                <select
                  name="sexo"
                  value={formData.sexo}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-slate-200 rounded-xl focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all outline-none text-sm text-slate-600 bg-white"
                >
                  <option value="Masculino">Masculino</option>
                  <option value="Feminino">Feminino</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase">Telefone / WhatsApp</label>
                <input
                  type="tel"
                  name="telefone"
                  value={formData.telefone}
                  onChange={handleInputChange}
                  placeholder="(62) 99999-9999"
                  className="w-full p-3 border border-slate-200 rounded-xl focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all outline-none text-sm"
                />
              </div>
            </div>

            {/* Endereço, Cidade e Estado */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase">Endereço *</label>
                <input
                  type="text"
                  name="endereco"
                  value={formData.endereco}
                  onChange={handleInputChange}
                  required
                  placeholder="Rua, número, bairro"
                  className="w-full p-3 border border-slate-200 rounded-xl focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all outline-none text-sm"
                />
              </div>

              <div className="space-y-1 relative">
                <label className="text-xs font-bold text-slate-600 uppercase flex items-center gap-1">
                  <MapPin size={12} /> Cidade *
                </label>
                <input
                  type="text"
                  placeholder="Pesquise sua cidade..."
                  value={buscaCidade}
                  onChange={(e) => {
                    setBuscaCidade(e.target.value);
                    setMostrarCidades(true);
                  }}
                  onFocus={() => setMostrarCidades(true)}
                  className="w-full p-3 border border-slate-200 rounded-xl focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all outline-none text-sm"
                />
                {mostrarCidades && buscaCidade && (
                  <div className="absolute left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg mt-1 z-10 overflow-hidden">
                    {cidadesFiltradas.length > 0 ? (
                      cidadesFiltradas.map(c => (
                        <button
                          key={c.codigo}
                          type="button"
                          onClick={() => selecionarCidade(c)}
                          className="w-full text-left p-3 hover:bg-slate-50 text-sm border-b border-slate-100 last:border-0"
                        >
                          {c.nome} - {c.uf}
                        </button>
                      ))
                    ) : (
                      <div className="p-3 text-sm text-slate-500">Nenhuma cidade encontrada</div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase">Estado</label>
                <input
                  type="text"
                  disabled
                  value={formData.estado}
                  placeholder="UF"
                  className="w-full p-3 border border-slate-200 rounded-xl bg-slate-100 opacity-60 cursor-not-allowed outline-none text-sm text-slate-500 font-bold uppercase"
                />
              </div>
            </div>

            {/* Igreja e Regional */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase flex items-center gap-1">Pastor <span className="normal-case text-[9px] text-slate-400 font-medium">(Opcional)</span></label>
                <input
                  type="text"
                  name="nome_pastor"
                  value={formData.nome_pastor}
                  onChange={handleInputChange}
                  placeholder="Nome do Pastor"
                  className="w-full p-3 border border-slate-200 rounded-xl focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all outline-none text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase flex items-center gap-1">Regional <span className="normal-case text-[9px] text-slate-400 font-medium">(Opcional)</span></label>
                <input
                  type="text"
                  name="regional"
                  value={formData.regional}
                  onChange={handleInputChange}
                  placeholder="Ex: Regional Sul"
                  className="w-full p-3 border border-slate-200 rounded-xl focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all outline-none text-sm"
                />
              </div>
            </div>

            {/* Tipo de Inscrição */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 uppercase">Tipo de Inscrição *</label>
              <select
                name="tipo_inscricao_id"
                value={formData.tipo_inscricao_id}
                onChange={handleInputChange}
                required
                className="w-full p-3 border border-slate-200 rounded-xl focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all outline-none text-sm text-slate-600 bg-white"
              >
                <option value="">Selecione o tipo...</option>
                {tiposInscricao.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.nome} - R$ {t.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </option>
                ))}
              </select>
            </div>

            {/* Forma de Pagamento */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 uppercase flex items-center gap-1">
                <CreditCard size={12} className="text-red-600" /> Forma de Pagamento Pretendida *
              </label>
              <select
                name="forma_pagamento"
                value={formData.forma_pagamento}
                onChange={handleInputChange}
                required
                className="w-full p-3 border border-slate-200 rounded-xl focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all outline-none text-sm text-slate-600 bg-white"
              >
                <option value="Pix">Pix</option>
                <option value="Cartão">Cartão (Débito ou Crédito)</option>
                <option value="Dinheiro">Dinheiro</option>
              </select>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-600/20 disabled:bg-slate-300 disabled:shadow-none mt-2"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <>Enviar Pré-Inscrição <ChevronRight size={18} /></>
              )}
            </button>
          </form>
        ) : (
          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-xl shadow-slate-200/50 flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center border border-green-100 text-green-500">
              <CheckCircle2 size={32} />
            </div>
            <h2 className="font-bold text-slate-800 text-xl">Pré-Inscrição Enviada!</h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              Sua ficha foi registrada com sucesso. 
              <br />
              <strong className="text-slate-800">Próximo Passo:</strong> Vá ao guichê da Secretaria do acampamento para realizar o pagamento (Cartão ou Pix) e confirmar sua entrada.
            </p>
            <button
              onClick={() => {
                setFormData({
                  nome_completo: '', cpf: '', data_nascimento: '', sexo: 'Masculino',
                  telefone: '', email: '', nome_pastor: '', regional: '', endereco: '',
                  cidade: '', estado: 'GO', cidade_codigo: '', tipo_inscricao_id: ''
                });
                setBuscaCidade('');
                setStep(1);
              }}
              className="px-6 py-3 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-sm font-bold transition-all mt-4"
            >
              Fazer outra inscrição
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-slate-400 text-[10px]">
        Morada One © {new Date().getFullYear()} — Todos os direitos reservados.
      </footer>
    </div>
  );
}

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import {
  Save, User, IdCard, Cake, Phone, Mail, Church,
  MapPin, Building2, Landmark, CreditCard, Ticket,
  Plus, Search, Edit2, Trash2, AlertCircle,
  Eye, DollarSign, Calendar, Clock, MoreVertical, 
  List, ClipboardList, UploadCloud, CheckCircle2, UserCheck
} from 'lucide-react';
import { ImportarPlanilha } from './ImportarPlanilha';
import { CidadeSearchInput } from './CidadeSearchInput';
import Swal from 'sweetalert2';
import { useEventContext } from './contexts/EventContext';

const initialFormData = {
  nome_completo: '',
  cpf: '',
  data_nascimento: '',
  sexo: '',
  telefone: '',
  email: '',
  nome_pastor: '',
  regional: '',
  endereco: '',
  cidade: '',
  estado: '',
  cidade_codigo: '', // NOVO: Armazena o código IBGE
  condicao_pagamento: 'a_vista',
  qtd_parcelas: 1,
  forma_pagamento: 'Pix',
  tipo_inscricao_id: '',
  evento_id: '' // Será preenchido com eventoSelecionado.id
};

export function Inscricoes({ initialViewMode = 'novo' }) {
  const [viewMode, setViewMode] = useState(initialViewMode); // 'novo' | 'lista' | 'importar' | 'pre-inscricoes'
  const [menuOpen, setMenuOpen] = useState(false);
  const [inscricoes, setInscricoes] = useState([]);
  const [preInscricoes, setPreInscricoes] = useState([]);
  const [tiposInscricao, setTiposInscricao] = useState([]);
  const [cidadesBanco, setCidadesBanco] = useState([]); // NOVO: Armazena a lista de cidades
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });
  const [editingId, setEditingId] = useState(null);
  const [buscandoCpf, setBuscandoCpf] = useState(false);
  const [selectedInscritoParcelas, setSelectedInscritoParcelas] = useState(null);
  const [parcelasDoInscrito, setParcelasDoInscrito] = useState([]);
  const { eventos, eventoSelecionado } = useEventContext();
  const isGlobalUser = eventos && eventos.length > 1;
  const [filtroEventoListagem, setFiltroEventoListagem] = useState(isGlobalUser ? 'todos' : eventoSelecionado?.id);
  const [selectedInscricoes, setSelectedInscricoes] = useState([]);

  const [formData, setFormData] = useState({
    ...initialFormData,
    evento_id: eventoSelecionado?.id || ''
  });

  useEffect(() => {
    if (!eventoSelecionado) return;
    fetchTiposInscricao();
    fetchCidades(); // NOVO: Carrega as cidades ao abrir a tela
    
    // Se não houver evento_id no form ou se for inclusão nova (sem edição), atualiza
    if (!editingId) {
      setFormData(prev => ({ ...prev, evento_id: eventoSelecionado.id }));
    }
  }, [eventoSelecionado]);

  useEffect(() => {
    if (!eventoSelecionado) return;
    if (viewMode === 'lista') fetchInscricoes();
    if (viewMode === 'pre-inscricoes') fetchPreInscricoes();
  }, [viewMode, eventoSelecionado, filtroEventoListagem]);

  useEffect(() => {
    if (!eventoSelecionado) return;
    fetchInscricoes();
    fetchPreInscricoes();

    const channelInsc = supabase
      .channel('public:inscricoes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inscricoes_hospedagem' }, (payload) => {
        fetchInscricoes(); 
      })
      .subscribe();

    const channelPre = supabase
      .channel('public:pre_inscricoes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pre_inscricoes' }, (payload) => {
        fetchPreInscricoes(); 
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channelInsc);
      supabase.removeChannel(channelPre);
    };
  }, [eventoSelecionado]);

  // NOVO: Função para buscar as cidades cadastradas
  async function fetchCidades() {
    const { data, error } = await supabase
      .from('cidades')
      .select('*')
      .order('nome', { ascending: true });

    if (!error && data) {
      setCidadesBanco(data);
    }
  }

  async function fetchTiposInscricao() {
    const hoje = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('tipos_inscricao')
      .select('id, nome, valor, data_validade')
      .eq('evento_id', eventoSelecionado.id)
      .or(`data_validade.is.null,data_validade.gte.${hoje}`)
      .order('nome');

    if (!error) setTiposInscricao(data || []);
  }

  async function fetchInscricoes() {
    setFetching(true);
    let query = supabase
      .from('inscricoes_hospedagem')
      .select('*, tipos_inscricao(nome, valor)')
      .order('created_at', { ascending: false });

    if (isGlobalUser) {
      if (filtroEventoListagem !== 'todos') {
        query = query.eq('evento_id', filtroEventoListagem);
      } else {
        const ids = eventos.map(e => e.id);
        query = query.in('evento_id', ids);
      }
    } else {
      query = query.eq('evento_id', eventoSelecionado.id);
    }

    const { data, error } = await query;

    if (error) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao carregar inscrições: ' + error.message });
    } else {
      setInscricoes(data || []);
    }
    setFetching(false);
  }

  async function fetchPreInscricoes() {
    setFetching(true);
    let query = supabase
      .from('pre_inscricoes')
      .select('*, tipos_inscricao(nome, valor)')
      .order('created_at', { ascending: false });

    if (isGlobalUser) {
      if (filtroEventoListagem !== 'todos') {
        query = query.eq('evento_id', filtroEventoListagem);
      } else {
        const ids = eventos.map(e => e.id);
        query = query.in('evento_id', ids);
      }
    } else {
      query = query.eq('evento_id', eventoSelecionado.id);
    }

    const { data, error } = await query;

    if (error) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao carregar pré-inscrições: ' + error.message });
    } else {
      setPreInscricoes(data || []);
    }
    setFetching(false);
  }

  const handleConfirmPreInscricao = async (pre) => {
    const { value: formaPagamento } = await Swal.fire({
      title: 'Confirmar Pré-Inscrição',
      html: `
        <div class="text-left space-y-2 text-sm text-slate-600">
          <p><strong>Nome:</strong> ${pre.nome_completo}</p>
          <p><strong>Valor a Cobrar:</strong> R$ ${pre.tipos_inscricao?.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          <p><strong>Opção de Pagamento do Campista:</strong> <span class="bg-red-50 text-red-600 px-2 py-0.5 rounded font-bold">${pre.forma_pagamento || 'Não informada'}</span></p>
        </div>
      `,
      input: 'select',
      inputOptions: {
        'Pix': 'Pix',
        'Cartão': 'Cartão',
        'Dinheiro': 'Dinheiro'
      },
      inputValue: pre.forma_pagamento || 'Pix',
      inputPlaceholder: 'Confirmar Forma de Pagamento',
      showCancelButton: true,
      confirmButtonText: 'Confirmar Recebimento',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
      inputValidator: (value) => {
        if (!value) {
          return 'Você precisa selecionar uma forma de pagamento!';
        }
      }
    });

    if (formaPagamento) {
      setLoading(true);
      try {
        // 1. Salva na base oficial de inscricoes_hospedagem local
        const { error: errIns } = await supabase
          .from('inscricoes_hospedagem')
          .insert([{
            nome_completo: pre.nome_completo,
            cpf: pre.cpf,
            data_nascimento: pre.data_nascimento,
            telefone: pre.telefone,
            email: pre.email,
            nome_pastor: pre.nome_pastor,
            regional: pre.regional,
            endereco: pre.endereco,
            cidade: pre.cidade,
            estado: pre.estado,
            forma_pagamento: formaPagamento,
            tipo_inscricao_id: pre.tipo_inscricao_id,
            sexo: pre.sexo,
            cidade_codigo: pre.cidade_codigo,
            acerto_id: null,
            sincronizado_nuvem: false,
            evento_id: p.evento_id || formData.evento_id || eventoSelecionado.id
          }]);

        if (errIns) throw errIns;

        // 2. Remove de pre_inscricoes local
        const { error: errDel } = await supabase
          .from('pre_inscricoes')
          .delete()
          .eq('id', pre.id);

        if (errDel) throw errDel;

        Swal.fire('Confirmado!', 'O campista foi cadastrado oficialmente e o caixa foi atualizado!', 'success');
      } catch (err) {
        console.error(err);
        Swal.fire('Erro', 'Não foi possível confirmar: ' + err.message, 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleEdit = (inscricao) => {
    setEditingId(inscricao.id);
    setFormData({
      nome_completo: inscricao.nome_completo,
      cpf: inscricao.cpf,
      data_nascimento: inscricao.data_nascimento,
      sexo: inscricao.sexo || '',
      telefone: inscricao.telefone,
      email: inscricao.email || '',
      nome_pastor: inscricao.nome_pastor,
      regional: inscricao.regional,
      endereco: inscricao.endereco,
      cidade: inscricao.cidade,
      estado: inscricao.estado,
      cidade_codigo: inscricao.cidade_codigo || '',
      condicao_pagamento: inscricao.condicao_pagamento || 'a_vista',
      qtd_parcelas: inscricao.qtd_parcelas || 1,
      forma_pagamento: inscricao.forma_pagamento,
      tipo_inscricao_id: inscricao.tipo_inscricao_id
    });
    setViewMode('novo');
  };

  const buscarPorCpf = async (valorDigitado) => {
    if (editingId) return; 
    const limpo = String(valorDigitado || '').replace(/\D/g, '');
    if (limpo.length !== 11) return;

    setBuscandoCpf(true);
    let { data } = await supabase
      .from('inscricoes_hospedagem')
      .select('nome_completo, data_nascimento, sexo')
      .eq('cpf', limpo)
      .eq('evento_id', eventoSelecionado.id)
      .maybeSingle();

    if (!data) {
      const resultadoBruto = await supabase
        .from('inscricoes_hospedagem')
        .select('nome_completo, data_nascimento, sexo')
        .eq('cpf', valorDigitado)
        .maybeSingle();
      data = resultadoBruto.data;
    }

    setBuscandoCpf(false);

    if (data) {
      setFormData(prev => ({
        ...prev,
        nome_completo: data.nome_completo || prev.nome_completo,
        data_nascimento: data.data_nascimento || prev.data_nascimento,
        sexo: data.sexo || prev.sexo
      }));
    }
  };

  const handleDelete = async (id) => {
    const { isConfirmed } = await Swal.fire({
      title: 'Tem certeza?',
      text: 'Você não poderá reverter esta exclusão!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sim, excluir!',
      cancelButtonText: 'Cancelar'
    });
    
    if (!isConfirmed) return;
    
    const { data, error } = await supabase.from('inscricoes_hospedagem').delete().eq('id', id).select();
    if (error) {
      Swal.fire('Erro', 'Erro ao excluir: ' + error.message, 'error');
    } else if (!data || data.length === 0) {
      Swal.fire('Erro', 'Não foi possível excluir: verifique a policy de DELETE (RLS).', 'error');
    } else {
      Swal.fire('Excluído!', 'A inscrição foi excluída.', 'success');
      fetchInscricoes();
    }
  };

  const handleExcluirEmLote = async () => {
    if (selectedInscricoes.length === 0) return;
    
    const { isConfirmed } = await Swal.fire({
      title: 'Excluir em lote?',
      text: `Você está prestes a excluir ${selectedInscricoes.length} inscrição(ões). Essa ação não pode ser desfeita.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sim, excluir todas!',
      cancelButtonText: 'Cancelar'
    });

    if (isConfirmed) {
      setFetching(true);
      const { error } = await supabase
        .from('inscricoes_hospedagem')
        .delete()
        .in('id', selectedInscricoes);

      setFetching(false);
      
      if (error) {
        Swal.fire('Erro', 'Ocorreu um erro ao excluir as inscrições: ' + error.message, 'error');
      } else {
        Swal.fire('Excluídas!', `${selectedInscricoes.length} inscrição(ões) foram excluídas com sucesso.`, 'success');
        setSelectedInscricoes([]);
        fetchInscricoes();
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMensagem({ tipo: '', texto: '' });

    const selectedTipo = tiposInscricao.find(t => t.id.toString() === formData.tipo_inscricao_id.toString());
    const valorInscricao = selectedTipo ? parseFloat(selectedTipo.valor) : 0;

    const payload = {
      nome_completo: formData.nome_completo,
      cpf: formData.cpf,
      data_nascimento: formData.data_nascimento,
      sexo: formData.sexo,
      telefone: formData.telefone,
      email: formData.email || null,
      nome_pastor: formData.nome_pastor,
      regional: formData.regional,
      endereco: formData.endereco,
      cidade: formData.cidade,
      estado: formData.estado,
      cidade_codigo: formData.cidade_codigo || null,
      forma_pagamento: formData.forma_pagamento,
      condicao_pagamento: formData.condicao_pagamento,
      qtd_parcelas: formData.condicao_pagamento === 'parcelado' ? parseInt(formData.qtd_parcelas || 1) : 1,
      tipo_inscricao_id: formData.tipo_inscricao_id,
      evento_id: formData.evento_id || eventoSelecionado.id
    };

    try {
      let inscId = editingId;
      if (editingId) {
        const { error } = await supabase.from('inscricoes_hospedagem').update(payload).eq('id', editingId);
        if (error) throw error;
        
        // Limpar e regenerar parcelas ao editar
        await supabase.from('inscricao_parcelas').delete().eq('inscricao_id', editingId);
        
        const parcelasToInsert = [];
        if (payload.condicao_pagamento === 'a_vista') {
          parcelasToInsert.push({
            inscricao_id: editingId,
            descricao: `À Vista - ${payload.forma_pagamento}`,
            valor: valorInscricao,
            data_vencimento: new Date().toISOString().split('T')[0],
            status: 'pago',
            data_pagamento: new Date().toISOString(),
            evento_id: formData.evento_id || eventoSelecionado.id
          });
        } else {
          const qtd = parseInt(payload.qtd_parcelas || 1);
          const valorParcela = parseFloat((valorInscricao / qtd).toFixed(2));
          const somaArredondada = valorParcela * (qtd - 1);
          const valorUltimaParcela = parseFloat((valorInscricao - somaArredondada).toFixed(2));

          for (let i = 0; i < qtd; i++) {
            const dataVenc = new Date();
            dataVenc.setMonth(dataVenc.getMonth() + i);
            parcelasToInsert.push({
              inscricao_id: editingId,
              descricao: `Parcela ${i + 1}/${qtd} (${payload.forma_pagamento})`,
              valor: i === qtd - 1 ? valorUltimaParcela : valorParcela,
              data_vencimento: dataVenc.toISOString().split('T')[0],
              status: 'aberto',
              data_pagamento: null,
              evento_id: formData.evento_id || eventoSelecionado.id
            });
          }
        }
        if (parcelasToInsert.length > 0) {
          await supabase.from('inscricao_parcelas').insert(parcelasToInsert);
        }

        setMensagem({ tipo: 'sucesso', texto: 'Inscrição atualizada e parcelas recalculadas!' });
      } else {
        const { data, error } = await supabase.from('inscricoes_hospedagem').insert([payload]).select().single();
        if (error) throw error;
        inscId = data.id;

        // Auto-gerar parcelas para nova inscrição
        const parcelasToInsert = [];
        if (formData.condicao_pagamento === 'a_vista') {
          parcelasToInsert.push({
            inscricao_id: inscId,
            descricao: `À Vista - ${formData.forma_pagamento}`,
            valor: valorInscricao,
            data_vencimento: new Date().toISOString().split('T')[0],
            status: 'pago',
            data_pagamento: new Date().toISOString(),
            evento_id: formData.evento_id || eventoSelecionado.id
          });
        } else {
          const qtd = parseInt(formData.qtd_parcelas || 1);
          const valorParcela = parseFloat((valorInscricao / qtd).toFixed(2));
          const somaArredondada = valorParcela * (qtd - 1);
          const valorUltimaParcela = parseFloat((valorInscricao - somaArredondada).toFixed(2));

          for (let i = 0; i < qtd; i++) {
            const dataVenc = new Date();
            dataVenc.setMonth(dataVenc.getMonth() + i);
            parcelasToInsert.push({
              inscricao_id: inscId,
              descricao: `Parcela ${i + 1}/${qtd} (${formData.forma_pagamento})`,
              valor: i === qtd - 1 ? valorUltimaParcela : valorParcela,
              data_vencimento: dataVenc.toISOString().split('T')[0],
              status: 'aberto',
              data_pagamento: null,
              evento_id: formData.evento_id || eventoSelecionado.id
            });
          }
        }
        if (parcelasToInsert.length > 0) {
          await supabase.from('inscricao_parcelas').insert(parcelasToInsert);
        }

        setMensagem({ tipo: 'sucesso', texto: 'Inscrição registrada e parcelas geradas com sucesso!' });
      }

      setFormData(initialFormData);
      setEditingId(null);
      fetchInscricoes();
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: 'Erro na operação: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const verParcelas = async (inscrito) => {
    setSelectedInscritoParcelas(inscrito);
    const { data, error } = await supabase
      .from('inscricao_parcelas')
      .select('*')
      .eq('inscricao_id', inscrito.id)
      .order('data_vencimento', { ascending: true });
    if (!error) {
      setParcelasDoInscrito(data || []);
    } else {
      Swal.fire("Erro", "Não foi possível carregar as parcelas: " + error.message, "error");
    }
  };

  const darBaixaParcela = async (parcelaId, novoStatus = 'pago') => {
    const confirmacao = await Swal.fire({
      title: novoStatus === 'pago' ? 'Confirmar Recebimento?' : 'Reverter Baixa?',
      text: novoStatus === 'pago' 
        ? "Você está confirmando que esta parcela foi paga?" 
        : "Tem certeza que deseja reverter o status desta parcela para pendente?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: novoStatus === 'pago' ? '#10b981' : '#f43f5e',
      confirmButtonText: 'Sim',
      cancelButtonText: 'Não'
    });
    if (!confirmacao.isConfirmed) return;

    const dataPagto = novoStatus === 'pago' ? new Date().toISOString() : null;
    const { error } = await supabase
      .from('inscricao_parcelas')
      .update({
        status: novoStatus,
        data_pagamento: dataPagto
      })
      .eq('id', parcelaId);

    if (error) {
      Swal.fire("Erro", "Erro ao atualizar parcela: " + error.message, "error");
    } else {
      if (selectedInscritoParcelas) {
        const { data } = await supabase
          .from('inscricao_parcelas')
          .select('*')
          .eq('inscricao_id', selectedInscritoParcelas.id)
          .order('data_vencimento', { ascending: true });
        setParcelasDoInscrito(data || []);
      }
      Swal.fire({
        title: "Sucesso!",
        text: novoStatus === 'pago' ? "Parcela baixada com sucesso!" : "Baixa desfeita com sucesso!",
        icon: "success",
        timer: 1200,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
    }
  };

  const filteredInscricoes = inscricoes.filter(i => {
    const matchesSearch = i.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (i.cpf && i.cpf.includes(searchTerm));
    const matchesTipo = filterTipo === '' || i.tipo_inscricao_id?.toString() === filterTipo;
    return matchesSearch && matchesTipo;
  });

  const totaisPorTipo = useMemo(() => {
    const totais = { 'Total Geral': filteredInscricoes.length };
    filteredInscricoes.forEach(i => {
      const nomeTipo = i.tipos_inscricao?.nome || 'Sem Categoria';
      totais[nomeTipo] = (totais[nomeTipo] || 0) + 1;
    });
    return totais;
  }, [filteredInscricoes]);

  const filteredPreInscricoes = preInscricoes.filter(p => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      p.nome_completo.toLowerCase().includes(term) ||
      (p.cpf && p.cpf.includes(term)) ||
      (p.nome_pastor && p.nome_pastor.toLowerCase().includes(term)) ||
      (p.cidade && p.cidade.toLowerCase().includes(term)) ||
      (p.regional && p.regional.toLowerCase().includes(term));
    return matchesSearch;
  });

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

  const calcularIdade = (dataString) => {
    if (!dataString) return '-';
    
    const [ano, mes, dia] = dataString.split('-');
    if (!ano || !mes || !dia) return '-';

    const hoje = new Date();
    const nascimento = new Date(ano, mes - 1, dia);
    
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const diferencaMes = hoje.getMonth() - nascimento.getMonth();
    
    if (diferencaMes < 0 || (diferencaMes === 0 && hoje.getDate() < nascimento.getDate())) {
      idade--;
    }
    
    return idade;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Ticket className="text-red-600" /> Inscrições
          </h2>
          <p className="text-slate-500 text-sm">Registro de inscrições de hospedagem</p>
        </div>

        <div className="relative">
          <button
            onClick={() => setMenuOpen(prev => !prev)}
            className="flex items-center justify-center w-10 h-10 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 transition-all text-slate-600"
          >
            <MoreVertical size={20} />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg z-20 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                <button
                  onClick={() => { setViewMode('novo'); setEditingId(null); setFormData({ ...initialFormData, evento_id: eventoSelecionado?.id }); setMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-left transition-all ${viewMode === 'novo' ? 'bg-red-50 text-red-600' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <Plus size={16} /> Nova Inscrição
                </button>
                <button
                  onClick={() => { setViewMode('lista'); setMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-left transition-all border-t border-slate-100 ${viewMode === 'lista' ? 'bg-red-50 text-red-600' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <List size={16} /> Relatório
                </button>
                <button
                  onClick={() => { 
                    window.open(window.location.pathname + '?tela=pre-inscricoes', '_blank'); 
                    setMenuOpen(false); 
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-left transition-all border-t border-slate-100 text-slate-600 hover:bg-slate-50"
                >
                  <ClipboardList size={16} /> Pré-Inscrições
                </button>
                <button
                  onClick={() => { setViewMode('importar'); setMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-left transition-all border-t border-slate-100 ${viewMode === 'importar' ? 'bg-red-50 text-red-600' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <UploadCloud size={16} /> Importar Planilha
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {mensagem.texto && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${mensagem.tipo === 'sucesso' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
          {mensagem.tipo === 'sucesso' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span className="text-sm font-medium">{mensagem.texto}</span>
        </div>
      )}

      {viewMode === 'importar' && (
        <ImportarPlanilha
          tiposInscricao={tiposInscricao}
          cidades={cidadesBanco}
          onConcluido={() => { setViewMode('lista'); }}
        />
      )}

      {viewMode === 'pre-inscricoes' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center justify-between">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Pesquisar pré-inscrição por nome ou CPF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 p-2 border border-slate-300 rounded-lg outline-none focus:border-red-500 transition-all text-sm"
              />
            </div>
            {isGlobalUser && (
              <select
                className="p-2 border border-slate-300 rounded-lg text-sm bg-white"
                value={filtroEventoListagem}
                onChange={(e) => setFiltroEventoListagem(e.target.value)}
              >
                <option value="todos">Todos os Eventos</option>
                {eventos.map(ev => <option key={ev.id} value={ev.id}>{ev.nome}</option>)}
              </select>
            )}
            <div className="font-bold text-slate-700 bg-red-50 px-4 py-2 rounded-lg border border-red-100 text-sm">
              Pendentes: {preInscricoes.length} fichas
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
            {fetching ? (
              <div className="p-8 text-center text-slate-500">Carregando fichas...</div>
            ) : filteredPreInscricoes.length === 0 ? (
              <div className="p-8 text-center text-slate-500">Nenhuma pré-inscrição pendente encontrada.</div>
            ) : (
              <table className="w-full text-sm whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr className="text-slate-600 font-semibold">
                    <th className="p-4 text-left">Nome</th>
                    {isGlobalUser && filtroEventoListagem === 'todos' && <th className="p-4 text-left">Evento</th>}
                    <th className="p-4 text-left">CPF</th>
                    <th className="p-4 text-center">Idade</th>
                    <th className="p-4 text-left">Sexo</th>
                    <th className="p-4 text-left">Telefone</th>
                    <th className="p-4 text-left">Cidade/UF</th>
                    <th className="p-4 text-left">Regional</th>
                    <th className="p-4 text-left">Pastor</th>
                    <th className="p-4 text-left">Tipo</th>
                    <th className="p-4 text-left">Pagamento</th>
                    <th className="p-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredPreInscricoes.map(p => {
                    const idade = p.data_nascimento 
                      ? new Date().getFullYear() - new Date(p.data_nascimento).getFullYear() 
                      : '-';
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 font-medium text-slate-900">{p.nome_completo}</td>
                        {isGlobalUser && filtroEventoListagem === 'todos' && (
                          <td className="p-4">
                            <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap">
                              {eventos.find(e => e.id === p.evento_id)?.nome || '-'}
                            </span>
                          </td>
                        )}
                        <td className="p-4">{formatCPF(p.cpf) || '-'}</td>
                        <td className="p-4 text-center">{idade}</td>
                        <td className="p-4">{p.sexo || '-'}</td>
                        <td className="p-4">{formatTelefone(p.telefone) || '-'}</td>
                        <td className="p-4">{p.cidade ? `${p.cidade}/${p.estado}` : '-'}</td>
                        <td className="p-4">{p.regional || '-'}</td>
                        <td className="p-4">{p.nome_pastor || '-'}</td>
                        <td className="p-4">
                          <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full text-xs font-semibold">
                            {p.tipos_inscricao?.nome || 'Comum'}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            p.forma_pagamento === 'Pix' ? 'bg-teal-50 text-teal-700 border border-teal-100' :
                            p.forma_pagamento === 'Cartão' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                            'bg-amber-50 text-amber-700 border border-amber-100'
                          }`}>
                            {p.forma_pagamento || 'Pendente'}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleConfirmPreInscricao(p)}
                              title="Confirmar Pagamento e Inscrição"
                              className="p-2 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg transition-all flex items-center gap-1 font-semibold text-xs border border-green-100"
                            >
                              <UserCheck size={14} /> Confirmar
                            </button>
                            <button
                              onClick={async () => {
                                const { isConfirmed } = await Swal.fire({
                                  title: 'Excluir pré-inscrição?',
                                  text: 'Esta ação não pode ser desfeita!',
                                  icon: 'warning',
                                  showCancelButton: true,
                                  confirmButtonText: 'Sim, excluir',
                                  cancelButtonText: 'Cancelar',
                                  confirmButtonColor: '#dc2626'
                                });
                                if (isConfirmed) {
                                  setLoading(true);
                                  const { error } = await supabase.from('pre_inscricoes').delete().eq('id', p.id);
                                  setLoading(false);
                                  if (!error) {
                                    Swal.fire('Excluído!', 'A pré-inscrição foi descartada.', 'success');
                                    fetchPreInscricoes();
                                  } else {
                                    Swal.fire('Erro', error.message, 'error');
                                  }
                                }
                              }}
                              title="Descartar Pré-Inscrição"
                              className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {viewMode === 'lista' && (
        <div className="space-y-4">
          {/* Dashboard Totalizador */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
            {Object.entries(totaisPorTipo).map(([tipo, qtd]) => (
              <div key={tipo} className={`p-4 rounded-xl border flex flex-col justify-center transition-all ${tipo === 'Total Geral' ? 'bg-red-600 border-red-700 text-white shadow-lg shadow-red-600/20' : 'bg-white border-slate-200 text-slate-700 shadow-sm'}`}>
                <span className={`text-xs font-bold uppercase tracking-wider ${tipo === 'Total Geral' ? 'text-red-200' : 'text-slate-400'}`}>{tipo}</span>
                <span className={`text-2xl font-black mt-1 ${tipo === 'Total Geral' ? 'text-white' : 'text-slate-800'}`}>{qtd}</span>
              </div>
            ))}
          </div>

           <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Pesquisar por nome ou CPF..."
                className="w-full pl-10 p-2 border border-slate-300 rounded-lg"
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select 
              className="p-2 border border-slate-300 rounded-lg"
              onChange={(e) => setFilterTipo(e.target.value)}
            >
              <option value="">Todos os Tipos</option>
              {tiposInscricao.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
            {isGlobalUser && (
              <select
                className="p-2 border border-slate-300 rounded-lg bg-white"
                value={filtroEventoListagem}
                onChange={(e) => setFiltroEventoListagem(e.target.value)}
              >
                <option value="todos">Todos os Eventos</option>
                {eventos.map(ev => <option key={ev.id} value={ev.id}>{ev.nome}</option>)}
              </select>
            )}
            {selectedInscricoes.length > 0 && (
              <button
                onClick={handleExcluirEmLote}
                className="px-4 py-2 bg-red-100 text-red-700 font-bold rounded-lg hover:bg-red-200 transition-colors flex items-center gap-2"
              >
                <Trash2 size={16} /> Excluir Selecionadas ({selectedInscricoes.length})
              </button>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
             <table className="w-full text-sm whitespace-nowrap">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="p-4 w-10 text-center">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer"
                        checked={filteredInscricoes.length > 0 && selectedInscricoes.length === filteredInscricoes.length}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedInscricoes(filteredInscricoes.map(i => i.id));
                          else setSelectedInscricoes([]);
                        }}
                      />
                    </th>
                    <th className="p-4 text-left">Nome</th>
                    {isGlobalUser && filtroEventoListagem === 'todos' && <th className="p-4 text-left">Evento</th>}
                    <th className="p-4 text-left">CPF</th>
                    <th className="p-4 text-center">Idade</th>
                    <th className="p-4 text-left">Sexo</th>
                    <th className="p-4 text-left">Telefone</th>
                    <th className="p-4 text-left">Cidade/UF</th>
                    <th className="p-4 text-left">Regional</th>
                    <th className="p-4 text-left">Pastor</th>
                    <th className="p-4 text-left">Tipo</th>
                    <th className="p-4 text-left">Pagamento</th>
                    <th className="p-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInscricoes.map((i) => (
                    <tr key={i.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="p-4 text-center">
                        <input 
                          type="checkbox" 
                          className="rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer"
                          checked={selectedInscricoes.includes(i.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedInscricoes([...selectedInscricoes, i.id]);
                            else setSelectedInscricoes(selectedInscricoes.filter(id => id !== i.id));
                          }}
                        />
                      </td>
                      <td className="p-4 font-medium">{i.nome_completo}</td>
                      {isGlobalUser && filtroEventoListagem === 'todos' && (
                        <td className="p-4">
                          <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase whitespace-nowrap">
                            {eventos.find(e => e.id === i.evento_id)?.nome || '-'}
                          </span>
                        </td>
                      )}
                      <td className="p-4 text-xs text-slate-600">{formatCPF(i.cpf) || '-'}</td>
                      <td className="p-4 text-xs text-slate-600 text-center font-bold">{calcularIdade(i.data_nascimento)}</td>
                      <td className="p-4 text-xs text-slate-600">{i.sexo || '-'}</td>
                      <td className="p-4 text-xs text-slate-600">{formatTelefone(i.telefone) || '-'}</td>
                      <td className="p-4 text-xs text-slate-600">{i.cidade}/{i.estado}</td>
                      <td className="p-4 text-xs text-slate-600">{i.regional || '-'}</td>
                      <td className="p-4 text-xs text-slate-600">{i.nome_pastor || '-'}</td>
                      <td className="p-4">
                        <span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase bg-red-50 text-red-600">
                          {i.tipos_inscricao?.nome || '-'}
                        </span>
                      </td>
                      <td className="p-4">
                         <div className="flex flex-col">
                           <span className={`px-2 py-0.5 rounded text-[10px] font-bold w-max ${
                             i.condicao_pagamento === 'parcelado' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                           }`}>
                             {i.condicao_pagamento === 'parcelado' ? `Parcelado (${i.qtd_parcelas}x)` : 'À Vista'}
                           </span>
                           <span className="text-[10px] text-slate-400 mt-0.5 font-medium">{i.forma_pagamento}</span>
                         </div>
                       </td>
                      <td className="p-4 text-center flex justify-center gap-2">
                        <button
                           onClick={() => verParcelas(i)}
                           title="Ver Parcelamento / Contas a Receber"
                           className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                         >
                           <Eye size={16} />
                         </button>
                        <button
                          onClick={() => handleEdit(i)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(i.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
             </table>
          </div>
        </div>
      )}

      {viewMode === 'novo' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-bold text-slate-700 uppercase text-xs tracking-widest">
              {editingId ? 'Informações da Inscrição' : 'Nova Inscrição de Hospedagem'}
            </h3>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            
            {/* NOVO: Campo de Evento Informativo (ou Selecionável para Globais) */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                Evento da Inscrição
              </label>
              {isGlobalUser ? (
                <select
                  required
                  value={formData.evento_id || eventoSelecionado.id}
                  onChange={e => setFormData({ ...formData, evento_id: e.target.value })}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:border-red-500 outline-none font-bold text-slate-700 cursor-pointer"
                >
                  {eventos.map(ev => (
                    <option key={ev.id} value={ev.id}>{ev.nome}</option>
                  ))}
                </select>
              ) : (
                <div className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Landmark size={16} className="text-red-500" />
                  {eventos?.find(e => e.id === (formData.evento_id || eventoSelecionado.id))?.nome || eventoSelecionado.nome}
                </div>
              )}
            </div>

            <div>
              <h4 className="text-xs font-bold text-red-600 uppercase tracking-widest mb-4">Dados Pessoais</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">Nome Completo</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 text-slate-300" size={18} />
                    <input
                      required
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                      placeholder="Nome completo da pessoa"
                      value={formData.nome_completo}
                      onChange={e => setFormData({ ...formData, nome_completo: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">CPF</label>
                  <div className="relative">
                    <IdCard className="absolute left-3 top-3 text-slate-300" size={18} />
                    <input
                      required
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                      placeholder="000.000.000-00"
                      value={formatCPF(formData.cpf)}
                      onChange={e => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
                      onBlur={e => buscarPorCpf(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">Data de Nascimento</label>
                  <div className="relative">
                    <Cake className="absolute left-3 top-3 text-slate-300" size={18} />
                    <input
                      required
                      type="date"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                      value={formData.data_nascimento}
                      onChange={e => setFormData({ ...formData, data_nascimento: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">Sexo</label>
                  <div className="relative">
                    <UserCheck className="absolute left-3 top-3 text-slate-300" size={18} />
                    <select
                      required
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all appearance-none cursor-pointer"
                      value={formData.sexo}
                      onChange={e => setFormData({ ...formData, sexo: e.target.value })}
                    >
                      <option value="">Selecione o sexo</option>
                      <option value="Masculino">Masculino</option>
                      <option value="Feminino">Feminino</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">Telefone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 text-slate-300" size={18} />
                    <input
                      required
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                      placeholder="(00) 00000-0000"
                      value={formatTelefone(formData.telefone)}
                      onChange={e => setFormData({ ...formData, telefone: formatTelefone(e.target.value) })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">E-mail <span className="normal-case text-slate-300">(opcional)</span></label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 text-slate-300" size={18} />
                    <input
                      type="email"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                      placeholder="email@exemplo.com"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-red-600 uppercase tracking-widest mb-4">Igreja e Endereço</h4>
              
              {/* Linha 1: Endereço, Cidade, Estado */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">Endereço</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 text-slate-300" size={18} />
                    <input
                      required
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                      placeholder="Rua, número, bairro"
                      value={formData.endereco}
                      onChange={e => setFormData({ ...formData, endereco: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">Cidade</label>
                  <CidadeSearchInput
                    cidades={cidadesBanco}
                    value={formData.cidade_codigo}
                    required
                    placeholder="Buscar cidade..."
                    onChange={({ codigo, nome, uf }) =>
                      setFormData({
                        ...formData,
                        cidade_codigo: codigo,
                        cidade: nome,
                        estado: uf
                      })
                    }
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">Estado</label>
                  <div className="relative opacity-60 cursor-not-allowed">
                    <Landmark className="absolute left-3 top-3 text-slate-400" size={18} />
                    <input
                      disabled
                      className="w-full pl-10 pr-4 py-3 bg-slate-100 border border-slate-200 rounded-xl outline-none text-slate-500 font-bold uppercase cursor-not-allowed"
                      placeholder="UF"
                      value={formData.estado}
                    />
                  </div>
                </div>
              </div>

              {/* Linha 2: Pastor e Regional */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">Nome do Pastor <span className="normal-case text-[9px] text-slate-300 font-medium">(Opcional)</span></label>
                  <div className="relative">
                    <Church className="absolute left-3 top-3 text-slate-300" size={18} />
                    <input
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                      placeholder="Nome do pastor responsável"
                      value={formData.nome_pastor}
                      onChange={e => setFormData({ ...formData, nome_pastor: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">Regional <span className="normal-case text-[9px] text-slate-300 font-medium">(Opcional)</span></label>
                  <div className="relative">
                    <Landmark className="absolute left-3 top-3 text-slate-300" size={18} />
                    <input
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                      placeholder="Ex: Regional Sul"
                      value={formData.regional}
                      onChange={e => setFormData({ ...formData, regional: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-red-600 uppercase tracking-widest mb-4">Inscrição e Pagamento</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">Inscrição</label>
                  <div className="relative">
                    <Ticket className="absolute left-3 top-3 text-slate-300" size={18} />
                    <select
                      required
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all appearance-none cursor-pointer"
                      value={formData.tipo_inscricao_id}
                      onChange={e => setFormData({ ...formData, tipo_inscricao_id: e.target.value })}
                    >
                      <option value="">Selecione uma inscrição</option>
                      {tiposInscricao.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.nome} {t.valor != null ? `- R$ ${parseFloat(t.valor).toFixed(2)}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">Condição de Pagamento</label>
                  <div className="relative">
                    <Landmark className="absolute left-3 top-3 text-slate-300" size={18} />
                    <select
                      required
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all appearance-none cursor-pointer"
                      value={formData.condicao_pagamento}
                      onChange={e => {
                        const val = e.target.value;
                        setFormData({
                          ...formData,
                          condicao_pagamento: val,
                          forma_pagamento: val === 'a_vista' ? 'Pix' : 'Pix Parcelado',
                          qtd_parcelas: val === 'a_vista' ? 1 : 2
                        });
                      }}
                    >
                      <option value="a_vista">À Vista</option>
                      <option value="parcelado">Parcelado</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">Forma de Pagamento</label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-3 text-slate-300" size={18} />
                    <select
                      required
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all appearance-none cursor-pointer"
                      value={formData.forma_pagamento}
                      onChange={e => setFormData({ ...formData, forma_pagamento: e.target.value })}
                    >
                      {formData.condicao_pagamento === 'a_vista' ? (
                        <>
                          <option value="Pix">Pix</option>
                          <option value="Dinheiro">Dinheiro</option>
                          <option value="Cartão Débito">Cartão Débito</option>
                        </>
                      ) : (
                        <>
                          <option value="Pix Parcelado">Pix Parcelado (Mensal)</option>
                          <option value="Cartão Crédito">Cartão Crédito (1x a 10x)</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                {formData.condicao_pagamento === 'parcelado' && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">Qtd. Parcelas</label>
                    <div className="relative">
                      <Ticket className="absolute left-3 top-3 text-slate-300" size={18} />
                      <select
                        required
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all appearance-none cursor-pointer"
                        value={formData.qtd_parcelas}
                        onChange={e => setFormData({ ...formData, qtd_parcelas: parseInt(e.target.value) })}
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                          <option key={n} value={n}>{n}x</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={loading}
                className="bg-red-600 text-white px-10 py-4 rounded-2xl font-bold flex items-center gap-2 hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 disabled:opacity-50"
              >
                {loading ? 'A guardar...' : <><Save size={20} /> {editingId ? 'Atualizar Inscrição' : 'Finalizar Inscrição'}</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL DE DETALHES DE PARCELAMENTO */}
      {selectedInscritoParcelas && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-slate-800">Histórico de Parcelas</h3>
                <p className="text-xs text-slate-400 mt-0.5">{selectedInscritoParcelas.nome_completo}</p>
              </div>
              <button 
                onClick={() => setSelectedInscritoParcelas(null)}
                className="w-8 h-8 rounded-full bg-slate-200/50 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold transition-all animate-none text-lg"
              >
                &times;
              </button>
            </div>
            
            <div className="p-6 space-y-4 max-h-[350px] overflow-y-auto">
              {parcelasDoInscrito.length === 0 ? (
                <p className="text-center text-sm text-slate-400 py-6">Nenhuma parcela gerada para esta inscrição.</p>
              ) : (
                <div className="space-y-3">
                  {parcelasDoInscrito.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-150 rounded-2xl">
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-slate-700">{p.descricao}</div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          <span className="flex items-center gap-0.5"><Calendar size={10} /> Venc: {new Date(p.data_vencimento + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                          {p.data_pagamento && (
                            <span className="flex items-center gap-0.5 text-emerald-600"><Clock size={10} /> Pago em: {new Date(p.data_pagamento).toLocaleDateString('pt-BR')}</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-sm font-black text-slate-800 font-mono">R$ {parseFloat(p.valor).toFixed(2)}</div>
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            p.status === 'pago' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {p.status === 'pago' ? 'Pago' : 'Em Aberto'}
                          </span>
                        </div>
                        
                        <button
                          onClick={() => darBaixaParcela(p.id, p.status === 'pago' ? 'aberto' : 'pago')}
                          title={p.status === 'pago' ? 'Reverter Baixa' : 'Confirmar Pagamento'}
                          className={`p-2 rounded-xl border transition-all ${
                            p.status === 'pago' 
                              ? 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100' 
                              : 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100'
                          }`}
                        >
                          <DollarSign size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedInscritoParcelas(null)}
                className="px-6 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
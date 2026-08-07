import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from './supabaseClient';
import {
  UploadCloud, FileSpreadsheet, AlertCircle, CheckCircle2,
  X, Loader2, ChevronRight, ChevronLeft, ArrowRightLeft,
  Check, CreditCard, Landmark
} from 'lucide-react';
import Swal from 'sweetalert2';
import { useEventContext } from './contexts/EventContext';

// Definição dos campos do banco de dados
const CAMPOS_BANCO = [
  { chave: 'nome_completo', nome: 'Nome Completo', obrigatorio: true, titulosSugeridos: ['nome', 'nome completo', 'nome_completo', 'completo', 'campista'] },
  { chave: 'cpf', nome: 'CPF', obrigatorio: true, titulosSugeridos: ['cpf', 'documento', 'doc'] },
  { chave: 'data_nascimento', nome: 'Data de Nascimento', obrigatorio: true, titulosSugeridos: ['data de nascimento', 'data nascimento', 'nascimento', 'data_nasc', 'nasc'] },
  { chave: 'sexo', nome: 'Sexo', obrigatorio: true, titulosSugeridos: ['sexo', 'genero', 'sex', 'gen'] },
  { chave: 'telefone', nome: 'Telefone', obrigatorio: true, titulosSugeridos: ['telefone', 'tel', 'whatsapp', 'celular', 'fone'] },
  { chave: 'endereco', nome: 'Endereço', obrigatorio: true, titulosSugeridos: ['endereco', 'rua', 'logradouro', 'casa'] },
  { chave: 'cidade', nome: 'Cidade', obrigatorio: true, titulosSugeridos: ['cidade', 'municipio'] },
  { chave: 'estado', nome: 'Estado (UF)', obrigatorio: true, titulosSugeridos: ['estado', 'uf', 'est'] },
  { chave: 'forma_pagamento', nome: 'Forma de Pagamento', obrigatorio: true, titulosSugeridos: ['forma de pagamento', 'pagamento', 'meio de pagamento', 'forma_pag', 'pgto'] },
  { chave: 'inscricao', nome: 'Inscrição', obrigatorio: true, titulosSugeridos: ['inscricao', 'tipo', 'tipo inscricao', 'tipo_inscricao', 'categoria', 'lote'] },
  
  // Opcionais
  { chave: 'nome_pastor', nome: 'Nome do Pastor', obrigatorio: false, titulosSugeridos: ['pastor', 'nome do pastor', 'pastor_nome'] },
  { chave: 'regional', nome: 'Regional', obrigatorio: false, titulosSugeridos: ['regional', 'reg'] },
  { chave: 'email', nome: 'E-mail', obrigatorio: false, titulosSugeridos: ['email', 'e-mail', 'mail'] },
];

const FORMAS_PAGAMENTO_SISTEMA = ['Pix', 'Cartão', 'Dinheiro'];

function normalizarTexto(texto) {
  return String(texto || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
    .trim()
    .toLowerCase();
}

function excelDataParaISO(valor) {
  if (!valor) return null;
  if (valor instanceof Date && !isNaN(valor)) {
    const ano = valor.getFullYear();
    const mes = String(valor.getMonth() + 1).padStart(2, '0');
    const dia = String(valor.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }
  const str = String(valor).trim();
  const matchBR = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (matchBR) {
    const [, d, m, a] = matchBR;
    return `${a}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const matchISO = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (matchISO) {
    const [, a, m, d] = matchISO;
    return `${a}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return null;
}

function limparCPF(cpf) {
  if (!cpf) return '';
  let str = String(cpf).trim();
  // Remove sufixo decimal se o Excel interpretou como número flutuante
  if (str.endsWith('.0')) {
    str = str.slice(0, -2);
  }
  let digitos = str.replace(/\D/g, '');
  // Auto-completa com zeros à esquerda se o Excel removeu (ex: CPF começado com 0)
  if (digitos.length > 0 && digitos.length < 11) {
    digitos = digitos.padStart(11, '0');
  }
  return digitos;
}

const ESTADOS_MAP = {
  'acre': 'AC', 'alagoas': 'AL', 'amapa': 'AP', 'amazonas': 'AM', 'bahia': 'BA',
  'ceara': 'CE', 'distrito federal': 'DF', 'espirito santo': 'ES', 'goias': 'GO',
  'maranhao': 'MA', 'mato grosso': 'MT', 'mato grosso do sul': 'MS', 'minas gerais': 'MG',
  'para': 'PA', 'paraiba': 'PB', 'parana': 'PR', 'pernambuco': 'PE', 'piaui': 'PI',
  'rio de janeiro': 'RJ', 'rio grande do norte': 'RN', 'rio grande do sul': 'RS',
  'rondonia': 'RO', 'roraima': 'RR', 'santa catarina': 'SC', 'sao paulo': 'SP',
  'sergipe': 'SE', 'tocantins': 'TO'
};

function normalizarEstado(estado) {
  if (!estado) return 'GO'; // Fallback padrão
  const est = normalizarTexto(estado);
  if (est.length === 2) return est.toUpperCase();
  
  const sigla = ESTADOS_MAP[est];
  if (sigla) return sigla;
  
  return est.slice(0, 2).toUpperCase();
}

function resolverCidade(nomeStr, ufStr, listaCidades) {
  if (!nomeStr) return { nome: '', codigo: null, uf: ufStr };
  const nomeNorm = normalizarTexto(nomeStr);
  const ufNorm = normalizarEstado(ufStr);

  const exata = listaCidades.find(c => normalizarTexto(c.nome) === nomeNorm && c.uf === ufNorm);
  if (exata) return { nome: exata.nome, codigo: exata.codigo, uf: exata.uf };

  const apenasNome = listaCidades.find(c => normalizarTexto(c.nome) === nomeNorm);
  if (apenasNome) return { nome: apenasNome.nome, codigo: apenasNome.codigo, uf: apenasNome.uf };

  return { nome: String(nomeStr).trim().toUpperCase(), codigo: null, uf: ufNorm };
}

// Auto-reconhecimento inteligente da forma de pagamento da planilha
const autoMatchPagamento = (valor) => {
  const v = normalizarTexto(valor);
  if (v.includes('pix') || v.includes('transf') || v.includes('ted') || v.includes('doc') || v.includes('online')) return 'Pix';
  if (v.includes('cartao') || v.includes('cred') || v.includes('deb') || v.includes('visa') || v.includes('master') || v.includes('elo')) return 'Cartão';
  if (v.includes('dinheiro') || v.includes('money') || v.includes('cash') || v.includes('especie') || v.includes('mao')) return 'Dinheiro';
  return 'Pix'; // Fallback padrão
};

export function ImportarPlanilha({ tiposInscricao = [], cidades = [], onConcluido }) {
  const { eventos, eventoSelecionado } = useEventContext();
  const isGlobalUser = eventos && eventos.length > 1;
  const [eventoImportacao, setEventoImportacao] = useState('');

  useEffect(() => {
    if (eventoSelecionado && !eventoImportacao) {
      setEventoImportacao(eventoSelecionado.id);
    }
  }, [eventoSelecionado]);

  const fileInputRef = useRef(null);
  const [passo, setPasso] = useState(1); // 1: Upload, 2: Mapeamento, 3: Prévia/Validar, 4: Resultado
  const [arquivoNome, setArquivoNome] = useState('');
  const [linhasBrutas, setLinhasBrutas] = useState([]); // Conteúdo original da planilha
  const [colunasPlanilha, setColunasPlanilha] = useState([]); // Cabeçalhos encontrados
  
  // Relacionamento de colunas { campoBanco: colunaPlanilha }
  const [mapeamentoColunas, setMapeamentoColunas] = useState({});
  
  // Relacionamento de valores de pagamento { valorPlanilha: valorSistema }
  const [valoresPagamentoPlanilha, setValoresPagamentoPlanilha] = useState([]); // Valores únicos de pagamento na planilha
  const [mapeamentoPagamento, setMapeamentoPagamento] = useState({});

  const [linhas, setLinhas] = useState([]); // Linhas processadas e validadas
  const [analisando, setAnalisando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [erroGeral, setErroGeral] = useState('');
  const [filtroLinhas, setFiltroLinhas] = useState('todas');
  const [idsImportados, setIdsImportados] = useState([]);

  // Auto-mapeamento inicial ao ler os cabeçalhos da planilha
  const realizarPreMapeamento = (cabecalhos) => {
    const novoMapeamento = {};
    CAMPOS_BANCO.forEach(campo => {
      // Procura alguma coluna que case com os títulos sugeridos
      const encontrado = cabecalhos.find(c => 
        campo.titulosSugeridos.some(t => normalizarTexto(t) === normalizarTexto(c))
      );
      if (encontrado) {
        novoMapeamento[campo.chave] = encontrado;
      } else {
        novoMapeamento[campo.chave] = '';
      }
    });
    setMapeamentoColunas(novoMapeamento);
  };

  // Carrega o arquivo e extrai os cabeçalhos
  const handleFileLoad = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErroGeral('');
    setResultado(null);
    setArquivoNome(file.name);
    setAnalisando(true);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
      const primeiraAba = workbook.SheetNames[0];
      const sheet = workbook.Sheets[primeiraAba];
      const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (json.length === 0) {
        setErroGeral('A planilha está vazia.');
        setAnalisando(false);
        return;
      }

      setLinhasBrutas(json);
      const cabecalhos = Object.keys(json[0]);
      setColunasPlanilha(cabecalhos);
      realizarPreMapeamento(cabecalhos);
      setPasso(2); // Avança para o mapeamento
    } catch (err) {
      setErroGeral('Erro ao ler a planilha: ' + err.message);
    } finally {
      setAnalisando(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Sempre que mudar a coluna vinculada a 'forma_pagamento', atualiza os valores únicos para mapear
  useEffect(() => {
    const colFormaPagamento = mapeamentoColunas['forma_pagamento'];
    if (colFormaPagamento && linhasBrutas.length > 0) {
      const valoresUnicos = [...new Set(linhasBrutas.map(l => String(l[colFormaPagamento] || '').trim()).filter(Boolean))];
      setValoresPagamentoPlanilha(valoresUnicos);
      
      // Auto-mapeia os valores para facilitar a vida do usuário
      const novoMapeamentoPgto = {};
      valoresUnicos.forEach(val => {
        novoMapeamentoPgto[val] = autoMatchPagamento(val);
      });
      setMapeamentoPagamento(novoMapeamentoPgto);
    } else {
      setValoresPagamentoPlanilha([]);
      setMapeamentoPagamento({});
    }
  }, [mapeamentoColunas['forma_pagamento'], linhasBrutas]);

  // Processa as linhas usando os mapeamentos criados pelo usuário
  const processarLinhasEPresentarPrevia = async () => {
    // Validação de mapeamentos obrigatórios
    const camposObrigatoriosFaltando = CAMPOS_BANCO.filter(c => c.obrigatorio && !mapeamentoColunas[c.chave]);
    if (camposObrigatoriosFaltando.length > 0) {
      setErroGeral('Por favor, relacione todos os campos obrigatórios (*) antes de prosseguir.');
      return;
    }

    setAnalisando(true);
    setErroGeral('');

    try {
      // 1. Buscar CPFs já cadastrados no banco local
      const { data: existentes, error: errBusca } = await supabase
        .from('inscricoes_hospedagem')
        .select('cpf');

      if (errBusca) throw errBusca;

      const cpfsExistentes = new Set((existentes || []).map(e => limparCPF(e.cpf)));
      const cpfsNaPlanilha = new Set();
      const hojeStr = new Date().toISOString().split('T')[0];

      // Função inteligente de busca de inscrição com data mais próxima
      const obterTipoInscricaoCompleto = (valorPlanilha) => {
        if (!valorPlanilha) return null;
        const str = normalizarTexto(valorPlanilha);
        
        const filtrarValidos = (t) => {
          if (!t.data_validade) return true;
          return t.data_validade >= hojeStr;
        };

        const ordenarPorProximidade = (a, b) => {
          if (!a.data_validade) return 1;
          if (!b.data_validade) return -1;
          return new Date(a.data_validade) - new Date(b.data_validade);
        };

        if (str.includes('alojamento')) {
          const correspondentes = tiposInscricao
            .filter(t => normalizarTexto(t.nome).includes('alojamento'))
            .filter(filtrarValidos)
            .sort(ordenarPorProximidade);
          if (correspondentes.length > 0) return correspondentes[0];
        }

        if (str.includes('apartamento') || str.includes('quarto')) {
          const correspondentes = tiposInscricao
            .filter(t => normalizarTexto(t.nome).includes('apartamento') || normalizarTexto(t.nome).includes('quarto'))
            .filter(filtrarValidos)
            .sort(ordenarPorProximidade);
          if (correspondentes.length > 0) return correspondentes[0];
        }

        // Busca genérica por aproximação
        const exata = tiposInscricao.find(t => normalizarTexto(t.nome) === str);
        if (exata) return exata;

        const parcial = tiposInscricao.find(t => normalizarTexto(t.nome).includes(str));
        if (parcial) return parcial;

        return null;
      };

      // 2. Mapeamento linha por linha
      const linhasProcessadas = linhasBrutas.map((linhaOriginal, idx) => {
        const erros = [];
        const dados = {};

        CAMPOS_BANCO.forEach(campo => {
          const colunaMapeada = mapeamentoColunas[campo.chave];
          const valorOriginal = colunaMapeada ? linhaOriginal[colunaMapeada] : '';
          
          if (campo.obrigatorio && (valorOriginal === '' || valorOriginal === null || valorOriginal === undefined)) {
            erros.push(`Campo '${campo.nome}' está vazio nesta linha.`);
          }
          dados[campo.chave] = valorOriginal;
        });

        // Validar CPF
        const cpfLimpo = limparCPF(dados.cpf);
        if (dados.cpf && cpfLimpo.length !== 11) {
          erros.push(`CPF '${dados.cpf}' é inválido (deve ter 11 dígitos).`);
        } else if (cpfLimpo) {
          if (cpfsExistentes.has(cpfLimpo)) {
            erros.push(`CPF '${dados.cpf}' já cadastrado anteriormente no sistema.`);
          } else if (cpfsNaPlanilha.has(cpfLimpo)) {
            erros.push(`CPF '${dados.cpf}' aparece duplicado nesta planilha.`);
          } else {
            cpfsNaPlanilha.add(cpfLimpo);
          }
        }

        // Normalizar e Traduzir sexo
        const sexoRaw = normalizarTexto(dados.sexo);
        let sexoValido = null;
        if (sexoRaw.startsWith('m')) sexoValido = 'Masculino';
        else if (sexoRaw.startsWith('f')) sexoValido = 'Feminino';

        if (dados.sexo && !sexoValido) {
          erros.push(`Sexo '${dados.sexo}' não reconhecido. Use 'Masculino' ou 'Feminino'.`);
        }

        // Normalizar Data de Nascimento
        const dataISO = excelDataParaISO(dados.data_nascimento);
        if (dados.data_nascimento && !dataISO) {
          erros.push(`Data de nascimento '${dados.data_nascimento}' inválida (formato dia/mês/ano esperado).`);
        }

        // Traduzir Forma de Pagamento com base no mapeamento do usuário
        const formaPagamentoPlanilha = String(dados.forma_pagamento || '').trim();
        const formaPagamentoFinal = mapeamentoPagamento[formaPagamentoPlanilha] || formaPagamentoPlanilha;

        if (formaPagamentoPlanilha && !FORMAS_PAGAMENTO_SISTEMA.includes(formaPagamentoFinal)) {
          erros.push(`Forma de pagamento '${dados.forma_pagamento}' inválida ou não mapeada.`);
        }

        // Traduzir Inscrição com base nas regras inteligentes
        const tipoInscricaoObtido = obterTipoInscricaoCompleto(dados.inscricao);
        if (dados.inscricao && !tipoInscricaoObtido) {
          erros.push(`Inscrição '${dados.inscricao}' não foi encontrada no catálogo.`);
        }

        const ufResolvida = normalizarEstado(dados.estado);
        const cidadeResolvida = resolverCidade(dados.cidade, ufResolvida, cidades);

        return {
          linha: idx + 2,
          dados: {
            nome_completo: String(dados.nome_completo || '').trim().toUpperCase(),
            cpf: cpfLimpo,
            data_nascimento: dataISO,
            sexo: sexoValido,
            telefone: String(dados.telefone || '').trim(),
            email: dados.email ? String(dados.email).trim() : null,
            nome_pastor: String(dados.nome_pastor || '').trim().toUpperCase(),
            regional: String(dados.regional || '').trim().toUpperCase(),
            endereco: String(dados.endereco || '').trim().toUpperCase(),
            cidade: cidadeResolvida.nome,
            cidade_codigo: cidadeResolvida.codigo,
            estado: cidadeResolvida.uf,
            forma_pagamento: formaPagamentoFinal,
            tipo_inscricao_id: tipoInscricaoObtido?.id || null,
            tipo_inscricao_nome: tipoInscricaoObtido?.nome || dados.inscricao
          },
          erros,
          status: erros.length === 0 ? 'ok' : 'erro'
        };
      });

      setLinhas(linhasProcessadas);
      setPasso(3); // Avança para a prévia
    } catch (err) {
      setErroGeral('Erro ao processar validações: ' + err.message);
    } finally {
      setAnalisando(false);
    }
  };

  const linhasValidas = linhas.filter(l => l.status === 'ok');
  const linhasComErro = linhas.filter(l => l.status === 'erro');

  const handleImportar = async () => {
    if (linhasValidas.length === 0) return;
    setImportando(true);
    setErroGeral('');

    const payload = linhasValidas.map(l => ({
      nome_completo: l.dados.nome_completo,
      cpf: l.dados.cpf,
      data_nascimento: l.dados.data_nascimento,
      sexo: l.dados.sexo,
      telefone: l.dados.telefone,
      email: l.dados.email,
      nome_pastor: l.dados.nome_pastor,
      regional: l.dados.regional,
      endereco: l.dados.endereco,
      cidade: l.dados.cidade,
      cidade_codigo: l.dados.cidade_codigo,
      estado: l.dados.estado,
      forma_pagamento: l.dados.forma_pagamento,
      tipo_inscricao_id: l.dados.tipo_inscricao_id,
      acerto_id: null,
      sincronizado_nuvem: false,
      evento_id: eventoImportacao || eventoSelecionado.id
    }));

    try {
      const { data, error } = await supabase
        .from('inscricoes_hospedagem')
        .insert(payload)
        .select('id');

      if (error) throw error;

      const ids = (data || []).map(d => d.id);
      setIdsImportados(ids);
      setResultado({
        sucesso: payload.length,
        falha: linhasComErro.length,
        desfeito: false
      });
      setPasso(4);
      if (onConcluido) onConcluido();
    } catch (err) {
      setErroGeral('Erro ao salvar no banco local: ' + err.message);
    } finally {
      setImportando(false);
    }
  };

  const handleDesfazer = async () => {
    if (idsImportados.length === 0) return;
    setImportando(true);
    try {
      const { error } = await supabase
        .from('inscricoes_hospedagem')
        .delete()
        .in('id', idsImportados);

      if (error) throw error;

      setResultado(prev => ({ ...prev, desfeito: true }));
      Swal.fire('Importação Desfeita', 'Os registros importados foram removidos com sucesso!', 'success');
      handleNovoArquivo();
    } catch (err) {
      Swal.fire('Erro', 'Não foi possível desfazer: ' + err.message, 'error');
    } finally {
      setImportando(false);
    }
  };

  const handleNovoArquivo = () => {
    setArquivoNome('');
    setLinhasBrutas([]);
    setColunasPlanilha([]);
    setMapeamentoColunas({});
    setValoresPagamentoPlanilha([]);
    setMapeamentoPagamento({});
    setLinhas([]);
    setResultado(null);
    setErroGeral('');
    setPasso(1);
  };

  // Filtragem da tabela de prévia
  const linhasFiltradasParaTabela = linhas.filter(l => {
    if (filtroLinhas === 'validas') return l.status === 'ok';
    if (filtroLinhas === 'erro') return l.status === 'erro';
    return true;
  });

  // Habilita botão se todos os campos obrigatórios estiverem mapeados
  const todosObrigatoriosMapeados = CAMPOS_BANCO
    .filter(c => c.obrigatorio)
    .every(c => mapeamentoColunas[c.chave] && mapeamentoColunas[c.chave] !== '');

  return (
    <div className="bg-slate-50 min-h-screen p-6 font-sans">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl border border-slate-200 p-8 shadow-xl shadow-slate-200/50 space-y-6">
        
        {/* Header com Passos */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 pb-5 gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <UploadCloud className="text-red-600" /> Importador de Inscrições Inteligente
            </h2>
            <p className="text-slate-500 text-xs mt-1">Carregue, mapeie e valide qualquer modelo de planilha antes de salvar no sistema.</p>
          </div>
          
          {/* Indicador de passos visual */}
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
            <span className={`px-2 py-1 rounded ${passo === 1 ? 'bg-red-50 text-red-600' : 'bg-slate-50'}`}>1. Enviar</span>
            <ChevronRight size={14} />
            <span className={`px-2 py-1 rounded ${passo === 2 ? 'bg-red-50 text-red-600' : 'bg-slate-50'}`}>2. Mapear</span>
            <ChevronRight size={14} />
            <span className={`px-2 py-1 rounded ${passo === 3 ? 'bg-red-50 text-red-600' : 'bg-slate-50'}`}>3. Validar</span>
            <ChevronRight size={14} />
            <span className={`px-2 py-1 rounded ${passo === 4 ? 'bg-red-50 text-red-600' : 'bg-slate-50'}`}>4. Fim</span>
          </div>
        </div>

        {erroGeral && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 flex items-start gap-3">
            <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold">Erro</p>
              <p className="text-xs">{erroGeral}</p>
            </div>
          </div>
        )}

        {/* PASSO 1: Enviar Arquivo */}
        {passo === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* NOVO: Campo de Evento Informativo (ou Selecionável para Globais) */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                Evento de Destino da Importação
              </label>
              {isGlobalUser ? (
                <select
                  value={eventoImportacao || eventoSelecionado?.id}
                  onChange={(e) => setEventoImportacao(e.target.value)}
                  className="w-full md:w-1/2 p-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-red-500 transition-all cursor-pointer shadow-sm"
                >
                  {eventos.map(ev => (
                    <option key={ev.id} value={ev.id}>{ev.nome}</option>
                  ))}
                </select>
              ) : (
                <div className="flex items-center gap-2 text-sm font-bold text-slate-700 bg-white p-3 border border-slate-200 rounded-xl md:w-1/2 shadow-sm">
                  <Landmark size={18} className="text-red-500" />
                  {eventos?.find(e => e.id === (eventoImportacao || eventoSelecionado?.id))?.nome || eventoSelecionado?.nome}
                </div>
              )}
            </div>

            <label className="flex flex-col items-center justify-center gap-4 border-2 border-dashed border-slate-200 rounded-3xl py-20 cursor-pointer hover:border-red-400 hover:bg-red-50/20 transition-all bg-white">
              <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileLoad}
            />
            {analisando ? (
              <>
                <Loader2 className="animate-spin text-red-600" size={40} />
                <span className="text-sm font-bold text-slate-600">Lendo arquivos da planilha...</span>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center border border-red-100 text-red-600 shadow-md">
                  <UploadCloud size={32} />
                </div>
                <div className="text-center">
                  <span className="block text-sm font-bold text-slate-700">Clique para selecionar a planilha de inscrições</span>
                  <span className="block text-xs text-slate-400 mt-1">Formatos suportados: Excel (.xlsx, .xls)</span>
                </div>
              </>
            )}
          </label>
        </div>
        )}

        {/* PASSO 2: Mapeamento de Colunas e Valores */}
        {passo === 2 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Relacionamento de Cabeçalhos */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <ArrowRightLeft className="text-slate-400" size={18} />
                <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider">Mapeamento de Cabeçalhos</h3>
              </div>
              <p className="text-xs text-slate-500">Relacione as colunas da sua planilha com os dados necessários do sistema. Campos marcados com * são obrigatórios.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {CAMPOS_BANCO.map(campo => (
                  <div key={campo.chave} className="flex flex-col gap-1 p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:border-slate-200 transition-all">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 justify-between">
                      <span>{campo.nome} {campo.obrigatorio && <span className="text-red-500">*</span>}</span>
                      <span className={`text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded ${campo.obrigatorio ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-slate-100 text-slate-400'}`}>
                        {campo.obrigatorio ? 'Obrigatório' : 'Opcional'}
                      </span>
                    </label>
                    <select
                      value={mapeamentoColunas[campo.chave] || ''}
                      onChange={(e) => setMapeamentoColunas(prev => ({ ...prev, [campo.chave]: e.target.value }))}
                      className="w-full mt-2 p-2.5 border border-slate-200 rounded-xl bg-white text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    >
                      <option value="">{campo.obrigatorio ? '-- Selecione a coluna --' : '-- Ignorar este campo --'}</option>
                      {colunasPlanilha.map(col => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Relacionamento de Valores de Pagamento */}
            {valoresPagamentoPlanilha.length > 0 && (
              <div className="space-y-4 bg-red-50/10 border border-red-100 p-6 rounded-3xl mt-6 animate-in slide-in-from-bottom-2 duration-200">
                <div className="flex items-center gap-2 border-b border-red-100 pb-2">
                  <CreditCard size={18} className="text-red-500" />
                  <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider">Mapeamento das Formas de Pagamento</h3>
                </div>
                <p className="text-xs text-slate-500">Encontramos formas de pagamento escritas de forma variada na sua planilha. Relacione cada uma delas com o termo aceito no sistema:</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  {valoresPagamentoPlanilha.map(valor => (
                    <div key={valor} className="flex items-center justify-between gap-3 p-3 bg-white border border-red-100 rounded-2xl shadow-sm">
                      <span className="text-xs font-bold text-slate-700 truncate max-w-[150px]" title={valor}>
                        "{valor}"
                      </span>
                      <ChevronRight size={14} className="text-red-300" />
                      <select
                        value={mapeamentoPagamento[valor] || 'Pix'}
                        onChange={(e) => setMapeamentoPagamento(prev => ({ ...prev, [valor]: e.target.value }))}
                        className="p-2 border border-slate-200 rounded-xl bg-slate-50 text-xs font-semibold text-slate-700 outline-none focus:border-red-500"
                      >
                        {FORMAS_PAGAMENTO_SISTEMA.map(forma => (
                          <option key={forma} value={forma}>{forma}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ações */}
            <div className="flex justify-between items-center border-t border-slate-100 pt-5 mt-6">
              <button
                onClick={handleNovoArquivo}
                className="px-5 py-3 border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <ChevronLeft size={16} /> Voltar/Trocar Arquivo
              </button>
              <button
                onClick={processarLinhasEPresentarPrevia}
                disabled={!todosObrigatoriosMapeados || analisando}
                className="px-8 py-3.5 bg-red-600 text-white rounded-2xl text-xs font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 disabled:opacity-50 disabled:shadow-none flex items-center gap-1.5"
              >
                {analisando ? (
                  <><Loader2 className="animate-spin" size={16} /> Validando Planilha...</>
                ) : (
                  <>Analisar Inscrições <ChevronRight size={16} /></>
                )}
              </button>
            </div>
          </div>
        )}

        {/* PASSO 3: Prévia e Validação das Linhas */}
        {passo === 3 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-slate-700 font-bold">
                <FileSpreadsheet size={18} className="text-slate-400" />
                <span>{arquivoNome}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-green-50 text-green-700 border border-green-100">
                  {linhasValidas.length} válida(s)
                </span>
                {linhasComErro.length > 0 && (
                  <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-700 border border-red-100 animate-bounce">
                    {linhasComErro.length} com erro
                  </span>
                )}
                <button
                  onClick={handleNovoArquivo}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  title="Cancelar e enviar outro"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex gap-2 border-b border-slate-100 pb-3">
              <button onClick={() => setFiltroLinhas('todas')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filtroLinhas === 'todas' ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Todas ({linhas.length})</button>
              <button onClick={() => setFiltroLinhas('validas')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filtroLinhas === 'validas' ? 'bg-green-600 text-white shadow-sm' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>Válidas ({linhasValidas.length})</button>
              <button onClick={() => setFiltroLinhas('erro')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filtroLinhas === 'erro' ? 'bg-red-600 text-white shadow-sm' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}>Erros ({linhasComErro.length})</button>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-inner">
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="sticky top-0 bg-slate-50 border-b border-slate-100 font-bold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="p-3.5">Linha</th>
                      <th className="p-3.5">Nome</th>
                      <th className="p-3.5">CPF</th>
                      <th className="p-3.5">Inscrição Vinculada</th>
                      <th className="p-3.5">Forma Pagamento</th>
                      <th className="p-3.5 text-center">Status / Análise de Erros</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600">
                    {linhasFiltradasParaTabela.map(l => (
                      <tr key={l.linha} className={l.status === 'erro' ? 'bg-red-50/20' : 'hover:bg-slate-50/50'}>
                        <td className="p-3 text-slate-400 font-semibold">{l.linha}</td>
                        <td className="p-3 font-semibold text-slate-900">{l.dados.nome_completo || '-'}</td>
                        <td className="p-3">{l.dados.cpf || '-'}</td>
                        <td className="p-3">
                          {l.dados.tipo_inscricao_nome ? (
                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold text-[10px]">
                              {l.dados.tipo_inscricao_nome}
                            </span>
                          ) : (
                            <span className="text-red-500 font-bold">Não localizada</span>
                          )}
                        </td>
                        <td className="p-3 font-medium">{l.dados.forma_pagamento || '-'}</td>
                        <td className="p-3">
                          {l.status === 'ok' ? (
                            <span className="inline-flex items-center gap-1 text-green-600 font-bold text-[10px] bg-green-50 border border-green-100 px-2 py-0.5 rounded">
                              <Check size={12} /> PRONTO PARA IMPORTAR
                            </span>
                          ) : (
                            <div className="flex flex-col gap-1 text-red-600 max-w-sm whitespace-pre-wrap font-medium">
                              {l.erros.map((err, i) => (
                                <span key={i} className="flex items-start gap-1">
                                  <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                                  {err}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Ações */}
            <div className="flex justify-between items-center border-t border-slate-100 pt-5">
              <button
                onClick={() => setPasso(2)}
                className="px-5 py-3 border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <ChevronLeft size={16} /> Ajustar Mapeamento
              </button>
              <button
                onClick={handleImportar}
                disabled={importando || linhasValidas.length === 0}
                className="bg-red-600 text-white px-8 py-3.5 rounded-2xl font-bold flex items-center gap-2 hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 disabled:bg-slate-200 disabled:shadow-none"
              >
                {importando ? (
                  <><Loader2 className="animate-spin" size={18} /> Gravando no banco...</>
                ) : (
                  <><UploadCloud size={18} /> Confirmar Importação de {linhasValidas.length} Fichas</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* PASSO 4: Resultado da Importação */}
        {passo === 4 && resultado && (
          <div className="text-center py-10 space-y-6 max-w-md mx-auto animate-in scale-in duration-200">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center border border-green-100 text-green-500 mx-auto shadow-md shadow-green-100/50">
              <CheckCircle2 size={36} />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-800">Planilha Processada!</h2>
              {resultado.desfeito ? (
                <p className="text-sm text-slate-500">A importação foi desfeita e todas as inscrições criadas foram apagadas do banco local.</p>
              ) : (
                <>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Importamos com sucesso <strong className="text-slate-800 text-base font-extrabold">{resultado.sucesso}</strong> novas inscrições. 
                  </p>
                  {resultado.falha > 0 && (
                    <p className="text-xs text-red-500 font-medium">Nota: {resultado.falha} linhas com erros foram ignoradas.</p>
                  )}
                  {idsImportados.length > 0 && (
                    <div className="pt-2">
                      <button
                        onClick={handleDesfazer}
                        disabled={importando}
                        className="text-xs text-red-600 font-bold hover:underline disabled:opacity-50 flex items-center justify-center gap-1.5 mx-auto py-2 bg-red-50 hover:bg-red-100 border border-red-100 px-4 rounded-xl"
                      >
                        {importando ? <Loader2 size={12} className="animate-spin" /> : 'Desfazer Importação (Excluir Inscrições)'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            <button
              onClick={handleNovoArquivo}
              className="w-full py-4 bg-slate-900 text-white hover:bg-slate-800 rounded-2xl text-xs font-bold transition-all shadow-lg shadow-slate-900/10"
            >
              {resultado.desfeito ? 'Iniciar Nova Importação' : 'Importar Outro Arquivo'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

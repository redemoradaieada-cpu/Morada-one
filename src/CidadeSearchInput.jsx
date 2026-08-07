import React, { useState, useEffect, useRef } from 'react';
import { Building2, ChevronDown, X, Search } from 'lucide-react';

/**
 * CidadeSearchInput - Campo de busca de cidades com autocomplete.
 *
 * Props:
 *  - cidades: array de objetos { codigo, nome, uf }
 *  - value: código da cidade selecionada (cidade_codigo)
 *  - onChange: função({ codigo, nome, uf }) chamada ao selecionar uma cidade
 *  - required: boolean (padrão false)
 *  - placeholder: string (padrão "Buscar cidade...")
 *  - className: classes extras para o container externo
 *
 * Uso no formulário de cadastro (modo "selecionar cidade"):
 *   <CidadeSearchInput
 *     cidades={cidadesBanco}
 *     value={formData.cidade_codigo}
 *     onChange={({ codigo, nome, uf }) =>
 *       setFormData({ ...formData, cidade_codigo: codigo, cidade: nome, estado: uf })
 *     }
 *     required
 *   />
 *
 * Uso como filtro (modo "apenas filtrar", sem campo required):
 *   <CidadeSearchInput
 *     cidades={cidadesBanco}
 *     value={filtroCidade}
 *     onChange={({ codigo }) => setFiltroCidade(codigo)}
 *     placeholder="Filtrar por cidade..."
 *   />
 */
export function CidadeSearchInput({
  cidades = [],
  value = '',
  onChange,
  required = false,
  placeholder = 'Buscar cidade...',
  className = '',
}) {
  // Texto que o usuário está digitando no campo
  const [inputText, setInputText] = useState('');
  // Controla se o dropdown está aberto
  const [open, setOpen] = useState(false);
  // Ref para detectar cliques fora do componente
  const containerRef = useRef(null);

  // Sincroniza o texto exibido quando o value externo muda
  // (ex: ao editar um registro existente)
  useEffect(() => {
    if (value) {
      const cidade = cidades.find(c => c.codigo === value);
      if (cidade) {
        setInputText(`${cidade.nome} - ${cidade.uf}`);
      }
    } else {
      setInputText('');
    }
  }, [value, cidades]);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        // Se o usuário fechou sem selecionar, restaura o texto da cidade selecionada (se houver)
        if (value) {
          const cidade = cidades.find(c => c.codigo === value);
          if (cidade) setInputText(`${cidade.nome} - ${cidade.uf}`);
        } else {
          setInputText('');
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [value, cidades]);

  // Filtra as cidades de acordo com o texto digitado
  const cidadesFiltradas = cidades.filter(c => {
    const termo = inputText.toLowerCase().trim();
    if (!termo) return true; // Se nenhum texto, mostra todas
    return (
      c.nome.toLowerCase().includes(termo) ||
      c.uf.toLowerCase().includes(termo)
    );
  });

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    setOpen(true);
    // Se o usuário apagou tudo, limpa a seleção
    if (!e.target.value) {
      onChange({ codigo: '', nome: '', uf: '' });
    }
  };

  const handleSelect = (cidade) => {
    setInputText(`${cidade.nome} - ${cidade.uf}`);
    setOpen(false);
    onChange({ codigo: cidade.codigo, nome: cidade.nome, uf: cidade.uf });
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setInputText('');
    setOpen(false);
    onChange({ codigo: '', nome: '', uf: '' });
  };

  const cidadeSelecionada = value ? cidades.find(c => c.codigo === value) : null;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Campo de Input */}
      <div className="relative">
        <Building2
          className="absolute left-3 top-3 text-slate-300 pointer-events-none"
          size={18}
        />
        <input
          type="text"
          autoComplete="off"
          required={required && !cidadeSelecionada}
          placeholder={placeholder}
          value={inputText}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          className="w-full pl-10 pr-16 py-3 bg-slate-50 border border-slate-200 rounded-xl
                     focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none
                     transition-all text-sm text-slate-800"
        />

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {/* Botão limpar */}
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
              title="Limpar seleção"
            >
              <X size={14} />
            </button>
          )}
          {/* Ícone de chevron para indicar que é um dropdown */}
          <button
            type="button"
            onClick={() => setOpen(prev => !prev)}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
            tabIndex={-1}
          >
            <ChevronDown
              size={16}
              className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* Dropdown de resultados */}
      {open && (
        <div
          className="absolute z-50 top-full left-0 right-0 mt-1.5 bg-white border border-slate-200
                     rounded-xl shadow-xl shadow-slate-200/60 overflow-hidden"
          style={{ maxHeight: '260px' }}
        >
          {/* Contador */}
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
            <Search size={12} className="text-slate-400" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {cidadesFiltradas.length} cidade{cidadesFiltradas.length !== 1 ? 's' : ''} encontrada{cidadesFiltradas.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Lista de cidades */}
          <div className="overflow-y-auto" style={{ maxHeight: '210px' }}>
            {cidadesFiltradas.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-slate-400">
                Nenhuma cidade encontrada.
              </div>
            ) : (
              cidadesFiltradas.map(c => (
                <button
                  key={c.codigo}
                  type="button"
                  onClick={() => handleSelect(c)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-left
                             transition-all hover:bg-red-50 hover:text-red-700
                             ${value === c.codigo ? 'bg-red-50 text-red-700' : 'text-slate-700'}`}
                >
                  <span className="text-sm font-medium">{c.nome}</span>
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md
                               ${value === c.codigo ? 'bg-red-200 text-red-700' : 'bg-slate-100 text-slate-500'}`}
                  >
                    {c.uf}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Input hidden para garantir validação do formulário quando uma cidade está selecionada */}
      {required && (
        <input
          type="text"
          className="sr-only"
          required
          readOnly
          value={value || ''}
          tabIndex={-1}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

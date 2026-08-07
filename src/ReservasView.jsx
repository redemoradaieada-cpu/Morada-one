import React, { useState, useEffect } from 'react';
import { Trash2, CheckCircle2, AlertCircle, Upload, User, Phone, CreditCard, Package, Plus, FileText, Banknote, Smartphone, Landmark } from 'lucide-react';
import { supabase } from './supabaseClient';
import { useEventContext } from './contexts/EventContext';

export function ReservasView() {
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });

  const [cliente, setCliente] = useState({ nome: '', cpf: '', telefone: '' });
  const [comprovante, setComprovante] = useState(null);
  const [itens, setItens] = useState([{ produto_id: '', quantidade: 1 }]);
  const { eventos, eventoSelecionado } = useEventContext();
  const isGlobalUser = eventos && eventos.length > 1;
  const [eventoReserva, setEventoReserva] = useState(eventoSelecionado?.id || '');

  useEffect(() => {
    if (eventoSelecionado && !eventoReserva) {
      setEventoReserva(eventoSelecionado.id);
    }
  }, [eventoSelecionado, eventoReserva]);

  useEffect(() => {
    async function fetchProdutos() {
      const eventoAtual = eventoReserva || eventoSelecionado?.id;
      if (!eventoAtual) return;
      try {
        const { data, error } = await supabase
          .from('produtos')
          .select('id, nome, cor, tamanho, quantidade, preco')
          .eq('status', 'Ativo')
          .eq('evento_id', eventoAtual);

        if (error) {
          console.error("Erro ao carregar produtos:", error);
        } else if (data) {
          setProdutos(data);
        }
      } catch (err) {
        console.error("Conexão falhou:", err);
      }
    }
    if (eventoReserva || eventoSelecionado) fetchProdutos();
  }, [eventoReserva, eventoSelecionado]);

  const adicionarLinha = () => setItens([...itens, { produto_id: '', quantidade: 1 }]);

  const removerLinha = (index) => {
    if (itens.length > 1) {
      setItens(itens.filter((_, i) => i !== index));
    }
  };

  const atualizarItem = (index, campo, valor) => {
    const novosItens = [...itens];
    novosItens[index][campo] = valor;

    if (campo === 'quantidade') {
      const prod = produtos.find(p => p.id == novosItens[index].produto_id);
      if (prod && valor > prod.quantidade) {
        novosItens[index][campo] = prod.quantidade;
      }
    }

    setItens(novosItens);
  };

  // Calcula o valor total da reserva em tempo real
  const valorTotal = itens.reduce((acc, item) => {
    const p = produtos.find(p => p.id == item.produto_id);
    return acc + ((p?.preco || 0) * (item.quantidade || 0));
  }, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMensagem({ tipo: '', texto: '' });

    try {
      if (!comprovante) throw new Error("Anexe o comprovante PIX (Obrigatório).");
      if (itens.some(i => !i.produto_id)) throw new Error("Selecione um produto válido em todos os itens.");

      const quantidadePorProduto = {};
      for (const item of itens) {
        quantidadePorProduto[item.produto_id] = (quantidadePorProduto[item.produto_id] || 0) + item.quantidade;
      }

      for (const [prodId, qtd] of Object.entries(quantidadePorProduto)) {
        const prod = produtos.find(p => p.id == prodId);
        if (!prod) throw new Error("Produto inválido selecionado.");
        if (qtd > prod.quantidade) {
          throw new Error(`Estoque insuficiente! "${prod.nome}" possui apenas ${prod.quantidade} un. disponíveis.`);
        }
      }

      // Upload do Comprovante
      const fileExt = comprovante.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('comprovantes')
        .upload(fileName, comprovante);

      if (uploadError) throw new Error("Erro no upload do comprovante: " + uploadError.message);

      // Criar a Venda
      const { data: venda, error: vendaError } = await supabase.from('vendas').insert([{
        tipo: 'reserva',
        valor_total: valorTotal,
        status: 'finalizada',
        forma_pagamento: 'pix',
        evento_id: eventoReserva || eventoSelecionado.id
      }]).select().single();

      if (vendaError) throw new Error("Erro ao gerar venda: " + vendaError.message);

      // Salvar Itens e Reservas
      for (const item of itens) {
        const prod = produtos.find(p => p.id == item.produto_id);

        await supabase.from('itens_venda').insert([{
          venda_id: venda.id,
          produto_id: item.produto_id,
          nome: prod.nome,
          quantidade: item.quantidade
        }]);

        const { error: reservaError } = await supabase.from('reservas').insert([{
          venda_id: venda.id,
          cliente_nome: cliente.nome,
          cpf: cliente.cpf,
          telefone: cliente.telefone,
          produto_id: item.produto_id,
          quantidade: item.quantidade,
          comprovante_url: uploadData.path,
          status_entrega: 'Pendente',
          evento_id: eventoReserva || eventoSelecionado.id
        }]);

        if (reservaError) throw new Error("Erro ao salvar reserva: " + reservaError.message);

        await supabase.from('produtos')
          .update({ quantidade: prod.quantidade - item.quantidade })
          .eq('id', prod.id);
      }

      setMensagem({ tipo: 'sucesso', texto: 'Reserva concluída com sucesso! Já disponível no Check-in.' });

      setItens([{ produto_id: '', quantidade: 1 }]);
      setCliente({ nome: '', cpf: '', telefone: '' });
      setComprovante(null);
      const inputEl = document.getElementById('comprovante-input');
      if (inputEl) inputEl.value = "";

    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const getProdutoSelecionado = (produto_id) => produtos.find(p => p.id == produto_id);

  return (
    <div className="space-y-0">

      {/* ── Cabeçalho Clean ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

          {/* Título */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-violet-50 border border-violet-100 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Smartphone size={22} className="text-violet-600" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight">Nova Pré-Reserva</h2>
              <p className="text-slate-400 text-xs font-medium mt-0.5">Pagamento via PIX com comprovante obrigatório</p>
            </div>
          </div>

          {/* Badge total */}
          {valorTotal > 0 && (
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5 self-start sm:self-auto">
              <Banknote size={18} className="text-emerald-600 flex-shrink-0" />
              <div>
                <div className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">Total da Reserva</div>
                <div className="text-xl font-black text-emerald-700 font-mono">R$ {valorTotal.toFixed(2)}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Feedback ── */}
      {mensagem.texto && (
        <div className={`mb-5 p-4 rounded-2xl flex items-start gap-3 border ${
          mensagem.tipo === 'sucesso'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-red-50 text-red-700 border-red-200'
        }`}>
          {mensagem.tipo === 'sucesso'
            ? <CheckCircle2 size={20} className="flex-shrink-0 mt-0.5" />
            : <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
          }
          <div>
            <p className="font-bold text-sm">{mensagem.tipo === 'sucesso' ? 'Reserva confirmada!' : 'Erro na reserva'}</p>
            <p className="text-sm mt-0.5 opacity-80">{mensagem.texto}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">

        {isGlobalUser && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
              <Landmark size={15} className="text-slate-500" />
              <h3 className="font-bold text-slate-700 text-sm uppercase tracking-widest">Evento</h3>
            </div>
            <div className="p-6">
              <select
                value={eventoReserva || eventoSelecionado?.id}
                onChange={(e) => {
                  setEventoReserva(e.target.value);
                  setItens([{ produto_id: '', quantidade: 1 }]); // reseta itens ao mudar de evento
                }}
                className="w-full md:w-1/2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-400 outline-none transition-all cursor-pointer"
              >
                {eventos.map(ev => (
                  <option key={ev.id} value={ev.id}>{ev.nome}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* ── Dados do Cliente ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
            <User size={15} className="text-slate-500" />
            <h3 className="font-bold text-slate-700 text-sm uppercase tracking-widest">Dados do Cliente</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-3 lg:col-span-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Nome Completo *</label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input
                    required
                    placeholder="Nome do cliente"
                    value={cliente.nome}
                    className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-400 outline-none transition-all"
                    onChange={e => setCliente({ ...cliente, nome: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">CPF *</label>
                <div className="relative">
                  <CreditCard size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input
                    required
                    placeholder="000.000.000-00"
                    value={cliente.cpf}
                    className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-400 outline-none transition-all"
                    onChange={e => setCliente({ ...cliente, cpf: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Telefone / WhatsApp *</label>
                <div className="relative">
                  <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input
                    required
                    placeholder="(00) 00000-0000"
                    value={cliente.telefone}
                    className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-400 outline-none transition-all"
                    onChange={e => setCliente({ ...cliente, telefone: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Produtos ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package size={15} className="text-slate-500" />
              <h3 className="font-bold text-slate-700 text-sm uppercase tracking-widest">Produtos Reservados</h3>
            </div>
            <span className="text-xs text-slate-400 font-medium bg-slate-100 px-2.5 py-1 rounded-lg">
              {itens.length} item(ns)
            </span>
          </div>

          <div className="p-6 space-y-3">
            {itens.map((item, index) => {
              const prodSelecionado = getProdutoSelecionado(item.produto_id);
              const esgotado = prodSelecionado?.quantidade <= 0;

              return (
                <div key={index} className="flex flex-col sm:flex-row gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-red-200 transition-all">
                  <div className="flex-1">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Produto</label>
                    <select
                      required
                      className="w-full p-3 border border-slate-200 bg-white rounded-xl text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-400 outline-none appearance-none cursor-pointer"
                      value={item.produto_id}
                      onChange={e => atualizarItem(index, 'produto_id', e.target.value)}
                    >
                      <option value="">Selecione o produto...</option>
                      {produtos.map(p => {
                        const esg = p.quantidade <= 0;
                        return (
                          <option key={p.id} value={p.id} disabled={esg}>
                            {p.nome}{p.cor ? ` — ${p.cor}` : ''}{p.tamanho ? ` (${p.tamanho})` : ''} · Estoque: {p.quantidade}{esg ? ' (ESGOTADO)' : ''}
                          </option>
                        );
                      })}
                    </select>

                    {/* Preview do produto selecionado */}
                    {prodSelecionado && (
                      <div className="mt-2 flex items-center gap-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${esgotado ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {esgotado ? '✗ Esgotado' : `✓ ${prodSelecionado.quantidade} disponíveis`}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          R$ {parseFloat(prodSelecionado.preco).toFixed(2)} / un.
                        </span>
                        {item.quantidade > 0 && prodSelecionado && (
                          <span className="text-xs font-bold text-red-600 ml-auto">
                            Subtotal: R$ {(parseFloat(prodSelecionado.preco) * item.quantidade).toFixed(2)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-end gap-2 sm:flex-shrink-0">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Qtd.</label>
                      <input
                        required
                        type="number"
                        min="1"
                        max={prodSelecionado?.quantidade || ""}
                        className="w-20 p-3 border border-slate-200 bg-white rounded-xl text-sm font-bold text-center focus:ring-2 focus:ring-red-500/20 focus:border-red-400 outline-none"
                        value={item.quantidade}
                        onChange={e => atualizarItem(index, 'quantidade', parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removerLinha(index)}
                      disabled={itens.length === 1}
                      className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-30 disabled:cursor-not-allowed border border-transparent hover:border-red-100"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              );
            })}

            <button
              type="button"
              onClick={adicionarLinha}
              className="flex items-center gap-2 text-sm text-red-600 font-bold hover:text-red-700 py-2 px-4 rounded-xl hover:bg-red-50 transition-colors border border-dashed border-red-200 w-full justify-center"
            >
              <Plus size={16} /> Adicionar produto
            </button>
          </div>

          {/* Total em destaque */}
          {valorTotal > 0 && (
            <div className="mx-6 mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest">Total da Reserva</p>
                <p className="text-xs text-red-500 mt-0.5">Pagamento via PIX</p>
              </div>
              <p className="text-2xl font-black text-red-700">R$ {valorTotal.toFixed(2)}</p>
            </div>
          )}
        </div>

        {/* ── Comprovante PIX ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
            <FileText size={15} className="text-slate-500" />
            <h3 className="font-bold text-slate-700 text-sm uppercase tracking-widest">Comprovante PIX</h3>
            <span className="ml-auto text-[10px] bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-lg uppercase tracking-wider">Obrigatório</span>
          </div>
          <div className="p-6">
            <label
              htmlFor="comprovante-input"
              className={`flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
                comprovante
                  ? 'border-emerald-300 bg-emerald-50 hover:bg-emerald-100'
                  : 'border-slate-300 bg-slate-50 hover:border-red-400 hover:bg-red-50'
              }`}
            >
              {comprovante ? (
                <>
                  <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center">
                    <CheckCircle2 size={24} className="text-emerald-600" />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-emerald-700 text-sm">{comprovante.name}</p>
                    <p className="text-xs text-emerald-600 mt-0.5">
                      {(comprovante.size / 1024).toFixed(1)} KB · Clique para trocar
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center">
                    <Upload size={22} className="text-slate-400" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-slate-700 text-sm">Clique para anexar o comprovante</p>
                    <p className="text-xs text-slate-400 mt-1">Imagem (JPG, PNG) ou PDF · Máx. 10MB</p>
                  </div>
                </>
              )}
              <input
                id="comprovante-input"
                type="file"
                onChange={e => setComprovante(e.target.files[0])}
                accept="image/*,.pdf"
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* ── Botão de Submit ── */}
        <button
          disabled={loading}
          type="submit"
          className={`w-full py-5 rounded-2xl font-black text-base flex items-center justify-center gap-3 transition-all shadow-lg ${
            loading
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
              : 'bg-red-600 hover:bg-red-700 text-white shadow-red-500/30 hover:shadow-red-500/40 active:scale-[0.99]'
          }`}
        >
          {loading ? (
            <>
              <svg className="animate-spin w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              A processar reserva...
            </>
          ) : (
            <>
              <CheckCircle2 size={20} />
              Confirmar Reserva
              {valorTotal > 0 && <span className="ml-1 opacity-80">· R$ {valorTotal.toFixed(2)}</span>}
            </>
          )}
        </button>
      </form>
    </div>
  );
}
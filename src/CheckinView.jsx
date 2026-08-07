import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import { Eye, X } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import Swal from 'sweetalert2';
import { useEventContext } from './contexts/EventContext';

export function CheckinView() {
  const [reservas, setReservas] = useState([]);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('Pendente');
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedReserva, setSelectedReserva] = useState(null);
  const [loading, setLoading] = useState(false);
  const sigPad = useRef(null);
  const { eventos, eventoSelecionado } = useEventContext();
  const isGlobalUser = eventos && eventos.length > 1;
  const [eventoCheckin, setEventoCheckin] = useState(eventoSelecionado?.id || '');

  useEffect(() => {
    if (eventoSelecionado && !eventoCheckin) {
      setEventoCheckin(eventoSelecionado.id);
    }
  }, [eventoSelecionado, eventoCheckin]);

  useEffect(() => { 
    if (eventoCheckin || eventoSelecionado) fetchReservas(); 
  }, [eventoCheckin, eventoSelecionado]);

  async function fetchReservas() {
    const evId = eventoCheckin || eventoSelecionado?.id;
    if (!evId) return;
    const { data } = await supabase
      .from('reservas')
      .select('*, produtos(nome, cor, tamanho)')
      .eq('evento_id', evId)
      .order('created_at', { ascending: false });
    if (data) setReservas(data);
  }

  const formatCPF = (cpf) => cpf?.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  const formatPhone = (phone) => phone?.replace(/\D/g, '').replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');

  const salvarEntregaComAssinatura = async () => {
    if (!sigPad.current || sigPad.current.isEmpty()) {
      Swal.fire("Atenção", "Por favor, assine no campo indicado.", "warning");
      return;
    }
    setLoading(true);
    const dataUrl = sigPad.current.toDataURL();
    const blob = await (await fetch(dataUrl)).blob();
    const fileName = `assinaturas/${selectedReserva.id}_${Date.now()}.png`;
    const { error: uploadError } = await supabase.storage.from('comprovantes').upload(fileName, blob);
    if (!uploadError) {
      await supabase.from('reservas').update({ status_entrega: 'Entregue', assinatura_url: fileName }).eq('id', selectedReserva.id);
      fetchReservas();
      setIsSignModalOpen(false);
    } else {
      Swal.fire("Erro", "Erro ao salvar assinatura.", "error");
    }
    setLoading(false);
  };

  const filtered = reservas.filter(r => {
    const matchesSearch = r.cliente_nome?.toLowerCase().includes(busca.toLowerCase()) || r.cpf?.includes(busca);
    const matchesStatus = filtroStatus === 'Todos' ? true : (r.status_entrega || 'Pendente') === filtroStatus;
    return matchesSearch && matchesStatus;
  });

  // Calcula o total de produtos com base na lista atualmente filtrada
  const totalCamisetas = filtered.reduce((acc, r) => acc + (parseInt(r.quantidade) || 1), 0);

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold">Check-in de Entregas</h2>
          {isGlobalUser && (
            <div className="mt-3 mb-2">
              <select
                value={eventoCheckin || eventoSelecionado?.id}
                onChange={(e) => setEventoCheckin(e.target.value)}
                className="w-full sm:w-64 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none cursor-pointer"
              >
                {eventos.map(ev => (
                  <option key={ev.id} value={ev.id}>{ev.nome}</option>
                ))}
              </select>
            </div>
          )}
          <div className="mt-2 inline-flex items-center bg-red-50 text-red-700 px-3 py-1 rounded-full text-sm font-semibold border border-red-100">
            Total na lista: {totalCamisetas} {totalCamisetas === 1 ? 'item' : 'itens'}
          </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <input type="text" placeholder="Buscar cliente..." onChange={e => setBusca(e.target.value)} className="border p-2 rounded text-sm flex-1 md:flex-none" />
          <select onChange={e => setFiltroStatus(e.target.value)} className="border p-2 rounded text-sm">
            <option value="Pendente">Pendentes</option>
            <option value="Entregue">Entregues</option>
            <option value="Todos">Todos</option>
          </select>
        </div>
      </div>

      <table className="w-full text-left">
        <thead>
          <tr className="border-b uppercase text-[10px] text-gray-500">
            <th className="p-3">Cliente</th>
            <th className="p-3">Produto</th>
            <th className="p-3">Qtd</th>
            <th className="p-3">Status</th>
            <th className="p-3">Ação</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(r => (
            <tr key={r.id} className="border-b hover:bg-gray-50">
              <td className="p-3">
                <div className="font-semibold text-sm">{r.cliente_nome}</div>
                <div className="text-[11px] text-gray-500">CPF: {formatCPF(r.cpf)}</div>
                <div className="text-[11px] text-gray-500">Fone: {formatPhone(r.telefone)}</div>
              </td>
              <td className="p-3">
                <div className="text-sm font-medium">{r.produtos?.nome}</div>
                <div className="text-[11px] text-slate-500">
                  <span className="font-bold">Cor:</span> {r.produtos?.cor || '-'} | 
                  <span className="font-bold ml-2">Tam:</span> {r.produtos?.tamanho || '-'}
                </div>
              </td>
              <td className="p-3 text-sm font-bold">{r.quantidade || 1}</td>
              <td className="p-3">
                <span className={`px-2 py-1 rounded text-[10px] font-bold ${r.status_entrega === 'Entregue' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {r.status_entrega || 'Pendente'}
                </span>
              </td>
              <td className="p-3">
                {r.status_entrega === 'Entregue' ? (
                  <button onClick={() => { setSelectedReserva(r); setIsViewModalOpen(true); }} className="flex items-center gap-1 text-red-600 underline text-xs hover:text-red-700">
                    <Eye size={14} /> Ver Assinatura
                  </button>
                ) : (
                  <button onClick={() => { setSelectedReserva(r); setIsSignModalOpen(true); }} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-bold transition-colors">
                    Confirmar
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Modal de Assinatura restaurado com o botão Cancelar */}
      {isSignModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl w-full max-w-sm">
            <h3 className="font-bold mb-4">Assinatura de Entrega</h3>
            <div className="border h-40 bg-gray-50 mb-4 rounded"><SignatureCanvas ref={sigPad} canvasProps={{className: 'w-full h-full'}} /></div>
            <div className="flex gap-2">
              <button onClick={() => sigPad.current.clear()} className="flex-1 p-2 bg-gray-200 rounded text-sm hover:bg-gray-300">Limpar</button>
              <button onClick={() => setIsSignModalOpen(false)} className="flex-1 p-2 bg-gray-200 rounded text-sm hover:bg-gray-300">Cancelar</button>
              <button onClick={salvarEntregaComAssinatura} disabled={loading} className="flex-1 p-2 bg-red-600 text-white rounded text-sm font-bold hover:bg-red-700">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {isViewModalOpen && selectedReserva && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl w-full max-w-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold">Comprovante</h3>
              <button onClick={() => setIsViewModalOpen(false)}><X size={20}/></button>
            </div>
            <img src={supabase.storage.from('comprovantes').getPublicUrl(selectedReserva.assinatura_url).data.publicUrl} alt="Assinatura" className="w-full h-40 border bg-gray-100 rounded" />
          </div>
        </div>
      )}
    </div>
  );
}
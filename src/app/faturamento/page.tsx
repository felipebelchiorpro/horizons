"use client";

import {
    Search,
    Bell,
    TrendingUp,
    ArrowUpRight,
    Clock,
    LineChart,
    ArrowDownRight,
    PieChart,
    Filter,
    MoreVertical,
    Mail,
    Download,
    Files,
    Plus,
    MessageSquare,
    CheckCircle2,
    AlertCircle
} from "lucide-react";
import { useState, useEffect } from "react";
import { pb, authenticate } from "@/lib/pocketbase";
import { Modal } from "@/components/Modal";
import { sendWhatsAppMessage } from "@/lib/chatwoot";

interface Fatura {
    id: string;
    cliente: string;
    servico: string;
    vencimento: string;
    valor: string;
    status: string;
    telefone?: string;
}

export default function Faturamento() {
    const [faturas, setFaturas] = useState<Fatura[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [statusToast, setStatusToast] = useState<{ type: "success" | "error", message: string } | null>(null);
    const [newFatura, setNewFatura] = useState({
        cliente: "",
        servico: "",
        vencimento: new Date().toISOString().split('T')[0],
        valor: "R$ 0",
        status: "Pendente",
        telefone: ""
    });

    useEffect(() => {
        async function loadData() {
            try {
                await authenticate();
                const records = await pb.collection('faturas').getFullList<any>({ requestKey: null });
                setFaturas(records.map(r => ({
                    id: r.id,
                    cliente: r.cliente,
                    servico: r.servico,
                    vencimento: r.vencimento,
                    valor: r.valor,
                    status: r.status,
                    telefone: r.telefone
                })));
            } catch (err) {
                console.error("Error loading faturas:", err);
            } finally {
                setLoading(false);
            }
        }
        loadData();

        const unsubscribe = pb.collection('faturas').subscribe('*', () => loadData());
        return () => { unsubscribe.then(u => u()); };
    }, []);

    const showStatus = (type: "success" | "error", message: string) => {
        setStatusToast({ type, message });
        setTimeout(() => setStatusToast(null), 3000);
    };

    const handleCreateFatura = async () => {
        try {
            await pb.collection('faturas').create(newFatura);
            setIsModalOpen(false);
            setNewFatura({
                cliente: "",
                servico: "",
                vencimento: new Date().toISOString().split('T')[0],
                valor: "R$ 0",
                status: "Pendente",
                telefone: ""
            });
            showStatus("success", "Fatura gerada com sucesso!");
        } catch (err) {
            showStatus("error", "Erro ao gerar fatura.");
        }
    };

    const sendInvoiceWhatsApp = async (f: Fatura) => {
        if (!f.telefone) {
            showStatus("error", "Telefone do cliente não cadastrado.");
            return;
        }

        const message = `Olá ${f.cliente}! Sua fatura do serviço *${f.servico}* com vencimento em *${f.vencimento}* no valor de *${f.valor}* já está disponível. 📄✨`;

        try {
            await sendWhatsAppMessage(f.telefone, message);
            showStatus("success", "Fatura enviada via WhatsApp!");
        } catch (err) {
            showStatus("error", "Erro ao enviar WhatsApp.");
        }
    };

    if (loading) {
        return <div className="flex-1 bg-slate-900 flex items-center justify-center text-white">Carregando faturas...</div>;
    }

    return (
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-slate-900">
            {/* Top Bar */}
            <header className="h-20 flex items-center justify-between px-8 bg-slate-900/50 backdrop-blur-md border-b border-slate-800 shrink-0 sticky top-0 z-20">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold text-slate-100">Faturamento e Receita</h2>
                </div>

                <div className="flex items-center gap-6">
                    <div className="relative w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                        <input
                            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-1 focus:ring-blue-500 transition-all text-slate-200 outline-none placeholder:text-slate-500"
                            placeholder="Buscar faturas..."
                        />
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="h-10 px-4 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg"
                    >
                        <Plus className="w-4 h-4" />
                        Nova Fatura
                    </button>
                </div>
            </header>

            {statusToast && (
                <div className={`fixed top-8 right-8 z-50 flex items-center gap-3 px-6 py-4 rounded-xl border animate-in slide-in-from-right-10 duration-300 ${statusToast.type === "success" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                    }`}>
                    {statusToast.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    <span className="font-bold text-sm tracking-wide">{statusToast.message}</span>
                </div>
            )}

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar relative">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                    <div className="bg-slate-800/40 border border-slate-700/50 p-6 rounded-2xl">
                        <p className="text-sm font-medium text-slate-400 mb-1">Receita Total</p>
                        <p className="text-2xl font-bold text-white">R$ 0,00</p>
                        <div className="mt-4 flex items-center text-xs text-emerald-500 font-bold bg-emerald-500/10 w-fit px-2 py-1 rounded">
                            <ArrowUpRight className="w-3 h-3 mr-1" /> 0%
                        </div>
                    </div>
                    <div className="bg-slate-800/40 border border-slate-700/50 p-6 rounded-2xl">
                        <p className="text-sm font-medium text-slate-400 mb-1">A Receber</p>
                        <p className="text-2xl font-bold text-white">R$ 0,00</p>
                        <div className="mt-4 flex items-center text-xs text-blue-500 font-bold bg-blue-500/10 w-fit px-2 py-1 rounded">
                            <Clock className="w-3 h-3 mr-1" /> 0 faturas
                        </div>
                    </div>
                    {/* Simplified for space */}
                </div>

                <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-slate-700/50 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-white">Faturas Recentes</h3>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-900/50 text-[10px] uppercase font-bold text-slate-500 tracking-widest">
                                <tr>
                                    <th className="px-6 py-4">Cliente</th>
                                    <th className="px-6 py-4">Serviço</th>
                                    <th className="px-6 py-4">Vencimento</th>
                                    <th className="px-6 py-4">Valor</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50">
                                {faturas.map((f) => (
                                    <tr key={f.id} className="hover:bg-slate-800/60 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold text-xs">
                                                    {f.cliente.charAt(0)}
                                                </div>
                                                <span className="text-sm font-semibold text-slate-200">{f.cliente}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-400">{f.servico}</td>
                                        <td className="px-6 py-4 text-sm text-slate-300 font-mono">{f.vencimento}</td>
                                        <td className="px-6 py-4 text-sm font-bold text-white">{f.valor}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${f.status === 'Pago' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                                                }`}>
                                                {f.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => sendInvoiceWhatsApp(f)}
                                                    className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                                                    title="Enviar via WhatsApp"
                                                >
                                                    <MessageSquare className="w-4 h-4" />
                                                </button>
                                                <button className="p-2 bg-slate-700/50 text-slate-400 rounded-lg hover:text-white transition-all">
                                                    <Download className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {faturas.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-10 text-center text-slate-500 font-medium">
                                            Nenhuma fatura emitida.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Gerar Nova Fatura"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Cliente</label>
                        <input
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Nome do cliente"
                            value={newFatura.cliente}
                            onChange={(e) => setNewFatura({ ...newFatura, cliente: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Telefone (WhatsApp)</label>
                        <input
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="+55..."
                            value={newFatura.telefone}
                            onChange={(e) => setNewFatura({ ...newFatura, telefone: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Serviço/Produto</label>
                        <input
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Ex: Gestão Mensal"
                            value={newFatura.servico}
                            onChange={(e) => setNewFatura({ ...newFatura, servico: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Valor</label>
                            <input
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="R$ 1.500"
                                value={newFatura.valor}
                                onChange={(e) => setNewFatura({ ...newFatura, valor: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Vencimento</label>
                            <input
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-blue-500"
                                type="date"
                                value={newFatura.vencimento}
                                onChange={(e) => setNewFatura({ ...newFatura, vencimento: e.target.value })}
                            />
                        </div>
                    </div>
                    <button
                        onClick={handleCreateFatura}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg mt-4 transition-all active:scale-[0.98]"
                    >
                        Confirmar e Emitir
                    </button>
                </div>
            </Modal>
        </div>
    );
}

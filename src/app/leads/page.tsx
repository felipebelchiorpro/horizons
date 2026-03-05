"use client";

import {
    Plus,
    Filter,
    Bell,
    Search,
    MoreHorizontal,
    MessageSquare,
    Calendar,
    FileText,
    TrendingUp,
    Eye,
    Phone
} from "lucide-react";
import { useState, useEffect } from "react";
import { pb, authenticate } from "@/lib/pocketbase";
import { Modal } from "@/components/Modal";
import { sendWhatsAppMessage } from "@/lib/chatwoot";

interface Lead {
    id: string; // ID should be string in PB
    nome: string;
    empresa: string;
    origem: string;
    valor: string;
    score: number;
    status: string;
    telefone?: string;
}

interface Column {
    id: string;
    title: string;
    count: number;
    items: Lead[];
}

export default function Leads() {
    const [pipeline, setPipeline] = useState<Column[]>([
        { id: 'novos', title: 'Novas Oportunidades', count: 0, items: [] },
        { id: 'descoberta', title: 'Reunião de Descoberta', count: 0, items: [] },
        { id: 'estrategica', title: 'Proposta Estratégica', count: 0, items: [] },
        { id: 'fechamento', title: 'Fechamento', count: 0, items: [] },
    ]);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newLead, setNewLead] = useState({
        nome: "",
        empresa: "",
        origem: "Ads",
        valor: "R$ 0",
        score: 50,
        status: "novos",
        telefone: ""
    });

    useEffect(() => {
        async function loadData() {
            try {
                await authenticate();
                const records = await pb.collection('leads').getFullList<any>({ requestKey: null });

                const newPipeline = [
                    { id: 'novos', title: 'Novas Oportunidades', count: 0, items: [] as Lead[] },
                    { id: 'descoberta', title: 'Reunião de Descoberta', count: 0, items: [] as Lead[] },
                    { id: 'estrategica', title: 'Proposta Estratégica', count: 0, items: [] as Lead[] },
                    { id: 'fechamento', title: 'Fechamento', count: 0, items: [] as Lead[] },
                ];

                records.forEach(record => {
                    const lead: Lead = {
                        id: record.id,
                        nome: record.nome,
                        empresa: record.empresa,
                        origem: record.origem,
                        valor: record.valor,
                        score: record.score,
                        status: record.status,
                        telefone: record.telefone
                    };
                    const col = newPipeline.find(c => c.id === record.status);
                    if (col) {
                        col.items.push(lead);
                        col.count++;
                    }
                });

                setPipeline(newPipeline);
                if (records.length > 0 && !selectedLead) {
                    setSelectedLead({
                        id: records[0].id,
                        nome: records[0].nome,
                        empresa: records[0].empresa,
                        origem: records[0].origem,
                        valor: records[0].valor,
                        score: records[0].score,
                        status: records[0].status,
                        telefone: records[0].telefone
                    });
                }
            } catch (err) {
                console.error('Error loading leads:', err);
            } finally {
                setLoading(false);
            }
        }

        loadData();

        // Subscribe to changes
        const unsubscribe = pb.collection('leads').subscribe('*', function (e) {
            loadData();
        });

        return () => {
            unsubscribe.then(unsub => unsub());
        };
    }, []);

    async function handleCreateLead() {
        try {
            await pb.collection('leads').create(newLead);
            setIsModalOpen(false);
            setNewLead({
                nome: "",
                empresa: "",
                origem: "Ads",
                valor: "R$ 0",
                score: 50,
                status: "novos",
                telefone: ""
            });
        } catch (err) {
            console.error("Error creating lead:", err);
            alert("Erro ao criar lead. Verifique os campos.");
        }
    }

    async function handleUpdateStatus(lead: Lead, newStatus: string) {
        try {
            await pb.collection('leads').update(lead.id, { status: newStatus });

            // Trigger Welcome Message if moved to 'Fechamento'
            if (newStatus === 'fechamento' && lead.telefone) {
                const message = `Olá ${lead.nome}! Seja muito bem-vindo à Horizons. É um prazer ter você conosco! 🚀`;
                await sendWhatsAppMessage(lead.telefone, message);
                console.log("Welcome message sent to", lead.nome);
            }
        } catch (err) {
            console.error("Error updating lead status:", err);
        }
    }

    if (loading) {
        return <div className="flex-1 bg-slate-900 flex items-center justify-center text-white">Carregando pipeline...</div>;
    }

    return (
        <div className="flex-1 flex min-w-0 h-full overflow-hidden bg-slate-900">

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-w-0 h-full">
                {/* Header */}
                <header className="h-20 flex flex-shrink-0 items-center justify-between px-8 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-20">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-bold text-white">Pipeline de Vendas</h2>
                        <div className="flex items-center bg-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-300 border border-slate-700/50 cursor-pointer hover:bg-slate-700 transition-colors">
                            <Filter className="w-4 h-4 mr-2 text-slate-400" />
                            Filtros Avançados
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="relative">
                            <Bell className="w-5 h-5 text-slate-400 cursor-pointer hover:text-white transition-colors" />
                            <div className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-slate-900"></div>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-800/80 rounded-xl px-4 py-2 border border-slate-700 focus-within:ring-1 focus-within:ring-blue-500 transition-all w-72">
                            <Search className="w-4 h-4 text-slate-400" />
                            <input
                                className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder-slate-500 text-slate-200 outline-none"
                                placeholder="Buscar leads ou empresas..."
                                type="text"
                            />
                        </div>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="h-10 px-4 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                        >
                            <Plus className="w-4 h-4" />
                            Novo Lead
                        </button>
                    </div>
                </header>

                {/* Kanban Area */}
                <div className="flex-1 overflow-x-auto overflow-y-hidden p-8 bg-slate-950/50 custom-scrollbar">
                    <div className="flex gap-6 h-full min-h-[600px]">

                        {pipeline.map((col, colIndex) => (
                            <div key={col.id} className="kanban-column flex flex-col gap-4 min-w-[320px] max-w-[400px] w-full shrink-0">
                                <div className="flex items-center justify-between px-2">
                                    <h3 className="font-bold flex items-center gap-2 text-white">
                                        <span className={`h-2.5 w-2.5 rounded-full ${colIndex === 0 ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]' :
                                            colIndex === 1 ? 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]' :
                                                colIndex === 2 ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]' :
                                                    'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]'
                                            }`}></span>
                                        {col.title}
                                        <span className="text-slate-500 font-medium text-sm ml-2 bg-slate-800/50 px-2 rounded-full border border-slate-700/50">{col.count}</span>
                                    </h3>
                                    <MoreHorizontal className="w-5 h-5 text-slate-500 cursor-pointer hover:text-white transition-colors" />
                                </div>
                                <div className="flex-1 bg-slate-800/30 border border-slate-800/50 backdrop-blur-xl rounded-2xl p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar">

                                    {col.items.length === 0 ? (
                                        <div className="h-full border-2 border-dashed border-slate-700 bg-slate-800/20 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-800/40 hover:border-slate-600 transition-colors">
                                            <p className="text-sm font-medium">Arraste aqui para fechar</p>
                                        </div>
                                    ) : (
                                        col.items.map((lead) => (
                                            <div
                                                key={lead.id}
                                                onClick={() => setSelectedLead(lead)}
                                                className={`rounded-xl p-5 transition-all cursor-grab active:cursor-grabbing relative overflow-hidden group ${selectedLead?.id === lead.id
                                                    ? 'bg-slate-800/80 border-2 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.15)]'
                                                    : 'bg-slate-800 border border-slate-700 hover:border-slate-600 hover:shadow-lg hover:shadow-black/20'
                                                    }`}
                                            >
                                                {/* Status Shortcut (for demo/quick testing of automation) */}
                                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <select
                                                        className="bg-slate-900 text-[10px] text-white border border-slate-700 rounded px-1 outline-none"
                                                        value={lead.status}
                                                        onChange={(e) => handleUpdateStatus(lead, e.target.value)}
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <option value="novos">Novos</option>
                                                        <option value="descoberta">Descoberta</option>
                                                        <option value="estrategica">Estratégica</option>
                                                        <option value="fechamento">Fechamento (VIP)</option>
                                                    </select>
                                                </div>

                                                <div className={`absolute top-0 left-0 w-1.5 h-full ${selectedLead?.id === lead.id ? 'bg-blue-500' : 'bg-slate-600 group-hover:bg-blue-500 transition-colors'
                                                    }`}></div>
                                                {selectedLead?.id === lead.id && (
                                                    <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 blur-2xl rounded-full"></div>
                                                )}
                                                <div className="flex justify-between items-start mb-4 pl-2 relative z-10">
                                                    <div className="flex gap-1.5">
                                                        <div className="h-1.5 w-6 rounded-full bg-emerald-500"></div>
                                                        <div className={`h-1.5 w-6 rounded-full ${lead.score >= 70 ? 'bg-emerald-500' : 'bg-slate-700'}`}></div>
                                                        <div className={`h-1.5 w-6 rounded-full ${lead.score >= 90 ? 'bg-emerald-500' : 'bg-slate-700'}`}></div>
                                                    </div>
                                                    <span className={`text-[10px] px-2.5 py-0.5 rounded-md font-bold uppercase tracking-wider border ${lead.origem === 'Ads' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                        lead.origem === 'Orgânico' ? 'bg-slate-700/50 text-slate-300 border-slate-600' :
                                                            'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                                                        }`}>
                                                        {lead.origem}
                                                    </span>
                                                </div>
                                                <h4 className="font-bold text-base text-white pl-2 relative z-10">{lead.nome}</h4>
                                                <p className="text-slate-400 text-sm mb-5 pl-2 font-medium relative z-10">{lead.empresa}</p>
                                                <div className="flex items-center justify-between border-t border-slate-700 pt-4 px-2 relative z-10">
                                                    <span className={`font-bold ${selectedLead?.id === lead.id ? 'text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20' : 'text-slate-300'}`}>
                                                        {lead.valor}
                                                    </span>
                                                    <div className="flex gap-1">
                                                        <button className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors">
                                                            <MessageSquare className="w-4 h-4" />
                                                        </button>
                                                        <button className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors">
                                                            <Calendar className="w-4 h-4" />
                                                        </button>
                                                        <button className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors">
                                                            <Phone className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}

                                </div>
                            </div>
                        ))}

                    </div>
                </div>
            </main>

            {/* Side Panel: Potential Growth */}
            <aside className="w-[400px] flex-shrink-0 bg-slate-900 border-l border-slate-800 p-8 flex flex-col gap-8 h-full overflow-y-auto custom-scrollbar relative z-30 shadow-[-10px_0_30px_rgba(0,0,0,0.2)]">
                <div className="flex flex-col gap-1 border-b border-slate-800 pb-6">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-500" />
                        Potencial de Crescimento
                    </h3>
                    <p className="text-slate-400 text-sm">Análise detalhada do lead selecionado</p>
                </div>

                {!selectedLead ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-sm">
                        <TrendingUp className="w-12 h-12 mb-4 opacity-20" />
                        <p>Selecione um lead para ver os detalhes</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-8">
                        {/* Selected Lead Brief */}
                        <div className="flex items-center gap-4 p-4 bg-slate-800 rounded-xl border border-slate-700 shadow-lg shadow-black/20">
                            <div className="h-14 w-14 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xl border border-indigo-500/30">
                                {selectedLead?.nome?.slice(0, 2).toUpperCase() || '??'}
                            </div>
                            <div className="flex flex-col">
                                <h4 className="font-bold text-white text-lg leading-tight">{selectedLead?.nome}</h4>
                                <p className="text-xs text-blue-400 font-medium mt-1 uppercase tracking-wider">{selectedLead?.empresa}</p>
                            </div>
                        </div>

                        {/* Radial Charts */}
                        <div className="grid grid-cols-1 gap-6">

                            <div className="flex flex-col items-center gap-4 bg-slate-800/40 p-6 rounded-2xl border border-slate-700/50 hover:bg-slate-800 transition-colors">
                                <div className="relative flex items-center justify-center">
                                    {/* SVG Radial Progress */}
                                    <svg className="w-32 h-32 transform -rotate-90 filter drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]">
                                        <circle className="text-slate-700" cx="64" cy="64" fill="transparent" r="58" stroke="currentColor" strokeWidth="8"></circle>
                                        <circle className="text-blue-500" cx="64" cy="64" fill="transparent" r="58" stroke="currentColor" strokeDasharray="364.4" strokeDashoffset="109.3" strokeLinecap="round" strokeWidth="10"></circle>
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-3xl font-bold text-white">70%</span>
                                        <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mt-1">Fit Ideal</span>
                                    </div>
                                </div>
                                <p className="text-sm font-semibold text-slate-300">Compatibilidade com ERP</p>
                            </div>

                            <div className="flex flex-col items-center gap-4 bg-slate-800/40 p-6 rounded-2xl border border-slate-700/50 hover:bg-slate-800 transition-colors">
                                <div className="relative flex items-center justify-center">
                                    <svg className="w-32 h-32 transform -rotate-90 filter drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]">
                                        <circle className="text-slate-700" cx="64" cy="64" fill="transparent" r="58" stroke="currentColor" strokeWidth="8"></circle>
                                        <circle className="text-emerald-500" cx="64" cy="64" fill="transparent" r="58" stroke="currentColor" strokeDasharray="364.4" strokeDashoffset="72.8" strokeLinecap="round" strokeWidth="10"></circle>
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-3xl font-bold text-white">{selectedLead?.score || 0}%</span>
                                        <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mt-1">Scores</span>
                                    </div>
                                </div>
                                <p className="text-sm font-semibold text-slate-300">Probabilidade de Fechamento</p>
                            </div>

                        </div>

                        {/* Growth Insights */}
                        <div className="flex flex-col gap-5 bg-slate-800/40 p-6 rounded-2xl border border-slate-700/50">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Insights Adicionais</h4>
                            <div className="flex flex-col gap-4">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-yellow-500/10 rounded-lg shrink-0 mt-0.5 border border-yellow-500/20">
                                        <TrendingUp className="text-yellow-500 w-4 h-4" />
                                    </div>
                                    <p className="text-slate-300 text-sm leading-relaxed">Expansão de mercado detectada no último trimestre em MG/RJ.</p>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-blue-500/10 rounded-lg shrink-0 mt-0.5 border border-blue-500/20">
                                        <Eye className="text-blue-500 w-4 h-4" />
                                    </div>
                                    <p className="text-slate-300 text-sm leading-relaxed">Lead visitou a página de preços <span className="font-bold text-white">4 vezes</span> nas últimas 24h.</p>
                                </div>
                            </div>
                        </div>

                    </div>
                )}

                <button className="w-full mt-auto py-3.5 bg-slate-800 border border-slate-700 text-slate-200 rounded-xl font-bold hover:bg-slate-700 hover:text-white transition-all shadow-lg hover:shadow-black/20">
                    Ver Timeline Completa
                </button>
            </aside>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Cadastrar Novo Lead"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 text-left">Nome do Contato</label>
                        <input
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Ex: João Silva"
                            value={newLead.nome}
                            onChange={(e) => setNewLead({ ...newLead, nome: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 text-left">Telefone (WhatsApp)</label>
                        <input
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Ex: +5511999999999"
                            value={newLead.telefone}
                            onChange={(e) => setNewLead({ ...newLead, telefone: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 text-left">Empresa</label>
                        <input
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Ex: Tech Solutions"
                            value={newLead.empresa}
                            onChange={(e) => setNewLead({ ...newLead, empresa: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 text-left">Origem</label>
                            <select
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-blue-500 appearance-none"
                                value={newLead.origem}
                                onChange={(e) => setNewLead({ ...newLead, origem: e.target.value })}
                            >
                                <option value="Ads">Ads</option>
                                <option value="Orgânico">Orgânico</option>
                                <option value="Indicação">Indicação</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 text-left">Valor Estimado</label>
                            <input
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="R$ 5.000"
                                value={newLead.valor}
                                onChange={(e) => setNewLead({ ...newLead, valor: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="pt-4 flex justify-end">
                        <button
                            onClick={handleCreateLead}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                        >
                            Salvar Lead
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

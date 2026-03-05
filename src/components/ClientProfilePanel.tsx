import React, { useState, useEffect } from "react";
import { X, Calendar, FileText, BadgeDollarSign, Plus, Building2, Download } from "lucide-react";
import { pb } from "@/lib/pocketbase";

interface ClientProfilePanelProps {
    isOpen: boolean;
    onClose: () => void;
    cliente: any;
}

export function ClientProfilePanel({ isOpen, onClose, cliente }: ClientProfilePanelProps) {
    const [activeTab, setActiveTab] = useState<"historico" | "contratos" | "financeiro">("historico");

    // Dados puxados do banco
    const [ordens, setOrdens] = useState<any[]>([]);
    const [contratos, setContratos] = useState<any[]>([]);
    const [faturas, setFaturas] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Estado para "Nova Ordem Rápida"
    const [isCreatingOrdem, setIsCreatingOrdem] = useState(false);
    const [newOrdem, setNewOrdem] = useState({ descricao: "", valor: "", data: new Date().toISOString().split('T')[0], pago: false });

    useEffect(() => {
        if (isOpen && cliente) {
            loadClientData();
        }
    }, [isOpen, cliente, activeTab]);

    async function loadClientData() {
        if (!cliente) return;
        setLoading(true);
        try {
            if (activeTab === "historico") {
                const r = await pb.collection('ordens_servico').getFullList<any>({
                    filter: `cliente = "${cliente.id}"`,
                    sort: '-data'
                });
                setOrdens(r);
            } else if (activeTab === "contratos") {
                // Ajustámos a tabela para contrats_gerados que estava usando apenas texto no cliente, mas filtrando pelo nome. Ideal seria ID, mas vamos tentar por nome da empresa
                const r = await pb.collection('contratos_gerados').getFullList<any>({
                    filter: `cliente ?~ "${cliente.empresa}"`
                });
                setContratos(r);
            } else if (activeTab === "financeiro") {
                const r = await pb.collection('faturas').getFullList<any>({
                    filter: `cliente ?~ "${cliente.empresa}"` // Assumindo relação frouxa se não for ID
                });
                setFaturas(r);
            }
        } catch (e) {
            console.error("Erro ao carregar dados da aba", e);
        } finally {
            setLoading(false);
        }
    }

    async function handleAddOrdem(e: React.FormEvent) {
        e.preventDefault();
        try {
            await pb.collection('ordens_servico').create({
                cliente: cliente.id,
                descricao: newOrdem.descricao,
                valor: Number(newOrdem.valor),
                data: newOrdem.data,
                pago: newOrdem.pago
            });
            setIsCreatingOrdem(false);
            setNewOrdem({ descricao: "", valor: "", data: new Date().toISOString().split('T')[0], pago: false });
            loadClientData();
        } catch (error) {
            console.error(error);
            alert("Erro ao criar ordem de serviço. Verifique a configuração da coleção no PocketBase.");
        }
    }

    if (!isOpen || !cliente) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm transition-all duration-300">
            <div className="w-full max-w-2xl bg-slate-900 h-full shadow-2xl flex flex-col pt-16 sm:pt-0 transform transition-transform duration-300 ease-in-out border-l border-slate-800">

                {/* Header do Painel */}
                <div className="p-6 border-b border-slate-800 flex justify-between items-start bg-slate-800/30">
                    <div className="flex gap-4">
                        <div className="w-16 h-16 rounded-xl bg-blue-600/20 flex flex-shrink-0 items-center justify-center text-blue-500 border border-blue-500/20">
                            <Building2 className="w-8 h-8" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white leading-tight">{cliente.empresa}</h2>
                            <p className="text-slate-400">{cliente.nome} • {cliente.responsavel}</p>
                            <div className="mt-2 flex gap-2">
                                <span className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded border border-slate-700">{cliente.telefone}</span>
                                <span className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded border border-slate-700 truncate max-w-[150px]">{cliente.email}</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 bg-slate-800/50 hover:bg-slate-700/50 text-slate-400 rounded-lg transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Abas de Navegação */}
                <div className="flex border-b border-slate-800">
                    <button
                        onClick={() => setActiveTab("historico")}
                        className={`flex-1 py-4 text-sm font-medium border-b-2 transition-all flex items-center justify-center gap-2 ${activeTab === "historico" ? "border-blue-500 text-blue-400 bg-blue-500/5" : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30"}`}
                    >
                        <Calendar className="w-4 h-4" /> Histórico / Ordens
                    </button>
                    <button
                        onClick={() => setActiveTab("contratos")}
                        className={`flex-1 py-4 text-sm font-medium border-b-2 transition-all flex items-center justify-center gap-2 ${activeTab === "contratos" ? "border-blue-500 text-blue-400 bg-blue-500/5" : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30"}`}
                    >
                        <FileText className="w-4 h-4" /> Contratos Gerados
                    </button>
                    <button
                        onClick={() => setActiveTab("financeiro")}
                        className={`flex-1 py-4 text-sm font-medium border-b-2 transition-all flex items-center justify-center gap-2 ${activeTab === "financeiro" ? "border-blue-500 text-blue-400 bg-blue-500/5" : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30"}`}
                    >
                        <BadgeDollarSign className="w-4 h-4" /> Faturas e Receita
                    </button>
                </div>

                {/* Conteúdo das Abas (Rolável) */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-900/50 custom-scrollbar">

                    {/* ABA HISTÓRICO */}
                    {activeTab === "historico" && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-bold text-white">Ordens de Serviço</h3>
                                <button
                                    onClick={() => setIsCreatingOrdem(!isCreatingOrdem)}
                                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border border-slate-700"
                                >
                                    {isCreatingOrdem ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                    {isCreatingOrdem ? "Cancelar" : "Nova Ordem"}
                                </button>
                            </div>

                            {isCreatingOrdem && (
                                <form onSubmit={handleAddOrdem} className="bg-slate-800/50 p-4 rounded-xl border border-blue-500/30 space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Descrição do Serviço</label>
                                        <input required value={newOrdem.descricao} onChange={e => setNewOrdem({ ...newOrdem, descricao: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500" placeholder="Ex: Manutenção Mensal Marketing" />
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Valor (R$)</label>
                                            <input required type="number" step="0.01" value={newOrdem.valor} onChange={e => setNewOrdem({ ...newOrdem, valor: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500" placeholder="0.00" />
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Data</label>
                                            <input required type="date" value={newOrdem.data} onChange={e => setNewOrdem({ ...newOrdem, data: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-blue-500" />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input type="checkbox" id="pago" checked={newOrdem.pago} onChange={e => setNewOrdem({ ...newOrdem, pago: e.target.checked })} className="w-4 h-4 bg-slate-900 border-slate-700 rounded accent-blue-500" />
                                        <label htmlFor="pago" className="text-sm text-slate-300 cursor-pointer">Marcar como Pago</label>
                                    </div>
                                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg transition-colors text-sm">Salvar Ordem</button>
                                </form>
                            )}

                            {loading ? (
                                <p className="text-slate-500 text-center py-4 text-sm">Carregando histórico...</p>
                            ) : ordens.length === 0 ? (
                                <div className="text-center py-10 border border-dashed border-slate-800 rounded-xl">
                                    <p className="text-slate-500 text-sm">Nenhum serviço registrado para este cliente ainda.</p>
                                </div>
                            ) : (
                                <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-800 before:to-transparent">
                                    {ordens.map(ordem => (
                                        <div key={ordem.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                            <div className="flex items-center justify-center w-10 h-10 rounded-full border border-slate-700 bg-slate-900 text-slate-500 group-[.is-active]:text-blue-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                                                <Calendar className="w-4 h-4" />
                                            </div>
                                            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-slate-800/50 border border-slate-700 p-4 rounded-xl shadow">
                                                <div className="flex items-center justify-between space-x-2 mb-1">
                                                    <div className="font-bold text-white text-sm">{ordem.descricao}</div>
                                                    <time className="font-mono text-xs font-medium text-slate-500">{new Date(ordem.data).toLocaleDateString('pt-BR')}</time>
                                                </div>
                                                <div className="flex justify-between items-center mt-3">
                                                    <span className="text-blue-400 font-medium text-sm">R$ {Number(ordem.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${ordem.pago ? 'bg-emerald-500/10 text-emerald-500' : 'bg-orange-500/10 text-orange-500'}`}>
                                                        {ordem.pago ? 'Pago' : 'Pendente'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ABA CONTRATOS */}
                    {activeTab === "contratos" && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-white mb-4">Contratos Gerados</h3>
                            {loading ? (
                                <p className="text-slate-500 text-center py-4 text-sm">Carregando contratos...</p>
                            ) : contratos.length === 0 ? (
                                <div className="text-center py-10 border border-dashed border-slate-800 rounded-xl">
                                    <p className="text-slate-500 text-sm">Nenhum contrato gerado para o nome desta empresa.</p>
                                </div>
                            ) : (
                                <div className="grid gap-4">
                                    {contratos.map(c => (
                                        <div key={c.id} className="bg-slate-800/40 border border-slate-700 p-4 rounded-xl flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 bg-red-500/10 text-red-400 rounded-lg">
                                                    <FileText className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <h4 className="text-white font-medium text-sm">{c.servico || 'Contrato de Prestação de Serviços'}</h4>
                                                    <p className="text-slate-500 text-xs mt-1">Gerado em: {new Date(c.created).toLocaleDateString('pt-BR')}</p>
                                                </div>
                                            </div>
                                            <a href={`https://backventure.venturexp.pro/api/files/contratos_gerados/${c.id}/${c.documento}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-1.5 bg-slate-700/50 hover:bg-slate-600 text-white rounded-lg text-xs font-bold transition-colors">
                                                <Download className="w-4 h-4" /> Baixar PDF
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ABA FINANCEIRO */}
                    {activeTab === "financeiro" && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-white">Faturas Pendentes e Histórico</h3>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-slate-800/40 p-4 rounded-xl border border-emerald-500/20">
                                    <p className="text-xs uppercase font-bold text-emerald-500/70 mb-1">Total Recebido</p>
                                    <h4 className="text-2xl font-bold text-emerald-400">
                                        R$ {faturas.filter(f => f.status === 'Pago').reduce((acc, f) => acc + Number(f.valor), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </h4>
                                </div>
                                <div className="bg-slate-800/40 p-4 rounded-xl border border-rose-500/20">
                                    <p className="text-xs uppercase font-bold text-rose-500/70 mb-1">Total Pendente</p>
                                    <h4 className="text-2xl font-bold text-rose-400">
                                        R$ {faturas.filter(f => f.status !== 'Pago').reduce((acc, f) => acc + Number(f.valor), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </h4>
                                </div>
                            </div>

                            {loading ? (
                                <p className="text-slate-500 text-center py-4 text-sm">Carregando financeiro...</p>
                            ) : faturas.length === 0 ? (
                                <div className="text-center py-10 border border-dashed border-slate-800 rounded-xl">
                                    <p className="text-slate-500 text-sm">Nenhuma fatura lançada no nome desta empresa.</p>
                                </div>
                            ) : (
                                <div className="bg-slate-800/30 rounded-xl border border-slate-700 overflow-hidden">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-800/80 text-slate-400 text-xs uppercase tracking-wider">
                                            <tr>
                                                <th className="px-4 py-3 font-medium">Situação</th>
                                                <th className="px-4 py-3 font-medium">Fatura Ref.</th>
                                                <th className="px-4 py-3 font-medium text-right">Valor</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800">
                                            {faturas.map(f => (
                                                <tr key={f.id} className="hover:bg-slate-700/20 transition-colors">
                                                    <td className="px-4 py-3">
                                                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${f.status === 'Pago' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}>
                                                            {f.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-300">
                                                        <div className="font-medium text-white">{f.servico}</div>
                                                        <div className="text-xs text-slate-500">Venc: {f.vencimento}</div>
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-medium text-white">
                                                        R$ {Number(f.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

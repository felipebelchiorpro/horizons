"use client";

import { useState, useEffect } from "react";
import { Search, Plus, Edit2, Trash2, Settings, Tag, DollarSign, FileText } from "lucide-react";
import { pb, authenticate } from "@/lib/pocketbase";
import { Modal } from "@/components/Modal";

interface Servico {
    id: string;
    nome: string;
    valorBase: number;
    desc: string;
    categoria?: string;
}

export default function Servicos() {
    const [servicos, setServicos] = useState<Servico[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newServico, setNewServico] = useState({
        nome: "",
        valorBase: 0,
        desc: "",
        categoria: "Estratégico"
    });

    useEffect(() => {
        async function loadData() {
            try {
                await authenticate();
                const records = await pb.collection('servicos').getFullList<any>({
                    requestKey: null
                });
                setServicos(records.map(r => ({
                    id: r.id,
                    nome: r.nome,
                    valorBase: r.valorBase,
                    desc: r.desc,
                    categoria: r.categoria || "Estratégico"
                })));
            } catch (err) {
                console.error("Error loading services:", err);
            } finally {
                setLoading(false);
            }
        }
        loadData();

        // Subscribe to changes
        const unsubscribe = pb.collection('servicos').subscribe('*', function (e) {
            loadData();
        });

        return () => {
            unsubscribe.then(unsub => unsub());
        };
    }, []);

    async function handleCreateServico() {
        try {
            await pb.collection('servicos').create(newServico);
            setIsModalOpen(false);
            setNewServico({
                nome: "",
                valorBase: 0,
                desc: "",
                categoria: "Estratégico"
            });
        } catch (err) {
            console.error("Error creating servico:", err);
            alert("Erro ao criar serviço. Verifique os campos.");
        }
    }

    const filteredServicos = servicos.filter(s =>
        s.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.desc.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return <div className="flex-1 bg-slate-900 flex items-center justify-center text-white">Carregando serviços...</div>;
    }

    return (
        <div className="flex-1 flex flex-col min-w-0 h-full bg-slate-900">
            <header className="h-20 flex items-center justify-between px-8 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-20">
                <h2 className="text-xl font-bold text-white">Catálogo de Serviços</h2>
                <div className="flex items-center gap-4">
                    <div className="relative w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                        <input
                            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                            placeholder="Buscar serviços..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-lg shadow-blue-600/20"
                    >
                        <Plus className="w-4 h-4" />
                        Novo Serviço
                    </button>
                </div>
            </header>

            <main className="p-8 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredServicos.map(servico => (
                        <div key={servico.id} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-6 hover:border-slate-500 transition-all group relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                <button className="p-2 bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors">
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button className="p-2 bg-slate-700 rounded-lg text-rose-400 hover:bg-rose-500 hover:text-white transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-xl bg-purple-600/20 flex items-center justify-center text-purple-500 border border-purple-500/20">
                                    <Settings className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-white font-bold leading-tight">{servico.nome}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Tag className="w-3 h-3 text-slate-500" />
                                        <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">{servico.categoria}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700/30">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase">Preço Base</span>
                                        <DollarSign className="w-3 h-3 text-emerald-500" />
                                    </div>
                                    <p className="text-xl font-mono font-bold text-white">
                                        {Number(servico.valorBase).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </p>
                                </div>

                                <div>
                                    <div className="flex items-center gap-2 mb-2 text-[10px] font-bold text-slate-500 uppercase">
                                        <FileText className="w-3 h-3" />
                                        <span>Descrição do Escopo</span>
                                    </div>
                                    <p className="text-sm text-slate-400 leading-relaxed line-clamp-3">
                                        {servico.desc}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-6 pt-6 border-t border-slate-700/50 flex justify-end">
                                <button className="text-xs font-bold text-blue-500 hover:text-blue-400 transition-colors uppercase tracking-widest">
                                    Ver Detalhes
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {filteredServicos.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                        <Settings className="w-16 h-16 mb-4 opacity-20" />
                        <p>Nenhum serviço encontrado.</p>
                    </div>
                )}
            </main>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Cadastrar Novo Serviço"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Nome do Serviço</label>
                        <input
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Ex: Consultoria de Processos"
                            value={newServico.nome}
                            onChange={(e) => setNewServico({ ...newServico, nome: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Preço Base (R$)</label>
                            <input
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                                type="number"
                                placeholder="0.00"
                                value={newServico.valorBase}
                                onChange={(e) => setNewServico({ ...newServico, valorBase: Number(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Categoria</label>
                            <select
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-blue-500 appearance-none"
                                value={newServico.categoria}
                                onChange={(e) => setNewServico({ ...newServico, categoria: e.target.value })}
                            >
                                <option value="Estratégico">Estratégico</option>
                                <option value="Operacional">Operacional</option>
                                <option value="Consultoria">Consultoria</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Descrição do Escopo</label>
                        <textarea
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-blue-500 min-h-[120px]"
                            placeholder="Descreva o que está incluído neste serviço..."
                            value={newServico.desc}
                            onChange={(e) => setNewServico({ ...newServico, desc: e.target.value })}
                        />
                    </div>
                    <div className="pt-4 flex justify-end">
                        <button
                            onClick={handleCreateServico}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                        >
                            Salvar Serviço
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

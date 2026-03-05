"use client";

import { useState, useEffect } from "react";
import { Search, Plus, Edit2, Trash2, UserCircle, Briefcase, BadgeDollarSign, ShieldAlert } from "lucide-react";
import { pb } from "@/lib/pocketbase";
import { Modal } from "@/components/Modal";

interface Colaborador {
    id: string;
    nome: string;
    cargo: string;
    valor_hora: number;
    status: string;
    nivel_acesso: string;
    modulos?: string[];
}

export default function Colaboradores() {
    const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [newColaborador, setNewColaborador] = useState({
        nome: "",
        cargo: "",
        valor_hora: 0,
        status: "Ativo",
        nivel_acesso: "Colaborador",
        modulos: ["Projetos", "Financeiro"] as string[]
    });

    const [errorMsg, setErrorMsg] = useState("");

    useEffect(() => {
        async function loadData() {
            try {
                const records = await pb.collection('colaboradores').getFullList<any>({
                    requestKey: null
                });

                setColaboradores(records.map(r => ({
                    id: r.id,
                    nome: r.nome,
                    cargo: r.cargo,
                    valor_hora: r.valor_hora,
                    status: r.status,
                    nivel_acesso: r.nivel_acesso,
                    modulos: r.modulos || []
                })));
                setErrorMsg("");
            } catch (err: any) {
                console.error("Error loading colaboradores:", err);
                if (err.status === 404) {
                    setErrorMsg("A coleção 'colaboradores' não foi encontrada no PocketBase. Por favor, crie-a no painel Admin para prosseguir com o uso da página.");
                } else {
                    setErrorMsg(err.message || String(err));
                }
            } finally {
                setLoading(false);
            }
        }
        loadData();

        const unsubscribe = pb.collection('colaboradores').subscribe('*', function (e) {
            loadData();
        });

        return () => {
            unsubscribe.then(unsub => unsub());
        };
    }, []);

    async function handleCreateColaborador() {
        try {
            await pb.collection('colaboradores').create(newColaborador);
            setIsModalOpen(false);
            setNewColaborador({
                nome: "",
                cargo: "",
                valor_hora: 0,
                status: "Ativo",
                nivel_acesso: "Colaborador",
                modulos: ["Projetos", "Financeiro"]
            });
        } catch (err: any) {
            console.error("Error creating colaborador:", err);
            alert(`Erro ao criar colaborador: ${err.message || 'Erro desconhecido'}`);
        }
    }

    async function handleDelete(id: string) {
        if (confirm("Tem certeza que deseja excluir este colaborador?")) {
            try {
                await pb.collection('colaboradores').delete(id);
            } catch (err: any) {
                alert("Erro ao deletar: " + err.message);
            }
        }
    }

    const filteredColaboradores = colaboradores.filter(c =>
        c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.cargo.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return <div className="flex-1 bg-slate-900 flex items-center justify-center text-white">Carregando equipe...</div>;
    }

    return (
        <div className="flex-1 flex flex-col min-w-0 h-full bg-slate-900 relative">
            {errorMsg && (
                <div className="absolute top-0 left-0 right-0 bg-amber-500 text-white p-4 text-center z-50 font-mono text-sm shadow-lg">
                    Aviso: {errorMsg}
                </div>
            )}
            <header className="h-20 flex items-center justify-between px-8 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-20">
                <h2 className="text-xl font-bold text-white">Gestão de Equipe</h2>
                <div className="flex items-center gap-4">
                    <div className="relative w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                        <input
                            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                            placeholder="Buscar por nome ou cargo..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-lg shadow-blue-600/20"
                    >
                        <Plus className="w-4 h-4" />
                        Novo Colaborador
                    </button>
                </div>
            </header>

            <main className="p-8 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredColaboradores.map(colab => (
                        <div
                            key={colab.id}
                            className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-6 hover:border-slate-500 transition-all group relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                <button
                                    onClick={() => alert("Em desenvolvimento")}
                                    className="p-2 bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleDelete(colab.id)}
                                    className="p-2 bg-slate-700 rounded-lg text-rose-400 hover:bg-rose-500 hover:text-white transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-500 border border-blue-500/20">
                                    <UserCircle className="w-8 h-8" />
                                </div>
                                <div>
                                    <h3 className="text-white font-bold leading-tight">{colab.nome}</h3>
                                    <p className="text-slate-400 text-xs flex items-center gap-1 mt-1">
                                        <Briefcase className="w-3 h-3" /> {colab.cargo}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-500">Custo/Hora</span>
                                    <span className="text-slate-200 font-medium flex items-center gap-1">
                                        <BadgeDollarSign className="w-4 h-4 text-emerald-500" />
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(colab.valor_hora)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-500">Acesso</span>
                                    <span className="text-slate-200 flex items-center gap-1">
                                        {colab.nivel_acesso === 'Admin' && <ShieldAlert className="w-4 h-4 text-amber-500" />}
                                        {colab.nivel_acesso}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-500">Módulos</span>
                                    <span className="text-slate-200 text-xs text-right max-w-[150px] truncate" title={colab.modulos?.join(", ")}>
                                        {colab.modulos?.length ? colab.modulos.join(", ") : "Nenhum"}
                                    </span>
                                </div>
                            </div>

                            <div className="mt-6 pt-6 border-t border-slate-700/50 flex justify-end items-center text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                {colab.status === 'Ativo' ? (
                                    <span className="bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded border border-emerald-500/20">Ativo</span>
                                ) : (
                                    <span className="bg-slate-500/10 text-slate-400 px-2 py-0.5 rounded border border-slate-500/20">Inativo</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {filteredColaboradores.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                        <UserCircle className="w-16 h-16 mb-4 opacity-20" />
                        <p>Nenhum colaborador encontrado.</p>
                    </div>
                )}
            </main>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Cadastrar Novo Colaborador"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Nome Completo</label>
                        <input
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Ex: João Silva"
                            value={newColaborador.nome}
                            onChange={(e) => setNewColaborador({ ...newColaborador, nome: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Cargo</label>
                            <input
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="Ex: Desenvolvedor Senior"
                                value={newColaborador.cargo}
                                onChange={(e) => setNewColaborador({ ...newColaborador, cargo: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Custo Hora (R$)</label>
                            <input
                                type="number"
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="Ex: 150"
                                value={newColaborador.valor_hora || ''}
                                onChange={(e) => setNewColaborador({ ...newColaborador, valor_hora: Number(e.target.value) })}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Nível de Acesso</label>
                            <select
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-blue-500 appearance-none"
                                value={newColaborador.nivel_acesso}
                                onChange={(e) => setNewColaborador({ ...newColaborador, nivel_acesso: e.target.value })}
                            >
                                <option value="Admin">Admin</option>
                                <option value="Colaborador">Colaborador</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Status</label>
                            <select
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-blue-500 appearance-none"
                                value={newColaborador.status}
                                onChange={(e) => setNewColaborador({ ...newColaborador, status: e.target.value })}
                            >
                                <option value="Ativo">Ativo</option>
                                <option value="Inativo">Inativo</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Módulos Ativos</label>
                        <div className="flex flex-wrap gap-2">
                            {["Projetos", "Financeiro", "CRM", "Configurações"].map(mod => (
                                <label key={mod} className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 cursor-pointer hover:bg-slate-700 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={newColaborador.modulos.includes(mod)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setNewColaborador({ ...newColaborador, modulos: [...newColaborador.modulos, mod] });
                                            } else {
                                                setNewColaborador({ ...newColaborador, modulos: newColaborador.modulos.filter(m => m !== mod) });
                                            }
                                        }}
                                        className="w-4 h-4 rounded-md border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-600/50 cursor-pointer"
                                    />
                                    <span className="text-sm text-slate-300">{mod}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="pt-4 flex justify-end">
                        <button
                            onClick={handleCreateColaborador}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                        >
                            Salvar Colaborador
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

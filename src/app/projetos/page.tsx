"use client";

import { useState, useEffect } from "react";
import { Search, Plus, Play, Pause, Clock, AlertCircle, Briefcase, Activity } from "lucide-react";
import { pb } from "@/lib/pocketbase";
import { Modal } from "@/components/Modal";
import Link from "next/link";

interface Projeto {
    id: string;
    titulo: string;
    descricao: string;
    cliente: string;
    deadline: string;
    responsavel_id: string;
    status: string;
    valor_projeto?: number;
    expand?: {
        responsavel_id: {
            nome: string;
        }
    }
}

interface Colaborador {
    id: string;
    nome: string;
}

export default function Projetos() {
    const [projetos, setProjetos] = useState<Projeto[]>([]);
    const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [newProjeto, setNewProjeto] = useState({
        titulo: "",
        descricao: "",
        cliente: "",
        deadline: "",
        responsavel_id: "",
        status: "Backlog",
        horas_estimadas: 0,
        valor_projeto: 0
    });

    const [errorMsg, setErrorMsg] = useState("");

    useEffect(() => {
        async function loadData() {
            try {
                // Carregar Colaboradores para o Select
                try {
                    const colabRecords = await pb.collection('colaboradores').getFullList({ requestKey: null });
                    setColaboradores(colabRecords.map(r => ({ id: r.id, nome: r.nome })));
                } catch (e: any) {
                    if (e.status !== 404) console.warn("Aviso ao carregar colaboradores no formulário de projeto:", e);
                }

                const records = await pb.collection('projetos').getFullList<any>({
                    expand: 'responsavel_id',
                    requestKey: null
                });

                setProjetos(records.map(r => ({
                    id: r.id,
                    titulo: r.titulo,
                    descricao: r.descricao,
                    cliente: r.cliente,
                    deadline: r.deadline,
                    responsavel_id: r.responsavel_id,
                    status: r.status,
                    valor_projeto: r.valor_projeto,
                    expand: r.expand
                })));
                setErrorMsg("");
            } catch (err: any) {
                console.error("Error loading projetos:", err);
                if (err.status === 404) {
                    setErrorMsg("A coleção 'projetos' não foi encontrada. Crie-a no PocketBase.");
                } else {
                    setErrorMsg(err.message || String(err));
                }
            } finally {
                setLoading(false);
            }
        }
        loadData();

        const unsubscribe = pb.collection('projetos').subscribe('*', function (e) {
            loadData();
        });

        return () => {
            unsubscribe.then(unsub => unsub());
        };
    }, []);

    async function handleCreateProjeto() {
        try {
            await pb.collection('projetos').create(newProjeto);
            setIsModalOpen(false);
            setNewProjeto({
                titulo: "",
                descricao: "",
                cliente: "",
                deadline: "",
                responsavel_id: "",
                status: "Backlog",
                horas_estimadas: 0,
                valor_projeto: 0
            });
        } catch (err: any) {
            console.error("Error creating projeto:", err);
            alert(`Erro ao criar projeto: ${err.message || 'Erro desconhecido'}`);
        }
    }

    const filteredProjetos = projetos.filter(p =>
        p.titulo.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Em Andamento': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            case 'Concluído': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            case 'Pendente': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
            default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20'; // Backlog
        }
    };

    if (loading) {
        return <div className="flex-1 bg-slate-900 flex items-center justify-center text-white">Carregando projetos...</div>;
    }

    return (
        <div className="flex-1 flex flex-col min-w-0 h-full bg-slate-900 relative">
            {errorMsg && (
                <div className="absolute top-0 left-0 right-0 bg-amber-500 text-white p-4 text-center z-50 font-mono text-sm shadow-lg">
                    Aviso: {errorMsg}
                </div>
            )}
            <header className="h-20 flex items-center justify-between px-8 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-20">
                <h2 className="text-xl font-bold text-white">Gestão de Projetos</h2>
                <div className="flex items-center gap-4">
                    <div className="relative w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                        <input
                            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                            placeholder="Buscar projeto..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-lg shadow-blue-600/20"
                    >
                        <Plus className="w-4 h-4" />
                        Novo Projeto
                    </button>
                </div>
            </header>

            <main className="p-8 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProjetos.map(projeto => (
                        <Link href={`/projetos/${projeto.id}`} key={projeto.id}>
                            <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-6 hover:border-slate-500 hover:bg-slate-800/60 transition-all group cursor-pointer h-full flex flex-col">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-indigo-600/20 flex items-center justify-center text-indigo-500 border border-indigo-500/20">
                                        <Briefcase className="w-6 h-6" />
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(projeto.status)}`}>
                                        {projeto.status}
                                    </span>
                                </div>

                                <div className="mb-4 flex-1">
                                    <h3 className="text-lg text-white font-bold leading-tight mb-2">{projeto.titulo}</h3>
                                    <p className="text-slate-400 text-sm line-clamp-2">{projeto.descricao}</p>
                                </div>

                                <div className="space-y-3 pt-4 border-t border-slate-700/50">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Responsável</span>
                                        <span className="text-slate-200">{projeto.expand?.responsavel_id?.nome || "Não atribuído"}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Deadline</span>
                                        <span className="text-slate-200 flex items-center gap-1">
                                            <Clock className="w-3 h-3 text-amber-500" />
                                            {projeto.deadline ? new Date(projeto.deadline).toLocaleDateString('pt-BR') : 'Sem data'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {filteredProjetos.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                        <Briefcase className="w-16 h-16 mb-4 opacity-20" />
                        <p>Nenhum projeto encontrado.</p>
                    </div>
                )}
            </main>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Criar Novo Projeto"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Título do Projeto</label>
                        <input
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Ex: Landing Page Cliente X"
                            value={newProjeto.titulo}
                            onChange={(e) => setNewProjeto({ ...newProjeto, titulo: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Descrição</label>
                        <textarea
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-blue-500 min-h-[100px]"
                            placeholder="Descreva o escopo básico do projeto..."
                            value={newProjeto.descricao}
                            onChange={(e) => setNewProjeto({ ...newProjeto, descricao: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Responsável</label>
                            <select
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-blue-500 appearance-none"
                                value={newProjeto.responsavel_id}
                                onChange={(e) => setNewProjeto({ ...newProjeto, responsavel_id: e.target.value })}
                            >
                                <option value="">Selecionar...</option>
                                {colaboradores.map(c => (
                                    <option key={c.id} value={c.id}>{c.nome}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Deadline</label>
                            <input
                                type="date"
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-blue-500"
                                value={newProjeto.deadline}
                                onChange={(e) => setNewProjeto({ ...newProjeto, deadline: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Status</label>
                            <select
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-blue-500 appearance-none"
                                value={newProjeto.status}
                                onChange={(e) => setNewProjeto({ ...newProjeto, status: e.target.value })}
                            >
                                <option value="Backlog">Backlog</option>
                                <option value="Em Andamento">Em Andamento</option>
                                <option value="Pendente">Pendente</option>
                                <option value="Concluído">Concluído</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Horas Estimadas</label>
                            <input
                                type="number"
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="0"
                                value={newProjeto.horas_estimadas || ''}
                                onChange={(e) => setNewProjeto({ ...newProjeto, horas_estimadas: Number(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Valor Cobrado (R$)</label>
                            <input
                                type="number"
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="0.00"
                                value={newProjeto.valor_projeto || ''}
                                onChange={(e) => setNewProjeto({ ...newProjeto, valor_projeto: Number(e.target.value) })}
                            />
                        </div>
                    </div>
                    <div className="pt-4 flex justify-end">
                        <button
                            onClick={handleCreateProjeto}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                        >
                            Criar Projeto
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

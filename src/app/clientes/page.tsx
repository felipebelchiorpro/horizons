"use client";

import { useState, useEffect } from "react";


import { Search, Plus, Edit2, Trash2, Building2, User, Mail, Phone, Globe, Filter } from "lucide-react";
import { pb, authenticate } from "@/lib/pocketbase";
import { Modal } from "@/components/Modal";
import { ClientProfilePanel } from "@/components/ClientProfilePanel";

interface Cliente {
    id: string;
    nome: string;
    empresa: string;
    documento: string;
    responsavel: string;
    email: string;
    telefone: string;
    website?: string;
}

export default function Clientes() {
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Panel Profile state
    const [selectedCliente, setSelectedCliente] = useState<any>(null);
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    const [newCliente, setNewCliente] = useState({
        nome: "",
        empresa: "",
        documento: "",
        responsavel: "",
        email: "",
        telefone: "",
        website: ""
    });

    const [errorMsg, setErrorMsg] = useState("");

    useEffect(() => {
        async function loadData() {
            try {
                // Using SDK without the 'sort' parameter to avoid 400 errors
                const records = await pb.collection('clientes').getFullList<any>({
                    requestKey: null
                });

                setClientes(records.map(r => ({
                    id: r.id,
                    nome: r.nome,
                    empresa: r.empresa,
                    documento: r.documento,
                    responsavel: r.responsavel,
                    email: r.email,
                    telefone: r.telefone,
                    website: r.website
                })));
                setErrorMsg("");
            } catch (err: any) {
                console.error("Error loading clients:", err);
                setErrorMsg(err.message || String(err));
            } finally {
                setLoading(false);
            }
        }
        loadData();



        // Subscribe to changes
        const unsubscribe = pb.collection('clientes').subscribe('*', function (e) {
            loadData();
        });

        return () => {
            unsubscribe.then(unsub => unsub());
        };
    }, []);

    async function handleCreateCliente() {
        try {
            await pb.collection('clientes').create(newCliente);
            setIsModalOpen(false);
            setNewCliente({
                nome: "",
                empresa: "",
                documento: "",
                responsavel: "",
                email: "",
                telefone: "",
                website: ""
            });
            // Force reload to update list
            window.location.reload();
        } catch (err: any) {
            console.error("Error creating cliente DETAILED:", {
                message: err.message,
                status: err.status,
                data: err.data
            });
            alert(`Erro ao criar cliente: ${err.message || 'Erro desconhecido'}`);
        }
    }

    const filteredClientes = clientes.filter(c =>
        c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.empresa.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return <div className="flex-1 bg-slate-900 flex items-center justify-center text-white">Carregando clientes...</div>;
    }

    return (
        <div className="flex-1 flex flex-col min-w-0 h-full bg-slate-900 relative">
            {errorMsg && (
                <div className="absolute top-0 left-0 right-0 bg-red-500 text-white p-4 text-center z-50 font-mono text-sm">
                    ERRO CRÍTICO NO REACT: {errorMsg}
                </div>
            )}
            <header className="h-20 flex items-center justify-between px-8 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-20">

                <h2 className="text-xl font-bold text-white">Gestão de Clientes</h2>
                <div className="flex items-center gap-4">
                    <div className="relative w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                        <input
                            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                            placeholder="Buscar clientes ou empresas..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-lg shadow-blue-600/20"
                    >
                        <Plus className="w-4 h-4" />
                        Novo Cliente
                    </button>
                </div>
            </header>

            <main className="p-8 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredClientes.map(cliente => (
                        <div
                            key={cliente.id}
                            onClick={() => {
                                setSelectedCliente(cliente);
                                setIsProfileOpen(true);
                            }}
                            className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-6 hover:border-slate-500 transition-all group relative overflow-hidden cursor-pointer"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                <button
                                    onClick={(e) => { e.stopPropagation(); /* future edit */ }}
                                    className="p-2 bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); alert("Em desenvolvimento"); }}
                                    className="p-2 bg-slate-700 rounded-lg text-rose-400 hover:bg-rose-500 hover:text-white transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-xl bg-blue-600/20 flex items-center justify-center text-blue-500 border border-blue-500/20">
                                    <Building2 className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-white font-bold leading-tight">{cliente.empresa}</h3>
                                    <p className="text-slate-400 text-xs">{cliente.nome}</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-sm text-slate-300">
                                    <User className="w-4 h-4 text-slate-500" />
                                    <span>{cliente.responsavel}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-slate-300">
                                    <Mail className="w-4 h-4 text-slate-500" />
                                    <span className="truncate">{cliente.email}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-slate-300">
                                    <Phone className="w-4 h-4 text-slate-500" />
                                    <span>{cliente.telefone}</span>
                                </div>
                                {cliente.website && (
                                    <div className="flex items-center gap-3 text-sm text-slate-300">
                                        <Globe className="w-4 h-4 text-slate-500" />
                                        <span className="truncate">{cliente.website}</span>
                                    </div>
                                )}
                            </div>

                            <div className="mt-6 pt-6 border-t border-slate-700/50 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                <span>{cliente.documento}</span>
                                <span className="bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded border border-emerald-500/20">Ativo</span>
                            </div>
                        </div>
                    ))}
                </div>

                {filteredClientes.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                        <Building2 className="w-16 h-16 mb-4 opacity-20" />
                        <p>Nenhum cliente encontrado.</p>
                    </div>
                )}
            </main>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Cadastrar Novo Cliente"
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Empresa</label>
                            <input
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="Ex: Tech Solutions"
                                value={newCliente.empresa}
                                onChange={(e) => setNewCliente({ ...newCliente, empresa: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Nome Fantasia</label>
                            <input
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="Ex: TechSol"
                                value={newCliente.nome}
                                onChange={(e) => setNewCliente({ ...newCliente, nome: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Documento (CNPJ/CPF)</label>
                            <input
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="00.000.000/0001-00"
                                value={newCliente.documento}
                                onChange={(e) => setNewCliente({ ...newCliente, documento: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Responsável</label>
                            <input
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="Ex: Maria Souza"
                                value={newCliente.responsavel}
                                onChange={(e) => setNewCliente({ ...newCliente, responsavel: e.target.value })}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">E-mail</label>
                        <input
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="financeiro@empresa.com"
                            value={newCliente.email}
                            onChange={(e) => setNewCliente({ ...newCliente, email: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Telefone</label>
                            <input
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="(11) 99999-9999"
                                value={newCliente.telefone}
                                onChange={(e) => setNewCliente({ ...newCliente, telefone: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Website</label>
                            <input
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="www.empresa.com"
                                value={newCliente.website}
                                onChange={(e) => setNewCliente({ ...newCliente, website: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="pt-4 flex justify-end">
                        <button
                            onClick={handleCreateCliente}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                        >
                            Salvar Cliente
                        </button>
                    </div>
                </div>
            </Modal>

            <ClientProfilePanel
                isOpen={isProfileOpen}
                onClose={() => setIsProfileOpen(false)}
                cliente={selectedCliente}
            />
        </div>
    );
}

"use client";

import { useState, useEffect } from "react";
import { Search, Plus, FileText, CheckCircle2, AlertCircle, Trash2, Eye } from "lucide-react";
import { pb } from "@/lib/pocketbase";
import { Modal } from "@/components/Modal";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface OrcamentoItem {
    descricao: string;
    quantidade: number;
    valor_unitario: number;
}

interface Orcamento {
    id: string;
    cliente: string;
    documento_cliente: string;
    email_cliente: string;
    data_emissao: string;
    validade_dias: number;
    status: "Aguardando" | "Aprovado" | "Recusado";
    itens: OrcamentoItem[];
    valor_total: number;
    observacoes: string;
}

export default function Orcamentos() {
    const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const router = useRouter();

    const [newOrcamento, setNewOrcamento] = useState<Omit<Orcamento, 'id'>>({
        cliente: "",
        documento_cliente: "",
        email_cliente: "",
        data_emissao: new Date().toISOString().split('T')[0],
        validade_dias: 15,
        status: "Aguardando",
        itens: [{ descricao: "", quantidade: 1, valor_unitario: 0 }],
        valor_total: 0,
        observacoes: ""
    });

    const [errorMsg, setErrorMsg] = useState("");

    useEffect(() => {
        async function loadData() {
            try {
                const records = await pb.collection('orcamentos').getFullList<any>({
                    sort: '-created',
                    requestKey: null
                });

                setOrcamentos(records.map(r => ({
                    id: r.id,
                    cliente: r.cliente,
                    documento_cliente: r.documento_cliente,
                    email_cliente: r.email_cliente,
                    data_emissao: r.data_emissao,
                    validade_dias: r.validade_dias,
                    status: r.status,
                    itens: r.itens || [],
                    valor_total: r.valor_total,
                    observacoes: r.observacoes
                })));
                setErrorMsg("");
            } catch (err: any) {
                if (err.status === 404) {
                    console.warn("A coleção 'orcamentos' não existe no banco de dados.");
                } else {
                    setErrorMsg("Falha ao carregar os Orçamentos. Verifique sua conexão.");
                }
            } finally {
                setLoading(false);
            }
        }
        loadData();

        try {
            pb.collection('orcamentos').subscribe('*', function (e) {
                loadData();
            });
        } catch (e) { }

        return () => {
            try { pb.collection('orcamentos').unsubscribe('*'); } catch (e) { }
        };
    }, []);

    const handleAddItem = () => {
        setNewOrcamento({
            ...newOrcamento,
            itens: [...newOrcamento.itens, { descricao: "", quantidade: 1, valor_unitario: 0 }]
        });
    };

    const handleRemoveItem = (index: number) => {
        const novosItens = [...newOrcamento.itens];
        novosItens.splice(index, 1);
        setNewOrcamento({ ...newOrcamento, itens: novosItens });
        recalcTotal(novosItens);
    };

    const handleItemChange = (index: number, field: string, value: string | number) => {
        const novosItens = [...newOrcamento.itens];
        novosItens[index] = { ...novosItens[index], [field]: value };
        setNewOrcamento({ ...newOrcamento, itens: novosItens });
        if (field === 'quantidade' || field === 'valor_unitario') {
            recalcTotal(novosItens);
        }
    };

    const recalcTotal = (itens: OrcamentoItem[]) => {
        const soma = itens.reduce((acc, item) => acc + (item.quantidade * item.valor_unitario), 0);
        setNewOrcamento(prev => ({ ...prev, valor_total: soma }));
    };

    const handleCreateOrcamento = async () => {
        try {
            if (!newOrcamento.cliente) {
                alert("Preencha ao menos o Cliente.");
                return;
            }

            const dataToSend = {
                ...newOrcamento,
                data_emissao: newOrcamento.data_emissao ? new Date(newOrcamento.data_emissao).toISOString() : new Date().toISOString(),
            };

            const created = await pb.collection('orcamentos').create(dataToSend);
            setIsModalOpen(false);
            setNewOrcamento({
                cliente: "",
                documento_cliente: "",
                email_cliente: "",
                data_emissao: new Date().toISOString().split('T')[0],
                validade_dias: 15,
                status: "Aguardando",
                itens: [{ descricao: "", quantidade: 1, valor_unitario: 0 }],
                valor_total: 0,
                observacoes: ""
            });

            router.push(`/orcamentos/${created.id}`);
        } catch (err: any) {
            console.error("Erro ao criar Orçamento:", err);
            alert("Erro ao criar o Orçamento / Proposta.");
        }
    };

    const filteredOrcamentos = orcamentos.filter(o =>
        o.cliente.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusColor = (status: string) => {
        if (status === 'Aprovado') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
        if (status === 'Recusado') return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20'; // Aguardando
    };

    return (
        <div className="flex-1 flex flex-col min-w-0 h-full bg-slate-900 relative">
            <header className="h-20 flex items-center justify-between px-8 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-20">
                <h2 className="text-xl font-bold text-white flex items-center gap-3">
                    <FileText className="w-6 h-6 text-sky-500" />
                    Orçamentos / Propostas
                </h2>
                <div className="flex items-center gap-4">
                    <div className="relative w-72 hidden md:block">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                        <input
                            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-sky-500 transition-all"
                            placeholder="Buscar cliente..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-lg shadow-sky-600/20"
                    >
                        <Plus className="w-4 h-4" />
                        Novo Orçamento
                    </button>
                </div>
            </header>

            <main className="p-8 overflow-y-auto custom-scrollbar flex-1">
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-700/50 text-xs uppercase tracking-wider text-slate-500">
                                    <th className="pb-4 font-semibold px-4">Cliente / Proposta</th>
                                    <th className="pb-4 font-semibold">Valor da Proposta</th>
                                    <th className="pb-4 font-semibold">Data Emissão</th>
                                    <th className="pb-4 font-semibold">Validade</th>
                                    <th className="pb-4 font-semibold">Status</th>
                                    <th className="pb-4 font-semibold text-right px-4">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="py-8 text-center text-slate-400">Carregando propostas...</td>
                                    </tr>
                                ) : filteredOrcamentos.map(orc => {
                                    const emissao = new Date(orc.data_emissao).toLocaleDateString('pt-BR');

                                    return (
                                        <tr key={orc.id} className="border-b border-slate-700/20 hover:bg-slate-800/30 transition-colors group">
                                            <td className="py-4 px-4 text-sm">
                                                <div className="font-bold text-white mb-1 group-hover:text-sky-400 transition-colors">{orc.cliente}</div>
                                                <div className="text-xs text-slate-500">#{orc.id.toUpperCase().substring(0, 8)}</div>
                                            </td>
                                            <td className="py-4 text-sm font-medium text-slate-200">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(orc.valor_total || 0)}
                                            </td>
                                            <td className="py-4 text-sm text-slate-400">{emissao}</td>
                                            <td className="py-4 text-sm text-slate-400">{orc.validade_dias} dias</td>
                                            <td className="py-4">
                                                <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${getStatusColor(orc.status)}`}>
                                                    {orc.status}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 text-right">
                                                <Link href={`/orcamentos/${orc.id}`}>
                                                    <button className="text-slate-400 hover:text-sky-400 p-2 transition-colors">
                                                        <Eye className="w-5 h-5" />
                                                    </button>
                                                </Link>
                                            </td>
                                        </tr>
                                    )
                                })}

                                {!loading && filteredOrcamentos.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="py-16 text-center text-slate-500">
                                            <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                            Você ainda não emitiu nenhum orçamento/proposta.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nova Proposta / Orçamento" width="max-w-3xl">
                <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">

                    {/* Cabeçalho */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Cliente / Razão Social</label>
                            <input
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-sky-500"
                                placeholder="Nome Completo / Empresa"
                                value={newOrcamento.cliente}
                                onChange={(e) => setNewOrcamento({ ...newOrcamento, cliente: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">E-mail do Cliente</label>
                            <input
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-sky-500"
                                placeholder="email@empresa.com"
                                type="email"
                                value={newOrcamento.email_cliente}
                                onChange={(e) => setNewOrcamento({ ...newOrcamento, email_cliente: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Data de Emissão</label>
                            <input
                                type="date"
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-400 outline-none focus:ring-1 focus:ring-sky-500"
                                value={newOrcamento.data_emissao}
                                onChange={(e) => setNewOrcamento({ ...newOrcamento, data_emissao: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Validade (Em Dias)</label>
                            <input
                                type="number"
                                min="1"
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-sky-500"
                                value={newOrcamento.validade_dias}
                                onChange={(e) => setNewOrcamento({ ...newOrcamento, validade_dias: Number(e.target.value) })}
                            />
                        </div>
                    </div>

                    {/* Itens */}
                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-sm font-bold text-slate-300 uppercase tracking-widest">Itens / Escopo</h4>
                            <button onClick={handleAddItem} className="text-xs font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1">
                                <Plus className="w-3 h-3" /> Adicionar Item
                            </button>
                        </div>

                        <div className="space-y-3">
                            {newOrcamento.itens.map((item, idx) => (
                                <div key={idx} className="flex gap-2 items-center">
                                    <input
                                        className="flex-[2] bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-sky-500 outline-none"
                                        placeholder="Descrição do Escopo..."
                                        value={item.descricao}
                                        onChange={(e) => handleItemChange(idx, 'descricao', e.target.value)}
                                    />
                                    <div className="flex-1 right gap-2 relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">Qtd</span>
                                        <input
                                            type="number"
                                            min="1"
                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-3 py-2 text-sm text-white focus:ring-1 focus:ring-sky-500 outline-none"
                                            value={item.quantidade}
                                            onChange={(e) => handleItemChange(idx, 'quantidade', Number(e.target.value))}
                                        />
                                    </div>
                                    <div className="flex-1 relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">R$</span>
                                        <input
                                            type="number"
                                            min="0"
                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-sm text-white focus:ring-1 focus:ring-sky-500 outline-none"
                                            value={item.valor_unitario}
                                            onChange={(e) => handleItemChange(idx, 'valor_unitario', Number(e.target.value))}
                                        />
                                    </div>
                                    {newOrcamento.itens.length > 1 && (
                                        <button onClick={() => handleRemoveItem(idx)} className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-between items-center bg-sky-500/10 border border-sky-500/20 p-4 rounded-xl">
                        <span className="text-sky-400 font-bold uppercase tracking-widest text-xs">Total do Orçamento</span>
                        <span className="text-2xl font-black text-white">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(newOrcamento.valor_total)}
                        </span>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Anotações Internas ou Termos Condicionais</label>
                        <textarea
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-sky-500 min-h-[80px] text-sm"
                            placeholder="Info adicional..."
                            value={newOrcamento.observacoes}
                            onChange={(e) => setNewOrcamento({ ...newOrcamento, observacoes: e.target.value })}
                        />
                    </div>

                    <div className="pt-4 flex justify-end">
                        <button
                            onClick={handleCreateOrcamento}
                            className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-sky-600/20 active:scale-95"
                        >
                            Gerar Orçamento / Proposta
                        </button>
                    </div>

                </div>
            </Modal>

        </div>
    );
}

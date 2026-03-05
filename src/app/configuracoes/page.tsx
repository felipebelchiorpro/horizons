"use client";

import { useState, useEffect } from "react";
import {
    Settings as SettingsIcon,
    MessageSquare,
    Wallet,
    Tags,
    Save,
    Plus,
    Trash2,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Briefcase,
    BuildingIcon
} from "lucide-react";
import { pb, authenticate } from "@/lib/pocketbase";

interface ChatwootConfig {
    url: string;
    token: string;
    inboxId: string;
}

interface Category {
    id: string;
    nome: string;
    tipo: "Receita" | "Despesa";
}

interface BankAccount {
    id: string;
    nome: string;
}

interface Department {
    id: string;
    nome: string;
}

export default function Configuracoes() {
    const [loading, setLoading] = useState(true);
    const [chatwoot, setChatwoot] = useState<ChatwootConfig>({ url: "", token: "", inboxId: "" });
    const [categories, setCategories] = useState<Category[]>([]);
    const [newCategory, setNewCategory] = useState({ nome: "", tipo: "Despesa" as const });
    const [banks, setBanks] = useState<BankAccount[]>([]);
    const [newBank, setNewBank] = useState({ nome: "" });
    const [departments, setDepartments] = useState<Department[]>([]);
    const [newDepartment, setNewDepartment] = useState({ nome: "" });
    const [status, setStatus] = useState<{ type: "success" | "error", message: string } | null>(null);

    const [pricing, setPricing] = useState({
        custoFixo: "",
        custoVariavel: "",
        horasProdutivas: ""
    });

    useEffect(() => {
        async function loadSettings() {
            await authenticate();
            setLoading(true);
            try {
                // Load Chatwoot Config from 'settings' collection
                const settings = await pb.collection('settings').getFullList();
                const config: ChatwootConfig = { url: "", token: "", inboxId: "" };

                settings.forEach(s => {
                    if (s.key === 'chatwoot_url') config.url = s.value;
                    if (s.key === 'chatwoot_token') config.token = s.value;
                    if (s.key === 'chatwoot_inbox_id') config.inboxId = s.value;

                    if (s.key === 'custo_fixo_mensal') setPricing(prev => ({ ...prev, custoFixo: s.value }));
                    if (s.key === 'custo_variavel_mensal') setPricing(prev => ({ ...prev, custoVariavel: s.value }));
                    if (s.key === 'horas_produtivas_mensal') setPricing(prev => ({ ...prev, horasProdutivas: s.value }));
                });
                setChatwoot(config);

                // Load Categories
                const catRecords = await pb.collection('finance_categories').getFullList<any>();
                setCategories(catRecords.map(r => ({ id: r.id, nome: r.nome, tipo: r.tipo })));

                // Load Banks
                const bankRecords = await pb.collection('bank_accounts').getFullList<any>();
                setBanks(bankRecords.map(r => ({ id: r.id, nome: r.nome })));

                // Load Departments
                const deptRecords = await pb.collection('finance_departments').getFullList<any>();
                setDepartments(deptRecords.map(r => ({ id: r.id, nome: r.nome })));

            } catch (err) {
                console.error("Error loading settings:", err);
            } finally {
                setLoading(false);
            }
        }
        loadSettings();
    }, []);

    const saveChatwoot = async () => {
        try {
            const keys = {
                'chatwoot_url': chatwoot.url,
                'chatwoot_token': chatwoot.token,
                'chatwoot_inbox_id': chatwoot.inboxId
            };

            for (const [key, value] of Object.entries(keys)) {
                try {
                    const existing = await pb.collection('settings').getFirstListItem(`key="${key}"`);
                    await pb.collection('settings').update(existing.id, { value });
                } catch {
                    await pb.collection('settings').create({ key, value });
                }
            }
            showStatus("success", "Configurações do Chatwoot salvas!");
        } catch (err) {
            showStatus("error", "Erro ao salvar configurações.");
        }
    };

    const savePricing = async () => {
        try {
            const keys = {
                'custo_fixo_mensal': pricing.custoFixo,
                'custo_variavel_mensal': pricing.custoVariavel,
                'horas_produtivas_mensal': pricing.horasProdutivas
            };

            for (const [key, value] of Object.entries(keys)) {
                try {
                    const existing = await pb.collection('settings').getFirstListItem(`key="${key}"`);
                    await pb.collection('settings').update(existing.id, { value: value.toString() });
                } catch {
                    await pb.collection('settings').create({ key, value: value.toString() });
                }
            }
            showStatus("success", "Métricas financeiras salvas com sucesso!");
        } catch (err) {
            showStatus("error", "Erro ao salvar métricas financeiras.");
        }
    };

    const calculateHourlyRate = () => {
        const fixed = parseFloat(pricing.custoFixo) || 0;
        const variable = parseFloat(pricing.custoVariavel) || 0;
        const hours = parseFloat(pricing.horasProdutivas) || 0;

        if (hours <= 0) return 0;
        return (fixed + variable) / hours;
    };

    const addCategory = async () => {
        if (!newCategory.nome) return;
        try {
            const record = await pb.collection('finance_categories').create(newCategory);
            setCategories([...categories, { ...newCategory, id: record.id }]);
            setNewCategory({ nome: "", tipo: "Despesa" });
            showStatus("success", "Categoria adicionada!");
        } catch (err) {
            showStatus("error", "Erro ao adicionar categoria.");
        }
    };

    const deleteCategory = async (id: string) => {
        try {
            await pb.collection('finance_categories').delete(id);
            setCategories(categories.filter(c => c.id !== id));
            showStatus("success", "Categoria removida.");
        } catch (err) {
            showStatus("error", "Erro ao remover categoria.");
        }
    };

    const addBank = async () => {
        if (!newBank.nome) return;
        try {
            const record = await pb.collection('bank_accounts').create(newBank);
            setBanks([...banks, { ...newBank, id: record.id }]);
            setNewBank({ nome: "" });
            showStatus("success", "Banco adicionado!");
        } catch (err) {
            showStatus("error", "Erro ao adicionar banco.");
        }
    };

    const deleteBank = async (id: string) => {
        try {
            await pb.collection('bank_accounts').delete(id);
            setBanks(banks.filter(b => b.id !== id));
            showStatus("success", "Banco removido.");
        } catch (err) {
            showStatus("error", "Erro ao remover banco.");
        }
    };

    const addDepartment = async () => {
        if (!newDepartment.nome) return;
        try {
            const record = await pb.collection('finance_departments').create(newDepartment);
            setDepartments([...departments, { ...newDepartment, id: record.id }]);
            setNewDepartment({ nome: "" });
            showStatus("success", "Departamento adicionado!");
        } catch (err) {
            showStatus("error", "Erro ao adicionar departamento.");
        }
    };

    const deleteDepartment = async (id: string) => {
        try {
            await pb.collection('finance_departments').delete(id);
            setDepartments(departments.filter(d => d.id !== id));
            showStatus("success", "Departamento removido.");
        } catch (err) {
            showStatus("error", "Erro ao remover departamento.");
        }
    };

    const showStatus = (type: "success" | "error", message: string) => {
        setStatus({ type, message });
        setTimeout(() => setStatus(null), 3000);
    };

    if (loading) {
        return (
            <div className="flex-1 bg-slate-900 flex items-center justify-center text-white">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="flex-1 bg-slate-900 custom-scrollbar overflow-y-auto p-8 space-y-8">
            <header>
                <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                    <SettingsIcon className="w-8 h-8 text-blue-500" />
                    Configurações do Sistema
                </h2>
                <p className="text-slate-400 mt-2">Personalize o comportamento do seu CRM e conexões externas.</p>
            </header>

            {status && (
                <div className={`fixed top-8 right-8 z-50 flex items-center gap-3 px-6 py-4 rounded-xl border animate-in slide-in-from-right-10 duration-300 ${status.type === "success" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                    }`}>
                    {status.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    <span className="font-bold text-sm tracking-wide">{status.message}</span>
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* Chatwoot Section */}
                <section className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 p-6 rounded-2xl space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-700/50 pb-4">
                        <MessageSquare className="w-6 h-6 text-blue-500" />
                        <h3 className="text-xl font-bold text-white tracking-tight">Integração WhatsApp (Chatwoot)</h3>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-2">URL da Instância API</label>
                            <input
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 px-4 text-white focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600"
                                placeholder="https://chat.seudominio.com"
                                value={chatwoot.url}
                                onChange={(e) => setChatwoot({ ...chatwoot, url: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-2">Access Token</label>
                            <input
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 px-4 text-white focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600"
                                type="password"
                                placeholder="Token gerado no Chatwoot"
                                value={chatwoot.token}
                                onChange={(e) => setChatwoot({ ...chatwoot, token: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-2">Inbox ID</label>
                            <input
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 px-4 text-white focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600"
                                placeholder="ID da caixa de entrada do Zap"
                                value={chatwoot.inboxId}
                                onChange={(e) => setChatwoot({ ...chatwoot, inboxId: e.target.value })}
                            />
                        </div>
                    </div>

                    <button
                        onClick={saveChatwoot}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-blue-500/10"
                    >
                        <Save className="w-5 h-5" />
                        Salvar Conexão Chatwoot
                    </button>
                    <p className="text-[10px] text-slate-500 text-center italic">Necessário para automação de faturas e boas-vindas.</p>
                </section>

                {/* Categories Section */}
                <section className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 p-6 rounded-2xl space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-700/50 pb-4">
                        <Tags className="w-6 h-6 text-emerald-500" />
                        <h3 className="text-xl font-bold text-white tracking-tight">Categorias Financeiras</h3>
                    </div>

                    <div className="flex gap-2">
                        <input
                            className="flex-1 bg-slate-900/50 border border-slate-700 rounded-xl py-3 px-4 text-white focus:ring-1 focus:ring-blue-500 outline-none text-sm"
                            placeholder="Nova categoria..."
                            value={newCategory.nome}
                            onChange={(e) => setNewCategory({ ...newCategory, nome: e.target.value })}
                        />
                        <select
                            className="bg-slate-900/50 border border-slate-700 rounded-xl px-4 text-white text-xs font-bold outline-none border-r-8 border-transparent"
                            value={newCategory.tipo}
                            onChange={(e) => setNewCategory({ ...newCategory, tipo: e.target.value as any })}
                        >
                            <option value="Despesa">Saída</option>
                            <option value="Receita">Entrada</option>
                        </select>
                        <button
                            onClick={addCategory}
                            className="p-3 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl transition-all active:scale-[0.9]"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                        {categories.map(c => (
                            <div key={c.id} className="flex justify-between items-center bg-slate-900/40 p-3 rounded-xl border border-slate-700/30 group">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${c.tipo === 'Receita' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                    <span className="text-sm font-medium text-slate-200">{c.nome}</span>
                                    <span className={`text-[8px] uppercase font-bold px-1.5 rounded ${c.tipo === 'Receita' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                        {c.tipo === 'Receita' ? 'Entr' : 'Saíd'}
                                    </span>
                                </div>
                                <button
                                    onClick={() => deleteCategory(c.id)}
                                    className="text-slate-600 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Bank Accounts Section */}
                <section className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 p-6 rounded-2xl space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-700/50 pb-4">
                        <Wallet className="w-6 h-6 text-amber-500" />
                        <h3 className="text-xl font-bold text-white tracking-tight">Minhas Contas / Bancos</h3>
                    </div>

                    <div className="flex gap-2">
                        <input
                            className="flex-1 bg-slate-900/50 border border-slate-700 rounded-xl py-3 px-4 text-white focus:ring-1 focus:ring-blue-500 outline-none text-sm"
                            placeholder="Nome do Banco..."
                            value={newBank.nome}
                            onChange={(e) => setNewBank({ ...newBank, nome: e.target.value })}
                        />
                        <button
                            onClick={addBank}
                            className="p-3 bg-amber-500 hover:bg-amber-400 text-white rounded-xl transition-all active:scale-[0.9]"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="space-y-3">
                        {banks.map(b => (
                            <div key={b.id} className="flex justify-between items-center bg-slate-900/40 p-4 rounded-xl border border-slate-700/30 group">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center border border-slate-700/50">
                                        <Wallet className="w-4 h-4 text-slate-400" />
                                    </div>
                                    <span className="text-sm font-bold text-slate-200 tracking-wide">{b.nome}</span>
                                </div>
                                <button
                                    onClick={() => deleteBank(b.id)}
                                    className="text-slate-600 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Departments Section */}
                <section className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 p-6 rounded-2xl space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-700/50 pb-4">
                        <BuildingIcon className="w-6 h-6 text-purple-500" />
                        <h3 className="text-xl font-bold text-white tracking-tight">Departamentos Operacionais</h3>
                    </div>

                    <div className="flex gap-2">
                        <input
                            className="flex-1 bg-slate-900/50 border border-slate-700 rounded-xl py-3 px-4 text-white focus:ring-1 focus:ring-blue-500 outline-none text-sm"
                            placeholder="Nome do Departamento..."
                            value={newDepartment.nome}
                            onChange={(e) => setNewDepartment({ ...newDepartment, nome: e.target.value })}
                        />
                        <button
                            onClick={addDepartment}
                            className="p-3 bg-purple-500 hover:bg-purple-400 text-white rounded-xl transition-all active:scale-[0.9]"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                        {departments.map(d => (
                            <div key={d.id} className="flex justify-between items-center bg-slate-900/40 p-4 rounded-xl border border-slate-700/30 group">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center border border-slate-700/50 text-purple-500 font-bold uppercase text-[10px]">
                                        {d.nome.substring(0, 2)}
                                    </div>
                                    <span className="text-sm font-bold text-slate-200 tracking-wide">{d.nome}</span>
                                </div>
                                <button
                                    onClick={() => deleteDepartment(d.id)}
                                    className="text-slate-600 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Pricing / Costs Section */}
                <section className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 p-6 rounded-2xl space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-700/50 pb-4">
                        <Briefcase className="w-6 h-6 text-indigo-500" />
                        <h3 className="text-xl font-bold text-white tracking-tight">Custos Operacionais e Precificação</h3>
                    </div>

                    <p className="text-slate-400 text-sm">
                        Defina seus custos mensais da empresa para calcular automaticamente o valor mínimo sugerido da sua hora para projetos.
                    </p>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-2">Custos Fixos Mensais (R$)</label>
                                <input
                                    type="number"
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 px-4 text-white focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600"
                                    placeholder="Ex: 5000"
                                    value={pricing.custoFixo}
                                    onChange={(e) => setPricing({ ...pricing, custoFixo: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-2">Custos Variáveis Mensais (R$)</label>
                                <input
                                    type="number"
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 px-4 text-white focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600"
                                    placeholder="Ex: 1500"
                                    value={pricing.custoVariavel}
                                    onChange={(e) => setPricing({ ...pricing, custoVariavel: e.target.value })}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-2">Horas Produtivas / Mês da Equipe</label>
                            <input
                                type="number"
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 px-4 text-white focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600"
                                placeholder="Ex: 160"
                                value={pricing.horasProdutivas}
                                onChange={(e) => setPricing({ ...pricing, horasProdutivas: e.target.value })}
                            />
                        </div>

                        <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl flex items-center justify-between mt-6">
                            <div>
                                <p className="text-indigo-400 text-xs font-bold uppercase tracking-widest">Custo da Hora Sugerido</p>
                                <p className="text-[10px] text-slate-400">Ponto de equilíbrio por hora</p>
                            </div>
                            <div className="text-2xl font-black text-white">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calculateHourlyRate())}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={savePricing}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-indigo-500/10"
                    >
                        <Save className="w-5 h-5" />
                        Salvar Custos e Precisificação
                    </button>
                </section>

                {/* System Stats Section (Simple filler for now) */}
                <section className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-2xl flex flex-col justify-between relative overflow-hidden shadow-2xl shadow-blue-500/20">
                    <div className="relative z-10">
                        <h3 className="text-2xl font-bold text-white tracking-tight">Horizons Premium</h3>
                        <p className="text-blue-100/80 text-sm mt-2 max-w-[80%]">Sua conta está ativa e sincronizada. Todas as automações baseadas em eventos do PocketBase estão em modo de escuta ativa.</p>
                    </div>
                    <div className="flex items-center gap-4 relative z-10 mt-8">
                        <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/10 uppercase font-black text-xs text-white tracking-widest">Ativo</div>
                        <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/10 uppercase font-black text-xs text-white tracking-widest">Sincronizado</div>
                    </div>

                    <SettingsIcon className="absolute -bottom-8 -right-8 w-48 h-48 text-white/5 rotate-12" />
                </section>
            </div>
        </div>
    );
}

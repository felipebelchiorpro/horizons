"use client";

import { Calendar, Download, TrendingUp, Wallet, Flame, Timer, Search, SlidersHorizontal, CheckCircle, Clock, XCircle, ChevronRight, Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { pb, authenticate } from "@/lib/pocketbase";
import { Modal } from "@/components/Modal";

interface Transaction {
    id: string;
    data: string;
    descricao: string;
    categoria: string;
    conta: string;
    departamento?: string;
    valor: string;
    status: string;
    tipo: 'Entrada' | 'Saída';
}

export default function FluxoCaixa() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [banks, setBanks] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newTransaction, setNewTransaction] = useState({
        descricao: "",
        valor: "",
        categoria: "",
        conta: "",
        departamento: "",
        tipo: "Entrada",
        status: "Pendente",
        data: new Date().toISOString().split('T')[0]
    });
    const [viewType, setViewType] = useState<'mensal' | 'anual'>('anual');

    useEffect(() => {
        async function loadData() {
            await authenticate();
            try {
                // Fetch Categories
                const catRecords = await pb.collection('finance_categories').getFullList({ sort: 'nome' });
                setCategories(catRecords);

                // Fetch Banks
                const bankRecords = await pb.collection('bank_accounts').getFullList({ sort: 'nome' });
                setBanks(bankRecords);

                // Fetch Departments
                const deptRecords = await pb.collection('finance_departments').getFullList({ sort: 'nome' });
                setDepartments(deptRecords);

                // Set initial values for new transaction if data exists
                if (catRecords.length > 0 && bankRecords.length > 0) {
                    setNewTransaction(prev => ({
                        ...prev,
                        categoria: catRecords[0].nome,
                        conta: bankRecords[0].nome,
                        departamento: deptRecords.length > 0 ? deptRecords[0].nome : ""
                    }));
                }

                // Fetch Transactions
                try {
                    const records = await pb.collection('transactions').getFullList<any>({ requestKey: null });
                    setTransactions(records.map(r => ({
                        id: r.id,
                        data: r.data,
                        descricao: r.descricao,
                        categoria: r.categoria,
                        conta: r.conta,
                        valor: r.valor,
                        status: r.status,
                        tipo: r.tipo
                    })));
                } catch (e) {
                    console.error("Error fetching transactions:", e);
                }
            } catch (err) {
                console.error('Error loading data auth:', err);
            } finally {
                setLoading(false);
            }
        }
        loadData();

        // Subscribe to changes
        const unsubscribe = pb.collection('transactions').subscribe('*', () => loadData());
        const unsubCat = pb.collection('finance_categories').subscribe('*', () => loadData());
        const unsubBank = pb.collection('bank_accounts').subscribe('*', () => loadData());
        const unsubDept = pb.collection('finance_departments').subscribe('*', () => loadData());

        return () => {
            unsubscribe.then(u => u());
            unsubCat.then(u => u());
            unsubBank.then(u => u());
            unsubDept.then(u => u());
        };
    }, []);

    async function handleCreateTransaction() {
        if (!newTransaction.categoria || !newTransaction.conta) {
            alert("Por favor, selecione uma categoria e uma conta.");
            return;
        }
        try {
            await pb.collection('transactions').create(newTransaction);
            setIsModalOpen(false);
            setNewTransaction({
                descricao: "",
                valor: "",
                categoria: categories[0]?.nome || "",
                conta: banks[0]?.nome || "",
                departamento: departments[0]?.nome || "",
                tipo: "Entrada",
                status: "Pendente",
                data: new Date().toISOString().split('T')[0]
            });
        } catch (err) {
            console.error("Error creating transaction:", err);
            alert("Erro ao criar transação.");
        }
    }

    if (loading) {
        return <div className="flex-1 bg-slate-900 flex items-center justify-center text-white">Carregando fluxo de caixa...</div>;
    }

    // --- Helper Functions for Data Processing ---
    const getChartData = () => {
        const now = new Date();
        if (viewType === 'anual') {
            const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
            const last6Months = [];
            for (let i = 5; i >= 0; i--) {
                const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const month = date.getMonth();
                const year = date.getFullYear();

                const monthTransactions = transactions.filter(t => {
                    const tDate = new Date(t.data);
                    return tDate.getMonth() === month && tDate.getFullYear() === year;
                });

                const total = monthTransactions.reduce((acc, t) => {
                    const value = parseFloat(t.valor.replace(/[^\d.,]/g, '').replace(',', '.'));
                    return acc + (t.tipo === 'Entrada' ? value : -value);
                }, 0);

                last6Months.push({
                    label: months[month],
                    realized: total,
                    projected: total * 1.1 // Mock projection for now
                });
            }
            return last6Months;
        } else {
            // Mensal: Group by weeks or 5-day intervals for the current month
            const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            const segments = 6;
            const size = Math.ceil(daysInMonth / segments);
            const data = [];

            for (let i = 0; i < segments; i++) {
                const startDay = i * size + 1;
                const endDay = Math.min((i + 1) * size, daysInMonth);

                const segmentTransactions = transactions.filter(t => {
                    const tDate = new Date(t.data);
                    return tDate.getMonth() === now.getMonth() &&
                        tDate.getFullYear() === now.getFullYear() &&
                        tDate.getDate() >= startDay && tDate.getDate() <= endDay;
                });

                const total = segmentTransactions.reduce((acc, t) => {
                    const value = parseFloat(t.valor.replace(/[^\d.,]/g, '').replace(',', '.'));
                    return acc + (t.tipo === 'Entrada' ? value : -value);
                }, 0);

                data.push({
                    label: `${startDay}-${endDay}`,
                    realized: total,
                    projected: total * 1.05
                });
            }
            return data;
        }
    };

    const chartData = getChartData();

    // Calculate KPIs
    const totalBalance = transactions.reduce((acc, t) => {
        const value = parseFloat(t.valor.replace(/[^\d.,]/g, '').replace(',', '.'));
        return acc + (t.tipo === 'Entrada' ? value : -value);
    }, 0);

    const monthlyExpenses = transactions
        .filter(t => t.tipo === 'Saída')
        .reduce((acc, t) => acc + parseFloat(t.valor.replace(/[^\d.,]/g, '').replace(',', '.')), 0);

    // Simple average burn rate: total expenses / number of months with transactions
    const uniqueMonths = new Set(transactions.map(t => t.data.substring(0, 7)));
    const burnRate = uniqueMonths.size > 0 ? monthlyExpenses / uniqueMonths.size : 0;
    const runway = burnRate > 0 ? totalBalance / burnRate : (totalBalance > 0 ? 99 : 0);

    // SVG scaling helper
    const maxVal = Math.max(...chartData.map(d => Math.abs(d.realized)), ...chartData.map(d => Math.abs(d.projected)), 1000);
    const scaleY = (val: number) => {
        const height = 150;
        const baseline = 100; // Middle y-coordinate
        return baseline - (val / maxVal) * 80;
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar bg-slate-900">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-slate-900/40 backdrop-blur-md border-b border-slate-800 px-8 py-5 flex items-center justify-between">
                <div>
                    <nav className="flex text-xs text-slate-500 gap-2 mb-1">
                        <a className="hover:text-blue-500 transition-colors" href="#">Home</a>
                        <span>/</span>
                        <a className="hover:text-blue-500 transition-colors" href="#">Financeiro</a>
                        <span>/</span>
                        <span className="text-slate-300">Fluxo de Caixa Avançado</span>
                    </nav>
                    <h1 className="text-2xl font-bold tracking-tight text-white">Fluxo de Caixa Avançado</h1>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-slate-800/50 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-700/50">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span className="text-xs font-medium text-slate-300">Jan 2024 - Jun 2024</span>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-emerald-600 text-white text-xs font-bold px-4 py-2.5 rounded-lg hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/20 mr-2"
                    >
                        <Plus className="w-4 h-4" />
                        Nova Transação
                    </button>
                    <button className="bg-blue-600 text-white text-xs font-bold px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20">
                        <Download className="w-4 h-4" />
                        Exportar PDF
                    </button>
                </div>
            </header>

            <div className="p-8 space-y-6">
                {/* Top Row: Chart and Side KPIs */}
                <div className="grid grid-cols-12 gap-6">
                    {/* Main Chart */}
                    <div className="col-span-12 lg:col-span-8 bg-slate-800/30 border border-slate-800 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-6">
                                <div>
                                    <h3 className="font-bold text-lg text-white">Fluxo de Caixa</h3>
                                    <p className="text-sm text-slate-400 mt-1">
                                        {viewType === 'anual' ? 'Análise de performance dos últimos 6 meses' : 'Análise detalhada do mês atual'}
                                    </p>
                                </div>
                                <div className="flex p-1 bg-slate-900/50 rounded-lg border border-slate-700/50">
                                    <button
                                        onClick={() => setViewType('mensal')}
                                        className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${viewType === 'mensal' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                    >
                                        Mensal
                                    </button>
                                    <button
                                        onClick={() => setViewType('anual')}
                                        className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${viewType === 'anual' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                    >
                                        Anual
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 border border-slate-700/50 bg-slate-900/50 px-4 py-2 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
                                    <span className="text-xs font-medium text-slate-400">Projetado</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                                    <span className="text-xs font-medium text-emerald-400">Realizado</span>
                                </div>
                            </div>
                        </div>
                        <div className="h-64 w-full pt-4">
                            {/* Area Chart Visualization */}
                            <svg className="w-full h-full overflow-visible" viewBox="0 0 800 200">
                                <defs>
                                    <linearGradient id="emerald-gradient" x1="0" x2="0" y1="0" y2="1">
                                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.4"></stop>
                                        <stop offset="100%" stopColor="transparent" stopOpacity="0"></stop>
                                    </linearGradient>
                                </defs>

                                {/* Grid lines */}
                                {[0, 50, 100, 150, 200].map((y) => (
                                    <line key={y} strokeWidth="1" className="text-slate-800" stroke="currentColor" x1="0" x2="800" y1={y} y2={y} />
                                ))}

                                {chartData.length > 0 && (
                                    <>
                                        {/* Projected Path (Dashed) */}
                                        <path
                                            d={`M ${chartData.map((d, i) => `${(i * 800) / (chartData.length - 1)},${scaleY(d.projected)}`).join(' L ')}`}
                                            fill="none"
                                            stroke="#64748b"
                                            strokeDasharray="4"
                                            strokeWidth="2"
                                            className="transition-all duration-500"
                                        />

                                        {/* Realized Area */}
                                        <path
                                            d={`M ${chartData.map((d, i) => `${(i * 800) / (chartData.length - 1)},${scaleY(d.realized)}`).join(' L ')} L 800,200 L 0,200 Z`}
                                            fill="url(#emerald-gradient)"
                                            className="transition-all duration-500"
                                        />

                                        {/* Realized Path */}
                                        <path
                                            d={`M ${chartData.map((d, i) => `${(i * 800) / (chartData.length - 1)},${scaleY(d.realized)}`).join(' L ')}`}
                                            fill="none"
                                            stroke="#10b981"
                                            strokeWidth="3"
                                            className="transition-all duration-500"
                                        />

                                        {/* Data points */}
                                        {chartData.map((d, i) => (
                                            <circle
                                                key={i}
                                                cx={(i * 800) / (chartData.length - 1)}
                                                cy={scaleY(d.realized)}
                                                r="4"
                                                fill="#10b981"
                                                className="shadow-xl"
                                            />
                                        ))}
                                    </>
                                )}
                            </svg>
                            <div className="flex justify-between mt-4 px-2">
                                {chartData.map((d, i) => (
                                    <span key={i} className="text-xs font-medium text-slate-500">{d.label}</span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Side KPIs */}
                    <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
                        <div className="flex-1 bg-slate-800/30 border border-slate-800 rounded-xl p-5 flex flex-col justify-between hover:border-slate-700 transition-colors">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Liquidez Corrente</span>
                                <div className="p-1.5 bg-emerald-500/10 rounded-lg">
                                    <Wallet className="w-5 h-5 text-emerald-500" />
                                </div>
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-white mt-4">R$ {totalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                <p className="text-xs font-medium text-emerald-500 flex items-center gap-1 mt-2">
                                    <TrendingUp className="w-3.5 h-3.5" />
                                    {totalBalance >= 0 ? '+' : ''}Saldo Atual
                                </p>
                            </div>
                        </div>

                        <div className="flex-1 bg-slate-800/30 border border-slate-800 rounded-xl p-5 flex flex-col justify-between hover:border-slate-700 transition-colors">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Burn Rate Médio</span>
                                <div className="p-1.5 bg-red-500/10 rounded-lg">
                                    <Flame className="w-5 h-5 text-red-500" />
                                </div>
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-white mt-4">R$ {burnRate.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                <p className="text-xs font-medium text-slate-500 mt-2">Média mensal de saídas</p>
                            </div>
                        </div>

                        <div className="flex-1 bg-blue-900/20 border border-blue-800/40 rounded-xl p-5 flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-blue-200 uppercase tracking-widest">Runway Estimado</span>
                                <div className="p-1.5 bg-blue-500/20 rounded-lg">
                                    <Timer className="w-5 h-5 text-blue-400" />
                                </div>
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-white mt-4">{runway === 99 ? '∞' : Math.floor(runway)} meses</p>
                                <div className="w-full bg-blue-950/50 rounded-full h-2 mt-3 overflow-hidden border border-blue-900/50">
                                    <div className="bg-blue-500 h-full rounded-full relative" style={{ width: `${Math.min(100, (runway / 12) * 100)}%` }}>
                                        <div className="absolute inset-0 bg-white/20" style={{ backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,0.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.15) 75%, transparent 75%, transparent)', backgroundSize: '1rem 1rem' }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Middle Row: Donut Charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Revenue by Category */}
                    <div className="bg-slate-800/30 border border-slate-800 rounded-xl p-6">
                        <h3 className="font-bold text-base text-white mb-6">Receitas por Categoria</h3>
                        <div className="flex items-center gap-8">
                            <div className="relative w-32 h-32 flex-shrink-0">
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                    <path className="text-slate-800" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3"></path>
                                    <path className="text-emerald-500" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray="45, 100" strokeLinecap="round" strokeWidth="4"></path>
                                    <path className="text-blue-500" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray="30, 100" strokeDashoffset="-45" strokeLinecap="round" strokeWidth="4"></path>
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total</span>
                                    <span className="text-sm font-bold text-white">100%</span>
                                </div>
                            </div>
                            <div className="flex-1 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                                        <span className="text-sm font-medium text-slate-300">Consultoria</span>
                                    </div>
                                    <span className="text-sm font-bold text-white">45%</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                                        <span className="text-sm font-medium text-slate-300">SaaS</span>
                                    </div>
                                    <span className="text-sm font-bold text-white">0%</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="w-2.5 h-2.5 rounded-full bg-slate-600"></span>
                                        <span className="text-sm font-medium text-slate-300">Implementação</span>
                                    </div>
                                    <span className="text-sm font-bold text-white">0%</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Expenses by Department */}
                    <div className="bg-slate-800/30 border border-slate-800 rounded-xl p-6">
                        <h3 className="font-bold text-base text-white mb-6">Despesas por Departamento</h3>
                        <div className="flex items-center gap-8">
                            <div className="relative w-32 h-32 flex-shrink-0">
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                    <path className="text-slate-800" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3"></path>
                                    <path className="text-red-500" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray="0, 100" strokeLinecap="round" strokeWidth="4"></path>
                                    <path className="text-yellow-500" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray="0, 100" strokeDashoffset="-0" strokeLinecap="round" strokeWidth="4"></path>
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total</span>
                                    <span className="text-sm font-bold text-white">0%</span>
                                </div>
                            </div>
                            <div className="flex-1 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                                        <span className="text-sm font-medium text-slate-300">Operações</span>
                                    </div>
                                    <span className="text-sm font-bold text-white">0%</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
                                        <span className="text-sm font-medium text-slate-300">Marketing</span>
                                    </div>
                                    <span className="text-sm font-bold text-white">0%</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="w-2.5 h-2.5 rounded-full bg-slate-600"></span>
                                        <span className="text-sm font-medium text-slate-300">Recursos Humanos</span>
                                    </div>
                                    <span className="text-sm font-bold text-white">0%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Row: Transaction Ledger */}
                <div className="bg-slate-800/30 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-800/20">
                        <h3 className="font-bold text-lg text-white">Livro de Transações</h3>
                        <div className="flex gap-3">
                            <label className="relative flex items-center">
                                <Search className="absolute left-3 w-4 h-4 text-slate-500" />
                                <input className="bg-slate-900/50 border border-slate-700/50 text-slate-200 text-sm rounded-lg pl-9 pr-4 py-2 focus:ring-1 focus:ring-blue-500 w-64 outline-none placeholder:text-slate-500 transition-all" placeholder="Filtrar transações..." type="text" />
                            </label>
                            <button className="bg-slate-800 border border-slate-700/50 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-all">
                                <SlidersHorizontal className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse whitespace-nowrap">
                            <thead>
                                <tr className="bg-slate-900/50 text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                                    <th className="px-6 py-4">Data</th>
                                    <th className="px-6 py-4">Descrição</th>
                                    <th className="px-6 py-4">Categoria</th>
                                    <th className="px-6 py-4">Conta</th>
                                    <th className="px-6 py-4 text-right">Valor</th>
                                    <th className="px-6 py-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800 text-slate-300">
                                {transactions.map((t) => (
                                    <tr key={t.id} className="hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4 text-xs">{t.data}</td>
                                        <td className="px-6 py-4 font-medium text-slate-200">{t.descricao}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider
                                                ${t.tipo === 'Entrada' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                                {t.categoria}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">{t.conta}</td>
                                        <td className={`px-6 py-4 text-right font-medium ${t.tipo === 'Entrada' ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {t.valor}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className={`flex items-center gap-1.5 ${t.status === 'Concluída' ? 'text-emerald-500' :
                                                t.status === 'Pendente' ? 'text-amber-500' : 'text-red-500'
                                                }`}>
                                                {t.status === 'Concluída' && <CheckCircle className="w-4 h-4" />}
                                                {t.status === 'Pendente' && <Clock className="w-4 h-4" />}
                                                {t.status === 'Cancelada' && <XCircle className="w-4 h-4" />}
                                                <span className="text-xs font-medium">{t.status}</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {transactions.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-10 text-center text-slate-500 font-medium">
                                            Nenhuma transação registrada.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-800/20">
                        <p className="text-xs text-slate-500 font-medium">Mostrando {transactions.length} transações</p>
                        <div className="flex items-center gap-1 border border-slate-700/50 rounded-lg overflow-hidden">
                            <button className="bg-slate-800 p-1.5 text-slate-500 hover:text-white hover:bg-slate-700 transition-all disabled:opacity-30" disabled>
                                <ChevronRight className="w-4 h-4 rotate-180" />
                            </button>
                            <div className="px-3 text-xs font-medium text-white border-l border-r border-slate-700/50 bg-slate-800/50 h-full flex items-center">
                                1
                            </div>
                            <button className="bg-slate-800 p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 transition-all">
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Nova Transação Financeira"
            >
                <div className="space-y-4">
                    <div className="flex gap-4 p-1 bg-slate-800 rounded-xl mb-4">
                        <button
                            onClick={() => setNewTransaction({ ...newTransaction, tipo: "Entrada" })}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${newTransaction.tipo === 'Entrada' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >
                            Entrada
                        </button>
                        <button
                            onClick={() => setNewTransaction({ ...newTransaction, tipo: "Saída" })}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${newTransaction.tipo === 'Saída' ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >
                            Saída
                        </button>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Descrição</label>
                        <input
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Ex: Pagamento Fornecedor Cloud"
                            value={newTransaction.descricao}
                            onChange={(e) => setNewTransaction({ ...newTransaction, descricao: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Valor (R$)</label>
                            <input
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                                placeholder="0,00"
                                value={newTransaction.valor}
                                onChange={(e) => setNewTransaction({ ...newTransaction, valor: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Data</label>
                            <input
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-blue-500"
                                type="date"
                                value={newTransaction.data}
                                onChange={(e) => setNewTransaction({ ...newTransaction, data: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Categoria</label>
                            <select
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-blue-500 appearance-none"
                                value={newTransaction.categoria}
                                onChange={(e) => setNewTransaction({ ...newTransaction, categoria: e.target.value })}
                            >
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.nome}>{cat.nome}</option>
                                ))}
                                {categories.length === 0 && <option value="">Nenhuma categoria cadastrada</option>}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Conta/Banco</label>
                            <select
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-blue-500 appearance-none"
                                value={newTransaction.conta}
                                onChange={(e) => setNewTransaction({ ...newTransaction, conta: e.target.value })}
                            >
                                {banks.map(bank => (
                                    <option key={bank.id} value={bank.nome}>{bank.nome}</option>
                                ))}
                                {banks.length === 0 && <option value="">Nenhum banco cadastrado</option>}
                            </select>
                        </div>
                    </div>
                    {newTransaction.tipo === "Saída" && (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Departamento de Custo</label>
                            <select
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-blue-500 appearance-none"
                                value={newTransaction.departamento}
                                onChange={(e) => setNewTransaction({ ...newTransaction, departamento: e.target.value })}
                            >
                                <option value="">Não Atrelado / Geral</option>
                                {departments.map(d => (
                                    <option key={d.id} value={d.nome}>{d.nome}</option>
                                ))}
                                {departments.length === 0 && <option value="">Nenhum departamento cadastrado</option>}
                            </select>
                        </div>
                    )}
                    <div className="pt-4 flex justify-end">
                        <button
                            onClick={handleCreateTransaction}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-95 w-full"
                        >
                            Salvar Transação
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

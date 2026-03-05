"use client";

import { useState, useEffect } from "react";
import { Target, Plus, ChevronRight, CheckCircle2, CircleDashed, BarChart3, Edit3, Trash2 } from "lucide-react";
import { pb } from "@/lib/pocketbase";
import { Modal } from "@/components/Modal";

interface KeyResult {
    id: string; // identificador unico local
    titulo: string;
    valor_atual: number;
    valor_alvo: number;
    unidade: string;
}

interface Objetivo {
    id: string;
    titulo: string;
    descricao: string;
    ano_trimestre: string;
    key_results: KeyResult[];
    progresso: number;
    status: "Em Andamento" | "Concluído" | "Pausado";
}

export default function Estrategia() {
    const [objetivos, setObjetivos] = useState<Objetivo[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Filter
    const [trimestreFiltro, setTrimestreFiltro] = useState("Q1 2026");

    // Novo Objetivo
    const generateLocalId = () => Math.random().toString(36).substring(2, 9);

    const [newObjetivo, setNewObjetivo] = useState<Omit<Objetivo, 'id'>>({
        titulo: "",
        descricao: "",
        ano_trimestre: "Q1 2026",
        key_results: [],
        progresso: 0,
        status: "Em Andamento"
    });

    const [activeTab, setActiveTab] = useState('Em Andamento'); // "Em Andamento" | "Concluído"

    useEffect(() => {
        async function loadData() {
            try {
                const records = await pb.collection('objetivos_okr').getFullList<any>({
                    sort: '-created',
                    requestKey: null
                });

                // Calculando o progresso dinamicamente
                const loadedObjetivos = records.map(r => {
                    const krs: KeyResult[] = r.key_results || [];
                    let totalProgress = 0;
                    if (krs.length > 0) {
                        const totalPct = krs.reduce((acc, kr) => {
                            if (kr.valor_alvo === 0) return acc;
                            return acc + Math.min(100, (kr.valor_atual / Math.max(0.0001, kr.valor_alvo)) * 100);
                        }, 0);
                        totalProgress = Math.round(totalPct / krs.length);
                    }

                    return {
                        id: r.id,
                        titulo: r.titulo,
                        descricao: r.descricao,
                        ano_trimestre: r.ano_trimestre,
                        key_results: krs,
                        progresso: totalProgress,
                        status: r.status
                    };
                });

                setObjetivos(loadedObjetivos);
            } catch (err: any) {
                console.warn("A coleção 'objetivos_okr' talvez não exista ou não foi carregada ainda.", err);
            } finally {
                setLoading(false);
            }
        }
        loadData();

        try {
            pb.collection('objetivos_okr').subscribe('*', function (e) {
                loadData();
            });
        } catch (e) { }

        return () => {
            try { pb.collection('objetivos_okr').unsubscribe('*'); } catch (e) { }
        };
    }, []);

    const handleCreateObjective = async () => {
        if (!newObjetivo.titulo) {
            alert("Preencha o título do objetivo.");
            return;
        }

        try {
            await pb.collection('objetivos_okr').create(newObjetivo);
            setIsModalOpen(false);
            setNewObjetivo({
                titulo: "",
                descricao: "",
                ano_trimestre: trimestreFiltro,
                key_results: [],
                progresso: 0,
                status: "Em Andamento"
            });
        } catch (err) {
            console.error("Erro ao criar objetivo:", err);
            alert("Erro ao criar o Objetivo.");
        }
    };

    const handleDeleteObjective = async (id: string) => {
        if (confirm("Deseja realmente excluir este Objetivo e todos seus KRs?")) {
            try {
                await pb.collection('objetivos_okr').delete(id);
            } catch (e) {
                alert("Erro ao deletar objetivo.");
            }
        }
    };

    const handleUpdateKR = async (objId: string, krId: string, novoValorAtual: number) => {
        try {
            const obj = objetivos.find(o => o.id === objId);
            if (!obj) return;

            const updatedKRs = obj.key_results.map(kr => {
                if (kr.id === krId) {
                    return { ...kr, valor_atual: novoValorAtual };
                }
                return kr;
            });

            await pb.collection('objetivos_okr').update(objId, { key_results: updatedKRs });
        } catch (e) {
            console.error("Erro ao atualizar KR:", e);
        }
    };

    const handleAddKRModal = () => {
        setNewObjetivo({
            ...newObjetivo,
            key_results: [...newObjetivo.key_results, { id: generateLocalId(), titulo: "", valor_atual: 0, valor_alvo: 100, unidade: "%" }]
        });
    };

    const handleKRChangeModal = (index: number, field: string, value: string | number) => {
        const krs = [...newObjetivo.key_results];
        krs[index] = { ...krs[index], [field]: value };
        setNewObjetivo({ ...newObjetivo, key_results: krs });
    };

    const handleRemoveKRModal = (index: number) => {
        const krs = [...newObjetivo.key_results];
        krs.splice(index, 1);
        setNewObjetivo({ ...newObjetivo, key_results: krs });
    };

    const filteredObjetivos = objetivos.filter(o => o.ano_trimestre === trimestreFiltro && o.status === activeTab);

    return (
        <div className="flex-1 flex flex-col min-w-0 h-full bg-slate-900 relative isolate">

            {/* Abstract Background Effects */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-rose-500/10 rounded-full blur-[120px] pointer-events-none -z-10 translate-x-1/3 -translate-y-1/3"></div>
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none -z-10 -translate-x-1/2 translate-y-1/3"></div>

            <header className="px-10 py-8 border-b border-slate-800/60 bg-slate-900/40 backdrop-blur-xl z-20">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-rose-500/80 text-sm mb-2 font-bold tracking-wider uppercase">
                            <Target className="w-4 h-4" />
                            <span>Módulos / OKRs</span>
                        </div>
                        <h1 className="text-3xl font-black tracking-tight text-white mb-2">Strategy Board</h1>
                        <p className="text-slate-400 text-sm">Visualize a estratégia macro, gerencie seus objetivos e meça a tração do negócio.</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <select
                            value={trimestreFiltro}
                            onChange={(e) => setTrimestreFiltro(e.target.value)}
                            className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold outline-none focus:ring-1 focus:ring-rose-500 hover:bg-slate-700 transition-colors cursor-pointer"
                        >
                            <option value="Q1 2026">Q1 2026 (Jan - Mar)</option>
                            <option value="Q2 2026">Q2 2026 (Abr - Jun)</option>
                            <option value="Q3 2026">Q3 2026 (Jul - Set)</option>
                            <option value="Q4 2026">Q4 2026 (Out - Dez)</option>
                        </select>

                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-lg shadow-rose-600/20 active:scale-95"
                        >
                            <Plus className="w-5 h-5" />
                            Criar Objetivo
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 mt-8 p-1 bg-slate-800/50 rounded-lg w-max border border-slate-700/50">
                    <button
                        onClick={() => setActiveTab('Em Andamento')}
                        className={`px-6 py-2 rounded-md text-sm font-bold transition-all focus:outline-none ${activeTab === 'Em Andamento' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        Executando
                    </button>
                    <button
                        onClick={() => setActiveTab('Concluído')}
                        className={`px-6 py-2 rounded-md text-sm font-bold transition-all focus:outline-none ${activeTab === 'Concluído' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        Atingidos
                    </button>
                </div>
            </header>

            <main className="p-10 overflow-y-auto custom-scrollbar flex-1 z-10">
                {loading ? (
                    <div className="text-center text-slate-500 py-20 font-medium">Sincronizando estratégia com banco de dados...</div>
                ) : filteredObjetivos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center pt-24 pb-12 opacity-40">
                        <Target className="w-24 h-24 text-slate-500 mb-6" />
                        <h3 className="text-xl font-bold text-white mb-2">Sem Objetivos Criados</h3>
                        <p className="text-slate-400 max-w-sm text-center">Defina seu Norte. Adicione um Objetivo de macro nível para este trimestre.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        {filteredObjetivos.map(obj => (
                            <div key={obj.id} className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-6 backdrop-blur-md relative overflow-hidden group hover:border-slate-600 transition-colors">
                                {/* Header do Card */}
                                <div className="flex justify-between items-start mb-6">
                                    <div className="pr-4">
                                        <h3 className="text-lg font-bold text-white leading-snug group-hover:text-rose-400 transition-colors">{obj.titulo}</h3>
                                        {obj.descricao && <p className="text-sm text-slate-400 mt-1 line-clamp-2">{obj.descricao}</p>}
                                    </div>
                                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                        <button onClick={() => handleDeleteObjective(obj.id)} className="text-slate-500 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Progresso Geral */}
                                <div className="mb-6 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                                    <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                                        <span>Progresso Geral da Meta</span>
                                        <span className={obj.progresso === 100 ? "text-emerald-400" : "text-white"}>{obj.progresso}%</span>
                                    </div>
                                    <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
                                        <div
                                            className={`h-full rounded-full transition-all duration-1000 ease-out relative ${obj.progresso === 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-rose-600 to-rose-400'}`}
                                            style={{ width: `${obj.progresso}%` }}
                                        >
                                            <div className="absolute inset-0 bg-white/20 blur-[2px]"></div>
                                        </div>
                                    </div>
                                </div>

                                {/* Lista de Key Results */}
                                <div className="space-y-4">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <BarChart3 className="w-4 h-4" /> Resultados Chave (KRs)
                                    </h4>

                                    {obj.key_results?.length === 0 ? (
                                        <p className="text-xs text-slate-600">Nenhum KR cadastrado.</p>
                                    ) : (
                                        obj.key_results?.map((kr, idx) => {
                                            const perc = Math.min(100, Math.round((kr.valor_atual / Math.max(0.0001, kr.valor_alvo)) * 100));

                                            return (
                                                <div key={kr.id} className="group/kr flex items-center gap-4 bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/50 hover:bg-slate-750 transition-colors">
                                                    {/* Bolinha Status */}
                                                    {perc >= 100 ? (
                                                        <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                                                    ) : (
                                                        <CircleDashed className="w-5 h-5 text-slate-500 flex-shrink-0" />
                                                    )}

                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-slate-200 truncate pr-2">{kr.titulo}</p>
                                                        {/* Mini Barra progresso */}
                                                        <div className="flex items-center gap-3 mt-2">
                                                            <div className="h-1 lg:w-32 bg-slate-700 rounded-full overflow-hidden flex-1 md:flex-none">
                                                                <div className={`h-full rounded-full transition-all duration-500 ${perc >= 100 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${perc}%` }}></div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Controles de Valor */}
                                                    <div className="flex flex-col items-end gap-1">
                                                        <div className="flex items-center gap-1.5 text-xs font-bold font-mono">
                                                            <span className="text-white bg-slate-900 border border-slate-700 px-2 py-1 rounded inline-block text-center cursor-pointer hover:border-slate-500 transition-colors"
                                                                onClick={() => {
                                                                    const nv = prompt(`Novo valor para: ${kr.titulo}`, kr.valor_atual.toString());
                                                                    if (nv && !isNaN(Number(nv))) handleUpdateKR(obj.id, kr.id, Number(nv));
                                                                }}>
                                                                {kr.valor_atual.toLocaleString('pt-BR')}
                                                            </span>
                                                            <span className="text-slate-500">/</span>
                                                            <span className="text-slate-400">{kr.valor_alvo.toLocaleString('pt-BR')}</span>
                                                            <span className="text-slate-500 ml-1">{kr.unidade}</span>
                                                        </div>
                                                        <span className="text-[10px] text-slate-500 group-hover/kr:text-rose-400 transition-colors cursor-pointer" onClick={() => {
                                                            const nv = prompt(`Novo valor para: ${kr.titulo}`, kr.valor_atual.toString());
                                                            if (nv && !isNaN(Number(nv))) handleUpdateKR(obj.id, kr.id, Number(nv));
                                                        }}>Atualizar <Edit3 className="w-2.5 h-2.5 inline" /></span>
                                                    </div>
                                                </div>
                                            )
                                        })
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Novo Objetivo do Trimestre" width="max-w-2xl">
                <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar pb-6">

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Objetivo (Onde queremos chegar?)</label>
                            <input
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all shadow-inner"
                                placeholder="Ex: Dominar a aquisição digital no Brasil"
                                value={newObjetivo.titulo}
                                onChange={(e) => setNewObjetivo({ ...newObjetivo, titulo: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Descrição Curta (Motivo/Impacto)</label>
                            <textarea
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-300 outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all shadow-inner min-h-[80px]"
                                placeholder="Por que este objetivo importa neste trimestre?"
                                value={newObjetivo.descricao}
                                onChange={(e) => setNewObjetivo({ ...newObjetivo, descricao: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-700/50">
                        <div className="flex justify-between items-center mb-5">
                            <h4 className="text-sm font-bold text-white flex items-center gap-2"><BarChart3 className="w-4 h-4 text-rose-500" /> Key Results (KRs)</h4>
                            <button onClick={handleAddKRModal} className="text-[10px] uppercase tracking-widest font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1 bg-rose-500/10 px-3 py-1.5 rounded-lg border border-rose-500/20">
                                <Plus className="w-3 h-3" /> Adicionar KR
                            </button>
                        </div>

                        <div className="space-y-3">
                            {newObjetivo.key_results?.length === 0 && <p className="text-sm text-slate-500 text-center py-4 italic">Nenhum KR adicionado. Adicione resultados numéricos para rastrear o progresso.</p>}

                            {newObjetivo.key_results?.map((kr, idx) => (
                                <div key={kr.id} className="flex flex-col gap-3 bg-slate-800 border border-slate-700 p-4 rounded-xl relative">
                                    {newObjetivo.key_results.length > 0 && (
                                        <button onClick={() => handleRemoveKRModal(idx)} className="absolute top-3 right-3 p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Resultado Esperado</label>
                                        <input
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-rose-500 outline-none pr-10"
                                            placeholder="Ex: Bater R$ 100k de Faturamento"
                                            value={kr.titulo}
                                            onChange={(e) => handleKRChangeModal(idx, 'titulo', e.target.value)}
                                        />
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Início</label>
                                            <input
                                                type="number"
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 font-mono focus:ring-1 focus:ring-rose-500 outline-none"
                                                value={kr.valor_atual}
                                                onChange={(e) => handleKRChangeModal(idx, 'valor_atual', Number(e.target.value))}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Alvo</label>
                                            <input
                                                type="number"
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:ring-1 focus:ring-rose-500 outline-none"
                                                value={kr.valor_alvo}
                                                onChange={(e) => handleKRChangeModal(idx, 'valor_alvo', Number(e.target.value))}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Unidade</label>
                                            <input
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-400 focus:ring-1 focus:ring-rose-500 outline-none"
                                                placeholder="Ex: %, R$, users"
                                                value={kr.unidade}
                                                onChange={(e) => handleKRChangeModal(idx, 'unidade', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end border-t border-slate-800">
                        <button
                            onClick={handleCreateObjective}
                            className="bg-rose-600 hover:bg-rose-500 text-white font-bold py-3.5 px-8 rounded-xl transition-all shadow-lg shadow-rose-600/20 active:scale-95"
                        >
                            Criar Objetivo Estratégico
                        </button>
                    </div>

                </div>
            </Modal>

        </div>
    );
}

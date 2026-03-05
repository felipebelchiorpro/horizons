"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Play, Pause, Clock, AlertCircle, CheckCircle2, DollarSign, Activity } from "lucide-react";
import { pb } from "@/lib/pocketbase";

interface Projeto {
    id: string;
    titulo: string;
    descricao: string;
    status: string;
    horas_estimadas: number;
    valor_projeto?: number;
    expand?: {
        responsavel_id: {
            id: string;
            nome: string;
            valor_hora: number;
        }
    }
}

interface TimeLog {
    id: string;
    id_projeto: string;
    id_colaborador: string;
    data_inicio: string;
    data_fim: string;
    custo_gerado: number;
}

export default function ProjetoDetalhes() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [projeto, setProjeto] = useState<Projeto | null>(null);
    const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");

    // Time tracking states
    const [isTracking, setIsTracking] = useState(false);
    const [activeLogId, setActiveLogId] = useState<string | null>(null);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);

    const [totalHorasGastas, setTotalHorasGastas] = useState(0);
    const [totalCustoProjeto, setTotalCustoProjeto] = useState(0);

    useEffect(() => {
        async function loadData() {
            try {
                // Carregar Projeto
                const projRecord = await pb.collection('projetos').getOne<any>(id, {
                    expand: 'responsavel_id',
                    requestKey: null
                });

                setProjeto({
                    id: projRecord.id,
                    titulo: projRecord.titulo,
                    descricao: projRecord.descricao,
                    status: projRecord.status,
                    horas_estimadas: projRecord.horas_estimadas,
                    valor_projeto: projRecord.valor_projeto || 0,
                    expand: projRecord.expand
                });

                // Carregar Logs de Tempo
                try {
                    const logs = await pb.collection('time_logs').getFullList<TimeLog>({
                        filter: `id_projeto = '${id}'`,
                        sort: '-created',
                        requestKey: null
                    });

                    setTimeLogs(logs);

                    // Checa se há algum log aberto (sem data_fim)
                    const openLog = logs.find(l => !l.data_fim);
                    if (openLog) {
                        setIsTracking(true);
                        setActiveLogId(openLog.id);
                        const start = new Date(openLog.data_inicio).getTime();
                        const now = new Date().getTime();
                        setElapsedSeconds(Math.floor((now - start) / 1000));
                    }

                    // Calculo de Totais
                    let sumHoras = 0;
                    let sumCusto = 0;
                    logs.forEach(l => {
                        if (l.data_fim) {
                            const start = new Date(l.data_inicio).getTime();
                            const end = new Date(l.data_fim).getTime();
                            const diffHours = (end - start) / (1000 * 60 * 60);
                            sumHoras += diffHours;
                            sumCusto += l.custo_gerado;
                        }
                    });
                    setTotalHorasGastas(sumHoras);
                    setTotalCustoProjeto(sumCusto);

                } catch (e: any) {
                    if (e.status === 404) {
                        throw new Error("A coleção 'time_logs' não foi encontrada. Crie-a no PocketBase.");
                    }
                }

                setErrorMsg("");
            } catch (err: any) {
                console.error("Error loading projeto details:", err);
                setErrorMsg(err.message || String(err));
            } finally {
                setLoading(false);
            }
        }

        if (id) {
            loadData();
        }

        const unsubscribeLogs = pb.collection('time_logs').subscribe('*', function (e) {
            loadData();
        });

        return () => {
            unsubscribeLogs.then(unsub => unsub());
        };
    }, [id]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isTracking) {
            interval = setInterval(() => {
                setElapsedSeconds(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isTracking]);

    const formatTime = (totalSeconds: number) => {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    async function handleToggleTimer() {
        if (!projeto || !projeto.expand?.responsavel_id) {
            alert("Não é possível registrar tempo: Projeto sem responsável definido.");
            return;
        }

        const colab = projeto.expand.responsavel_id;

        try {
            if (!isTracking) {
                // START TIMER
                const newLog = await pb.collection('time_logs').create({
                    id_projeto: projeto.id,
                    id_colaborador: colab.id,
                    data_inicio: new Date().toISOString(),
                    custo_gerado: 0
                });
                setActiveLogId(newLog.id);
                setIsTracking(true);
                setElapsedSeconds(0);
            } else {
                // STOP TIMER
                if (activeLogId) {
                    const endedAt = new Date();
                    const logAnterior = await pb.collection('time_logs').getOne(activeLogId);

                    const start = new Date(logAnterior.data_inicio).getTime();
                    const end = endedAt.getTime();

                    // Cálculo: MS para Horas -> Multiplica por valor/hora
                    const horasGastas = (end - start) / (1000 * 60 * 60);
                    const custoSessao = horasGastas * colab.valor_hora;

                    await pb.collection('time_logs').update(activeLogId, {
                        data_fim: endedAt.toISOString(),
                        custo_gerado: custoSessao
                    });

                    setIsTracking(false);
                    setActiveLogId(null);
                    setElapsedSeconds(0);
                }
            }
        } catch (err: any) {
            alert(`Erro ao atualizar timer: ${err.message}`);
        }
    }

    if (loading) return <div className="flex-1 bg-slate-900 flex items-center justify-center text-white">Carregando detalhes...</div>;
    if (!projeto) return <div className="flex-1 bg-slate-900 text-white p-8">Projeto não encontrado ou erro ocorrido.</div>;

    const healthPercentage = projeto.horas_estimadas > 0
        ? Math.min(100, (totalHorasGastas / projeto.horas_estimadas) * 100)
        : 0;

    const healthStatusClass = healthPercentage > 90 ? 'text-rose-500 bg-rose-500/20' : healthPercentage > 75 ? 'text-amber-500 bg-amber-500/20' : 'text-emerald-500 bg-emerald-500/20';

    return (
        <div className="flex-1 flex flex-col min-w-0 h-full bg-slate-900 relative">
            {errorMsg && (
                <div className="absolute top-0 left-0 right-0 bg-amber-500 text-white p-4 text-center z-50 font-mono text-sm shadow-lg">
                    Aviso: {errorMsg}
                </div>
            )}
            <header className="h-20 flex items-center px-8 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-20 gap-4">
                <button
                    onClick={() => router.push('/projetos')}
                    className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-3">
                        {projeto.titulo}
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-normal">
                            {projeto.status}
                        </span>
                    </h2>
                    <p className="text-sm text-slate-400">Responsável: {projeto.expand?.responsavel_id?.nome || 'Nenhum'}</p>
                </div>
            </header>

            <main className="p-8 overflow-y-auto custom-scrollbar flex-1">

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    {/* Time Tracker Panel */}
                    <div className="lg:col-span-2 bg-slate-800/40 border border-slate-700/50 rounded-2xl p-8 flex flex-col items-center justify-center relative overflow-hidden">
                        {isTracking && (
                            <div className="absolute top-4 right-4 flex items-center gap-2 text-rose-500 font-bold text-sm animate-pulse">
                                <Activity className="w-4 h-4" />
                                Gravando...
                            </div>
                        )}

                        <div className="text-6xl font-mono font-bold text-white mb-8 tracking-wider">
                            {formatTime(elapsedSeconds)}
                        </div>

                        <button
                            onClick={handleToggleTimer}
                            className={`flex items-center gap-3 px-8 py-4 rounded-xl font-bold text-lg transition-all transform active:scale-95 shadow-xl ${isTracking
                                ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20'
                                : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20'
                                }`}
                        >
                            {isTracking ? (
                                <>
                                    <Pause className="w-6 h-6 fill-current" />
                                    Parar Cronômetro
                                </>
                            ) : (
                                <>
                                    <Play className="w-6 h-6 fill-current" />
                                    Iniciar Novo Ciclo
                                </>
                            )}
                        </button>
                        <p className="text-slate-500 text-sm mt-6 text-center max-w-sm">
                            Inicie o cronômetro para computar automaticamente as horas trabalhadas e o custo gerado para este projeto.
                        </p>
                    </div>

                    {/* Stats Dashboard */}
                    <div className="space-y-6">
                        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-6">
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <DollarSign className="w-4 h-4" />
                                Custo Operacional Acumulado
                            </h3>
                            <div className="text-4xl font-bold text-white mb-2">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalCustoProjeto)}
                            </div>
                            <p className="text-xs text-slate-400">Total calculado com base nas horas registradas ({totalHorasGastas.toFixed(2)}h) x Custo/Hora do Responsável.</p>
                        </div>

                        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-6">
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                Saúde do Projeto (Tempo)
                            </h3>
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-2xl font-bold text-white">{totalHorasGastas.toFixed(1)}h</span>
                                <span className="text-sm text-slate-400">/ {projeto.horas_estimadas}h est.</span>
                            </div>

                            <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
                                <div
                                    className={`h-full transition-all duration-1000 ${healthStatusClass.split(' ')[0].replace('text-', 'bg-')}`}
                                    style={{ width: `${healthPercentage}%` }}
                                ></div>
                            </div>
                            {healthPercentage >= 100 && (
                                <p className="text-xs text-rose-400 mt-2 font-medium flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    Atenção: Orçamento de tempo excedido!
                                </p>
                            )}
                        </div>

                        {/* Finance Margins */}
                        {projeto.valor_projeto && projeto.valor_projeto > 0 ? (
                            <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-6">
                                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Activity className="w-4 h-4" />
                                    Lucro Real (Margem)
                                </h3>

                                <div className="space-y-2 mb-4">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-400">Valor Fechado</span>
                                        <span className="text-emerald-400 font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(projeto.valor_projeto)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-400">Custos Operacionais</span>
                                        <span className="text-rose-400 font-bold">- {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalCustoProjeto)}</span>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-700/50">
                                    <div className="flex justify-between items-end">
                                        <span className="text-slate-300 font-medium">Balanço do Projeto</span>
                                        <span className={`text-2xl font-black ${(projeto.valor_projeto - totalCustoProjeto) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(projeto.valor_projeto - totalCustoProjeto)}
                                        </span>
                                    </div>
                                    {totalCustoProjeto > 0 && (
                                        <p className="text-xs text-right mt-1 text-slate-500">
                                            Margem: {(((projeto.valor_projeto - totalCustoProjeto) / projeto.valor_projeto) * 100).toFixed(1)}%
                                        </p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-6 text-center">
                                <DollarSign className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                                <p className="text-sm text-slate-400">Não há Valor Cobrado cadastrado neste projeto para calcular a margem de lucro.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Log Table */}
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-6">
                    <h3 className="text-base font-bold text-white mb-6 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-blue-500" />
                        Histórico de Atividades
                    </h3>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-700/50 text-xs uppercase tracking-wider text-slate-500">
                                    <th className="pb-4 font-semibold">Data e Início</th>
                                    <th className="pb-4 font-semibold">Fim</th>
                                    <th className="pb-4 font-semibold">Tempo da Sessão</th>
                                    <th className="pb-4 font-semibold text-right">Custo Gerado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {timeLogs.map(log => {
                                    const start = new Date(log.data_inicio);
                                    let endStr = "-";
                                    let timeStr = "Em andamento...";
                                    let custoStr = "-";

                                    if (log.data_fim) {
                                        const end = new Date(log.data_fim);
                                        endStr = end.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

                                        const totalSecs = Math.floor((end.getTime() - start.getTime()) / 1000);
                                        timeStr = formatTime(totalSecs);
                                        custoStr = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(log.custo_gerado);
                                    }

                                    return (
                                        <tr key={log.id} className="border-b border-slate-700/20 text-sm text-slate-300">
                                            <td className="py-4">
                                                <div className="font-medium">{start.toLocaleDateString('pt-BR')}</div>
                                                <div className="text-xs text-slate-500">{start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                                            </td>
                                            <td className="py-4">{endStr}</td>
                                            <td className="py-4 font-mono">{timeStr}</td>
                                            <td className="py-4 text-right font-medium text-emerald-400">{custoStr}</td>
                                        </tr>
                                    );
                                })}

                                {timeLogs.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="py-8 text-center text-slate-500">
                                            Nenhum registro de tempo encontrado para este projeto.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </main>
        </div>
    );
}

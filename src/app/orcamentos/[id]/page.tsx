"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Printer, FileDown, CheckCircle2, Clock, MapPin, Building2, Phone } from "lucide-react";
import { pb } from "@/lib/pocketbase";
import jsPDF from "jspdf";
import 'jspdf-autotable';

// Adicionando tipo do autotable ao jspdf
declare module 'jspdf' {
    interface jsPDF {
        autoTable: (options: any) => jsPDF;
        lastAutoTable: { finalY: number };
    }
}

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
    created: string;
}

export default function VisualizarOrcamento() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [orcamento, setOrcamento] = useState<Orcamento | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchOrcamento() {
            try {
                const record = await pb.collection('orcamentos').getOne<Orcamento>(id);
                setOrcamento(record);
            } catch (err) {
                console.error("Erro ao carregar orçamento:", err);
            } finally {
                setLoading(false);
            }
        }
        if (id) fetchOrcamento();
    }, [id]);

    const handlePrint = () => {
        window.print();
    };

    const handleDownloadPDF = () => {
        if (!orcamento) return;

        try {
            const doc = new jsPDF();
            const docId = `PROP-${orcamento.id.substring(0, 8).toUpperCase()}`;

            // Cabeçalho da Empresa
            doc.setFontSize(22);
            doc.setFont("helvetica", "bold");
            doc.text("VENTURE", 20, 20);

            doc.setFontSize(8);
            doc.setFont("helvetica", "normal");
            doc.text("Uma Empresa do Grupo Belchior Venture Business", 125, 16);
            doc.text("CNPJ: 46.105.907/0001-16", 140, 20);
            doc.text("CONTATO@VENTURE.COM.BR", 140, 24);

            doc.setLineWidth(0.5);
            doc.line(20, 28, 190, 28);

            // Título Orçamento
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.text("PROPOSTA DE PRESTAÇÃO DE SERVIÇOS", 105, 40, { align: "center" });

            // Informações
            doc.setFontSize(10);
            doc.text("CLIENTE:", 20, 55);
            doc.setFont("helvetica", "normal");
            doc.text(`Nome/Razão: ${orcamento.cliente}`, 20, 60);
            if (orcamento.documento_cliente) doc.text(`Documento: ${orcamento.documento_cliente}`, 20, 65);
            if (orcamento.email_cliente) doc.text(`E-mail: ${orcamento.email_cliente}`, 20, 70);

            doc.setFont("helvetica", "bold");
            doc.text("INFORMAÇÕES DA PROPOSTA:", 120, 55);
            doc.setFont("helvetica", "normal");
            doc.text(`Doc ID: ${docId}`, 120, 60);
            doc.text(`Emissão: ${new Date(orcamento.data_emissao).toLocaleDateString('pt-BR')}`, 120, 65);
            doc.text(`Validade: ${orcamento.validade_dias} dias`, 120, 70);
            doc.text(`Status Atual: ${orcamento.status}`, 120, 75);

            // Tabela de itens usando jspdf-autotable
            const tableColumn = ["Descrição do Escopo", "Qtd", "Valor Unit. (R$)", "Total (R$)"];
            const tableRows = orcamento.itens?.map(item => [
                item.descricao || "Item sem descrição",
                item.quantidade,
                new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor_unitario),
                new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.quantidade * item.valor_unitario)
            ]) || [];

            doc.autoTable({
                startY: 90,
                head: [tableColumn],
                body: tableRows,
                theme: 'grid',
                headStyles: { fillColor: [38, 38, 38] }, // slate-800 aproximado
            });

            // Totais
            const finalY = doc.lastAutoTable.finalY + 10;
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.text(`TOTAL DO ORÇAMENTO: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(orcamento.valor_total)}`, 190, finalY, { align: "right" });

            if (orcamento.observacoes) {
                doc.setFontSize(10);
                doc.setFont("helvetica", "bold");
                doc.text("Condições Comerciais:", 20, finalY + 15);
                doc.setFont("helvetica", "normal");
                const splitObs = doc.splitTextToSize(orcamento.observacoes, 170);
                doc.text(splitObs, 20, finalY + 20);
            }

            doc.setFontSize(8);
            doc.text("Aguardamos o seu retorno. Documento gerado via Horizons SaaS.", 105, 280, { align: "center" });

            doc.save(`Proposta_${docId}.pdf`);

        } catch (err) {
            console.error("Erro ao gerar PDF:", err);
            alert("Ocorreu um erro ao gerar o PDF.");
        }
    };

    const handleChangeStatus = async (novoStatus: string) => {
        try {
            const updated = await pb.collection('orcamentos').update<Orcamento>(id, { status: novoStatus });
            setOrcamento(updated);
        } catch (e) {
            alert("Erro ao alterar status do orçamento.");
        }
    };

    if (loading) return <div className="flex-1 bg-slate-900 flex items-center justify-center text-white">Carregando Proposta...</div>;
    if (!orcamento) return <div className="flex-1 bg-slate-900 flex flex-col items-center justify-center text-white p-8"><h2 className="text-2xl font-bold mb-4 text-center">Orçamento não encontrado</h2><button onClick={() => router.push('/orcamentos')} className="bg-sky-600 px-6 py-2 rounded-lg font-bold">Voltar</button></div>;

    const getStatusBadge = () => {
        if (orcamento.status === 'Aprovado') return <span className="bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 px-4 py-1 rounded-full text-sm font-bold flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Aprovado</span>;
        if (orcamento.status === 'Recusado') return <span className="bg-rose-500/20 text-rose-500 border border-rose-500/30 px-4 py-1 rounded-full text-sm font-bold">Recusado</span>;
        return <span className="bg-amber-500/20 text-amber-500 border border-amber-500/30 px-4 py-1 rounded-full text-sm font-bold flex items-center gap-2"><Clock className="w-4 h-4" /> Aguardando Decisão</span>;
    };

    return (
        <div className="flex-1 flex justify-center bg-slate-900 pb-20 pt-8 px-4 overflow-y-auto print:bg-white print:p-0 custom-scrollbar">

            {/* Painel de Ações flutuante (Não Impresso) */}
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-800/90 backdrop-blur-md border border-slate-700 p-4 rounded-2xl shadow-2xl flex items-center gap-4 z-50 print:hidden shadow-sky-900/20">
                <button onClick={() => router.push('/orcamentos')} className="p-3 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition-all">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="w-px h-8 bg-slate-700 mx-2"></div>

                {orcamento.status !== 'Aprovado' && (
                    <button onClick={() => handleChangeStatus('Aprovado')} className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20">
                        <CheckCircle2 className="w-5 h-5" /> Aprovado pelo Cliente
                    </button>
                )}
                {orcamento.status !== 'Recusado' && (
                    <button onClick={() => handleChangeStatus('Recusado')} className="flex items-center gap-2 px-6 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-rose-500/20">
                        <CheckCircle2 className="w-5 h-5" /> Recusado
                    </button>
                )}
                {orcamento.status !== 'Aguardando' && (
                    <button onClick={() => handleChangeStatus('Aguardando')} className="flex items-center gap-2 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold rounded-xl transition-all">
                        Reabrir
                    </button>
                )}

                <button onClick={handlePrint} className="flex items-center gap-2 px-6 py-3 bg-slate-600 hover:bg-slate-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-slate-500/20 ml-2">
                    <Printer className="w-5 h-5" /> Imprimir
                </button>
                <button onClick={handleDownloadPDF} className="flex items-center gap-2 px-6 py-3 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-sky-500/20">
                    <FileDown className="w-5 h-5" /> Baixar PDF
                </button>
            </div>

            {/* Folha A4 do Orçamento */}
            <main id="documento-pdf" className="w-full max-w-4xl bg-white min-h-[1056px] rounded-sm shadow-2xl print:shadow-none p-12 md:p-16 text-slate-800 relative" style={{
                backgroundImage: "radial-gradient(#e5e7eb 0.5px, transparent 0.5px)",
                backgroundSize: "20px 20px"
            }}>
                {/* Letterhead */}
                <div className="flex justify-between items-start border-b-2 border-slate-200 pb-8 mb-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded flex items-center justify-center">
                            <span className="text-white font-bold text-xl leading-none">V</span>
                        </div>
                        <span className="text-xl font-black text-slate-900 tracking-tighter">VENTURE</span>
                    </div>
                    <div className="text-right text-[10px] text-slate-500 font-medium">
                        <p>Uma Empresa do Grupo Belchior Venture Business</p>
                        <p>CNPJ: 46.105.907/0001-16</p>
                        <p>CONTATO@VENTURE.COM.BR</p>
                    </div>
                </div>

                <h2 className="text-center text-xl font-bold uppercase tracking-widest mb-2 text-slate-900">PROPOSTA DE SERVIÇOS / ORÇAMENTO</h2>
                <p className="text-center text-xs font-bold text-slate-400 mb-12">Nº {orcamento.id.toUpperCase()}</p>

                <div className="grid grid-cols-2 gap-12 mb-16 px-4">
                    {/* Dados do Cliente */}
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 border-b pb-2">Cliente / Faturado Para</h3>
                        <div className="space-y-2">
                            <div className="font-bold text-lg text-slate-900">{orcamento.cliente}</div>
                            {orcamento.documento_cliente && (
                                <p className="text-sm text-slate-600">Doc: {orcamento.documento_cliente}</p>
                            )}
                            {orcamento.email_cliente && (
                                <p className="text-sm text-slate-600">{orcamento.email_cliente}</p>
                            )}
                        </div>
                    </div>

                    {/* Status e Datas */}
                    <div className="text-right">
                        <div className="mb-4 inline-block">
                            {getStatusBadge()}
                        </div>
                        <div className="space-y-2 mt-4 text-sm">
                            <p className="text-slate-500"><span className="font-bold">Data de Emissão:</span> {new Date(orcamento.data_emissao).toLocaleDateString('pt-BR')}</p>
                            <p className="text-slate-500"><span className="font-bold">Validade da Proposta:</span> <span className="text-sky-600 font-bold">{orcamento.validade_dias} dias</span></p>
                        </div>
                    </div>
                </div>

                {/* Tabela de Itens */}
                <div className="mb-16">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b-2 border-slate-200 bg-slate-50">
                                <th className="py-4 px-4 text-xs font-bold uppercase tracking-widest text-slate-500">Descrição do Escopo / Produto</th>
                                <th className="py-4 text-xs font-bold uppercase tracking-widest text-slate-500 text-center w-24">Qtd</th>
                                <th className="py-4 text-xs font-bold uppercase tracking-widest text-slate-500 text-right w-32">V. Unitário</th>
                                <th className="py-4 px-4 text-xs font-bold uppercase tracking-widest text-slate-500 text-right w-32">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orcamento.itens?.map((item, idx) => (
                                <tr key={idx} className="border-b border-slate-100">
                                    <td className="py-4 px-4 font-medium text-slate-800">{item.descricao || "Item sem descrição"}</td>
                                    <td className="py-4 text-center text-slate-600">{item.quantidade}</td>
                                    <td className="py-4 text-right text-slate-600">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor_unitario)}
                                    </td>
                                    <td className="py-4 px-4 text-right font-bold text-slate-900">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.quantidade * item.valor_unitario)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Resumo Final */}
                <div className="flex justify-end mb-16 px-4">
                    <div className="w-full max-w-sm">
                        <div className="flex justify-between py-4 border-b border-slate-200">
                            <span className="text-slate-500 font-medium">Subtotal Estimado</span>
                            <span className="text-slate-900 font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(orcamento.valor_total)}</span>
                        </div>
                        <div className="flex justify-between py-6">
                            <span className="text-lg font-bold text-slate-900 uppercase tracking-widest">Total do Orçamento</span>
                            <span className="text-3xl font-black text-sky-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(orcamento.valor_total)}</span>
                        </div>
                    </div>
                </div>

                {/* Footer / Assinatura / Observações */}
                {orcamento.observacoes && (
                    <div className="p-6 bg-slate-50 rounded-lg border border-slate-100 text-sm text-slate-600 mb-16">
                        <p className="font-bold text-slate-900 mb-2">Condições Comerciais:</p>
                        <p className="whitespace-pre-wrap">{orcamento.observacoes}</p>
                    </div>
                )}

                <div className="absolute inset-x-12 bottom-12 pt-8 border-t border-slate-200 text-center text-slate-400 text-[10px] print:block">
                    Após aprovação via WhatsApp Comercial ou e-mail corporativo, a Ordem de Serviço será gerada e o contrato definitivo pode ser assinado e autenticado através da plataforma. Documento processado pelo sistema Horizons S.A.
                </div>

                <div className="absolute inset-0 flex items-center justify-center opacity-[0.02] pointer-events-none -rotate-12">
                    <span className="text-8xl font-black text-slate-900">VENTURE</span>
                </div>

            </main>
        </div>
    );
}

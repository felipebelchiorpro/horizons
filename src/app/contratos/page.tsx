"use client";

import { ChevronRight, ShieldCheck, FileText, CheckCircle2, Lock, History, Search, ZoomIn, Printer, QrCode, Plus, MessageSquare, AlertCircle, Clock, Wallet } from "lucide-react";
import { useState, useEffect } from "react";
import { pb, authenticate } from "@/lib/pocketbase";
import { sendWhatsAppMessage } from "@/lib/chatwoot";
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface Cliente {
    id: string;
    nome: string;
    documento: string;
    responsavel: string;
    email: string;
    telefone?: string;
}

interface Servico {
    id: string;
    nome: string;
    valorBase: number;
    desc: string;
}

export default function Contratos() {
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [servicos, setServicos] = useState<Servico[]>([]);
    const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
    const [selectedServico, setSelectedServico] = useState<Servico | null>(null);
    const [escopo, setEscopo] = useState("");
    const [valorManual, setValorManual] = useState<string>("");
    const [isCustomService, setIsCustomService] = useState(false);
    const [customServiceName, setCustomServiceName] = useState("");
    const [formaPagamento, setFormaPagamento] = useState("100% após a finalização do projeto");
    const [prazoEntrega, setPrazoEntrega] = useState("1");
    const [unidadePrazo, setUnidadePrazo] = useState("dia(s) após a realização do serviço");
    const [localidade, setLocalidade] = useState("Caconde-SP");
    const [loading, setLoading] = useState(true);
    const [statusToast, setStatusToast] = useState<{ type: "success" | "error", message: string } | null>(null);

    useEffect(() => {
        async function loadData() {
            try {
                await authenticate();

                // Clientes
                try {
                    const clientsList = await pb.collection('clientes').getFullList<any>({ requestKey: null });
                    setClientes(clientsList);
                    if (clientsList.length > 0) setSelectedCliente(clientsList[0]);
                } catch (e) {
                    console.error("Error fetching clientes:", e);
                }

                // Servicos
                try {
                    const servicesList = await pb.collection('servicos').getFullList<any>({ requestKey: null });
                    setServicos(servicesList);
                    if (servicesList.length > 1) {
                        setSelectedServico(servicesList[1]);
                        setEscopo(servicesList[1].desc);
                        setValorManual(servicesList[1].valorBase.toString());
                    } else if (servicesList.length > 0) {
                        setSelectedServico(servicesList[0]);
                        setEscopo(servicesList[0].desc);
                        setValorManual(servicesList[0].valorBase.toString());
                    }
                } catch (e) {
                    console.error("Error fetching servicos:", e);
                }
            } catch (err) {
                console.error('Error in loadData auth:', err);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    const showStatus = (type: "success" | "error", message: string) => {
        setStatusToast({ type, message });
        setTimeout(() => setStatusToast(null), 3000);
    };

    const sendContractWhatsApp = async () => {
        if (!selectedCliente?.telefone) {
            showStatus("error", "Telefone do cliente não cadastrado.");
            return;
        }

        const serviceName = isCustomService ? customServiceName : selectedServico?.nome;
        const totalValue = isCustomService ? valorManual : selectedServico?.valorBase;

        const message = `Olá ${selectedCliente.nome}! Conforme conversamos, segue o link para visualização e assinatura do seu contrato de *${serviceName}* no valor de R$ ${Number(totalValue).toLocaleString('pt-BR')}. 📝✨\n\n[Link do Contrato em anexo]`;

        try {
            await sendWhatsAppMessage(selectedCliente.telefone, message);
            showStatus("success", "Contrato enviado via WhatsApp!");
        } catch (err) {
            showStatus("error", "Erro ao enviar WhatsApp.");
        }
    };

    const generatePDF = async () => {
        if (!selectedCliente) return;

        const doc = new jsPDF();
        const serviceName = isCustomService ? customServiceName : selectedServico?.nome;
        const totalValue = isCustomService ? Number(valorManual || 0) : Number(selectedServico?.valorBase || 0);
        const dateStr = new Date().toLocaleDateString('pt-BR');

        // Helper to load image
        const loadImage = (url: string): Promise<string> => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'Anonymous';
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    if (ctx) ctx.drawImage(img, 0, 0);
                    resolve(canvas.toDataURL('image/png'));
                };
                img.onerror = () => reject();
                img.src = url;
            });
        };

        let currentY = 20;
        const pageHeight = doc.internal.pageSize.getHeight();
        const marginBottom = 20;

        let logoBase64 = null;
        try { logoBase64 = await loadImage('/logo.png'); } catch (e) { }

        if (logoBase64) {
            // Center logo width=30
            doc.addImage(logoBase64, "PNG", 90, 10, 30, 8);
            currentY = 30; // Push down
        }

        const checkAddPage = (requiredSpace: number) => {
            if (currentY + requiredSpace > pageHeight - marginBottom) {
                doc.addPage();
                currentY = 20; // reset to top margin
            }
        };

        // Styles
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.text("CONTRATO DE PRESTAÇÃO DE SERVIÇOS", 105, currentY, { align: "center" });
        currentY += 20;

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("1. PARTES", 20, currentY);
        currentY += 10;

        doc.setFont("helvetica", "normal");
        doc.text("1.1 CONTRATANTE:", 25, currentY);
        currentY += 5;
        doc.text(`Nome: ${selectedCliente.nome}`, 30, currentY);
        currentY += 5;
        doc.text(`CPF/CNPJ: ${selectedCliente.documento}`, 30, currentY);
        currentY += 5;
        doc.text(`Telefone: ${selectedCliente.telefone || "N/A"}`, 30, currentY);
        currentY += 10;

        doc.text("1.2 CONTRATADO:", 25, currentY);
        currentY += 5;
        doc.text("Nome: Grupo Belchior", 30, currentY);
        currentY += 5;
        doc.text("CNPJ: 46.105.907/0001-16", 30, currentY);
        currentY += 5;
        doc.text("Telefone: (19) 97154-4146", 30, currentY);
        currentY += 5;
        doc.text("E-mail: atendimento@grupobelchior.com", 30, currentY);
        currentY += 15;

        // OBJETIVO
        checkAddPage(20);
        doc.setFont("helvetica", "bold");
        doc.text("2. OBJETIVO", 20, currentY);
        currentY += 5;
        doc.setFont("helvetica", "normal");
        const objetivo = "O presente contrato tem por objeto a prestação de serviços pelo Grupo Belchior em favor do Contratante, conforme as condições estabelecidas neste instrumento.";
        const splitObjetivo = doc.splitTextToSize(objetivo, 160);
        doc.text(splitObjetivo, 25, currentY);
        currentY += splitObjetivo.length * 5 + 10;

        // SERVICOS
        const descricao = `Os serviços a serem prestados pelo Grupo Belchior (Agencia Venture) compreendem ${serviceName} conforme especificado no Anexo A, que faz parte integrante deste contrato.`;
        const splitDesc = doc.splitTextToSize(descricao, 160);
        const escopoText = `[${escopo}]`;
        const splitEscopo = doc.splitTextToSize(escopoText, 160);

        checkAddPage(15 + (splitDesc.length * 5) + (splitEscopo.length * 5));

        doc.setFont("helvetica", "bold");
        doc.text("3. DESCRIÇÃO DOS SERVIÇOS", 20, currentY);
        currentY += 5;
        doc.setFont("helvetica", "normal");
        doc.text(splitDesc, 25, currentY);
        currentY += splitDesc.length * 5 + 5;

        doc.setFont("helvetica", "italic");
        doc.text(splitEscopo, 25, currentY);
        currentY += splitEscopo.length * 5 + 10;

        // FINANCEIRO
        const financeiro = `O valor total dos serviços contratados é de R$ ${totalValue.toLocaleString('pt-BR')}. O pagamento será efetuado da seguinte forma: ${formaPagamento}`;
        const splitFin = doc.splitTextToSize(financeiro, 160);

        checkAddPage(15 + (splitFin.length * 5));
        doc.setFont("helvetica", "bold");
        doc.text("4. CONDIÇÕES FINANCEIRA", 20, currentY);
        currentY += 5;
        doc.setFont("helvetica", "normal");
        doc.text("4.1 VALOR E FORMA DE PAGAMENTO:", 25, currentY);
        currentY += 5;
        doc.text(splitFin, 25, currentY);
        currentY += splitFin.length * 5 + 10;

        // PRAZO
        const prazo = `O prazo de entrega dos arquivo será de ${prazoEntrega} ${unidadePrazo}. Qualquer alteração no prazo será comunicada e acordada entre as partes.`;
        const splitPrazo = doc.splitTextToSize(prazo, 160);

        checkAddPage(10 + (splitPrazo.length * 5));
        doc.setFont("helvetica", "bold");
        doc.text("5. PRAZO E ENTREGA", 20, currentY);
        currentY += 5;
        doc.setFont("helvetica", "normal");
        doc.text(splitPrazo, 25, currentY);
        currentY += splitPrazo.length * 5 + 15;

        // Footer Date text
        checkAddPage(10);
        doc.text(`${localidade}, ${dateStr}`, 180, currentY, { align: "right" });
        currentY += 30;

        // Signatures
        checkAddPage(40); // ensure space for signature layout

        doc.line(20, currentY, 90, currentY);
        doc.setFontSize(10);
        doc.text(selectedCliente.nome, 55, currentY + 5, { align: "center", maxWidth: 70 });
        doc.setFontSize(8);
        doc.text(selectedCliente.documento, 55, currentY + 9, { align: "center" });
        doc.text("Titular Responsável", 55, currentY + 13, { align: "center" });

        doc.setFontSize(10);
        doc.line(120, currentY, 190, currentY);
        doc.text("Felipe Augusto Belchior", 155, currentY + 5, { align: "center" });
        doc.setFontSize(8);
        doc.text("CEO Grupo Belchior", 155, currentY + 9, { align: "center" });
        doc.setFont("helvetica", "bold");
        doc.text("ASSINADO DIGITALMENTE", 155, currentY + 15, { align: "center" });

        doc.save(`Contrato_${selectedCliente.nome.replace(/\s+/g, '_')}.pdf`);
    };

    const handleCreateContract = async () => {
        if (!selectedCliente || (!selectedServico && !isCustomService)) {
            showStatus("error", "Por favor, selecione um cliente e um serviço.");
            return;
        }

        const serviceName = isCustomService ? customServiceName : selectedServico?.nome;
        const totalValue = isCustomService ? parseFloat(valorManual || "0") : selectedServico?.valorBase;

        try {
            await pb.collection('contratos_gerados').create({
                cliente: selectedCliente.nome,
                servico: serviceName,
                valor: totalValue,
                escopo: escopo,
                status: "Gerado",
                vencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 dias
            });
            showStatus("success", "Contrato gerado e salvo com sucesso!");
            generatePDF();
        } catch (err) {
            console.error("Error saving contract:", err);
            showStatus("error", "Erro ao salvar contrato no banco.");
        }
    };

    if (loading) {
        return <div className="flex-1 bg-slate-900 flex items-center justify-center text-white">Carregando dados do contrato...</div>;
    }

    return (
        <div className="flex-grow flex h-full overflow-hidden">
            {statusToast && (
                <div className={`fixed top-8 right-8 z-50 flex items-center gap-3 px-6 py-4 rounded-xl border animate-in slide-in-from-right-10 duration-300 ${statusToast.type === "success" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                    }`}>
                    {statusToast.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    <span className="font-bold text-sm tracking-wide">{statusToast.message}</span>
                </div>
            )}
            {/* Left Panel: Inputs */}
            <section className="w-[45%] h-full flex flex-col bg-slate-950/20 custom-scrollbar overflow-y-auto border-r border-slate-800">
                <header className="p-8 pb-4">
                    <div className="flex items-center gap-2 text-blue-500 dark:text-slate-400 text-sm mb-2">
                        <span>Módulos</span>
                        <ChevronRight className="w-4 h-4" />
                        <span>Contratos</span>
                        <ChevronRight className="w-4 h-4" />
                        <span className="text-white">Gerador Dinâmico</span>
                    </div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Novo Contrato</h2>
                    <p className="text-slate-400 text-sm mt-1">Configure as cláusulas e detalhes do serviço em tempo real.</p>
                </header>

                {/* Stepper */}
                <div className="px-8 py-4">
                    <div className="flex items-center justify-between bg-slate-800/40 backdrop-blur-md border border-slate-700/50 p-4 rounded-xl">
                        <div className="flex flex-col items-center gap-1 group">
                            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold border-2 border-blue-600 shadow-lg shadow-blue-500/20">1</div>
                            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-100">Dados</span>
                        </div>
                        <div className="h-[2px] bg-blue-600 flex-grow mx-2"></div>
                        <div className="flex flex-col items-center gap-1">
                            <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-slate-400 text-xs font-bold">2</div>
                            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Serviço</span>
                        </div>
                        <div className="h-[2px] bg-slate-800 flex-grow mx-2"></div>
                        <div className="flex flex-col items-center gap-1">
                            <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-slate-400 text-xs font-bold">3</div>
                            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Cronograma</span>
                        </div>
                        <div className="h-[2px] bg-slate-800 flex-grow mx-2"></div>
                        <div className="flex flex-col items-center gap-1">
                            <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-slate-400 text-xs font-bold">4</div>
                            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Pagamento</span>
                        </div>
                    </div>
                </div>

                {/* Input Fields */}
                <div className="px-8 py-4 space-y-6">
                    <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 p-6 rounded-xl space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <ShieldCheck className="w-6 h-6 text-blue-500" />
                            <h3 className="font-bold text-lg text-white">Dados do Cliente</h3>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Nome da Empresa / Cliente</label>
                                    <a href="/clientes" className="text-blue-500 hover:text-blue-400 p-1 flex items-center gap-1 transition-colors">
                                        <Plus className="w-3 h-3" />
                                        <span className="text-[10px] font-bold uppercase">Gerenciar</span>
                                    </a>
                                </div>
                                <select
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-3 px-4 text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    value={selectedCliente?.id || ""}
                                    onChange={(e) => {
                                        const client = clientes.find(c => c.id === e.target.value);
                                        if (client) setSelectedCliente(client);
                                    }}
                                >
                                    {clientes.map(c => (
                                        <option key={c.id} value={c.id}>{c.nome}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">CNPJ / CPF</label>
                                    <input
                                        className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-3 px-4 text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-slate-600"
                                        value={selectedCliente?.documento || ""}
                                        readOnly
                                        type="text"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">E-mail Financeiro</label>
                                    <input
                                        className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-3 px-4 text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-slate-600"
                                        value={selectedCliente?.email || ""}
                                        readOnly
                                        type="email"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 p-6 rounded-xl">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-6 h-6 text-blue-500" />
                                <h3 className="font-bold text-lg text-white">Signatário Responsável</h3>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input defaultChecked className="sr-only peer" type="checkbox" />
                                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                        <p className="text-slate-500 text-sm mt-2">Habilitar coleta de assinatura digital vinculada ao CPF do representante legal.</p>
                    </div>

                    <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 p-6 rounded-xl space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <FileText className="w-6 h-6 text-blue-500" />
                            <h3 className="font-bold text-lg text-white">Detalhes do Serviço</h3>
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Selecione o Serviço</label>
                                <a href="/servicos" className="text-blue-500 hover:text-blue-400 p-1 flex items-center gap-1 transition-colors">
                                    <Plus className="w-3 h-3" />
                                    <span className="text-[10px] font-bold uppercase">Gerenciar</span>
                                </a>
                            </div>
                            <select
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-3 px-4 text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all mb-4"
                                value={isCustomService ? "custom" : selectedServico?.id || ""}
                                onChange={(e) => {
                                    if (e.target.value === "custom") {
                                        setIsCustomService(true);
                                        setValorManual("");
                                        setEscopo("");
                                    } else {
                                        setIsCustomService(false);
                                        const service = servicos.find(s => s.id === e.target.value);
                                        if (service) {
                                            setSelectedServico(service);
                                            setEscopo(service.desc);
                                            setValorManual(service.valorBase.toString());
                                        }
                                    }
                                }}
                            >
                                {servicos.map(s => (
                                    <option key={s.id} value={s.id}>{s.nome} - R$ {Number(s.valorBase).toLocaleString('pt-BR')}</option>
                                ))}
                                <option value="custom">+ Serviço Personalizado</option>
                            </select>

                            {isCustomService && (
                                <div className="space-y-4 mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Nome do Serviço Customizado</label>
                                        <input
                                            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-3 px-4 text-white focus:ring-1 focus:ring-blue-500 transition-all outline-none"
                                            placeholder="Ex: Consultoria Especial"
                                            value={customServiceName}
                                            onChange={(e) => setCustomServiceName(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="mb-4">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Valor do Serviço (R$)</label>
                                <input
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-3 px-4 text-white focus:ring-1 focus:ring-blue-500 transition-all outline-none font-mono"
                                    placeholder="0,00"
                                    value={isCustomService ? valorManual : (selectedServico?.valorBase?.toString() || "")}
                                    onChange={(e) => isCustomService && setValorManual(e.target.value)}
                                    readOnly={!isCustomService}
                                />
                            </div>

                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Escopo Principal</label>
                            <textarea
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-3 px-4 text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-slate-600 min-h-[120px]"
                                value={escopo}
                                onChange={(e) => setEscopo(e.target.value)}
                                rows={3}
                            ></textarea>
                        </div>
                    </div>

                    <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 p-6 rounded-xl space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Clock className="w-6 h-6 text-blue-500" />
                            <h3 className="font-bold text-lg text-white">Cronograma e Entrega</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Prazo de Entrega</label>
                                <input
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-3 px-4 text-white focus:ring-1 focus:ring-blue-500 transition-all outline-none"
                                    value={prazoEntrega}
                                    onChange={(e) => setPrazoEntrega(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Unidade</label>
                                <input
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-3 px-4 text-white focus:ring-1 focus:ring-blue-500 transition-all outline-none"
                                    value={unidadePrazo}
                                    onChange={(e) => setUnidadePrazo(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 p-6 rounded-xl space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Wallet className="w-6 h-6 text-blue-500" />
                            <h3 className="font-bold text-lg text-white">Financeiro e Local</h3>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Forma de Pagamento</label>
                            <textarea
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-3 px-4 text-white focus:ring-1 focus:ring-blue-500 transition-all outline-none min-h-[80px]"
                                value={formaPagamento}
                                onChange={(e) => setFormaPagamento(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Cidade / Localidade (Data)</label>
                            <input
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-3 px-4 text-white focus:ring-1 focus:ring-blue-500 transition-all outline-none"
                                value={localidade}
                                onChange={(e) => setLocalidade(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-auto p-8 flex items-center justify-between border-t border-slate-800 bg-slate-900/90 backdrop-blur-md sticky bottom-0 z-10">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">Altas</span>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={sendContractWhatsApp}
                            className="bg-emerald-600/10 border border-emerald-500/20 text-emerald-500 hover:bg-emerald-600 hover:text-white font-bold py-3.5 px-6 rounded-xl flex items-center gap-3 transition-all active:scale-95 shadow-lg"
                        >
                            <MessageSquare className="w-5 h-5" />
                            <span>WhatsApp</span>
                        </button>
                        <button
                            onClick={handleCreateContract}
                            className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 px-8 rounded-xl flex items-center gap-3 transition-colors active:scale-95 shadow-lg shadow-blue-500/20"
                        >
                            <span>Gerar e Assinar</span>
                        </button>
                    </div>
                </div>
            </section>

            {/* Right Panel: Live Preview */}
            <section className="flex-grow h-full bg-slate-800 flex flex-col items-center justify-start p-10 overflow-y-auto custom-scrollbar relative">
                <div className="flex items-center justify-between w-full max-w-[800px] mb-6">
                    <h4 className="text-slate-400 font-bold text-sm uppercase tracking-widest">Visualização em Tempo Real</h4>
                    <div className="flex gap-2">
                        <button className="p-2 bg-slate-700 rounded-lg text-slate-300 hover:bg-slate-600 transition-colors shadow-sm">
                            <ZoomIn className="w-5 h-5" />
                        </button>
                        <button
                            onClick={generatePDF}
                            className="p-2 bg-blue-600 rounded-lg text-white hover:bg-blue-500 transition-colors shadow-sm flex items-center gap-2 px-4"
                        >
                            <Printer className="w-5 h-5" />
                            <span className="text-xs font-bold uppercase">Baixar PDF</span>
                        </button>
                    </div>
                </div>

                {/* A4 Document Wrapper with custom class in globals.css */}
                <div className="w-full max-w-[800px] bg-white rounded-sm p-12 text-slate-800 relative shadow-2xl min-h-[1131px]" style={{
                    backgroundImage: "radial-gradient(#e5e7eb 0.5px, transparent 0.5px)",
                    backgroundSize: "20px 20px"
                }}>
                    {/* Letterhead */}
                    <div className="flex justify-between items-start border-b-2 border-slate-200 pb-8 mb-10">
                        <div className="flex items-center gap-3">
                            <img src="/logo.png" alt="Logo" className="h-8 w-auto object-contain" />
                            <span className="text-xl font-black text-slate-900 tracking-tighter">VENTURE</span>
                        </div>
                        <div className="text-right text-[10px] text-slate-500 font-medium">
                            <p>VENTURE SOLUTIONS S.A.</p>
                            <p>Uma Empresa do Grupo Belchior Venture Business</p>
                            <p>CONTATO@VENTURE.COM.BR</p>
                        </div>
                    </div>

                    {/* Contract Body */}
                    <div className="space-y-6">
                        <h2 className="text-center text-xl font-bold uppercase tracking-widest mb-8 text-slate-900">Contrato de Prestação de Serviços</h2>

                        <div className="text-sm leading-relaxed space-y-6 text-slate-700">
                            {/* 1. PARTES */}
                            <section>
                                <h3 className="font-bold text-slate-900 uppercase mb-2">1. PARTES</h3>
                                <div className="space-y-2 pl-4 border-l-2 border-slate-100">
                                    <p><strong>1.1 CONTRATANTE:</strong></p>
                                    <p>Nome: {selectedCliente?.nome || "____________________"}</p>
                                    <p>CPF/CNPJ: {selectedCliente?.documento || "____________________"}</p>
                                    <p>Telefone: {selectedCliente?.telefone || "____________________"}</p>

                                    <p className="mt-4"><strong>1.2 CONTRATADO:</strong></p>
                                    <p>Nome: Grupo Belchior</p>
                                    <p>CNPJ: 46.105.907/0001-16</p>
                                    <p>Telefone: (19) 97154-4146</p>
                                    <p>E-mail: atendimento@grupobelchior.com</p>
                                </div>
                            </section>

                            {/* 2. OBJETIVO */}
                            <section>
                                <h3 className="font-bold text-slate-900 uppercase mb-2">2. OBJETIVO</h3>
                                <p className="pl-4">O presente contrato tem por objeto a prestação de serviços pelo Grupo Belchior em favor do Contratante, conforme as condições estabelecidas neste instrumento.</p>
                            </section>

                            {/* 3. DESCRIÇÃO DOS SERVIÇOS */}
                            <section>
                                <h3 className="font-bold text-slate-900 uppercase mb-2">3. DESCRIÇÃO DOS SERVIÇOS</h3>
                                <p className="pl-4">Os serviços a serem prestados pelo Grupo Belchior (Agencia Venture) compreendem <strong>{isCustomService ? customServiceName : selectedServico?.nome}</strong> conforme especificado no Anexo A, que faz parte integrante deste contrato.</p>
                                <p className="pl-4 mt-2 italic text-slate-500">[{escopo}]</p>
                            </section>

                            {/* 4. CONDIÇÕES FINANCEIRA */}
                            <section>
                                <h3 className="font-bold text-slate-900 uppercase mb-2">4. CONDIÇÕES FINANCEIRA</h3>
                                <p className="pl-4"><strong>4.1 VALOR E FORMA DE PAGAMENTO:</strong></p>
                                <p className="pl-4">O valor total dos serviços contratados é de <strong>R$ {isCustomService ? Number(valorManual || 0).toLocaleString('pt-BR') : Number(selectedServico?.valorBase || 0).toLocaleString('pt-BR')}</strong>. O pagamento será efetuado da seguinte forma: {formaPagamento}</p>
                            </section>

                            {/* 5. PRAZO E ENTREGA */}
                            <section>
                                <h3 className="font-bold text-slate-900 uppercase mb-2">5. PRAZO E ENTREGA</h3>
                                <p className="pl-4">O prazo de entrega dos arquivo será de <strong>{prazoEntrega} {unidadePrazo}</strong>. Qualquer alteração no prazo será comunicada e acordada entre as partes.</p>
                            </section>

                            <p className="text-[10px] text-slate-400 pt-8 italic">* Cláusulas de Direitos Autorais, Cancelamento e Responsabilidades permanecem conforme padrão do Grupo Belchior.</p>

                            <div className="pt-8 text-right font-medium">
                                {localidade}, {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            </div>
                        </div>
                    </div>

                    {/* Signature Section */}
                    <div className="mt-20 pt-10 border-t border-slate-200">
                        <div className="grid grid-cols-2 gap-12">
                            <div className="flex flex-col items-center">
                                <div className="w-full border-b border-slate-300 mb-2"></div>
                                <div className="text-center text-[11px] text-slate-700">
                                    <p className="font-bold">{selectedCliente?.nome || "____________________"}</p>
                                    <p>{selectedCliente?.documento || "000.000.000-00"}</p>
                                    <p className="uppercase text-[9px] text-slate-500 mt-1">Titular Responsável</p>
                                </div>
                            </div>

                            <div className="flex flex-col items-center">
                                <div className="w-full border-b border-slate-300 mb-2"></div>
                                <div className="text-center text-[11px] text-slate-700">
                                    <p className="font-bold">Felipe Augusto Belchior</p>
                                    <p>CEO Grupo Belchior</p>
                                    <div className="mt-2 p-1.5 bg-emerald-50 rounded border border-emerald-100 flex items-center gap-1.5">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                        <span className="text-[8px] font-bold text-emerald-600 uppercase">Assinado Digitalmente</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Watermark Logo */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none -rotate-12">
                        <span className="text-8xl font-black text-slate-900">GRUPO BELCHIOR</span>
                    </div>
                </div>

                <div className="mt-8 text-slate-400 text-xs flex items-center gap-6 pb-12">
                    <span className="flex items-center gap-2 font-medium">
                        <Lock className="w-4 h-4" /> Criptografia de ponta-a-ponta
                    </span>
                    <span className="flex items-center gap-2 font-medium">
                        <History className="w-4 h-4" /> Backup automático habilitado
                    </span>
                </div>
            </section>
        </div>
    );
}

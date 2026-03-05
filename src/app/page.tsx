"use client";

import { useState, useEffect } from "react";
import { Search, Bell, Plus, TrendingUp, TrendingDown, Wallet, BarChart2, Filter, Receipt, MoreVertical } from "lucide-react";
import { pb, authenticate } from "@/lib/pocketbase";
import { Modal } from "@/components/Modal";

interface Lead {
  id: string;
  nome: string;
  empresa: string;
  valor: string;
  status: string;
}

interface Contract {
  id: string;
  cliente: string;
  projeto: string;
  status: string;
  expiracao: string;
  valor: string;
}

interface Invoice {
  id: string;
  cliente: string;
  valor: string;
  status: string;
}

export default function Dashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [contratos, setContratos] = useState<Contract[]>([]);
  const [faturas, setFaturas] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newLead, setNewLead] = useState({
    nome: "",
    empresa: "",
    origem: "Ads",
    valor: "R$ 0",
    score: 50,
    status: "novos"
  });

  useEffect(() => {
    async function loadData() {
      await authenticate();
      try {
        await authenticate();

        // Leads
        try {
          const leadsList = await pb.collection('leads').getFullList<any>({ requestKey: null });
          setLeads(leadsList);
        } catch (e) {
          console.error("Error fetching leads:", e);
        }

        // Faturas
        try {
          const faturasList = await pb.collection('faturas').getList<any>(1, 5, { requestKey: null });
          setFaturas(faturasList.items.map(f => ({
            id: f.id.slice(0, 5),
            cliente: f.cliente,
            valor: f.valor,
            status: f.status
          })));
        } catch (e) {
          console.error("Error fetching faturas:", e);
        }

        // Contratos
        try {
          const contratosGerados = await pb.collection('contratos_gerados').getList<any>(1, 5, { requestKey: null });
          setContratos(contratosGerados.items.map(c => ({
            id: c.id,
            cliente: c.cliente,
            projeto: c.servico || "Serviço Geral",
            status: c.status || "Ativo",
            expiracao: c.vencimento ? new Date(c.vencimento).toLocaleDateString() : "Sem expiração",
            valor: c.valor ? `R$ ${c.valor.toLocaleString('pt-BR')}` : "R$ 0"
          })));
        } catch (e) {
          console.error("Error fetching contratos:", e);
        }
      } catch (err) {
        console.error('Initial auth or loading error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();

    // Subscribe to changes
    const unsubscribe = pb.collection('leads').subscribe('*', function (e) {
      loadData();
    });

    return () => {
      unsubscribe.then(unsub => unsub());
    };
  }, []);

  async function handleCreateLead() {
    try {
      await pb.collection('leads').create(newLead);
      setIsModalOpen(false);
      setNewLead({
        nome: "",
        empresa: "",
        origem: "Ads",
        valor: "R$ 0",
        score: 50,
        status: "novos"
      });
    } catch (err) {
      console.error('Error creating lead:', err);
      alert('Erro ao criar lead.');
    }
  }

  if (loading) {
    return <div className="flex-1 bg-slate-900 flex items-center justify-center text-white">Carregando painel de controle...</div>;
  }

  return (
    <>
      {/* Header */}
      <header className="h-20 border-b border-slate-800 flex items-center justify-between px-10 sticky top-0 bg-slate-900/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-8 flex-1">
          <h2 className="text-xl font-bold text-white">Visão Geral</h2>
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              className="w-full bg-slate-800 border-none rounded py-2.5 pl-11 pr-4 text-sm focus:ring-2 focus:ring-blue-500/40 transition-all text-slate-200 outline-none placeholder:text-slate-500"
              placeholder="Pesquisar faturas, leads ou contratos..."
              type="text"
            />
          </div>
        </div>
        <div className="flex items-center gap-6">
          <button className="relative text-slate-400 hover:text-white transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-slate-900"></span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 px-4 py-2 rounded text-white text-sm font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" />
            Nova Ação
          </button>
        </div>
      </header>

      <div className="p-10 space-y-8 overflow-y-auto custom-scrollbar flex-1">
        {/* Modal for New Lead on Dashboard */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Nova Ação: Cadastrar Lead"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 text-left">Nome do Contato</label>
              <input
                className="w-full bg-slate-800 border border-slate-700 rounded px-4 py-2.5 text-white outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Ex: Pedro Alvares"
                value={newLead.nome}
                onChange={(e) => setNewLead({ ...newLead, nome: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 text-left">Empresa</label>
              <input
                className="w-full bg-slate-800 border border-slate-700 rounded px-4 py-2.5 text-white outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Ex: Navio S.A."
                value={newLead.empresa}
                onChange={(e) => setNewLead({ ...newLead, empresa: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 text-left">Origem</label>
                <select
                  className="w-full bg-slate-800 border border-slate-700 rounded px-4 py-2.5 text-white outline-none focus:ring-1 focus:ring-blue-500 appearance-none text-sm"
                  value={newLead.origem}
                  onChange={(e) => setNewLead({ ...newLead, origem: e.target.value })}
                >
                  <option value="Ads">Ads</option>
                  <option value="Orgânico">Orgânico</option>
                  <option value="Indicação">Indicação</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 text-left">Valor Estimado</label>
                <input
                  className="w-full bg-slate-800 border border-slate-700 rounded px-4 py-2.5 text-white outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="R$ 10.000"
                  value={newLead.valor}
                  onChange={(e) => setNewLead({ ...newLead, valor: e.target.value })}
                />
              </div>
            </div>
            <div className="pt-4">
              <button
                onClick={handleCreateLead}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded transition-all shadow-lg active:scale-[0.98]"
              >
                Cadastrar Lead Agora
              </button>
            </div>
          </div>
        </Modal>
        {/* Financial Overview Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-800 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <p className="text-sm font-medium text-slate-400">Receita Mensal</p>
              <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-full">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-white">R$ 0,00</h3>
            <p className="text-xs mt-2 font-medium text-emerald-500">
              0% <span className="text-slate-500">vs mês anterior</span>
            </p>
          </div>

          <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-800 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <p className="text-sm font-medium text-slate-400">Despesas</p>
              <div className="p-2 bg-red-500/10 text-red-500 rounded-full">
                <TrendingDown className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-white">R$ 0,00</h3>
            <p className="text-xs mt-2 font-medium text-red-400">
              0% <span className="text-slate-500">vs mês anterior</span>
            </p>
          </div>

          <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-800 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <p className="text-sm font-medium text-slate-400">Saldo Operacional</p>
              <div className="p-2 bg-blue-500/10 text-blue-500 rounded-full">
                <Wallet className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-white">R$ 0,00</h3>
            <p className="text-xs mt-2 font-medium text-slate-400">Total acumulado</p>
          </div>

          <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-800 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <p className="text-sm font-medium text-slate-400">Taxa de Conversão</p>
              <div className="p-2 bg-purple-500/10 text-purple-500 rounded-full">
                <BarChart2 className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-white">0%</h3>
            <p className="text-xs mt-2 font-medium text-emerald-500">
              0% <span className="text-slate-500">estável</span>
            </p>
          </div>
        </section>

        {/* Charts & Pipeline */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Revenue Chart Area */}
          <div className="lg:col-span-2 bg-slate-800/30 p-6 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h4 className="text-lg font-bold text-white">Fluxo de Caixa</h4>
                <p className="text-xs text-slate-400">Análise de performance dos últimos 6 meses</p>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1 text-xs font-medium rounded border border-slate-700 text-slate-400 hover:text-white transition-colors">Mensal</button>
                <button className="px-3 py-1 text-xs font-medium rounded bg-blue-600 text-white transition-colors hover:bg-blue-700">Anual</button>
              </div>
            </div>
            <div className="h-64 flex flex-col justify-between">
              <svg className="w-full h-full" fill="none" preserveAspectRatio="none" viewBox="0 0 478 150" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 109C18.1538 109 18.1538 21 36.3077 21C54.4615 21 54.4615 41 72.6154 41C90.7692 41 90.7692 93 108.923 93C127.077 93 127.077 33 145.231 33C163.385 33 163.385 101 181.538 101C199.692 101 199.692 61 217.846 61C236 61 236 45 254.154 45C272.308 45 272.308 121 290.462 121C308.615 121 308.615 149 326.769 149C344.923 149 344.923 1 363.077 1C381.231 1 381.231 81 399.385 81C417.538 81 417.538 129 435.692 129C453.846 129 453.846 25 472 25V149H326.769H0V109Z" fill="url(#chart_gradient)"></path>
                <path d="M0 109C18.1538 109 18.1538 21 36.3077 21C54.4615 21 54.4615 41 72.6154 41C90.7692 41 90.7692 93 108.923 93C127.077 93 127.077 33 145.231 33C163.385 33 163.385 101 181.538 101C199.692 101 199.692 61 217.846 61C236 61 236 45 254.154 45C272.308 45 272.308 121 290.462 121C308.615 121 308.615 149 326.769 149C344.923 149 344.923 1 363.077 1C381.231 1 381.231 81 399.385 81C417.538 81 417.538 129 435.692 129C453.846 129 453.846 25 472 25" stroke="#3b82f6" strokeLinecap="round" strokeWidth="4"></path>
                <defs>
                  <linearGradient id="chart_gradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3"></stop>
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0"></stop>
                  </linearGradient>
                </defs>
              </svg>
              <div className="flex justify-between mt-4 px-2">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Jan</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase">Fev</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase">Mar</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase">Abr</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase">Mai</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase">Jun</p>
              </div>
            </div>
          </div>

          {/* Lead Pipeline */}
          <div className="bg-slate-800/30 p-6 rounded-xl border border-slate-800 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-lg font-bold text-white">Pipeline de Leads</h4>
              <button className="text-xs font-bold text-blue-500 uppercase hover:text-blue-400">Ver todos</button>
            </div>

            <div className="space-y-4 flex-1">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-slate-400 uppercase">Novos ({leads.filter(l => l.status === 'novos').length})</span>
                </div>
                <div className="flex -space-x-2">
                  {leads.filter(l => l.status === 'novos').map((lead, i) => (
                    <div key={lead.id} className={`w-8 h-8 rounded-full border-2 border-slate-900 bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold`}>{lead.nome?.slice(0, 2).toUpperCase() || '??'}</div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-slate-800/50 rounded-lg border-l-4 border-yellow-500">
                <p className="text-xs font-bold text-slate-400 uppercase mb-3">Em Negociação</p>
                <div className="space-y-3">
                  {leads.filter(l => l.status === 'descoberta' || l.status === 'estrategica').slice(0, 2).map((lead, i) => (
                    <div key={lead.id} className="bg-slate-900 p-3 rounded-lg border border-slate-700/50 text-sm">
                      <p className="font-semibold text-slate-200">{lead.empresa}</p>
                      <p className="text-xs text-slate-400 mt-1">{lead.valor} • Alta chance</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-slate-800/50 rounded-lg border-l-4 border-emerald-500">
                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Fechados (Mês)</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-white">{leads.filter(l => l.status === 'fechamento').length}</span>
                  <span className="text-xs font-medium text-emerald-500">Pipeline Atualizado</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Tables Section */}
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-8 pb-10">
          {/* Contract Management */}
          <div className="bg-slate-800/30 rounded-xl border border-slate-800 overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/20">
              <h4 className="text-lg font-bold text-white">Gestão de Contratos</h4>
              <button className="text-slate-400 hover:text-white transition-colors">
                <Filter className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap">
                <thead>
                  <tr className="text-[11px] font-bold text-slate-500 uppercase tracking-widest bg-slate-900/50">
                    <th className="px-6 py-4">Cliente / Projeto</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Expiração</th>
                    <th className="px-6 py-4 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-sm">
                  {contratos.map(c => (
                    <tr key={c.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-200">{c.cliente}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{c.projeto}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-md 
                          ${c.status === 'Ativo' ? 'bg-emerald-500/10 text-emerald-400' :
                            c.status === 'Assinado' ? 'bg-blue-500/10 text-blue-400' :
                              'bg-yellow-500/10 text-yellow-500'}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400">{c.expiracao}</td>
                      <td className="px-6 py-4 text-right font-medium text-slate-200">{c.valor}</td>
                    </tr>
                  ))}
                  {contratos.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-slate-500 font-medium">
                        Nenhum contrato gerado até o momento.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Invoices */}
          <div className="bg-slate-800/30 rounded-xl border border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/20">
              <h4 className="text-lg font-bold text-white">Faturas Recentes</h4>
              <button className="text-slate-400 hover:text-white text-xs font-bold uppercase transition-colors">Exportar PDF</button>
            </div>
            <div className="divide-y divide-slate-800">
              {faturas.map(f => (
                <div key={f.id} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-800/50 transition-colors group cursor-pointer">
                  <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center border border-slate-700/50 group-hover:border-blue-500/30 transition-colors">
                    <Receipt className="w-5 h-5 text-slate-400 group-hover:text-blue-400 transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-200 truncate">Fatura #{f.id}</p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">Emitida para {f.cliente}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-200">{f.valor}</p>
                    <p className={`text-[10px] font-bold uppercase mt-0.5
                      ${f.status === 'Pago' ? 'text-emerald-400' :
                        f.status === 'Aguardando' ? 'text-yellow-500' :
                          'text-red-400'}`}>
                      {f.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

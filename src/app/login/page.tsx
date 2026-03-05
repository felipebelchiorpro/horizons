"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { pb } from "@/lib/pocketbase";
import { Briefcase, Mail, Lock, AlertCircle, ArrowRight } from "lucide-react";

export default function Login() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const [formData, setFormData] = useState({
        email: "",
        password: "",
        remember: false
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setFormData({ ...formData, [e.target.name]: value });
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg("");

        if (!formData.email || !formData.password) {
            setErrorMsg("Preencha e-mail e senha.");
            return;
        }

        setLoading(true);

        try {
            await pb.collection('users').authWithPassword(formData.email, formData.password);
            // PocketBase salva token automaticamente no LocalStorage

            // Força router para Dashboard após login
            router.push('/');
        } catch (err: any) {
            console.error("Erro ao fazer login:", err);
            setErrorMsg("Credenciais inválidas. Verifique seu e-mail e senha.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none"></div>
            <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none"></div>

            <div className="w-full max-w-5xl flex rounded-3xl overflow-hidden bg-slate-800/40 border border-slate-700/50 backdrop-blur-xl shadow-2xl shadow-blue-900/10 min-h-[600px] z-10">

                {/* Left Side - Welcome Panel */}
                <div className="hidden lg:flex w-5/12 bg-slate-800/80 p-12 flex-col justify-center items-center relative overflow-hidden border-r border-slate-700/50">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay"></div>

                    <div className="relative z-10 text-center flex flex-col items-center">
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl flex items-center justify-center mb-8 shadow-lg shadow-blue-500/20 transform -rotate-6">
                            <Briefcase className="w-10 h-10 text-white transform rotate-6" />
                        </div>

                        <h1 className="text-3xl font-bold text-white leading-tight mb-4">
                            Bem-vindo de volta ao Horizons
                        </h1>
                        <p className="text-slate-400 text-base leading-relaxed max-w-sm">
                            Acesse seu painel para continuar gerenciando projetos, finanças e acompanhamento de equipe.
                        </p>
                    </div>
                </div>

                {/* Right Side - Form */}
                <div className="flex-1 p-8 lg:p-14 flex flex-col justify-center">
                    <div className="max-w-md w-full mx-auto">
                        <div className="text-center lg:text-left mb-10">
                            <h2 className="text-3xl font-bold text-white mb-2">Login</h2>
                            <p className="text-slate-400">Insira suas credenciais para entrar</p>
                        </div>

                        {errorMsg && (
                            <div className="mb-6 bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl flex items-start gap-3 text-sm">
                                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                <p>{errorMsg}</p>
                            </div>
                        )}

                        <form onSubmit={handleLogin} className="space-y-6">
                            <div className="space-y-5">
                                <div className="relative">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">E-mail Corporativo</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            required
                                            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl pl-12 pr-4 py-4 text-white outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-600"
                                            placeholder="seu@email.com"
                                        />
                                    </div>
                                </div>

                                <div className="relative">
                                    <div className="flex justify-between items-end mb-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Senha</label>
                                        <a href="#" className="text-xs text-blue-500 hover:text-blue-400 font-medium">Esqueci minha senha</a>
                                    </div>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                        <input
                                            type="password"
                                            name="password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            required
                                            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl pl-12 pr-4 py-4 text-white outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-600"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <input
                                    id="remember"
                                    name="remember"
                                    type="checkbox"
                                    checked={formData.remember}
                                    onChange={handleChange}
                                    className="w-4 h-4 rounded-md border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-600/50 cursor-pointer"
                                />
                                <label htmlFor="remember" className="text-sm text-slate-400 cursor-pointer select-none">
                                    Manter conectado
                                </label>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98] flex items-center justify-center gap-2 group mt-8 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Autenticando...' : 'Entrar na Plataforma'}
                                {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                            </button>
                        </form>

                        <div className="mt-8 text-center pt-8 border-t border-slate-800">
                            <p className="text-sm text-slate-400">
                                Não possui acesso? {' '}
                                <Link href="/cadastro" className="text-blue-500 font-bold hover:text-blue-400 transition-colors">
                                    Crie sua conta
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

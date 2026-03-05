"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { pb } from "@/lib/pocketbase";
import { Briefcase, Mail, Lock, User, AlertCircle, ArrowRight, ShieldCheck } from "lucide-react";

export default function Cadastro() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        passwordConfirm: "",
        cargo: "",
        nivel_acesso: "Colaborador",
        terms: false
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
        setFormData({ ...formData, [e.target.name]: value });
    };

    const getPasswordStrength = () => {
        const pwd = formData.password;
        if (!pwd) return { label: "", color: "bg-slate-700", width: "w-0", textClass: "" };

        let strength = 0;
        if (pwd.length >= 8) strength += 25;
        if (pwd.match(/[a-z]+/)) strength += 25;
        if (pwd.match(/[A-Z]+/)) strength += 25;
        if (pwd.match(/[0-9]+/)) strength += 25;

        if (strength <= 25) return { label: "Fraca", color: "bg-rose-500", width: "w-1/4", textClass: "text-rose-500" };
        if (strength <= 50) return { label: "Média", color: "bg-amber-500", width: "w-2/4", textClass: "text-amber-500" };
        if (strength <= 75) return { label: "Boa", color: "bg-emerald-400", width: "w-3/4", textClass: "text-emerald-400" };
        return { label: "Forte", color: "bg-emerald-600", width: "w-full", textClass: "text-emerald-500" };
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg("");

        if (!formData.name || !formData.email || !formData.password || !formData.cargo) {
            setErrorMsg("Preencha todos os campos obrigatórios.");
            return;
        }

        if (formData.password !== formData.passwordConfirm) {
            setErrorMsg("As senhas não coincidem.");
            return;
        }

        if (!formData.terms) {
            setErrorMsg("Você precisa aceitar os termos de uso.");
            return;
        }

        setLoading(true);

        try {
            // No PocketBase, a auth provider nativa cria um "user"
            const dataToCreate = {
                email: formData.email,
                emailVisibility: true,
                password: formData.password,
                passwordConfirm: formData.passwordConfirm,
                name: formData.name,
                cargo: formData.cargo,
                nivel_acesso: formData.nivel_acesso
            };

            await pb.collection('users').create(dataToCreate);

            // Auto Login após criar a conta
            await pb.collection('users').authWithPassword(formData.email, formData.password);

            router.push('/');
        } catch (err: any) {
            console.error("Erro ao criar conta:", err);
            setErrorMsg(err.message || "Erro desconhecido ao criar conta. Verifique os dados ou se o email já existe.");
        } finally {
            setLoading(false);
        }
    };

    const pwdStrength = getPasswordStrength();

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none"></div>

            <div className="w-full max-w-5xl flex rounded-3xl overflow-hidden bg-slate-800/40 border border-slate-700/50 backdrop-blur-xl shadow-2xl shadow-blue-900/10 h-[85vh] min-h-[600px] z-10">

                {/* Left Side - Welcome Panel */}
                <div className="hidden lg:flex w-5/12 bg-gradient-to-br from-blue-600 to-indigo-800 p-12 flex-col justify-between relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>

                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-12">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                                <Briefcase className="w-6 h-6 text-blue-600" />
                            </div>
                            <span className="text-white text-2xl font-bold tracking-wider">Horizons</span>
                        </div>

                        <h1 className="text-4xl font-bold text-white leading-tight mb-6">
                            Sua equipe.<br />Seu tempo.<br />Seu crescimento.
                        </h1>
                        <p className="text-blue-100/80 text-lg leading-relaxed max-w-sm">
                            Junte-se ao sistema de gestão estratégica e operacional que transforma esforço em inteligência.
                        </p>
                    </div>

                    <div className="relative z-10">
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                                    <ShieldCheck className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h4 className="text-white font-bold">Acesso Seguro</h4>
                                    <p className="text-blue-200 text-sm">Criptografia ponta a ponta</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side - Form */}
                <div className="flex-1 p-8 lg:p-14 flex flex-col justify-center overflow-y-auto custom-scrollbar relative">
                    <div className="max-w-md w-full mx-auto">
                        <div className="text-center lg:text-left mb-10">
                            <h2 className="text-3xl font-bold text-white mb-2">Criar Conta</h2>
                            <p className="text-slate-400">Insira seus dados para obter acesso ao portal</p>
                        </div>

                        {errorMsg && (
                            <div className="mb-6 bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl flex items-start gap-3 text-sm">
                                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                <p>{errorMsg}</p>
                            </div>
                        )}

                        <form onSubmit={handleSignup} className="space-y-5">
                            <div className="space-y-5">
                                <div className="relative">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Nome Completo</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            required
                                            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl pl-12 pr-4 py-3.5 text-white outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-600"
                                            placeholder="Ex: João Silva"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="relative">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Cargo</label>
                                        <input
                                            type="text"
                                            name="cargo"
                                            value={formData.cargo}
                                            onChange={handleChange}
                                            required
                                            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3.5 text-white outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-600"
                                            placeholder="Ex: Dev Jr"
                                        />
                                    </div>
                                    <div className="relative">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Perfil</label>
                                        <select
                                            name="nivel_acesso"
                                            value={formData.nivel_acesso}
                                            onChange={handleChange}
                                            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3.5 text-white outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 appearance-none cursor-pointer"
                                        >
                                            <option value="Colaborador">Colaborador</option>
                                            <option value="Admin">Gestor / Admin</option>
                                        </select>
                                    </div>
                                </div>

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
                                            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl pl-12 pr-4 py-3.5 text-white outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-600"
                                            placeholder="seu@email.com"
                                        />
                                    </div>
                                </div>

                                <div className="relative">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Senha Segura</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                        <input
                                            type="password"
                                            name="password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            required
                                            minLength={8}
                                            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl pl-12 pr-4 py-3.5 text-white outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-600"
                                            placeholder="Mínimo de 8 caracteres"
                                        />
                                    </div>
                                    {/* Password Strength Meter */}
                                    {formData.password && (
                                        <div className="mt-2">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-[10px] text-slate-400 font-medium">Força da senha</span>
                                                <span className={`text-[10px] font-bold ${pwdStrength.textClass}`}>{pwdStrength.label}</span>
                                            </div>
                                            <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                                                <div className={`h-full transition-all duration-300 ${pwdStrength.color} ${pwdStrength.width}`}></div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="relative">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Confirmar Senha</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                        <input
                                            type="password"
                                            name="passwordConfirm"
                                            value={formData.passwordConfirm}
                                            onChange={handleChange}
                                            required
                                            minLength={8}
                                            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl pl-12 pr-4 py-3.5 text-white outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-600"
                                            placeholder="Repita a senha"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 pt-2">
                                <div className="flex items-center h-5">
                                    <input
                                        id="terms"
                                        name="terms"
                                        type="checkbox"
                                        checked={formData.terms}
                                        onChange={handleChange}
                                        className="w-4 h-4 rounded-md border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-600/50 focus:ring-offset-slate-900"
                                    />
                                </div>
                                <label htmlFor="terms" className="text-xs text-slate-400">
                                    Eu concordo com os <a href="#" className="text-blue-500 hover:text-blue-400 underline decoration-slate-600">Termos de Uso</a> e a <a href="#" className="text-blue-500 hover:text-blue-400 underline decoration-slate-600">Política de Privacidade</a> do Horizons.
                                </label>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98] flex items-center justify-center gap-2 group mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Criando Conta...' : 'Finalizar Cadastro'}
                                {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                            </button>
                        </form>

                        <div className="mt-8 text-center">
                            <p className="text-sm text-slate-400">
                                Já possui uma conta? {' '}
                                <Link href="/login" className="text-blue-500 font-bold hover:text-blue-400 transition-colors">
                                    Faça Login
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

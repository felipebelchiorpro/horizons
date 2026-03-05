"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { pb } from "@/lib/pocketbase";
import {
    User, Camera, Mail, Lock, Briefcase, Clock, ShieldCheck,
    Moon, Sun, LogOut, CheckCircle2, AlertCircle, Save
} from "lucide-react";

export default function Perfil() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Stats
    const [projetosCount, setProjetosCount] = useState(0);
    const [horasCount, setHorasCount] = useState(0);

    // Form states
    const [formData, setFormData] = useState({
        name: "",
        bio: "",
        cargo: ""
    });

    const [theme, setTheme] = useState("dark"); // Dark padrão do tailwind local
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string>("");

    const [successMsg, setSuccessMsg] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const currentUser = pb.authStore.model;
        if (!pb.authStore.isValid || !currentUser) {
            router.push('/login');
            return;
        }

        setUser(currentUser);
        setFormData({
            name: currentUser.name || currentUser.username || "",
            bio: currentUser.bio || "",
            cargo: currentUser.cargo || ""
        });

        if (currentUser.avatar) {
            setAvatarPreview(pb.files.getURL(currentUser, currentUser.avatar));
        }

        // Lógicas visuais de tema (persistência)
        const savedTheme = localStorage.getItem('horizons-theme') || 'dark';
        setTheme(savedTheme);

        fetchUserStats(currentUser.id);

        setLoading(false);
    }, []);

    const fetchUserStats = async (userId: string) => {
        try {
            // Conta os projetos ativos
            // Usando relacionamento projet.responsavel_id (Tabela Users -> Projeto)
            const pts = await pb.collection('projetos').getList(1, 1, {
                filter: `responsavel_id = '${userId}' && status != 'Concluído'`,
                requestKey: null
            });
            setProjetosCount(pts.totalItems);

            // Soma horas da tabela time_logs da semana
            const logs = await pb.collection('time_logs').getFullList({
                filter: `id_colaborador = '${userId}' && data_fim != ''`,
                requestKey: null
            });

            let totalHoras = 0;
            // Para simplificar, vou somar de todos, mas você poderia filtrar a data aqui.
            logs.forEach(l => {
                const s = new Date(l.data_inicio).getTime();
                const e = new Date(l.data_fim).getTime();
                totalHoras += (e - s) / (1000 * 60 * 60);
            });
            setHorasCount(totalHoras);
        } catch (e: any) {
            console.warn("Aviso ao carregar stats do usuário:", e.message);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            setAvatarFile(file);
            // Criar URL local para preview imediato
            setAvatarPreview(URL.createObjectURL(file));
        }
    };

    const handleSaveProfile = async () => {
        if (!user) return;
        setSaving(true);
        setErrorMsg("");
        setSuccessMsg("");

        try {
            const fData = new FormData();
            fData.append('name', formData.name);
            fData.append('cargo', formData.cargo);
            fData.append('bio', formData.bio);

            if (avatarFile) {
                fData.append('avatar', avatarFile);
            }

            const updatedUser = await pb.collection('users').update(user.id, fData);
            setUser(updatedUser);

            // Reload avatar URL if updated
            if (avatarFile && updatedUser.avatar) {
                setAvatarPreview(pb.files.getURL(updatedUser, updatedUser.avatar));
                setAvatarFile(null); // Clear pending file
            }

            setSuccessMsg("Perfil atualizado com sucesso!");
            setTimeout(() => setSuccessMsg(""), 3000);
        } catch (err: any) {
            console.error("Erro ao salvar:", err);
            setErrorMsg("Falha ao atualizar perfil: " + (err.message || ''));
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = () => {
        pb.authStore.clear();
        router.push('/login');
    };

    const toggleTheme = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        localStorage.setItem('horizons-theme', newTheme);
        // Exemplo simplificado. Num tailwind full real precisaria adicionar class 'light'/'dark' no HTML
        document.documentElement.classList.toggle('dark', newTheme === 'dark');
        document.documentElement.classList.toggle('light', newTheme === 'light');
    };

    if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Carregando painel...</div>;

    // Theme dynamic classes mapping logic
    const tc = theme === 'dark'
        ? { bgPanel: 'bg-slate-800/40', textPrimary: 'text-white', textSec: 'text-slate-400', border: 'border-slate-700/50', inputBg: 'bg-slate-900/50' }
        : { bgPanel: 'bg-white', textPrimary: 'text-slate-900', textSec: 'text-slate-500', border: 'border-slate-200', inputBg: 'bg-slate-50' };

    return (
        <div className={`flex-1 flex flex-col min-w-0 h-full overflow-y-auto custom-scrollbar transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-50'}`}>
            <header className={`h-20 flex items-center justify-between px-8 border-b ${tc.border} ${theme === 'dark' ? 'bg-slate-900/50' : 'bg-white/50'} backdrop-blur-md sticky top-0 z-20 transition-colors`}>
                <h2 className={`text-xl font-bold ${tc.textPrimary}`}>Gestão de Perfil</h2>
                <div className="flex items-center gap-4">
                    <button
                        onClick={toggleTheme}
                        className={`p-2 rounded-xl border ${tc.border} transition-colors ${theme === 'dark' ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'}`}
                        title="Alternar Tema"
                    >
                        {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </button>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        Sair
                    </button>
                </div>
            </header>

            <main className="p-8 max-w-6xl mx-auto w-full">

                {errorMsg && (
                    <div className="mb-6 bg-rose-500/10 border border-rose-500/20 text-rose-500 p-4 rounded-xl flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <p>{errorMsg}</p>
                    </div>
                )}
                {successMsg && (
                    <div className="mb-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 p-4 rounded-xl flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                        <p>{successMsg}</p>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Column - Card Profile */}
                    <div className="lg:col-span-1 space-y-8">

                        {/* Avatar & ID Card */}
                        <div className={`${tc.bgPanel} border ${tc.border} rounded-3xl p-8 text-center relative overflow-hidden transition-colors`}>
                            {user?.nivel_acesso === 'Admin' && (
                                <div className="absolute top-4 right-4 bg-amber-500/20 text-amber-500 text-xs font-bold px-3 py-1 rounded-full border border-amber-500/20 flex items-center gap-1">
                                    <ShieldCheck className="w-3 h-3" />
                                    Admin
                                </div>
                            )}

                            <div className="relative w-32 h-32 mx-auto mb-6 group">
                                <div className={`w-full h-full rounded-full overflow-hidden border-4 ${theme === 'dark' ? 'border-slate-800' : 'border-white'} shadow-xl bg-slate-200`}>
                                    {avatarPreview ? (
                                        <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className={`w-full h-full flex items-center justify-center ${theme === 'dark' ? 'bg-slate-700 text-slate-500' : 'bg-slate-200 text-slate-400'}`}>
                                            <User className="w-12 h-12" />
                                        </div>
                                    )}
                                </div>
                                <label
                                    className="absolute bottom-0 right-0 w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center cursor-pointer shadow-lg transition-transform hover:scale-110"
                                    title="Alterar Foto"
                                >
                                    <Camera className="w-4 h-4" />
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                    />
                                </label>
                            </div>

                            <h3 className={`text-2xl font-bold ${tc.textPrimary} mb-1`}>{user?.name}</h3>
                            <p className={`${tc.textSec} font-medium mb-4`}>{user?.cargo || "Sem cargo definido"}</p>
                            <p className={`text-sm ${tc.textSec} px-4 border-t ${tc.border} pt-4`}>
                                {user?.bio ? `"${user.bio}"` : "Adicione uma bio curta nas configurações ao lado."}
                            </p>
                        </div>

                        {/* Stats Dashboard */}
                        <div className={`${tc.bgPanel} border ${tc.border} rounded-3xl p-6 transition-colors`}>
                            <h4 className={`text-sm font-bold ${tc.textSec} uppercase tracking-widest mb-6`}>Resumo de Atividades</h4>

                            <div className="space-y-4">
                                <div className={`flex items-center justify-between p-4 rounded-xl ${tc.inputBg} border ${tc.border}`}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                                            <Briefcase className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className={`text-sm font-medium ${tc.textPrimary}`}>Projetos Ativos</p>
                                            <p className={`text-xs ${tc.textSec}`}>Atribuídos a você</p>
                                        </div>
                                    </div>
                                    <span className="text-2xl font-bold text-blue-500">{projetosCount}</span>
                                </div>

                                <div className={`flex items-center justify-between p-4 rounded-xl ${tc.inputBg} border ${tc.border}`}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                                            <Clock className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className={`text-sm font-medium ${tc.textPrimary}`}>Horas Acumuladas</p>
                                            <p className={`text-xs ${tc.textSec}`}>Tempo logado</p>
                                        </div>
                                    </div>
                                    <span className="text-2xl font-bold text-emerald-500">{horasCount.toFixed(1)}h</span>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Right Column - Forms */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Personal Info Form */}
                        <div className={`${tc.bgPanel} border ${tc.border} rounded-3xl p-8 transition-colors`}>
                            <h3 className={`text-lg font-bold ${tc.textPrimary} mb-6 flex items-center gap-2`}>
                                <User className="w-5 h-5 text-blue-500" />
                                Informações Básicas
                            </h3>

                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className={`text-xs font-bold ${tc.textSec} uppercase tracking-widest mb-2 block`}>Nome de Exibição</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className={`w-full ${tc.inputBg} border ${tc.border} rounded-xl px-4 py-3 ${tc.textPrimary} outline-none focus:ring-1 focus:ring-blue-500 transition-colors`}
                                        />
                                    </div>
                                    <div>
                                        <label className={`text-xs font-bold ${tc.textSec} uppercase tracking-widest mb-2 block`}>Cargo ou Profissão</label>
                                        <input
                                            type="text"
                                            value={formData.cargo}
                                            onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                                            className={`w-full ${tc.inputBg} border ${tc.border} rounded-xl px-4 py-3 ${tc.textPrimary} outline-none focus:ring-1 focus:ring-blue-500 transition-colors`}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className={`text-xs font-bold ${tc.textSec} uppercase tracking-widest mb-2 block`}>E-mail Corporativo</label>
                                    <div className="relative">
                                        <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${tc.textSec}`} />
                                        <input
                                            type="email"
                                            value={user?.email || ""}
                                            disabled
                                            className={`w-full ${tc.inputBg} border ${tc.border} rounded-xl pl-12 pr-4 py-3 ${tc.textPrimary} opacity-70 cursor-not-allowed`}
                                        />
                                    </div>
                                    <p className={`text-[10px] mt-1 ${tc.textSec}`}>Para alterar o e-mail central, entre em contato com o administrador.</p>
                                </div>

                                <div>
                                    <label className={`text-xs font-bold ${tc.textSec} uppercase tracking-widest mb-2 block`}>Biografia Curta</label>
                                    <textarea
                                        value={formData.bio}
                                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                        className={`w-full ${tc.inputBg} border ${tc.border} rounded-xl px-4 py-3 ${tc.textPrimary} outline-none focus:ring-1 focus:ring-blue-500 min-h-[100px] transition-colors`}
                                        placeholder="Fale um pouco sobre seu papel..."
                                    />
                                </div>

                                <div className="flex justify-end pt-4">
                                    <button
                                        onClick={handleSaveProfile}
                                        disabled={saving}
                                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-95 flex items-center gap-2"
                                    >
                                        {saving ? 'Salvando...' : (
                                            <>
                                                <Save className="w-4 h-4" />
                                                Salvar Alterações
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Security Form */}
                        <div className={`${tc.bgPanel} border ${tc.border} rounded-3xl p-8 transition-colors`}>
                            <h3 className={`text-lg font-bold ${tc.textPrimary} mb-6 flex items-center gap-2`}>
                                <Lock className="w-5 h-5 text-indigo-500" />
                                Segurança e Senha
                            </h3>

                            <p className={`${tc.textSec} text-sm mb-6`}>
                                Para atualizar sua senha, insira a senha antiga e defina uma nova. Recomendamos senhas fortes misturando letras e números.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className={`text-xs font-bold ${tc.textSec} uppercase tracking-widest mb-2 block`}>Senha Atual</label>
                                    <input
                                        type="password"
                                        placeholder="••••••••"
                                        className={`w-full ${tc.inputBg} border ${tc.border} rounded-xl px-4 py-3 ${tc.textPrimary} outline-none focus:ring-1 focus:border-indigo-500 transition-colors`}
                                    />
                                </div>
                                <div>
                                    <label className={`text-xs font-bold ${tc.textSec} uppercase tracking-widest mb-2 block`}>Nova Senha</label>
                                    <input
                                        type="password"
                                        placeholder="Mínimo 8 caracteres"
                                        className={`w-full ${tc.inputBg} border ${tc.border} rounded-xl px-4 py-3 ${tc.textPrimary} outline-none focus:ring-1 focus:border-indigo-500 transition-colors`}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end pt-6">
                                <button
                                    onClick={() => alert("Função em desenvolvimento para interface.")}
                                    className="bg-indigo-600/10 text-indigo-500 hover:bg-indigo-600 hover:text-white font-bold py-3 px-8 rounded-xl transition-all border border-indigo-600/20 active:scale-95 text-sm"
                                >
                                    Atualizar Senha
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            </main>
        </div>
    );
}

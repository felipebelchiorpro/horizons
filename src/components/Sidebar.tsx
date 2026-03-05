"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Briefcase,
    Users,
    Settings,
    LogOut,
    Menu,
    X,
    FolderKanban,
    Contact,
    Receipt,
    FileText,
    DollarSign,
    Wallet, // Added back Wallet as it was used
    HelpCircle, // Added back HelpCircle as it was used
    User, // Added back User as it was used
    Target
} from "lucide-react";

const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/fluxo-caixa", label: "Fluxo de Caixa", icon: Wallet },
    { href: "/projetos", label: "Projetos", icon: Briefcase },
    { href: "/contratos", label: "Contratos", icon: FileText },
    { href: "/colaboradores", label: "Equipe", icon: Contact },
    { href: "/leads", label: "Leads", icon: Users },
    { href: "/clientes", label: "Clientes", icon: Users },
    { href: "/orcamentos", label: "Orçamentos", icon: FileText },
    { href: "/faturas", label: "Ordens de Serviço", icon: FileText },
    { href: "/faturamento", label: "Receitas", icon: DollarSign },
    { href: "/estrategia", label: "Strategy Board", icon: Target },
];

const secondaryNavItems = [
    { href: "/perfil", label: "Meu Perfil", icon: User },
    { href: "/configuracoes", label: "Configurações", icon: Settings },
    { href: "/ajuda", label: "Ajuda", icon: HelpCircle },
];

export function Sidebar() {
    const pathname = usePathname();
    const [logoVersion, setLogoVersion] = useState<string>("");

    useEffect(() => {
        setLogoVersion(Date.now().toString());
    }, []);

    return (
        <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen h-full sticky top-0 hidden md:flex">
            {/* Header / Logo */}
            <div className="pt-4 pb-0 flex justify-center">
                <div className="w-48 h-28 overflow-hidden flex items-center justify-center relative">
                    <img
                        src={`/logo.png${logoVersion ? `?v=${logoVersion}` : ""}`}
                        alt="Horizons Logo"
                        className="w-full h-full object-contain"
                    />
                </div>
            </div>

            {/* Main Navigation */}
            <div className="flex-1 px-4 py-4 overflow-y-auto">
                <ul className="space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${isActive
                                        ? "bg-blue-600/10 text-blue-500"
                                        : "text-slate-400 hover:bg-slate-800 hover:text-white"
                                        }`}
                                >
                                    <item.icon className="w-5 h-5 opacity-80" />
                                    {item.label}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </div>

            {/* Secondary Navigation */}
            <div className="p-4 border-t border-slate-800">
                <ul className="space-y-1 mb-6">
                    {secondaryNavItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${isActive
                                        ? "bg-blue-600/10 text-blue-500"
                                        : "text-slate-400 hover:bg-slate-800 hover:text-white"
                                        }`}
                                >
                                    <item.icon className="w-4 h-4 opacity-80" />
                                    {item.label}
                                </Link>
                            </li>
                        );
                    })}
                </ul>

                {/* User Profile */}
                <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer">
                    <div className="w-8 h-8 rounded-full bg-slate-700 overflow-hidden">
                        <img src="https://i.pravatar.cc/150?u=rodrigo" alt="User profile" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">Rodrigo Silva</p>
                        <p className="text-xs text-slate-400 truncate">Diretor Executivo</p>
                    </div>
                </div>
            </div>
        </aside>
    );
}

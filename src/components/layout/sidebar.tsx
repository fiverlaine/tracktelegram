"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    LayoutDashboard,
    Globe,
    BarChart,
    Send,
    Filter,
    LogOut,
    MessageSquare,
    CreditCard,
    Code,
    LogIn,
    FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const menuItems = [
    {
        title: "Dashboard",
        href: "/",
        icon: LayoutDashboard,
    },
    {
        title: "Domínios",
        href: "/domains",
        icon: Globe,
    },
    {
        title: "Pixels",
        href: "/pixels",
        icon: BarChart,
    },
    {
        title: "Canal",
        href: "/channels",
        icon: Send,
    },
    {
        title: "Funis",
        href: "/funnels",
        icon: Filter,
    },
    {
        title: "Logs CAPI",
        href: "/logs",
        icon: FileText,
    },
    {
        title: "Mensagens",
        href: "/messages",
        icon: MessageSquare,
        disabled: true,
    },
    {
        title: "Assinatura",
        href: "/subscription",
        icon: CreditCard,
        disabled: true,
    },
    {
        title: "Postbacks",
        href: "/postbacks",
        icon: Code,
        disabled: true,
    }
];

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const supabase = createClient();

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        getUser();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        toast.success("Você saiu da conta.");
        router.refresh();
    };

    return (
        <aside className="fixed inset-y-0 left-0 z-50 w-64 border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300">
            <div className="flex h-full flex-col">
                {/* Logo Area */}
                <div className="flex h-16 items-center border-b border-sidebar-border px-6">
                    <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tighter">
                        <span className="text-primary">Track</span>
                        <span className="text-foreground">Gram</span>
                    </Link>
                </div>

                {/* Navigation */}
                <div className="flex-1 overflow-y-auto py-6 px-4">
                    <nav className="space-y-2">
                        {menuItems.map((item) => {
                            const isActive = pathname === item.href;

                            return (
                                <Link
                                    key={item.href}
                                    href={item.disabled ? "#" : item.href}
                                    className={cn(
                                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                                        isActive
                                            ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90 hover:text-primary-foreground"
                                            : "text-muted-foreground",
                                        item.disabled && "opacity-50 cursor-not-allowed hover:bg-transparent hover:text-muted-foreground"
                                    )}
                                >
                                    <item.icon className="h-4 w-4" />
                                    {item.title}
                                    {item.disabled && (
                                        <span className="ml-auto text-[10px] uppercase font-bold opacity-70">Em breve</span>
                                    )}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                {/* Footer / Logout */}
                <div className="border-t border-sidebar-border p-4 space-y-2">
                    {user ? (
                        <div className="space-y-2">
                            <div className="px-2 text-xs text-muted-foreground truncate">
                                Logado como: <br /> <span className="font-bold text-foreground">{user.email}</span>
                            </div>
                            <Button
                                variant="destructive"
                                className="w-full justify-start gap-2 bg-destructive/90 hover:bg-destructive"
                                onClick={handleLogout}
                            >
                                <LogOut className="h-4 w-4" />
                                Sair
                            </Button>
                        </div>
                    ) : (
                        <Button
                            asChild
                            variant="default"
                            className="w-full justify-start gap-2 bg-primary text-white"
                        >
                            <Link href="/login">
                                <LogIn className="h-4 w-4" />
                                Entrar
                            </Link>
                        </Button>
                    )}
                </div>
            </div>
        </aside>
    );
}

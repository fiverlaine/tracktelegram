import { NewSidebar } from "@/components/layout/new-sidebar";

export default function DashboardLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-black text-neutral-900 dark:text-white font-sans selection:bg-violet-500/30 overflow-x-hidden" suppressHydrationWarning>
             <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
                div { font-family: 'Poppins', sans-serif; }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.02); }
                .dark .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.2); }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
            `}</style>

            {/* Dynamic Background */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-violet-200/40 dark:bg-violet-900/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-200/40 dark:bg-blue-900/10 rounded-full blur-[120px]" />
            </div>

            <NewSidebar />
            
            {/* Main Content Container - Floating to match sidebar */}
            <main className="relative z-10 ml-0 md:ml-[calc(16rem+3rem)] mr-6 my-6 min-h-[calc(100vh-3rem)] flex flex-col">
                <div className="flex-1 bg-white/50 dark:bg-black/50 backdrop-blur-2xl border border-neutral-200 dark:border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl shadow-neutral-200/40 dark:shadow-black/40 overflow-hidden">
                    {children}
                </div>
            </main>
        </div>
    );
}

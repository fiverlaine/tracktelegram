import { Sidebar } from "@/components/layout/sidebar";

export default function DashboardLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="flex h-screen overflow-hidden bg-background">
            <Sidebar />
            <main className="flex-1 ml-64 overflow-y-auto relative z-10 text-foreground">
                <div className="p-8 pb-20 max-w-7xl mx-auto w-full">
                    {children}
                </div>
            </main>
        </div>
    );
}

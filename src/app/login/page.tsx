"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);

        // Using OTP (Magic Link) for simplicity and modern UX
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                // In a real app, this should redirect back to /
                emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
        });

        if (error) {
            console.error(error);
            toast.error("Erro ao enviar link de login");
        } else {
            toast.success("Link mágico enviado para seu email!");
            // Optionally we can simulate login if in development environment or provide a simple password alternative
        }
        setLoading(false);
    }

    // Alternative: Password Login (if user prefers)
    // For this demo, let's keep it simple with OTP or a "Dev Login" if needed

    return (
        <div className="flex items-center justify-center min-h-[80vh]">
            <Card className="w-[350px] bg-card/50 backdrop-blur-sm border-border">
                <CardHeader>
                    <CardTitle>Entrar no TrackGram</CardTitle>
                    <CardDescription>Digite seu email para receber um link de acesso.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="seu@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full bg-primary text-white" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Enviar Link Mágico
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, ArrowRight, Sparkles } from "lucide-react";
import { TrackGramLogo } from "@/components/ui/trackgram-logo";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    if (mode === "register") {
      if (password !== confirmPassword) {
        toast.error("As senhas não coincidem!");
        setLoading(false);
        return;
      }
      if (password.length < 6) {
        toast.error("A senha deve ter pelo menos 6 caracteres!");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        console.error(error);
        toast.error(error.message || "Erro ao criar conta");
      } else if (data.user) {
        // Automatically sign in after registration
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          toast.error("Conta criada! Faça login para continuar.");
        } else {
          toast.success("Conta criada com sucesso! Bem-vindo ao TrackGram!");
          router.push("/");
          router.refresh();
        }
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error(error);
        if (error.message.includes("Invalid login credentials")) {
          toast.error("Email ou senha incorretos");
        } else {
          toast.error(error.message || "Erro ao fazer login");
        }
      } else {
        toast.success("Login realizado com sucesso!");
        router.push("/");
        router.refresh();
      }
    }

    setLoading(false);
  }

  const features = [
    { icon: "📊", text: "Analytics em tempo real" },
    { icon: "🎯", text: "Rastreamento preciso" },
    { icon: "📈", text: "Métricas de conversão" },
    { icon: "🔗", text: "Integração com Facebook Ads" },
  ];

  return (
    <div className="min-h-screen w-full flex bg-black">
      {/* Left Column - Form */}
      <div className="flex-1 flex items-center justify-center p-8 relative">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-violet-900/20 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-fuchsia-900/10 rounded-full blur-[100px]" />
        </div>

        <div className="w-full max-w-md relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-10">
            <div className="shadow-lg shadow-violet-500/30 rounded-xl overflow-hidden">
              <TrackGramLogo size={48} />
            </div>
            <div>
              <h2 className="text-white font-bold text-xl leading-none tracking-tight">TrackGram</h2>
              <span className="text-[10px] text-violet-400 font-medium tracking-widest uppercase">Analytics</span>
            </div>
          </div>

          {/* Title */}
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 tracking-tight">
              {mode === "login" ? (
                <>
                  Bem-vindo de <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">volta</span>
                </>
              ) : (
                <>
                  Crie sua <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">conta</span>
                </>
              )}
            </h1>
            <p className="text-gray-400">
              {mode === "login"
                ? "Entre na sua conta para acessar o dashboard"
                : "Comece a rastrear seus resultados hoje"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Email</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-gray-500 focus:outline-none focus:border-violet-500 focus:bg-violet-500/5 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 pr-12 text-white placeholder:text-gray-500 focus:outline-none focus:border-violet-500 focus:bg-violet-500/5 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Confirm Password (only for register) */}
            {mode === "register" && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Confirmar Senha</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 pr-12 text-white placeholder:text-gray-500 focus:outline-none focus:border-violet-500 focus:bg-violet-500/5 transition-all"
                  />
                </div>
              </div>
            )}

            {/* Remember Me / Forgot Password (only for login) */}
            {mode === "login" && (
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 bg-white/5 text-violet-500 focus:ring-violet-500 focus:ring-offset-0"
                  />
                  <span className="text-gray-400 group-hover:text-white transition-colors">Lembrar de mim</span>
                </label>
                <button type="button" className="text-violet-400 hover:text-violet-300 transition-colors">
                  Esqueceu a senha?
                </button>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40"
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  {mode === "login" ? "Entrar" : "Criar conta"}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Toggle Mode */}
          <p className="text-center text-gray-400 mt-8">
            {mode === "login" ? (
              <>
                Não tem uma conta?{" "}
                <button
                  onClick={() => setMode("register")}
                  className="text-violet-400 hover:text-violet-300 font-medium transition-colors"
                >
                  Criar conta
                </button>
              </>
            ) : (
              <>
                Já tem uma conta?{" "}
                <button
                  onClick={() => setMode("login")}
                  className="text-violet-400 hover:text-violet-300 font-medium transition-colors"
                >
                  Fazer login
                </button>
              </>
            )}
          </p>
        </div>
      </div>

      {/* Right Column - Hero */}
      <div className="hidden lg:flex flex-1 relative p-6">
        <div className="absolute inset-6 rounded-3xl overflow-hidden bg-gradient-to-br from-violet-900/40 via-fuchsia-900/30 to-violet-900/40 border border-white/10">
          {/* Decorative elements */}
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-violet-500/30 rounded-full blur-[80px]" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-fuchsia-500/30 rounded-full blur-[80px]" />

          {/* Content */}
          <div className="relative z-10 h-full flex flex-col justify-center p-12">
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/10 mb-6">
                <Sparkles size={16} className="text-violet-400" />
                <span className="text-sm text-white/80">Plataforma #1 de Tracking</span>
              </div>
              <h2 className="text-4xl font-bold text-white mb-4 leading-tight">
                Acompanhe seus resultados<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">em tempo real</span>
              </h2>
              <p className="text-white/60 text-lg max-w-md">
                Tenha controle total sobre suas campanhas de Telegram com métricas precisas e insights poderosos.
              </p>
            </div>

            {/* Features */}
            <div className="grid grid-cols-2 gap-4">
              {features.map((feature, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-4 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10"
                >
                  <span className="text-2xl">{feature.icon}</span>
                  <span className="text-white/80 text-sm font-medium">{feature.text}</span>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="mt-10 flex gap-8">
              <div>
                <div className="text-3xl font-bold text-white">10k+</div>
                <div className="text-sm text-white/50">Usuários ativos</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-white">1M+</div>
                <div className="text-sm text-white/50">Eventos rastreados</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-white">99.9%</div>
                <div className="text-sm text-white/50">Uptime</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

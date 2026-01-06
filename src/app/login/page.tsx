"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, ArrowRight, Sparkles, X, Mail, CheckCircle2, ArrowLeft } from "lucide-react";
import { TrackGramLogo } from "@/components/ui/trackgram-logo";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  // Forgot password modal states
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);

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

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setForgotLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
      console.error("Forgot password error:", error);
      toast.error(error.message || "Erro ao enviar email de recuperação");
    } else {
      setForgotSuccess(true);
      toast.success("Email de recuperação enviado!");
    }

    setForgotLoading(false);
  }

  function openForgotModal() {
    setForgotEmail(email); // Pre-fill with login email if available
    setForgotSuccess(false);
    setShowForgotModal(true);
  }

  function closeForgotModal() {
    setShowForgotModal(false);
    setForgotEmail("");
    setForgotSuccess(false);
  }

  const features = [
    { icon: "📊", text: "Analytics em tempo real" },
    { icon: "🎯", text: "Rastreamento preciso" },
    { icon: "📈", text: "Métricas de conversão" },
    { icon: "🔗", text: "Integração com Facebook Ads" },
  ];

  return (
    <div className="min-h-screen w-full flex bg-white dark:bg-black transition-colors duration-300">
      {/* Left Column - Form */}
      <div className="flex-1 flex items-center justify-center p-8 relative">
        <div className="absolute top-6 right-6 z-20">
          <AnimatedThemeToggler className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors" />
        </div>
        
        {/* Subtle gradient background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-violet-200/40 dark:bg-violet-900/20 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-fuchsia-200/40 dark:bg-fuchsia-900/10 rounded-full blur-[100px]" />
        </div>

        <div className="w-full max-w-md relative z-10">
          {/* Logo */}
          <div className="flex items-center justify-start mb-10">
            <TrackGramLogo iconSize={60} textSize={28} />
          </div>

          {/* Title */}
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-neutral-900 dark:text-white mb-3 tracking-tight">
              {mode === "login" ? (
                <>
                  Bem-vindo de <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-fuchsia-500 dark:from-violet-400 dark:to-fuchsia-400">volta</span>
                </>
              ) : (
                <>
                  Crie sua <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-fuchsia-500 dark:from-violet-400 dark:to-fuchsia-400">conta</span>
                </>
              )}
            </h1>
            <p className="text-neutral-500 dark:text-gray-400">
              {mode === "login"
                ? "Entre na sua conta para acessar o dashboard"
                : "Comece a rastrear seus resultados hoje"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-neutral-600 dark:text-gray-400 mb-2">Email</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  className="w-full bg-neutral-50 border border-neutral-200 text-neutral-900 placeholder:text-neutral-400 focus:bg-white dark:bg-white/5 dark:border-white/10 dark:text-white dark:placeholder:text-gray-500 dark:focus:bg-violet-500/5 rounded-xl px-4 py-3.5 focus:outline-none focus:border-violet-500 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-neutral-600 dark:text-gray-400 mb-2">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-neutral-50 border border-neutral-200 text-neutral-900 placeholder:text-neutral-400 focus:bg-white dark:bg-white/5 dark:border-white/10 dark:text-white dark:placeholder:text-gray-500 dark:focus:bg-violet-500/5 rounded-xl px-4 py-3.5 pr-12 focus:outline-none focus:border-violet-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:text-gray-500 dark:hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Confirm Password (only for register) */}
            {mode === "register" && (
              <div>
                <label className="block text-sm font-medium text-neutral-600 dark:text-gray-400 mb-2">Confirmar Senha</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full bg-neutral-50 border border-neutral-200 text-neutral-900 placeholder:text-neutral-400 focus:bg-white dark:bg-white/5 dark:border-white/10 dark:text-white dark:placeholder:text-gray-500 dark:focus:bg-violet-500/5 rounded-xl px-4 py-3.5 pr-12 focus:outline-none focus:border-violet-500 transition-all"
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
                    className="w-4 h-4 rounded border-neutral-300 bg-neutral-100 dark:border-white/20 dark:bg-white/5 text-violet-500 focus:ring-violet-500 focus:ring-offset-0"
                  />
                  <span className="text-neutral-500 group-hover:text-neutral-900 dark:text-gray-400 dark:group-hover:text-white transition-colors">Lembrar de mim</span>
                </label>
                <button type="button" onClick={openForgotModal} className="text-violet-600 hover:text-violet-500 dark:text-violet-400 dark:hover:text-violet-300 transition-colors">
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
          <p className="text-center text-neutral-500 dark:text-gray-400 mt-8">
            {mode === "login" ? (
              <>
                Não tem uma conta?{" "}
                <button
                  onClick={() => setMode("register")}
                  className="text-violet-600 hover:text-violet-500 dark:text-violet-400 dark:hover:text-violet-300 font-medium transition-colors"
                >
                  Criar conta
                </button>
              </>
            ) : (
              <>
                Já tem uma conta?{" "}
                <button
                  onClick={() => setMode("login")}
                  className="text-violet-600 hover:text-violet-500 dark:text-violet-400 dark:hover:text-violet-300 font-medium transition-colors"
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
        <div className="absolute inset-6 rounded-3xl overflow-hidden bg-neutral-900 dark:bg-black bg-gradient-to-br from-violet-900/40 via-fuchsia-900/30 to-violet-900/40 border border-white/10 shadow-2xl">
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

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn"
            onClick={closeForgotModal}
          />
          
          {/* Modal */}
          <div className="relative bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-md p-8 animate-slideUp border border-neutral-200 dark:border-white/10">
            {/* Close button */}
            <button
              onClick={closeForgotModal}
              className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-white rounded-lg hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors"
            >
              <X size={20} />
            </button>

            {forgotSuccess ? (
              // Success State
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
                  Email Enviado!
                </h2>
                <p className="text-neutral-500 dark:text-gray-400 mb-6">
                  Enviamos um link de recuperação para <span className="font-medium text-violet-500">{forgotEmail}</span>. Verifique sua caixa de entrada e spam.
                </p>
                <button
                  onClick={closeForgotModal}
                  className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-violet-500/25"
                >
                  Voltar ao Login
                </button>
              </div>
            ) : (
              // Form State
              <>
                <div className="text-center mb-6">
                  <div className="w-14 h-14 bg-violet-100 dark:bg-violet-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-7 h-7 text-violet-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
                    Esqueceu a senha?
                  </h2>
                  <p className="text-neutral-500 dark:text-gray-400">
                    Não se preocupe! Digite seu email e enviaremos um link para redefinir sua senha.
                  </p>
                </div>

                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-600 dark:text-gray-400 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="seu@email.com"
                      required
                      autoFocus
                      className="w-full bg-neutral-50 border border-neutral-200 text-neutral-900 placeholder:text-neutral-400 focus:bg-white dark:bg-white/5 dark:border-white/10 dark:text-white dark:placeholder:text-gray-500 dark:focus:bg-violet-500/5 rounded-xl px-4 py-3.5 focus:outline-none focus:border-violet-500 transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={forgotLoading || !forgotEmail}
                    className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40"
                  >
                    {forgotLoading ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <>
                        Enviar Link de Recuperação
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </form>

                <button
                  onClick={closeForgotModal}
                  className="w-full mt-4 flex items-center justify-center gap-2 text-neutral-500 hover:text-neutral-700 dark:text-gray-400 dark:hover:text-white transition-colors py-2"
                >
                  <ArrowLeft size={16} />
                  Voltar ao login
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal Animation Styles */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to { 
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

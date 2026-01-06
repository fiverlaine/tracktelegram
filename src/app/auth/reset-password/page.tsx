"use client";

import { useState, useEffect, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, Lock, CheckCircle2, XCircle } from "lucide-react";
import { TrackGramLogo } from "@/components/ui/trackgram-logo";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";

function ResetPasswordContent() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // Password validation
  const passwordChecks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
  };

  const isPasswordValid = Object.values(passwordChecks).every(Boolean);

  useEffect(() => {
    // Check if we have error in URL (from Supabase)
    const errorDescription = searchParams.get("error_description");
    if (errorDescription) {
      setError(errorDescription);
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem!");
      return;
    }

    if (!isPasswordValid) {
      toast.error("A senha não atende aos requisitos mínimos!");
      return;
    }

    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      console.error("Reset password error:", error);
      setError(error.message);
      toast.error(error.message || "Erro ao redefinir senha");
    } else {
      setSuccess(true);
      toast.success("Senha redefinida com sucesso!");
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 2000);
    }

    setLoading(false);
  }

  if (error) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-white dark:bg-black transition-colors duration-300 p-8">
        <div className="absolute top-6 right-6 z-20">
          <AnimatedThemeToggler className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors" />
        </div>

        {/* Subtle gradient background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-red-200/40 dark:bg-red-900/20 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-orange-200/40 dark:bg-orange-900/10 rounded-full blur-[100px]" />
        </div>

        <div className="w-full max-w-md relative z-10 text-center">
          <div className="flex items-center justify-center mb-8">
            <TrackGramLogo iconSize={60} textSize={28} />
          </div>

          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-2xl p-8">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
              Link Expirado
            </h1>
            <p className="text-neutral-600 dark:text-gray-400 mb-6">
              {error || "O link de redefinição de senha expirou ou é inválido."}
            </p>
            <button
              onClick={() => router.push("/login")}
              className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-violet-500/25"
            >
              Voltar ao Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-white dark:bg-black transition-colors duration-300 p-8">
        <div className="absolute top-6 right-6 z-20">
          <AnimatedThemeToggler className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors" />
        </div>

        {/* Subtle gradient background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-green-200/40 dark:bg-green-900/20 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-emerald-200/40 dark:bg-emerald-900/10 rounded-full blur-[100px]" />
        </div>

        <div className="w-full max-w-md relative z-10 text-center">
          <div className="flex items-center justify-center mb-8">
            <TrackGramLogo iconSize={60} textSize={28} />
          </div>

          <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/50 rounded-2xl p-8">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
              Senha Redefinida!
            </h1>
            <p className="text-neutral-600 dark:text-gray-400 mb-4">
              Sua senha foi alterada com sucesso. Você será redirecionado para o dashboard...
            </p>
            <div className="flex items-center justify-center gap-2 text-violet-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Redirecionando...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-white dark:bg-black transition-colors duration-300 p-8">
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
        <div className="flex items-center justify-center mb-8">
          <TrackGramLogo iconSize={60} textSize={28} />
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-violet-100 dark:bg-violet-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-violet-500" />
          </div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
            Nova Senha
          </h1>
          <p className="text-neutral-500 dark:text-gray-400">
            Digite sua nova senha abaixo
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-neutral-600 dark:text-gray-400 mb-2">
              Nova Senha
            </label>
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

          {/* Password Requirements */}
          <div className="bg-neutral-50 dark:bg-white/5 rounded-xl p-4 space-y-2">
            <p className="text-xs font-medium text-neutral-500 dark:text-gray-400 mb-2">
              Requisitos da senha:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <PasswordCheck label="8+ caracteres" valid={passwordChecks.length} />
              <PasswordCheck label="Letra maiúscula" valid={passwordChecks.uppercase} />
              <PasswordCheck label="Letra minúscula" valid={passwordChecks.lowercase} />
              <PasswordCheck label="Número" valid={passwordChecks.number} />
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-neutral-600 dark:text-gray-400 mb-2">
              Confirmar Nova Senha
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className={`w-full bg-neutral-50 border text-neutral-900 placeholder:text-neutral-400 focus:bg-white dark:bg-white/5 dark:text-white dark:placeholder:text-gray-500 dark:focus:bg-violet-500/5 rounded-xl px-4 py-3.5 focus:outline-none transition-all ${
                  confirmPassword && password !== confirmPassword
                    ? "border-red-400 dark:border-red-500"
                    : confirmPassword && password === confirmPassword
                    ? "border-green-400 dark:border-green-500"
                    : "border-neutral-200 dark:border-white/10 focus:border-violet-500"
                }`}
              />
              {confirmPassword && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  {password === confirmPassword ? (
                    <CheckCircle2 size={20} className="text-green-500" />
                  ) : (
                    <XCircle size={20} className="text-red-500" />
                  )}
                </div>
              )}
            </div>
            {confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-red-500 mt-1">As senhas não coincidem</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !isPasswordValid || password !== confirmPassword}
            className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40"
          >
            {loading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <>
                Redefinir Senha
                <Lock size={18} />
              </>
            )}
          </button>
        </form>

        {/* Back to Login */}
        <p className="text-center text-neutral-500 dark:text-gray-400 mt-8">
          Lembrou a senha?{" "}
          <button
            onClick={() => router.push("/login")}
            className="text-violet-600 hover:text-violet-500 dark:text-violet-400 dark:hover:text-violet-300 font-medium transition-colors"
          >
            Voltar ao login
          </button>
        </p>
      </div>
    </div>
  );
}

function PasswordCheck({ label, valid }: { label: string; valid: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-4 h-4 rounded-full flex items-center justify-center transition-all ${
          valid
            ? "bg-green-500"
            : "bg-neutral-200 dark:bg-white/10"
        }`}
      >
        {valid && <CheckCircle2 size={12} className="text-white" />}
      </div>
      <span
        className={`text-xs transition-colors ${
          valid
            ? "text-green-600 dark:text-green-400"
            : "text-neutral-400 dark:text-gray-500"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen w-full flex items-center justify-center bg-white dark:bg-black">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}

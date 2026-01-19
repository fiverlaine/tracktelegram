import Link from "next/link";
import { TrackGramIcon, TrackGramLogo } from "@/components/ui/trackgram-logo";
import { Button } from "@/components/ui/button";
import { ProcessAnimation } from "@/components/landing/process-animation";
import { 
  CheckCircle2, 
  ArrowRight, 
  BarChart3, 
  Target, 
  ShieldCheck, 
  Zap,
  Lock,
  Globe2,
  ChevronDown
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-violet-500/30 overflow-x-hidden font-poppins">
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#050505]/80 backdrop-blur-md">
        <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <TrackGramLogo textSize={20} iconSize={32} />
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
            <Link href="#funcionalidades" className="hover:text-white transition-colors">Funcionalidades</Link>
            <Link href="#beneficios" className="hover:text-white transition-colors">Benefícios</Link>
            <Link href="#precos" className="hover:text-white transition-colors">Preços</Link>
            <Link href="#faq" className="hover:text-white transition-colors">FAQ</Link>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" className="text-gray-400 hover:text-white hover:bg-white/5 hidden sm:flex">
                Entrar
              </Button>
            </Link>
            <Link href="/login">
              <Button className="bg-violet-600 hover:bg-violet-500 text-white border-0 shadow-[0_0_20px_-5px_rgba(139,92,246,0.5)]">
                Começar Agora
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-violet-600/20 rounded-[100%] blur-[120px] -z-10 opacity-50 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-indigo-600/10 rounded-[100%] blur-[100px] -z-10 opacity-30 pointer-events-none" />

        <div className="container mx-auto px-4 md:px-6 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-violet-300 mb-8 animate-fade-in-up">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
            </span>
            Nova Versão 4.0 Disponível
          </div>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-b from-white via-white to-gray-400 bg-clip-text text-transparent max-w-4xl mx-auto leading-[1.1]">
            Pare de Queimar Dinheiro com <span className="text-violet-400">Cliques Fantasmas</span> no Telegram
          </h1>
          
          <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            O único rastreador que conecta Facebook Ads direto ao Telegram com 100% de precisão. 
            Identifique quem realmente entra no seu canal e otimize seu ROI em tempo real.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up delay-200">
            <Link href="/login">
              <Button size="lg" className="h-12 px-8 text-base bg-violet-600 hover:bg-violet-500 text-white border-0 shadow-[0_0_40px_-10px_rgba(139,92,246,0.6)] w-full sm:w-auto">
                Começar Teste Grátis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="#como-funciona">
              <Button size="lg" variant="outline" className="h-12 px-8 text-base border-white/10 bg-white/5 hover:bg-white/10 text-white w-full sm:w-auto backdrop-blur-sm">
                Ver Como Funciona
              </Button>
            </Link>
          </div>

          <div className="mt-16 flex flex-wrap items-center justify-center gap-4 md:gap-8 text-gray-500 text-sm font-medium opacity-60">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-violet-500" />
              Setup em 2 min
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-violet-500" />
              Não precisa de cartão
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-violet-500" />
              Cancelamento grátis
            </div>
          </div>
        </div>
      </section>

      {/* Pain Section (The Problem) */}
      <section className="py-20 bg-[#080808] border-y border-white/5">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Você paga pelo clique, <br/>
                <span className="text-red-400">mas o lead não entra.</span>
              </h2>
              <p className="text-gray-400 text-lg mb-6 leading-relaxed">
                Plataformas de analytics tradicionais perdem o rastreamento no momento em que o usuário clica para abrir o Telegram. 
                Isso gera a "cegueira de dados", onde você não sabe qual anúncio trouxe o lead.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-red-500/10 flex items-center justify-center mt-1 shrink-0">
                    <span className="text-red-500 text-xs font-bold">X</span>
                  </div>
                  <span className="text-gray-300">Custo por Lead (CPL) impreciso e alto.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-red-500/10 flex items-center justify-center mt-1 shrink-0">
                    <span className="text-red-500 text-xs font-bold">X</span>
                  </div>
                  <span className="text-gray-300">Pixel do Facebook não recebe dados de conversão reais.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-red-500/10 flex items-center justify-center mt-1 shrink-0">
                    <span className="text-red-500 text-xs font-bold">X</span>
                  </div>
                  <span className="text-gray-300">Impossível escalar campanhas vencedoras com segurança.</span>
                </li>
              </ul>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-orange-500/20 blur-3xl rounded-full opacity-20 pointer-events-none" />
              <div className="bg-neutral-900/50 border border-white/10 rounded-2xl p-6 backdrop-blur-sm relative">
                <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="font-mono text-sm text-gray-400">Analytics Tradicional</span>
                  </div>
                  <span className="text-red-400 font-mono text-sm">Discrepância: 60%</span>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded bg-white/5 border border-white/5 opacity-50">
                    <span className="text-sm">Cliques no Anúncio</span>
                    <span className="font-mono font-bold">1.000</span>
                  </div>
                  <div className="flex items-center justify-center">
                    <ArrowRight className="w-5 h-5 text-gray-600 rotate-90" />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded bg-red-500/10 border border-red-500/20">
                    <span className="text-sm text-red-200">Leads no Canal</span>
                    <span className="font-mono font-bold text-red-400">???</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section id="como-funciona" className="py-24 relative overflow-hidden bg-[#050505]">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              A Tecnologia <span className="text-violet-400">TeleTrack</span>
            </h2>
            <p className="text-gray-400 text-lg">
              Interceptamos o tráfego antes do redirecionamento, geramos links únicos e confirmamos a entrada via API.
            </p>
          </div>

          {/* Process Animation Component */}
          <div className="mb-20">
            <ProcessAnimation />
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-violet-500/50 transition-colors group">
              <div className="w-12 h-12 rounded-lg bg-violet-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Target className="w-6 h-6 text-violet-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">1. Interceptação</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Quando o usuário clica no anúncio, capturamos instantaneamente os parâmetros (fbclid, UTMs, IP) antes de abrir o Telegram.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-violet-500/50 transition-colors group">
              <div className="w-12 h-12 rounded-lg bg-violet-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Lock className="w-6 h-6 text-violet-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">2. Link Único</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Nossa API gera um link exclusivo temporário para aquele visitante. Sabemos exatamente quem ele é quando entrar.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-violet-500/50 transition-colors group">
              <div className="w-12 h-12 rounded-lg bg-violet-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6 text-violet-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">3. Match Back (CAPI)</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Ao entrar no canal, disparamos o evento "Lead" para o Facebook CAPI com EMQ (Match Quality) máxima.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features/Stats Section */}
      <section id="funcionalidades" className="py-20 bg-neutral-900/30 border-y border-white/5">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            
            <div className="relative order-2 lg:order-1">
              <div className="absolute -inset-4 bg-violet-500/20 blur-2xl rounded-xl opacity-30" />
              <div className="relative bg-[#0A0A0A] border border-white/10 rounded-xl p-8 shadow-2xl">
                <div className="flex items-center justify-between mb-8">
                  <h4 className="font-bold text-gray-200">Performance em Tempo Real</h4>
                  <div className="flex gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="w-2 h-2 rounded-full bg-yellow-500" />
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                  </div>
                </div>
                
                {/* Simulated Chart/Metrics */}
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                       <span className="text-gray-500">Taxa de Conversão (LP &rarr; Canal)</span>
                       <span className="text-green-400 font-bold">+42%</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full w-[85%] bg-violet-500 rounded-full" />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                       <span className="text-gray-500">Custo por Lead (CPL)</span>
                       <span className="text-green-400 font-bold">-35%</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full w-[45%] bg-indigo-500 rounded-full" />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                       <span className="text-gray-500">Match Quality (Facebook)</span>
                       <span className="text-green-400 font-bold">9.2/10</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full w-[92%] bg-emerald-500 rounded-full" />
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-white/5 flex justify-between text-xs text-gray-500 font-mono">
                  <span>Atualizado: Agora</span>
                  <span>ID: #TRACK-8821</span>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Domine seus dados. <br/>
                <span className="text-violet-400">Escale com confiança.</span>
              </h2>
              <p className="text-gray-400 text-lg mb-8">
                Não é mágica, é tecnologia. O TrackGram entrega o dashboard que o Telegram esqueceu de construir.
              </p>
              
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded bg-violet-500/10 flex items-center justify-center shrink-0">
                    <Globe2 className="w-5 h-5 text-violet-400" />
                  </div>
                  <div>
                    <h5 className="font-bold text-gray-200 mb-1">Domínios Próprios</h5>
                    <p className="text-sm text-gray-500">Use seu próprio domínio para evitar bloqueios e aumentar a confiança.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded bg-violet-500/10 flex items-center justify-center shrink-0">
                    <BarChart3 className="w-5 h-5 text-violet-400" />
                  </div>
                  <div>
                    <h5 className="font-bold text-gray-200 mb-1">Pixel Server-Side</h5>
                    <p className="text-sm text-gray-500">Envio de eventos via API, blindado contra AdBlockers e iOS 14+.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded bg-violet-500/10 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5 text-violet-400" />
                  </div>
                  <div>
                    <h5 className="font-bold text-gray-200 mb-1">Retenção de Dados</h5>
                    <p className="text-sm text-gray-500">Histórico completo de quem entrou e saiu do seu canal.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded bg-violet-500/10 flex items-center justify-center shrink-0">
                    <Target className="w-5 h-5 text-violet-400" />
                  </div>
                  <div>
                    <h5 className="font-bold text-gray-200 mb-1">Multi-Pixel</h5>
                    <p className="text-sm text-gray-500">Dispare eventos para múltiplos Pixels do Facebook simultaneamente.</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="precos" className="py-24 relative">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Planos Simples e Transparentes
            </h2>
            <p className="text-gray-400 text-lg">
              Comece grátis. Escale quando tiver resultados.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Starter */}
            <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col hover:bg-white/[0.04] transition-colors">
              <h3 className="text-lg font-medium text-gray-400 mb-4">Starter</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold">R$ 0</span>
                <span className="text-gray-500">/mês</span>
              </div>
              <p className="text-sm text-gray-400 mb-8">
                Perfeito para testar a ferramenta e validar seu funil.
              </p>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center gap-3 text-sm text-gray-300">
                  <CheckCircle2 className="w-4 h-4 text-violet-500" />
                  Até 50 leads/mês
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-300">
                  <CheckCircle2 className="w-4 h-4 text-violet-500" />
                  1 Canal monitorado
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-300">
                  <CheckCircle2 className="w-4 h-4 text-violet-500" />
                  Facebook CAPI
                </li>
              </ul>
              <Button variant="outline" className="w-full border-white/10 hover:bg-white/10">
                Começar Grátis
              </Button>
            </div>

            {/* Pro */}
            <div className="p-8 rounded-2xl bg-violet-600/10 border border-violet-500/50 flex flex-col relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-violet-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                MAIS POPULAR
              </div>
              <h3 className="text-lg font-medium text-violet-300 mb-4">Pro</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold">R$ 97</span>
                <span className="text-gray-500">/mês</span>
              </div>
              <p className="text-sm text-gray-400 mb-8">
                Para quem roda tráfego diário e precisa de escala.
              </p>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center gap-3 text-sm text-gray-300">
                  <CheckCircle2 className="w-4 h-4 text-violet-500" />
                  Leads Ilimitados
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-300">
                  <CheckCircle2 className="w-4 h-4 text-violet-500" />
                  Canais Ilimitados
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-300">
                  <CheckCircle2 className="w-4 h-4 text-violet-500" />
                  Domínios Personalizados
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-300">
                  <CheckCircle2 className="w-4 h-4 text-violet-500" />
                  Suporte Prioritário
                </li>
              </ul>
              <Button className="w-full bg-violet-600 hover:bg-violet-500 shadow-lg shadow-violet-500/25">
                Assinar Pro
              </Button>
            </div>

             {/* Enterprise */}
             <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col hover:bg-white/[0.04] transition-colors">
              <h3 className="text-lg font-medium text-gray-400 mb-4">Enterprise</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold">R$ 497</span>
                <span className="text-gray-500">/mês</span>
              </div>
              <p className="text-sm text-gray-400 mb-8">
                Para grandes operações e agências de lançamento.
              </p>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center gap-3 text-sm text-gray-300">
                  <CheckCircle2 className="w-4 h-4 text-violet-500" />
                  Tudo do Pro
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-300">
                  <CheckCircle2 className="w-4 h-4 text-violet-500" />
                  Múltiplos Usuários
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-300">
                  <CheckCircle2 className="w-4 h-4 text-violet-500" />
                  API de Integração
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-300">
                  <CheckCircle2 className="w-4 h-4 text-violet-500" />
                  White Label (Opcional)
                </li>
              </ul>
              <Button variant="outline" className="w-full border-white/10 hover:bg-white/10">
                Falar com Vendas
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-neutral-900/30 border-t border-white/5">
        <div className="container mx-auto px-4 md:px-6 max-w-3xl">
          <h2 className="text-3xl font-bold mb-12 text-center">Perguntas Frequentes</h2>
          
          <div className="space-y-4">
            <details className="group bg-white/[0.02] border border-white/5 rounded-xl open:bg-white/[0.04] transition-all">
              <summary className="flex items-center justify-between p-6 cursor-pointer font-medium text-lg list-none">
                Preciso saber programar?
                <ChevronDown className="w-5 h-5 transition-transform group-open:rotate-180 text-gray-500" />
              </summary>
              <div className="px-6 pb-6 text-gray-400 leading-relaxed">
                Não! O TrackGram foi feito para ser plug-and-play. Você configura seu bot e pixel em menos de 2 minutos sem tocar em nenhuma linha de código.
              </div>
            </details>

            <details className="group bg-white/[0.02] border border-white/5 rounded-xl open:bg-white/[0.04] transition-all">
              <summary className="flex items-center justify-between p-6 cursor-pointer font-medium text-lg list-none">
                Funciona com qualquer canal?
                <ChevronDown className="w-5 h-5 transition-transform group-open:rotate-180 text-gray-500" />
              </summary>
              <div className="px-6 pb-6 text-gray-400 leading-relaxed">
                Sim, funciona com canais públicos, privados e grupos. Você só precisa adicionar o nosso bot como administrador para que ele possa gerar os links de rastreamento.
              </div>
            </details>

            <details className="group bg-white/[0.02] border border-white/5 rounded-xl open:bg-white/[0.04] transition-all">
              <summary className="flex items-center justify-between p-6 cursor-pointer font-medium text-lg list-none">
                O Facebook não bloqueia?
                <ChevronDown className="w-5 h-5 transition-transform group-open:rotate-180 text-gray-500" />
              </summary>
              <div className="px-6 pb-6 text-gray-400 leading-relaxed">
                Pelo contrário. Usamos domínios próprios e a API oficial de Conversões do Facebook (CAPI), que é a forma recomendada pela Meta para enviar dados após o iOS 14. É 100% seguro e whitehat.
              </div>
            </details>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 bg-[#050505]">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <TrackGramLogo textSize={20} iconSize={32} />
              </div>
              <p className="text-gray-500 text-sm max-w-md leading-relaxed">
                A plataforma líder em rastreamento e atribuição para Telegram. 
                Transforme dados em lucro com nossa tecnologia de interceptação proprietária.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Produto</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><Link href="#" className="hover:text-violet-400 transition-colors">Funcionalidades</Link></li>
                <li><Link href="#" className="hover:text-violet-400 transition-colors">Integrações</Link></li>
                <li><Link href="#" className="hover:text-violet-400 transition-colors">Preços</Link></li>
                <li><Link href="#" className="hover:text-violet-400 transition-colors">Changelog</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><Link href="#" className="hover:text-violet-400 transition-colors">Termos de Uso</Link></li>
                <li><Link href="#" className="hover:text-violet-400 transition-colors">Privacidade</Link></li>
                <li><Link href="#" className="hover:text-violet-400 transition-colors">Cookies</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-white/5 text-center text-xs text-gray-600">
            &copy; {new Date().getFullYear()} TrackGram. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}

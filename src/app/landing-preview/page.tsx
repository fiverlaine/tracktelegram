"use client"

import Link from "next/link"
import { 
  BarChart3, 
  Bot, 
  ChevronRight, 
  Globe2, 
  LayoutDashboard, 
  LineChart, 
  Lock, 
  Zap, 
  ShieldCheck, 
  Target,
  ArrowRight,
  CheckCircle2,
  Menu,
  X
} from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

export default function LandingPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-black text-white selection:bg-purple-500/30">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-black/50 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white fill-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">TrackGram</span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Funcionalidades</a>
            <a href="#how-it-works" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Como Funciona</a>
            <a href="#pricing" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Preços</a>
            <div className="flex items-center gap-4">
              <Link href="/login" className="text-sm font-medium hover:text-white transition-colors">Entrar</Link>
              <Link href="/register" className="text-sm font-medium bg-white text-black px-4 py-2 rounded-full hover:bg-gray-200 transition-colors">
                Começar Grátis
              </Link>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-gray-400 hover:text-white"
          >
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Nav */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-white/10 bg-black p-4 flex flex-col gap-4 animate-in slide-in-from-top-4">
            <a href="#features" className="text-sm font-medium text-gray-400 hover:text-white" onClick={() => setIsMobileMenuOpen(false)}>Funcionalidades</a>
            <a href="#how-it-works" className="text-sm font-medium text-gray-400 hover:text-white" onClick={() => setIsMobileMenuOpen(false)}>Como Funciona</a>
            <a href="#pricing" className="text-sm font-medium text-gray-400 hover:text-white" onClick={() => setIsMobileMenuOpen(false)}>Preços</a>
            <div className="flex flex-col gap-2 pt-4 border-t border-white/10">
              <Link href="/login" className="text-center py-2 text-sm font-medium border border-white/10 rounded-lg hover:bg-white/5">Entrar</Link>
              <Link href="/register" className="text-center py-2 text-sm font-medium bg-white text-black rounded-lg hover:bg-gray-200">
                Começar Grátis
              </Link>
            </div>
          </div>
        )}
      </nav>

      <main>
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
          {/* Background Gradients */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-purple-600/20 rounded-full blur-[100px] -z-10 opacity-50" />
          <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] -z-10 opacity-30" />
          
          <div className="container mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-xs font-medium mb-8 animate-in fade-in zoom-in duration-700">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
              </span>
              Nova Integração CAPI Disponível
            </div>
            
            <h1 className="text-4xl md:text-7xl font-bold tracking-tight mb-6 max-w-5xl mx-auto leading-tight">
              Pare de voar às cegas nos seus <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-blue-400 to-purple-400 animate-gradient-x">
                Anúncios do Telegram
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              O TrackGram rastreia cliques e cruza com a entrada real no canal. 
              Atribuição perfeita enviada diretamente para o Pixel/CAPI do Facebook.
            </p>
            
            <div className="flex flex-col md:flex-row items-center justify-center gap-4">
              <Link 
                href="/register" 
                className="w-full md:w-auto px-8 py-4 bg-white text-black text-lg font-bold rounded-full hover:scale-105 transition-transform duration-200 hover:shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] flex items-center justify-center gap-2"
              >
                Começar Agora <ArrowRight className="w-5 h-5" />
              </Link>
              <a 
                href="#how-it-works" 
                className="w-full md:w-auto px-8 py-4 bg-white/5 border border-white/10 text-white text-lg font-medium rounded-full hover:bg-white/10 transition-colors backdrop-blur-sm"
              >
                Como Funciona?
              </a>
            </div>

            {/* Dashboard Preview Mockup */}
            <div className="mt-20 relative mx-auto max-w-5xl">
              <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent z-10 h-full bottom-0" />
              <div className="rounded-xl border border-white/10 bg-black/40 backdrop-blur-md p-2 shadow-2xl">
                <div className="rounded-lg bg-[#0F0F12] border border-white/5 overflow-hidden aspect-[16/9] relative group">
                  {/* Mock UI Elements */}
                  <div className="absolute top-0 w-full h-12 border-b border-white/5 flex items-center px-4 gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                      <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
                    </div>
                  </div>
                  
                  {/* Charts Grid */}
                  <div className="p-6 grid grid-cols-3 gap-4 mt-8 h-[calc(100%-3rem)]">
                    <div className="col-span-2 bg-white/5 rounded-lg p-4 border border-white/5 flex flex-col gap-4">
                      <div className="h-6 w-32 bg-white/10 rounded animate-pulse" />
                      <div className="flex-1 flex items-end gap-2 pb-2">
                         {[40, 65, 55, 80, 60, 90, 75, 85].map((h, i) => (
                           <div key={i} style={{ height: `${h}%` }} className="flex-1 bg-gradient-to-t from-purple-600/50 to-purple-500 rounded-t-sm hover:from-purple-500 hover:to-purple-400 transition-colors cursor-crosshair" />
                         ))}
                      </div>
                    </div>
                    <div className="flex flex-col gap-4">
                       <div className="flex-1 bg-white/5 rounded-lg p-4 border border-white/5">
                          <div className="h-4 w-20 bg-white/10 rounded mb-2" />
                          <div className="text-3xl font-bold text-white">2,543</div>
                          <div className="text-xs text-green-400 mt-1 flex items-center gap-1"><ArrowRight className="w-3 h-3 rotate-45" /> +12% Conversão</div>
                       </div>
                       <div className="flex-1 bg-white/5 rounded-lg p-4 border border-white/5">
                          <div className="h-4 w-20 bg-white/10 rounded mb-2" />
                          <div className="text-3xl font-bold text-white">R$ 14.5k</div>
                          <div className="text-xs text-purple-400 mt-1">ROI Estimado</div>
                       </div>
                    </div>
                  </div>
                  
                  {/* Overlay Text for preview */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <p className="text-white font-medium px-6 py-3 border border-white/20 rounded-full bg-black/50 backdrop-blur-xl">
                      Dashboard Interativo em Tempo Real
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Partners / Trust */}
        <section className="py-10 border-y border-white/5 bg-white/[0.02]">
          <div className="container mx-auto px-4 text-center">
            <p className="text-sm text-gray-500 mb-6 uppercase tracking-wider">Compatível com as principais plataformas</p>
            <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all duration-500">
              <span className="text-xl font-bold text-white/80">Facebook Ads</span>
              <span className="text-xl font-bold text-white/80">Telegram API</span>
              <span className="text-xl font-bold text-white/80">TikTok Ads</span>
              <span className="text-xl font-bold text-white/80">Google Analytics 4</span>
            </div>
          </div>
        </section>

        {/* Problem Section */}
        <section className="py-24 bg-black relative" id="how-it-works">
           <div className="container mx-auto px-4">
             <div className="grid md:grid-cols-2 gap-16 items-center">
               <div className="relative">
                 <div className="absolute -inset-4 bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-2xl blur-2xl opacity-50" />
                 <div className="relative border border-red-500/20 bg-black/40 rounded-2xl p-8 backdrop-blur-sm">
                   <h3 className="text-2xl font-bold text-red-500 mb-4 flex items-center gap-2">
                     <X className="w-6 h-6" /> O Problema Atual
                   </h3>
                   <ul className="space-y-4 text-gray-400">
                     <li className="flex gap-3">
                       <span className="text-red-500/50">•</span> O usuário clica no anúncio
                     </li>
                     <li className="flex gap-3">
                       <span className="text-red-500/50">•</span> O Facebook marca o clique
                     </li>
                     <li className="flex gap-3">
                       <span className="text-red-500/50">•</span> O usuário entra no Telegram
                     </li>
                     <li className="flex gap-3 font-semibold text-white bg-red-500/10 p-2 rounded border border-red-500/20">
                       <span className="text-red-500">!</span> Conexão Perdida: O Facebook não sabe se o usuário realmente entrou no canal.
                     </li>
                   </ul>
                 </div>
               </div>

               <div>
                 <h2 className="text-3xl md:text-5xl font-bold mb-6">Você está pagando por <span className="text-gray-500">leads fantasmas</span>.</h2>
                 <p className="text-lg text-gray-400 mb-8 leading-relaxed">
                   Sem o rastreamento server-side (CAPI), você otimiza suas campanhas baseando-se em cliques de curiosos, não em membros reais. Isso queima seu orçamento e confunde o algoritmo do Facebook.
                 </p>
                 <div className="grid grid-cols-2 gap-6">
                   <div className="border-l-2 border-purple-500 pl-4">
                     <div className="text-3xl font-bold text-white mb-1">30%</div>
                     <div className="text-sm text-gray-500">Média de perda de dados</div>
                   </div>
                   <div className="border-l-2 border-green-500 pl-4">
                     <div className="text-3xl font-bold text-white mb-1">2x</div>
                     <div className="text-sm text-gray-500">Custo por Lead real</div>
                   </div>
                 </div>
               </div>
             </div>
           </div>
        </section>

        {/* Solution/Features */}
        <section className="py-24 bg-[#050505]" id="features">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold mb-4">A Tecnologia <span className="text-purple-500">TrackGram</span></h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                Desenvolvemos uma arquitetura robusta que conecta as pontas soltas do seu funil.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: Target,
                  title: "Visitor Match™",
                  desc: "Criamos um link único para cada clique, permitindo identificar exatamente quem entrou no canal."
                },
                {
                  icon: Bot,
                  title: "Telegram Bot Ativo",
                  desc: "Nosso bot monitora o grupo 24/7 e detecta novos membros instantaneamente para validação."
                },
                {
                  icon: LayoutDashboard,
                  title: "Facebook CAPI",
                  desc: "Enviamos o evento 'Lead' via servidor (S2S) com nota de qualidade máxima."
                },
                {
                  icon: ShieldCheck,
                  title: "Anti-Fraude",
                  desc: "Filtramos cliques de bots e crawlers para não sujar os dados do seu Pixel."
                },
                {
                  icon: LineChart,
                  title: "Analytics Real-Time",
                  desc: "Saiba exatamente qual criativo está trazendo pessoas reais, não apenas cliques."
                },
                {
                  icon: Globe2,
                  title: "Domínios Personalizados",
                  desc: "Use seu próprio domínio (seudominio.com) para aumentar a confiança e evitar bloqueios."
                }
              ].map((feature, i) => (
                <div key={i} className="group p-8 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-purple-500/30 transition-all duration-300">
                  <div className="w-12 h-12 bg-purple-900/20 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <feature.icon className="w-6 h-6 text-purple-400" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-gray-400 leading-relaxed text-sm">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="py-24 bg-black relative" id="pricing">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-blue-900/10 rounded-full blur-[120px] -z-10" />
          
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold mb-4">Planos Escaláveis</h2>
              <p className="text-gray-400">Escolha a potência ideal para sua operação.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {/* Starter */}
              <div className="relative p-8 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-sm">
                <div className="mb-4">
                  <h3 className="text-xl font-medium text-gray-300">Starter</h3>
                  <div className="text-4xl font-bold mt-2">R$ 97<span className="text-lg text-gray-500 font-normal">/mês</span></div>
                  <p className="text-sm text-gray-500 mt-2">Para quem está começando a escalar.</p>
                </div>
                <ul className="space-y-4 mb-8">
                  {[
                    "Até 5.000 cliques/mês",
                    "1 Canal/Grupo monitorado",
                    "Facebook CAPI Básico",
                    "Dashboard Essencial"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-gray-300">
                      <CheckCircle2 className="w-4 h-4 text-gray-500" /> {item}
                    </li>
                  ))}
                </ul>
                <button className="w-full py-3 rounded-lg border border-white/10 hover:bg-white hover:text-black transition-colors font-medium">
                  Começar Starter
                </button>
              </div>

              {/* Pro */}
              <div className="relative p-8 rounded-2xl border border-purple-500 bg-white/[0.02] backdrop-blur-sm transform md:-translate-y-4">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-purple-600 rounded-full text-xs font-bold tracking-wide shadow-lg shadow-purple-900/50">
                  MAIS POPULAR
                </div>
                <div className="mb-4">
                  <h3 className="text-xl font-medium text-purple-300">Professional</h3>
                  <div className="text-4xl font-bold mt-2">R$ 197<span className="text-lg text-gray-500 font-normal">/mês</span></div>
                  <p className="text-sm text-gray-500 mt-2">Para gestores de tráfego sérios.</p>
                </div>
                <ul className="space-y-4 mb-8">
                  {[
                    "Até 50.000 cliques/mês",
                    "5 Canais/Grupos monitorados",
                    "Facebook CAPI Avançado",
                    "Múltiplos Pixels",
                    "Domínios Personalizados",
                    "Suporte Prioritário"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-white font-medium">
                      <CheckCircle2 className="w-4 h-4 text-purple-500" /> {item}
                    </li>
                  ))}
                </ul>
                <button className="w-full py-3 rounded-lg bg-purple-600 hover:bg-purple-500 transition-colors font-bold shadow-lg shadow-purple-900/20">
                  Começar Professional
                </button>
              </div>

              {/* Agency */}
              <div className="relative p-8 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-sm">
                <div className="mb-4">
                  <h3 className="text-xl font-medium text-gray-300">Agency</h3>
                  <div className="text-4xl font-bold mt-2">R$ 497<span className="text-lg text-gray-500 font-normal">/mês</span></div>
                  <p className="text-sm text-gray-500 mt-2">Para grandes operações e times.</p>
                </div>
                <ul className="space-y-4 mb-8">
                  {[
                    "Cliques Ilimitados",
                    "Canais Ilimitados",
                    "API de Gerenciamento",
                    "White Label (Em breve)",
                    "Account Manager Dedicado",
                    "Acesso antecipado a features"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-gray-300">
                      <CheckCircle2 className="w-4 h-4 text-gray-500" /> {item}
                    </li>
                  ))}
                </ul>
                <button className="w-full py-3 rounded-lg border border-white/10 hover:bg-white hover:text-black transition-colors font-medium">
                  Falar com Vendas
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-24 border-t border-white/10 bg-gradient-to-b from-black to-purple-950/20">
          <div className="container mx-auto px-4 text-center">
             <h2 className="text-3xl md:text-5xl font-bold mb-8 max-w-3xl mx-auto">
               Pronto para ter controle total sobre seu tráfego no Telegram?
             </h2>
             <Link 
                href="/register" 
                className="inline-flex px-10 py-5 bg-white text-black text-xl font-bold rounded-full hover:scale-105 transition-transform duration-200 shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] items-center gap-3"
              >
                Criar Conta Gratuita <ChevronRight className="w-5 h-5" />
              </Link>
              <p className="mt-6 text-sm text-gray-500">
                Sem cartão de crédito necessário • Setup em 2 minutos
              </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-black py-12">
        <div className="container mx-auto px-4 grid md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded bg-purple-600 flex items-center justify-center">
                <Zap className="w-4 h-4 text-white fill-white" />
              </div>
              <span className="font-bold">TrackGram</span>
            </div>
            <p className="text-gray-500 text-sm">
              A plataforma definitiva de inteligência para tráfego no Telegram.
            </p>
          </div>
          
          <div>
            <h4 className="font-bold mb-4">Produto</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><a href="#" className="hover:text-purple-400">Funcionalidades</a></li>
              <li><a href="#" className="hover:text-purple-400">Preços</a></li>
              <li><a href="#" className="hover:text-purple-400">Roadmap</a></li>
              <li><a href="#" className="hover:text-purple-400">Changelog</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4">Recursos</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><a href="#" className="hover:text-purple-400">Documentação</a></li>
              <li><a href="#" className="hover:text-purple-400">API</a></li>
              <li><a href="#" className="hover:text-purple-400">Status</a></li>
              <li><a href="#" className="hover:text-purple-400">Comunidade</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><a href="#" className="hover:text-purple-400">Termos de Uso</a></li>
              <li><a href="#" className="hover:text-purple-400">Privacidade</a></li>
              <li><a href="#" className="hover:text-purple-400">Cookies</a></li>
            </ul>
          </div>
        </div>
        <div className="container mx-auto px-4 mt-12 pt-8 border-t border-white/5 text-center text-sm text-gray-600">
          © 2024 TrackGram. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  )
}

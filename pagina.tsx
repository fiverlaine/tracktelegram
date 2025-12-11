import React, { useState } from 'react';
import { 
  LayoutGrid, 
  Globe, 
  BarChart2, 
  Send, 
  Filter, 
  MessageSquare, 
  CreditCard, 
  Code, 
  LogOut, 
  Eye, 
  Zap, 
  Users, 
  UserCheck, 
  Search, 
  Calendar,
  ChevronDown,
  Lock,
  ArrowUpRight,
  MoreHorizontal
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// --- DATA CONFIGURATION ---
const DATA = {
  theme: {
    fontFamily: "'Poppins', sans-serif",
  },
  menuItems: [
    { id: "dashboard", label: "Dashboard", icon: LayoutGrid, active: true },
    { id: "dominios", label: "Domínios", icon: Globe, active: false },
    { id: "pixels", label: "Pixels", icon: BarChart2, active: false },
    { id: "canal", label: "Canal", icon: Send, active: false },
    { id: "funis", label: "Funis", icon: Filter, active: false },
    { id: "mensagens", label: "Mensagens", icon: MessageSquare, active: false, locked: true },
    { id: "assinatura", label: "Assinatura", icon: CreditCard, active: false },
    { id: "postbacks", label: "Postbacks", icon: Code, active: false },
  ],
  filters: {
    funis: ["Todos", "Funil A", "Funil B"],
    pixels: ["Todos", "Pixel FB", "Pixel TT"],
  },
  metrics: [
    {
      id: "pageviews",
      title: "Pageviews",
      icon: Eye,
      value: "12,450", 
      status: "Estável",
      subLabel: "Conv. Geral",
      subValue: "24%",
      accent: "from-blue-500 to-cyan-400",
      shadow: "shadow-blue-500/20"
    },
    {
      id: "clicks",
      title: "Clicks",
      icon: Zap,
      value: "8,210",
      status: "Estável",
      subLabel: "CTR",
      subValue: "12%",
      accent: "from-amber-400 to-orange-500",
      shadow: "shadow-amber-500/20"
    },
    {
      id: "entradas",
      title: "Entradas",
      icon: Users,
      value: "4,105",
      status: "Estável",
      subLabel: "Taxa Entradas",
      subValue: "50%",
      accent: "from-emerald-400 to-green-500",
      shadow: "shadow-emerald-500/20"
    },
    {
      id: "saidas",
      title: "Saídas",
      icon: UserCheck,
      value: "380",
      status: "Estável",
      subLabel: "Retenção",
      subValue: "92%",
      accent: "from-rose-500 to-pink-500",
      shadow: "shadow-rose-500/20"
    }
  ],
  chartData: [
    { name: '04', value: 1200 },
    { name: '05', value: 1900 },
    { name: '06', value: 1500 },
    { name: '07', value: 2400 },
    { name: '08', value: 2100 },
    { name: '09', value: 2800 },
    { name: '10', value: 3200 },
  ],
  retentionData: [
    { dia: "10/12", entradas: "1,204", saidas: "12", retencao: "99%", status: "high" },
    { dia: "09/12", entradas: "980", saidas: "45", retencao: "95%", status: "high" },
    { dia: "08/12", entradas: "1,100", saidas: "110", retencao: "90%", status: "med" },
    { dia: "07/12", entradas: "890", saidas: "20", retencao: "97%", status: "high" },
    { dia: "06/12", entradas: "1,450", saidas: "300", retencao: "79%", status: "low" },
    { dia: "05/12", entradas: "1,120", saidas: "50", retencao: "95%", status: "high" },
    { dia: "04/12", entradas: "900", saidas: "10", retencao: "98%", status: "high" },
  ]
};

// --- COMPONENTS ---

const Navigation = () => (
  <nav className="fixed left-4 top-4 bottom-4 w-64 bg-black/60 backdrop-blur-2xl border border-white/5 rounded-3xl flex flex-col py-6 z-50 shadow-2xl shadow-black/50 hidden md:flex">
    <div className="mb-8 px-6 flex items-center gap-3">
      <div className="w-10 h-10 bg-gradient-to-tr from-violet-600 to-fuchsia-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/30 shrink-0">
        <span className="text-white font-bold text-lg">T4</span>
      </div>
      <div>
        <h1 className="text-white font-bold text-lg leading-none tracking-tight">TRACK4YOU</h1>
        <span className="text-[10px] text-violet-400 font-medium tracking-widest uppercase">Analytics</span>
      </div>
    </div>

    <div className="flex-1 flex flex-col gap-1 w-full px-3 overflow-y-auto custom-scrollbar">
      {DATA.menuItems.map((item) => (
        <div key={item.id} className="relative group">
          <div className={`
            flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 cursor-pointer
            ${item.active 
              ? 'bg-white text-black shadow-lg shadow-white/10 font-semibold' 
              : 'text-gray-400 hover:bg-white/5 hover:text-white'}
          `}>
            <item.icon size={18} strokeWidth={item.active ? 2.5 : 2} className={item.active ? "text-violet-600" : ""} />
            <span className="text-sm">{item.label}</span>
            {item.locked && (
              <Lock size={12} className="ml-auto opacity-50" />
            )}
          </div>
        </div>
      ))}
    </div>

    <div className="mt-4 pt-4 border-t border-white/5 w-full px-3">
      <button className="flex items-center gap-3 w-full px-4 py-2.5 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors text-sm font-medium">
        <LogOut size={18} />
        <span>Sair</span>
      </button>
    </div>
  </nav>
);

const NeonCard = ({ title, value, icon: Icon, subLabel, subValue, accent, shadow }: any) => (
  <div className="relative group">
    <div className={`absolute inset-0 bg-gradient-to-r ${accent} rounded-2xl opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500 -z-10`} />
    <div className="h-full bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/5 p-5 rounded-2xl hover:-translate-y-1 transition-transform duration-300 flex flex-col justify-between overflow-hidden relative">
      
      {/* Decorative Circle */}
      <div className={`absolute -right-8 -top-8 w-24 h-24 bg-gradient-to-br ${accent} rounded-full opacity-10 blur-xl`} />

      <div className="flex justify-between items-start mb-3">
        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${accent} text-white shadow-lg ${shadow}`}>
          <Icon size={18} />
        </div>
        <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">
          <ArrowUpRight size={10} />
          <span>+2.4%</span>
        </div>
      </div>

      <div>
        <h3 className="text-gray-400 text-xs font-medium mb-0.5">{title}</h3>
        <div className="text-2xl font-bold text-white mb-3 tracking-tight">{value}</div>
        
        <div className="flex items-center justify-between pt-3 border-t border-white/5">
          <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">{subLabel}</span>
          <span className={`text-xs font-bold bg-gradient-to-r ${accent} bg-clip-text text-transparent`}>
            {subValue}
          </span>
        </div>
      </div>
    </div>
  </div>
);

const RetentionRow = ({ data }: any) => {
  const getStatusColor = (status: any) => {
    if (status === 'high') return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
    if (status === 'med') return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
    return 'text-red-400 bg-red-400/10 border-red-400/20';
  };

  return (
    <div className="group flex items-center justify-between p-3 mb-1.5 bg-white/[0.02] hover:bg-white/[0.05] border border-transparent hover:border-white/5 rounded-xl transition-all cursor-pointer">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-[10px] font-bold text-gray-300 group-hover:bg-white/10 transition-colors">
          {data.dia.split('/')[0]}
        </div>
        <div>
          <div className="text-sm font-medium text-white leading-none mb-1">{data.dia}</div>
          <div className="text-[10px] text-gray-500">Relatório</div>
        </div>
      </div>

      <div className="hidden sm:block text-right min-w-[60px]">
        <div className="text-sm font-bold text-gray-200 leading-none mb-1">{data.entradas}</div>
        <div className="text-[9px] uppercase tracking-wide text-gray-600">Entradas</div>
      </div>

      <div className="hidden sm:block text-right min-w-[60px]">
        <div className="text-sm font-bold text-gray-200 leading-none mb-1">{data.saidas}</div>
        <div className="text-[9px] uppercase tracking-wide text-gray-600">Saídas</div>
      </div>

      <div className={`px-2.5 py-1 rounded-md border text-[10px] font-bold ${getStatusColor(data.status)}`}>
        {data.retencao}
      </div>
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState('pageviews');

  return (
    <div className="min-h-screen bg-black text-white font-['Poppins'] selection:bg-violet-500/30 overflow-x-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>

      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-violet-900/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-900/10 rounded-full blur-[120px]" />
      </div>

      {/* Layout */}
      <div className="relative pl-0 md:pl-72 pr-4 md:pr-6 py-4 max-w-[1920px] mx-auto min-h-screen flex flex-col">
        
        <Navigation />

        {/* Top Header Area */}
        <header className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 mb-8 px-2 md:px-0 pt-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/>
              <span className="text-gray-500 text-[10px] font-medium uppercase tracking-wider">
                Atualizado agora
              </span>
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight mb-1">
              Dashboard
            </h1>
            <p className="text-gray-400 text-sm">Bem-vindo ao centro de controle Track4You.</p>
          </div>

          <div className="w-full xl:w-auto p-1 bg-white/[0.03] border border-white/5 backdrop-blur-md rounded-xl flex flex-col sm:flex-row gap-2">
            
            {/* Filter Pills */}
            <div className="flex gap-2">
              <div className="relative flex-1 sm:flex-none">
                <select className="w-full sm:w-32 appearance-none bg-black/40 hover:bg-black/60 text-white text-xs px-3 py-2.5 rounded-lg border border-white/10 outline-none focus:border-violet-500 transition-colors cursor-pointer font-medium">
                  {DATA.filters.funis.map(f => <option key={f}>{f}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={12} />
              </div>

              <div className="relative flex-1 sm:flex-none">
                <select className="w-full sm:w-32 appearance-none bg-black/40 hover:bg-black/60 text-white text-xs px-3 py-2.5 rounded-lg border border-white/10 outline-none focus:border-violet-500 transition-colors cursor-pointer font-medium">
                  {DATA.filters.pixels.map(p => <option key={p}>{p}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={12} />
              </div>
            </div>

            {/* Search Action */}
            <div className="flex gap-2 flex-1 sm:flex-none">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                <input 
                  type="text" 
                  placeholder="Buscar..." 
                  className="w-full sm:w-40 bg-black/40 text-white text-xs pl-9 pr-3 py-2.5 rounded-lg border border-white/10 outline-none focus:border-violet-500 placeholder:text-gray-600 font-medium"
                />
              </div>
              <button className="bg-white text-black hover:bg-gray-200 px-5 py-2 rounded-lg text-xs font-bold transition-colors">
                Buscar
              </button>
            </div>

          </div>
        </header>

        {/* Content Grid */}
        <div className="flex-1 px-2 md:px-0 pb-6">
          
          {/* Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            {DATA.metrics.map(metric => (
              <NeonCard key={metric.id} {...metric} />
            ))}
          </div>

          {/* Main Visualizations Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            
            {/* Chart Area */}
            <div className="xl:col-span-2 bg-[#0a0a0a]/60 backdrop-blur-xl border border-white/5 rounded-2xl p-6 relative overflow-hidden flex flex-col">
              <div className="flex justify-between items-center mb-6 relative z-10">
                <div>
                  <h3 className="text-lg font-bold text-white">Visão Geral</h3>
                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-500"/>
                    Desempenho de Tráfego
                  </div>
                </div>

                <div className="flex bg-black/40 rounded-lg p-0.5 border border-white/5">
                  {['Pageviews', 'Clicks', 'Entradas'].map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab.toLowerCase())}
                      className={`
                        px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wide transition-all
                        ${activeTab === tab.toLowerCase() ? 'bg-white/10 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}
                      `}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-[280px] w-full relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={DATA.chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis dataKey="name" stroke="#525252" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                    <YAxis stroke="#525252" fontSize={10} tickLine={false} axisLine={false} dx={-10} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px' }}
                      itemStyle={{ color: '#fff', fontSize: '12px' }}
                      cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#8b5cf6" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorGradient)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Retention List */}
            <div className="bg-[#0a0a0a]/60 backdrop-blur-xl border border-white/5 rounded-2xl p-5 flex flex-col h-[400px] xl:h-auto">
              <div className="flex justify-between items-center mb-4 px-1">
                <div>
                  <h3 className="text-lg font-bold text-white">Retenção</h3>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">Últimos 7 dias</p>
                </div>
                <button className="p-1.5 hover:bg-white/5 rounded-lg text-gray-400 transition-colors">
                  <MoreHorizontal size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
                {DATA.retentionData.map((data, idx) => (
                  <RetentionRow key={idx} data={data} />
                ))}
              </div>
              
              <div className="mt-3 pt-3 border-t border-white/5 text-center">
                <button className="text-xs text-violet-400 hover:text-violet-300 font-medium transition-colors">
                  Ver todos os dados
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
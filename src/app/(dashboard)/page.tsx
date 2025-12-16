"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { format, startOfDay, endOfDay, subDays, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Eye, 
  Zap, 
  Users, 
  UserCheck, 
  ChevronDown,
  MoreHorizontal,
  Calendar as CalendarIcon,
  Filter as FilterIcon,
  RefreshCw
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { NeonCard } from "@/components/dashboard/new/neon-card";
import { RetentionRow } from "@/components/dashboard/new/retention-row";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DateRange } from "react-day-picker";

interface Funnel {
  id: string;
  name: string;
  slug: string;
}

interface Pixel {
  id: string;
  name: string;
}

export default function DashboardPage() {
  // Date Range (default: no filter)
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({ pageviews: 0, clicks: 0, joins: 0, leaves: 0 });
  const [chartData, setChartData] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('pageviews');
  
  // Filter States
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [pixels, setPixels] = useState<Pixel[]>([]);
  const [selectedFunnel, setSelectedFunnel] = useState<string>("all");
  const [selectedPixel, setSelectedPixel] = useState<string>("all");
  
  const supabase = createClient();

  // Fetch filter options on mount
  useEffect(() => {
    fetchFilterOptions();
  }, []);

  // Fetch data when filters change
  useEffect(() => {
    fetchData();
  }, [dateRange, selectedFunnel, selectedPixel]);

  async function fetchFilterOptions() {
    const { data: funnelsData } = await supabase.from("funnels").select("id, name, slug").order("name");
    if (funnelsData) setFunnels(funnelsData);

    const { data: pixelsData } = await supabase.from("pixels").select("id, name").order("name");
    if (pixelsData) setPixels(pixelsData);
  }

  async function fetchData() {
    setLoading(true);
    
    // Build query with filters
    let query = supabase.from("events").select("event_type, created_at, funnel_id, metadata");

    // Date filter
    if (dateRange?.from) {
      query = query.gte("created_at", startOfDay(dateRange.from).toISOString());
    }
    if (dateRange?.to) {
      query = query.lte("created_at", endOfDay(dateRange.to).toISOString());
    }

    // Funnel filter
    if (selectedFunnel !== "all") {
      query = query.eq("funnel_id", selectedFunnel);
    }

    const { data: events, error } = await query;

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    // Filter by pixel (need to get funnels that use this pixel)
    let filteredEvents = events || [];
    if (selectedPixel !== "all") {
      // Get funnel IDs that use this pixel
      const { data: funnelIds } = await supabase
        .from("funnels")
        .select("id")
        .eq("pixel_id", selectedPixel);
      
      const validFunnelIds = funnelIds?.map(f => f.id) || [];
      filteredEvents = filteredEvents.filter(e => validFunnelIds.includes(e.funnel_id));
    }

    const counts = {
      pageviews: 0,
      clicks: 0,
      joins: 0,
      leaves: 0
    };

    const dailyStats: Record<string, typeof counts> = {};

    // 1. Generate all days in the range (Default: Last 7 days)
    const end = dateRange?.to || new Date();
    const start = dateRange?.from || subDays(end, 6);
    
    // Normalize dates to avoid discrepancies
    const rangeDays = eachDayOfInterval({ 
        start: startOfDay(start), 
        end: endOfDay(end) 
    });

    // Initialize stats with 0 for all days
    rangeDays.forEach(day => {
        const isoDate = format(day, "yyyy-MM-dd");
        dailyStats[isoDate] = { pageviews: 0, clicks: 0, joins: 0, leaves: 0 };
    });

    filteredEvents.forEach((event: any) => {
      // Calculate totals
      if (event.event_type === "pageview") counts.pageviews++;
      if (event.event_type === "click") counts.clicks++;
      if (event.event_type === "join") counts.joins++;
      if (event.event_type === "leave") counts.leaves++;

      // Calculate daily stats
      const eventDate = new Date(event.created_at);
      const isoDate = format(eventDate, "yyyy-MM-dd");
      
      // Safety check if event date is inside range
      if (dailyStats[isoDate]) {
          if (event.event_type === "pageview") dailyStats[isoDate].pageviews++;
          if (event.event_type === "click") dailyStats[isoDate].clicks++;
          if (event.event_type === "join") dailyStats[isoDate].joins++;
          if (event.event_type === "leave") dailyStats[isoDate].leaves++;
      }
    });

    setMetrics(counts);

    // Prepare sorted chart data
    const chart = Object.keys(dailyStats)
      .sort()
      .map(isoDate => {
        const dStats = dailyStats[isoDate];
        const retentionRateVal = dStats.joins > 0 ? (dStats.joins - dStats.leaves) / dStats.joins : 0;
        
        return {
          name: format(new Date(isoDate), "dd/MM"),
          date: format(new Date(isoDate), "dd/MM"),
          rawDate: isoDate,
          pageviews: dStats.pageviews,
          clicks: dStats.clicks,
          joins: dStats.joins,
          leaves: dStats.leaves,
          retencao: Math.round(retentionRateVal * 100) + "%",
          status: retentionRateVal < 0.5 ? 'low' : retentionRateVal < 0.8 ? 'med' : 'high'
        };
      });

    setChartData(chart);
    setLoading(false);
  }
  
  // Calculate Rates for Cards
  const conversionRate = metrics.pageviews > 0 ? ((metrics.joins / metrics.pageviews) * 100).toFixed(1) + "%" : "0%";
  const clickRate = metrics.pageviews > 0 ? ((metrics.clicks / metrics.pageviews) * 100).toFixed(1) + "%" : "0%";
  const joinRate = metrics.clicks > 0 ? ((metrics.joins / metrics.clicks) * 100).toFixed(1) + "%" : "0%";
  const retentionRate = metrics.joins > 0 ? (((metrics.joins - metrics.leaves) / metrics.joins) * 100).toFixed(1) + "%" : "100%";

  const metricCards = [
    {
      id: "pageviews",
      title: "Pageviews",
      icon: Eye,
      value: metrics.pageviews.toLocaleString(), 
      status: "Estável",
      subLabel: "Conv. Geral",
      subValue: conversionRate,
      accent: "from-blue-500 to-cyan-400",
      shadow: "shadow-blue-500/20"
    },
    {
      id: "clicks",
      title: "Clicks",
      icon: Zap,
      value: metrics.clicks.toLocaleString(),
      status: "Estável",
      subLabel: "CTR",
      subValue: clickRate,
      accent: "from-amber-400 to-orange-500",
      shadow: "shadow-amber-500/20"
    },
    {
      id: "entradas",
      title: "Entradas",
      icon: Users,
      value: metrics.joins.toLocaleString(),
      status: "Estável",
      subLabel: "Taxa Entradas",
      subValue: joinRate,
      accent: "from-emerald-400 to-green-500",
      shadow: "shadow-emerald-500/20"
    },
    {
      id: "saidas",
      title: "Saídas",
      icon: UserCheck,
      value: metrics.leaves.toLocaleString(),
      status: "Estável",
      subLabel: "Retenção",
      subValue: retentionRate,
      accent: "from-rose-500 to-pink-500",
      shadow: "shadow-rose-500/20"
    }
  ];

  // Preset date functions
  const setPresetDate = (preset: string) => {
    const now = new Date();
    let from: Date;
    let to: Date = now;

    switch (preset) {
      case 'hoje':
        from = now;
        break;
      case 'ontem':
        from = subDays(now, 1);
        to = subDays(now, 1);
        break;
      case '7dias':
        from = subDays(now, 6);
        break;
      case '30dias':
        from = subDays(now, 29);
        break;
      case 'este_mes':
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'mes_passado':
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        from = lastMonth;
        to = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      default:
        from = now;
    }

    setDateRange({ from, to });
  };

  // Format date range display
  const dateRangeDisplay = dateRange?.from && dateRange?.to && dateRange.from.getTime() !== dateRange.to.getTime()
    ? `${format(dateRange.from, "dd/MM")} - ${format(dateRange.to, "dd/MM")}`
    : dateRange?.from
    ? format(dateRange.from, "dd/MM/yyyy")
    : "Selecionar período";

  return (
    <>
        <header className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 mb-8 px-2 md:px-0 pt-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/>
              <span className="text-gray-500 text-[10px] font-medium uppercase tracking-wider">
                {loading ? "Carregando..." : "Atualizado agora"}
              </span>
            </div>
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-white tracking-tight mb-1">
              Dashboard
            </h1>
            <p className="text-neutral-500 dark:text-gray-400 text-sm">Bem-vindo ao centro de controle TrackGram.</p>
          </div>

          <div className="w-full xl:w-auto p-1.5 bg-white dark:bg-white/[0.03] border border-neutral-200 dark:border-white/5 backdrop-blur-md rounded-xl flex flex-col sm:flex-row gap-2">
            
            {/* Date Range Picker */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center justify-between w-full sm:w-48 bg-neutral-100 dark:bg-black/40 hover:bg-neutral-200 dark:hover:bg-black/60 text-neutral-900 dark:text-white text-xs px-3 py-2.5 rounded-lg border border-neutral-200 dark:border-white/10 outline-none focus:border-violet-500 transition-colors cursor-pointer font-medium gap-2">
                  <CalendarIcon size={14} className="text-violet-500 dark:text-violet-400" />
                  <span className="flex-1 text-left">{dateRangeDisplay}</span>
                  <ChevronDown size={12} className="text-neutral-500 dark:text-gray-500" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 border-white/10 bg-black/95 text-white" align="start">
                <div className="flex">
                  {/* Preset Buttons */}
                  <div className="w-36 border-r border-white/10 p-3 space-y-1">
                    <button 
                      onClick={() => setPresetDate('hoje')}
                      className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-white/10 hover:text-white rounded-lg transition-colors"
                    >
                      Hoje
                    </button>
                    <button 
                      onClick={() => setPresetDate('ontem')}
                      className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-white/10 hover:text-white rounded-lg transition-colors"
                    >
                      Ontem
                    </button>
                    <button 
                      onClick={() => setPresetDate('7dias')}
                      className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-white/10 hover:text-white rounded-lg transition-colors"
                    >
                      7 dias atrás
                    </button>
                    <button 
                      onClick={() => setPresetDate('30dias')}
                      className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-white/10 hover:text-white rounded-lg transition-colors"
                    >
                      30 dias atrás
                    </button>
                    <button 
                      onClick={() => setPresetDate('este_mes')}
                      className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-white/10 hover:text-white rounded-lg transition-colors"
                    >
                      Este mês
                    </button>
                    <button 
                      onClick={() => setPresetDate('mes_passado')}
                      className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-white/10 hover:text-white rounded-lg transition-colors"
                    >
                      Mês passado
                    </button>
                  </div>
                  
                  {/* Calendar */}
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={(range) => {
                      // Allow single day selection by setting both from and to to the same date
                      if (range?.from && !range?.to) {
                        setDateRange({ from: range.from, to: range.from });
                      } else {
                        setDateRange(range);
                      }
                    }}
                    numberOfMonths={2}
                    locale={ptBR}
                    defaultMonth={new Date()}
                    toDate={new Date()}
                    className="p-3 bg-black text-white" 
                  />
                </div>
              </PopoverContent>
            </Popover>

            {/* Funnel Filter */}
            <div className="relative flex-1 sm:flex-none">
              <FilterIcon size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-violet-500 dark:text-violet-400" />
              <select 
                value={selectedFunnel}
                onChange={(e) => setSelectedFunnel(e.target.value)}
                className="w-full sm:w-36 appearance-none bg-neutral-100 dark:bg-black/40 hover:bg-neutral-200 dark:hover:bg-black/60 text-neutral-900 dark:text-white text-xs pl-8 pr-8 py-2.5 rounded-lg border border-neutral-200 dark:border-white/10 outline-none focus:border-violet-500 transition-colors cursor-pointer font-medium"
              >
                <option value="all">Todos Funis</option>
                {funnels.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-gray-500 pointer-events-none" size={12} />
            </div>

            {/* Pixel Filter */}
            <div className="relative flex-1 sm:flex-none">
              <select 
                value={selectedPixel}
                onChange={(e) => setSelectedPixel(e.target.value)}
                className="w-full sm:w-36 appearance-none bg-neutral-100 dark:bg-black/40 hover:bg-neutral-200 dark:hover:bg-black/60 text-neutral-900 dark:text-white text-xs px-3 pr-8 py-2.5 rounded-lg border border-neutral-200 dark:border-white/10 outline-none focus:border-violet-500 transition-colors cursor-pointer font-medium"
              >
                <option value="all">Todos Pixels</option>
                {pixels.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-gray-500 pointer-events-none" size={12} />
            </div>
            
            {/* Refresh Button */}
            <button 
              onClick={fetchData} 
              disabled={loading}
              className="flex items-center justify-center gap-2 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 text-white px-5 py-2 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 w-[110px]"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              <span>{loading ? 'Carregando' : 'Atualizar'}</span>
            </button>

          </div>
        </header>

        {/* Content Grid */}
        <div className="flex-1 px-2 md:px-0 pb-6">
          
          {/* Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            {metricCards.map(metric => (
              <NeonCard key={metric.id} {...metric} />
            ))}
          </div>

          {/* Main Visualizations Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            
            {/* Chart Area */}
            <div className="bg-white/60 dark:bg-[#0a0a0a]/60 backdrop-blur-xl border border-neutral-200 dark:border-white/5 rounded-2xl p-6 relative overflow-hidden flex flex-col">
              <div className="flex justify-between items-center mb-6 relative z-10">
                <div>
                  <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Visão Geral</h3>
                  <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-gray-400 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-500"/>
                    Desempenho de {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                  </div>
                </div>

                <div className="flex bg-neutral-100 dark:bg-black/40 rounded-lg p-0.5 border border-neutral-200 dark:border-white/5">
                  {['Pageviews', 'Clicks', 'Joins', 'Leaves'].map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab.toLowerCase())}
                      className={`
                        px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wide transition-all
                        ${activeTab === tab.toLowerCase() ? 'bg-white dark:bg-white/10 text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-900 dark:text-gray-500 dark:hover:text-gray-300'}
                      `}
                    >
                      {tab === 'Joins' ? 'Entradas' : tab === 'Leaves' ? 'Saídas' : tab}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 w-full relative z-10">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
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
                        dataKey={activeTab} 
                        stroke="#8b5cf6" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorGradient)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                    {loading ? "Carregando dados..." : "Nenhum dado para o período selecionado"}
                  </div>
                )}
              </div>
            </div>

            {/* Retention List */}
            <div className="bg-white/60 dark:bg-[#0a0a0a]/60 backdrop-blur-xl border border-neutral-200 dark:border-white/5 rounded-2xl p-5 flex flex-col h-[450px]">
              <div className="flex justify-between items-center mb-4 px-1">
                <div>
                  <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Retenção</h3>
                  <p className="text-[10px] text-neutral-500 dark:text-gray-500 uppercase tracking-wider mt-0.5">
                    {dateRangeDisplay === "Selecionar período" ? "Últimos 7 dias" : dateRangeDisplay}
                  </p>
                </div>
                <button className="p-1.5 hover:bg-white/5 rounded-lg text-gray-400 transition-colors">
                  <MoreHorizontal size={16} />
                </button>
              </div>

              {/* Table Header */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-100 dark:border-white/5 mb-2">
                <div className="flex items-center gap-3 w-[120px]">
                    <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Dia</span>
                </div>
                <div className="hidden sm:block text-right w-[80px]">
                    <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Entradas</span>
                </div>
                <div className="hidden sm:block text-right w-[80px]">
                    <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Saídas</span>
                </div>
                <div className="text-right w-[80px]">
                    <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Retenção</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
                {chartData.length > 0 ? (
                  [...chartData].reverse().map((data: any, idx: number) => (
                    <RetentionRow key={idx} data={{
                          dia: data.date,
                          entradas: data.joins,
                          saidas: data.leaves,
                          retencao: data.retencao,
                          status: data.status as 'high' | 'med' | 'low'
                    }} />
                  ))
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                    {loading ? "Carregando..." : "Sem dados"}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
    </>
  );
}

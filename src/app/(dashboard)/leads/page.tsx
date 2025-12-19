"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Users, 
  UserPlus, 
  UserMinus, 
  Download, 
  Filter, 
  Search, 
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  MapPin,
  Globe,
  Bot
} from 'lucide-react';
import { NeonCard } from "@/components/dashboard/new/neon-card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { toast } from "sonner";

interface Lead {
  id: string;
  visitor_id: string;
  telegram_user_id: number | string;
  telegram_username: string | null;
  funnel_id: string | null;
  funnel_name?: string;
  bot_name?: string;
  status: 'active' | 'left';
  joined_at: string;
  left_at?: string;
  city?: string;
  region?: string;
  country?: string;
  utm_source?: string;
  utm_campaign?: string;
  utm_medium?: string;
  utm_content?: string;
  utm_term?: string;
  telegram_name?: string;
  source?: string;
}

export default function LeadsPage() {
  const supabase = createClient();
  
  // State
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, left: 0 });
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  
  // Filters
  const [search, setSearch] = useState("");
  const [selectedFunnel, setSelectedFunnel] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [funnels, setFunnels] = useState<{id: string, name: string}[]>([]);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    fetchFunnels();
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [page, dateRange, selectedFunnel, selectedStatus, search]);

  async function fetchFunnels() {
    const { data } = await supabase.from("funnels").select("id, name").order("name");
    if (data) setFunnels(data);
  }

  async function fetchLeads() {
    setLoading(true);
    try {
      // 1. Build Query for Joins
      let query = supabase
        .from("events")
        .select(`
          id,
          visitor_id,
          funnel_id,
          created_at,
          metadata,
          funnels ( name, bot_id, telegram_bots ( name ) )
        `, { count: 'exact' })
        .eq("event_type", "join")
        .order("created_at", { ascending: false });

      // Apply Filters
      if (dateRange?.from) {
        query = query.gte("created_at", dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        // Adjust to end of day
        const endDate = new Date(dateRange.to);
        endDate.setHours(23, 59, 59, 999);
        query = query.lte("created_at", endDate.toISOString());
      }
      if (selectedFunnel !== "all") {
        query = query.eq("funnel_id", selectedFunnel);
      }
      
      // Search (visitor_id, telegram_username, or telegram_user_id in metadata)
      // Note: Supabase JSON filtering is limited, so we might need to filter client-side or use specific operators
      // For now, let's filter by visitor_id if it looks like a UUID, or try metadata filter
      if (search) {
        // This is tricky with JSONB. We'll try a simple text search on visitor_id first
        query = query.ilike("visitor_id", `%${search}%`);
      }

      // Pagination
      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);

      const { data: joinEvents, count, error } = await query;

      if (error) throw error;

      if (joinEvents) {
        // 2. Fetch Leave Events for these visitors to determine status
        const visitorIds = joinEvents.map(e => e.visitor_id);
        const { data: leaveEvents } = await supabase
          .from("events")
          .select("visitor_id, created_at")
          .eq("event_type", "leave")
          .in("visitor_id", visitorIds);

        // 3. Process Leads
        const processedLeads: Lead[] = joinEvents.map((event: any) => {
          const leaveEvent = leaveEvents?.find(
            l => l.visitor_id === event.visitor_id && new Date(l.created_at) > new Date(event.created_at)
          );
          
          const meta = event.metadata || {};
          const funnel = event.funnels;
          const bot = funnel?.telegram_bots;

          // Filter by status if selected
          const status = leaveEvent ? 'left' : 'active';
          if (selectedStatus !== "all" && status !== selectedStatus) return null;

          return {
            id: event.id,
            visitor_id: event.visitor_id,
            telegram_user_id: meta.telegram_user_id || 'N/A',
            telegram_username: meta.telegram_username,
            funnel_id: event.funnel_id,
            funnel_name: funnel?.name || 'Desconhecido',
            bot_name: bot?.name || 'Desconhecido',
            status: status,
            joined_at: event.created_at,
            left_at: leaveEvent?.created_at,
            city: meta.city,
            region: meta.region,
            country: meta.country,
            utm_source: meta.utm_source,
            utm_campaign: meta.utm_campaign,
            utm_medium: meta.utm_medium,
            utm_content: meta.utm_content,
            utm_term: meta.utm_term,
            telegram_name: meta.telegram_name,
            source: meta.source
          };
        }).filter(Boolean) as Lead[];

        setLeads(processedLeads);
        setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE));

        // Update Stats (Approximation based on current query or separate count query)
        // For accurate stats, we should run separate count queries
        fetchStats();
      }

    } catch (err) {
      console.error("Erro ao buscar leads:", err);
      toast.error("Erro ao carregar leads");
    } finally {
      setLoading(false);
    }
  }

  async function fetchStats() {
    // Simple stats fetching
    // Total Joins
    const { count: total } = await supabase
      .from("events")
      .select("*", { count: 'exact', head: true })
      .eq("event_type", "join");

    // Total Leaves
    const { count: left } = await supabase
      .from("events")
      .select("*", { count: 'exact', head: true })
      .eq("event_type", "leave");

    setStats({
      total: total || 0,
      active: (total || 0) - (left || 0),
      left: left || 0
    });
  }

  const handleExport = () => {
    // Simple CSV Export
    const headers = ["Visitor ID", "Telegram User", "Nome", "Username", "Status", "Entrou em", "Saiu em", "Funil", "Bot", "Cidade", "Estado", "País", "UTM Source", "UTM Medium", "UTM Campaign", "UTM Content", "UTM Term"];
    const csvContent = [
      headers.join(","),
      ...leads.map(lead => [
        lead.visitor_id,
        lead.telegram_user_id,
        lead.telegram_name || "",
        lead.telegram_username || "",
        lead.status === 'active' ? 'Entrou' : 'Saiu',
        format(new Date(lead.joined_at), "dd/MM/yyyy HH:mm"),
        lead.left_at ? format(new Date(lead.left_at), "dd/MM/yyyy HH:mm") : "",
        lead.funnel_name,
        lead.bot_name,
        lead.city || "",
        lead.region || "",
        lead.country || "",
        lead.utm_source || "",
        lead.utm_medium || "",
        lead.utm_campaign || "",
        lead.utm_content || "",
        lead.utm_term || ""
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `leads_export_${format(new Date(), "yyyy-MM-dd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white tracking-tight">Leads</h1>
          <p className="text-neutral-500 dark:text-gray-400 mt-1">Gerencie e analise todos os leads capturados pelo sistema.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={fetchLeads}
            className="p-2 bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-lg hover:bg-neutral-50 dark:hover:bg-white/10 transition-colors"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Download size={18} />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <NeonCard 
          title="Total de Leads"
          icon={Users}
          value={stats.total.toLocaleString()}
          subLabel="Total histórico"
          subValue="100%"
          accent="from-violet-500 to-purple-500"
          shadow="shadow-violet-500/20"
        />
        <NeonCard 
          title="Leads Ativos"
          icon={UserPlus}
          value={stats.active.toLocaleString()}
          subLabel="Taxa de Retenção"
          subValue={stats.total > 0 ? `${((stats.active / stats.total) * 100).toFixed(1)}%` : "0%"}
          accent="from-emerald-500 to-green-500"
          shadow="shadow-emerald-500/20"
        />
        <NeonCard 
          title="Saíram"
          icon={UserMinus}
          value={stats.left.toLocaleString()}
          subLabel="Churn Rate"
          subValue={stats.total > 0 ? `${((stats.left / stats.total) * 100).toFixed(1)}%` : "0%"}
          accent="from-rose-500 to-red-500"
          shadow="shadow-rose-500/20"
        />
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-white/5 rounded-xl p-4 mb-6 flex flex-col xl:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input 
              type="text" 
              placeholder="Buscar por Visitor ID..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-64 bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm outline-none focus:border-violet-500 transition-colors"
            />
          </div>

          {/* Date Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-2 bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-neutral-600 dark:text-gray-300 hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors">
                <CalendarIcon size={16} />
                <span>
                  {dateRange?.from ? (
                    dateRange.to ? (
                      `${format(dateRange.from, "dd/MM")} - ${format(dateRange.to, "dd/MM")}`
                    ) : (
                      format(dateRange.from, "dd/MM/yyyy")
                    )
                  ) : (
                    "Todas as datas"
                  )}
                </span>
                <ChevronDown size={14} className="ml-auto opacity-50" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={setDateRange}
                initialFocus
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
          {/* Funnel Filter */}
          <div className="relative">
            <select 
              value={selectedFunnel}
              onChange={(e) => setSelectedFunnel(e.target.value)}
              className="w-full sm:w-48 appearance-none bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-lg pl-3 pr-8 py-2 text-sm outline-none focus:border-violet-500 transition-colors cursor-pointer"
            >
              <option value="all">Todos os Funis</option>
              {funnels.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            <Filter size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select 
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full sm:w-40 appearance-none bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-lg pl-3 pr-8 py-2 text-sm outline-none focus:border-violet-500 transition-colors cursor-pointer"
            >
              <option value="all">Todos Status</option>
              <option value="active">Entrou (Ativo)</option>
              <option value="left">Saiu</option>
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-white/5 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-neutral-50 dark:bg-white/5 text-neutral-500 dark:text-gray-400 font-medium border-b border-neutral-200 dark:border-white/5">
              <tr>
                <th className="px-6 py-3">Lead / Telegram</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Origem (Funil/Bot)</th>
                <th className="px-6 py-3">Localização</th>
                <th className="px-6 py-3">UTMs</th>
                <th className="px-6 py-3">Datas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-neutral-500">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw size={24} className="animate-spin text-violet-500" />
                      <p>Carregando leads...</p>
                    </div>
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-neutral-500">
                    Nenhum lead encontrado com os filtros atuais.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-neutral-50 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-neutral-900 dark:text-white flex items-center gap-2">
                          {lead.telegram_name ? (
                            <>{lead.telegram_name}</>
                          ) : lead.telegram_username ? (
                            <>@{lead.telegram_username}</>
                          ) : (
                            <span className="italic text-gray-500">Sem nome</span>
                          )}
                        </span>
                        <span className="text-xs text-neutral-500 font-mono mt-0.5" title="Visitor ID">
                          {lead.visitor_id.substring(0, 8)}...
                        </span>
                        <span className="text-[10px] text-neutral-400 mt-0.5">
                          ID: {lead.telegram_user_id}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`
                        inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border
                        ${lead.status === 'active' 
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'}
                      `}>
                        <span className={`w-1.5 h-1.5 rounded-full ${lead.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        {lead.status === 'active' ? 'Entrou' : 'Saiu'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-neutral-900 dark:text-white font-medium">
                          <Filter size={12} className="text-violet-500" />
                          {lead.funnel_name}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                          <Bot size={12} />
                          {lead.bot_name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5 text-neutral-700 dark:text-gray-300">
                          <MapPin size={12} className="text-gray-400" />
                          {lead.city || 'N/A'} - {lead.region || ''}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-neutral-500 pl-4">
                          <Globe size={10} />
                          {lead.country || 'N/A'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 text-[10px]">
                        {lead.utm_source && (
                          <span className="bg-violet-500/10 text-violet-600 dark:text-violet-400 px-1.5 py-0.5 rounded w-fit border border-violet-500/20">
                            src: {lead.utm_source}
                          </span>
                        )}
                        {lead.utm_medium && (
                          <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded w-fit border border-blue-500/20">
                            med: {lead.utm_medium}
                          </span>
                        )}
                        {lead.utm_campaign && (
                          <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded w-fit border border-emerald-500/20">
                            cmp: {lead.utm_campaign}
                          </span>
                        )}
                        {lead.utm_content && (
                          <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded w-fit border border-amber-500/20">
                            cnt: {lead.utm_content}
                          </span>
                        )}
                        {lead.utm_term && (
                          <span className="bg-rose-500/10 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded w-fit border border-rose-500/20">
                            trm: {lead.utm_term}
                          </span>
                        )}
                        {!lead.utm_source && !lead.utm_medium && !lead.utm_campaign && !lead.utm_content && !lead.utm_term && (
                          <span className="text-neutral-400 italic">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 text-xs">
                        <div className="text-emerald-600 dark:text-emerald-400">
                          Entrou: {format(new Date(lead.joined_at), "dd/MM/yy HH:mm")}
                        </div>
                        {lead.left_at && (
                          <div className="text-rose-600 dark:text-rose-400">
                            Saiu: {format(new Date(lead.left_at), "dd/MM/yy HH:mm")}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-neutral-200 dark:border-white/5 flex items-center justify-between">
          <span className="text-sm text-neutral-500 dark:text-gray-400">
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

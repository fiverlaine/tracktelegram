"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Users, 
  Wallet, 
  Download, 
  Search, 
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Lock,
  TrendingUp,
  CreditCard,
  UserCheck,
  Filter,
  MapPin,
  DollarSign
} from 'lucide-react';
import { NeonCard } from "@/components/dashboard/new/neon-card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const RESTRICTED_EMAIL = "azevedoryan0876@gmail.com";

interface BetLead {
  id: string;
  email: string | null;
  phone: string | null;
  visitor_id: string;
  deposit_value: number | null;
  deposit_at: string | null;
  created_at: string;
  status: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  source_table: string;
}

export default function RestrictedDashboardPage() {
  const supabase = createClient();
  
  // Auth State
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [user, setUser] = useState<any>(null);

  // Data State
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<BetLead[]>([]);
  const [stats, setStats] = useState({
    totalLeads: 0,
    totalDeposits: 0,
    totalDepositValue: 0,
    conversionRate: 0,
  });
  
  // Filters
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  const [search, setSearch] = useState("");
  const [selectedTable, setSelectedTable] = useState("all");
  const [depositFilter, setDepositFilter] = useState("all"); // "all" | "deposited" | "not_deposited"
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Date Presets
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
      case 'all':
        setDateRange(undefined);
        return;
      default:
        from = now;
    }

    setDateRange({ from, to });
  };

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user && user.email === RESTRICTED_EMAIL) {
        setIsAuthorized(true);
      } else {
        setIsAuthorized(false);
      }
    }
    checkAuth();
  }, [supabase]);

  useEffect(() => {
    if (isAuthorized) {
      fetchData();
    }
  }, [isAuthorized, dateRange, selectedTable]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, depositFilter, selectedTable, dateRange]);

  async function fetchData() {
    setLoading(true);
    try {
      const tables = selectedTable === "all" 
        ? ["bet_leads", "bet_leads_lucasmagnotti", "bet_leads_pedrozutti"]
        : [selectedTable];

      let allLeads: BetLead[] = [];

      for (const table of tables) {
        let query = supabase
          .from(table)
          .select("*")
          .order("created_at", { ascending: false });

        if (dateRange?.from) {
          query = query.gte("created_at", dateRange.from.toISOString());
        }
        if (dateRange?.to) {
          const endDate = new Date(dateRange.to);
          endDate.setHours(23, 59, 59, 999);
          query = query.lte("created_at", endDate.toISOString());
        }

        const { data, error } = await query;
        if (error) throw error;

        if (data) {
          const leadsWithSource = data.map(item => ({
            ...item,
            source_table: table
          }));
          allLeads = [...allLeads, ...leadsWithSource];
        }
      }

      // Sort by created_at desc
      allLeads.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Calculate Stats
      const totalLeads = allLeads.length;
      const deposits = allLeads.filter(l => l.deposit_value && l.deposit_value > 0);
      const totalDeposits = deposits.length;
      const totalDepositValue = deposits.reduce((acc, current) => acc + (Number(current.deposit_value) || 0), 0);
      const conversionRate = totalLeads > 0 ? (totalDeposits / totalLeads) * 100 : 0;

      setLeads(allLeads);
      setStats({
        totalLeads,
        totalDeposits,
        totalDepositValue,
        conversionRate,
      });

    } catch (err) {
      console.error("Erro ao buscar dados:", err);
      toast.error("Erro ao carregar dados do dashboard");
    } finally {
      setLoading(false);
    }
  }

  const handleExport = () => {
    const headers = ["ID", "Email", "Telefone", "Tabela", "Valor Depósito", "Data Depósito", "Criado em", "UTM Source", "UTM Medium", "UTM Campaign", "Cidade", "Estado", "País"];
    const csvContent = [
      headers.join(","),
      ...leads.map(lead => [
        lead.id,
        lead.email || "",
        lead.phone || "",
        lead.source_table,
        lead.deposit_value || 0,
        lead.deposit_at ? format(new Date(lead.deposit_at), "dd/MM/yyyy HH:mm") : "",
        format(new Date(lead.created_at), "dd/MM/yyyy HH:mm"),
        lead.utm_source || "",
        lead.utm_medium || "",
        lead.utm_campaign || "",
        lead.city || "",
        lead.state || "",
        lead.country || ""
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `dashboard_master_export_${format(new Date(), "yyyy-MM-dd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered leads with deposit filter
  const filteredLeads = useMemo(() => {
    let filtered = leads.filter(lead => 
      lead.id.toLowerCase().includes(search.toLowerCase()) ||
      (lead.email && lead.email.toLowerCase().includes(search.toLowerCase())) ||
      (lead.phone && lead.phone.includes(search))
    );

    // Apply deposit filter
    if (depositFilter === "deposited") {
      filtered = filtered.filter(l => l.deposit_value && l.deposit_value > 0);
    } else if (depositFilter === "not_deposited") {
      filtered = filtered.filter(l => !l.deposit_value || l.deposit_value === 0);
    }

    return filtered;
  }, [leads, search, depositFilter]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);
  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLeads.slice(start, start + itemsPerPage);
  }, [filteredLeads, currentPage, itemsPerPage]);

  // Date display
  const dateRangeDisplay = dateRange?.from && dateRange?.to && dateRange.from.getTime() !== dateRange.to.getTime()
    ? `${format(dateRange.from, "dd/MM")} - ${format(dateRange.to, "dd/MM")}`
    : dateRange?.from
    ? format(dateRange.from, "dd/MM/yyyy")
    : "Todo o período";

  if (isAuthorized === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <RefreshCw className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    );
  }

  if (isAuthorized === false) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-black px-4 text-center">
        <div className="mb-6 rounded-full bg-red-500/10 p-4">
          <Lock className="h-12 w-12 text-red-500" />
        </div>
        <h1 className="mb-2 text-2xl font-bold text-white">Acesso Restrito</h1>
        <p className="max-w-md text-gray-400">
          Esta área é restrita. Se você é o administrador, certifique-se de estar logado com o e-mail correto.
        </p>
        <button 
          onClick={() => window.location.href = '/login'}
          className="mt-8 rounded-lg bg-white px-6 py-2 font-bold text-black transition-transform hover:scale-105 active:scale-95"
        >
          Fazer Login de Admin
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-900/20 via-black to-black text-white selection:bg-violet-500/30">
      <div className="mx-auto max-w-[1600px] p-6">
        
        {/* Header */}
        <header className="mb-10 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-400">Master Dashboard</span>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white md:text-5xl">
              Hub de <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Alta Performance</span>
            </h1>
            <p className="mt-2 text-gray-400">Visão consolidada de todas as operações e funis.</p>
          </motion.div>

          <motion.div 
            className="flex flex-wrap gap-3"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <button 
              onClick={fetchData}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 font-medium backdrop-blur-md transition-all hover:bg-white/10 active:scale-95"
            >
              <RefreshCw className={loading ? "animate-spin" : ""} size={18} />
              Recarregar
            </button>
            <button 
              onClick={handleExport}
              className="group flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 font-bold shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all hover:bg-violet-500 hover:shadow-[0_0_25px_rgba(139,92,246,0.5)] active:scale-95"
            >
              <Download size={18} className="transition-transform group-hover:-translate-y-0.5" />
              Exportar Dados
            </button>
          </motion.div>
        </header>

        {/* Stats Grid */}
        <div className="mb-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <AnimatePresence mode="popLayout">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <NeonCard 
                title="Total de Leads"
                icon={Users}
                value={stats.totalLeads.toLocaleString()}
                subLabel="Volume consolidado"
                subValue="100%"
                accent="from-blue-500 to-indigo-500"
                shadow="shadow-blue-500/20"
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <NeonCard 
                title="Total de Depósitos"
                icon={UserCheck}
                value={stats.totalDeposits.toLocaleString()}
                subLabel="Conversão"
                subValue={`${stats.conversionRate.toFixed(1)}%`}
                accent="from-emerald-500 to-teal-500"
                shadow="shadow-emerald-500/20"
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <NeonCard 
                title="Valor Total"
                icon={Wallet}
                value={`R$ ${stats.totalDepositValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                subLabel="Média por dep"
                subValue={`R$ ${stats.totalDeposits > 0 ? (stats.totalDepositValue / stats.totalDeposits).toFixed(2) : "0,00"}`}
                accent="from-fuchsia-500 to-pink-500"
                shadow="shadow-fuchsia-500/20"
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.4 }}
            >
              <NeonCard 
                title="Status"
                icon={TrendingUp}
                value="Ativo"
                subLabel="Tempo de Resposta"
                subValue="Instantâneo"
                accent="from-amber-400 to-orange-500"
                shadow="shadow-amber-500/20"
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Filters Section */}
        <motion.div 
          className="mb-8 flex flex-col gap-4 rounded-3xl border border-white/5 bg-white/[0.03] p-6 backdrop-blur-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input 
                  type="text" 
                  placeholder="Filtrar por ID, Email ou Telefone..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-10 pr-4 text-sm outline-none ring-violet-500/50 transition-all focus:border-violet-500 focus:ring-4 sm:w-[320px]"
                />
              </div>

              {/* Date Range with Presets */}
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm font-medium transition-all hover:bg-white/5">
                    <CalendarIcon size={16} className="text-violet-400" />
                    <span>{dateRangeDisplay}</span>
                    <ChevronDown size={14} className="ml-auto opacity-50" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto border-white/10 bg-black/95 p-0 backdrop-blur-xl" align="start">
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
                        Últimos 7 dias
                      </button>
                      <button 
                        onClick={() => setPresetDate('30dias')}
                        className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-white/10 hover:text-white rounded-lg transition-colors"
                      >
                        Últimos 30 dias
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
                      <button 
                        onClick={() => setPresetDate('all')}
                        className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-white/10 hover:text-white rounded-lg transition-colors"
                      >
                        Todo o período
                      </button>
                    </div>
                    
                    {/* Calendar */}
                    <Calendar
                      mode="range"
                      selected={dateRange}
                      onSelect={setDateRange}
                      locale={ptBR}
                      numberOfMonths={2}
                      defaultMonth={new Date()}
                      toDate={new Date()}
                      className="p-3"
                    />
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex flex-wrap gap-3">
              {/* Deposit Filter */}
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400" size={14} />
                <select 
                  value={depositFilter}
                  onChange={(e) => setDepositFilter(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-white/10 bg-black/40 py-2.5 pl-10 pr-10 text-sm outline-none transition-all focus:border-violet-500 sm:w-auto"
                >
                  <option value="all">Todos os Leads</option>
                  <option value="deposited">✅ Apenas Depositados</option>
                  <option value="not_deposited">❌ Não Depositou</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" size={12} />
              </div>
              
              {/* Table Filter */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-violet-400" size={14} />
                <select 
                  value={selectedTable}
                  onChange={(e) => setSelectedTable(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-white/10 bg-black/40 py-2.5 pl-10 pr-10 text-sm outline-none transition-all focus:border-violet-500 sm:w-auto"
                >
                  <option value="all">Todas as Tabelas</option>
                  <option value="bet_leads">Geral (bet_leads)</option>
                  <option value="bet_leads_lucasmagnotti">Lucas Magnotti</option>
                  <option value="bet_leads_pedrozutti">Pedro Zutti</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" size={12} />
              </div>
            </div>
          </div>
          
          {/* Results Summary */}
          <div className="flex items-center justify-between border-t border-white/5 pt-4 text-sm text-gray-400">
            <span>
              Mostrando <span className="font-bold text-white">{paginatedLeads.length}</span> de <span className="font-bold text-white">{filteredLeads.length}</span> resultados
            </span>
            <div className="flex items-center gap-2">
              <span>Itens por página:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="appearance-none rounded-lg border border-white/10 bg-black/40 px-3 py-1 text-sm outline-none focus:border-violet-500"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Leads Table */}
        <motion.div 
          className="overflow-hidden rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-xl transition-all hover:bg-white/[0.03]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                <tr>
                  <th className="px-8 py-5">Lead / Origem</th>
                  <th className="px-6 py-5">Valor Depósito</th>
                  <th className="px-6 py-5">Contato</th>
                  <th className="px-6 py-5">UTMs</th>
                  <th className="px-6 py-5">Localização</th>
                  <th className="px-6 py-5">Data Cadastro</th>
                  <th className="px-8 py-5 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={7} className="px-8 py-4">
                        <div className="h-6 rounded bg-white/5" />
                      </td>
                    </tr>
                  ))
                ) : paginatedLeads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Users className="h-10 w-10 text-gray-600" />
                        <p className="text-gray-400">Nenhum registro encontrado.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedLeads.map((lead) => (
                    <tr key={`${lead.source_table}-${lead.id}`} className="group transition-colors hover:bg-white/5">
                      <td className="px-8 py-5">
                        <div className="flex flex-col">
                          <span className="font-semibold text-white">
                            {lead.id.substring(0, 8)}...
                          </span>
                          <span className={`mt-1 inline-flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-tighter
                            ${lead.source_table === 'bet_leads' ? 'border-blue-500/20 bg-blue-500/10 text-blue-400' : 
                              lead.source_table === 'bet_leads_lucasmagnotti' ? 'border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-400' : 
                              'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'}
                          `}>
                            {lead.source_table.replace('bet_leads_', '').replace('bet_leads', 'GERAL')}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        {lead.deposit_value ? (
                          <div className="flex flex-col">
                            <span className="flex items-center gap-2 font-bold text-emerald-400">
                              <CreditCard size={14} />
                              R$ {Number(lead.deposit_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                            <span className="mt-1 text-[10px] text-gray-500">
                              {lead.deposit_at ? format(new Date(lead.deposit_at), "dd/MM HH:mm") : ""}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-600 italic">Nenhum depósito</span>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1">
                          {lead.email && <span className="text-gray-300">{lead.email}</span>}
                          {lead.phone && <span className="text-xs text-gray-500">{lead.phone}</span>}
                          {!lead.email && !lead.phone && <span className="text-gray-600">-</span>}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-wrap gap-1 max-w-[280px]">
                          {lead.utm_source && (
                            <span className="rounded-md bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 text-[10px] text-violet-400">
                              src: {lead.utm_source}
                            </span>
                          )}
                          {lead.utm_medium && (
                            <span className="rounded-md bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-[10px] text-blue-400">
                              med: {lead.utm_medium}
                            </span>
                          )}
                          {lead.utm_campaign && (
                            <span className="rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-400">
                              cmp: {lead.utm_campaign}
                            </span>
                          )}
                          {lead.utm_content && (
                            <span className="rounded-md bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] text-amber-400">
                              cnt: {lead.utm_content}
                            </span>
                          )}
                          {lead.utm_term && (
                            <span className="rounded-md bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 text-[10px] text-rose-400">
                              trm: {lead.utm_term}
                            </span>
                          )}
                          {!lead.utm_source && !lead.utm_medium && !lead.utm_campaign && !lead.utm_content && !lead.utm_term && (
                            <span className="text-gray-600">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-0.5">
                          {(lead.city || lead.state || lead.country) ? (
                            <>
                              <div className="flex items-center gap-1.5 text-gray-300">
                                <MapPin size={12} className="text-violet-400" />
                                {lead.city || ""}{lead.city && lead.state ? ", " : ""}{lead.state || ""}
                              </div>
                              {lead.country && (
                                <span className="text-[10px] text-gray-500 pl-4">{lead.country}</span>
                              )}
                            </>
                          ) : (
                            <span className="text-gray-600">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="text-white">
                            {format(new Date(lead.created_at), "dd/MM/yyyy")}
                          </span>
                          <span className="text-[10px] text-gray-500">
                            {format(new Date(lead.created_at), "HH:mm")}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <button className="rounded-lg bg-white/5 p-2 text-gray-400 transition-all hover:bg-white/10 hover:text-white">
                          <TrendingUp size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && filteredLeads.length > 0 && (
            <div className="flex items-center justify-between border-t border-white/5 px-8 py-4">
              <span className="text-sm text-gray-400">
                Página <span className="font-bold text-white">{currentPage}</span> de <span className="font-bold text-white">{totalPages}</span>
              </span>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium transition-all hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Primeira
                </button>
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="rounded-lg border border-white/10 bg-white/5 p-2 transition-all hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} />
                </button>
                
                {/* Page Numbers */}
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                          currentPage === pageNum 
                            ? 'bg-violet-600 text-white' 
                            : 'border border-white/10 bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-lg border border-white/10 bg-white/5 p-2 transition-all hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={16} />
                </button>
                <button 
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium transition-all hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Última
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

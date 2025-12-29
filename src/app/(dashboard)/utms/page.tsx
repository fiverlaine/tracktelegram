"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Loader2, Tags, BarChart2, HelpCircle, ChevronDown, ChevronUp, 
  Copy, Check, TrendingUp, TrendingDown, Target, Layers, 
  MousePointerClick, Users, Eye, Filter, Calendar, RefreshCw,
  ArrowUpRight, ArrowDownRight, Minus, Megaphone, LayoutGrid
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";

// Tipos
interface EventData {
  event_type: string;
  metadata: {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    utm_term?: string;
    site_source_name?: string;
    campaign_id?: string;
    adset_id?: string;
    ad_id?: string;
  };
  created_at: string;
}

interface AggregatedData {
  name: string;
  pageviews: number;
  clicks: number;
  leads: number;
  leaves: number;
  campaignId?: string;
  adsetId?: string;
  adId?: string;
}

type TabType = "campaign" | "adset" | "ad" | "placement";
type DateRange = "today" | "7d" | "30d" | "all";

export default function UTMsPage() {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventData[]>([]);
  const [showHelp, setShowHelp] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("campaign");
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [selectedAdset, setSelectedAdset] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchEvents();
  }, [dateRange]);

  async function fetchEvents() {
    setLoading(true);

    let query = supabase
      .from("events")
      .select("event_type, metadata, created_at")
      .order("created_at", { ascending: false });

    // Filtro de data
    if (dateRange !== "all") {
      const now = new Date();
      let startDate: Date;
      
      switch (dateRange) {
        case "today":
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case "7d":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "30d":
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(0);
      }
      
      query = query.gte("created_at", startDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching events:", error);
      setLoading(false);
      return;
    }

    setEvents(data || []);
    setLoading(false);
  }

  // Agregar dados por dimensão
  const aggregateByField = (field: string): AggregatedData[] => {
    const aggregated: Record<string, AggregatedData> = {};

    events.forEach((event) => {
      let key: string;
      let campaignId: string | undefined;
      let adsetId: string | undefined;
      let adId: string | undefined;

      switch (field) {
        case "campaign":
          key = event.metadata?.utm_campaign || "(sem campanha)";
          campaignId = event.metadata?.campaign_id;
          break;
        case "adset":
          key = event.metadata?.utm_medium || "(sem conjunto)";
          adsetId = event.metadata?.adset_id;
          break;
        case "ad":
          key = event.metadata?.utm_content || "(sem anúncio)";
          adId = event.metadata?.ad_id;
          break;
        case "placement":
          key = event.metadata?.utm_source || event.metadata?.site_source_name || "(sem placement)";
          break;
        default:
          key = "(desconhecido)";
      }

      // Filtros de drill-down
      if (selectedCampaign && event.metadata?.utm_campaign !== selectedCampaign) return;
      if (selectedAdset && event.metadata?.utm_medium !== selectedAdset) return;

      if (!aggregated[key]) {
        aggregated[key] = {
          name: key,
          pageviews: 0,
          clicks: 0,
          leads: 0,
          leaves: 0,
          campaignId,
          adsetId,
          adId
        };
      }

      const entry = aggregated[key];
      if (event.event_type === "pageview") entry.pageviews++;
      if (event.event_type === "click") entry.clicks++;
      if (event.event_type === "join") entry.leads++;
      if (event.event_type === "leave") entry.leaves++;
    });

    return Object.values(aggregated).sort((a, b) => b.leads - a.leads);
  };

  const data = useMemo(() => aggregateByField(activeTab), [events, activeTab, selectedCampaign, selectedAdset]);

  // Totais
  const totals = useMemo(() => {
    return data.reduce(
      (acc, row) => ({
        pageviews: acc.pageviews + row.pageviews,
        clicks: acc.clicks + row.clicks,
        leads: acc.leads + row.leads,
        leaves: acc.leaves + row.leaves,
      }),
      { pageviews: 0, clicks: 0, leads: 0, leaves: 0 }
    );
  }, [data]);

  // Taxa de conversão geral
  const overallCTR = totals.pageviews > 0 ? ((totals.clicks / totals.pageviews) * 100).toFixed(1) : "0";
  const overallConvRate = totals.clicks > 0 ? ((totals.leads / totals.clicks) * 100).toFixed(1) : "0";

  function getConversionRateColor(rate: number) {
    if (rate >= 50) return "text-emerald-400 bg-emerald-500/20 border-emerald-500/30";
    if (rate >= 30) return "text-green-400 bg-green-500/20 border-green-500/30";
    if (rate >= 20) return "text-blue-400 bg-blue-500/20 border-blue-500/30";
    if (rate >= 10) return "text-amber-400 bg-amber-500/20 border-amber-500/30";
    return "text-gray-400 bg-white/5 border-white/10";
  }

  function getTrendIcon(rate: number) {
    if (rate >= 30) return <TrendingUp className="h-3 w-3" />;
    if (rate >= 10) return <ArrowUpRight className="h-3 w-3" />;
    if (rate < 5) return <ArrowDownRight className="h-3 w-3" />;
    return <Minus className="h-3 w-3" />;
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const tabs: { key: TabType; label: string; icon: React.ReactNode; description: string }[] = [
    { key: "campaign", label: "Campanhas", icon: <Megaphone className="h-4 w-4" />, description: "utm_campaign" },
    { key: "adset", label: "Conjuntos", icon: <Layers className="h-4 w-4" />, description: "utm_medium" },
    { key: "ad", label: "Anúncios", icon: <LayoutGrid className="h-4 w-4" />, description: "utm_content" },
    { key: "placement", label: "Placements", icon: <Target className="h-4 w-4" />, description: "utm_source" },
  ];

  const dateRanges: { key: DateRange; label: string }[] = [
    { key: "today", label: "Hoje" },
    { key: "7d", label: "7 dias" },
    { key: "30d", label: "30 dias" },
    { key: "all", label: "Tudo" },
  ];

  // Template completo para copiar
  const fullUTMTemplate = `utm_source={{placement}}&utm_medium={{adset.name}}&utm_campaign={{campaign.name}}&utm_content={{ad.name}}&site_source_name={{site_source_name}}&campaign_id={{campaign.id}}&adset_id={{adset.id}}&ad_id={{ad.id}}`;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader 
        title="Analytics de Campanhas" 
        description="Análise completa de performance por UTMs, campanhas, conjuntos e anúncios" 
      />

      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-violet-500/10 to-violet-600/5 border border-violet-500/20 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-violet-500/20 rounded-lg">
              <Eye className="h-5 w-5 text-violet-400" />
            </div>
            <span className="text-gray-400 text-sm font-medium">Pageviews</span>
          </div>
          <p className="text-3xl font-bold text-white">{totals.pageviews.toLocaleString()}</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <MousePointerClick className="h-5 w-5 text-blue-400" />
            </div>
            <span className="text-gray-400 text-sm font-medium">Cliques</span>
          </div>
          <p className="text-3xl font-bold text-white">{totals.clicks.toLocaleString()}</p>
          <p className="text-xs text-blue-400 mt-1">CTR: {overallCTR}%</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <Users className="h-5 w-5 text-emerald-400" />
            </div>
            <span className="text-gray-400 text-sm font-medium">Leads</span>
          </div>
          <p className="text-3xl font-bold text-white">{totals.leads.toLocaleString()}</p>
          <p className="text-xs text-emerald-400 mt-1">Conv: {overallConvRate}%</p>
        </div>

        <div className="bg-gradient-to-br from-rose-500/10 to-rose-600/5 border border-rose-500/20 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-rose-500/20 rounded-lg">
              <TrendingDown className="h-5 w-5 text-rose-400" />
            </div>
            <span className="text-gray-400 text-sm font-medium">Saídas</span>
          </div>
          <p className="text-3xl font-bold text-white">{totals.leaves.toLocaleString()}</p>
          <p className="text-xs text-rose-400 mt-1">
            Retenção: {totals.leads > 0 ? (((totals.leads - totals.leaves) / totals.leads) * 100).toFixed(0) : 0}%
          </p>
        </div>
      </div>

      {/* Como Utilizar - Help Section */}
      <div className="bg-[#0a0a0a]/60 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden">
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="w-full p-5 flex items-center justify-between hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-500/10 rounded-lg text-violet-400">
              <HelpCircle className="h-5 w-5" />
            </div>
            <div className="text-left">
              <h3 className="text-white font-semibold">Como configurar os parâmetros UTM?</h3>
              <p className="text-gray-500 text-sm">Template completo para suas campanhas no Facebook Ads</p>
            </div>
          </div>
          {showHelp ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </button>

        {showHelp && (
          <div className="px-5 pb-5 border-t border-white/5 animate-in slide-in-from-top-2 duration-200">
            <div className="mt-5 space-y-6">
              
              {/* Template Completo */}
              <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 rounded-xl p-5">
                <h4 className="text-emerald-400 font-semibold mb-3 flex items-center gap-2">
                  <Copy className="h-4 w-4" />
                  Template Completo (Copie e Cole)
                </h4>
                <div className="relative">
                  <div className="bg-black/60 rounded-lg p-4 border border-white/10 overflow-x-auto">
                    <code className="text-sm font-mono text-emerald-400 break-all whitespace-pre-wrap">
                      {fullUTMTemplate}
                    </code>
                  </div>
                  <button
                    onClick={() => copyToClipboard(fullUTMTemplate)}
                    className="absolute top-2 right-2 p-2 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-lg transition-colors"
                  >
                    {copiedText === fullUTMTemplate ? (
                      <Check className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <Copy className="h-4 w-4 text-emerald-400" />
                    )}
                  </button>
                </div>
                <p className="text-gray-400 text-xs mt-3">
                  Vá em <span className="text-white">Anúncio → Rastreamento → Parâmetros de URL</span> e cole este código
                </p>
              </div>

              {/* Parâmetros Explicados */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-black/40 rounded-xl p-4 border border-white/5">
                  <h5 className="text-white font-medium mb-3">📊 Parâmetros de Identificação</h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <code className="text-violet-400">utm_source</code>
                      <span className="text-gray-500">{"{{placement}}"}</span>
                    </div>
                    <div className="flex justify-between">
                      <code className="text-violet-400">utm_medium</code>
                      <span className="text-gray-500">{"{{adset.name}}"}</span>
                    </div>
                    <div className="flex justify-between">
                      <code className="text-violet-400">utm_campaign</code>
                      <span className="text-gray-500">{"{{campaign.name}}"}</span>
                    </div>
                    <div className="flex justify-between">
                      <code className="text-violet-400">utm_content</code>
                      <span className="text-gray-500">{"{{ad.name}}"}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-black/40 rounded-xl p-4 border border-white/5">
                  <h5 className="text-white font-medium mb-3">🆔 IDs para Rastreamento Avançado</h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <code className="text-blue-400">campaign_id</code>
                      <span className="text-gray-500">{"{{campaign.id}}"}</span>
                    </div>
                    <div className="flex justify-between">
                      <code className="text-blue-400">adset_id</code>
                      <span className="text-gray-500">{"{{adset.id}}"}</span>
                    </div>
                    <div className="flex justify-between">
                      <code className="text-blue-400">ad_id</code>
                      <span className="text-gray-500">{"{{ad.id}}"}</span>
                    </div>
                    <div className="flex justify-between">
                      <code className="text-blue-400">site_source_name</code>
                      <span className="text-gray-500">{"{{site_source_name}}"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dica */}
              <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                <p className="text-amber-400 text-sm flex items-start gap-2">
                  <span className="text-lg">💡</span>
                  <span>
                    <strong>Dica:</strong> O <code className="bg-black/40 px-1 rounded">{"{{placement}}"}</code> mostra onde seu anúncio foi exibido 
                    (Instagram_Feed, Facebook_Reels, etc), permitindo identificar os melhores posicionamentos.
                  </span>
                </p>
              </div>

            </div>
          </div>
        )}
      </div>

      {/* Controles: Tabs e Filtros */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 p-1 bg-black/40 rounded-xl border border-white/5">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setSelectedCampaign(null);
                setSelectedAdset(null);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-violet-500/20 text-violet-400 border border-violet-500/30"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              <span className="text-xs text-gray-500 hidden md:inline">({tab.description})</span>
            </button>
          ))}
        </div>

        {/* Date Range + Refresh */}
        <div className="flex items-center gap-3">
          <div className="flex gap-1 p-1 bg-black/40 rounded-lg border border-white/5">
            {dateRanges.map((range) => (
              <button
                key={range.key}
                onClick={() => setDateRange(range.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  dateRange === range.key
                    ? "bg-white/10 text-white"
                    : "text-gray-500 hover:text-white"
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
          <button
            onClick={fetchEvents}
            disabled={loading}
            className="p-2 bg-black/40 border border-white/5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Breadcrumb de Filtros Ativos */}
      {(selectedCampaign || selectedAdset) && (
        <div className="flex items-center gap-2 text-sm">
          <Filter className="h-4 w-4 text-gray-500" />
          {selectedCampaign && (
            <button
              onClick={() => setSelectedCampaign(null)}
              className="flex items-center gap-1 px-3 py-1 bg-violet-500/20 text-violet-400 rounded-full hover:bg-violet-500/30 transition-colors"
            >
              Campanha: {selectedCampaign.substring(0, 30)}...
              <span className="ml-1">×</span>
            </button>
          )}
          {selectedAdset && (
            <button
              onClick={() => setSelectedAdset(null)}
              className="flex items-center gap-1 px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full hover:bg-blue-500/30 transition-colors"
            >
              Conjunto: {selectedAdset.substring(0, 30)}...
              <span className="ml-1">×</span>
            </button>
          )}
        </div>
      )}

      {/* Tabela Principal */}
      <div className="bg-[#0a0a0a]/60 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-pink-500/10 rounded-lg text-pink-400">
              <Tags className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {tabs.find(t => t.key === activeTab)?.label}
              </h2>
              <p className="text-sm text-gray-500">
                {data.length} registro{data.length !== 1 ? "s" : ""} encontrado{data.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-white/5 border-b border-white/5">
              <tr>
                <th className="px-6 py-4 font-medium">Nome</th>
                <th className="px-6 py-4 font-medium text-right">Pageviews</th>
                <th className="px-6 py-4 font-medium text-right">Cliques</th>
                <th className="px-6 py-4 font-medium text-right">CTR</th>
                <th className="px-6 py-4 font-medium text-right">Leads</th>
                <th className="px-6 py-4 font-medium text-right">Conv. Rate</th>
                <th className="px-6 py-4 font-medium text-right">Saídas</th>
                <th className="px-6 py-4 font-medium text-right">Retenção</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-violet-500" />
                    <p className="text-gray-500 mt-2">Carregando dados...</p>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center text-gray-500">
                    <Tags className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>Nenhum dado encontrado para o período selecionado.</p>
                    <p className="text-sm mt-1">Configure os parâmetros UTM nos seus anúncios.</p>
                  </td>
                </tr>
              ) : (
                data.map((row, i) => {
                  const ctr = row.pageviews > 0 ? (row.clicks / row.pageviews) * 100 : 0;
                  const convRate = row.clicks > 0 ? (row.leads / row.clicks) * 100 : 0;
                  const retention = row.leads > 0 ? ((row.leads - row.leaves) / row.leads) * 100 : 100;

                  const isNoData = row.name.startsWith("(");

                  return (
                    <tr 
                      key={i} 
                      className="hover:bg-white/5 transition-colors group cursor-pointer"
                      onClick={() => {
                        if (activeTab === "campaign" && !isNoData) {
                          setSelectedCampaign(row.name);
                          setActiveTab("adset");
                        } else if (activeTab === "adset" && !isNoData) {
                          setSelectedAdset(row.name);
                          setActiveTab("ad");
                        }
                      }}
                    >
                      <td className="px-6 py-4">
                        {isNoData ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-white/5 text-gray-500 border border-white/5">
                            Sem identificação
                          </span>
                        ) : (
                          <div className="flex items-center gap-3">
                            <BarChart2 className="h-4 w-4 text-violet-500 flex-shrink-0" />
                            <div>
                              <span className="text-white font-medium group-hover:text-violet-400 transition-colors">
                                {row.name.length > 50 ? row.name.substring(0, 50) + "..." : row.name}
                              </span>
                              {(activeTab === "campaign" || activeTab === "adset") && !isNoData && (
                                <p className="text-xs text-gray-500 group-hover:text-gray-400">
                                  Clique para ver detalhes →
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-gray-400">
                        {row.pageviews.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-gray-400">
                        {row.clicks.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-gray-500 text-xs">
                          {ctr.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-bold text-emerald-400">
                          {row.leads.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold border ${getConversionRateColor(convRate)}`}>
                          {getTrendIcon(convRate)}
                          {convRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-rose-400">
                        {row.leaves}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`text-xs font-medium ${
                          retention >= 80 ? "text-emerald-400" : 
                          retention >= 50 ? "text-amber-400" : "text-rose-400"
                        }`}>
                          {retention.toFixed(0)}%
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Footer com Totais */}
            {!loading && data.length > 0 && (
              <tfoot className="bg-white/5 border-t border-white/10">
                <tr className="font-semibold text-white">
                  <td className="px-6 py-4">
                    <span className="text-gray-400">TOTAL</span>
                  </td>
                  <td className="px-6 py-4 text-right font-mono">
                    {totals.pageviews.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right font-mono">
                    {totals.clicks.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right text-blue-400">
                    {overallCTR}%
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-emerald-400">
                    {totals.leads.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right text-emerald-400">
                    {overallConvRate}%
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-rose-400">
                    {totals.leaves}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-emerald-400">
                      {totals.leads > 0 ? (((totals.leads - totals.leaves) / totals.leads) * 100).toFixed(0) : 100}%
                    </span>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

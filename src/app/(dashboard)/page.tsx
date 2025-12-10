"use client";

import { Eye, Zap, Users, UserMinus, CalendarIcon } from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { OverviewChart } from "@/components/dashboard/overview-chart";
import { RetentionTable } from "@/components/dashboard/retention-table";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useEffect, useState } from "react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

interface Metrics {
  pageviews: number;
  clicks: number;
  joins: number;
  leaves: number;
}

export default function Dashboard() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<Metrics>({ pageviews: 0, clicks: 0, joins: 0, leaves: 0 });
  const [chartData, setChartData] = useState<any[]>([]);

  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, [date]);

  async function fetchData() {
    setLoading(true);
    // Simple filter: data >= selected date 00:00 or all time if undefined? 
    // Let's assume filter is "Last 7 days" by default or specific day.
    // For MVP, let's fetch ALL data for sums, and graph data for last 7 days.

    // 1. Fetch Aggregates
    const { data: events, error } = await supabase
      .from("events")
      .select("event_type, created_at");

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    const counts = {
      pageviews: 0,
      clicks: 0,
      joins: 0,
      leaves: 0
    };

    // Usar ISO date como key para ordenação correta
    const dailyStats: Record<string, typeof counts> = {};

    events?.forEach((event: any) => {
      // Increment Total
      if (event.event_type === "pageview") counts.pageviews++;
      if (event.event_type === "click") counts.clicks++;
      if (event.event_type === "join") counts.joins++;
      if (event.event_type === "leave") counts.leaves++;

      // Process Daily Stats for Chart - usar ISO date como key
      const eventDate = new Date(event.created_at);
      const isoDate = format(eventDate, "yyyy-MM-dd"); // Key para ordenação
      if (!dailyStats[isoDate]) dailyStats[isoDate] = { pageviews: 0, clicks: 0, joins: 0, leaves: 0 };

      if (event.event_type === "pageview") dailyStats[isoDate].pageviews++;
      if (event.event_type === "click") dailyStats[isoDate].clicks++;
      if (event.event_type === "join") dailyStats[isoDate].joins++;
      if (event.event_type === "leave") dailyStats[isoDate].leaves++;
    });

    setMetrics(counts);

    // Converter para array, ordenar por data ISO e formatar para exibição
    const chart = Object.keys(dailyStats)
      .sort() // Ordena ISO dates corretamente
      .map(isoDate => ({
        date: format(new Date(isoDate), "dd/MM"), // Formato de exibição
        ...dailyStats[isoDate]
      }));

    setChartData(chart);
    setLoading(false);
  }

  const conversionRate = metrics.pageviews > 0 ? ((metrics.joins / metrics.pageviews) * 100).toFixed(1) + "%" : "0%";
  const clickRate = metrics.pageviews > 0 ? ((metrics.clicks / metrics.pageviews) * 100).toFixed(1) + "%" : "0%";
  const joinRate = metrics.clicks > 0 ? ((metrics.joins / metrics.clicks) * 100).toFixed(1) + "%" : "0%";
  const retentionRate = metrics.joins > 0 ? (((metrics.joins - metrics.leaves) / metrics.joins) * 100).toFixed(1) + "%" : "100%";

  // Labels conforme a imagem
  const metricLabels = {
    pageviews: { footerLabel: "Conversão geral para Entradas", footerValue: conversionRate },
    clicks: { footerLabel: "Taxa de Cliques por Pageviews", footerValue: clickRate },
    joins: { footerLabel: "Taxa de Entradas por Cliques", footerValue: joinRate },
    leaves: { footerLabel: "Taxa de Retenção", footerValue: retentionRate }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>

        <div className="flex items-center gap-2">
          <Button onClick={fetchData} variant="outline" size="icon">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={`w-[200px] justify-start text-left font-normal bg-card/50 hover:bg-card/80 ${!date && "text-muted-foreground"}`}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Button className="bg-primary hover:bg-primary/90 text-white" onClick={fetchData}>
            Atualizar
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Pageviews"
          value={metrics.pageviews}
          icon={Eye}
          trend="Sem alteração"
          footerLabel={metricLabels.pageviews.footerLabel}
          footerValue={metricLabels.pageviews.footerValue}
        />
        <MetricCard
          title="Clicks na página"
          value={metrics.clicks}
          icon={Zap}
          trend="Sem alteração"
          footerLabel={metricLabels.clicks.footerLabel}
          footerValue={metricLabels.clicks.footerValue}
        />
        <MetricCard
          title="Entradas"
          value={metrics.joins}
          icon={Users}
          trend="Sem alteração"
          footerLabel={metricLabels.joins.footerLabel}
          footerValue={metricLabels.joins.footerValue}
        />
        <MetricCard
          title="Saídas"
          value={metrics.leaves}
          icon={UserMinus}
          trend="Sem alteração"
          footerLabel={metricLabels.leaves.footerLabel}
          footerValue={metricLabels.leaves.footerValue}
        />
      </div>

      {/* Charts & Tables */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
        <OverviewChart data={chartData} />
        <RetentionTable data={chartData} />
      </div>
    </div>
  );
}

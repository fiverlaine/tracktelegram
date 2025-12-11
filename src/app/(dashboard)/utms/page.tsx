"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Tags } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface UTMData {
  campaign: string;
  source: string;
  medium: string;
  pageviews: number;
  clicks: number;
  leads: number; // Joins
}

export default function UTMsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<UTMData[]>([]);
  const supabase = createClient();

  useEffect(() => {
    fetchUTMData();
  }, []);

  async function fetchUTMData() {
    setLoading(true);
    
    // Fetch all events for now (optimize with aggregation view later if scaling needed)
    // We want events that have metadata->utm_campaign
    const { data: events, error } = await supabase
      .from("events")
      .select("event_type, metadata");

    if (error) {
      console.error("Error fetching UTM data:", error);
      setLoading(false);
      return;
    }

    const aggregated: Record<string, UTMData> = {};

    events?.forEach((event: any) => {
      const campaign = event.metadata?.utm_campaign || "(direct / none)";
      const source = event.metadata?.utm_source || "-";
      const medium = event.metadata?.utm_medium || "-";
      
      // Chave única para agrupar (pode ser só campanha, ou campanha+source)
      // O usuário pediu "Relatório por UTM Campaign" especificamente, mas Source é útil.
      // Vamos agrupar por Campanha pra simplificar a visão macro.
      const key = campaign;

      if (!aggregated[key]) {
        aggregated[key] = {
          campaign: key,
          source: source, // Pega o primeiro encontrado
          medium: medium,
          pageviews: 0,
          clicks: 0,
          leads: 0
        };
      }

      const entry = aggregated[key];

      if (event.event_type === "pageview") entry.pageviews++;
      if (event.event_type === "click") entry.clicks++;
      if (event.event_type === "join") entry.leads++;
    });

    // Converter para array e calcular taxas
    const result = Object.values(aggregated).sort((a, b) => b.leads - a.leads); // Ordenar por leads

    setData(result);
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Performance por UTM</h1>
          <p className="text-muted-foreground mt-2">
            Analise quais campanhas estão trazendo mais retorno para seus funis.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tags className="h-5 w-5 text-primary" />
            Relatório de Campanhas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campanha (UTM Campaign)</TableHead>
                    <TableHead>Fonte (Source)</TableHead>
                    <TableHead className="text-right">Pageviews</TableHead>
                    <TableHead className="text-right">Cliques</TableHead>
                    <TableHead className="text-right">Leads (Entradas)</TableHead>
                    <TableHead className="text-right">Conv. (PV → Lead)</TableHead>
                    <TableHead className="text-right">Conv. (Click → Lead)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhum dado de UTM encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.map((row, i) => {
                      const pvToLeadRate = row.pageviews > 0 
                        ? ((row.leads / row.pageviews) * 100).toFixed(1) + "%" 
                        : "0.0%";
                      
                      const clickToLeadRate = row.clicks > 0 
                        ? ((row.leads / row.clicks) * 100).toFixed(1) + "%" 
                        : "0.0%";

                      return (
                        <TableRow key={i}>
                          <TableCell className="font-medium">
                            {row.campaign === "(direct / none)" ? (
                                <Badge variant="secondary" className="font-normal opacity-70">Desconhecido / Direto</Badge>
                            ) : (
                                <span className="font-semibold text-primary">{row.campaign}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">{row.source} / {row.medium}</TableCell>
                          <TableCell className="text-right">{row.pageviews}</TableCell>
                          <TableCell className="text-right">{row.clicks}</TableCell>
                          <TableCell className="text-right font-bold text-green-600">{row.leads}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={parseFloat(pvToLeadRate) > 10 ? "default" : "outline"}>
                                {pvToLeadRate}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">{clickToLeadRate}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

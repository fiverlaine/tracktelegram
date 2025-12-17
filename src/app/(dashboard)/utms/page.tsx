"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Tags, BarChart2, HelpCircle, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";

interface UTMData {
  content: string;  // utm_content
  pageviews: number;
  clicks: number;
  leads: number; // Joins
}

export default function UTMsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<UTMData[]>([]);
  const [showHelp, setShowHelp] = useState(false);
  const [copiedParam, setCopiedParam] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchUTMData();
  }, []);

  async function fetchUTMData() {
    setLoading(true);

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
      const content = event.metadata?.utm_content || "(sem utm_content)";

      const key = content;

      if (!aggregated[key]) {
        aggregated[key] = {
          content: key,
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

    const result = Object.values(aggregated).sort((a, b) => b.leads - a.leads);

    setData(result);
    setLoading(false);
  }

  function getConversionRateColor(rate: number) {
    if (rate >= 20) return "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    if (rate >= 10) return "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20";
    return "text-neutral-400 dark:text-gray-400 bg-neutral-100 dark:bg-white/5 border-neutral-200 dark:border-white/10";
  }

  const copyToClipboard = (text: string, param: string) => {
    navigator.clipboard.writeText(text);
    setCopiedParam(param);
    setTimeout(() => setCopiedParam(null), 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader title="Performance por UTM" description="Analise quais campanhas estão trazendo mais retorno para seus funis." />

      {/* Como Utilizar - Help Section */}
      <div className="bg-white/60 dark:bg-[#0a0a0a]/60 backdrop-blur-xl border border-neutral-200 dark:border-white/5 rounded-2xl overflow-hidden">
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="w-full p-5 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-500/10 rounded-lg text-violet-600 dark:text-violet-400">
              <HelpCircle className="h-5 w-5" />
            </div>
            <div className="text-left">
              <h3 className="text-neutral-900 dark:text-white font-semibold">Como utilizar?</h3>
              <p className="text-neutral-500 dark:text-gray-500 text-sm">Aprenda a configurar os parâmetros UTM nos seus anúncios</p>
            </div>
          </div>
          {showHelp ? (
            <ChevronUp className="h-5 w-5 text-neutral-400 dark:text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-neutral-400 dark:text-gray-400" />
          )}
        </button>

        {showHelp && (
          <div className="px-5 pb-5 border-t border-neutral-200 dark:border-white/5 animate-in slide-in-from-top-2 duration-200">
            <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-8">

              {/* Left side - Steps */}
              <div className="space-y-6">

                {/* Passo 1 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-violet-500/20 rounded-full flex items-center justify-center text-violet-600 dark:text-violet-400 font-bold text-sm">
                    1
                  </div>
                  <div className="flex-1">
                    <h4 className="text-neutral-900 dark:text-white font-semibold mb-2">Acesse seu anúncio no Facebook Ads</h4>
                    <p className="text-neutral-500 dark:text-gray-400 text-sm">
                      Vá até o Gerenciador de Anúncios e selecione o anúncio que deseja rastrear.
                    </p>
                  </div>
                </div>

                {/* Passo 2 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-violet-500/20 rounded-full flex items-center justify-center text-violet-600 dark:text-violet-400 font-bold text-sm">
                    2
                  </div>
                  <div className="flex-1">
                    <h4 className="text-neutral-900 dark:text-white font-semibold mb-2">Encontre "Parâmetros de URL"</h4>
                    <p className="text-neutral-500 dark:text-gray-400 text-sm mb-3">
                      Role até a seção <span className="text-neutral-900 dark:text-white font-medium">"Rastreamento"</span> e encontre o campo <span className="text-neutral-900 dark:text-white font-medium">"Parâmetros de URL"</span>.
                    </p>
                  </div>
                </div>

                {/* Passo 3 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-violet-500/20 rounded-full flex items-center justify-center text-violet-600 dark:text-violet-400 font-bold text-sm">
                    3
                  </div>
                  <div className="flex-1">
                    <h4 className="text-neutral-900 dark:text-white font-semibold mb-2">Adicione o parâmetro utm_content</h4>
                    <p className="text-neutral-500 dark:text-gray-400 text-sm mb-3">
                      Cole o código abaixo no campo e substitua <span className="text-emerald-600 dark:text-emerald-400 font-mono">nome_do_anuncio</span> pelo nome que você quer identificar:
                    </p>

                    {/* Parâmetro pronto para copiar */}
                    <div className="flex items-center gap-2 p-3 bg-neutral-100 dark:bg-black/60 rounded-lg border border-neutral-200 dark:border-white/10 group">
                      <code className="flex-1 text-sm font-mono text-emerald-600 dark:text-emerald-400 break-all">
                        utm_content=nome_do_anuncio
                      </code>
                      <button
                        onClick={() => copyToClipboard('utm_content=nome_do_anuncio', 'full')}
                        className="p-2 hover:bg-neutral-200 dark:hover:bg-white/10 rounded-lg transition-colors"
                      >
                        {copiedParam === 'full' ? (
                          <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Copy className="h-4 w-4 text-neutral-400 dark:text-gray-400 group-hover:text-neutral-900 dark:group-hover:text-white" />
                        )}
                      </button>
                    </div>

                    <div className="mt-4 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                      <p className="text-amber-600 dark:text-amber-400 text-xs font-medium flex items-start gap-2">
                        <span className="text-lg leading-none">💡</span>
                        <span>
                          <strong>Exemplos:</strong> <code className="bg-neutral-100 dark:bg-black/40 px-1 rounded">utm_content=video_vendas_01</code> ou <code className="bg-neutral-100 dark:bg-black/40 px-1 rounded">utm_content=carrossel_depoimentos</code>
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Passo 4 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                    ✓
                  </div>
                  <div className="flex-1">
                    <h4 className="text-neutral-900 dark:text-white font-semibold mb-2">Pronto! Agora é só acompanhar</h4>
                    <p className="text-neutral-500 dark:text-gray-400 text-sm">
                      Os dados aparecerão na tabela abaixo conforme os usuários clicarem nos seus anúncios.
                    </p>
                  </div>
                </div>

              </div>

              {/* Right side - Image */}
              <div className="flex flex-col">
                <p className="text-xs text-neutral-500 dark:text-gray-500 uppercase font-bold tracking-wider mb-3">Veja onde fica no Facebook Ads:</p>
                <div className="relative rounded-xl overflow-hidden border border-neutral-200 dark:border-white/10 bg-neutral-100 dark:bg-black/40">
                  <img
                    src="/tutorial-utm.png"
                    alt="Tutorial de como adicionar parâmetros UTM no Facebook Ads"
                    className="w-full h-auto"
                  />
                  {/* Overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                </div>
                <p className="text-xs text-neutral-500 dark:text-gray-500 mt-2 text-center">
                  O campo "Parâmetros de URL" fica na seção de Rastreamento do anúncio
                </p>
              </div>

            </div>
          </div>
        )}
      </div>

      <div className="bg-white/60 dark:bg-[#0a0a0a]/60 backdrop-blur-xl border border-neutral-200 dark:border-white/5 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-neutral-200 dark:border-white/5 flex items-center gap-3">
          <div className="p-2 bg-pink-500/10 rounded-lg text-pink-600 dark:text-pink-400">
            <Tags className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Relatório de Campanhas</h2>
            <p className="text-sm text-neutral-500 dark:text-gray-500">Métricas consolidadas por origem de tráfego</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-neutral-500 dark:text-gray-500 uppercase bg-neutral-50 dark:bg-white/5 border-b border-neutral-200 dark:border-white/5">
              <tr>
                <th className="px-6 py-4 font-medium">utm_content</th>
                <th className="px-6 py-4 font-medium text-right">Pageviews</th>
                <th className="px-6 py-4 font-medium text-right">Cliques</th>
                <th className="px-6 py-4 font-medium text-right">Leads</th>
                <th className="px-6 py-4 font-medium text-right">Conv. (PV → Lead)</th>
                <th className="px-6 py-4 font-medium text-right">Conv. (Click → Lead)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-violet-500">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-neutral-500 dark:text-gray-500">
                    Nenhum dado de UTM encontrado.
                  </td>
                </tr>
              ) : (
                data.map((row, i) => {
                  const pvToLeadNum = row.pageviews > 0 ? (row.leads / row.pageviews) * 100 : 0;
                  const clickToLeadNum = row.clicks > 0 ? (row.leads / row.clicks) * 100 : 0;

                  const pvToLeadRate = pvToLeadNum.toFixed(1) + "%";
                  const clickToLeadRate = clickToLeadNum.toFixed(1) + "%";

                  return (
                    <tr key={i} className="hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors group text-neutral-600 dark:text-gray-300">
                      <td className="px-6 py-4 font-medium">
                        {row.content === "(sem utm_content)" ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 dark:bg-white/5 text-neutral-500 dark:text-gray-500 border border-neutral-200 dark:border-white/5">
                            Sem identificação
                          </span>
                        ) : (
                          <span className="flex items-center gap-2 text-neutral-900 dark:text-white font-semibold">
                            <BarChart2 className="h-4 w-4 text-violet-600 dark:text-violet-500" />
                            {row.content}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-neutral-500 dark:text-gray-400">{row.pageviews}</td>
                      <td className="px-6 py-4 text-right font-mono text-neutral-500 dark:text-gray-400">{row.clicks}</td>
                      <td className="px-6 py-4 text-right font-bold text-emerald-600 dark:text-emerald-400">{row.leads}</td>
                      <td className="px-6 py-4 text-right">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold border ${getConversionRateColor(pvToLeadNum)}`}>
                          {pvToLeadRate}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-neutral-500 dark:text-gray-500 text-xs">
                        {clickToLeadRate}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

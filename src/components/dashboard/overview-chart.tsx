"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";

interface OverviewChartProps {
    data: any[];
}

type MetricType = "pageviews" | "clicks" | "joins" | "leaves";

interface MetricConfig {
    key: MetricType;
    label: string;
    color: string;
    dataKey: string;
}

const metrics: MetricConfig[] = [
    {
        key: "pageviews",
        label: "Pageviews",
        color: "#8b5cf6", // Purple
        dataKey: "pageviews"
    },
    {
        key: "clicks",
        label: "Clicks",
        color: "#3b82f6", // Blue
        dataKey: "clicks"
    },
    {
        key: "joins",
        label: "Entradas",
        color: "#8b5cf6", // Purple
        dataKey: "joins"
    },
    {
        key: "leaves",
        label: "Saídas",
        color: "#ef4444", // Red
        dataKey: "leaves"
    }
];

export function OverviewChart({ data }: OverviewChartProps) {
    const [selectedMetric, setSelectedMetric] = useState<MetricType>("pageviews");

    const selectedConfig = metrics.find(m => m.key === selectedMetric) || metrics[0];

    return (
        <Card className="col-span-4 bg-card/50 backdrop-blur-sm border-border">
            <CardHeader>
                <CardTitle className="text-foreground">Overview de Métricas</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
                {/* Botões de seleção de métrica */}
                <div className="flex gap-6 mb-6 border-b border-border/50">
                    {metrics.map((metric) => {
                        const isSelected = selectedMetric === metric.key;
                        return (
                            <button
                                key={metric.key}
                                onClick={() => setSelectedMetric(metric.key)}
                                className={`pb-3 px-1 relative transition-colors ${
                                    isSelected
                                        ? "text-primary font-medium"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                {metric.label}
                                {isSelected && (
                                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Gráfico */}
                <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                        {data.length > 0 ? (
                            <LineChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fill: "#888888" }}
                                />
                                <YAxis
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fill: "#888888" }}
                                    tickFormatter={(value) => `${value}`}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "#1e1e2d",
                                        borderColor: "#2d2d3b",
                                        color: "#f1f1f1",
                                        borderRadius: "8px"
                                    }}
                                    itemStyle={{ color: "#f1f1f1" }}
                                    labelStyle={{ color: "#f1f1f1" }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey={selectedConfig.dataKey}
                                    name={selectedConfig.label}
                                    stroke={selectedConfig.color}
                                    strokeWidth={2}
                                    dot={false}
                                    activeDot={{ r: 4, strokeWidth: 0, fill: selectedConfig.color }}
                                />
                            </LineChart>
                        ) : (
                            <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                                Sem dados para exibir ainda.
                            </div>
                        )}
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}

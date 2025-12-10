import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    trend?: string;
    footerLabel?: string;
    footerValue?: string;
}

export function MetricCard({
    title,
    value,
    icon: Icon,
    trend = "Sem alteração",
    footerLabel,
    footerValue
}: MetricCardProps) {
    return (
        <Card className="bg-card/50 backdrop-blur-sm border-border hover:border-primary/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {title}
                </CardTitle>
                <Icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-foreground">{value}</div>
                <p className="text-xs text-yellow-500 mt-1">{trend}</p>

                {(footerLabel || footerValue) && (
                    <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{footerLabel}</span>
                        <span className="font-bold text-foreground">{footerValue}</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

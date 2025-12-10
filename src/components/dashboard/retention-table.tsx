import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RetentionTableProps {
    data: any[];
}

export function RetentionTable({ data }: RetentionTableProps) {
    // Reverse data to show newest first
    const displayData = [...data].reverse().slice(0, 5); // Limit to top 5

    return (
        <Card className="col-span-3 bg-card/50 backdrop-blur-sm">
            <CardHeader>
                <CardTitle>Taxa de Retenção Diária</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="text-muted-foreground">Dia</TableHead>
                            <TableHead className="text-right text-muted-foreground">Entradas</TableHead>
                            <TableHead className="text-right text-muted-foreground">Saídas</TableHead>
                            <TableHead className="text-right text-muted-foreground">Retenção</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {displayData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                    Sem dados para exibir ainda.
                                </TableCell>
                            </TableRow>
                        ) : (
                            displayData.map((row, index) => {
                                const retencao = row.joins > 0 ? ((row.joins - row.leaves) / row.joins) * 100 : 100;
                                const label = retencao.toFixed(1) + "%";
                                const isToday = index === 0; // Primeira linha é o dia mais recente

                                return (
                                    <TableRow 
                                        key={row.date} 
                                        className={`hover:bg-muted/50 border-0 ${isToday ? "bg-primary/10" : ""}`}
                                    >
                                        <TableCell className="font-medium text-foreground">{row.date}</TableCell>
                                        <TableCell className="text-right text-foreground">{row.joins}</TableCell>
                                        <TableCell className="text-right text-foreground">{row.leaves}</TableCell>
                                        <TableCell className="text-right font-bold">
                                            <span className={retencao >= 90 ? "text-green-500" : "text-red-500"}>
                                                {label}
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

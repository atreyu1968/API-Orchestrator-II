import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  DollarSign, 
  BookOpen,
  Info
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useProject } from "@/lib/project-context";
import type { AiUsageEvent } from "@shared/schema";

function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(4)}`;
}

const PRICING_INFO = `Tarifas por millón de tokens:

DeepSeek R1 (reasoner): $0.55 input / $2.19 output
DeepSeek V3 (chat): $0.28 input / $0.42 output

Gemini 3 Pro Preview: $1.25 input / $10.00 output
Gemini 2.5 Flash: $0.30 input / $2.50 output`;

interface ModelStats {
  model: string;
  inputTokens: number;
  outputTokens: number;
  thinkingTokens: number;
  cost: number;
  firstDate: Date | null;
  lastDate: Date | null;
}

interface ProjectDates {
  start: Date | null;
  end: Date | null;
}

function getProjectDates(events: AiUsageEvent[]): ProjectDates {
  if (events.length === 0) return { start: null, end: null };
  
  const dates = events
    .map(e => new Date(e.createdAt))
    .filter(d => !isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());
  
  return {
    start: dates[0] || null,
    end: dates[dates.length - 1] || null,
  };
}

function formatDate(date: Date | null): string {
  if (!date) return "-";
  return date.toLocaleDateString("es-ES", { 
    day: "2-digit", 
    month: "short", 
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function groupByModel(events: AiUsageEvent[]): ModelStats[] {
  const grouped = new Map<string, ModelStats>();
  
  for (const event of events) {
    const model = event.model || "unknown";
    const eventDate = new Date(event.createdAt);
    const existing = grouped.get(model);
    
    if (existing) {
      existing.inputTokens += event.inputTokens || 0;
      existing.outputTokens += event.outputTokens || 0;
      existing.thinkingTokens += event.thinkingTokens || 0;
      existing.cost += parseFloat(event.totalCostUsd || "0");
      if (!existing.firstDate || eventDate < existing.firstDate) existing.firstDate = eventDate;
      if (!existing.lastDate || eventDate > existing.lastDate) existing.lastDate = eventDate;
    } else {
      grouped.set(model, {
        model,
        inputTokens: event.inputTokens || 0,
        outputTokens: event.outputTokens || 0,
        thinkingTokens: event.thinkingTokens || 0,
        cost: parseFloat(event.totalCostUsd || "0"),
        firstDate: eventDate,
        lastDate: eventDate,
      });
    }
  }
  
  return Array.from(grouped.values()).sort((a, b) => b.cost - a.cost);
}

function getProviderName(model: string): string {
  if (model.startsWith("gemini")) return "Gemini";
  if (model.startsWith("deepseek")) return "DeepSeek";
  return "Otro";
}

interface ProviderStats {
  provider: string;
  inputTokens: number;
  outputTokens: number;
  thinkingTokens: number;
  cost: number;
}

function groupByProvider(modelStats: ModelStats[]): ProviderStats[] {
  const grouped = new Map<string, ProviderStats>();
  for (const stat of modelStats) {
    const provider = getProviderName(stat.model);
    const existing = grouped.get(provider);
    if (existing) {
      existing.inputTokens += stat.inputTokens;
      existing.outputTokens += stat.outputTokens;
      existing.thinkingTokens += stat.thinkingTokens;
      existing.cost += stat.cost;
    } else {
      grouped.set(provider, {
        provider,
        inputTokens: stat.inputTokens,
        outputTokens: stat.outputTokens,
        thinkingTokens: stat.thinkingTokens,
        cost: stat.cost,
      });
    }
  }
  return Array.from(grouped.values()).sort((a, b) => b.cost - a.cost);
}

export default function CostsHistoryPage() {
  const { currentProject, isLoading: loadingProject } = useProject();

  const { data: aiUsageEvents, isLoading: loadingUsage } = useQuery<AiUsageEvent[]>({
    queryKey: [`/api/projects/${currentProject?.id}/ai-usage`],
    enabled: !!currentProject?.id,
    refetchInterval: 5000,
  });

  const modelStats = groupByModel(aiUsageEvents || []);
  const providerStats = groupByProvider(modelStats);
  const projectDates = getProjectDates(aiUsageEvents || []);
  const totalCost = modelStats.reduce((sum, m) => sum + m.cost, 0);
  const totalInput = modelStats.reduce((sum, m) => sum + m.inputTokens, 0);
  const totalOutput = modelStats.reduce((sum, m) => sum + m.outputTokens, 0);
  const totalThinking = modelStats.reduce((sum, m) => sum + m.thinkingTokens, 0);

  if (!currentProject) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <BookOpen className="h-16 w-16 text-muted-foreground/20 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Sin proyecto seleccionado</h2>
        <p className="text-muted-foreground max-w-md">
          Selecciona un proyecto para ver su historial de costos
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="costs-history-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Costos: {currentProject.title}</h1>
          <p className="text-muted-foreground">
            Tokens y costos por modelo
          </p>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 text-sm text-muted-foreground cursor-help">
              <Info className="h-4 w-4" />
              <span>Info de precios</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-sm whitespace-pre-line">
            {PRICING_INFO}
          </TooltipContent>
        </Tooltip>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <CardTitle className="text-sm font-medium">Resumen del Proyecto</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {loadingProject || loadingUsage ? (
            <Skeleton className="h-8 w-full" />
          ) : (
            <div className="space-y-2">
              <div className="text-3xl font-bold text-primary">{formatCurrency(totalCost)}</div>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span>Inicio: <span className="text-foreground">{formatDate(projectDates.start)}</span></span>
                <span>Fin: <span className="text-foreground">{formatDate(projectDates.end)}</span></span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {providerStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Desglose por Proveedor</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingUsage ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Proveedor</TableHead>
                    <TableHead className="text-right">Input</TableHead>
                    <TableHead className="text-right">Output</TableHead>
                    <TableHead className="text-right">Thinking</TableHead>
                    <TableHead className="text-right">Costo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {providerStats.map((stat) => (
                    <TableRow key={stat.provider}>
                      <TableCell className="font-medium text-sm">
                        {stat.provider}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatNumber(stat.inputTokens)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatNumber(stat.outputTokens)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-muted-foreground">
                        {formatNumber(stat.thinkingTokens)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold">
                        {formatCurrency(stat.cost)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Desglose por Modelo</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingUsage ? (
            <Skeleton className="h-24 w-full" />
          ) : modelStats.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No hay datos de uso registrados
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Modelo</TableHead>
                  <TableHead className="text-right">Input</TableHead>
                  <TableHead className="text-right">Output</TableHead>
                  <TableHead className="text-right">Thinking</TableHead>
                  <TableHead className="text-right">Costo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modelStats.map((stat) => (
                  <TableRow key={stat.model}>
                    <TableCell className="font-medium font-mono text-sm">
                      {stat.model}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatNumber(stat.inputTokens)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatNumber(stat.outputTokens)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-muted-foreground">
                      {formatNumber(stat.thinkingTokens)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold">
                      {formatCurrency(stat.cost)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell>TOTAL</TableCell>
                  <TableCell className="text-right font-mono">{formatNumber(totalInput)}</TableCell>
                  <TableCell className="text-right font-mono">{formatNumber(totalOutput)}</TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">{formatNumber(totalThinking)}</TableCell>
                  <TableCell className="text-right font-mono text-lg">{formatCurrency(totalCost)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

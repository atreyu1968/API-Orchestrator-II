import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  DollarSign, 
  TrendingUp, 
  Cpu, 
  FileText,
  Calendar,
  Bot,
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

interface ProjectSummary {
  id: number;
  title: string;
  status: string;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalThinkingTokens: number;
  estimatedCostUsd: number;
  createdAt: string;
}

interface UsageByDay {
  date: string;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
  eventCount: number;
}

interface UsageByAgent {
  agentName: string;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
  eventCount: number;
}

const PRICING_INFO = `Precios de Gemini 2.5 Pro (por millón de tokens):
• Input: $1.25/M tokens (contexto ≤200K)
• Output: $10.00/M tokens (contexto ≤200K)
• Thinking: se cuenta como output

El costo real puede variar según el modelo específico usado.
Replit puede aplicar un markup sobre estos precios.`;

function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function getStatusBadge(status: string) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    completed: "default",
    generating: "secondary",
    failed: "destructive",
    paused: "outline",
    idle: "outline",
  };
  const labels: Record<string, string> = {
    completed: "Completado",
    generating: "Generando",
    failed: "Fallido",
    paused: "Pausado",
    idle: "Inactivo",
  };
  return (
    <Badge variant={variants[status] || "outline"} className="text-xs">
      {labels[status] || status}
    </Badge>
  );
}

export default function CostsPage() {
  const { data: projectsSummary, isLoading: loadingProjects } = useQuery<ProjectSummary[]>({
    queryKey: ["/api/ai-usage/projects-summary"],
  });

  const { data: usageByDay, isLoading: loadingByDay } = useQuery<UsageByDay[]>({
    queryKey: ["/api/ai-usage/by-day"],
  });

  const { data: usageByAgent, isLoading: loadingByAgent } = useQuery<UsageByAgent[]>({
    queryKey: ["/api/ai-usage/by-agent"],
  });

  const totalEstimatedCost = projectsSummary?.reduce((sum, p) => sum + p.estimatedCostUsd, 0) || 0;
  const totalInputTokens = projectsSummary?.reduce((sum, p) => sum + p.totalInputTokens, 0) || 0;
  const totalOutputTokens = projectsSummary?.reduce((sum, p) => sum + p.totalOutputTokens, 0) || 0;
  const totalThinkingTokens = projectsSummary?.reduce((sum, p) => sum + p.totalThinkingTokens, 0) || 0;
  const projectCount = projectsSummary?.length || 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Control de Costos API</h1>
          <p className="text-muted-foreground">
            Monitoreo del uso de tokens y estimación de costos de Google Gemini
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Costo Total Estimado</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingProjects ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">{formatCurrency(totalEstimatedCost)}</div>
                <p className="text-xs text-muted-foreground">
                  Basado en precios de Gemini 2.5 Pro
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Tokens de Entrada</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingProjects ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">{formatNumber(totalInputTokens)}</div>
                <p className="text-xs text-muted-foreground">
                  ~{formatCurrency((totalInputTokens / 1_000_000) * 1.25)} a $1.25/M
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Tokens de Salida</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingProjects ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">{formatNumber(totalOutputTokens)}</div>
                <p className="text-xs text-muted-foreground">
                  + {formatNumber(totalThinkingTokens)} thinking
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Proyectos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingProjects ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">{projectCount}</div>
                <p className="text-xs text-muted-foreground">
                  Promedio: {formatCurrency(totalEstimatedCost / Math.max(projectCount, 1))}/proyecto
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Costos por Proyecto
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingProjects ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : !projectsSummary?.length ? (
              <p className="text-muted-foreground text-center py-8">
                No hay proyectos con uso registrado
              </p>
            ) : (
              <div className="max-h-96 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Proyecto</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Input</TableHead>
                      <TableHead className="text-right">Output</TableHead>
                      <TableHead className="text-right">Costo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projectsSummary
                      .filter(p => p.totalInputTokens > 0 || p.totalOutputTokens > 0)
                      .sort((a, b) => b.estimatedCostUsd - a.estimatedCostUsd)
                      .map((project) => (
                        <TableRow key={project.id}>
                          <TableCell className="font-medium max-w-48 truncate" title={project.title}>
                            {project.title}
                          </TableCell>
                          <TableCell>{getStatusBadge(project.status)}</TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {formatNumber(project.totalInputTokens)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {formatNumber(project.totalOutputTokens)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm font-semibold">
                            {formatCurrency(project.estimatedCostUsd)}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Uso por Día (últimos 30 días)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingByDay ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : !usageByDay?.length ? (
              <p className="text-muted-foreground text-center py-8">
                No hay datos de uso diario registrados
              </p>
            ) : (
              <div className="max-h-96 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Input</TableHead>
                      <TableHead className="text-right">Output</TableHead>
                      <TableHead className="text-right">Costo</TableHead>
                      <TableHead className="text-right">Eventos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usageByDay.map((day) => (
                      <TableRow key={day.date}>
                        <TableCell className="font-medium">
                          {new Date(day.date).toLocaleDateString("es-ES", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatNumber(day.totalInputTokens)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatNumber(day.totalOutputTokens)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm font-semibold">
                          {formatCurrency(Number(day.totalCostUsd))}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {day.eventCount}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {usageByAgent && usageByAgent.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Uso por Agente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agente</TableHead>
                  <TableHead className="text-right">Input Tokens</TableHead>
                  <TableHead className="text-right">Output Tokens</TableHead>
                  <TableHead className="text-right">Costo Total</TableHead>
                  <TableHead className="text-right">Llamadas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usageByAgent.map((agent) => (
                  <TableRow key={agent.agentName}>
                    <TableCell className="font-medium">{agent.agentName}</TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatNumber(agent.totalInputTokens)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatNumber(agent.totalOutputTokens)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold">
                      {formatCurrency(Number(agent.totalCostUsd))}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {agent.eventCount}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                <strong>Nota sobre los costos:</strong> Las estimaciones están basadas en los precios 
                públicos de Gemini 2.5 Pro. Replit puede aplicar su propio markup sobre estos precios.
              </p>
              <p>
                Los costos mostrados son solo estimaciones basadas en el conteo de tokens registrado. 
                Para ver los costos reales facturados, consulta tu panel de facturación de Replit.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

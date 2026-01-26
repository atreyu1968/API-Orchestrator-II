import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  DollarSign, 
  BookOpen,
  Globe,
  Info,
  TrendingUp,
  FileText
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
import type { Translation, AiUsageEvent } from "@shared/schema";

function calculateCost(inputTokens: number, outputTokens: number, thinkingTokens: number = 0): number {
  const INPUT_PRICE_PER_MILLION = 0.36;
  const OUTPUT_PRICE_PER_MILLION = 0.95;
  const THINKING_PRICE_PER_MILLION = 0.55;
  
  const inputCost = (inputTokens / 1_000_000) * INPUT_PRICE_PER_MILLION;
  const outputCost = (outputTokens / 1_000_000) * OUTPUT_PRICE_PER_MILLION;
  const thinkingCost = (thinkingTokens / 1_000_000) * THINKING_PRICE_PER_MILLION;
  
  return inputCost + outputCost + thinkingCost;
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(4)}`;
}

function formatCurrencyShort(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

const PRICING_INFO = `Tarifas DeepSeek (por millón de tokens):

R1 (Arquitecto, Director): $0.55 input / $2.19 output
V3 (Escritor, Editor): $0.28 input / $0.42 output

Promedio ponderado: $0.36 input / $0.95 output`;

interface ChapterCost {
  chapterNumber: number;
  chapterLabel: string;
  inputTokens: number;
  outputTokens: number;
  thinkingTokens: number;
  cost: number;
  agents: string[];
}

function getChapterLabel(chapterNumber: number | null): string {
  if (chapterNumber === null) return "Global";
  if (chapterNumber === 0) return "Prólogo";
  if (chapterNumber === 998) return "Epílogo";
  if (chapterNumber === 999) return "Nota del Autor";
  return `Capítulo ${chapterNumber}`;
}

function groupEventsByChapter(events: AiUsageEvent[]): ChapterCost[] {
  const grouped = new Map<number | null, ChapterCost>();
  
  for (const event of events) {
    const key = event.chapterNumber;
    const existing = grouped.get(key);
    
    if (existing) {
      existing.inputTokens += event.inputTokens || 0;
      existing.outputTokens += event.outputTokens || 0;
      existing.thinkingTokens += event.thinkingTokens || 0;
      existing.cost += parseFloat(event.totalCostUsd || "0");
      if (!existing.agents.includes(event.agentName)) {
        existing.agents.push(event.agentName);
      }
    } else {
      grouped.set(key, {
        chapterNumber: key ?? -1,
        chapterLabel: getChapterLabel(key),
        inputTokens: event.inputTokens || 0,
        outputTokens: event.outputTokens || 0,
        thinkingTokens: event.thinkingTokens || 0,
        cost: parseFloat(event.totalCostUsd || "0"),
        agents: [event.agentName],
      });
    }
  }
  
  return Array.from(grouped.values()).sort((a, b) => {
    if (a.chapterNumber === -1) return -1;
    if (b.chapterNumber === -1) return 1;
    return a.chapterNumber - b.chapterNumber;
  });
}

export default function CostsHistoryPage() {
  const { currentProject, isLoading: loadingProject } = useProject();

  const { data: translations, isLoading: loadingTranslations } = useQuery<Translation[]>({
    queryKey: ["/api/translations"],
  });

  const { data: aiUsageEvents, isLoading: loadingUsage } = useQuery<AiUsageEvent[]>({
    queryKey: [`/api/projects/${currentProject?.id}/ai-usage`],
    enabled: !!currentProject?.id,
  });

  const chapterCosts = groupEventsByChapter(aiUsageEvents || []);
  const totalFromEvents = chapterCosts.reduce((sum, c) => sum + c.cost, 0);

  const projectCost = totalFromEvents > 0 ? totalFromEvents : (currentProject ? calculateCost(
    currentProject.totalInputTokens || 0,
    currentProject.totalOutputTokens || 0,
    currentProject.totalThinkingTokens || 0
  ) : 0);

  const translationsWithCosts = (translations || [])
    .filter(t => currentProject && t.projectId === currentProject.id)
    .filter(t => (t.inputTokens || 0) > 0 || (t.outputTokens || 0) > 0)
    .map(t => ({
      ...t,
      cost: calculateCost(t.inputTokens || 0, t.outputTokens || 0, 0)
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const totalTranslationsCost = translationsWithCosts.reduce((sum, t) => sum + t.cost, 0);
  const grandTotal = projectCost + totalTranslationsCost;

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
            Desglose de costos por capítulo y traducciones
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Costo Generación</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingProject || loadingUsage ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">{formatCurrencyShort(projectCost)}</div>
                <p className="text-xs text-muted-foreground">
                  {chapterCosts.length} operaciones registradas
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Costo Traducciones</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingTranslations ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">{formatCurrencyShort(totalTranslationsCost)}</div>
                <p className="text-xs text-muted-foreground">
                  {translationsWithCosts.length} traducciones
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Costo Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingProject || loadingTranslations || loadingUsage ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold text-primary">{formatCurrencyShort(grandTotal)}</div>
                <p className="text-xs text-muted-foreground">
                  Generación + Traducciones
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Desglose por Capítulo
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingUsage ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : chapterCosts.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No hay datos de costos detallados para este proyecto
            </p>
          ) : (
            <div className="max-h-[400px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Capítulo</TableHead>
                    <TableHead>Agentes</TableHead>
                    <TableHead className="text-right">Entrada</TableHead>
                    <TableHead className="text-right">Salida</TableHead>
                    <TableHead className="text-right">Razonamiento</TableHead>
                    <TableHead className="text-right">Costo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chapterCosts.map((chapter) => (
                    <TableRow key={chapter.chapterNumber} data-testid={`row-chapter-${chapter.chapterNumber}`}>
                      <TableCell className="font-medium">
                        {chapter.chapterLabel}
                      </TableCell>
                      <TableCell className="max-w-[150px]">
                        <div className="flex flex-wrap gap-1">
                          {chapter.agents.slice(0, 3).map(agent => (
                            <Badge key={agent} variant="outline" className="text-xs">
                              {agent.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()).substring(0, 12)}
                            </Badge>
                          ))}
                          {chapter.agents.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{chapter.agents.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatNumber(chapter.inputTokens)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatNumber(chapter.outputTokens)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-muted-foreground">
                        {formatNumber(chapter.thinkingTokens)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold">
                        {formatCurrency(chapter.cost)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell colSpan={5}>TOTAL GENERACIÓN</TableCell>
                    <TableCell className="text-right font-mono text-lg">
                      {formatCurrencyShort(projectCost)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Traducciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingTranslations ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : translationsWithCosts.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No hay traducciones para este proyecto
            </p>
          ) : (
            <div className="max-h-[400px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Idioma</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Tokens Entrada</TableHead>
                    <TableHead className="text-right">Tokens Salida</TableHead>
                    <TableHead className="text-right">Costo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {translationsWithCosts.map((translation) => (
                    <TableRow key={translation.id} data-testid={`row-translation-${translation.id}`}>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {translation.sourceLanguage} → {translation.targetLanguage}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={translation.status === "completed" ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {translation.status === "completed" ? "Completada" : 
                           translation.status === "translating" ? "Traduciendo" :
                           translation.status === "error" ? "Error" : "Pendiente"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatNumber(translation.inputTokens || 0)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatNumber(translation.outputTokens || 0)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold">
                        {formatCurrency(translation.cost)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {translationsWithCosts.length > 0 && (
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell colSpan={4}>TOTAL TRADUCCIONES</TableCell>
                      <TableCell className="text-right font-mono text-lg">
                        {formatCurrencyShort(totalTranslationsCost)}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <TrendingUp className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p>
                Los costos se calculan usando las tarifas de DeepSeek (R1 y V3) basándose en el conteo de tokens de cada operación.
                El desglose muestra el costo por capítulo incluyendo todos los agentes involucrados en su generación.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WorldBibleDisplay } from "@/components/world-bible-display";
import { Badge } from "@/components/ui/badge";
import { Globe, AlertTriangle, CheckCircle } from "lucide-react";
import { useProject } from "@/lib/project-context";
import type { WorldBible } from "@shared/schema";

interface ConsistencyViolation {
  id: number;
  projectId: number;
  chapterNumber: number;
  violationType: string;
  severity: string;
  description: string;
  wasAutoFixed: boolean;
  fixDescription?: string;
  createdAt: string;
}

export default function WorldBiblePage() {
  const { currentProject, isLoading: projectsLoading } = useProject();

  const isGenerating = currentProject?.status === "generating" || currentProject?.status === "pending" || currentProject?.status === "planning";
  
  const { data: worldBible, isLoading: worldBibleLoading, error } = useQuery<WorldBible>({
    queryKey: ["/api/projects", currentProject?.id, "world-bible"],
    enabled: !!currentProject?.id,
    staleTime: isGenerating ? 0 : 60000,
    refetchInterval: isGenerating ? 5000 : false,
  });

  const { data: violations } = useQuery<ConsistencyViolation[]>({
    queryKey: ["/api/projects", currentProject?.id, "consistency-violations"],
    enabled: !!currentProject?.id,
    staleTime: 30000,
    refetchInterval: isGenerating ? 10000 : false,
  });

  if (projectsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Globe className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Cargando proyectos...</p>
        </div>
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <Globe className="h-16 w-16 text-muted-foreground/20 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Sin biblia del mundo</h2>
        <p className="text-muted-foreground max-w-md">
          Crea un nuevo proyecto desde el panel de control para generar la biblia del mundo
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <Globe className="h-16 w-16 text-muted-foreground/20 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Error al cargar</h2>
        <p className="text-muted-foreground max-w-md">
          No se pudo cargar la biblia del mundo. Intenta recargar la página.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="world-bible-page">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Biblia del Mundo</h1>
          <p className="text-muted-foreground mt-1">
            Documento de referencia narrativa
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Badge variant="secondary">{currentProject.genre}</Badge>
        <Badge variant="outline">{currentProject.tone}</Badge>
        <Badge variant="outline">{currentProject.chapterCount} capítulos</Badge>
      </div>

      {worldBibleLoading ? (
        <div className="flex items-center justify-center py-12">
          <Globe className="h-8 w-8 text-muted-foreground/30 animate-pulse" />
        </div>
      ) : (() => {
        const hasData = worldBible && (
          (worldBible.timeline && (worldBible.timeline as any[]).length > 0) ||
          (worldBible.characters && (worldBible.characters as any[]).length > 0) ||
          (worldBible.plotOutline && Object.keys(worldBible.plotOutline as object).length > 0)
        );
        
        if (isGenerating && !hasData) {
          return (
            <Card>
              <CardContent className="py-12">
                <div className="flex flex-col items-center justify-center text-center">
                  <Globe className="h-12 w-12 text-muted-foreground/30 mb-4 animate-pulse" />
                  <h3 className="text-lg font-medium mb-2">Generando biblia del mundo...</h3>
                  <p className="text-muted-foreground text-sm max-w-md">
                    El agente arquitecto está creando el universo narrativo. 
                    Esto puede tardar unos minutos.
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        }
        
        return (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Universo Narrativo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <WorldBibleDisplay worldBible={worldBible || null} />
              </CardContent>
            </Card>

            {violations && violations.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    Registro de Consistencia
                    <Badge variant="secondary" className="ml-2">{violations.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {violations.map((v) => (
                      <div 
                        key={v.id} 
                        className={`p-3 rounded-lg border ${
                          v.wasAutoFixed 
                            ? "bg-green-500/5 border-green-500/20" 
                            : v.severity === "critical" 
                              ? "bg-red-500/10 border-red-500/30"
                              : v.severity === "major"
                                ? "bg-orange-500/10 border-orange-500/30"
                                : "bg-yellow-500/10 border-yellow-500/30"
                        }`}
                        data-testid={`violation-${v.id}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge 
                                variant={v.wasAutoFixed ? "default" : "secondary"}
                                className="text-xs"
                              >
                                Cap. {v.chapterNumber}
                              </Badge>
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${
                                  v.severity === "critical" ? "border-red-500 text-red-500" :
                                  v.severity === "major" ? "border-orange-500 text-orange-500" :
                                  "border-yellow-500 text-yellow-500"
                                }`}
                              >
                                {v.severity}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {v.violationType.replace(/_/g, " ")}
                              </span>
                            </div>
                            <p className="text-sm">{v.description}</p>
                            {v.wasAutoFixed && v.fixDescription && (
                              <div className="mt-2 flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                                <CheckCircle className="h-3 w-3" />
                                <span>Corregido: {v.fixDescription}</span>
                              </div>
                            )}
                          </div>
                          {v.wasAutoFixed && (
                            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        );
      })()}
    </div>
  );
}

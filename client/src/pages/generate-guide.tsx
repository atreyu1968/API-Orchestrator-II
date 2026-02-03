import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, BookOpen, FileText, CheckCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Pseudonym {
  id: number;
  name: string;
  defaultGenre?: string;
  defaultTone?: string;
}

interface Series {
  id: number;
  title: string;
  workType: string;
}

const formSchema = z.object({
  title: z.string().min(1, "El título es requerido"),
  argument: z.string().min(50, "El argumento debe tener al menos 50 caracteres"),
  genre: z.string().default("thriller"),
  tone: z.string().default("tenso"),
  chapterCount: z.number().min(5, "Mínimo 5 capítulos").max(50, "Máximo 50 capítulos"),
  hasPrologue: z.boolean().default(true),
  hasEpilogue: z.boolean().default(true),
  hasAuthorNote: z.boolean().default(false),
  pseudonymId: z.string().optional(),
  seriesId: z.string().optional(),
  seriesOrder: z.number().min(1).default(1),
  kindleUnlimited: z.boolean().default(true),
  createProject: z.boolean().default(true),
});

type FormData = z.infer<typeof formSchema>;

export default function GenerateGuidePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [generatedGuide, setGeneratedGuide] = useState<string | null>(null);
  const [createdProjectId, setCreatedProjectId] = useState<number | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      argument: "",
      genre: "thriller",
      tone: "tenso",
      chapterCount: 25,
      hasPrologue: true,
      hasEpilogue: true,
      hasAuthorNote: false,
      pseudonymId: "",
      seriesId: "",
      seriesOrder: 1,
      kindleUnlimited: true,
      createProject: true,
    },
  });

  const { data: pseudonyms = [] } = useQuery<Pseudonym[]>({
    queryKey: ["/api/pseudonyms"],
  });

  const { data: seriesList = [] } = useQuery<Series[]>({
    queryKey: ["/api/series"],
  });

  const generateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest("POST", "/api/generate-writing-guide", {
        ...data,
        pseudonymId: data.pseudonymId ? parseInt(data.pseudonymId) : undefined,
        seriesId: data.seriesId ? parseInt(data.seriesId) : undefined,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedGuide(data.guideContent);
      setCreatedProjectId(data.projectId);
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Guía generada",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    generateMutation.mutate(data);
  };

  const handlePseudonymChange = (value: string) => {
    form.setValue("pseudonymId", value);
    const pseudonym = pseudonyms.find(p => p.id.toString() === value);
    if (pseudonym) {
      if (pseudonym.defaultGenre) {
        form.setValue("genre", pseudonym.defaultGenre);
      }
      if (pseudonym.defaultTone) {
        form.setValue("tone", pseudonym.defaultTone);
      }
    }
  };

  const resetForm = () => {
    setGeneratedGuide(null);
    setCreatedProjectId(null);
    form.reset();
  };

  const argumentLength = form.watch("argument")?.length || 0;
  const seriesId = form.watch("seriesId");

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6" data-testid="page-header">
        <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="text-page-title">
          <Sparkles className="h-8 w-8 text-primary" />
          Generador de Guías de Escritura
        </h1>
        <p className="text-muted-foreground mt-2" data-testid="text-page-description">
          Genera automáticamente una guía de escritura completa a partir de un argumento
        </p>
      </div>

      {!generatedGuide ? (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Datos de la Novela
                </CardTitle>
                <CardDescription>
                  Proporciona el argumento y la configuración básica
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título de la novela</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          data-testid="input-title"
                          placeholder="Ej: Sombras en el agua"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="argument"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Argumento / Sinopsis</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          data-testid="input-argument"
                          placeholder="Describe la trama principal, el conflicto central y los personajes principales. Cuanto más detallado, mejor será la guía generada..."
                          className="min-h-[200px]"
                        />
                      </FormControl>
                      <FormDescription>
                        {argumentLength} caracteres (mínimo 50)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="genre"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Género</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-genre">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="thriller" data-testid="option-genre-thriller">Thriller</SelectItem>
                            <SelectItem value="romance" data-testid="option-genre-romance">Romance</SelectItem>
                            <SelectItem value="fantasy" data-testid="option-genre-fantasy">Fantasía</SelectItem>
                            <SelectItem value="sci-fi" data-testid="option-genre-scifi">Ciencia Ficción</SelectItem>
                            <SelectItem value="mystery" data-testid="option-genre-mystery">Misterio</SelectItem>
                            <SelectItem value="horror" data-testid="option-genre-horror">Terror</SelectItem>
                            <SelectItem value="historical" data-testid="option-genre-historical">Histórico</SelectItem>
                            <SelectItem value="literary" data-testid="option-genre-literary">Literario</SelectItem>
                            <SelectItem value="young-adult" data-testid="option-genre-ya">Juvenil</SelectItem>
                            <SelectItem value="erotic" data-testid="option-genre-erotic">Erótico</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tono</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-tone">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="tenso" data-testid="option-tone-tenso">Tenso</SelectItem>
                            <SelectItem value="oscuro" data-testid="option-tone-oscuro">Oscuro</SelectItem>
                            <SelectItem value="esperanzador" data-testid="option-tone-esperanzador">Esperanzador</SelectItem>
                            <SelectItem value="dramático" data-testid="option-tone-dramatico">Dramático</SelectItem>
                            <SelectItem value="romántico" data-testid="option-tone-romantico">Romántico</SelectItem>
                            <SelectItem value="humorístico" data-testid="option-tone-humoristico">Humorístico</SelectItem>
                            <SelectItem value="melancólico" data-testid="option-tone-melancolico">Melancólico</SelectItem>
                            <SelectItem value="épico" data-testid="option-tone-epico">Épico</SelectItem>
                            <SelectItem value="íntimo" data-testid="option-tone-intimo">Íntimo</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="chapterCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número de capítulos</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          data-testid="input-chapter-count"
                          type="number"
                          min={5}
                          max={50}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 25)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex flex-wrap gap-6">
                  <FormField
                    control={form.control}
                    name="hasPrologue"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Switch
                            data-testid="switch-prologue"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">Prólogo</FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="hasEpilogue"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Switch
                            data-testid="switch-epilogue"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">Epílogo</FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="hasAuthorNote"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Switch
                            data-testid="switch-author-note"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">Nota del autor</FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="kindleUnlimited"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Switch
                            data-testid="switch-kindle-unlimited"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">Kindle Unlimited</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Autor y Serie</CardTitle>
                <CardDescription>
                  Asocia la novela a un seudónimo y/o serie existente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="pseudonymId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Seudónimo</FormLabel>
                      <Select onValueChange={handlePseudonymChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-pseudonym">
                            <SelectValue placeholder="Selecciona un seudónimo (opcional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="" data-testid="option-pseudonym-none">Sin seudónimo</SelectItem>
                          {pseudonyms.map((p) => (
                            <SelectItem 
                              key={p.id} 
                              value={p.id.toString()}
                              data-testid={`option-pseudonym-${p.id}`}
                            >
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="seriesId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Serie</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-series">
                              <SelectValue placeholder="Selecciona una serie (opcional)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="" data-testid="option-series-none">Obra independiente</SelectItem>
                            {seriesList.map((s) => (
                              <SelectItem 
                                key={s.id} 
                                value={s.id.toString()}
                                data-testid={`option-series-${s.id}`}
                              >
                                {s.title} ({s.workType})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {seriesId && (
                    <FormField
                      control={form.control}
                      name="seriesOrder"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número en la serie</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              data-testid="input-series-order"
                              type="number"
                              min={1}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <FormField
                  control={form.control}
                  name="createProject"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2 pt-2">
                      <FormControl>
                        <Switch
                          data-testid="switch-create-project"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="!mt-0">Crear proyecto automáticamente</FormLabel>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Button
              type="submit"
              size="lg"
              className="w-full"
              data-testid="button-generate"
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generando guía... (puede tardar 1-2 minutos)
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Generar Guía de Escritura
                </>
              )}
            </Button>
          </form>
        </Form>
      ) : (
        <div className="space-y-6">
          <Card className="border-green-500/50 bg-green-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400" data-testid="text-success-title">
                <CheckCircle className="h-6 w-6" />
                Guía Generada Exitosamente
              </CardTitle>
              {createdProjectId && (
                <CardDescription data-testid="text-project-id">
                  Proyecto creado con ID: {createdProjectId}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                {createdProjectId && (
                  <Button
                    data-testid="button-go-to-dashboard"
                    onClick={() => setLocation("/")}
                  >
                    <BookOpen className="mr-2 h-4 w-4" />
                    Ir al Dashboard
                  </Button>
                )}
                <Button
                  variant="outline"
                  data-testid="button-download-guide"
                  onClick={() => {
                    const blob = new Blob([generatedGuide], { type: "text/markdown" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `guia_${form.getValues("title").toLowerCase().replace(/\s+/g, "_")}.md`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Descargar Guía
                </Button>
                <Button
                  variant="ghost"
                  data-testid="button-new-guide"
                  onClick={resetForm}
                >
                  Generar otra guía
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2" data-testid="text-preview-title">
                <FileText className="h-5 w-5" />
                Vista previa de la guía
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none max-h-[600px] overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm font-mono bg-muted p-4 rounded-lg" data-testid="text-guide-content">
                  {generatedGuide}
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { HelpCircle, BookOpen, Wand2, Languages, ChevronRight, CheckCircle2, AlertTriangle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

function Section({ title, children, testId }: { title: string; children: React.ReactNode; testId?: string }) {
  return (
    <div className="space-y-2" data-testid={testId}>
      <h3 className="font-semibold text-base flex items-center gap-2">
        <ChevronRight className="h-4 w-4 text-primary" />
        {title}
      </h3>
      <div className="pl-6 text-sm text-muted-foreground space-y-2">
        {children}
      </div>
    </div>
  );
}

function Step({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="flex gap-3 items-start">
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
        {number}
      </div>
      <div>
        <p className="font-medium text-foreground">{title}</p>
        <p className="text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 items-start p-3 bg-amber-500/10 border border-amber-500/20 rounded-md">
      <Sparkles className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
      <p className="text-sm">{children}</p>
    </div>
  );
}

function LitAgentManual() {
  return (
    <ScrollArea className="h-[60vh] pr-4">
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            LitAgents v2 - Sistema de Escritura
          </h2>
          <p className="text-sm text-muted-foreground">
            Sistema de agentes autónomos que escriben novelas completas siguiendo tu visión creativa.
          </p>
        </div>

        <Section title="Crear un nuevo proyecto" testId="section-litagent-create">
          <div className="space-y-3">
            <Step 
              number={1} 
              title="Ir a Nuevo Proyecto" 
              description="Haz clic en 'Nuevo Proyecto' en el menú lateral izquierdo."
            />
            <Step 
              number={2} 
              title="Completar el formulario" 
              description="Escribe el título, género, idioma, número de capítulos y palabras objetivo."
            />
            <Step 
              number={3} 
              title="Escribir la sinopsis" 
              description="Describe la trama principal, personajes y ambientación. Cuanto más detallada, mejor resultado."
            />
            <Step 
              number={4} 
              title="Crear proyecto" 
              description="El sistema analizará tu sinopsis y preparará la estructura."
            />
          </div>
        </Section>

        <Section title="Iniciar la generación" testId="section-litagent-start">
          <div className="space-y-3">
            <Step 
              number={1} 
              title="Seleccionar el proyecto" 
              description="Elige tu proyecto del selector en la parte superior."
            />
            <Step 
              number={2} 
              title="Ir al Panel de Control" 
              description="Navega a 'Panel de Control' en el menú lateral."
            />
            <Step 
              number={3} 
              title="Añadir a la cola" 
              description="Haz clic en 'Iniciar Generación' o 'Añadir a Cola' si hay otros proyectos."
            />
            <Step 
              number={4} 
              title="Monitorear el progreso" 
              description="Las tarjetas de agentes mostrarán el estado de cada etapa."
            />
          </div>
        </Section>

        <Section title="Agentes del sistema" testId="section-litagent-agents">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline">Global Architect</Badge>
              <span>Planifica la estructura general de la novela</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">Chapter Architect</Badge>
              <span>Diseña las escenas de cada capítulo</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">Ghostwriter v2</Badge>
              <span>Escribe el contenido escena por escena</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">Smart Editor</Badge>
              <span>Evalúa la calidad y sugiere mejoras</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">Summarizer</Badge>
              <span>Resume capítulos para mantener coherencia</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">Consistency</Badge>
              <span>Verifica continuidad de personajes y tramas</span>
            </div>
          </div>
        </Section>

        <Section title="Control de calidad" testId="section-litagent-quality">
          <p>El sistema evalúa cada capítulo con puntuaciones de 1 a 10:</p>
          <div className="space-y-1 mt-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span><strong>8-10:</strong> Aprobado automáticamente</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span><strong>6-7:</strong> Se reescribe automáticamente</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span><strong>1-5:</strong> Requiere intervención manual</span>
            </div>
          </div>
        </Section>

        <Tip>
          Puedes pausar la generación en cualquier momento. El sistema recordará 
          dónde se quedó y continuará desde ese punto cuando lo reanudes.
        </Tip>
      </div>
    </ScrollArea>
  );
}

function ReeditorManual() {
  return (
    <ScrollArea className="h-[60vh] pr-4">
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            Re-editor - Editor de Desarrollo
          </h2>
          <p className="text-sm text-muted-foreground">
            Sistema de edición profesional para manuscritos existentes con auditoría forense y análisis comercial.
          </p>
        </div>

        <Section title="Importar un manuscrito" testId="section-reeditor-import">
          <div className="space-y-3">
            <Step 
              number={1} 
              title="Ir a Re-editor" 
              description="Haz clic en 'Re-editor' en el menú lateral."
            />
            <Step 
              number={2} 
              title="Nuevo proyecto de edición" 
              description="Haz clic en 'Nuevo Proyecto' en la esquina superior derecha."
            />
            <Step 
              number={3} 
              title="Pegar el manuscrito" 
              description="Copia y pega tu texto en el área de importación. El sistema detectará los capítulos automáticamente."
            />
            <Step 
              number={4} 
              title="Configurar opciones" 
              description="Indica el género, idioma y tipo de edición deseado."
            />
          </div>
        </Section>

        <Section title="Fases del proceso" testId="section-reeditor-phases">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge>1. Auditoría Forense</Badge>
              <span>Detecta errores de continuidad, inconsistencias y problemas</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge>2. Beta Reader</Badge>
              <span>Analiza viabilidad comercial y compara con el mercado</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge>3. Corrección</Badge>
              <span>Aplica correcciones quirúrgicas o reescrituras según necesidad</span>
            </div>
          </div>
        </Section>

        <Section title="Corrección quirúrgica vs Reescritura" testId="section-reeditor-surgical">
          <p>El sistema decide automáticamente el mejor enfoque:</p>
          <div className="space-y-2 mt-2">
            <div className="p-2 bg-green-500/10 rounded border border-green-500/20">
              <p className="font-medium text-green-600 dark:text-green-400">Corrección Quirúrgica</p>
              <p className="text-xs">3 problemas o menos, ninguno crítico. Ahorra ~50% de tokens.</p>
            </div>
            <div className="p-2 bg-amber-500/10 rounded border border-amber-500/20">
              <p className="font-medium text-amber-600 dark:text-amber-400">Reescritura Completa</p>
              <p className="text-xs">Más de 3 problemas o alguno crítico. Reescribe el capítulo entero.</p>
            </div>
          </div>
        </Section>

        <Section title="Auditoría Forense" testId="section-reeditor-forensic">
          <p>Detecta 7 tipos de violaciones:</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>Inconsistencias temporales</li>
            <li>Contradicciones de personajes</li>
            <li>Errores de continuidad espacial</li>
            <li>Objetos que aparecen/desaparecen</li>
            <li>Cambios de personalidad injustificados</li>
            <li>Hilos argumentales abandonados</li>
            <li>Anacronismos</li>
          </ul>
        </Section>

        <Section title="Beta Reader Comercial" testId="section-reeditor-beta">
          <p>Proporciona análisis de mercado:</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>Puntuación de viabilidad comercial</li>
            <li>Comparación con libros exitosos del género</li>
            <li>Fortalezas y debilidades narrativas</li>
            <li>Recomendaciones de mejora</li>
            <li>Público objetivo sugerido</li>
          </ul>
        </Section>

        <Tip>
          Puedes ver los resultados de la auditoría antes de aplicar correcciones. 
          Esto te permite revisar qué cambios se harán.
        </Tip>
      </div>
    </ScrollArea>
  );
}

function TranslatorManual() {
  return (
    <ScrollArea className="h-[60vh] pr-4">
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Languages className="h-5 w-5 text-primary" />
            Traductor - LitTranslators 2.0
          </h2>
          <p className="text-sm text-muted-foreground">
            Sistema de traducción literaria con preservación de estilo y revisión por hablante nativo.
          </p>
        </div>

        <Section title="Traducir un proyecto" testId="section-translator-howto">
          <div className="space-y-3">
            <Step 
              number={1} 
              title="Ir a Exportar" 
              description="Navega a 'Exportar' en el menú lateral."
            />
            <Step 
              number={2} 
              title="Seleccionar proyecto" 
              description="Elige el proyecto completado que deseas traducir."
            />
            <Step 
              number={3} 
              title="Elegir idiomas" 
              description="Selecciona el idioma de origen y el idioma destino."
            />
            <Step 
              number={4} 
              title="Seleccionar género" 
              description="Indica el género para adaptar el estilo de traducción."
            />
            <Step 
              number={5} 
              title="Iniciar traducción" 
              description="El sistema procesará el texto en fragmentos optimizados."
            />
          </div>
        </Section>

        <Section title="Fases del proceso" testId="section-translator-phases">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge>1. Análisis</Badge>
              <span>Detecta estilo, tipografía y convenciones del original</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge>2. Traducción</Badge>
              <span>Traduce por fragmentos preservando el tono y estilo</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge>3. Revisión Nativa</Badge>
              <span>Un "lector beta nativo" revisa y corrige</span>
            </div>
          </div>
        </Section>

        <Section title="Lector Beta Nativo" testId="section-translator-native">
          <p>Simula un hablante nativo del idioma destino que:</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>Evalúa la fluidez y naturalidad del texto</li>
            <li>Detecta expresiones que suenan "traducidas"</li>
            <li>Verifica la adherencia al género literario</li>
            <li>Aplica correcciones automáticas</li>
            <li>Da puntuaciones de calidad (1-10)</li>
          </ul>
        </Section>

        <Section title="Puntuaciones del Lector Nativo" testId="section-translator-scores">
          <div className="space-y-2 mt-2">
            <div className="flex justify-between items-center gap-2 flex-wrap" data-testid="text-score-quality">
              <span>Calidad General</span>
              <span className="text-muted-foreground">Evaluación global de la traducción</span>
            </div>
            <div className="flex justify-between items-center gap-2 flex-wrap" data-testid="text-score-fluency">
              <span>Fluidez</span>
              <span className="text-muted-foreground">Naturalidad del lenguaje</span>
            </div>
            <div className="flex justify-between items-center gap-2 flex-wrap" data-testid="text-score-genre">
              <span>Adherencia al Género</span>
              <span className="text-muted-foreground">Respeto a las convenciones del género</span>
            </div>
            <div className="flex justify-between items-center gap-2 flex-wrap" data-testid="text-score-cultural">
              <span>Adaptación Cultural</span>
              <span className="text-muted-foreground">Localización de referencias culturales</span>
            </div>
          </div>
        </Section>

        <Section title="Idiomas disponibles" testId="section-translator-languages">
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant="outline">Español</Badge>
            <Badge variant="outline">Inglés (US/UK)</Badge>
            <Badge variant="outline">Francés</Badge>
            <Badge variant="outline">Alemán</Badge>
            <Badge variant="outline">Italiano</Badge>
            <Badge variant="outline">Portugués (BR/PT)</Badge>
            <Badge variant="outline">Japonés</Badge>
            <Badge variant="outline">Chino</Badge>
            <Badge variant="outline">Coreano</Badge>
          </div>
        </Section>

        <Tip>
          Las traducciones se guardan automáticamente. Puedes descargarlas en 
          formato Markdown o DOCX desde la lista de traducciones.
        </Tip>
      </div>
    </ScrollArea>
  );
}

export function HelpModal() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-muted-foreground"
          data-testid="button-help"
        >
          <HelpCircle className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            Manual de Usuario
          </DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="litagent" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="litagent" className="flex items-center gap-1.5" data-testid="tab-litagent">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Escritura</span>
            </TabsTrigger>
            <TabsTrigger value="reeditor" className="flex items-center gap-1.5" data-testid="tab-reeditor">
              <Wand2 className="h-4 w-4" />
              <span className="hidden sm:inline">Re-editor</span>
            </TabsTrigger>
            <TabsTrigger value="translator" className="flex items-center gap-1.5" data-testid="tab-translator">
              <Languages className="h-4 w-4" />
              <span className="hidden sm:inline">Traductor</span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="litagent" className="mt-4">
            <LitAgentManual />
          </TabsContent>
          <TabsContent value="reeditor" className="mt-4">
            <ReeditorManual />
          </TabsContent>
          <TabsContent value="translator" className="mt-4">
            <TranslatorManual />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

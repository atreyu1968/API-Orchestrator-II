import { BaseAgent, AgentResponse } from "./base-agent";

const SERIES_BIBLE_PROMPT = `Eres un experto en planificación editorial de series literarias. Tu trabajo es generar la BIBLIA DE SERIE (fundamentos) para una saga de novelas.

DEBES generar SOLO las secciones 1-6 y 9-13 siguiendo esta estructura:

---

# ESTRATEGIA EDITORIAL: [NOMBRE DE LA SERIE]

## 1. IDENTIDAD DEL AUTOR/SEUDÓNIMO
- **Nombre:** [Seudónimo]
- **Por qué funciona:** [Justificación del nombre]
- **Bio del autor:** [Biografía ficticia de 2-3 líneas que conecte con el género]

## 2. EL DETECTIVE/PROTAGONISTA DE LA SERIE
- **Nombre completo:**
- **Edad aproximada:**
- **Profesión/Rol:**
- **Backstory:** [Historia de fondo que se revelará gradualmente]
- **Trauma/Herida emocional:** [El "incidente" que lo persigue]
- **Personalidad:** [Rasgos distintivos]
- **Método de trabajo:** [Cómo resuelve casos/conflictos]
- **Debilidades:** [Defectos que lo humanizan]
- **Evolución a lo largo de la serie:** [Cómo cambiará del libro 1 al último]

## 3. EL ESCENARIO RECURRENTE
- **Ubicación principal:** [Ciudad/región]
- **Por qué este lugar:** [Justificación narrativa]
- **Atmósfera:** [Sensaciones, clima, estética]
- **Lugares icónicos:** [Sitios que aparecerán en múltiples libros]
- **Personajes secundarios fijos:** [El informante, el rival, el aliado, etc.]

## 4. ESTILO LITERARIO DE LA SERIE
### A. Voz y Tono
- **Registro narrativo:** [Formal/coloquial/técnico]
- **Punto de vista:** [Primera/tercera persona]
- **Ritmo de prosa:** [Frases cortas/largas/variadas]
- **Nivel de descripción:** [Minimalista/moderado/detallado]

### B. Tropos Característicos
- [Tropo 1]: [Descripción de cómo se usa]
- [Tropo 2]: [Descripción de cómo se usa]
- [Tropo 3]: [Descripción de cómo se usa]

### C. Elementos Recurrentes
- **Objeto simbólico:** [Algo que aparece en todos los libros]
- **Frase característica:** [Muletilla o lema del protagonista]
- **Ritual/Costumbre:** [Algo que el protagonista hace siempre]

## 5. ESTRUCTURA DE LAS NOVELAS
### A. Anatomía de un Capítulo
- **Longitud:** [Palabras por capítulo]
- **Estructura interna:** [Gancho -> Desarrollo -> Cliffhanger]
- **Ritmo:** [Cómo alternar acción y reflexión]

### B. Estructura de Cada Novela
- **Capítulos 1-5:** [Qué debe ocurrir]
- **Punto medio (50%):** [Tipo de giro esperado]
- **Clímax (90%):** [Tipo de confrontación]
- **Resolución:** [Cómo cerrar cada libro]

## 6. EL HILO CONDUCTOR (METATRAMA)
- **El misterio central:** [Qué une toda la serie]
- **Cómo se revela:** [Gradualmente, pistas por libro]
- **Antagonista final:** [Quién está detrás de todo]
- **Resolución definitiva:** [Cómo termina la serie]

## 9. PERSONAJES RECURRENTES

### Aliado Principal
- **Nombre:**
- **Rol:** [Compañero, mentor, subordinado]
- **Dinámica con protagonista:**
- **Arco a lo largo de la serie:**

### Antagonista Recurrente (si aplica)
- **Nombre:**
- **Motivación:**
- **Relación con protagonista:**

### Personajes de Apoyo
- [Nombre]: [Rol y función en la serie]
- [Nombre]: [Rol y función en la serie]

## 10. REGLAS DEL MUNDO
- **Tecnología/Época:**
- **Sistema legal/social:**
- **Limitaciones del protagonista:**
- **Qué puede y qué NO puede hacer:**

## 11. ESTRATEGIA DE CONTINUIDAD
- **Qué se mantiene igual:** [Elementos constantes]
- **Qué evoluciona:** [Elementos que cambian gradualmente]
- **Referencias cruzadas:** [Cómo mencionar eventos de libros anteriores]
- **Nuevos lectores:** [Cómo hacer cada libro accesible sin leer los anteriores]

## 12. PREVENCIÓN DE ERRORES DE CONTINUIDAD
- **Registro de heridas/cicatrices:**
- **Registro de relaciones:**
- **Línea temporal de la serie:**
- **Personajes muertos:** [Para no resucitarlos]

## 13. DISEÑO DE PORTADAS (Branding)
- **Concepto visual:**
- **Paleta de colores:**
- **Tipografía:**
- **Elementos constantes:**

---

REGLAS CRÍTICAS:
1. El protagonista debe EVOLUCIONAR gradualmente a lo largo de la serie
2. Los personajes secundarios deben tener sus propios arcos menores
3. NUNCA crear deus ex machina - toda resolución debe estar preparada
4. Mantener consistencia en la voz narrativa y el tono entre libros

Genera la biblia en español. Sé específico y detallado. NO incluyas las secciones 7 y 8 (hitos y arquitectura por volumen).`;

const VOLUME_MILESTONES_PROMPT = `Eres un experto en planificación editorial de series literarias.

Tu trabajo es generar los HITOS Y ARQUITECTURA para UN SOLO VOLUMEN de una serie, basándote en la biblia de serie proporcionada.

Genera EXACTAMENTE este formato para el volumen indicado:

---

## HITOS DEL VOLUMEN [N]:
- **Hito de trama:** [Qué pista/evento del misterio central se revela]
- **Hito de personaje:** [Qué aprende/descubre el protagonista sobre sí mismo]
- **Hito de mundo:** [Qué elemento del universo se establece/expande]
- **Objeto/pista introducida:** [Chekhov's Gun para libros posteriores]
- **Conexión con volúmenes anteriores:** [Referencias explícitas si no es Vol. 1]

## ARQUITECTURA DEL VOLUMEN [N]: [Título]
- **Argumento:** [Sinopsis de 4-6 líneas con el conflicto específico de este libro]
- **La pieza del puzzle:** [Qué pista del hilo conductor se revela]
- **Desarrollo del protagonista:** [Qué aprende/cambia en este libro]
- **Hitos a cumplir:** [Lista de los hitos del volumen]
- **Preparación para siguiente:** [Qué se siembra para el próximo libro, si aplica]

---

REGLAS:
1. El argumento debe ser específico y detallado (NO genérico)
2. Los hitos deben conectar con el misterio central de la serie
3. Cada volumen debe funcionar como historia independiente Y avanzar el hilo conductor
4. Si es el último volumen, incluir resolución del trauma del protagonista y cierre de arcos

Genera en español. Sé específico.`;

export interface SeriesGuideProgress {
  phase: "bible" | "volumes" | "complete";
  currentVolume?: number;
  totalVolumes?: number;
  completedVolumes: number[];
}

export class SeriesGuideGeneratorAgent extends BaseAgent {
  constructor() {
    super({
      name: "series-guide-generator",
      role: "Generador de guías de series literarias",
      systemPrompt: SERIES_BIBLE_PROMPT,
      model: "deepseek-chat",
    });
  }

  async execute(): Promise<AgentResponse> {
    throw new Error("Use generateSeriesGuidePhased() instead");
  }

  async generateSeriesBible(params: {
    concept: string;
    seriesTitle: string;
    genre: string;
    tone: string;
    bookCount: number;
    workType: "series" | "trilogy";
    pseudonymName?: string;
    pseudonymStyleGuide?: string;
  }): Promise<AgentResponse> {
    console.log(`[SeriesGuideGenerator] Phase 1: Generating series bible for "${params.seriesTitle}"...`);
    
    let prompt = `Genera la BIBLIA DE SERIE (secciones 1-6 y 9-13) para la siguiente saga:

## CONCEPTO DE LA SERIE:
${params.concept}

## CONFIGURACION:
- **Titulo de la serie:** ${params.seriesTitle}
- **Genero:** ${params.genre}
- **Tono:** ${params.tone}
- **Numero de libros planificados:** ${params.bookCount}
- **Tipo:** ${params.workType === "trilogy" ? "Trilogia" : "Serie extendida"}
`;

    if (params.pseudonymName) {
      prompt += `- **Seudonimo:** ${params.pseudonymName}\n`;
    }

    if (params.pseudonymStyleGuide) {
      prompt += `

## GUIA DE ESTILO DEL AUTOR:
${params.pseudonymStyleGuide}

IMPORTANTE: Respeta el estilo, voz y preferencias descritas en la guia de estilo.
`;
    }

    prompt += `

Genera ahora la BIBLIA DE SERIE siguiendo exactamente la estructura del prompt del sistema.
Recuerda: NO incluyas las secciones 7 y 8 (hitos y arquitectura por volumen). Esas se generaran por separado.
`;

    const response = await this.generateContent(prompt);
    console.log(`[SeriesGuideGenerator] Phase 1 complete: Bible generated (${response.content?.length || 0} chars)`);
    return response;
  }

  async generateVolumeMilestones(params: {
    volumeNumber: number;
    totalVolumes: number;
    seriesTitle: string;
    seriesBible: string;
    genre: string;
    tone: string;
    previousVolumeSummary?: string;
  }): Promise<AgentResponse> {
    console.log(`[SeriesGuideGenerator] Phase 2: Generating milestones for Volume ${params.volumeNumber}/${params.totalVolumes}...`);
    
    const isFirst = params.volumeNumber === 1;
    const isLast = params.volumeNumber === params.totalVolumes;
    
    let prompt = `Genera los HITOS Y ARQUITECTURA para el VOLUMEN ${params.volumeNumber} de ${params.totalVolumes} de la serie "${params.seriesTitle}".

## CONTEXTO DE LA SERIE (Biblia):
${params.seriesBible.substring(0, 8000)}

## CONFIGURACION DEL VOLUMEN:
- **Numero de volumen:** ${params.volumeNumber} de ${params.totalVolumes}
- **Genero:** ${params.genre}
- **Tono:** ${params.tone}
- **Es primer libro:** ${isFirst ? "Si - debe establecer el mundo y presentar al protagonista" : "No"}
- **Es ultimo libro:** ${isLast ? "Si - debe resolver el misterio central y cerrar arcos" : "No"}
`;

    if (params.previousVolumeSummary) {
      prompt += `

## RESUMEN DEL VOLUMEN ANTERIOR:
${params.previousVolumeSummary}

IMPORTANTE: Este volumen debe continuar los hilos del anterior y hacer referencias explicitas.
`;
    }

    if (isLast) {
      prompt += `

INSTRUCCIONES ESPECIALES PARA VOLUMEN FINAL:
- Incluir revelacion del antagonista final
- Incluir confrontacion definitiva
- Resolver el trauma/herida emocional del protagonista
- Cerrar TODOS los arcos secundarios pendientes
`;
    }

    prompt += `

Genera ahora los HITOS Y ARQUITECTURA para el Volumen ${params.volumeNumber} siguiendo exactamente el formato del prompt del sistema.
`;

    const savedPrompt = this.config.systemPrompt;
    this.config.systemPrompt = VOLUME_MILESTONES_PROMPT;
    const response = await this.generateContent(prompt);
    this.config.systemPrompt = savedPrompt;
    
    console.log(`[SeriesGuideGenerator] Volume ${params.volumeNumber} milestones generated (${response.content?.length || 0} chars)`);
    return response;
  }

  async generateSeriesGuidePhased(
    params: {
      concept: string;
      seriesTitle: string;
      genre: string;
      tone: string;
      bookCount: number;
      workType: "series" | "trilogy";
      pseudonymName?: string;
      pseudonymStyleGuide?: string;
    },
    onProgress?: (progress: SeriesGuideProgress) => void,
    checkCancellation?: () => boolean
  ): Promise<AgentResponse> {
    console.log(`[SeriesGuideGenerator] Starting phased generation for "${params.seriesTitle}" (${params.bookCount} books)...`);
    
    const progress: SeriesGuideProgress = {
      phase: "bible",
      totalVolumes: params.bookCount,
      completedVolumes: []
    };
    
    onProgress?.(progress);
    
    if (checkCancellation?.()) {
      return { content: "", error: "Cancelled by user" };
    }
    
    const bibleResponse = await this.generateSeriesBible(params);
    
    if (!bibleResponse.content || bibleResponse.content.length < 500) {
      console.error(`[SeriesGuideGenerator] Bible generation failed or too short`);
      return { content: "", error: "Failed to generate series bible" };
    }
    
    if (checkCancellation?.()) {
      return { content: bibleResponse.content, error: "Cancelled after bible generation" };
    }
    
    progress.phase = "volumes";
    onProgress?.(progress);
    
    const volumeSections: string[] = [];
    let previousVolumeSummary: string | undefined;
    
    let wasCancelled = false;
    
    for (let vol = 1; vol <= params.bookCount; vol++) {
      if (checkCancellation?.()) {
        console.log(`[SeriesGuideGenerator] Cancelled at volume ${vol}`);
        wasCancelled = true;
        break;
      }
      
      progress.currentVolume = vol;
      onProgress?.(progress);
      
      const volumeResponse = await this.generateVolumeMilestones({
        volumeNumber: vol,
        totalVolumes: params.bookCount,
        seriesTitle: params.seriesTitle,
        seriesBible: bibleResponse.content,
        genre: params.genre,
        tone: params.tone,
        previousVolumeSummary
      });
      
      if (volumeResponse.content && volumeResponse.content.length > 100) {
        volumeSections.push(volumeResponse.content);
        progress.completedVolumes.push(vol);
        
        const argMatch = volumeResponse.content.match(/\*\*Argumento:\*\*\s*([^\n]+(?:\n(?!\*\*)[^\n]+)*)/i);
        if (argMatch) {
          previousVolumeSummary = `Volumen ${vol}: ${argMatch[1].trim().substring(0, 500)}`;
        }
      } else {
        console.warn(`[SeriesGuideGenerator] Volume ${vol} generation failed, continuing...`);
      }
      
      onProgress?.(progress);
    }
    
    progress.phase = "complete";
    onProgress?.(progress);
    
    if (wasCancelled) {
      console.log(`[SeriesGuideGenerator] Generation was cancelled. Completed ${progress.completedVolumes.length}/${params.bookCount} volumes.`);
      return { 
        content: "", 
        error: `Generacion cancelada por el usuario. Se completaron ${progress.completedVolumes.length} de ${params.bookCount} volumenes.` 
      };
    }
    
    if (volumeSections.length < params.bookCount) {
      console.warn(`[SeriesGuideGenerator] Only ${volumeSections.length}/${params.bookCount} volumes generated successfully`);
    }
    
    let finalGuide = bibleResponse.content;
    
    if (volumeSections.length > 0) {
      const allHitos = volumeSections.map(s => {
        const hitosMatch = s.match(/## HITOS DEL VOLUMEN[\s\S]*?(?=## ARQUITECTURA|$)/i);
        return hitosMatch ? hitosMatch[0].trim() : "";
      }).filter(Boolean);
      
      const allArquitectura = volumeSections.map(s => {
        const arqMatch = s.match(/## ARQUITECTURA DEL VOLUMEN[\s\S]*/i);
        return arqMatch ? arqMatch[0].trim() : "";
      }).filter(Boolean);
      
      const hitosSection = `

## 7. HITOS DE LA SERIE (OBLIGATORIO)

Estos son los eventos clave que DEBEN cumplirse en cada novela para avanzar el hilo conductor:

${allHitos.join("\n\n")}

## 8. ARQUITECTURA DE LA SERIE

${allArquitectura.join("\n\n")}
`;

      const insertPoint = finalGuide.indexOf("## 9.");
      if (insertPoint > 0) {
        finalGuide = finalGuide.substring(0, insertPoint) + hitosSection + "\n\n" + finalGuide.substring(insertPoint);
      } else {
        finalGuide += hitosSection;
      }
    }
    
    console.log(`[SeriesGuideGenerator] Phased generation complete. Total: ${finalGuide.length} chars, ${volumeSections.length}/${params.bookCount} volumes`);
    
    return {
      content: finalGuide,
      tokenUsage: bibleResponse.tokenUsage
    };
  }

  async generateSeriesGuide(params: {
    concept: string;
    seriesTitle: string;
    genre: string;
    tone: string;
    bookCount: number;
    workType: "series" | "trilogy";
    pseudonymName?: string;
    pseudonymStyleGuide?: string;
  }): Promise<AgentResponse> {
    return this.generateSeriesGuidePhased(params);
  }
}

export const seriesGuideGeneratorAgent = new SeriesGuideGeneratorAgent();

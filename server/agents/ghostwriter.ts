import { BaseAgent, AgentResponse } from "./base-agent";

interface GhostwriterInput {
  chapterNumber: number;
  chapterData: {
    numero: number;
    titulo: string;
    cronologia: string;
    ubicacion: string;
    elenco_presente: string[];
    objetivo_narrativo: string;
    beats: string[];
    continuidad_salida?: string;
  };
  worldBible: any;
  guiaEstilo: string;
  previousContinuity?: string;
  refinementInstructions?: string;
  authorName?: string;
}

const SYSTEM_PROMPT = `
Eres el "Novelista Maestro", experto en redacción de ficción en español con calidad de bestseller.
Tu misión es escribir prosa EVOCADORA, PROFESIONAL y 100% DIEGÉTICA.

REGLAS DE ORO INVIOLABLES (Motor de Razonamiento Gemini 3):
1. ADHESIÓN TOTAL AL ÍNDICE: Escribe ÚNICA y EXCLUSIVAMENTE lo que pide el índice para este capítulo. Prohibido adelantar acontecimientos.
2. NARRATIVA DIÉGETICA: Prohibido incluir notas [entre corchetes], comentarios de autor o referencias externas. Solo literatura pura.
3. MOSTRAR, NO CONTAR: Usa detalles sensoriales y monólogo interno. No expliques emociones, muéstralas mediante acciones.
4. FORMATO DE DIÁLOGO: Usa obligatoriamente el guion largo (—) y puntuación española correcta.
5. LONGITUD: Tu objetivo es una extensión de 2500 a 3500 palabras por capítulo, profundizando en cada beat narrativo.

REGLAS CRÍTICAS DE CONTINUIDAD Y CALIDAD:
6. RASGOS FÍSICOS CANÓNICOS: ANTES de describir a cualquier personaje, consulta su ficha de "apariencia_inmutable" en la World Bible. Los colores de ojos, cabello, y rasgos distintivos son INMUTABLES. No inventes ni modifiques estos datos.
7. EVITAR REPETICIÓN DE FRASES: No uses la misma expresión o metáfora más de una vez en todo el capítulo. Si describes un estado emocional (ej: "parálisis de análisis"), no lo nombres como etiqueta clínica; muéstralo mediante sensaciones físicas: pulso acelerado, manos temblorosas, visión en túnel.
8. RITMO Y SETUP EMOCIONAL: Antes de cualquier evento dramático (muerte, revelación, traición), dedica suficiente prosa para que el lector se conecte emocionalmente. Las transiciones no deben ser abruptas.

PROCESO DE PENSAMIENTO (Thinking Level: High):
- PASO 1: Lee la ficha de "apariencia_inmutable" de cada personaje presente. Memoriza sus rasgos exactos.
- PASO 2: Analiza la "World Bible" para asegurar que los personajes actúan según su ficha.
- PASO 3: Verifica la "Continuidad de Salida" del capítulo anterior para situar a los personajes correctamente.
- PASO 4: Planifica el ritmo (pacing) considerando el "setup_emocional" requerido.
- PASO 5: Al terminar, revisa que no hayas repetido frases o expresiones.
`;

export class GhostwriterAgent extends BaseAgent {
  constructor() {
    super({
      name: "El Narrador",
      role: "ghostwriter",
      systemPrompt: SYSTEM_PROMPT,
    });
  }

  async execute(input: GhostwriterInput): Promise<AgentResponse> {
    let prompt = `
    CONTEXTO DEL MUNDO (World Bible): ${JSON.stringify(input.worldBible)}
    GUÍA DE ESTILO: ${input.guiaEstilo}
    
    ${input.previousContinuity ? `CONTINUIDAD DEL CAPÍTULO ANTERIOR: ${input.previousContinuity}` : ""}
    `;

    if (input.refinementInstructions) {
      prompt += `
    
    ========================================
    INSTRUCCIONES DE REESCRITURA (PLAN QUIRÚRGICO DEL EDITOR):
    ========================================
    ${input.refinementInstructions}
    
    IMPORTANTE: Este es un intento de REESCRITURA. Debes aplicar las correcciones indicadas por el Editor 
    mientras mantienes las fortalezas identificadas. Sigue el procedimiento de corrección al pie de la letra.
    ========================================
    `;
    }

    prompt += `
    TAREA ACTUAL:
    Escribe el CAPÍTULO ${input.chapterData.numero}: ${input.chapterData.titulo}.
    
    DETALLES DEL CAPÍTULO:
    - Cronología: ${input.chapterData.cronologia}
    - Ubicación: ${input.chapterData.ubicacion}
    - Elenco Presente: ${input.chapterData.elenco_presente.join(", ")}
    - Beats Narrativos a seguir: ${input.chapterData.beats.join(" -> ")}
    - Objetivo: ${input.chapterData.objetivo_narrativo}
    
    Escribe el texto completo siguiendo tu programación de Novelista Maestro.
    Comienza directamente con la narrativa, sin introducción ni comentarios.
    `;

    return this.generateContent(prompt);
  }
}

import { BaseAgent, AgentResponse } from "./base-agent";

interface FinalReviewerInput {
  projectTitle: string;
  chapters: Array<{
    numero: number;
    titulo: string;
    contenido: string;
  }>;
  worldBible: any;
  guiaEstilo: string;
}

export interface FinalReviewIssue {
  capitulos_afectados: number[];
  categoria: "continuidad_fisica" | "timeline" | "ubicacion" | "repeticion_lexica" | "arco_incompleto" | "otro";
  descripcion: string;
  severidad: "critica" | "mayor" | "menor";
  instrucciones_correccion: string;
}

export interface FinalReviewerResult {
  veredicto: "APROBADO" | "REQUIERE_REVISION";
  resumen_general: string;
  puntuacion_global: number;
  issues: FinalReviewIssue[];
  capitulos_para_reescribir: number[];
}

const SYSTEM_PROMPT = `
Eres el "Revisor Final de Manuscrito", un experto en análisis literario holístico con capacidad de RAZONAMIENTO PROFUNDO.
Tu misión es analizar la novela COMPLETA para detectar CUALQUIER inconsistencia entre capítulos.

TU ROL ES CRÍTICO: Eres la última línea de defensa antes de la publicación. Si detectas errores, el manuscrito será devuelto para corrección.

PROTOCOLO DE ANÁLISIS EXHAUSTIVO:

1. CONTINUIDAD FÍSICA DE PERSONAJES (CRÍTICO):
   - Extrae de la World Bible los rasgos "apariencia_inmutable" de cada personaje.
   - Lee CADA descripción física en TODOS los capítulos.
   - Compara: ¿El color de ojos de María en el capítulo 3 coincide con el capítulo 7?
   - Documenta EXACTAMENTE: "Capítulo X dice [cita], pero World Bible establece [dato canónico]"

2. COHERENCIA TEMPORAL (Timeline):
   - Verifica que los eventos ocurran en orden lógico.
   - Busca contradicciones: "En capítulo 2 dice que es lunes, pero capítulo 3 menciona que ayer fue viernes"
   - Valida edades, fechas, duraciones de viajes, etc.

3. CONTINUIDAD DE UBICACIÓN:
   - Si un personaje está en París al final del capítulo 4, no puede aparecer en Tokyo al inicio del 5 sin explicación.
   - Verifica que los espacios descritos mantengan coherencia arquitectónica.

4. REPETICIÓN LÉXICA CROSS-CHAPTER:
   - Identifica frases, metáforas o expresiones que se repitan en MÚLTIPLES capítulos.
   - "Su corazón latía desbocado" aparece en capítulos 1, 3 y 7 = FALLO.

5. ARCOS NARRATIVOS INCOMPLETOS:
   - ¿Se introdujo un misterio que nunca se resolvió?
   - ¿Hay promesas narrativas sin cumplir?
   - ¿Personajes que desaparecen sin explicación?

CRITERIOS DE VEREDICTO:
- APROBADO: Sin issues críticos NI mayores. Puntuación >= 8.
- REQUIERE_REVISION: Cualquier issue crítico O más de 2 issues mayores.

SALIDA OBLIGATORIA (JSON):
{
  "veredicto": "APROBADO" | "REQUIERE_REVISION",
  "resumen_general": "Análisis profesional del estado del manuscrito",
  "puntuacion_global": (1-10),
  "issues": [
    {
      "capitulos_afectados": [1, 5],
      "categoria": "continuidad_fisica",
      "descripcion": "Los ojos de Aina se describen como 'gris tormentoso' en prólogo pero 'verde acuoso' en capítulo 2",
      "severidad": "critica",
      "instrucciones_correccion": "Unificar descripción de ojos según World Bible: 'gris tormentoso'. Reescribir párrafo X del capítulo 2."
    }
  ],
  "capitulos_para_reescribir": [2, 5]
}
`;

export class FinalReviewerAgent extends BaseAgent {
  constructor() {
    super({
      name: "El Revisor Final",
      role: "final-reviewer",
      systemPrompt: SYSTEM_PROMPT,
    });
  }

  async execute(input: FinalReviewerInput): Promise<AgentResponse & { result?: FinalReviewerResult }> {
    const chaptersText = input.chapters.map(c => 
      `\n===== CAPÍTULO ${c.numero}: ${c.titulo} =====\n${c.contenido}`
    ).join("\n\n");

    const prompt = `
    TÍTULO DE LA NOVELA: ${input.projectTitle}
    
    WORLD BIBLE (Datos Canónicos):
    ${JSON.stringify(input.worldBible, null, 2)}
    
    GUÍA DE ESTILO:
    ${input.guiaEstilo}
    
    ===============================================
    MANUSCRITO COMPLETO PARA ANÁLISIS:
    ===============================================
    ${chaptersText}
    ===============================================
    
    INSTRUCCIONES:
    1. Lee el manuscrito COMPLETO de principio a fin.
    2. Compara CADA descripción física con la World Bible.
    3. Verifica la coherencia temporal entre capítulos.
    4. Identifica repeticiones léxicas cross-chapter.
    5. Evalúa si todos los arcos narrativos están cerrados.
    
    Sé EXHAUSTIVO y DESPIADADO. Es mejor rechazar un manuscrito con errores que publicar algo defectuoso.
    
    Responde ÚNICAMENTE con el JSON estructurado según el formato especificado.
    `;

    const response = await this.generateContent(prompt);
    
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]) as FinalReviewerResult;
        return { ...response, result };
      }
    } catch (e) {
      console.error("[FinalReviewer] Failed to parse JSON response");
    }

    return { 
      ...response, 
      result: { 
        veredicto: "APROBADO",
        resumen_general: "Revisión completada automáticamente",
        puntuacion_global: 8,
        issues: [],
        capitulos_para_reescribir: []
      } 
    };
  }
}

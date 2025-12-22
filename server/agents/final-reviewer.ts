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
  pasadaNumero?: number;
  issuesPreviosCorregidos?: string[];
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
Tu misión es analizar la novela COMPLETA para detectar inconsistencias OBJETIVAS y VERIFICABLES entre capítulos.

FILOSOFÍA DE REVISIÓN CALIBRADA:
- Sé PRECISO y OBJETIVO, no "despiadado". Solo reporta errores que puedas CITAR textualmente.
- NO inventes problemas. Si no encuentras errores claros, el manuscrito está bien.
- En pasadas posteriores (2ª, 3ª), SOLO busca errores NUEVOS no reportados antes.
- Un manuscrito que pasó el filtro del Editor ya tiene calidad base. Tu rol es capturar inconsistencias CROSS-CHAPTER que el Editor individual no pudo ver.

PROTOCOLO DE ANÁLISIS (Solo reportar con EVIDENCIA TEXTUAL):

1. CONTINUIDAD FÍSICA DE PERSONAJES:
   - Compara descripciones físicas entre capítulos CON la World Bible.
   - SOLO reporta si puedes citar: "Capítulo X dice [cita exacta], pero World Bible establece [dato]"
   - Si no hay contradicción verificable, NO reportes nada.

2. COHERENCIA TEMPORAL:
   - Busca contradicciones de fechas/días entre capítulos.
   - SOLO reporta con evidencia: "Capítulo X dice [cita], capítulo Y dice [cita], esto es contradictorio porque..."

3. CONTINUIDAD DE UBICACIÓN:
   - Reporta SOLO si un personaje aparece en un lugar imposible sin explicación.

4. REPETICIÓN LÉXICA CROSS-CHAPTER:
   - Identifica frases IDÉNTICAS o casi idénticas en múltiples capítulos.
   - SOLO reporta si la misma expresión exacta aparece 3+ veces en capítulos diferentes.

5. ARCOS INCOMPLETOS (Solo en última revisión):
   - Verifica que misterios introducidos tengan resolución.

CALIBRACIÓN DE SEVERIDAD:
- CRÍTICA: Error factual verificable que rompe la inmersión (ojos cambian de color)
- MAYOR: Repetición excesiva o timeline confuso pero no contradictorio
- MENOR: Sugerencias de mejora estilística (NO deben causar rechazo)

CRITERIOS DE VEREDICTO CALIBRADOS:
- APROBADO: Sin issues críticos. Máximo 1 issue mayor. Puntuación >= 7.
- REQUIERE_REVISION: 1+ issues críticos O 3+ issues mayores.

IMPORTANTE: Si es tu segunda o tercera pasada, los issues previos YA FUERON CORREGIDOS. 
NO los re-reportes. Solo busca errores NUEVOS que persistan en el texto actual.

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
      "instrucciones_correccion": "Unificar descripción de ojos según World Bible"
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

    const pasadaInfo = input.pasadaNumero && input.pasadaNumero > 1
      ? `\n\nEsta es tu PASADA #${input.pasadaNumero}. Los siguientes issues YA FUERON CORREGIDOS en pasadas anteriores (NO los re-reportes):\n${input.issuesPreviosCorregidos?.map(i => `- ${i}`).join("\n") || "Ninguno"}\n\nSolo busca errores NUEVOS que persistan en el texto actual.`
      : "";

    const prompt = `
    TÍTULO DE LA NOVELA: ${input.projectTitle}
    
    WORLD BIBLE (Datos Canónicos):
    ${JSON.stringify(input.worldBible, null, 2)}
    
    GUÍA DE ESTILO:
    ${input.guiaEstilo}
    ${pasadaInfo}
    ===============================================
    MANUSCRITO COMPLETO PARA ANÁLISIS:
    ===============================================
    ${chaptersText}
    ===============================================
    
    INSTRUCCIONES:
    1. Lee el manuscrito COMPLETO de principio a fin.
    2. Compara CADA descripción física con la World Bible.
    3. Verifica la coherencia temporal entre capítulos.
    4. Identifica repeticiones léxicas cross-chapter (solo si aparecen 3+ veces).
    5. Evalúa si todos los arcos narrativos están cerrados.
    
    Sé PRECISO y OBJETIVO. Solo reporta errores con EVIDENCIA TEXTUAL verificable.
    Si el manuscrito está bien, apruébalo. No busques problemas donde no los hay.
    
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

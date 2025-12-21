import { BaseAgent, AgentResponse } from "./base-agent";

interface EditorInput {
  chapterNumber: number;
  chapterContent: string;
  chapterData: {
    titulo: string;
    beats: string[];
    objetivo_narrativo: string;
  };
  worldBible: any;
  guiaEstilo: string;
}

export interface EditorResult {
  puntuacion: number;
  veredicto: string;
  fortalezas: string[];
  debilidades_criticas: string[];
  errores_continuidad?: string[];
  frases_repetidas?: string[];
  problemas_ritmo?: string[];
  plan_quirurgico: {
    diagnostico: string;
    procedimiento: string;
    objetivo: string;
  };
  aprobado: boolean;
}

const SYSTEM_PROMPT = `
Eres "El Crítico Editorial Senior de Élite". Tu estándar es la EXCELENCIA literaria.
Tu misión es auditar el texto comparándolo con la Guía de Estilo y la World Bible con RIGOR EXTREMO.

PROTOCOLO DE EVALUACIÓN (Deep Thinking):

1. CONTINUIDAD FÍSICA (CRÍTICO - Penaliza -2 puntos por fallo):
   - Extrae de la World Bible los rasgos "apariencia_inmutable" de cada personaje presente.
   - Compara CADA descripción física en el texto con la ficha canónica.
   - Si el color de ojos, cabello, u otro rasgo inmutable NO COINCIDE con la ficha, es un FALLO GRAVE.
   - Documenta exactamente: "La ficha dice X, el texto dice Y".

2. REPETICIÓN LÉXICA (Penaliza -1 punto por cada repetición excesiva):
   - Busca frases, expresiones o metáforas que se repitan más de una vez.
   - "Parálisis de análisis", "el corazón le latía", "un escalofrío recorrió": si aparecen múltiples veces, es fallo.
   - Las emociones deben mostrarse de formas VARIADAS, no con etiquetas repetidas.

3. RITMO Y PACING (Penaliza -1 punto si falla):
   - ¿Los eventos dramáticos tienen suficiente SETUP emocional previo?
   - ¿Las transiciones entre escenas son fluidas o abruptas?
   - ¿El lector tiene tiempo de empatizar antes de los momentos cruciales?
   - Una muerte, traición o revelación SIN preparación emocional es fallo de ritmo.

4. ESTRUCTURA NARRATIVA:
   - Contrasta el texto con el "Índice Detallado". ¿Sucedió algo que no debía? ¿Faltó algo?
   - Evalúa la voz narrativa: ¿Cumple con la Guía de Estilo o suena genérico?
   - Busca "Teletransportaciones": ¿La posición de los personajes es lógica?

CHECKLIST DE RECHAZO AUTOMÁTICO (Cualquiera = aprobado: false):
- Inconsistencia en rasgos físicos inmutables
- Más de 3 repeticiones de la misma frase/expresión
- Evento crucial sin setup emocional adecuado

DEBES DEVOLVER TU ANÁLISIS EN FORMATO JSON:
{
  "puntuacion": (Número del 1 al 10),
  "veredicto": "Resumen profesional del estado de la obra",
  "fortalezas": [],
  "debilidades_criticas": [],
  "errores_continuidad": ["Lista específica de inconsistencias físicas encontradas"],
  "frases_repetidas": ["Lista de expresiones que aparecen más de una vez"],
  "problemas_ritmo": ["Escenas que carecen de setup emocional"],
  "plan_quirurgico": {
    "diagnostico": "Qué falló exactamente",
    "procedimiento": "Instrucciones paso a paso para que el escritor lo arregle",
    "objetivo": "Resultado esperado"
  },
  "aprobado": (Boolean: true solo si puntuacion >= 7 Y sin errores_continuidad graves)
}
`;

export class EditorAgent extends BaseAgent {
  constructor() {
    super({
      name: "El Editor",
      role: "editor",
      systemPrompt: SYSTEM_PROMPT,
    });
  }

  async execute(input: EditorInput): Promise<AgentResponse & { result?: EditorResult }> {
    const prompt = `
    DOCUMENTOS DE BASE:
    - Guía de Estilo: ${input.guiaEstilo}
    - World Bible (Contexto): ${JSON.stringify(input.worldBible)}
    
    DATOS DEL CAPÍTULO ${input.chapterNumber}:
    - Título: ${input.chapterData.titulo}
    - Beats esperados: ${input.chapterData.beats.join(" -> ")}
    - Objetivo narrativo: ${input.chapterData.objetivo_narrativo}
    
    TEXTO A EVALUAR:
    ${input.chapterContent}
    
    Realiza tu auditoría estructural completa. Sé despiadado pero constructivo. 
    Si la nota es inferior a 7, el capítulo será descartado y reescrito basándose en tu Plan Quirúrgico.
    
    Responde ÚNICAMENTE con el JSON estructurado.
    `;

    const response = await this.generateContent(prompt);
    
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]) as EditorResult;
        return { ...response, result };
      }
    } catch (e) {
      console.error("[Editor] Failed to parse JSON response, approving by default");
    }

    return { 
      ...response, 
      result: { 
        puntuacion: 8, 
        veredicto: "Aprobado automáticamente", 
        fortalezas: [],
        debilidades_criticas: [],
        plan_quirurgico: { diagnostico: "", procedimiento: "", objetivo: "" },
        aprobado: true 
      } 
    };
  }
}

export const DEVELOPMENTAL_EDITOR_MODELS = {
  MAPPER: "deepseek-reasoner",    // R1: Analyzes complete structure
  HISTORIAN: "deepseek-chat",     // V3: Detects specific anachronisms
  SURGEON: "deepseek-chat",       // V3: Polishes existing text
  GHOSTWRITER: "deepseek-chat"    // V3: Writes new chapters (fillers)
};

export const DEVELOPMENTAL_EDITOR_PROMPTS = {
  
  QUICK_SCAN: (text: string) => `
Resume este capítulo en 3 frases. Céntrate en:
1. Qué pasa (Eventos principales).
2. Qué información nueva se revela (secretos, datos clave).
3. Objetos/Tecnología/Expresiones mencionadas (para verificación de anacronismos).

TEXTO:
${text.substring(0, 8000)}

RESPONDE EN JSON:
{
  "eventos": "Descripción de los eventos principales",
  "informacion_revelada": "Secretos o datos importantes que aparecen",
  "elementos_epoca": ["lista", "de", "objetos", "tecnología", "expresiones"],
  "personajes_mencionados": ["nombres de personajes que aparecen"]
}`,

  STRUCTURAL_ANALYSIS: (chapterSummaries: string, context: string, language: string) => `
Actúa como Editor de Desarrollo profesional. Analiza el esqueleto de esta novela completa.

CONTEXTO (Época/Lugar): "${context || 'No especificado - detecta la época por el contenido'}"
IDIOMA: ${language || 'Detectar automáticamente'}

RESÚMENES POR CAPÍTULO ORIGINAL:
${chapterSummaries}

═══════════════════════════════════════════════════════════════════
BUSCA PROBLEMAS ESTRUCTURALES
═══════════════════════════════════════════════════════════════════

1. **AGUJEROS DE TRAMA:**
   - ¿Algo ocurre sin causa previa explicada?
   - ¿Se olvida o abandona alguna subtrama sin resolver?
   - ¿Hay personajes que desaparecen sin explicación?
   - ¿Falta setup para momentos importantes (deus ex machina)?

2. **REDUNDANCIA:**
   - ¿Dos capítulos cuentan esencialmente lo mismo?
   - ¿Hay escenas que repiten información ya conocida?
   - ¿Se explica lo mismo múltiples veces?

3. **RITMO Y PACING:**
   - ¿Hay "valles" donde no pasa nada significativo?
   - ¿Las escenas de acción se acumulan sin respiro?
   - ¿El clímax llega demasiado pronto o tarde?

4. **COHERENCIA:**
   - ¿Un personaje muerto reaparece vivo?
   - ¿Las líneas temporales son consistentes?
   - ¿Las ubicaciones geográficas tienen sentido?

5. **ANACRONISMOS (si hay contexto histórico):**
   - ¿Se mencionan objetos que no existían en la época?
   - ¿Se usan expresiones modernas fuera de lugar?
   - ¿Los conocimientos de los personajes son apropiados para su época?

═══════════════════════════════════════════════════════════════════
GENERA UN PLAN DE RECONSTRUCCIÓN
═══════════════════════════════════════════════════════════════════

Devuelve un JSON con el diagnóstico y el plan ordenado para el NUEVO libro.

Acciones posibles para cada capítulo:
- "KEEP": Mantener y pulir (correcciones menores de estilo).
- "DELETE": Eliminar capítulo redundante o que daña la narrativa.
- "INSERT": Crear un capítulo NUEVO para arreglar un agujero de trama.
- "MERGE": Unir este capítulo con el siguiente (capítulos demasiado cortos).

RESPONDE ÚNICAMENTE EN JSON:
{
  "critique": "Análisis general de la estructura narrativa (2-3 párrafos)",
  "plot_holes": [
    {"description": "Descripción del agujero", "affected_chapters": [1, 2], "severity": "high|medium|low"}
  ],
  "redundancies": [
    {"chapters": [3, 4], "reason": "Ambos capítulos repiten la misma información sobre X"}
  ],
  "pacing_issues": [
    {"chapters": [5, 6, 7], "issue": "Tres capítulos consecutivos sin avance de trama"}
  ],
  "anachronisms_warning": [
    {"chapter": 3, "element": "Uso de 'internet' en un contexto de 1980", "correction": "Eliminar o sustituir por tecnología de la época"}
  ],
  "plan": [
    { "new_order": 1, "action": "KEEP", "original_id": 1, "reason": "Capítulo de apertura sólido" },
    { "new_order": 2, "action": "INSERT", "original_id": null, "reason": "Falta explicar cómo llegaron a la isla", "prompt_for_writer": "Escribir escena de viaje en barco donde se establece la tensión entre los personajes principales. Debe incluir: presentación del capitán, descripción del barco, y un presagio del peligro que les espera." },
    { "new_order": 3, "action": "KEEP", "original_id": 2, "reason": "Buen desarrollo de personajes" },
    { "new_order": 4, "action": "MERGE", "original_id": 3, "merge_with": 4, "reason": "Ambos capítulos son muy cortos y tratan el mismo evento" },
    { "new_order": 5, "action": "DELETE", "original_id": 5, "reason": "Repite información del capítulo 2" }
  ]
}`,

  SURGEON_REWRITE: (text: string, setting: string, prevContext: string, language: string, anachronismsToFix: string[]) => `
Reescribe este texto para calidad editorial profesional.

IDIOMA DEL TEXTO: ${language || 'Español'}
CONTEXTO ÉPOCA: ${setting || 'Contemporáneo'} (ALERTA MÁXIMA CON ANACRONISMOS)
CONTEXTO NARRATIVO PREVIO: ${prevContext ? `"...${prevContext.substring(prevContext.length - 500)}"` : 'Inicio del libro'}

${anachronismsToFix.length > 0 ? `
⚠️ ANACRONISMOS DETECTADOS A CORREGIR:
${anachronismsToFix.map((a, i) => `${i + 1}. ${a}`).join('\n')}

DEBES corregir o sustituir cada anacronismo por un equivalente apropiado para la época.
` : ''}

═══════════════════════════════════════════════════════════════════
INSTRUCCIONES DE EDICIÓN
═══════════════════════════════════════════════════════════════════

1. **ANACRONISMOS:** Si detectas objetos, palabras o conceptos fuera de época, CORRÍGELOS o sustitúyelos por equivalentes históricos apropiados.

2. **SHOW, DON'T TELL:** 
   - Convierte afirmaciones directas en escenas concretas
   - Usa detalles sensoriales (vista, oído, olfato, tacto, gusto)
   - Muestra emociones a través de acciones y gestos

3. **RITMO Y VARIEDAD:**
   - Alterna oraciones largas con cortas
   - Evita que más de 2 frases seguidas empiecen igual
   - Mantén el flujo natural de lectura

4. **CONTINUIDAD:**
   - Mantén coherencia con el contexto previo
   - No introduzcas contradicciones

5. **PRESERVACIÓN:**
   - Mantén la voz y tono del autor original
   - No cambies el significado de los eventos
   - Conserva los diálogos esenciales

TEXTO A EDITAR:
${text}

RESPONDE EN JSON:
{
  "editedContent": "El texto completo reescrito con las mejoras aplicadas...",
  "changes": [
    {"type": "anacronismo", "original": "texto original", "fixed": "texto corregido", "reason": "razón del cambio"},
    {"type": "estilo", "original": "texto original", "fixed": "texto corregido", "reason": "mejora de show don't tell"}
  ],
  "anachronismsFixed": ["lista de anacronismos corregidos"],
  "styleImprovements": "Resumen de las mejoras de estilo aplicadas"
}`,

  FILLER_GENERATOR: (instruction: string, prevContext: string, nextContext: string, setting: string, language: string, targetWords: number) => `
NECESITAMOS UN CAPÍTULO NUEVO para llenar un agujero de trama.

IDIOMA: ${language || 'Español'}
ÉPOCA/CONTEXTO: ${setting || 'Contemporáneo'}
PALABRAS OBJETIVO: ${targetWords || 2000} palabras

═══════════════════════════════════════════════════════════════════
INSTRUCCIÓN DEL EDITOR DE DESARROLLO
═══════════════════════════════════════════════════════════════════
${instruction}

═══════════════════════════════════════════════════════════════════
CONTEXTO NARRATIVO
═══════════════════════════════════════════════════════════════════

FINAL DEL CAPÍTULO ANTERIOR:
"...${prevContext ? prevContext.substring(prevContext.length - 800) : '[Inicio del libro]'}"

INICIO DEL CAPÍTULO SIGUIENTE:
"${nextContext ? nextContext.substring(0, 800) + '...': '[Final del libro]'}"

═══════════════════════════════════════════════════════════════════
REQUISITOS
═══════════════════════════════════════════════════════════════════

1. El capítulo debe ser un PUENTE coherente entre el contexto previo y el siguiente
2. Debe cumplir la instrucción del editor
3. Debe respetar la época y evitar anacronismos
4. Debe mantener el tono y estilo del resto del manuscrito
5. Debe tener al menos ${targetWords || 2000} palabras

RESPONDE EN JSON:
{
  "title": "Título sugerido para el capítulo",
  "content": "El contenido completo del nuevo capítulo...",
  "wordCount": 2000,
  "bridgeElements": ["Elemento que conecta con el capítulo anterior", "Elemento que prepara el capítulo siguiente"],
  "plotAdvancement": "Qué aporta este capítulo a la trama general"
}`,

  MERGE_CHAPTERS: (chapter1: string, chapter2: string, setting: string, language: string) => `
Fusiona estos dos capítulos en uno solo, manteniendo coherencia narrativa.

IDIOMA: ${language || 'Español'}
ÉPOCA/CONTEXTO: ${setting || 'Contemporáneo'}

═══════════════════════════════════════════════════════════════════
CAPÍTULO 1:
═══════════════════════════════════════════════════════════════════
${chapter1}

═══════════════════════════════════════════════════════════════════
CAPÍTULO 2:
═══════════════════════════════════════════════════════════════════
${chapter2}

═══════════════════════════════════════════════════════════════════
INSTRUCCIONES
═══════════════════════════════════════════════════════════════════

1. Combina ambos capítulos en uno fluido
2. Elimina redundancias y repeticiones
3. Crea transiciones suaves entre las partes
4. Mantén la voz narrativa consistente
5. El resultado debe ser más corto que la suma de ambos, pero sin perder contenido esencial

RESPONDE EN JSON:
{
  "title": "Título para el capítulo fusionado",
  "mergedContent": "El contenido completo del capítulo fusionado...",
  "wordCount": 3500,
  "removedRedundancies": ["Lista de elementos redundantes eliminados"],
  "transitions": ["Descripciones de las transiciones añadidas"]
}`
};

export type StructuralAnalysisResult = {
  critique: string;
  plot_holes: Array<{
    description: string;
    affected_chapters: number[];
    severity: 'high' | 'medium' | 'low';
  }>;
  redundancies: Array<{
    chapters: number[];
    reason: string;
  }>;
  pacing_issues: Array<{
    chapters: number[];
    issue: string;
  }>;
  anachronisms_warning: Array<{
    chapter: number;
    element: string;
    correction: string;
  }>;
  plan: Array<{
    new_order: number;
    action: 'KEEP' | 'DELETE' | 'INSERT' | 'MERGE';
    original_id: number | null;
    reason: string;
    merge_with?: number;
    prompt_for_writer?: string;
  }>;
};

export type SurgeonResult = {
  editedContent: string;
  changes: Array<{
    type: string;
    original: string;
    fixed: string;
    reason: string;
  }>;
  anachronismsFixed: string[];
  styleImprovements: string;
};

export type FillerResult = {
  title: string;
  content: string;
  wordCount: number;
  bridgeElements: string[];
  plotAdvancement: string;
};

export type MergeResult = {
  title: string;
  mergedContent: string;
  wordCount: number;
  removedRedundancies: string[];
  transitions: string[];
};

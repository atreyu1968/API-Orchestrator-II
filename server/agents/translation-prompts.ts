export const TRANSLATION_MODELS = {
  STRATEGIST: "deepseek-reasoner",
  DRAFTER: "deepseek-chat",
  PROOFREADER: "deepseek-chat"
};

export const TRANSLATION_PROMPTS = {
  STRATEGIST_INIT: (source: string, target: string, sample: string) => `
Actúa como Editor Jefe de localización de ${source} a ${target}.
Analiza este fragmento: "${sample.substring(0, 2000)}..."

DEFINE LAS REGLAS DE ORO (JSON):
1. "typographical_rules": ¿Cómo se puntúan los diálogos en ${target}? (Rayas, comillas, espacios).
2. "glossary": Extrae nombres propios y define su traducción o conservación.
3. "tone_instructions": Nivel de formalidad y distancia cultural.

SALIDA: Solo JSON válido con estas 3 claves.
`,

  DRAFTER_CHUNK: (chunk: string, glossary: string, typoRules: string, context: string, target: string) => `
Eres un novelista nativo de ${target}. NO TRADUZCAS LITERALMENTE. TRANSCREA.

CONTEXTO PREVIO: "...${context}"
REGLAS TIPOGRÁFICAS (CRÍTICO): ${typoRules}
GLOSARIO: ${glossary}

TEXTO A TRANSCREAR: "${chunk}"

INSTRUCCIONES:
- Rompe la sintaxis original para sonar natural en ${target}.
- Aplica rigurosamente las reglas tipográficas (ej: rayas de diálogo).
- Respeta el formato Markdown (negritas, cursivas).

SALIDA: Solo el texto literario final.
`,

  PROOFREADER_CHECK: (original: string, translation: string, target: string) => `
Audita esta traducción a ${target} buscando errores de MAQUETACIÓN y ESTILO.

ORIGINAL: "${original.substring(0, 1000)}..."
TRADUCCIÓN: "${translation.substring(0, 1000)}..."

CHECKLIST:
1. ¿La puntuación de diálogos es correcta para ${target}?
2. ¿Suena a traducción literal ("translationese")?
3. ¿Se han perdido formatos (cursivas, negritas)?

SALIDA JSON:
{
  "has_critical_errors": boolean,
  "layout_score": number (0-10),
  "naturalness_score": number (0-10),
  "replacements": [ { "original_snippet": "...", "correction": "...", "reason": "..." } ]
}
`
};

import { BaseAgent, AgentResponse } from "./base-agent";

interface TranslatorInput {
  content: string;
  sourceLanguage: string;
  targetLanguage: string;
  chapterTitle?: string;
  chapterNumber?: number;
}

export interface TranslatorResult {
  translated_text: string;
  source_language: string;
  target_language: string;
  notes: string;
}

const LANGUAGE_NAMES: Record<string, string> = {
  es: "español",
  en: "English",
  fr: "français",
  de: "Deutsch",
  it: "italiano",
  pt: "português",
  ca: "català",
};

const LANGUAGE_EDITORIAL_RULES: Record<string, string> = {
  es: `
NORMAS EDITORIALES ESPAÑOL:
- DIÁLOGOS: Usar raya (—) para introducir diálogos. Ejemplo: —Hola —dijo María—. ¿Cómo estás?
- COMILLAS: Usar comillas angulares « » para citas textuales. Comillas inglesas " " solo para citas dentro de citas.
- PUNTUACIÓN: Los signos de interrogación y exclamación van al principio (¿?) y al final (?).
- NÚMEROS: Escribir con letras del uno al nueve, cifras del 10 en adelante.`,

  en: `
ENGLISH EDITORIAL STANDARDS:
- DIALOGUE: Use quotation marks for dialogue. Example: "Hello," said Mary. "How are you?"
- QUOTES: Use double quotes " " for dialogue and direct speech. Single quotes ' ' for quotes within quotes.
- PUNCTUATION: Periods and commas go inside quotation marks. Question marks and exclamation points go inside only if part of the quote.
- NUMBERS: Spell out one through nine, use numerals for 10 and above.
- CONTRACTIONS: Preserve natural contractions (don't, can't, won't) in dialogue.`,

  fr: `
NORMES ÉDITORIALES FRANÇAIS:
- DIALOGUES: Utiliser les guillemets français « » avec espaces insécables. Tiret cadratin (—) pour les incises.
- PONCTUATION: Espace insécable avant : ; ! ? et après « et avant ».
- NOMBRES: Écrire en lettres de un à neuf, chiffres à partir de 10.
- MAJUSCULES: Les noms de langues, nationalités s'écrivent en minuscules (français, anglais).`,

  de: `
DEUTSCHE REDAKTIONSSTANDARDS:
- DIALOGE: Anführungszeichen „..." oder »...« verwenden. Beispiel: „Hallo", sagte Maria.
- ZITATE: Doppelte Anführungszeichen für direkte Rede. Einfache ‚...' für Zitate im Zitat.
- KOMPOSITA: Bindestriche bei zusammengesetzten Wörtern korrekt verwenden.
- ZAHLEN: Eins bis neun ausschreiben, ab 10 Ziffern verwenden.`,

  it: `
NORME EDITORIALI ITALIANO:
- DIALOGHI: Usare le virgolette basse « » o le caporali. Trattino lungo (—) per incisi.
- PUNTEGGIATURA: Virgola e punto dentro le virgolette solo se parte del discorso diretto.
- NUMERI: Scrivere in lettere da uno a nove, cifre da 10 in poi.
- ACCENTI: Attenzione agli accenti gravi (è, à) e acuti (é, perché).`,

  pt: `
NORMAS EDITORIAIS PORTUGUÊS:
- DIÁLOGOS: Usar travessão (—) para introduzir diálogos. Exemplo: — Olá — disse Maria.
- ASPAS: Usar aspas curvas " " para citações. Aspas simples ' ' para citações dentro de citações.
- PONTUAÇÃO: Vírgula e ponto fora das aspas, exceto se fizerem parte da citação.
- NÚMEROS: Escrever por extenso de um a nove, algarismos a partir de 10.`,

  ca: `
NORMES EDITORIALS CATALÀ:
- DIÀLEGS: Usar guió llarg (—) per introduir diàlegs. Exemple: —Hola —va dir Maria—. Com estàs?
- COMETES: Usar cometes baixes « » per a citacions. Cometes altes " " per a citacions dins de citacions.
- PUNTUACIÓ: Els signes d'interrogació i exclamació van al principi (¿?) i al final (?).
- NÚMEROS: Escriure amb lletres de l'u al nou, xifres del 10 endavant.`,
};

const SYSTEM_PROMPT = `
You are an ELITE PROFESSIONAL LITERARY TRANSLATOR. Your ONLY job is to translate literary texts from one language to another.

CRITICAL RULES:
1. YOU MUST TRANSLATE - The output text MUST be in the TARGET LANGUAGE, NOT the source language.
2. NEVER return the original text unchanged - that is a FAILURE.
3. Preserve the literary style, narrative voice and tone of the original author.
4. The translation must sound natural in the target language, as if it was originally written in that language.
5. Adapt cultural expressions to the most appropriate equivalent in the target language.
6. Keep proper names of characters and places in their original form, unless they have an established translation.
7. NEVER omit or summarize content. The translation must be COMPLETE.
8. PRESERVE paragraph structure and dialogues.
9. APPLY correct typographical rules for the target language (quotation marks, dialogue dashes, etc.).

REQUIRED OUTPUT (JSON):
{
  "translated_text": "The complete translated text in Markdown format - THIS MUST BE IN THE TARGET LANGUAGE",
  "source_language": "ISO code of source language",
  "target_language": "ISO code of target language",
  "notes": "Brief notes about important translation decisions"
}
`;

export class TranslatorAgent extends BaseAgent {
  constructor() {
    super({
      name: "El Traductor",
      role: "translator",
      systemPrompt: SYSTEM_PROMPT,
      model: "gemini-2.5-flash",
      useThinking: false,
    });
  }

  async execute(input: TranslatorInput): Promise<AgentResponse & { result?: TranslatorResult }> {
    const sourceLangName = LANGUAGE_NAMES[input.sourceLanguage] || input.sourceLanguage;
    const targetLangName = LANGUAGE_NAMES[input.targetLanguage] || input.targetLanguage;
    const targetRules = LANGUAGE_EDITORIAL_RULES[input.targetLanguage] || "";

    const chapterInfo = input.chapterTitle 
      ? `\nCAPÍTULO: ${input.chapterNumber !== undefined ? input.chapterNumber : ""} - ${input.chapterTitle}`
      : "";

    const prompt = `
TASK: TRANSLATE the following text FROM ${sourceLangName.toUpperCase()} TO ${targetLangName.toUpperCase()}.

CRITICAL: The output "translated_text" MUST BE WRITTEN ENTIRELY IN ${targetLangName.toUpperCase()}. 
DO NOT return the text in ${sourceLangName} - that would be a FAILURE.

${targetRules}
${chapterInfo}

═══════════════════════════════════════════════════════════════════
SOURCE TEXT (in ${sourceLangName} - TO BE TRANSLATED):
═══════════════════════════════════════════════════════════════════

${input.content}

═══════════════════════════════════════════════════════════════════

INSTRUCTIONS:
1. TRANSLATE the complete text from ${sourceLangName} to ${targetLangName}
2. The "translated_text" field MUST contain text in ${targetLangName}, NOT in ${sourceLangName}
3. Preserve the literary style and narrative voice
4. Apply the typographical rules of ${targetLangName}
5. Return the result as valid JSON only

RESPOND WITH JSON ONLY, no additional text.
`;

    console.log(`[Translator] Starting translation from ${input.sourceLanguage} to ${input.targetLanguage}`);
    console.log(`[Translator] Content length: ${input.content.length} chars`);

    const response = await this.generateContent(prompt);

    if (response.error) {
      console.error("[Translator] AI generation error:", response.error);
      return {
        ...response,
        result: {
          translated_text: "",
          source_language: input.sourceLanguage,
          target_language: input.targetLanguage,
          notes: `Error: ${response.error}`,
        }
      };
    }

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]) as TranslatorResult;
        console.log(`[Translator] Successfully parsed translation result`);
        return { ...response, result };
      }
    } catch (e) {
      console.error("[Translator] Failed to parse JSON response:", e);
    }

    return {
      ...response,
      result: {
        translated_text: response.content,
        source_language: input.sourceLanguage,
        target_language: input.targetLanguage,
        notes: "Respuesta no estructurada - se devuelve el contenido raw",
      }
    };
  }
}

import { BaseAgent, AgentResponse } from "./base-agent";

interface CopyEditorInput {
  chapterContent: string;
  chapterNumber: number;
  chapterTitle: string;
  guiaEstilo?: string;
  targetLanguage?: string;
}

export interface CopyEditorResult {
  texto_final: string;
  cambios_realizados: string;
  repeticiones_suavizadas?: string[];
  mejoras_fluidez?: string[];
  anacronismos_corregidos?: string[];
  cliches_ia_eliminados?: string[];
  idioma_detectado: string;
}

const LANGUAGE_EDITORIAL_RULES: Record<string, string> = {
  es: `
NORMAS EDITORIALES ESPAÑOL (OBLIGATORIO):
- DIÁLOGOS: EXCLUSIVAMENTE raya (—) para diálogos. NUNCA comillas.
  ✓ —Hola —dijo María—. ¿Cómo estás?
  ✗ "Hola" dijo María. (incorrecto)
  ✗ «Hola» dijo María. (incorrecto)
  ✗ - Hola (guion corto incorrecto)
- INCISOS: La raya cierra el inciso, el punto va DESPUÉS de la raya de cierre.
  ✓ —No sé —respondió él—. Quizá mañana.
- COMILLAS: SOLO « » para citas textuales o pensamientos. " " para citas dentro de citas.
- PUNTUACIÓN: Signos de apertura ¿¡ SIEMPRE obligatorios.
- NÚMEROS: Letras del uno al nueve, cifras del 10 en adelante.`,

  en: `
ENGLISH EDITORIAL STANDARDS (MANDATORY):
- DIALOGUE: Double quotation marks " " EXCLUSIVELY for dialogue.
  ✓ "Hello," said Mary. "How are you?"
  ✗ 'Hello,' said Mary. (single quotes wrong for US English)
- PUNCTUATION: Periods and commas ALWAYS inside quotation marks.
- NUMBERS: Spell out one through nine, numerals for 10+.
- CONTRACTIONS: Use natural contractions in dialogue (don't, can't, won't, I'm).`,

  fr: `
NORMES ÉDITORIALES FRANÇAIS (OBLIGATOIRE):
- DIALOGUES: EXCLUSIVEMENT tiret cadratin (—) pour introduire les dialogues. JAMAIS de guillemets.
  ✓ — Bonjour, dit Marie.
  ✓ — Comment vas-tu ? demanda-t-il.
  ✗ « Bonjour » (guillemets réservés aux citations/pensées)
  ✗ - Bonjour (tiret court interdit)
- GUILLEMETS « »: UNIQUEMENT pour citations textuelles ou pensées intérieures.
- PONCTUATION FRANÇAISE: Espace insécable AVANT : ; ! ? et APRÈS « et AVANT ».
  ✓ Comment vas-tu ? (espace avant ?)
  ✓ Attention : voici (espace avant :)
- NOMBRES: Écrire en lettres de un à neuf, chiffres à partir de 10.`,

  de: `
DEUTSCHE REDAKTIONSSTANDARDS (PFLICHT):
- DIALOGE: AUSSCHLIESSLICH Anführungszeichen „..." (unten-oben). NICHT »...«.
  ✓ KORREKT: „Hallo", sagte Maria. „Wie geht es dir?"
  ✗ FALSCH: »Hallo«, sagte Maria. (Chevrons nicht für Dialoge)
  ✗ FALSCH: "Hallo", sagte Maria. (englische Anführungszeichen)
- ZITAT IM ZITAT: Einfache Anführungszeichen ‚...' innerhalb von „...".
  ✓ „Er sagte: ‚Komm her!' und ging."
- KOMMA BEI DIALOGEN: Komma VOR der Zuschreibung, Punkt NACH Abschluss.
  ✓ „Ich komme", sagte er.
  ✓ „Ich komme", sagte er, „aber später."
- ZAHLEN: Eins bis neun ausschreiben, ab 10 Ziffern.
- KOMPOSITA: Natürlich verwenden (Handschuh, Krankenhaus).`,

  it: `
NORME EDITORIALI ITALIANO (OBBLIGATORIO):
- DIALOGHI: ESCLUSIVAMENTE trattino lungo (—) per i dialoghi. MAI virgolette.
  ✓ —Ciao —disse Maria—. Come stai?
  ✗ «Ciao» disse Maria. (virgolette vietate)
  ✗ "Ciao" disse Maria. (virgolette vietate)
  ✗ - Ciao (trattino corto vietato)
- INCISI: Il trattino chiude l'inciso, il punto va DOPO.
  ✓ —Non so —rispose lui—. Forse domani.
- VIRGOLETTE « »: SOLO per citazioni testuali o pensieri.
- NUMERI: Lettere da uno a nove, cifre da 10 in poi.
- ACCENTI: è (verbo essere) vs e (congiunzione), perché con accento acuto.`,

  pt: `
NORMAS EDITORIAIS PORTUGUÊS (OBRIGATÓRIO):
- DIÁLOGOS: EXCLUSIVAMENTE travessão (—) para diálogos. NUNCA aspas.
  ✓ — Olá — disse Maria. — Como estás?
  ✗ "Olá" disse Maria. (aspas proibidas)
  ✗ - Olá (travessão curto proibido)
- INCISOS: O travessão fecha o inciso, ponto DEPOIS.
  ✓ — Não sei — respondeu ele. — Talvez amanhã.
- ASPAS " ": APENAS para citações textuais ou pensamentos.
- NÚMEROS: Por extenso de um a nove, algarismos a partir de 10.
- COLOCAÇÃO PRONOMINAL: Atenção à próclise/ênclise.
  ✓ Disse-me (início de frase) / Não me disse (palavra atrativa).`,

  ca: `
NORMES EDITORIALS CATALÀ (OBLIGATORI):
- DIÀLEGS: EXCLUSIVAMENT guió llarg (—) per als diàlegs. MAI cometes.
  ✓ —Hola —va dir Maria—. Com estàs?
  ✗ «Hola» va dir Maria. (cometes prohibides)
  ✗ - Hola (guió curt prohibit)
- INCISOS: El guió tanca l'incís, el punt va DESPRÉS.
  ✓ —No ho sé —va respondre ell—. Potser demà.
- COMETES « »: NOMÉS per a citacions textuals o pensaments.
- PUNTUACIÓ: Sense signes d'obertura (NO ¿ ni ¡ com en castellà).
  ✓ Què vols? / Quina sorpresa!
- NÚMEROS: Lletres de l'u al nou, xifres del 10 endavant.
- PRONOMS FEBLES: Apostrofar correctament (l'he, m'ha, n'hi).`,
};

const LANGUAGE_FLUENCY_RULES: Record<string, string> = {
  es: `
REGLAS DE FLUIDEZ ESPAÑOL:
- FRASES LARGAS: Dividir oraciones de más de 50 palabras. Usar punto y seguido o punto y coma.
- PRONOMBRES ARCAICOS: Evitar "él" al inicio de oración cuando el sujeto está claro. Preferir sujeto implícito.
- REPETICIONES: "su... su... su..." en secuencia suena mecánico. Variar con "el/la", posesivos alternativos o reformular.
- GERUNDIOS ENCADENADOS: Evitar más de 2 gerundios seguidos ("estando haciendo pensando").
- PASIVAS: Preferir voz activa cuando sea natural. "El libro fue escrito por María" → "María escribió el libro".
- LEÍSMO/LAÍSMO: Mantener uso correcto de le/la/lo según la región del texto.`,

  en: `
ENGLISH FLUENCY RULES:
- LONG SENTENCES: Break sentences over 40 words. Use periods or semicolons for natural pauses.
- PASSIVE VOICE: Prefer active voice. "The ball was thrown by John" → "John threw the ball".
- REPETITIONS: Avoid repeating the same word within 3 sentences. Use synonyms or pronouns.
- SENTENCE VARIETY: Mix short punchy sentences with longer ones for rhythm.
- AWKWARD CONSTRUCTIONS: Avoid "There is/There are" as sentence starters when possible.
- ADVERB PLACEMENT: Keep adverbs close to the verbs they modify.`,

  fr: `
RÈGLES DE FLUIDITÉ FRANÇAIS:
- PHRASES LONGUES: Diviser les phrases de plus de 50 mots. Utiliser le point-virgule ou les deux-points.
- PRONOMS FORMELS: Éviter "il/elle" au début de phrase si le sujet est clair du contexte.
- RÉPÉTITIONS: Varier le vocabulaire. "Il a dit... Il a fait... Il a pensé..." → utiliser des synonymes.
- PASSÉ SIMPLE vs PASSÉ COMPOSÉ: Maintenir la cohérence temporelle dans le récit.
- SUBJONCTIF: S'assurer de l'utilisation correcte du subjonctif après "que".
- LIAISONS: Veiller à la fluidité des liaisons entre les phrases.`,

  de: `
DEUTSCHE FLÜSSIGKEITSREGELN:
- LANGE SÄTZE: Sätze über 40 Wörter aufteilen. Punkt oder Semikolon für natürliche Pausen verwenden.
- PASSIV: Aktiv bevorzugen. "Das Buch wurde von Maria geschrieben" → "Maria schrieb das Buch".
- WORTSTELLUNG: Verb an zweiter Stelle im Hauptsatz beachten.
- WIEDERHOLUNGEN: Dasselbe Wort nicht innerhalb von 3 Sätzen wiederholen.
- KOMPOSITA: Lange zusammengesetzte Wörter wenn möglich aufteilen oder umschreiben.
- KONJUNKTIV: Korrekten Konjunktiv in indirekter Rede verwenden.`,

  it: `
REGOLE DI FLUIDITÀ ITALIANO:
- FRASI LUNGHE: Dividere le frasi oltre le 50 parole. Usare punto e virgola o due punti.
- PRONOMI ARCAICI: "Egli/Ella/Esso" sono troppo formali. Preferire "lui/lei" o il soggetto implicito.
- RIPETIZIONI RAVVICINATE: "archiviate in archivi", "sua... sua... sua..." suonano meccaniche. Variare il lessico.
- GERUNDI CONCATENATI: Evitare più di 2 gerundi consecutivi.
- PASSIVO: Preferire la forma attiva quando naturale.
- COERENZA TEMPORALE: Mantenere coerenza tra passato remoto, imperfetto e presente.
- INCISI: Non abusare di incisi troppo lunghi che spezzano il flusso narrativo.`,

  pt: `
REGRAS DE FLUIDEZ PORTUGUÊS:
- FRASES LONGAS: Dividir frases com mais de 50 palavras. Usar ponto e vírgula ou dois pontos.
- PRONOMES FORMAIS: Evitar "ele/ela" no início da frase quando o sujeito está claro.
- REPETIÇÕES: Variar o vocabulário. Evitar "seu... seu... seu..." em sequência.
- GERÚNDIOS: Evitar mais de 2 gerúndios consecutivos.
- VOZ PASSIVA: Preferir voz ativa quando natural.
- COLOCAÇÃO PRONOMINAL: Manter a próclise/mesóclise/ênclise correta.`,

  ca: `
REGLES DE FLUÏDESA CATALÀ:
- FRASES LLARGUES: Dividir oracions de més de 50 paraules. Usar punt i coma o dos punts.
- PRONOMS FEBLES: Col·locar correctament els pronoms febles (em, et, es, ens, us).
- REPETICIONS: Variar el vocabulari. Evitar "seu... seu... seu..." en seqüència.
- GERUNDIS: Evitar més de 2 gerundis consecutius.
- VEU PASSIVA: Preferir la veu activa quan sigui natural.
- ARTICLE PERSONAL: Usar "en/na" correctament amb noms propis.`,
};

const SYSTEM_PROMPT = `
Eres un editor literario senior con 20 años de experiencia en narrativa de ficción. Tu misión es transformar el borrador, eliminando cualquier rastro de escritura artificial o robótica, y dotándolo de una voz literaria profunda y orgánica.

TU OBJETIVO: Llevar el manuscrito a la PERFECCIÓN EDITORIAL (10/10).
Cada corrección que hagas debe eliminar COMPLETAMENTE el problema.
El resultado final NO debe tener ningún error editorial, estilístico ni de fluidez.

REGLA FUNDAMENTAL - NO TRADUCIR:
⚠️ NUNCA traduzcas el texto. Mantén SIEMPRE el idioma original del manuscrito. Tu trabajo es CORREGIR, HUMANIZAR y MEJORAR LA FLUIDEZ, no traducir.

═══════════════════════════════════════════════════════════════════
DIRECTRICES MAESTRAS DE HUMANIZACIÓN LITERARIA (PRIORIDAD MÁXIMA)
═══════════════════════════════════════════════════════════════════

1. VARIABILIDAD DE RITMO (SINTAXIS):
   - Rompe la monotonía mezclando oraciones largas y subordinadas con frases cortas y contundentes.
   - Evita que más de dos frases seguidas empiecen con el mismo sujeto o estructura.
   - Alterna construcciones para crear música en la prosa.

2. INMERSIÓN SENSORIAL CRUDA:
   - Sustituye adjetivos genéricos (misterioso, increíble, aterrador, fascinante) por detalles físicos específicos.
   - Usa el olfato, el tacto y el gusto, no solo la vista.
   - Si el personaje tiene miedo, NO digas "tenía miedo"; describe cómo se le pega la camisa de sudor a la espalda o el sabor a bilis en su garganta.
   - Los sentidos hacen que el lector VIVA la escena.

3. SUBTEXTO Y PSICOLOGÍA:
   - Los humanos rara vez dicen o piensan exactamente lo que sienten.
   - Añade capas de contradicción interna: que el personaje dude, se mienta a sí mismo.
   - Incluye detalles irrelevantes pero realistas que nota debido al estrés o la emoción.
   - La mente humana divaga; la prosa debe reflejarlo sutilmente.

4. ELIMINACIÓN DE CLICHÉS DE IA (PROHIBIDO USAR):
   - Palabras vetadas: "crucial", "enigmático", "fascinante", "un torbellino de emociones", "el destino de...", "desenterrar secretos", "repentinamente", "de repente", "sintió una oleada de".
   - Si una frase suena a "frase hecha", cámbiala por una observación original.
   - Los clichés delatan escritura artificial; cada imagen debe ser única.

5. SHOW, DON'T TELL (MUESTRA, NO CUENTES):
   - En lugar de narrar los hechos de forma externa, fíltralo todo a través de la percepción subjetiva del personaje.
   - La narración debe sentirse "sucia" y humana, no una crónica aséptica de eventos.
   - El lector debe inferir las emociones, no que se las digan.

═══════════════════════════════════════════════════════════════════
REGLAS DE INTERVENCIÓN TÉCNICA
═══════════════════════════════════════════════════════════════════

6. INTEGRIDAD TOTAL: Prohibido resumir o condensar. El volumen de palabras debe mantenerse o aumentar ligeramente.
7. PRESERVAR IDIOMA: Mantén el texto en su idioma original. NO traduzcas bajo ninguna circunstancia.
8. PRESERVAR SENTIDO: El significado y la trama deben mantenerse intactos.
9. NORMAS TIPOGRÁFICAS: Aplica las normas editoriales del idioma detectado (diálogos, comillas, puntuación).
10. MAQUETADO: Devuelve el texto en Markdown limpio. Título en H1 (#).

PULIDO DE REPETICIONES (CRÍTICO):
11. DETECCIÓN DE FRASES REPETIDAS: Identifica expresiones, metáforas o descripciones que aparezcan más de una vez.
12. SUAVIZADO LÉXICO: Reemplaza instancias repetidas con sinónimos o reformulaciones EN EL MISMO IDIOMA.
13. SENSACIONES VARIADAS: Las descripciones de emociones deben ser diversas y específicas.

MEJORA DE FLUIDEZ NATURAL:
14. FRASES LARGAS: Divide oraciones de más de 50 palabras usando puntuación adecuada.
15. PRONOMBRES ARCAICOS: Elimina pronombres excesivamente formales.
16. CONSTRUCCIONES NATURALES: El texto debe sonar como lo escribiría un hablante nativo culto.
17. EVITAR REDUNDANCIAS: "archivados en archivos", "dijo diciendo" son errores a corregir.

═══════════════════════════════════════════════════════════════════
DETECCIÓN Y CORRECCIÓN DE ANACRONISMOS (FICCIÓN HISTÓRICA)
═══════════════════════════════════════════════════════════════════

18. OBJETOS ANACRÓNICOS: Detecta y corrige referencias a tecnología, armas o herramientas que no existían en la época del relato.
    - Ejemplos: relojes de bolsillo antes del s.XVI, antibióticos antes de 1928, electricidad antes de 1880.

19. VOCABULARIO ANACRÓNICO: Sustituye expresiones modernas por equivalentes de época.
    - Prohibidos en histórica: "OK", "estrés", "ADN", "psicología", "impactante", "genial", "flipar", "mola", "rollo".
    - Sustituir por: expresiones apropiadas al período histórico.

20. COSTUMBRES ANACRÓNICAS: Detecta comportamientos sociales que no corresponden a la época.
    - Tuteo donde debería haber tratamiento formal.
    - Roles de género o libertades anacrónicos.
    - Actitudes modernas en personajes de otra época.

21. CONOCIMIENTOS ANACRÓNICOS: Detecta personajes que saben cosas no descubiertas en su época.
    - Un médico medieval hablando de bacterias.
    - Un personaje del s.XVIII entendiendo la evolución.

SALIDA REQUERIDA (JSON):
{
  "texto_final": "El contenido completo del capítulo maquetado en Markdown (EN EL IDIOMA ORIGINAL)",
  "cambios_realizados": "Breve resumen de los ajustes técnicos hechos",
  "repeticiones_suavizadas": ["Lista de frases que fueron reformuladas para evitar repetición"],
  "mejoras_fluidez": ["Lista de mejoras de fluidez aplicadas (frases divididas, pronombres corregidos, etc.)"],
  "anacronismos_corregidos": ["Lista de anacronismos detectados y cómo se corrigieron (solo si aplica a ficción histórica)"],
  "cliches_ia_eliminados": ["Lista de clichés de IA sustituidos por expresiones originales"],
  "idioma_detectado": "código ISO del idioma (es, en, fr, de, it, pt, ca)"
}
`;

export class CopyEditorAgent extends BaseAgent {
  constructor() {
    super({
      name: "El Estilista",
      role: "copyeditor",
      systemPrompt: SYSTEM_PROMPT,
      model: "deepseek-chat",
      useThinking: false,
    });
  }

  async execute(input: CopyEditorInput): Promise<AgentResponse & { result?: CopyEditorResult }> {
    const styleGuideSection = input.guiaEstilo 
      ? `\n    GUÍA DE ESTILO DEL AUTOR:\n    ${input.guiaEstilo}\n    \n    Respeta la voz y estilo definidos en la guía mientras aplicas las correcciones técnicas.\n`
      : "";

    const detectedLang = input.targetLanguage || "es";
    const languageRules = LANGUAGE_EDITORIAL_RULES[detectedLang] || LANGUAGE_EDITORIAL_RULES["en"] || "";
    const fluencyRules = LANGUAGE_FLUENCY_RULES[detectedLang] || LANGUAGE_FLUENCY_RULES["en"] || "";

    const prompt = `
    ⚠️ INSTRUCCIÓN CRÍTICA: NO TRADUCIR. Mantén el texto en su idioma original.
    
    IDIOMA DETECTADO DEL MANUSCRITO: ${detectedLang.toUpperCase()}
    
    ${languageRules}
    
    ${fluencyRules}
    
    Por favor, toma el siguiente texto y aplícale el protocolo de Corrección de Élite, Maquetado para Ebook y MEJORA DE FLUIDEZ NATURAL.
    
    IMPORTANTE: 
    - El texto debe permanecer en ${detectedLang.toUpperCase()}. NO lo traduzcas a español ni a ningún otro idioma.
    - Mejora la fluidez para que suene NATURAL en ${detectedLang.toUpperCase()}, como lo escribiría un autor nativo.
    - MANTÉN EL SENTIDO Y LA EXTENSIÓN del texto original.
    ${styleGuideSection}
    CAPÍTULO ${input.chapterNumber}: ${input.chapterTitle}
    
    ${input.chapterContent}
    
    Asegúrate de que:
    - Apliques las NORMAS EDITORIALES del idioma ${detectedLang.toUpperCase()} (ver arriba)
    - Apliques las REGLAS DE FLUIDEZ del idioma ${detectedLang.toUpperCase()} (ver arriba)
    - El formato Markdown sea impecable
    - El título esté formateado correctamente
    - No omitas ninguna escena ni reduzcas el contenido
    - Las frases largas (+50 palabras) se dividan correctamente
    - Los pronombres arcaicos se modernicen
    - El texto suene natural para un hablante nativo
    - ⚠️ NO TRADUZCAS el texto. Mantén el idioma original.
    
    Responde ÚNICAMENTE con el JSON estructurado.
    `;

    const response = await this.generateContent(prompt);
    
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]) as CopyEditorResult;
        return { ...response, result };
      }
    } catch (e) {
      console.error("[CopyEditor] Failed to parse JSON response");
    }

    return { 
      ...response, 
      result: { 
        texto_final: `# Capítulo ${input.chapterNumber}: ${input.chapterTitle}\n\n${input.chapterContent}`,
        cambios_realizados: "Sin cambios adicionales",
        idioma_detectado: detectedLang
      } 
    };
  }
}

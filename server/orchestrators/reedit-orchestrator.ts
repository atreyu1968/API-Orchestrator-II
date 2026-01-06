import { storage } from "../storage";
import { BaseAgent } from "../agents/base-agent";
import type { ReeditProject, ReeditChapter } from "@shared/schema";

interface StructureAnalysis {
  hasIssues: boolean;
  duplicateChapters: Array<{ chapterId: number; duplicateOf: number; similarity: number }>;
  outOfOrderChapters: Array<{ chapterNumber: number; suggestedPosition: number; reason: string }>;
  missingChapters: number[];
  recommendations: string[];
}

interface ReeditProgress {
  projectId: number;
  stage: string;
  currentChapter: number;
  totalChapters: number;
  message: string;
}

type ProgressCallback = (progress: ReeditProgress) => void;

class ReeditEditorAgent extends BaseAgent {
  constructor() {
    super({
      name: "Reedit Editor",
      role: "editor",
      systemPrompt: `You are a professional literary editor reviewing manuscript chapters for quality.
Analyze the chapter and provide structured feedback in JSON format.

Your evaluation should include:
1. Overall quality score (1-10)
2. Narrative issues (plot holes, pacing problems, unclear passages)
3. Strengths of the writing
4. Specific suggestions for improvement

RESPOND WITH JSON ONLY:
{
  "score": 8,
  "issues": ["Issue 1", "Issue 2"],
  "strengths": ["Strength 1", "Strength 2"],
  "suggestions": ["Suggestion 1"],
  "pacingNotes": "Notes about pacing"
}`,
      model: "gemini-2.5-flash",
      useThinking: false,
    });
  }

  async execute(input: any): Promise<any> {
    return this.reviewChapter(input.content, input.chapterNumber, input.language);
  }

  async reviewChapter(content: string, chapterNumber: number, language: string): Promise<any> {
    const prompt = `Review this chapter (Chapter ${chapterNumber}) written in ${language}:

${content.substring(0, 15000)}

Provide your evaluation in JSON format.`;
    
    const response = await this.generateContent(prompt);
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error("[ReeditEditor] Failed to parse response:", e);
    }
    return { score: 7, issues: [], strengths: [], suggestions: [] };
  }
}

class ReeditCopyEditorAgent extends BaseAgent {
  constructor() {
    super({
      name: "Reedit CopyEditor",
      role: "copyeditor",
      systemPrompt: `You are a professional copy editor improving manuscript text for fluency and naturalness.

LANGUAGE-SPECIFIC FLUENCY RULES:
- ITALIAN: NEVER use "Egli/Ella/Esso/Essa" - use proper names or lui/lei/loro
- ALL LANGUAGES: Maximum 45 words per sentence. Break longer sentences.
- Avoid word repetition in consecutive sentences
- Prefer active voice over passive
- Maintain consistent narrative voice

Return the improved text and a log of changes made.

RESPOND WITH JSON ONLY:
{
  "editedContent": "The full improved text...",
  "changesLog": "Summary of changes made",
  "fluencyChanges": [{"before": "old", "after": "new", "reason": "why"}]
}`,
      model: "gemini-2.5-flash",
      useThinking: false,
    });
  }

  async execute(input: any): Promise<any> {
    return this.editChapter(input.content, input.chapterNumber, input.language);
  }

  async editChapter(content: string, chapterNumber: number, language: string): Promise<any> {
    const languageRules = this.getLanguageRules(language);
    
    const prompt = `Edit this chapter (Chapter ${chapterNumber}) for fluency and naturalness.

LANGUAGE: ${language}
${languageRules}

CHAPTER CONTENT:
${content}

Improve the text following the fluency rules. Return the COMPLETE edited chapter.
RESPOND WITH JSON ONLY.`;
    
    const response = await this.generateContent(prompt);
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error("[ReeditCopyEditor] Failed to parse response:", e);
    }
    return { editedContent: content, changesLog: "No changes", fluencyChanges: [] };
  }

  private getLanguageRules(lang: string): string {
    const rules: Record<string, string> = {
      it: `ITALIAN RULES:
- NEVER use archaic pronouns: Egli, Ella, Esso, Essa, Essi, Esse
- Use proper names or modern pronouns: lui, lei, loro
- Max 45 words per sentence
- No lexical repetition in consecutive sentences`,
      es: `SPANISH RULES:
- Limit gerunds to one per sentence
- Avoid excessive passive voice
- Watch for leísmo (use "lo" not "le" for direct object)
- Max 45 words per sentence`,
      en: `ENGLISH RULES:
- Prefer active voice
- Vary sentence length for rhythm
- Use natural contractions in dialogue
- Max 40 words per sentence`,
      fr: `FRENCH RULES:
- Use passé simple for literary narration
- Avoid anglicisms
- Max 45 words per sentence`,
      de: `GERMAN RULES:
- Natural word order
- Use Modalpartikeln in dialogue
- Max 45 words per sentence`,
      pt: `PORTUGUESE RULES:
- Correct pronoun placement
- Limit gerunds
- Max 45 words per sentence`,
      ca: `CATALAN RULES:
- Avoid castellanisms
- Correct weak pronoun usage
- Max 45 words per sentence`,
    };
    return rules[lang] || rules.es;
  }
}

// QA Agent 1: Continuity Sentinel - runs every 5 chapters
class ContinuitySentinelAgent extends BaseAgent {
  constructor() {
    super({
      name: "Continuity Sentinel",
      role: "qa_continuity",
      systemPrompt: `Eres un experto en continuidad narrativa. Tu trabajo es detectar errores de continuidad en bloques de capítulos.

TIPOS DE ERRORES A DETECTAR:
1. TEMPORALES: Inconsistencias en el paso del tiempo (ej: "amaneció" pero luego "la luna brillaba")
2. ESPACIALES: Personajes que aparecen en lugares imposibles sin transición
3. DE ESTADO: Objetos/personajes que cambian estado sin explicación (heridas que desaparecen, ropa que cambia)
4. DE CONOCIMIENTO: Personajes que saben cosas que no deberían saber aún

RESPONDE SOLO EN JSON:
{
  "erroresContinuidad": [
    {
      "tipo": "temporal|espacial|estado|conocimiento",
      "severidad": "critica|mayor|menor",
      "capitulo": 5,
      "descripcion": "Descripción del error",
      "contexto": "Fragmento relevante del texto",
      "correccion": "Sugerencia de corrección"
    }
  ],
  "resumen": "Resumen general de la continuidad",
  "puntuacion": 8
}`,
      model: "gemini-2.5-flash",
      useThinking: false,
    });
  }

  async execute(input: any): Promise<any> {
    return this.auditContinuity(input.chapters, input.startChapter, input.endChapter);
  }

  async auditContinuity(chapterContents: string[], startChapter: number, endChapter: number): Promise<any> {
    const combinedContent = chapterContents.map((c, i) => 
      `=== CAPÍTULO ${startChapter + i} ===\n${c.substring(0, 8000)}`
    ).join("\n\n");

    const prompt = `Analiza la continuidad narrativa de los capítulos ${startChapter} a ${endChapter}:

${combinedContent}

Detecta errores de continuidad temporal, espacial, de estado y de conocimiento. RESPONDE EN JSON.`;

    const response = await this.generateContent(prompt);
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error("[ContinuitySentinel] Failed to parse:", e);
    }
    return { erroresContinuidad: [], resumen: "Sin problemas detectados", puntuacion: 9 };
  }
}

// QA Agent 2: Voice & Rhythm Auditor - runs every 10 chapters
class VoiceRhythmAuditorAgent extends BaseAgent {
  constructor() {
    super({
      name: "Voice Rhythm Auditor",
      role: "qa_voice",
      systemPrompt: `Eres un experto en voz narrativa y ritmo literario. Analizas consistencia tonal y ritmo.

ASPECTOS A EVALUAR:
1. CONSISTENCIA DE VOZ: ¿El narrador mantiene su tono? ¿Los personajes hablan de forma consistente?
2. RITMO NARRATIVO: ¿Hay secciones demasiado lentas o apresuradas?
3. CADENCIA: ¿La longitud de oraciones varía apropiadamente?
4. TENSIÓN: ¿La tensión narrativa escala correctamente?

RESPONDE SOLO EN JSON:
{
  "problemasTono": [
    {
      "tipo": "voz_inconsistente|ritmo_lento|ritmo_apresurado|cadencia_monotona|tension_plana",
      "severidad": "mayor|menor",
      "capitulos": [5, 6],
      "descripcion": "Descripción del problema",
      "ejemplo": "Fragmento de ejemplo",
      "correccion": "Sugerencia"
    }
  ],
  "analisisRitmo": {
    "capitulLentos": [],
    "capitulosApresurados": [],
    "climaxBienMedidos": true
  },
  "puntuacion": 8
}`,
      model: "gemini-2.5-flash",
      useThinking: false,
    });
  }

  async execute(input: any): Promise<any> {
    return this.auditVoiceRhythm(input.chapters, input.startChapter, input.endChapter);
  }

  async auditVoiceRhythm(chapterContents: string[], startChapter: number, endChapter: number): Promise<any> {
    const combinedContent = chapterContents.map((c, i) => 
      `=== CAPÍTULO ${startChapter + i} ===\n${c.substring(0, 6000)}`
    ).join("\n\n");

    const prompt = `Analiza la voz narrativa y el ritmo de los capítulos ${startChapter} a ${endChapter}:

${combinedContent}

Evalúa consistencia de voz, ritmo y tensión narrativa. RESPONDE EN JSON.`;

    const response = await this.generateContent(prompt);
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error("[VoiceRhythmAuditor] Failed to parse:", e);
    }
    return { problemasTono: [], analisisRitmo: {}, puntuacion: 9 };
  }
}

// QA Agent 3: Semantic Repetition Detector - runs on full manuscript
class SemanticRepetitionDetectorAgent extends BaseAgent {
  constructor() {
    super({
      name: "Semantic Repetition Detector",
      role: "qa_semantic",
      systemPrompt: `Eres un experto en análisis semántico literario. Detectas repeticiones de ideas y verificas foreshadowing.

ASPECTOS A DETECTAR:
1. REPETICIÓN DE IDEAS: Conceptos, metáforas o descripciones que se repiten demasiado
2. FRASES REPETIDAS: Muletillas del autor, descripciones idénticas
3. FORESHADOWING SIN RESOLVER: Anticipaciones que nunca se cumplen
4. CHEKOV'S GUN: Elementos introducidos que nunca se usan

RESPONDE SOLO EN JSON:
{
  "repeticionesSemanticas": [
    {
      "tipo": "idea_repetida|frase_repetida|foreshadowing_sin_resolver|elemento_sin_usar",
      "severidad": "mayor|menor",
      "ocurrencias": [1, 5, 12],
      "descripcion": "Qué se repite",
      "ejemplo": "Fragmento de ejemplo",
      "accion": "eliminar|variar|resolver"
    }
  ],
  "foreshadowingTracking": [
    {"plantado": 3, "resuelto": 25, "elemento": "La carta misteriosa"}
  ],
  "puntuacion": 8
}`,
      model: "gemini-2.5-flash",
      useThinking: false,
    });
  }

  async execute(input: any): Promise<any> {
    return this.detectRepetitions(input.summaries, input.totalChapters);
  }

  async detectRepetitions(chapterSummaries: string[], totalChapters: number): Promise<any> {
    const prompt = `Analiza el manuscrito completo (${totalChapters} capítulos) buscando repeticiones semánticas:

RESÚMENES DE CAPÍTULOS:
${chapterSummaries.join("\n\n")}

Detecta ideas repetidas, frases recurrentes, foreshadowing sin resolver y elementos sin usar. RESPONDE EN JSON.`;

    const response = await this.generateContent(prompt);
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error("[SemanticRepetitionDetector] Failed to parse:", e);
    }
    return { repeticionesSemanticas: [], foreshadowingTracking: [], puntuacion: 9 };
  }
}

// QA Agent 4: Anachronism Detector - detects historical inaccuracies
class AnachronismDetectorAgent extends BaseAgent {
  constructor() {
    super({
      name: "Anachronism Detector",
      role: "qa_anachronism",
      systemPrompt: `Eres un experto historiador y consultor literario. Tu trabajo es detectar anacronismos en novelas históricas.

TIPOS DE ANACRONISMOS:
1. TECNOLÓGICOS: Tecnología que no existía en la época
2. LINGÜÍSTICOS: Expresiones, palabras o modismos que no existían
3. SOCIALES: Comportamientos o costumbres inapropiados para la época
4. MATERIALES: Objetos, materiales, alimentos que no existían
5. CONCEPTUALES: Ideas o conceptos que no existían (ej: "estrés" en Roma antigua)

RESPONDE SOLO EN JSON:
{
  "epocaDetectada": "Roma Imperial, siglo I d.C.",
  "anacronismos": [
    {
      "tipo": "tecnologico|linguistico|social|material|conceptual",
      "severidad": "critica|mayor|menor",
      "capitulo": 5,
      "fragmento": "El texto problemático",
      "problema": "Explicación del anacronismo",
      "correccion": "Alternativa históricamente correcta",
      "fuente": "Referencia histórica si aplica"
    }
  ],
  "resumen": "Resumen de la precisión histórica",
  "puntuacionHistorica": 8
}`,
      model: "gemini-2.5-flash",
      useThinking: false,
    });
  }

  async execute(input: any): Promise<any> {
    return this.detectAnachronisms(input.chapters, input.genre, input.premise);
  }

  async detectAnachronisms(chapterContents: { num: number; content: string }[], genre: string, premise: string): Promise<any> {
    const isHistorical = genre?.toLowerCase().includes("histor") || premise?.toLowerCase().includes("histor");
    if (!isHistorical) {
      return { 
        epocaDetectada: "No aplica - no es novela histórica",
        anacronismos: [], 
        resumen: "No se realizó análisis de anacronismos (género no histórico)", 
        puntuacionHistorica: 10 
      };
    }

    const samples = chapterContents.slice(0, 10).map(c => 
      `=== CAPÍTULO ${c.num} ===\n${c.content.substring(0, 5000)}`
    ).join("\n\n");

    const prompt = `Analiza esta novela histórica buscando anacronismos:

PREMISA: ${premise || "No especificada"}
GÉNERO: ${genre}

CAPÍTULOS DE MUESTRA:
${samples}

Detecta anacronismos tecnológicos, lingüísticos, sociales, materiales y conceptuales. RESPONDE EN JSON.`;

    const response = await this.generateContent(prompt);
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error("[AnachronismDetector] Failed to parse:", e);
    }
    return { epocaDetectada: "No determinada", anacronismos: [], resumen: "Análisis completado", puntuacionHistorica: 8 };
  }
}

class ReeditFinalReviewerAgent extends BaseAgent {
  constructor() {
    super({
      name: "Reedit Final Reviewer",
      role: "final_reviewer",
      systemPrompt: `Eres un experto de la industria editorial evaluando manuscritos para potencial de bestseller.

Evaluate the manuscript and provide:
1. Bestseller score (1-10)
2. Key strengths
3. Areas needing improvement
4. Market potential assessment
5. Recommendations for author

RESPOND WITH JSON ONLY:
{
  "bestsellerScore": 8,
  "strengths": ["Compelling plot", "Strong characters"],
  "weaknesses": ["Pacing issues in middle"],
  "marketPotential": "high",
  "recommendations": ["Tighten middle act", "Strengthen ending"]
}`,
      model: "gemini-2.5-flash",
      useThinking: false,
    });
  }

  async execute(input: any): Promise<any> {
    return this.reviewManuscript(input.summaries, input.totalChapters, input.totalWords);
  }

  async reviewManuscript(summaries: string[], totalChapters: number, totalWords: number): Promise<any> {
    const prompt = `Evaluate this manuscript for bestseller potential:

MANUSCRIPT STATISTICS:
- Total Chapters: ${totalChapters}
- Total Words: ${totalWords}

CHAPTER SUMMARIES AND QUALITY:
${summaries.join("\n\n")}

Provide your evaluation in JSON format.`;
    
    const response = await this.generateContent(prompt);
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error("[ReeditFinalReviewer] Failed to parse response:", e);
    }
    return { bestsellerScore: 7, strengths: [], weaknesses: [], recommendations: [], marketPotential: "moderate" };
  }
}

export class ReeditOrchestrator {
  private editorAgent: ReeditEditorAgent;
  private copyEditorAgent: ReeditCopyEditorAgent;
  private finalReviewerAgent: ReeditFinalReviewerAgent;
  private progressCallback: ProgressCallback | null = null;

  constructor() {
    this.editorAgent = new ReeditEditorAgent();
    this.copyEditorAgent = new ReeditCopyEditorAgent();
    this.finalReviewerAgent = new ReeditFinalReviewerAgent();
  }

  setProgressCallback(callback: ProgressCallback) {
    this.progressCallback = callback;
  }

  private emitProgress(progress: ReeditProgress) {
    if (this.progressCallback) {
      this.progressCallback(progress);
    }
    console.log(`[ReeditOrchestrator] ${progress.stage}: ${progress.message}`);
  }

  async analyzeStructure(chapters: ReeditChapter[]): Promise<StructureAnalysis> {
    const analysis: StructureAnalysis = {
      hasIssues: false,
      duplicateChapters: [],
      outOfOrderChapters: [],
      missingChapters: [],
      recommendations: [],
    };

    // Separate special chapters from regular chapters
    // 0 = Prologue, 998 = Epilogue, 999 = Author's Note
    const specialChapterNumbers = [0, 998, 999];
    const regularChapters = chapters.filter(c => !specialChapterNumbers.includes(c.chapterNumber));
    const regularChapterNumbers = regularChapters.map(c => c.chapterNumber).sort((a, b) => a - b);
    
    // Add metadata about special chapters
    const hasPrologue = chapters.some(c => c.chapterNumber === 0);
    const hasEpilogue = chapters.some(c => c.chapterNumber === 998);
    const hasAuthorNote = chapters.some(c => c.chapterNumber === 999);
    (analysis as any).hasPrologue = hasPrologue;
    (analysis as any).hasEpilogue = hasEpilogue;
    (analysis as any).hasAuthorNote = hasAuthorNote;
    (analysis as any).totalChapters = chapters.length;
    (analysis as any).regularChapters = regularChapters.length;
    
    // Only check for missing chapters among regular chapters (1 to max regular chapter)
    const maxRegularChapter = regularChapterNumbers.length > 0 ? Math.max(...regularChapterNumbers) : 0;
    
    for (let i = 1; i <= maxRegularChapter; i++) {
      const count = regularChapterNumbers.filter(n => n === i).length;
      if (count === 0) {
        analysis.missingChapters.push(i);
        analysis.hasIssues = true;
      } else if (count > 1) {
        const duplicates = regularChapters.filter(c => c.chapterNumber === i);
        for (let j = 1; j < duplicates.length; j++) {
          const similarity = this.calculateSimilarity(
            duplicates[0].originalContent,
            duplicates[j].originalContent
          );
          analysis.duplicateChapters.push({
            chapterId: duplicates[j].id,
            duplicateOf: duplicates[0].id,
            similarity,
          });
        }
        analysis.hasIssues = true;
      }
    }

    for (let i = 0; i < chapters.length - 1; i++) {
      const current = chapters[i];
      const next = chapters[i + 1];
      
      if (current.chapterNumber > next.chapterNumber) {
        analysis.outOfOrderChapters.push({
          chapterNumber: next.chapterNumber,
          suggestedPosition: i,
          reason: `Chapter ${next.chapterNumber} appears after chapter ${current.chapterNumber}`,
        });
        analysis.hasIssues = true;
      }
    }

    if (analysis.duplicateChapters.length > 0) {
      analysis.recommendations.push(
        `Found ${analysis.duplicateChapters.length} duplicate chapter(s). Review and remove duplicates.`
      );
    }
    if (analysis.outOfOrderChapters.length > 0) {
      analysis.recommendations.push(
        `Found ${analysis.outOfOrderChapters.length} chapter(s) out of order. Reorder before processing.`
      );
    }
    if (analysis.missingChapters.length > 0) {
      analysis.recommendations.push(
        `Missing chapters: ${analysis.missingChapters.join(", ")}. Verify manuscript completeness.`
      );
    }

    return analysis;
  }

  private calculateSimilarity(text1: string, text2: string): number {
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    
    let intersectionSize = 0;
    for (const word of words1) {
      if (set2.has(word)) {
        intersectionSize++;
        set2.delete(word);
      }
    }
    
    const unionSize = set1.size + set2.size;
    return unionSize > 0 ? intersectionSize / unionSize : 0;
  }

  async processProject(projectId: number): Promise<void> {
    const project = await storage.getReeditProject(projectId);
    if (!project) {
      throw new Error(`Reedit project ${projectId} not found`);
    }

    try {
      await storage.updateReeditProject(projectId, { status: "processing" });

      const chapters = await storage.getReeditChaptersByProject(projectId);
      
      this.emitProgress({
        projectId,
        stage: "analyzing",
        currentChapter: 0,
        totalChapters: chapters.length,
        message: "Analyzing manuscript structure...",
      });

      const structureAnalysis = await this.analyzeStructure(chapters);
      await storage.updateReeditProject(projectId, {
        currentStage: "analyzing",
        structureAnalysis: structureAnalysis as any,
      });

      for (const dup of structureAnalysis.duplicateChapters) {
        await storage.updateReeditChapter(dup.chapterId, {
          isDuplicate: true,
          duplicateOfChapter: dup.duplicateOf,
          status: "skipped",
        });
      }

      for (const ooo of structureAnalysis.outOfOrderChapters) {
        const chapter = chapters.find(c => c.chapterNumber === ooo.chapterNumber);
        if (chapter) {
          await storage.updateReeditChapter(chapter.id, {
            isOutOfOrder: true,
            suggestedOrder: ooo.suggestedPosition,
          });
        }
      }

      await storage.updateReeditProject(projectId, { currentStage: "editing" });

      const validChapters = chapters.filter(c => {
        const isDup = structureAnalysis.duplicateChapters.some(d => d.chapterId === c.id);
        return !isDup;
      }).sort((a, b) => a.chapterNumber - b.chapterNumber);

      const detectedLang = project.detectedLanguage || "es";
      const chapterSummaries: string[] = [];

      for (let i = 0; i < validChapters.length; i++) {
        const chapter = validChapters[i];
        
        this.emitProgress({
          projectId,
          stage: "editing",
          currentChapter: i + 1,
          totalChapters: validChapters.length,
          message: `Processing chapter ${chapter.chapterNumber}: Editor review...`,
        });

        await storage.updateReeditChapter(chapter.id, {
          status: "analyzing",
          processingStage: "editor",
        });

        const editorResult = await this.editorAgent.reviewChapter(
          chapter.originalContent,
          chapter.chapterNumber,
          detectedLang
        );

        await storage.updateReeditChapter(chapter.id, {
          editorScore: editorResult.score || 7,
          editorFeedback: {
            issues: editorResult.issues || [],
            suggestions: editorResult.suggestions || [],
            strengths: editorResult.strengths || [],
          },
          narrativeIssues: {
            pacing: editorResult.pacingNotes || "",
          },
          processingStage: "copyeditor",
        });

        this.emitProgress({
          projectId,
          stage: "editing",
          currentChapter: i + 1,
          totalChapters: validChapters.length,
          message: `Processing chapter ${chapter.chapterNumber}: Copy editing...`,
        });

        const copyEditorResult = await this.copyEditorAgent.editChapter(
          chapter.originalContent,
          chapter.chapterNumber,
          detectedLang
        );

        const editedContent = copyEditorResult.editedContent || chapter.originalContent;
        const wordCount = editedContent.split(/\s+/).filter((w: string) => w.length > 0).length;

        await storage.updateReeditChapter(chapter.id, {
          editedContent,
          copyeditorChanges: copyEditorResult.changesLog || "",
          fluencyImprovements: copyEditorResult.fluencyChanges || [],
          wordCount,
          status: "completed",
          processingStage: "completed",
        });

        chapterSummaries.push(
          `Chapter ${chapter.chapterNumber} (Score: ${editorResult.score || 7}/10): ${(editorResult.strengths || []).slice(0, 2).join(", ")}`
        );

        await storage.updateReeditProject(projectId, {
          currentChapter: i + 1,
          processedChapters: i + 1,
        });
      }

      await storage.updateReeditProject(projectId, { currentStage: "reviewing" });

      this.emitProgress({
        projectId,
        stage: "reviewing",
        currentChapter: validChapters.length,
        totalChapters: validChapters.length,
        message: "Running final review...",
      });

      const updatedChapters = await storage.getReeditChaptersByProject(projectId);
      const completedChapters = updatedChapters.filter(c => c.status === "completed");
      const totalWords = completedChapters.reduce((sum, c) => sum + (c.wordCount || 0), 0);

      const finalResult = await this.finalReviewerAgent.reviewManuscript(
        chapterSummaries,
        completedChapters.length,
        totalWords
      );

      const bestsellerScore = finalResult.bestsellerScore || 7;

      await storage.createReeditAuditReport({
        projectId,
        auditType: "final_review",
        chapterRange: "all",
        score: bestsellerScore,
        findings: finalResult,
        recommendations: finalResult.recommendations || [],
      });

      await storage.updateReeditProject(projectId, {
        currentStage: "completed",
        status: "completed",
        bestsellerScore,
        finalReviewResult: finalResult,
        totalWordCount: totalWords,
      });

      this.emitProgress({
        projectId,
        stage: "completed",
        currentChapter: validChapters.length,
        totalChapters: validChapters.length,
        message: `Reedit complete! Bestseller score: ${bestsellerScore}/10`,
      });

    } catch (error) {
      console.error(`[ReeditOrchestrator] Error processing project ${projectId}:`, error);
      await storage.updateReeditProject(projectId, {
        status: "error",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }
}

export const reeditOrchestrator = new ReeditOrchestrator();

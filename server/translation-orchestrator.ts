import OpenAI from "openai";
import { TRANSLATION_PROMPTS, TRANSLATION_MODELS } from "./agents/translation-prompts";
import { applyPatches } from "./utils/patcher";
import { storage } from "./storage";
import { calculateRealCost, formatCostForStorage } from "./cost-calculator";
import { NativeBetaReaderAgent, NativeBetaReaderResult } from "./agents/native-beta-reader";

interface TranslationCallbacks {
  onStatusChange: (status: string, message?: string) => void;
  onChunkComplete: (chunkNumber: number, totalChunks: number) => void;
  onStrategyReady: (strategy: TranslationStrategy) => void;
  onNativeBetaReaderComplete?: (result: NativeBetaReaderResult) => void;
}

interface TranslationStrategy {
  typographical_rules: string;
  glossary: Record<string, string>;
  tone_instructions: string;
}

interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  thinkingTokens: number;
}

export class TranslationOrchestrator {
  private openai: OpenAI;
  private cumulativeTokens: TokenUsage = { inputTokens: 0, outputTokens: 0, thinkingTokens: 0 };
  private callbacks: TranslationCallbacks;
  private nativeBetaReader: NativeBetaReaderAgent;

  constructor(callbacks: TranslationCallbacks) {
    const apiKey = process.env.DEEPSEEK_TRANSLATOR_API_KEY || process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error("DEEPSEEK_API_KEY is not configured");
    }
    this.openai = new OpenAI({
      apiKey,
      baseURL: "https://api.deepseek.com",
    });
    this.callbacks = callbacks;
    this.nativeBetaReader = new NativeBetaReaderAgent();
  }

  private addTokenUsage(usage?: TokenUsage) {
    if (usage) {
      this.cumulativeTokens.inputTokens += usage.inputTokens || 0;
      this.cumulativeTokens.outputTokens += usage.outputTokens || 0;
      this.cumulativeTokens.thinkingTokens += usage.thinkingTokens || 0;
    }
  }

  private async logAiUsage(
    translationId: number,
    agentName: string,
    model: string,
    usage?: TokenUsage,
    chunkNumber?: number
  ) {
    if (!usage) return;
    try {
      const costs = calculateRealCost(
        model,
        usage.inputTokens || 0,
        usage.outputTokens || 0,
        usage.thinkingTokens || 0
      );
      await storage.createAiUsageEvent({
        translationId,
        agentName,
        model,
        inputTokens: usage.inputTokens || 0,
        outputTokens: usage.outputTokens || 0,
        thinkingTokens: usage.thinkingTokens || 0,
        inputCostUsd: formatCostForStorage(costs.inputCost),
        outputCostUsd: formatCostForStorage(costs.outputCost + costs.thinkingCost),
        totalCostUsd: formatCostForStorage(costs.totalCost),
        chapterNumber: chunkNumber,
        operation: "translate",
      });
    } catch (err) {
      console.error(`[TranslationOrchestrator] Failed to log AI usage for ${agentName}:`, err);
    }
  }

  async startTranslation(
    translationId: number,
    fullText: string,
    sourceLang: string,
    targetLang: string,
    genre: string = 'default'
  ): Promise<{ content: string; metadata: TranslationStrategy; tokens: TokenUsage; nativeBetaReaderResult?: NativeBetaReaderResult }> {
    this.callbacks.onStatusChange("analyzing", "Analizando estilo y tipografía...");

    const strategyResult = await this.callAI(
      TRANSLATION_MODELS.STRATEGIST,
      TRANSLATION_PROMPTS.STRATEGIST_INIT(sourceLang, targetLang, fullText)
    );
    this.addTokenUsage(strategyResult.usage);
    await this.logAiUsage(translationId, "strategist", TRANSLATION_MODELS.STRATEGIST, strategyResult.usage);

    let strategy: TranslationStrategy;
    try {
      const cleaned = strategyResult.content.replace(/```json|```/g, "").trim();
      strategy = JSON.parse(cleaned);
    } catch {
      strategy = {
        typographical_rules: "Usar rayas de diálogo (—) para el español.",
        glossary: {},
        tone_instructions: "Mantener el tono original.",
      };
    }

    this.callbacks.onStrategyReady(strategy);
    await storage.updateTranslation(translationId, {
      glossary: strategy.glossary,
      typographicalRules: strategy.typographical_rules,
      toneInstructions: strategy.tone_instructions,
      status: "translating",
    });

    const chunks = this.smartSplit(fullText);
    await storage.updateTranslation(translationId, { totalChunks: chunks.length });

    let finalDoc = "";
    let context = "";
    let avgLayoutScore = 0;
    let avgNaturalnessScore = 0;

    this.callbacks.onStatusChange("translating", `Transcreando ${chunks.length} fragmentos...`);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      this.callbacks.onChunkComplete(i + 1, chunks.length);
      await storage.updateTranslation(translationId, { currentChunk: i + 1 });

      const draftResult = await this.callAI(
        TRANSLATION_MODELS.DRAFTER,
        TRANSLATION_PROMPTS.DRAFTER_CHUNK(
          chunk,
          JSON.stringify(strategy.glossary),
          strategy.typographical_rules,
          context,
          targetLang
        )
      );
      this.addTokenUsage(draftResult.usage);
      await this.logAiUsage(translationId, "drafter", TRANSLATION_MODELS.DRAFTER, draftResult.usage, i + 1);

      const auditResult = await this.callAI(
        TRANSLATION_MODELS.PROOFREADER,
        TRANSLATION_PROMPTS.PROOFREADER_CHECK(chunk, draftResult.content, targetLang)
      );
      this.addTokenUsage(auditResult.usage);
      await this.logAiUsage(translationId, "proofreader", TRANSLATION_MODELS.PROOFREADER, auditResult.usage, i + 1);

      let finalChunk = draftResult.content;
      try {
        const cleaned = auditResult.content.replace(/```json|```/g, "").trim();
        const audit = JSON.parse(cleaned);

        if (audit.layout_score) avgLayoutScore += audit.layout_score;
        if (audit.naturalness_score) avgNaturalnessScore += audit.naturalness_score;

        if (audit.has_critical_errors && audit.replacements?.length > 0) {
          console.log(`[TranslationOrchestrator] Applying ${audit.replacements.length} corrections to chunk ${i + 1}`);
          const patches = audit.replacements.map((r: any) => ({
            find: r.original_snippet,
            replace: r.correction,
          }));
          const patchResult = applyPatches(draftResult.content, patches);
          finalChunk = patchResult.patchedText;
        }
      } catch {
        console.log(`[TranslationOrchestrator] Could not parse audit for chunk ${i + 1}, using draft as-is`);
      }

      finalDoc += finalChunk + "\n\n";
      context = finalChunk.slice(-500);

      await storage.updateTranslation(translationId, {
        inputTokens: this.cumulativeTokens.inputTokens,
        outputTokens: this.cumulativeTokens.outputTokens,
        thinkingTokens: this.cumulativeTokens.thinkingTokens,
      });
    }

    const layoutScore = chunks.length > 0 ? Math.round(avgLayoutScore / chunks.length) : 0;
    const naturalnessScore = chunks.length > 0 ? Math.round(avgNaturalnessScore / chunks.length) : 0;

    // === NATIVE BETA READER STAGE ===
    // Review translated text as a native speaker of the target language
    this.callbacks.onStatusChange("native_review", `Lector beta nativo revisando en ${targetLang}...`);

    let nativeBetaReaderResult: NativeBetaReaderResult | undefined;
    let finalContent = finalDoc.trim();

    try {
      const nativeReview = await this.nativeBetaReader.reviewTranslation(
        translationId,
        finalContent,
        targetLang,
        genre
      );

      nativeBetaReaderResult = nativeReview.result;
      this.addTokenUsage(nativeReview.tokenUsage);

      // Apply corrections if any
      if (nativeBetaReaderResult.corrections && nativeBetaReaderResult.corrections.length > 0) {
        console.log(`[TranslationOrchestrator] Applying ${nativeBetaReaderResult.corrections.length} native corrections...`);
        finalContent = await this.nativeBetaReader.applyCorrections(
          finalContent,
          nativeBetaReaderResult.corrections
        );
      }

      // Notify callback if provided
      if (this.callbacks.onNativeBetaReaderComplete) {
        this.callbacks.onNativeBetaReaderComplete(nativeBetaReaderResult);
      }

      console.log(`[TranslationOrchestrator] Native review complete: ${nativeBetaReaderResult.final_verdict}, score: ${nativeBetaReaderResult.overall_score}/10`);
    } catch (err) {
      console.error("[TranslationOrchestrator] Native beta reader failed, continuing without native review:", err);
      nativeBetaReaderResult = undefined;
    }

    await storage.updateTranslation(translationId, {
      markdown: finalContent,
      layoutScore,
      naturalnessScore,
      status: "completed",
      chaptersTranslated: chunks.length,
    });

    this.callbacks.onStatusChange("completed", "Traducción completada con revisión nativa");

    return {
      content: finalContent,
      metadata: strategy,
      tokens: this.cumulativeTokens,
      nativeBetaReaderResult,
    };
  }

  private async callAI(
    model: string,
    prompt: string
  ): Promise<{ content: string; usage: TokenUsage }> {
    try {
      const completion = await this.openai.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model,
        temperature: model.includes("reasoner") ? 0.6 : 0.3,
      });

      const usage: TokenUsage = {
        inputTokens: completion.usage?.prompt_tokens || 0,
        outputTokens: completion.usage?.completion_tokens || 0,
        thinkingTokens: (completion.usage as any)?.reasoning_tokens || 0,
      };

      return {
        content: completion.choices[0]?.message?.content || "",
        usage,
      };
    } catch (error) {
      console.error(`[TranslationOrchestrator] AI call failed:`, error);
      throw error;
    }
  }

  private smartSplit(text: string): string[] {
    const targetSize = 1500;
    const paragraphs = text.split(/\n\n+/);
    const chunks: string[] = [];
    let currentChunk = "";

    for (const para of paragraphs) {
      if (currentChunk.length + para.length > targetSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = para;
      } else {
        currentChunk += (currentChunk ? "\n\n" : "") + para;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks.length > 0 ? chunks : [text];
  }
}

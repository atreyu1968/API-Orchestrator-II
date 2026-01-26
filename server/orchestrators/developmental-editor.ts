import { storage } from "../storage";
import { BaseAgent, type AIModel } from "../agents/base-agent";
import type { ReeditProject, ReeditChapter } from "@shared/schema";
import { 
  DEVELOPMENTAL_EDITOR_PROMPTS,
  type StructuralAnalysisResult,
  type SurgeonResult,
  type FillerResult,
  type MergeResult
} from "../agents/developmental-editor-prompts";

const DEVELOPMENTAL_EDITOR_MODELS: Record<string, AIModel> = {
  MAPPER: "deepseek-reasoner",
  HISTORIAN: "deepseek-chat",
  SURGEON: "deepseek-chat",
  GHOSTWRITER: "deepseek-chat"
};

interface DevelopmentalProgress {
  projectId: number;
  stage: string;
  currentStep: number;
  totalSteps: number;
  message: string;
}

type ProgressCallback = (progress: DevelopmentalProgress) => void;

class SummarizerAgent extends BaseAgent {
  constructor() {
    super({
      name: "Summarizer",
      role: "analyzer",
      systemPrompt: "Eres un asistente que resume capítulos de novelas de forma concisa y estructurada.",
      model: DEVELOPMENTAL_EDITOR_MODELS.GHOSTWRITER,
      useThinking: false,
    });
  }

  async execute(input: any): Promise<any> {
    return this.summarizeChapter(input.content);
  }

  async summarizeChapter(content: string): Promise<{ summary: string; elements: string[]; tokenUsage: any }> {
    const prompt = DEVELOPMENTAL_EDITOR_PROMPTS.QUICK_SCAN(content);
    const response = await this.generateContent(prompt);
    
    let result = { eventos: "", informacion_revelada: "", elementos_epoca: [], personajes_mencionados: [] };
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error("[Summarizer] Failed to parse response:", e);
    }
    
    return {
      summary: `${result.eventos}. ${result.informacion_revelada}`,
      elements: [...(result.elementos_epoca || []), ...(result.personajes_mencionados || [])],
      tokenUsage: response.tokenUsage,
    };
  }
}

class StoryMapperAgent extends BaseAgent {
  constructor() {
    super({
      name: "Story Mapper",
      role: "developmental_editor",
      systemPrompt: "Eres un editor de desarrollo profesional que analiza la estructura narrativa de novelas completas.",
      model: DEVELOPMENTAL_EDITOR_MODELS.MAPPER,
      useThinking: true,
    });
  }

  async execute(input: any): Promise<any> {
    return this.analyzeStructure(input.summaries, input.context, input.language);
  }

  async analyzeStructure(chapterSummaries: string, context: string, language: string): Promise<{ analysis: StructuralAnalysisResult; tokenUsage: any }> {
    const prompt = DEVELOPMENTAL_EDITOR_PROMPTS.STRUCTURAL_ANALYSIS(chapterSummaries, context, language);
    const response = await this.generateContent(prompt);
    
    let analysis: StructuralAnalysisResult = {
      critique: "",
      plot_holes: [],
      redundancies: [],
      pacing_issues: [],
      anachronisms_warning: [],
      plan: [],
    };
    
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error("[StoryMapper] Failed to parse response:", e);
    }
    
    return { analysis, tokenUsage: response.tokenUsage };
  }
}

class SurgeonAgent extends BaseAgent {
  constructor() {
    super({
      name: "Surgeon",
      role: "copy_editor",
      systemPrompt: "Eres un editor de estilo que pule textos para calidad editorial profesional.",
      model: DEVELOPMENTAL_EDITOR_MODELS.SURGEON,
      useThinking: false,
    });
  }

  async execute(input: any): Promise<any> {
    return this.polishChapter(input.content, input.setting, input.prevContext, input.language, input.anachronisms);
  }

  async polishChapter(content: string, setting: string, prevContext: string, language: string, anachronisms: string[]): Promise<{ result: SurgeonResult; tokenUsage: any }> {
    const prompt = DEVELOPMENTAL_EDITOR_PROMPTS.SURGEON_REWRITE(content, setting, prevContext, language, anachronisms);
    const response = await this.generateContent(prompt);
    
    let result: SurgeonResult = {
      editedContent: content,
      changes: [],
      anachronismsFixed: [],
      styleImprovements: "",
    };
    
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error("[Surgeon] Failed to parse response:", e);
      result.editedContent = response.content;
    }
    
    return { result, tokenUsage: response.tokenUsage };
  }
}

class GhostwriterAgent extends BaseAgent {
  constructor() {
    super({
      name: "Ghostwriter",
      role: "writer",
      systemPrompt: "Eres un escritor fantasma profesional que crea capítulos de novela coherentes con el estilo del manuscrito.",
      model: DEVELOPMENTAL_EDITOR_MODELS.GHOSTWRITER,
      useThinking: false,
    });
  }

  async execute(input: any): Promise<any> {
    return this.generateFiller(input.instruction, input.prevContext, input.nextContext, input.setting, input.language, input.targetWords);
  }

  async generateFiller(instruction: string, prevContext: string, nextContext: string, setting: string, language: string, targetWords: number): Promise<{ result: FillerResult; tokenUsage: any }> {
    const prompt = DEVELOPMENTAL_EDITOR_PROMPTS.FILLER_GENERATOR(instruction, prevContext, nextContext, setting, language, targetWords);
    const response = await this.generateContent(prompt);
    
    let result: FillerResult = {
      title: "Capítulo Nuevo",
      content: "",
      wordCount: 0,
      bridgeElements: [],
      plotAdvancement: "",
    };
    
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error("[Ghostwriter] Failed to parse response:", e);
      result.content = response.content;
    }
    
    return { result, tokenUsage: response.tokenUsage };
  }

  async mergeChapters(chapter1: string, chapter2: string, setting: string, language: string): Promise<{ result: MergeResult; tokenUsage: any }> {
    const prompt = DEVELOPMENTAL_EDITOR_PROMPTS.MERGE_CHAPTERS(chapter1, chapter2, setting, language);
    const response = await this.generateContent(prompt);
    
    let result: MergeResult = {
      title: "Capítulo Fusionado",
      mergedContent: "",
      wordCount: 0,
      removedRedundancies: [],
      transitions: [],
    };
    
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error("[Ghostwriter] Failed to parse merge response:", e);
      result.mergedContent = chapter1 + "\n\n" + chapter2;
    }
    
    return { result, tokenUsage: response.tokenUsage };
  }
}

export class DevelopmentalEditor {
  private summarizer: SummarizerAgent;
  private storyMapper: StoryMapperAgent;
  private surgeon: SurgeonAgent;
  private ghostwriter: GhostwriterAgent;
  private onProgress: ProgressCallback | null = null;

  constructor() {
    this.summarizer = new SummarizerAgent();
    this.storyMapper = new StoryMapperAgent();
    this.surgeon = new SurgeonAgent();
    this.ghostwriter = new GhostwriterAgent();
  }

  setProgressCallback(callback: ProgressCallback) {
    this.onProgress = callback;
  }

  private emitProgress(projectId: number, stage: string, currentStep: number, totalSteps: number, message: string) {
    if (this.onProgress) {
      this.onProgress({ projectId, stage, currentStep, totalSteps, message });
    }
  }

  async summarizeAllChapters(projectId: number, chapters: ReeditChapter[]): Promise<{ summaries: Array<{ id: number; chapterNumber: number; summary: string; elements: string[] }>; totalTokens: { input: number; output: number; thinking: number } }> {
    const summaries: Array<{ id: number; chapterNumber: number; summary: string; elements: string[] }> = [];
    const totalTokens = { input: 0, output: 0, thinking: 0 };

    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i];
      this.emitProgress(projectId, "summarizing", i + 1, chapters.length, `Resumiendo capítulo ${chapter.chapterNumber}...`);

      const { summary, elements, tokenUsage } = await this.summarizer.summarizeChapter(chapter.originalContent);
      
      summaries.push({
        id: chapter.id,
        chapterNumber: chapter.chapterNumber,
        summary,
        elements,
      });

      await storage.updateReeditChapter(chapter.id, { summary });

      if (tokenUsage) {
        totalTokens.input += tokenUsage.inputTokens || 0;
        totalTokens.output += tokenUsage.outputTokens || 0;
        totalTokens.thinking += tokenUsage.thinkingTokens || 0;
      }
    }

    return { summaries, totalTokens };
  }

  async analyzeStructure(projectId: number, summaries: Array<{ id: number; chapterNumber: number; summary: string; elements: string[] }>, context: string, language: string): Promise<{ analysis: StructuralAnalysisResult; tokenUsage: any }> {
    this.emitProgress(projectId, "analyzing", 1, 1, "Analizando estructura narrativa con R1...");

    const summaryBlock = summaries
      .map(s => `Capítulo ${s.chapterNumber}: ${s.summary}\nElementos: ${s.elements.join(", ")}`)
      .join("\n\n");

    const { analysis, tokenUsage } = await this.storyMapper.analyzeStructure(summaryBlock, context, language);

    await storage.updateReeditProject(projectId, {
      structuralReport: {
        critique: analysis.critique,
        plot_holes: analysis.plot_holes,
        redundancies: analysis.redundancies,
        pacing_issues: analysis.pacing_issues,
        anachronisms_warning: analysis.anachronisms_warning,
      },
      reconstructionPlan: analysis.plan,
      currentStage: "plan_ready",
      currentActivity: "Plan de reconstrucción listo para aprobación",
    });

    return { analysis, tokenUsage };
  }

  async executePlan(projectId: number, project: ReeditProject, chapters: ReeditChapter[], approvedPlan?: StructuralAnalysisResult["plan"]): Promise<{ finalChapters: ReeditChapter[]; totalTokens: { input: number; output: number; thinking: number } }> {
    const plan = approvedPlan || (project.reconstructionPlan as StructuralAnalysisResult["plan"]) || [];
    const setting = project.settingContext || "";
    const language = project.detectedLanguage || "es";
    const totalTokens = { input: 0, output: 0, thinking: 0 };
    const finalChapters: ReeditChapter[] = [];

    await storage.updateReeditProject(projectId, {
      currentStage: "executing",
      currentActivity: "Ejecutando plan de reconstrucción...",
    });

    let prevContext = "";
    const chapterMap = new Map(chapters.map(c => [c.originalChapterNumber || c.chapterNumber, c]));

    for (let i = 0; i < plan.length; i++) {
      const step = plan[i];
      this.emitProgress(projectId, "executing", i + 1, plan.length, `Procesando paso ${i + 1}/${plan.length}: ${step.action}`);

      if (step.action === "KEEP") {
        const chapter = chapterMap.get(step.original_id!);
        if (chapter) {
          const anachronisms = (project.structuralReport as any)?.anachronisms_warning
            ?.filter((a: any) => a.chapter === step.original_id)
            ?.map((a: any) => a.element) || [];

          const { result, tokenUsage } = await this.surgeon.polishChapter(
            chapter.originalContent,
            setting,
            prevContext,
            language,
            anachronisms
          );

          await storage.updateReeditChapter(chapter.id, {
            editedContent: result.editedContent,
            actionType: "KEEP_AND_POLISH",
            finalIndex: step.new_order,
            anachronismsFound: result.anachronismsFixed,
            status: "completed",
          });

          prevContext = result.editedContent.slice(-500);
          finalChapters.push({ ...chapter, editedContent: result.editedContent });

          if (tokenUsage) {
            totalTokens.input += tokenUsage.inputTokens || 0;
            totalTokens.output += tokenUsage.outputTokens || 0;
            totalTokens.thinking += tokenUsage.thinkingTokens || 0;
          }
        }
      } else if (step.action === "INSERT") {
        const nextChapter = plan[i + 1] ? chapterMap.get(plan[i + 1].original_id!) : null;
        const nextContext = nextChapter?.originalContent?.substring(0, 500) || "";

        const { result, tokenUsage } = await this.ghostwriter.generateFiller(
          step.prompt_for_writer || step.reason,
          prevContext,
          nextContext,
          setting,
          language,
          2000
        );

        const newChapter = await storage.createReeditChapter({
          projectId,
          chapterNumber: step.new_order,
          originalChapterNumber: undefined,
          originalIndex: undefined,
          finalIndex: step.new_order,
          title: result.title,
          originalContent: "",
          editedContent: result.content,
          actionType: "INSERT_NEW",
          insertPrompt: step.prompt_for_writer,
          status: "completed",
          wordCount: result.wordCount,
        });

        prevContext = result.content.slice(-500);
        finalChapters.push(newChapter);

        if (tokenUsage) {
          totalTokens.input += tokenUsage.inputTokens || 0;
          totalTokens.output += tokenUsage.outputTokens || 0;
          totalTokens.thinking += tokenUsage.thinkingTokens || 0;
        }
      } else if (step.action === "DELETE") {
        const chapter = chapterMap.get(step.original_id!);
        if (chapter) {
          await storage.updateReeditChapter(chapter.id, {
            actionType: "DELETE",
            status: "deleted",
          });
        }
      } else if (step.action === "MERGE") {
        const chapter1 = chapterMap.get(step.original_id!);
        const chapter2 = step.merge_with ? chapterMap.get(step.merge_with) : null;

        if (chapter1 && chapter2) {
          const { result, tokenUsage } = await this.ghostwriter.mergeChapters(
            chapter1.originalContent,
            chapter2.originalContent,
            setting,
            language
          );

          await storage.updateReeditChapter(chapter1.id, {
            editedContent: result.mergedContent,
            actionType: "MERGE",
            mergeWithNext: true,
            finalIndex: step.new_order,
            title: result.title,
            status: "completed",
            wordCount: result.wordCount,
          });

          await storage.updateReeditChapter(chapter2.id, {
            actionType: "DELETE",
            status: "deleted",
          });

          prevContext = result.mergedContent.slice(-500);
          finalChapters.push({ ...chapter1, editedContent: result.mergedContent });

          if (tokenUsage) {
            totalTokens.input += tokenUsage.inputTokens || 0;
            totalTokens.output += tokenUsage.outputTokens || 0;
            totalTokens.thinking += tokenUsage.thinkingTokens || 0;
          }
        }
      }

      await storage.updateReeditProject(projectId, {
        processedChapters: i + 1,
        currentActivity: `Completado paso ${i + 1}/${plan.length}`,
      });
    }

    return { finalChapters, totalTokens };
  }

  async runFullPipeline(projectId: number, onProgress?: ProgressCallback): Promise<void> {
    if (onProgress) {
      this.setProgressCallback(onProgress);
    }

    const project = await storage.getReeditProject(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    const chapters = await storage.getReeditChaptersByProject(projectId);
    if (chapters.length === 0) {
      throw new Error(`No chapters found for project ${projectId}`);
    }

    await storage.updateReeditProject(projectId, {
      status: "processing",
      currentStage: "summarizing",
      currentActivity: "Iniciando análisis de desarrollo...",
    });

    const { summaries, totalTokens: summaryTokens } = await this.summarizeAllChapters(projectId, chapters);

    await storage.updateReeditProject(projectId, {
      currentStage: "analyzing_structure",
      currentActivity: "Analizando estructura narrativa...",
      totalInputTokens: (project.totalInputTokens || 0) + summaryTokens.input,
      totalOutputTokens: (project.totalOutputTokens || 0) + summaryTokens.output,
      totalThinkingTokens: (project.totalThinkingTokens || 0) + summaryTokens.thinking,
    });

    const { analysis, tokenUsage: analysisTokens } = await this.analyzeStructure(
      projectId,
      summaries,
      project.settingContext || "",
      project.detectedLanguage || "es"
    );

    const updatedProject = await storage.getReeditProject(projectId);
    await storage.updateReeditProject(projectId, {
      totalInputTokens: (updatedProject?.totalInputTokens || 0) + (analysisTokens?.inputTokens || 0),
      totalOutputTokens: (updatedProject?.totalOutputTokens || 0) + (analysisTokens?.outputTokens || 0),
      totalThinkingTokens: (updatedProject?.totalThinkingTokens || 0) + (analysisTokens?.thinkingTokens || 0),
    });

    console.log(`[DevelopmentalEditor] Structural analysis complete for project ${projectId}`);
    console.log(`[DevelopmentalEditor] Found ${analysis.plot_holes.length} plot holes, ${analysis.redundancies.length} redundancies`);
    console.log(`[DevelopmentalEditor] Plan has ${analysis.plan.length} steps`);
  }

  async executeApprovedPlan(projectId: number, onProgress?: ProgressCallback): Promise<void> {
    if (onProgress) {
      this.setProgressCallback(onProgress);
    }

    const project = await storage.getReeditProject(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    if (!project.planApproved) {
      throw new Error(`Plan not approved for project ${projectId}`);
    }

    const chapters = await storage.getReeditChaptersByProject(projectId);
    
    const { finalChapters, totalTokens } = await this.executePlan(projectId, project, chapters);

    const updatedProject = await storage.getReeditProject(projectId);
    await storage.updateReeditProject(projectId, {
      currentStage: "editing",
      currentActivity: "Plan ejecutado. Continuando con edición de estilo...",
      processedChapters: finalChapters.length,
      totalChapters: finalChapters.length,
      totalInputTokens: (updatedProject?.totalInputTokens || 0) + totalTokens.input,
      totalOutputTokens: (updatedProject?.totalOutputTokens || 0) + totalTokens.output,
      totalThinkingTokens: (updatedProject?.totalThinkingTokens || 0) + totalTokens.thinking,
    });

    console.log(`[DevelopmentalEditor] Plan executed for project ${projectId}`);
    console.log(`[DevelopmentalEditor] Final chapter count: ${finalChapters.length}`);
  }
}

export const developmentalEditor = new DevelopmentalEditor();

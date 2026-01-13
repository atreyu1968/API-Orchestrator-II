import { GoogleGenAI } from "@google/genai";
import { storage } from "../storage";
import type { ChatSession, ChatMessage, Project, ReeditProject, ReeditChapter, Chapter, WorldBible, ReeditWorldBible } from "@shared/schema";

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

const ARCHITECT_SYSTEM_PROMPT = `
Eres el Arquitecto de Tramas, un asistente experto en narrativa literaria que ayuda a los autores durante el proceso de creación de novelas.

Tu rol es responder preguntas y dar consejo sobre:
- Estructura narrativa y arcos argumentales
- Desarrollo de personajes y sus motivaciones
- Ritmo y tensión dramática
- Giros argumentales y sorpresas
- Continuidad y coherencia interna
- Worldbuilding y reglas del universo
- Diálogos y caracterización
- Técnicas para mantener al lector enganchado

IMPORTANTE:
- Responde siempre en español
- Sé conciso pero profundo en tus análisis
- Ofrece sugerencias específicas y accionables
- Cuando sea relevante, haz referencia a los datos del proyecto actual
- Puedes sugerir cambios específicos en capítulos o personajes
- Mantén un tono profesional pero cercano

Si el autor pregunta sobre un capítulo específico, analízalo en profundidad considerando:
- Su función estructural en la trama
- Cómo afecta a los arcos de los personajes
- Posibles mejoras o advertencias
`;

const REEDITOR_SYSTEM_PROMPT = `
Eres el Re-editor, un asistente experto en corrección y mejora de manuscritos que ayuda a los autores a pulir sus textos.

Tu rol es responder preguntas y dar consejo sobre:
- Correcciones de estilo y fluidez
- Errores de continuidad detectados por el autor
- Problemas de ritmo o pacing
- Diálogos que no suenan naturales
- Descripciones que necesitan ajuste
- Inconsistencias en los personajes
- Errores históricos o de ambientación
- Repeticiones léxicas o estructurales

IMPORTANTE:
- Responde siempre en español
- Cuando el autor señale un problema, proporciona soluciones concretas
- Puedes sugerir texto alternativo cuando sea apropiado
- Analiza el contexto antes de proponer cambios
- Ten en cuenta la voz y estilo del autor
- Sé específico: indica números de capítulo, nombres de personajes, etc.

Cuando el autor te pida corregir algo:
1. Confirma que entiendes el problema
2. Analiza las implicaciones del cambio
3. Proporciona una solución concreta
4. Advierte sobre posibles efectos secundarios en otros capítulos
`;

interface ChatContext {
  project?: Project | ReeditProject;
  chapters?: Chapter[] | ReeditChapter[];
  worldBible?: WorldBible | ReeditWorldBible | null;
  styleGuide?: string;
  recentMessages: ChatMessage[];
}

export class ChatService {
  private async buildContext(session: ChatSession): Promise<ChatContext> {
    const recentMessages = await storage.getChatMessagesBySession(session.id);
    const context: ChatContext = { recentMessages };

    if (session.agentType === "architect" && session.projectId) {
      const project = await storage.getProject(session.projectId);
      if (project) {
        context.project = project;
        const chapters = await storage.getChaptersByProject(project.id);
        context.chapters = chapters;
        const worldBible = await storage.getWorldBibleByProject(project.id);
        context.worldBible = worldBible;
        if (project.styleGuideId) {
          const guide = await storage.getStyleGuide(project.styleGuideId);
          context.styleGuide = guide?.content;
        }
      }
    } else if (session.agentType === "reeditor" && session.reeditProjectId) {
      const reeditProject = await storage.getReeditProject(session.reeditProjectId);
      if (reeditProject) {
        context.project = reeditProject;
        const chapters = await storage.getReeditChaptersByProject(reeditProject.id);
        context.chapters = chapters;
        const worldBible = await storage.getReeditWorldBibleByProject(reeditProject.id);
        context.worldBible = worldBible;
      }
    }

    return context;
  }

  private buildContextPrompt(context: ChatContext, session: ChatSession): string {
    const parts: string[] = [];

    if (context.project) {
      const p = context.project;
      parts.push(`
PROYECTO ACTUAL: "${p.title}"
- ID: ${p.id}
- Total capítulos: ${context.chapters?.length || 0}
- Estado: ${'status' in p ? p.status : 'N/A'}
`);
    }

    if (context.worldBible && 'characters' in context.worldBible && context.worldBible.characters) {
      const chars = context.worldBible.characters as any[];
      if (chars.length > 0) {
        parts.push(`
PERSONAJES PRINCIPALES:
${chars.slice(0, 5).map((c: any) => `- ${c.name}: ${c.role || c.description || 'Sin descripción'}`).join('\n')}
`);
      }
    }

    if (session.chapterNumber && context.chapters) {
      const targetChapter = context.chapters.find((ch: any) => ch.chapterNumber === session.chapterNumber);
      if (targetChapter) {
        const content = 'editedContent' in targetChapter 
          ? (targetChapter.editedContent || targetChapter.originalContent)
          : targetChapter.content;
        parts.push(`
CAPÍTULO EN CONTEXTO (${session.chapterNumber}): "${targetChapter.title || 'Sin título'}"
Contenido (primeras 2000 palabras):
${content?.substring(0, 10000) || 'Sin contenido disponible'}
`);
      }
    }

    if (context.styleGuide) {
      parts.push(`
GUÍA DE ESTILO DEL AUTOR:
${context.styleGuide.substring(0, 3000)}
`);
    }

    return parts.join('\n');
  }

  async sendMessage(
    sessionId: number,
    userMessage: string,
    onProgress?: (chunk: string) => void
  ): Promise<{ message: ChatMessage; inputTokens: number; outputTokens: number }> {
    const session = await storage.getChatSession(sessionId);
    if (!session) {
      throw new Error("Sesión de chat no encontrada");
    }

    const userMsg = await storage.createChatMessage({
      sessionId,
      role: "user",
      content: userMessage,
      chapterReference: session.chapterNumber,
    });

    const context = await this.buildContext(session);
    const contextPrompt = this.buildContextPrompt(context, session);
    
    const systemPrompt = session.agentType === "architect" 
      ? ARCHITECT_SYSTEM_PROMPT 
      : REEDITOR_SYSTEM_PROMPT;

    const conversationHistory = context.recentMessages.slice(-10).map(msg => ({
      role: msg.role as "user" | "model",
      parts: [{ text: msg.content }]
    }));

    conversationHistory.push({
      role: "user",
      parts: [{ text: userMessage }]
    });

    let fullResponse = "";
    let inputTokens = 0;
    let outputTokens = 0;

    try {
      const response = await ai.models.generateContentStream({
        model: "gemini-2.5-flash",
        contents: conversationHistory,
        config: {
          systemInstruction: `${systemPrompt}\n\n${contextPrompt}`,
          temperature: 0.7,
        }
      });

      for await (const chunk of response) {
        const text = chunk.text || "";
        fullResponse += text;
        if (onProgress) {
          onProgress(text);
        }
        if (chunk.usageMetadata) {
          inputTokens = chunk.usageMetadata.promptTokenCount || 0;
          outputTokens = chunk.usageMetadata.candidatesTokenCount || 0;
        }
      }

    } catch (error: any) {
      console.error("Error generating chat response:", error);
      fullResponse = `Error al procesar tu mensaje: ${error.message || 'Error desconocido'}`;
    }

    const assistantMsg = await storage.createChatMessage({
      sessionId,
      role: "assistant",
      content: fullResponse,
      chapterReference: session.chapterNumber,
    });

    await storage.updateChatMessage(assistantMsg.id, { inputTokens, outputTokens });

    await storage.updateChatSession(sessionId, {
      totalInputTokens: (session.totalInputTokens || 0) + inputTokens,
      totalOutputTokens: (session.totalOutputTokens || 0) + outputTokens,
    });

    return { message: assistantMsg, inputTokens, outputTokens };
  }

  async createSession(params: {
    projectId?: number;
    reeditProjectId?: number;
    agentType: "architect" | "reeditor";
    chapterNumber?: number;
    title?: string;
  }): Promise<ChatSession> {
    let projectTitle = "Nuevo chat";
    
    if (params.agentType === "architect" && params.projectId) {
      const project = await storage.getProject(params.projectId);
      projectTitle = project?.title || "Proyecto";
    } else if (params.agentType === "reeditor" && params.reeditProjectId) {
      const project = await storage.getReeditProject(params.reeditProjectId);
      projectTitle = project?.title || "Proyecto reedit";
    }

    const title = params.title || `Chat con ${params.agentType === "architect" ? "Arquitecto" : "Re-editor"} - ${projectTitle}`;

    return storage.createChatSession({
      projectId: params.projectId || null,
      reeditProjectId: params.reeditProjectId || null,
      agentType: params.agentType,
      title,
      chapterNumber: params.chapterNumber || null,
      status: "active",
    });
  }
}

export const chatService = new ChatService();

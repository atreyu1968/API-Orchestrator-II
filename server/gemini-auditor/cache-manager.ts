/**
 * Gemini Context Caching Manager
 * Handles file upload and cache creation for novel auditing
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAICacheManager, CachedContent } from "@google/generative-ai/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const MODEL_NAME = "models/gemini-1.5-pro-002";
const CACHE_TTL_SECONDS = 3600; // 1 hour

export interface CacheResult {
  success: boolean;
  cacheId?: string;
  cacheName?: string;
  expiresAt?: Date;
  error?: string;
}

/**
 * Initialize novel context by uploading files and creating a cached context
 * This allows multiple agents to query the same context efficiently
 */
export async function initializeNovelContext(
  novelContent: string,
  bibleContent: string | null,
  novelTitle: string
): Promise<CacheResult> {
  try {
    console.log(`[CacheManager] Initializing context for: ${novelTitle}`);
    
    const cacheManager = new GoogleAICacheManager(GEMINI_API_KEY);
    
    // Combine novel and bible into a single context
    let fullContext = `=== NOVELA COMPLETA ===\n\n${novelContent}`;
    
    if (bibleContent) {
      fullContext += `\n\n=== BIBLIA DE LA HISTORIA (Reglas del Mundo, Personajes, Cronología) ===\n\n${bibleContent}`;
    }
    
    console.log(`[CacheManager] Context size: ${fullContext.length} chars`);
    
    // Create cached content with the full novel context
    const cache = await cacheManager.create({
      model: MODEL_NAME,
      displayName: `Novel Audit: ${novelTitle}`,
      systemInstruction: {
        role: "system",
        parts: [{
          text: `Eres un Editor Literario Senior con décadas de experiencia. Tienes acceso a la novela completa y a la biblia de la historia. Tu trabajo es analizar el texto basándote estrictamente en la consistencia interna y la calidad literaria.

REGLAS IMPORTANTES:
1. Responde SIEMPRE en formato JSON válido
2. Analiza TODO el texto, no solo fragmentos
3. Basa tus observaciones en evidencia textual concreta
4. Cita ubicaciones específicas (capítulo, párrafo, cita)
5. Sé constructivo pero implacablemente honesto

Tienes el contexto completo de la obra en tu memoria.`
        }]
      },
      contents: [{
        role: "user",
        parts: [{ text: fullContext }]
      }],
      ttlSeconds: CACHE_TTL_SECONDS,
    });
    
    console.log(`[CacheManager] Cache created: ${cache.name}`);
    
    const expiresAt = cache.expireTime ? new Date(cache.expireTime) : new Date(Date.now() + CACHE_TTL_SECONDS * 1000);
    
    return {
      success: true,
      cacheId: cache.name,
      cacheName: cache.displayName,
      expiresAt,
    };
    
  } catch (error) {
    console.error("[CacheManager] Error creating cache:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error creating cache",
    };
  }
}

/**
 * Check if a cache is still valid
 */
export async function isCacheValid(cacheId: string): Promise<boolean> {
  try {
    const cacheManager = new GoogleAICacheManager(GEMINI_API_KEY);
    const cache = await cacheManager.get(cacheId);
    
    if (!cache.expireTime) return false;
    
    const expiresAt = new Date(cache.expireTime);
    return expiresAt > new Date();
  } catch {
    return false;
  }
}

/**
 * Delete a cache when no longer needed
 */
export async function deleteCache(cacheId: string): Promise<boolean> {
  try {
    const cacheManager = new GoogleAICacheManager(GEMINI_API_KEY);
    await cacheManager.delete(cacheId);
    console.log(`[CacheManager] Cache deleted: ${cacheId}`);
    return true;
  } catch (error) {
    console.error("[CacheManager] Error deleting cache:", error);
    return false;
  }
}

/**
 * Get cache info
 */
export async function getCacheInfo(cacheId: string): Promise<CachedContent | null> {
  try {
    const cacheManager = new GoogleAICacheManager(GEMINI_API_KEY);
    return await cacheManager.get(cacheId);
  } catch {
    return null;
  }
}

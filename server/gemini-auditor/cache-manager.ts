/**
 * Gemini Context Caching Manager
 * Handles cache creation with automatic fallback to standard mode
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAICacheManager } from "@google/generative-ai/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const MODEL_NAME = "models/gemini-1.5-pro";
const CACHE_TTL_SECONDS = 3600;

export type AuditMode = 'CACHE' | 'STANDARD';

export interface ContextResult {
  success: boolean;
  mode: AuditMode;
  cacheId?: string;
  cacheName?: string;
  expiresAt?: Date;
  novelContent?: string;
  bibleContent?: string | null;
  error?: string;
}

let currentContext: ContextResult | null = null;

export function getModelName(): string {
  return MODEL_NAME;
}

export function getCurrentContext(): ContextResult | null {
  return currentContext;
}

/**
 * Initialize novel context - tries Cache first, falls back to Standard mode
 */
export async function initializeNovelContext(
  novelContent: string,
  bibleContent: string | null,
  novelTitle: string
): Promise<ContextResult> {
  console.log(`[CacheManager] Initializing context for: ${novelTitle}`);
  
  let fullContext = `=== NOVELA COMPLETA ===\n\n${novelContent}`;
  if (bibleContent) {
    fullContext += `\n\n=== BIBLIA DE LA HISTORIA ===\n\n${bibleContent}`;
  }
  
  console.log(`[CacheManager] Context size: ${fullContext.length} chars`);
  
  try {
    console.log("[CacheManager] Intentando activar Context Caching (Tier Pago)...");
    
    const cacheManager = new GoogleAICacheManager(GEMINI_API_KEY);
    
    const cache = await cacheManager.create({
      model: MODEL_NAME,
      displayName: `Novel Audit: ${novelTitle}`,
      systemInstruction: {
        role: "system",
        parts: [{
          text: `Eres un Editor Literario Senior. Tienes acceso a la novela completa y a la biblia de la historia. Responde SIEMPRE en formato JSON válido.`
        }]
      },
      contents: [{
        role: "user",
        parts: [{ text: fullContext }]
      }],
      ttlSeconds: CACHE_TTL_SECONDS,
    });
    
    console.log(`[CacheManager] Modo CACHÉ activado: ${cache.name}`);
    
    const expiresAt = cache.expireTime ? new Date(cache.expireTime) : new Date(Date.now() + CACHE_TTL_SECONDS * 1000);
    
    currentContext = {
      success: true,
      mode: 'CACHE',
      cacheId: cache.name,
      cacheName: cache.displayName,
      expiresAt,
    };
    
    return currentContext;
    
  } catch (error: any) {
    console.warn(`[CacheManager] No se pudo activar Caché: ${error.message}`);
    console.log("[CacheManager] Activando modo STANDARD (Fallback)...");
    
    currentContext = {
      success: true,
      mode: 'STANDARD',
      novelContent,
      bibleContent,
    };
    
    return currentContext;
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
    return new Date(cache.expireTime) > new Date();
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
    currentContext = null;
    return true;
  } catch (error) {
    console.error("[CacheManager] Error deleting cache:", error);
    return false;
  }
}

/**
 * Clear current context
 */
export function clearContext(): void {
  currentContext = null;
}

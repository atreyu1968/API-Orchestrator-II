/**
 * Agent Runner - Executes literary analysis agents against cached novel context
 * Supports parallel execution of multiple specialized agents
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAICacheManager } from "@google/generative-ai/server";
import type { AgentReport, AuditIssue } from "@shared/schema";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;

export type AgentType = 'CONTINUITY' | 'CHARACTER' | 'STYLE';

interface AgentConfig {
  type: AgentType;
  prompt: string;
  focusAreas: string[];
}

const AGENT_CONFIGS: Record<AgentType, AgentConfig> = {
  CONTINUITY: {
    type: 'CONTINUITY',
    focusAreas: ['Cronología', 'Objetos', 'Ubicaciones', 'Reglas del mundo'],
    prompt: `Eres el AGENTE DE CONTINUIDAD. Tu especialidad es detectar inconsistencias lógicas y temporales.

ANALIZA LA NOVELA COMPLETA Y BUSCA:

1. CRONOLOGÍA:
   - Contradicciones temporales (un personaje en dos lugares a la vez)
   - Eventos fuera de orden sin explicación narrativa
   - Saltos temporales inconsistentes
   - Edades de personajes que no cuadran

2. OBJETOS Y ELEMENTOS:
   - Objetos que aparecen/desaparecen sin lógica
   - Armas, herramientas o recursos usados inconsistentemente
   - Dinero o economía que no cuadra

3. UBICACIONES:
   - Distancias imposibles o inconsistentes
   - Descripciones contradictorias del mismo lugar
   - Personajes que llegan a lugares imposiblemente rápido

4. REGLAS DEL MUNDO:
   - Magia o tecnología usada inconsistentemente
   - Reglas establecidas que se rompen sin justificación
   - Límites que se ignoran convenientemente

RESPONDE EN ESTE FORMATO JSON EXACTO:
{
  "agentType": "CONTINUITY",
  "overallScore": [0-100, donde 100 es perfecto],
  "analysis": "[Resumen ejecutivo de 2-3 párrafos sobre el estado de la continuidad]",
  "issues": [
    {
      "location": "[Capítulo X, párrafo Y o cita textual exacta]",
      "description": "[Descripción clara del problema]",
      "severity": "CRITICAL|HIGH|MEDIUM|LOW",
      "suggestion": "[Cómo arreglarlo]"
    }
  ]
}`
  },
  
  CHARACTER: {
    type: 'CHARACTER',
    focusAreas: ['Psicología', 'Voz', 'Evolución', 'Motivaciones'],
    prompt: `Eres el AGENTE DE PERSONAJES. Tu especialidad es la psicología y coherencia de los personajes.

ANALIZA LA NOVELA COMPLETA Y EVALÚA:

1. EVOLUCIÓN EMOCIONAL:
   - ¿Los arcos de personajes están justificados por eventos de la trama?
   - ¿Hay cambios erráticos de personalidad sin motivación?
   - ¿Las transformaciones son graduales o abruptas sin razón?

2. VOZ Y MANERA DE HABLAR:
   - ¿Cada personaje tiene una voz distintiva?
   - ¿La voz se mantiene consistente o cambia arbitrariamente?
   - ¿Los diálogos suenan naturales para cada personaje?

3. MOTIVACIONES:
   - ¿Las acciones de los personajes tienen sentido según sus motivaciones?
   - ¿Hay decisiones que contradicen sus valores establecidos?
   - ¿Los antagonistas tienen motivaciones creíbles?

4. RELACIONES:
   - ¿Las dinámicas entre personajes evolucionan coherentemente?
   - ¿Hay cambios de relación injustificados?
   - ¿Las lealtades y traiciones tienen fundamento?

RESPONDE EN ESTE FORMATO JSON EXACTO:
{
  "agentType": "CHARACTER",
  "overallScore": [0-100, donde 100 es perfecto],
  "analysis": "[Resumen ejecutivo de 2-3 párrafos sobre la coherencia de personajes]",
  "issues": [
    {
      "location": "[Capítulo X, párrafo Y o cita textual exacta]",
      "description": "[Descripción clara del problema]",
      "severity": "CRITICAL|HIGH|MEDIUM|LOW",
      "suggestion": "[Cómo arreglarlo]"
    }
  ]
}`
  },
  
  STYLE: {
    type: 'STYLE',
    focusAreas: ['Prosa', 'Ritmo', 'Diálogos', 'Show vs Tell'],
    prompt: `Eres el AGENTE DE ESTILO. Tu especialidad es la calidad de la prosa y técnica narrativa.

ANALIZA LA NOVELA COMPLETA Y EVALÚA:

1. SHOW DON'T TELL:
   - Exceso de exposición directa vs. demostración a través de acciones
   - Emociones "dichas" en vez de "mostradas"
   - Info-dumps que rompen el flujo narrativo

2. REPETICIONES Y MULETILLAS:
   - Palabras o frases usadas excesivamente
   - Estructuras sintácticas repetitivas
   - Tics de escritura (empezar siempre igual, etc.)

3. DIÁLOGOS:
   - Diálogos robóticos o poco naturales
   - Personajes que suenan todos igual
   - Diálogos demasiado expositivos ("As you know, Bob...")

4. RITMO Y PACING:
   - Secciones que se estancan innecesariamente
   - Escenas de acción que pierden tensión
   - Transiciones abruptas o torpes
   - Desequilibrio entre acción y reflexión

5. PROSA:
   - Calidad de las descripciones
   - Uso de metáforas y lenguaje figurativo
   - Variedad y fluidez de las oraciones

RESPONDE EN ESTE FORMATO JSON EXACTO:
{
  "agentType": "STYLE",
  "overallScore": [0-100, donde 100 es perfecto],
  "analysis": "[Resumen ejecutivo de 2-3 párrafos sobre la calidad estilística]",
  "issues": [
    {
      "location": "[Capítulo X, párrafo Y o cita textual exacta]",
      "description": "[Descripción clara del problema]",
      "severity": "CRITICAL|HIGH|MEDIUM|LOW",
      "suggestion": "[Cómo arreglarlo]"
    }
  ]
}`
  }
};

/**
 * Run a single agent against the cached novel context
 */
export async function runAgent(cacheId: string, agentType: AgentType): Promise<AgentReport> {
  console.log(`[AgentRunner] Running ${agentType} agent...`);
  
  const config = AGENT_CONFIGS[agentType];
  
  try {
    const cacheManager = new GoogleAICacheManager(GEMINI_API_KEY);
    const cache = await cacheManager.get(cacheId);
    
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModelFromCachedContent(cache, {
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.3, // Low temperature for consistent analysis
        maxOutputTokens: 8192,
      },
    });
    
    const result = await model.generateContent(config.prompt);
    const response = result.response;
    const text = response.text();
    
    // Parse JSON response
    const parsed = JSON.parse(text) as AgentReport;
    
    // Validate structure
    if (!parsed.agentType || typeof parsed.overallScore !== 'number' || !Array.isArray(parsed.issues)) {
      throw new Error("Invalid agent report structure");
    }
    
    console.log(`[AgentRunner] ${agentType} complete: score ${parsed.overallScore}, ${parsed.issues.length} issues`);
    
    return {
      agentType: config.type,
      overallScore: Math.min(100, Math.max(0, parsed.overallScore)),
      analysis: parsed.analysis || "",
      issues: parsed.issues.map(issue => ({
        location: issue.location || "Unknown",
        description: issue.description || "",
        severity: (['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(issue.severity) 
          ? issue.severity 
          : 'MEDIUM') as AuditIssue['severity'],
        suggestion: issue.suggestion || "",
      })),
    };
    
  } catch (error) {
    console.error(`[AgentRunner] ${agentType} agent error:`, error);
    
    // Return error report
    return {
      agentType: config.type,
      overallScore: 0,
      analysis: `Error durante el análisis: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      issues: [{
        location: "Sistema",
        description: `El agente de ${agentType} encontró un error durante el análisis`,
        severity: 'HIGH',
        suggestion: "Reintentar el análisis o revisar la conexión con Gemini",
      }],
    };
  }
}

/**
 * Run all agents in parallel against the same cached context
 */
export async function runAllAgents(cacheId: string): Promise<AgentReport[]> {
  console.log("[AgentRunner] Starting parallel agent execution...");
  
  const results = await Promise.all([
    runAgent(cacheId, 'CONTINUITY'),
    runAgent(cacheId, 'CHARACTER'),
    runAgent(cacheId, 'STYLE'),
  ]);
  
  console.log("[AgentRunner] All agents completed");
  
  return results;
}

/**
 * Count critical issues from all reports
 */
export function countCriticalIssues(reports: AgentReport[]): number {
  return reports.reduce((count, report) => {
    return count + report.issues.filter(i => i.severity === 'CRITICAL').length;
  }, 0);
}

/**
 * Calculate overall score from all reports
 */
export function calculateOverallScore(reports: AgentReport[]): number {
  if (reports.length === 0) return 0;
  
  const totalScore = reports.reduce((sum, report) => sum + report.overallScore, 0);
  return Math.round(totalScore / reports.length);
}

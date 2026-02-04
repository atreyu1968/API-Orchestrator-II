/**
 * Gemini Auditor - Main module
 * Orchestrates the literary analysis pipeline using Gemini Context Caching
 */

export { initializeNovelContext, isCacheValid, deleteCache, getCacheInfo } from "./cache-manager";
export { runAgent, runAllAgents, countCriticalIssues, calculateOverallScore, type AgentType } from "./agent-runner";

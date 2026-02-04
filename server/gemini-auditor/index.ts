/**
 * Gemini Auditor - Main module
 * Orchestrates the literary analysis pipeline using Gemini Context Caching
 */

export { initializeNovelContext, isCacheValid, deleteCache, clearContext, getCurrentContext, getModelName, type ContextResult, type AuditMode } from "./cache-manager";
export { runAgent, runAllAgents, countCriticalIssues, calculateOverallScore, type AgentType } from "./agent-runner";

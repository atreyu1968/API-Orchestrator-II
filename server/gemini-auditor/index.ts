/**
 * Gemini Auditor - Main module
 * Orchestrates the literary analysis pipeline using Gemini
 */

export { initializeNovelContext, clearContext, getCurrentContext, getModelName, type ContextResult, type AuditMode } from "./cache-manager";
export { runAgent, runAllAgents, runAllAgentsWithProgress, runMissingAgents, countCriticalIssues, calculateOverallScore, type AgentType, type AgentReportWithStatus } from "./agent-runner";

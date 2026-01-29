import { storage } from "./storage";
import { ReeditOrchestrator } from "./orchestrators/reedit-orchestrator";

const activeReeditOrchestrators = new Map<number, ReeditOrchestrator>();

// Helper to create unique generation token for reedit projects
function createReeditGenerationToken(projectId: number): string {
  return `reedit_${projectId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// Watchdog interval (check every 2 minutes)
const WATCHDOG_INTERVAL_MS = 2 * 60 * 1000;
// Projects without heartbeat for more than 8 minutes are considered frozen
const FROZEN_THRESHOLD_MS = 8 * 60 * 1000;
// Cooldown between recovery attempts for same project (10 minutes)
const RECOVERY_COOLDOWN_MS = 10 * 60 * 1000;
// Maximum recovery attempts before giving up
const MAX_RECOVERY_ATTEMPTS = 3;

// Track recovery attempts in memory (projectId -> { count, lastAttempt })
const recoveryTracker = new Map<number, { count: number; lastAttempt: Date }>();

function canAttemptRecovery(projectId: number): boolean {
  const tracker = recoveryTracker.get(projectId);
  if (!tracker) return true;
  
  const now = new Date();
  const timeSinceLastAttempt = now.getTime() - tracker.lastAttempt.getTime();
  
  // Check cooldown
  if (timeSinceLastAttempt < RECOVERY_COOLDOWN_MS) {
    console.log(`[ReeditWatchdog] Project ${projectId} in cooldown (${Math.round((RECOVERY_COOLDOWN_MS - timeSinceLastAttempt) / 60000)} min remaining)`);
    return false;
  }
  
  // Check max attempts
  if (tracker.count >= MAX_RECOVERY_ATTEMPTS) {
    console.log(`[ReeditWatchdog] Project ${projectId} exceeded max recovery attempts (${tracker.count}/${MAX_RECOVERY_ATTEMPTS})`);
    return false;
  }
  
  return true;
}

function recordRecoveryAttempt(projectId: number): void {
  const tracker = recoveryTracker.get(projectId);
  if (tracker) {
    tracker.count++;
    tracker.lastAttempt = new Date();
  } else {
    recoveryTracker.set(projectId, { count: 1, lastAttempt: new Date() });
  }
}

function resetRecoveryTracker(projectId: number): void {
  recoveryTracker.delete(projectId);
}

let watchdogInterval: NodeJS.Timeout | null = null;

export function getActiveReeditOrchestrators() {
  return activeReeditOrchestrators;
}

export async function watchdogCheck(): Promise<void> {
  try {
    const projects = await storage.getAllReeditProjects();
    const processingProjects = projects.filter(p => p.status === "processing");
    
    if (processingProjects.length === 0) return;
    
    const now = new Date();
    
    for (const project of processingProjects) {
      const heartbeatAt = project.heartbeatAt ? new Date(project.heartbeatAt) : null;
      
      // If no heartbeat ever set, check createdAt
      const lastActivity = heartbeatAt || (project.createdAt ? new Date(project.createdAt) : null);
      
      if (!lastActivity) continue;
      
      const timeSinceActivity = now.getTime() - lastActivity.getTime();
      
      if (timeSinceActivity > FROZEN_THRESHOLD_MS) {
        // Check if orchestrator is still in active map (might be slow but not dead)
        if (activeReeditOrchestrators.has(project.id)) {
          console.log(`[ReeditWatchdog] Project ${project.id} has stale heartbeat but orchestrator still in memory - skipping recovery`);
          continue;
        }
        
        // Check recovery limits
        if (!canAttemptRecovery(project.id)) {
          // Exceeded max attempts - mark as error permanently
          const tracker = recoveryTracker.get(project.id);
          if (tracker && tracker.count >= MAX_RECOVERY_ATTEMPTS) {
            await storage.updateReeditProject(project.id, {
              status: "error",
              errorMessage: `Auto-recovery fallido después de ${tracker.count} intentos. Reanudar manualmente.`,
            });
            console.log(`[ReeditWatchdog] Project ${project.id} marked as permanent error after ${tracker.count} recovery attempts`);
          }
          continue;
        }
        
        console.log(`[ReeditWatchdog] Project ${project.id} frozen - no heartbeat for ${Math.round(timeSinceActivity / 60000)} minutes. AUTO-RESTARTING...`);
        
        // Record this recovery attempt
        recordRecoveryAttempt(project.id);
        const tracker = recoveryTracker.get(project.id);
        console.log(`[ReeditWatchdog] Recovery attempt ${tracker?.count}/${MAX_RECOVERY_ATTEMPTS} for project ${project.id}`);
        
        // CRITICAL: Cancel any existing orchestrator BEFORE starting a new one
        const existingOrchestrator = activeReeditOrchestrators.get(project.id);
        if (existingOrchestrator) {
          console.log(`[ReeditWatchdog] Cancelling existing orchestrator for project ${project.id}`);
          existingOrchestrator.cancel();
          activeReeditOrchestrators.delete(project.id);
          // Give it a moment to stop
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Generate new token to invalidate any lingering processes
        const generationToken = createReeditGenerationToken(project.id);
        console.log(`[ReeditWatchdog] Generated new token for project ${project.id}: ${generationToken}`);
        
        // Update status and token to show recovery is happening
        await storage.updateReeditProject(project.id, {
          status: "processing",
          errorMessage: null,
          heartbeatAt: new Date(), // Reset heartbeat to prevent immediate re-detection
          generationToken, // New token invalidates any old processes
        });
        
        console.log(`[ReeditWatchdog] Project ${project.id} - starting auto-recovery orchestrator`);
        
        // AUTO-RESTART: Create new orchestrator with the new token
        const orchestrator = new ReeditOrchestrator(generationToken);
        activeReeditOrchestrators.set(project.id, orchestrator);
        
        orchestrator.processProject(project.id).then(() => {
          console.log(`[ReeditWatchdog] Project ${project.id} completed successfully after auto-recovery.`);
          activeReeditOrchestrators.delete(project.id);
          // Reset recovery tracker on success
          resetRecoveryTracker(project.id);
        }).catch(async (error) => {
          console.error(`[ReeditWatchdog] Project ${project.id} failed after auto-recovery:`, error);
          activeReeditOrchestrators.delete(project.id);
          
          try {
            await storage.updateReeditProject(project.id, {
              status: "error",
              errorMessage: error instanceof Error ? error.message : "Error durante auto-recovery",
            });
          } catch (e) {
            console.error(`[ReeditWatchdog] Failed to update project ${project.id} status:`, e);
          }
        });
        
        console.log(`[ReeditWatchdog] Project ${project.id} auto-recovery started in background`);
        
        // Only handle one frozen project per check cycle to avoid overload
        break;
      }
    }
  } catch (error) {
    console.error("[ReeditWatchdog] Error during watchdog check:", error);
  }
}

export function startWatchdog(): void {
  if (watchdogInterval) {
    console.log("[ReeditWatchdog] Watchdog already running");
    return;
  }
  
  console.log("[ReeditWatchdog] Starting watchdog (checking every 2 minutes for frozen processes)");
  watchdogInterval = setInterval(watchdogCheck, WATCHDOG_INTERVAL_MS);
  
  // Run initial check
  watchdogCheck();
}

export function stopWatchdog(): void {
  if (watchdogInterval) {
    clearInterval(watchdogInterval);
    watchdogInterval = null;
    console.log("[ReeditWatchdog] Watchdog stopped");
  }
}

export async function autoResumeReeditProjects(): Promise<void> {
  console.log("[ReeditAutoResume] Checking for projects that need to be resumed...");
  
  try {
    const projects = await storage.getAllReeditProjects();
    const processingProjects = projects.filter(p => p.status === "processing");
    
    if (processingProjects.length === 0) {
      console.log("[ReeditAutoResume] No reedit projects in processing state.");
      return;
    }
    
    console.log(`[ReeditAutoResume] Found ${processingProjects.length} project(s) to resume:`, 
      processingProjects.map(p => `${p.id}: ${p.title}`));
    
    for (const project of processingProjects) {
      if (activeReeditOrchestrators.has(project.id)) {
        console.log(`[ReeditAutoResume] Project ${project.id} already has an active orchestrator, skipping.`);
        continue;
      }
      
      console.log(`[ReeditAutoResume] Auto-resuming project ${project.id}: "${project.title}"...`);
      
      // Generate token to prevent parallel executions
      const generationToken = createReeditGenerationToken(project.id);
      await storage.updateReeditProject(project.id, { generationToken });
      
      const orchestrator = new ReeditOrchestrator(generationToken);
      activeReeditOrchestrators.set(project.id, orchestrator);
      
      orchestrator.processProject(project.id).then(() => {
        console.log(`[ReeditAutoResume] Project ${project.id} completed successfully.`);
        activeReeditOrchestrators.delete(project.id);
      }).catch(async (error) => {
        console.error(`[ReeditAutoResume] Project ${project.id} failed:`, error);
        activeReeditOrchestrators.delete(project.id);
        
        try {
          await storage.updateReeditProject(project.id, {
            status: "error",
            errorMessage: error instanceof Error ? error.message : "Unknown error during auto-resume",
          });
        } catch (e) {
          console.error(`[ReeditAutoResume] Failed to update project ${project.id} status:`, e);
        }
      });
      
      console.log(`[ReeditAutoResume] Project ${project.id} orchestrator started in background.`);
    }
  } catch (error) {
    console.error("[ReeditAutoResume] Error during auto-resume:", error);
  }
}

export async function resumeReeditProject(projectId: number): Promise<{ success: boolean; message: string }> {
  const project = await storage.getReeditProject(projectId);
  
  if (!project) {
    return { success: false, message: "Project not found" };
  }

  if (activeReeditOrchestrators.has(projectId)) {
    return { success: false, message: "Project is already being processed" };
  }

  // Generate token to prevent parallel executions
  const generationToken = createReeditGenerationToken(projectId);
  
  await storage.updateReeditProject(projectId, { 
    status: "processing", 
    errorMessage: null,
    generationToken
  });
  console.log(`[ReeditResume] Cleared error state for project ${projectId}, starting orchestrator with token ${generationToken}...`);

  const orchestrator = new ReeditOrchestrator(generationToken);
  activeReeditOrchestrators.set(projectId, orchestrator);

  console.log(`[ReeditResume] Calling processProject for project ${projectId}`);
  orchestrator.processProject(projectId).then(() => {
    console.log(`[ReeditResume] processProject completed for project ${projectId}`);
    activeReeditOrchestrators.delete(projectId);
  }).catch(async (error) => {
    console.error(`[ReeditResume] processProject error for project ${projectId}:`, error);
    activeReeditOrchestrators.delete(projectId);
    
    try {
      await storage.updateReeditProject(projectId, {
        status: "error",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
    } catch (e) {
      console.error(`[ReeditResume] Failed to update project ${projectId} status:`, e);
    }
  });

  return { success: true, message: "Reedit processing resumed" };
}

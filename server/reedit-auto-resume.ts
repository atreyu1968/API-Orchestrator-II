import { storage } from "./storage";
import { ReeditOrchestrator } from "./orchestrators/reedit-orchestrator";

const activeReeditOrchestrators = new Map<number, ReeditOrchestrator>();

// Watchdog interval (check every 2 minutes)
const WATCHDOG_INTERVAL_MS = 2 * 60 * 1000;
// Projects without heartbeat for more than 8 minutes are considered frozen
const FROZEN_THRESHOLD_MS = 8 * 60 * 1000;

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
        console.log(`[ReeditWatchdog] Project ${project.id} frozen - no heartbeat for ${Math.round(timeSinceActivity / 60000)} minutes`);
        
        // Remove from active orchestrators (it's probably stuck)
        activeReeditOrchestrators.delete(project.id);
        
        // Mark as error so user can resume
        await storage.updateReeditProject(project.id, {
          status: "error",
          errorMessage: `Proceso congelado detectado (sin actividad por ${Math.round(timeSinceActivity / 60000)} minutos). Puede reanudar el proceso.`,
        });
        
        console.log(`[ReeditWatchdog] Project ${project.id} marked as error for recovery`);
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
      
      const orchestrator = new ReeditOrchestrator();
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

  await storage.updateReeditProject(projectId, { 
    status: "processing", 
    errorMessage: null 
  });
  console.log(`[ReeditResume] Cleared error state for project ${projectId}, starting orchestrator...`);

  const orchestrator = new ReeditOrchestrator();
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

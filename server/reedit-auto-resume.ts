import { storage } from "./storage";
import { ReeditOrchestrator } from "./orchestrators/reedit-orchestrator";

const activeReeditOrchestrators = new Map<number, ReeditOrchestrator>();

export function getActiveReeditOrchestrators() {
  return activeReeditOrchestrators;
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

import { storage } from "./storage";
import { Orchestrator } from "./orchestrator";
import type { Project, ProjectQueueItem, QueueState } from "@shared/schema";

type QueueEventCallback = (event: QueueEvent) => void;

interface QueueEvent {
  type: "queue_started" | "queue_stopped" | "queue_paused" | "project_started" | "project_completed" | "project_failed" | "project_skipped" | "queue_empty";
  projectId?: number;
  projectTitle?: string;
  message?: string;
  error?: string;
}

const HEARTBEAT_TIMEOUT_MS = 8 * 60 * 1000; // 8 minutes without activity = frozen
const HEARTBEAT_CHECK_INTERVAL_MS = 60 * 1000; // Check every minute

export class QueueManager {
  private isRunning = false;
  private isPaused = false;
  private currentOrchestrator: Orchestrator | null = null;
  private eventCallbacks: Set<QueueEventCallback> = new Set();
  private checkInterval: NodeJS.Timeout | null = null;
  private lastHeartbeat: Date | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private currentProjectId: number | null = null;
  private autoRecoveryCount = 0;

  constructor() {}
  
  private updateHeartbeat() {
    this.lastHeartbeat = new Date();
  }
  
  private startHeartbeatMonitor() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    this.lastHeartbeat = new Date();
    this.heartbeatInterval = setInterval(async () => {
      await this.checkHeartbeat();
    }, HEARTBEAT_CHECK_INTERVAL_MS);
  }
  
  private stopHeartbeatMonitor() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    this.lastHeartbeat = null;
  }
  
  private async checkHeartbeat(): Promise<void> {
    if (!this.isRunning || this.isPaused || !this.currentProjectId) {
      return;
    }
    
    if (!this.lastHeartbeat) {
      return;
    }
    
    const timeSinceLastHeartbeat = Date.now() - this.lastHeartbeat.getTime();
    
    if (timeSinceLastHeartbeat > HEARTBEAT_TIMEOUT_MS) {
      console.log(`[QueueManager] FROZEN DETECTED: No activity for ${Math.round(timeSinceLastHeartbeat / 60000)} minutes. Auto-recovering...`);
      await this.autoRecover();
    }
  }
  
  private async autoRecover(): Promise<void> {
    if (!this.currentProjectId) return;
    
    this.autoRecoveryCount++;
    const projectId = this.currentProjectId;
    
    console.log(`[QueueManager] Auto-recovery attempt #${this.autoRecoveryCount} for project ${projectId}`);
    
    // Log the recovery event
    try {
      await storage.createActivityLog({
        projectId,
        level: "warn",
        message: `Auto-recovery triggered after ${HEARTBEAT_TIMEOUT_MS / 60000} minutes of inactivity (attempt #${this.autoRecoveryCount})`,
        agentRole: "system",
        metadata: { autoRecoveryCount: this.autoRecoveryCount },
      });
    } catch (e) {
      console.error("[QueueManager] Failed to log auto-recovery event:", e);
    }
    
    // Get the queue item and reset it
    const queueItem = await storage.getQueueItemByProject(projectId);
    if (queueItem) {
      await storage.updateQueueItem(queueItem.id, {
        status: "waiting",
        startedAt: null,
        errorMessage: `Auto-recovery after freeze (attempt #${this.autoRecoveryCount})`,
      });
    }
    
    // Clear current state
    await storage.updateQueueState({ currentProjectId: null });
    this.currentOrchestrator = null;
    this.currentProjectId = null;
    this.stopHeartbeatMonitor();
    
    // Wait a bit and restart
    console.log(`[QueueManager] Waiting 30s before restarting project ${projectId}...`);
    setTimeout(() => {
      if (this.isRunning && !this.isPaused) {
        this.processQueue();
      }
    }, 30000);
  }

  async initialize(): Promise<void> {
    // Start global frozen project monitor (survives deploys)
    this.startGlobalFrozenMonitor();
    
    const state = await storage.getQueueState();
    if (!state) return;

    // Check for frozen projects first (based on activity logs, not memory)
    await this.checkForFrozenProjects();

    // If the server crashed while running, clean up and optionally restart
    if (state.status === "running" && state.currentProjectId) {
      console.log("[QueueManager] Detected incomplete queue state from previous session");
      
      // Check if the project was actually completed
      const project = await storage.getProject(state.currentProjectId);
      if (project?.status === "completed") {
        // Project finished but queue didn't advance - clean up and continue
        const queueItem = await storage.getQueueItemByProject(state.currentProjectId);
        if (queueItem && queueItem.status === "processing") {
          await storage.updateQueueItem(queueItem.id, {
            status: "completed",
            completedAt: new Date(),
          });
        }
        await storage.updateQueueState({ currentProjectId: null });
        console.log("[QueueManager] Cleaned up completed project, resuming queue");
        
        // Auto-resume the queue
        this.isRunning = true;
        this.isPaused = false;
        setTimeout(() => this.processQueue(), 2000);
      } else {
        // Project was in progress - reset it to allow re-processing
        const queueItem = await storage.getQueueItemByProject(state.currentProjectId);
        if (queueItem && queueItem.status === "processing") {
          await storage.updateQueueItem(queueItem.id, {
            status: "waiting",
            startedAt: null,
          });
        }
        await storage.updateQueueState({ currentProjectId: null });
        console.log("[QueueManager] Reset incomplete project, queue ready to resume");
        
        // Auto-resume the queue
        this.isRunning = true;
        this.isPaused = false;
        setTimeout(() => this.processQueue(), 2000);
      }
    } else if (state.status === "running") {
      // Queue was running with no current project - just resume
      console.log("[QueueManager] Resuming queue from previous session");
      this.isRunning = true;
      this.isPaused = false;
      setTimeout(() => this.processQueue(), 2000);
    } else if (state.status === "paused") {
      this.isPaused = true;
      console.log("[QueueManager] Queue is paused, waiting for manual resume");
    }
  }
  
  private globalFrozenInterval: NodeJS.Timeout | null = null;
  
  private startGlobalFrozenMonitor() {
    if (this.globalFrozenInterval) {
      clearInterval(this.globalFrozenInterval);
    }
    
    // Check every 2 minutes for frozen projects (uses DB, survives deploys)
    this.globalFrozenInterval = setInterval(async () => {
      await this.checkForFrozenProjects();
    }, 2 * 60 * 1000);
    
    console.log("[QueueManager] Global frozen project monitor started");
  }
  
  private async checkForFrozenProjects(): Promise<void> {
    try {
      // Get all projects in "generating" status
      const projects = await storage.getAllProjects();
      const generatingProjects = projects.filter((p: Project) => p.status === "generating");
      
      for (const project of generatingProjects) {
        const lastActivity = await storage.getLastActivityLogTime(project.id);
        
        if (lastActivity) {
          const timeSinceActivity = Date.now() - lastActivity.getTime();
          
          if (timeSinceActivity > HEARTBEAT_TIMEOUT_MS) {
            console.log(`[QueueManager] FROZEN PROJECT DETECTED: "${project.title}" (ID: ${project.id}) - no activity for ${Math.round(timeSinceActivity / 60000)} minutes`);
            
            // Log the recovery event
            await storage.createActivityLog({
              projectId: project.id,
              level: "warn",
              message: `Auto-recovery: proyecto congelado detectado (${Math.round(timeSinceActivity / 60000)} min sin actividad). Reiniciando...`,
              agentRole: "system",
            });
            
            // Reset project status to allow resume
            await storage.updateProject(project.id, { status: "paused" });
            
            // Clear queue state if this was the current project
            const state = await storage.getQueueState();
            if (state?.currentProjectId === project.id) {
              await storage.updateQueueState({ currentProjectId: null });
              this.currentOrchestrator = null;
              this.currentProjectId = null;
            }
            
            // Reset queue item to waiting
            const queueItem = await storage.getQueueItemByProject(project.id);
            if (queueItem && queueItem.status === "processing") {
              await storage.updateQueueItem(queueItem.id, {
                status: "waiting",
                startedAt: null,
                errorMessage: `Auto-recovery after ${Math.round(timeSinceActivity / 60000)} min freeze`,
              });
            }
            
            // Trigger resume after short delay
            console.log(`[QueueManager] Restarting frozen project "${project.title}" in 10s...`);
            setTimeout(async () => {
              if (!this.isRunning) {
                this.isRunning = true;
                this.isPaused = false;
                await storage.updateQueueState({ status: "running" });
              }
              this.processQueue();
            }, 10000);
            
            break; // Handle one frozen project at a time
          }
        }
      }
    } catch (error) {
      console.error("[QueueManager] Error checking for frozen projects:", error);
    }
  }

  addListener(callback: QueueEventCallback) {
    this.eventCallbacks.add(callback);
    return () => this.eventCallbacks.delete(callback);
  }

  private emit(event: QueueEvent) {
    this.eventCallbacks.forEach(cb => {
      try {
        cb(event);
      } catch (e) {
        console.error("Queue event callback error:", e);
      }
    });
  }

  async getState(): Promise<QueueState> {
    let state = await storage.getQueueState();
    if (!state) {
      state = await storage.updateQueueState({ status: "stopped" });
    }
    return state;
  }

  async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    this.isPaused = false;
    await storage.updateQueueState({ status: "running" });
    this.emit({ type: "queue_started", message: "Queue processing started" });

    this.processQueue();
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    this.isPaused = false;
    this.stopHeartbeatMonitor();
    this.currentProjectId = null;
    
    // Reset any item currently in "processing" status back to "waiting"
    const state = await storage.getQueueState();
    if (state?.currentProjectId) {
      const queueItem = await storage.getQueueItemByProject(state.currentProjectId);
      if (queueItem && queueItem.status === "processing") {
        await storage.updateQueueItem(queueItem.id, {
          status: "waiting",
          startedAt: null,
        });
      }
    }
    
    await storage.updateQueueState({ status: "stopped", currentProjectId: null });
    this.currentOrchestrator = null;
    this.emit({ type: "queue_stopped", message: "Queue processing stopped" });
    
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  async pause(): Promise<void> {
    this.isPaused = true;
    this.stopHeartbeatMonitor();
    await storage.updateQueueState({ status: "paused" });
    this.emit({ type: "queue_paused", message: "Queue processing paused" });
  }

  async resume(): Promise<void> {
    if (!this.isRunning) {
      await this.start();
      return;
    }
    
    this.isPaused = false;
    await storage.updateQueueState({ status: "running" });
    this.emit({ type: "queue_started", message: "Queue processing resumed" });
    
    this.processQueue();
  }

  async skipCurrent(): Promise<void> {
    const state = await storage.getQueueState();
    if (state?.currentProjectId) {
      this.stopHeartbeatMonitor();
      this.currentProjectId = null;
      
      const queueItem = await storage.getQueueItemByProject(state.currentProjectId);
      if (queueItem) {
        await storage.updateQueueItem(queueItem.id, {
          status: "skipped",
          completedAt: new Date(),
        });
        this.emit({
          type: "project_skipped",
          projectId: state.currentProjectId,
          message: "Current project skipped",
        });
      }
      await storage.updateQueueState({ currentProjectId: null });
      
      if (this.isRunning && !this.isPaused) {
        this.processQueue();
      }
    }
  }

  private async processQueue(): Promise<void> {
    if (!this.isRunning || this.isPaused) return;

    const state = await this.getState();

    if (state.currentProjectId) {
      return;
    }

    const nextItem = await storage.getNextInQueue();
    
    if (!nextItem) {
      this.emit({ type: "queue_empty", message: "No projects in queue" });
      
      if (state.autoAdvance) {
        this.checkInterval = setInterval(async () => {
          if (!this.isRunning || this.isPaused) {
            if (this.checkInterval) clearInterval(this.checkInterval);
            return;
          }
          
          const next = await storage.getNextInQueue();
          if (next) {
            if (this.checkInterval) clearInterval(this.checkInterval);
            this.processQueue();
          }
        }, 10000);
      }
      return;
    }

    await this.processProject(nextItem);
  }

  private async processProject(queueItem: ProjectQueueItem): Promise<void> {
    const project = await storage.getProject(queueItem.projectId);
    if (!project) {
      await storage.updateQueueItem(queueItem.id, {
        status: "failed",
        completedAt: new Date(),
        errorMessage: "Project not found",
      });
      this.processQueue();
      return;
    }

    await storage.updateQueueItem(queueItem.id, {
      status: "processing",
      startedAt: new Date(),
    });

    await storage.updateQueueState({ currentProjectId: project.id });
    this.currentProjectId = project.id;
    this.autoRecoveryCount = 0;
    this.startHeartbeatMonitor();

    this.emit({
      type: "project_started",
      projectId: project.id,
      projectTitle: project.title,
      message: `Starting generation of: ${project.title}`,
    });

    const self = this;
    const orchestrator = new Orchestrator({
      onAgentStatus: async (role, status, message) => {
        self.updateHeartbeat();
        console.log(`[Queue] ${project.title} - ${role}: ${status}`, message || "");
      },
      onChapterComplete: async (chapterNumber, wordCount, chapterTitle) => {
        self.updateHeartbeat();
        console.log(`[Queue] ${project.title} - Chapter ${chapterNumber} complete: ${wordCount} words`);
      },
      onChapterRewrite: async () => {
        self.updateHeartbeat();
      },
      onChapterStatusChange: async () => {
        self.updateHeartbeat();
      },
      onProjectComplete: async () => {
        self.stopHeartbeatMonitor();
        self.currentProjectId = null;
        await self.handleProjectComplete(queueItem, project);
      },
      onError: async (error) => {
        self.stopHeartbeatMonitor();
        self.currentProjectId = null;
        await self.handleProjectError(queueItem, project, error);
      },
    });

    this.currentOrchestrator = orchestrator;

    try {
      if (project.status === "paused") {
        await orchestrator.resumeNovel(project);
      } else {
        await orchestrator.generateNovel(project);
      }
    } catch (error) {
      await this.handleProjectError(queueItem, project, String(error));
    }
  }

  private async handleProjectComplete(queueItem: ProjectQueueItem, project: Project): Promise<void> {
    await storage.updateQueueItem(queueItem.id, {
      status: "completed",
      completedAt: new Date(),
    });

    await storage.updateQueueState({ currentProjectId: null });
    this.currentOrchestrator = null;

    this.emit({
      type: "project_completed",
      projectId: project.id,
      projectTitle: project.title,
      message: `Completed: ${project.title}`,
    });

    const state = await this.getState();
    
    if (state.pauseAfterEach) {
      await this.pause();
      return;
    }

    if (state.autoAdvance) {
      setTimeout(() => this.processQueue(), 5000);
    }
  }

  private async handleProjectError(queueItem: ProjectQueueItem, project: Project, error: string): Promise<void> {
    const state = await this.getState();
    const isRateLimit = error.includes("RATELIMIT") || error.includes("Rate limit") || error.includes("429");

    this.emit({
      type: "project_failed",
      projectId: project.id,
      projectTitle: project.title,
      error,
      message: `Error: ${project.title} - ${error}`,
    });

    if (!state.skipOnError) {
      if (isRateLimit) {
        console.log(`[QueueManager] Rate limit for ${project.title}. Waiting 120s before retry...`);
        await storage.updateQueueItem(queueItem.id, {
          status: "waiting",
          startedAt: null,
          errorMessage: error,
        });
        await storage.updateQueueState({ currentProjectId: null });
        this.currentOrchestrator = null;
        
        setTimeout(() => {
          if (this.isRunning && !this.isPaused) {
            this.processQueue();
          }
        }, 120000);
      } else {
        await storage.updateQueueItem(queueItem.id, {
          status: "failed",
          completedAt: new Date(),
          errorMessage: error,
        });
        await storage.updateQueueState({ currentProjectId: null });
        this.currentOrchestrator = null;
        await this.pause();
      }
    } else {
      await storage.updateQueueItem(queueItem.id, {
        status: "failed",
        completedAt: new Date(),
        errorMessage: error,
      });
      await storage.updateQueueState({ currentProjectId: null });
      this.currentOrchestrator = null;
      
      if (state.autoAdvance) {
        setTimeout(() => this.processQueue(), 5000);
      }
    }
  }

  isProcessing(): boolean {
    return this.isRunning && !this.isPaused;
  }

  getCurrentStatus(): { isRunning: boolean; isPaused: boolean } {
    return { isRunning: this.isRunning, isPaused: this.isPaused };
  }
}

export const queueManager = new QueueManager();

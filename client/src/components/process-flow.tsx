import { Check, Brain, Pencil, Eye, ArrowRight, Layers, Scissors, Compass, Shield, BookOpen } from "lucide-react";

export type AgentRole = 
  | "global-architect" 
  | "chapter-architect" 
  | "ghostwriter-v2" 
  | "smart-editor" 
  | "summarizer" 
  | "narrative-director"
  | "universal-consistency"
  | "beta-reader"
  | "orchestrator"
  | "system";

type StageStatus = "pending" | "active" | "completed";

interface ProcessFlowProps {
  currentStage: AgentRole | null;
  completedStages: AgentRole[];
}

const stages: { role: AgentRole; name: string; icon: React.ReactNode }[] = [
  { role: "global-architect", name: "Arquitecto Global", icon: <Brain className="h-4 w-4" /> },
  { role: "chapter-architect", name: "Diseñador Escenas", icon: <Layers className="h-4 w-4" /> },
  { role: "ghostwriter-v2", name: "Escritor Escenas", icon: <Pencil className="h-4 w-4" /> },
  { role: "universal-consistency", name: "Guardián", icon: <Shield className="h-4 w-4" /> },
  { role: "smart-editor", name: "Editor Inteligente", icon: <Eye className="h-4 w-4" /> },
  { role: "summarizer", name: "Compresor", icon: <Scissors className="h-4 w-4" /> },
  { role: "narrative-director", name: "Director Narrativo", icon: <Compass className="h-4 w-4" /> },
  { role: "beta-reader", name: "El Crítico", icon: <BookOpen className="h-4 w-4" /> },
];

function getStageStatus(role: AgentRole, currentStage: AgentRole | null, completedStages: AgentRole[]): StageStatus {
  if (completedStages.includes(role)) return "completed";
  if (currentStage === role) return "active";
  return "pending";
}

export function ProcessFlow({ currentStage, completedStages }: ProcessFlowProps) {
  return (
    <div className="flex items-center justify-center gap-2 p-4 flex-wrap" data-testid="process-flow">
      {stages.map((stage, index) => {
        const status = getStageStatus(stage.role, currentStage, completedStages);
        
        return (
          <div key={stage.role} className="flex items-center gap-2">
            <div 
              className={`
                flex items-center gap-2 px-3 py-2 rounded-md transition-all duration-300
                ${status === "active" 
                  ? "bg-primary text-primary-foreground animate-pulse" 
                  : status === "completed"
                    ? "bg-green-500/20 text-green-600 dark:text-green-400"
                    : "bg-muted text-muted-foreground"
                }
              `}
              data-testid={`stage-${stage.role}`}
            >
              {status === "completed" ? (
                <Check className="h-4 w-4" />
              ) : (
                stage.icon
              )}
              <span className="text-sm font-medium">{stage.name}</span>
            </div>
            {index < stages.length - 1 && (
              <ArrowRight 
                className={`h-4 w-4 ${
                  completedStages.includes(stage.role) 
                    ? "text-green-500" 
                    : "text-muted-foreground/50"
                }`} 
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

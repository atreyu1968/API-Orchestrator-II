import { createContext, useContext, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Project } from "@shared/schema";

interface ProjectContextType {
  projects: Project[];
  isLoading: boolean;
  selectedProjectId: number | null;
  setSelectedProjectId: (id: number | null) => void;
  currentProject: Project | undefined;
}

const ProjectContext = createContext<ProjectContextType | null>(null);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    refetchInterval: 3000,
  });

  const activeProjects = projects.filter(p => p.status !== "archived");
  
  const getDefaultProject = () => {
    if (activeProjects.length === 0) return undefined;
    
    const generatingProject = activeProjects.find(p => p.status === "generating");
    if (generatingProject) return generatingProject;
    
    return activeProjects.reduce((latest, p) => 
      p.id > latest.id ? p : latest
    , activeProjects[0]);
  };
  
  const currentProject = selectedProjectId 
    ? projects.find(p => p.id === selectedProjectId)
    : getDefaultProject();

  useEffect(() => {
    if (!selectedProjectId && activeProjects.length > 0) {
      const defaultProject = getDefaultProject();
      if (defaultProject) {
        setSelectedProjectId(defaultProject.id);
      }
    }
  }, [activeProjects, selectedProjectId]);

  return (
    <ProjectContext.Provider value={{
      projects,
      isLoading,
      selectedProjectId,
      setSelectedProjectId,
      currentProject,
    }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return context;
}

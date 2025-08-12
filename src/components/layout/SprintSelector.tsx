"use client";

import { Button } from "@/components/ui/button";
import { ForceJiraUpdateButton } from "@/components/ForceJiraUpdateButton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useJira } from "@/hooks/useJira";
import type { JiraContextType } from "@/contexts/JiraContext";
import { useEffect, useState, useRef } from "react";

const SprintSelector = () => {
  const { 
    projects, 
    sprints, 
    loading, 
    fetchProjects, 
    fetchSprints, 
    fetchTasks, 
    clearTasks,
    clearSprints,
    forceUpdate,
  } = useJira() as JiraContextType;

  const [selectedProjectKey, setSelectedProjectKey] = useState<string | undefined>(undefined);
  const [selectedSprintId, setSelectedSprintId] = useState<string | undefined>(undefined);
  // Ref para saber si se debe seleccionar el sprint activo tras actualizar desde Jira
  const shouldSelectActiveSprint = useRef(false);

  // 1. Fetch projects on initial component mount
  useEffect(() => {
    
    fetchProjects();
  }, [fetchProjects]);

  // 2. Once projects are loaded, try to restore the last selected project from sessionStorage
  useEffect(() => {
    if (projects.length > 0) {
      const lastProjectKey = sessionStorage.getItem("lastProjectKey");
      if (lastProjectKey && projects.some(p => p.key === lastProjectKey)) {
        setSelectedProjectKey(lastProjectKey);
        fetchSprints(lastProjectKey);
      }
    }
  }, [projects, fetchSprints]);

  // 3. Once sprints are loaded for the selected project, try to restore el último sprint o seleccionar el activo si corresponde
  useEffect(() => {
    if (sprints.length > 0) {
      if (shouldSelectActiveSprint.current) {
        // Buscar el sprint activo
        const activeSprint = sprints.find(s => s.state === "active");
        if (activeSprint) {
          setSelectedSprintId(String(activeSprint.id));
          sessionStorage.setItem("lastSprintId", String(activeSprint.id));
          fetchTasks(activeSprint.id);
        }
        shouldSelectActiveSprint.current = false;
        return;
      }
      const lastSprintId = sessionStorage.getItem("lastSprintId");
      if (lastSprintId && sprints.some(s => String(s.id) === lastSprintId)) {
        setSelectedSprintId(lastSprintId);
        fetchTasks(Number(lastSprintId));
      }
    }
  }, [sprints, fetchTasks]);


  const handleProjectChange = (projectKey: string) => {
    if (!projectKey) return;
    
    // Update state and sessionStorage
    setSelectedProjectKey(projectKey);
    sessionStorage.setItem("lastProjectKey", projectKey);

    // Clear previous data and fetch new sprints
    clearTasks();
    clearSprints();
    setSelectedSprintId(undefined); // Reset sprint selection
    sessionStorage.removeItem("lastSprintId"); // Clear last sprint from storage
    fetchSprints(projectKey);
  };

  const handleSprintChange = (sprintId: string) => {
    if (!sprintId) return;

    // Update state and sessionStorage
    setSelectedSprintId(sprintId);
    sessionStorage.setItem("lastSprintId", sprintId);
    
    // Fetch tasks for the new sprint
    fetchTasks(Number(sprintId));
  };

  const handleUpdate = async () => {
    if (selectedProjectKey && selectedSprintId) {
      await forceUpdate(Number(selectedSprintId));
    }
  };

  // Handler para el botón "Actualizar desde Jira" que fuerza la selección del sprint activo
  const handleForceJiraUpdate = async () => {
    // Marcar que tras actualizar sprints se debe seleccionar el activo
    shouldSelectActiveSprint.current = true;
    // Llamar a la lógica original del botón
    if (typeof fetchProjects === 'function') {
      await fetchProjects();
    }
    if (typeof fetchSprints === 'function' && selectedProjectKey) {
      await fetchSprints(selectedProjectKey);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <Select 
        onValueChange={handleProjectChange} 
        value={selectedProjectKey}
        disabled={loading || projects.length === 0}
      >
        <SelectTrigger className="w-[200px] h-9">
          <SelectValue placeholder={loading && projects.length === 0 ? "Loading..." : "Select a Project"} />
        </SelectTrigger>
        <SelectContent>
          {projects.map((project) => (
            <SelectItem key={project.id} value={project.key}>
              {project.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select 
        onValueChange={handleSprintChange} 
        value={selectedSprintId}
        disabled={sprints.length === 0 || loading || !selectedProjectKey}
      >
        <SelectTrigger className="w-[250px] h-9">
          <SelectValue placeholder={loading && sprints.length === 0 ? "Loading..." : "Select a Sprint"} />
        </SelectTrigger>
        <SelectContent>
          {sprints.map((sprint) => {
            let estado = sprint.state;
            if (estado === "active") estado = "Activo";
            else if (estado === "closed") estado = "Cerrado";
            else if (estado === "future") estado = "Futuro";
            return (
              <SelectItem key={sprint.id} value={String(sprint.id)}>
                {sprint.name} ({estado})
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      <Button onClick={handleUpdate} disabled={!selectedSprintId || loading}>
        {loading ? "Updating..." : "Update"}
      </Button>
      <ForceJiraUpdateButton
        sprintId={selectedSprintId ? Number(selectedSprintId) : undefined}
        label="Actualizar desde Jira"
        selectedProjectKey={selectedProjectKey}
        fetchProjects={fetchProjects}
        fetchSprints={fetchSprints}
        // Sobrescribimos el onClick para forzar selección de sprint activo
        onAfterUpdate={handleForceJiraUpdate}
      />
    </div>
  );
};

export default SprintSelector;

"use client";

import { Button } from "../ui/button";
import { ForceJiraUpdateButton } from "../ForceJiraUpdateButton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useJira } from "../../hooks/useJira";
import type { JiraContextType } from "../../contexts/JiraContext.types";
import { useEffect, useState, useRef } from "react";

function SprintSelector() {
  const {
    projects,
    sprints,
    loading,
    fetchSprints,
    fetchTasks,
    clearTasks,
    clearSprints,
    forceUpdate,
  } = useJira() as JiraContextType;

  const [selectedProjectKey, setSelectedProjectKey] = useState<string>(() => {
    return localStorage.getItem('selectedProjectKey') || '';
  });
  const [selectedSprintId, setSelectedSprintId] = useState<string>(() => {
    return localStorage.getItem('selectedSprintId') || '';
  });
  
  const shouldSelectActiveSprint = useRef(false);

  // Load initial values from localStorage on mount
  useEffect(() => {
    const lastProjectKey = localStorage.getItem('selectedProjectKey');
    const lastSprintId = localStorage.getItem('selectedSprintId');
    
    if (lastProjectKey) {
      setSelectedProjectKey(lastProjectKey);
    }
    if (lastSprintId) {
      setSelectedSprintId(lastSprintId);
    }
  }, []);

  useEffect(() => {
    if (projects.length > 0) {
      const lastProjectKey = localStorage.getItem("selectedProjectKey");
      if (lastProjectKey && projects.some(p => p.key === lastProjectKey)) {
        setSelectedProjectKey(lastProjectKey);
        fetchSprints(lastProjectKey);
      }
    }
  }, [projects, fetchSprints]);

  useEffect(() => {
    if (sprints.length > 0) {
      if (shouldSelectActiveSprint.current) {
        const activeSprint = sprints.find(s => s.state === "active");
        if (activeSprint) {
          setSelectedSprintId(String(activeSprint.id));
          localStorage.setItem("selectedSprintId", String(activeSprint.id));
          fetchTasks(activeSprint.id);
        }
        shouldSelectActiveSprint.current = false;
        return;
      }
      const lastSprintId = localStorage.getItem("selectedSprintId");
      if (lastSprintId && sprints.some(s => String(s.id) === lastSprintId)) {
        setSelectedSprintId(lastSprintId);
        fetchTasks(Number(lastSprintId));
      }
    }
  }, [sprints, fetchTasks]);

  function handleProjectChange(projectKey: string) {
    if (!projectKey) return;
  setSelectedProjectKey(projectKey);
  localStorage.setItem("selectedProjectKey", projectKey);
  clearTasks();
  clearSprints();
  setSelectedSprintId("");
  localStorage.removeItem("selectedSprintId");
  fetchSprints(projectKey);
  }

  function handleSprintChange(sprintId: string) {
    if (!sprintId) return;
  setSelectedSprintId(sprintId);
  localStorage.setItem("selectedSprintId", sprintId);
  fetchTasks(Number(sprintId));
  }

  async function handleUpdate() {
    if (selectedProjectKey && selectedSprintId) {
      await forceUpdate(Number(selectedSprintId));
    }
  }

  async function handleForceJiraUpdate() {
    shouldSelectActiveSprint.current = true;
    if (typeof fetchSprints === "function" && selectedProjectKey) {
      await fetchSprints(selectedProjectKey);
    }
  }

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
  sprintId={selectedSprintId ? Number(selectedSprintId) : null}
        label="Actualizar desde Jira"
        selectedProjectKey={selectedProjectKey}
        fetchSprints={fetchSprints}
        onAfterUpdate={handleForceJiraUpdate}
      />
    </div>
  );
}

export default SprintSelector;

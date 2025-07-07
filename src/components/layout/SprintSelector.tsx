"use client";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useJira } from "@/hooks/useJira";
import { useEffect, useState } from "react";

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
  } = useJira();

  const [selectedProjectKey, setSelectedProjectKey] = useState<string | undefined>(undefined);
  const [selectedSprintId, setSelectedSprintId] = useState<string | undefined>(undefined);

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

  // 3. Once sprints are loaded for the selected project, try to restore the last selected sprint
  useEffect(() => {
    if (sprints.length > 0) {
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
          {sprints.map((sprint) => (
            <SelectItem key={sprint.id} value={String(sprint.id)}>
              {sprint.name} ({sprint.state})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button onClick={handleUpdate} disabled={!selectedSprintId || loading}>
        {loading ? "Updating..." : "Update"}
      </Button>
    </div>
  );
};

export default SprintSelector;

import { useState, useEffect } from 'react';

export function useLocalStorageData() {
  const [projects, setProjects] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selectedProjectKey, setSelectedProjectKey] = useState<string | null>(null);
  const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null);

  useEffect(() => {
    
    // Load all localStorage keys to debug
    const allKeys = Object.keys(localStorage);
    
    // Load projects from cache - try different possible keys
    const projectsKeys = ['projectsCache', 'projects'];
    for (const key of projectsKeys) {
      const projectsCache = localStorage.getItem(key);
      if (projectsCache) {
        try {
          const parsed = JSON.parse(projectsCache);
          setProjects(parsed);
          break;
        } catch (e) {
        }
      }
    }

    // Load selected project
    const lastProject = localStorage.getItem('selectedProjectKey');
    if (lastProject) {
      setSelectedProjectKey(lastProject);
      
      // Try different sprint cache keys
      const sprintKeys = [`sprintsCache_${lastProject}`, `sprints-${lastProject}`, 'sprintsCache'];
      for (const key of sprintKeys) {
        const sprintsCache = localStorage.getItem(key);
        if (sprintsCache) {
          try {
            const parsed = JSON.parse(sprintsCache);
            setSprints(parsed);
            break;
          } catch (e) {
          }
        }
      }
    }

    // Load selected sprint
    const lastSprint = localStorage.getItem('selectedSprintId');
    if (lastSprint) {
      setSelectedSprintId(lastSprint);
      
      // Try different task cache keys
      const taskKeys = [`tasksCache_${lastSprint}`, `issues-sprint-${lastSprint}`, 'tasksCache'];
      for (const key of taskKeys) {
        const tasksCache = localStorage.getItem(key);
        if (tasksCache) {
          try {
            const parsed = JSON.parse(tasksCache);
            setTasks(parsed);
            break;
          } catch (e) {
          }
        }
      }
    }
  }, []);

  const saveToLocalStorage = (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
  };

  const handleProjectChange = async (projectKey: string) => {
    setSelectedProjectKey(projectKey);
    localStorage.setItem('selectedProjectKey', projectKey);
    
    // Fetch sprints for the selected project
    try {
      const response = await fetch('/api/jira/sprints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectKey })
      });
      const data = await response.json();
      if (data.sprints) {
        setSprints(data.sprints);
        localStorage.setItem(`sprints-${projectKey}`, JSON.stringify(data.sprints));
      }
    } catch (err) {
    }
  };

  const handleSprintChange = async (sprintId: string) => {
    setSelectedSprintId(sprintId);
    localStorage.setItem('selectedSprintId', sprintId);
    
    // Fetch tasks for the selected sprint
    try {
      const response = await fetch('/api/jira/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sprintId: parseInt(sprintId) })
      });
      const data = await response.json();
      if (data.issues) {
        setTasks(data.issues);
        localStorage.setItem(`issues-sprint-${sprintId}`, JSON.stringify(data.issues));
      }
    } catch (err) {
    }
  };

  return {
    projects,
    sprints,
    tasks,
    selectedProjectKey,
    selectedSprintId,
    handleProjectChange,
    handleSprintChange,
    saveToLocalStorage
  };
}
import type { ApiTask } from '../dao/jira';
import React, { createContext, useState, useMemo, useEffect, useCallback } from 'react';
import type { JiraProject, JiraSprint, JiraUser, JiraStatus } from '../dao/jira';
import type { JiraContextType } from './JiraContext.types';
import { addAssigneeHistoryMiddleware } from '../lib/assigneeHistoryMiddleware';

export const JiraContext = createContext<JiraContextType>({} as JiraContextType);

export function JiraProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<JiraProject[]>([])
  const [initialized, setInitialized] = useState(false)
  const [sprints, setSprints] = useState<JiraSprint[]>([])
  const [projectUsers, setProjectUsers] = useState<JiraUser[]>([])
  const [projectUsersCache, setProjectUsersCache] = useState<Record<string, JiraUser[]>>({})
  const [users, setUsers] = useState<Record<string, { name: string; avatarUrl: string }>>({})
  const [allUsers, setAllUsers] = useState<JiraUser[]>(() => {
    const cached = localStorage.getItem('jiraUsers')
    return cached ? JSON.parse(cached) : []
  })
  const [selectedProjectKey, setSelectedProjectKey] = useState<string | null>(null)
  const [sprintInfo, setSprintInfo] = useState<JiraSprint | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [logMessages, setLogMessages] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [projectsCache, setProjectsCache] = useState<JiraProject[]>([])
  const [sprintsCache, setSprintsCache] = useState<Record<string, JiraSprint[]>>({})
  const [tasksCache, setTasksCache] = useState<Record<string, ApiTask[]>>({})
  const [activeUsers, setActiveUsers] = useState<Record<string, boolean>>({})
  const [userTypes, setUserTypes] = useState<Record<string, string>>(() => {
    const cached = localStorage.getItem('jiraUserTypes')
    return cached ? JSON.parse(cached) : {}
  })
  const [projectStatuses, setProjectStatuses] = useState<JiraStatus[]>([])
  const [statusesCache, setStatusesCache] = useState<Record<string, JiraStatus[]>>({})
  const [kpiCardVisibility, setKpiCardVisibility] = useState<Record<string, boolean>>({})
  const [activeStatuses, setActiveStatuses] = useState<Record<string, boolean>>({})
  const [assigneeStatsBySprint, setAssigneeStatsBySprint] = useState<Record<string, any>>(() => {
    const cached = localStorage.getItem('assigneeStatsBySprint')
    return cached ? JSON.parse(cached) : {}
  })
  
  // KPI Configuration State
  const [sprintQuality, setSprintQuality] = useState<number>(() => 
    parseFloat(localStorage.getItem('kpi_sprintQuality') || '85')
  )
  const [historicalReworkRate, setHistoricalReworkRate] = useState<number>(() => 
    parseFloat(localStorage.getItem('kpi_historicalReworkRate') || '10')
  )
  const [perfectWorkKpiLimit, setPerfectWorkKpiLimit] = useState<number>(() => 
    parseFloat(localStorage.getItem('kpi_perfectWorkKpiLimit') || '100')
  )
  const [weightStoryPoints, setWeightStoryPoints] = useState<number>(() => 
    parseFloat(localStorage.getItem('kpi_weightStoryPoints') || '20')
  )
  const [weightTasks, setWeightTasks] = useState<number>(() => 
    parseFloat(localStorage.getItem('kpi_weightTasks') || '20')
  )
  const [weightComplexity, setWeightComplexity] = useState<number>(() => 
    parseFloat(localStorage.getItem('kpi_weightComplexity') || '20')
  )
  const [weightRework, setWeightRework] = useState<number>(() => 
    parseFloat(localStorage.getItem('kpi_weightRework') || '30')
  )
  const [weightDelays, setWeightDelays] = useState<number>(() => 
    parseFloat(localStorage.getItem('kpi_weightDelays') || '10')
  )
  
  // Computed values
  const weightsSum = weightStoryPoints + weightTasks + weightComplexity + weightRework + weightDelays
  const weightsAreValid = weightsSum === 100
  
  // Save KPI values to localStorage when they change
  useEffect(() => {
    localStorage.setItem('kpi_sprintQuality', sprintQuality.toString())
  }, [sprintQuality])
  
  useEffect(() => {
    localStorage.setItem('kpi_historicalReworkRate', historicalReworkRate.toString())
  }, [historicalReworkRate])
  
  useEffect(() => {
    localStorage.setItem('kpi_perfectWorkKpiLimit', perfectWorkKpiLimit.toString())
  }, [perfectWorkKpiLimit])
  
  useEffect(() => {
    localStorage.setItem('kpi_weightStoryPoints', weightStoryPoints.toString())
  }, [weightStoryPoints])
  
  useEffect(() => {
    localStorage.setItem('kpi_weightTasks', weightTasks.toString())
  }, [weightTasks])
  
  useEffect(() => {
    localStorage.setItem('kpi_weightComplexity', weightComplexity.toString())
  }, [weightComplexity])
  
  useEffect(() => {
    localStorage.setItem('kpi_weightRework', weightRework.toString())
  }, [weightRework])
  
  useEffect(() => {
    localStorage.setItem('kpi_weightDelays', weightDelays.toString())
  }, [weightDelays])
  
  // KPI recalculation trigger state
  const [kpiRecalcTrigger, setKpiRecalcTrigger] = useState(0)
  const [tasksProcessed, setTasksProcessed] = useState<Record<string, boolean>>({})
  
  // Function to recalculate KPIs and clear cache
  const recalculateKpis = useCallback(() => {
    // Clear KPI cache to force recalculation
    const sprintId = sprintInfo?.id?.toString()
    if (sprintId) {
      console.log('[RECALCULATE_KPIS] Clearing KPI cache for sprint:', sprintId)
      setAssigneeStatsBySprint(prev => {
        const updated = { ...prev }
        delete updated[sprintId]
        localStorage.setItem('assigneeStatsBySprint', JSON.stringify(updated))
        return updated
      })
      console.log('[RECALCULATE_KPIS] KPI cache cleared - triggering recalculation')
      setKpiRecalcTrigger(prev => prev + 1)
    }
  }, [sprintInfo?.id])

  const toggleStatusActivation = useCallback((statusId: string) => {
    setProjectStatuses(prev => {
      const updated = prev.map(status => 
        status.id === statusId 
          ? { ...status, show: !status.show }
          : status
      );
      
      // Save to localStorage
      if (selectedProjectKey) {
        localStorage.setItem(`projectStatuses_${selectedProjectKey}`, JSON.stringify(updated));
      }
      
      return updated;
    });
  }, [selectedProjectKey]);

  const fetchProjects = useCallback(async () => {
    console.log('[FETCH_PROJECTS] Starting...');
    setLoading(true);
    try {
      const response = await fetch('/api/jira/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      console.log('[FETCH_PROJECTS] Response status:', response.status);
      const data = await response.json();
      console.log('[FETCH_PROJECTS] Data:', data);
      if (data.projects) {
        console.log('[FETCH_PROJECTS] Setting projects:', data.projects.length);
        setProjects(data.projects);
        setProjectsCache(data.projects);
        localStorage.setItem('jiraProjects', JSON.stringify(data.projects));
      }
    } catch (err) {
      console.error('[FETCH_PROJECTS] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSprints = useCallback(async (projectKey: string) => {
    if (!projectKey) return;
    console.log('[FETCH_SPRINTS] Starting for project:', projectKey);
    setLoading(true);
    try {
      const response = await fetch('/api/jira/sprints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectKey })
      });
      console.log('[FETCH_SPRINTS] Response status:', response.status);
      const data = await response.json();
      console.log('[FETCH_SPRINTS] Data:', data);
      if (data.sprints) {
        console.log('[FETCH_SPRINTS] Setting sprints:', data.sprints.length);
        setSprints(data.sprints);
        setSprintsCache(prev => ({ ...prev, [projectKey]: data.sprints }));
        localStorage.setItem(`jiraSprints-${projectKey}`, JSON.stringify(data.sprints));
      }
    } catch (err) {
      console.error('[FETCH_SPRINTS] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch sprints');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProjectStatuses = useCallback(async (projectKey: string) => {
    if (!projectKey) return;
    console.log('[FETCH_STATUSES] Starting for project:', projectKey);
    try {
      const response = await fetch('/api/jira/statuses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectKey })
      });
      console.log('[FETCH_STATUSES] Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[FETCH_STATUSES] API error:', response.status, errorText);
        setError(`API error: ${response.status} - ${errorText}`);
        return;
      }
      
      const data = await response.json();
      console.log('[FETCH_STATUSES] Data:', data);
      if (data.statuses) {
        // Middleware: Add show field to statuses
        const statusesWithShow = data.statuses.map((status: any) => ({
          ...status,
          show: status.show !== undefined ? status.show : true
        }));
        
        console.log('[FETCH_STATUSES] Setting statuses:', statusesWithShow.length);
        setProjectStatuses(statusesWithShow);
        setStatusesCache(prev => ({ ...prev, [projectKey]: statusesWithShow }));
        localStorage.setItem(`projectStatuses_${projectKey}`, JSON.stringify(statusesWithShow));
        setError(null); // Clear any previous errors
      }
    } catch (err) {
      console.error('[FETCH_STATUSES] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch statuses');
    }
  }, []);

  // Load project statuses from localStorage when project changes
  useEffect(() => {
    if (selectedProjectKey) {
      const cached = localStorage.getItem(`projectStatuses_${selectedProjectKey}`);
      if (cached) {
        try {
          const statuses = JSON.parse(cached);
          setProjectStatuses(statuses);
          setError(null); // Clear any previous errors
        } catch (e) {
          console.error('Error loading cached statuses:', e);
        }
      } else {
        fetchProjectStatuses(selectedProjectKey);
      }
    }
  }, [selectedProjectKey, fetchProjectStatuses]);

  const fetchAllUsers = useCallback(async () => {
    console.log('[FETCH_USERS] Starting...');
    try {
      const response = await fetch('/api/jira/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await response.json();
      console.log('[FETCH_USERS] Response:', data);
      if (data.users) {
        // Load existing user settings from localStorage
        const existingUsers = localStorage.getItem('jiraUsers');
        const existingUserSettings: Record<string, any> = {};
        
        if (existingUsers) {
          try {
            const parsed = JSON.parse(existingUsers);
            parsed.forEach((user: any) => {
              existingUserSettings[user.accountId] = {
                active: user.active,
                userType: user.userType,
              };
            });
          } catch (e) {
            console.error('[FETCH_USERS] Error parsing existing users:', e);
          }
        }
        
        // Merge API data with existing local settings
        const usersWithActiveStatus = data.users.map((user: any) => ({
          ...user,
          active: existingUserSettings[user.accountId]?.active ?? false,
          userType: existingUserSettings[user.accountId]?.userType ?? 'Sin tipo'
        }));
        
        console.log('[FETCH_USERS] Setting users:', usersWithActiveStatus.length);
        setAllUsers(usersWithActiveStatus);
        localStorage.setItem('jiraUsers', JSON.stringify(usersWithActiveStatus));
      }
    } catch (err) {
      console.error('[FETCH_USERS] Error:', err);
    }
  }, []);

  const fetchTasks = useCallback(async (sprintId: number) => {
    if (!sprintId) return [];

    console.log('[FETCH_TASKS] Starting for sprint:', sprintId);
    setLoading(true);
    try {
      const requestBody = { sprintId };
      console.log('[FETCH_TASKS] Request body:', requestBody);
      
      const response = await fetch('/api/jira/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      console.log('[FETCH_TASKS] Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[FETCH_TASKS] API error:', response.status, errorText);
        setError(`API error: ${response.status} - ${errorText}`);
        return [];
      }
      
      const responseText = await response.text();
      console.log('[FETCH_TASKS] Response text length:', responseText.length);
      
      if (!responseText) {
        console.error('[FETCH_TASKS] Empty response');
        setError('Empty response from API');
        return [];
      }
      
      const data = JSON.parse(responseText);
      console.log('[FETCH_TASKS] Parsed data:', data);
      
      if (data.issues) {
        console.log('[FETCH_TASKS] Processing', data.issues.length, 'issues');
        // Apply middlewares: carryover classification + assignee history
        let processedTasks = data.issues.map((task: any) => {
          const firstSprint = task.sprintHistory && Array.isArray(task.sprintHistory) && task.sprintHistory.length > 0 
            ? task.sprintHistory[0] 
            : null;
          
          const isCarryover = firstSprint ? String(firstSprint) !== String(sprintId) : false;
          
          return {
            ...task,
            firstSprint,
            isCarryover
          };
        });
        
        // Add assignee history middleware
        const tasksWithCarryover = addAssigneeHistoryMiddleware(processedTasks);
        
        console.log('[FETCH_TASKS] Processed tasks:', tasksWithCarryover.length);
        console.log('[FETCH_TASKS] Sample task with assigneeHistory:', tasksWithCarryover[0]?.assigneeHistory);
        setTasksCache(prev => ({ ...prev, [sprintId.toString()]: tasksWithCarryover }));
        localStorage.setItem(`jiraTasks-${sprintId}`, JSON.stringify(tasksWithCarryover));
        setTasksProcessed(prev => ({ ...prev, [sprintId.toString()]: true }));
        return tasksWithCarryover;
      } else {
        console.log('[FETCH_TASKS] No issues in response');
        return [];
      }
    } catch (err) {
      console.error('[FETCH_TASKS] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const value = useMemo(() => ({
    projects,
    setProjects,
    sprints,
    setSprints,
    tasks: [],
    loading,
    setLoading,
    error,
    setError,
    sprintInfo,
    setSprintInfo,
    uniqueStatuses: [],
    assigneeStats: [],
    assigneeStatsBySprint,
    setAssigneeSprintStat: (sprintId: string, stats: any) => {
      setAssigneeStatsBySprint(prev => {
        const updated = { ...prev, [sprintId]: stats }
        localStorage.setItem('assigneeStatsBySprint', JSON.stringify(updated))
        return updated
      })
    },
    fetchProjects,
    fetchSprints,
    fetchTasks,
    forceUpdate: async (sprintId?: number) => {
      if (sprintId) {
        // Force update specific sprint
        setLoading(true);
        try {
          const response = await fetch(`/api/jira/issues?force=true`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sprintId })
          });
          const data = await response.json();
          if (data.issues) {
            // Apply middlewares: carryover classification + assignee history
            let processedTasks = data.issues.map((task: any) => {
              const firstSprint = task.sprintHistory && Array.isArray(task.sprintHistory) && task.sprintHistory.length > 0 
                ? task.sprintHistory[0] 
                : null;
              
              const isCarryover = firstSprint ? String(firstSprint) !== String(sprintId) : false;
              
              return {
                ...task,
                firstSprint,
                isCarryover
              };
            });
            
            // Add assignee history middleware
            const tasksWithCarryover = addAssigneeHistoryMiddleware(processedTasks);
            
            setTasksCache(prev => ({ ...prev, [sprintId.toString()]: tasksWithCarryover }));
            localStorage.setItem(`jiraTasks-${sprintId}`, JSON.stringify(tasksWithCarryover));
            setTasksProcessed(prev => ({ ...prev, [sprintId.toString()]: true }));
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to force update tasks');
        } finally {
          setLoading(false);
        }
      } else if (selectedProjectKey) {
        // Force update projects and sprints
        await fetchProjects();
        localStorage.setItem('jiraProjects', JSON.stringify(projects));
        await fetchSprints(selectedProjectKey);
      }
    },
    clearTasks: () => {},
    clearSprints: () => {},
    getRawTaskById: () => undefined,
    sprintQuality,
    setSprintQuality,
    historicalReworkRate,
    setHistoricalReworkRate,
    perfectWorkKpiLimit,
    setPerfectWorkKpiLimit,
    weightStoryPoints,
    setWeightStoryPoints,
    weightTasks,
    setWeightTasks,
    weightComplexity,
    setWeightComplexity,
    weightRework,
    setWeightRework,
    weightDelays,
    setWeightDelays,
    weightsSum,
    weightsAreValid,
    reworkKpiUpperLimit: 0,
    setReworkKpiUpperLimit: () => {},
    totalStoryPointsTarget: 0,
    totalTasksTarget: 0,
    sprintAverageComplexityTarget: 0,
    selectedProjectKey,
    setSelectedProjectKey,
    logMessages,
    setLogMessages,
    users,
    setUsers,
    activeUsers,
    setActiveUsers,
    toggleUserActivation: (accountId: string) => {
      setAllUsers(prev => {
        const updated = prev.map(user => {
          if (user.accountId === accountId) {
            const newActive = !user.active;
            console.log(`[TOGGLE_USER] ${user.displayName}: ${user.active} → ${newActive}`);
            return { ...user, active: newActive };
          }
          return user;
        });
        localStorage.setItem('jiraUsers', JSON.stringify(updated));
        return updated;
      });
    },
  userTypes,
  setUserTypes,
    setUserType: (accountId: string, type: string) => {
      setUserTypes(prev => {
        const updated = { ...prev, [accountId]: type }
        localStorage.setItem('jiraUserTypes', JSON.stringify(updated))
        return updated
      })
      // Also update the user object in allUsers
      setAllUsers(prev => {
        const updated = prev.map(user => 
          user.accountId === accountId ? { ...user, userType: type } : user
        )
        localStorage.setItem('jiraUsers', JSON.stringify(updated))
        return updated
      })
    },
    projectStatuses,
    setProjectStatuses,
    fetchProjectStatuses,
    fetchUsers: async () => {
      try {
        const response = await fetch('/api/jira-proxy?endpoint=all-users');
        const data = await response.json();
        return data.users || [];
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch users');
        return [];
      }
    },
    kpiCardVisibility,
    setKpiCardVisibility,
    toggleKpiCardVisibility: () => {},
    projectsCache,
    setProjectsCache,
    sprintsCache,
    setSprintsCache,
    tasksCache,
    setTasksCache,
    activeStatuses,
    setActiveStatuses,
    toggleStatusActivation,
    projectUsers,
    setProjectUsers,
    projectUsersCache,
    setProjectUsersCache,
    allUsers,
    setAllUsers,
    fetchAllUsers,
    recalculateKpis,
    kpiRecalcTrigger,
    tasksProcessed,
  }), [projects, sprints, loading, error, sprintInfo, logMessages, users, projectUsers, projectUsersCache, selectedProjectKey, projectsCache, sprintsCache, tasksCache, activeUsers, userTypes, projectStatuses, kpiCardVisibility, activeStatuses, initialized, fetchProjects, fetchSprints, fetchTasks, sprintQuality, historicalReworkRate, perfectWorkKpiLimit, weightStoryPoints, weightTasks, weightComplexity, weightRework, weightDelays, weightsSum, weightsAreValid, recalculateKpis, kpiRecalcTrigger, allUsers, fetchAllUsers, setAllUsers, tasksProcessed]);

  // Initialize data on first load
  useEffect(() => {
    const initializeData = async () => {
      if (initialized) return;
      setInitialized(true);
      
      // Fetch projects and users in parallel
      await Promise.all([
        fetchProjects(),
        fetchAllUsers()
      ]);
      
      // Load projects from localStorage first
      const projectsCache = localStorage.getItem('jiraProjects');
      try {
        let cachedProjects = null;
        if (projectsCache) {
          cachedProjects = JSON.parse(projectsCache);
        }
        
        if (cachedProjects) {

          setProjects(cachedProjects);
          setProjectsCache(cachedProjects);
            
          // Load selected project data
          const lastProjectKey = localStorage.getItem('selectedProjectKey');
          if (lastProjectKey) {
            setSelectedProjectKey(lastProjectKey);
            
            // Load sprints from cache
            const sprintsCache = localStorage.getItem(`jiraSprints-${lastProjectKey}`);
            if (sprintsCache) {
              const cachedSprints = JSON.parse(sprintsCache);
              setSprints(cachedSprints);
              setSprintsCache(prev => ({ ...prev, [lastProjectKey]: cachedSprints }));
              
              // Load selected sprint data
              const lastSprintId = localStorage.getItem('selectedSprintId');
              if (lastSprintId) {
                const selectedSprint = cachedSprints.find((s: any) => s.id.toString() === lastSprintId);
                if (selectedSprint) {
                  setSprintInfo(selectedSprint);
                  
                  // Load tasks from cache
                  const tasksCache = localStorage.getItem(`jiraTasks-${lastSprintId}`);

                  if (tasksCache) {
                    const cachedTasks = JSON.parse(tasksCache);

                    setTasksCache(prev => ({ ...prev, [lastSprintId]: cachedTasks }));
                  }
                }
              }
            }
          }
        }
      } catch (e) {

      }
    };
    
    initializeData();
  }, [fetchProjects]);
  
  // Save selected project to localStorage
  useEffect(() => {
    if (selectedProjectKey) {
      localStorage.setItem('selectedProjectKey', selectedProjectKey);
    }
  }, [selectedProjectKey]);

  return (
    <JiraContext.Provider value={value}>
      {children}
    </JiraContext.Provider>
  )
}

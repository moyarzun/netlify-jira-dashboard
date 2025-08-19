
import type { JiraProject, JiraSprint, JiraUser } from '../../dao/jira'
import type { NormalizedTask } from '../../types/NormalizedTask'

async function fetchProjects({ projectsCache, setProjects, setProjectsCache, setLoading, setLogMessages, setError }: {
  projectsCache: JiraProject[],
  setProjects: (projects: JiraProject[]) => void,
  setProjectsCache: (projects: JiraProject[]) => void,
  setLoading: (loading: boolean) => void,
  setLogMessages: (msgs: string[]) => void,
  setError: (err: string | null) => void,
}) {
  setLoading(true)
  setLogMessages([])
  setError(null)
  try {
    const localStorageKey = `jiraProjects`
    const cachedProjectsFromLocalStorage = localStorage.getItem(localStorageKey)
    if (cachedProjectsFromLocalStorage) {
      const parsedProjects = JSON.parse(cachedProjectsFromLocalStorage)
      setProjects(parsedProjects)
      setProjectsCache(parsedProjects)
      setLoading(false)
      return
    }
    if (projectsCache && projectsCache.length > 0) {
      setProjects(projectsCache)
      localStorage.setItem(localStorageKey, JSON.stringify(projectsCache))
      setLoading(false)
      return
    }
    const response = await fetch('/api/jira/projects')
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'No JSON error message' }))
      const errMessage = errorData.error || 'Failed to fetch projects.'
      throw new Error(errMessage)
    }
    const data = await response.json()
    const fetchedProjects: JiraProject[] = data.projects || []
    setProjects(fetchedProjects)
    localStorage.setItem(localStorageKey, JSON.stringify(fetchedProjects))
    setProjectsCache(fetchedProjects)
  } catch (err: unknown) {
    setError(err instanceof Error ? err.message : "Ocurrió un error desconocido al obtener los proyectos.")
    setProjects([])
  } finally {
    setLoading(false)
  }
}

async function fetchSprints({ projectKey, sprintsCache, setSprints, setSprintsCache, setSelectedProjectKey, setLoading, setLogMessages, setError }: {
  projectKey: string,
  sprintsCache: Record<string, JiraSprint[]>,
  setSprints: (sprints: JiraSprint[]) => void,
  setSprintsCache: (cb: (prev: Record<string, JiraSprint[]>) => Record<string, JiraSprint[]>) => void,
  setSelectedProjectKey: (key: string) => void,
  setLoading: (loading: boolean) => void,
  setLogMessages: (msgs: string[]) => void,
  setError: (err: string | null) => void,
}) {
  if (!projectKey) return
  setLoading(true)
  setLogMessages([])
  setError(null)
  try {
    const localStorageKey = `jiraSprints-${projectKey}`
    const cachedSprintsFromLocalStorage = localStorage.getItem(localStorageKey)
    if (cachedSprintsFromLocalStorage) {
      const parsedSprints = JSON.parse(cachedSprintsFromLocalStorage)
      setSprints(parsedSprints)
      setSprintsCache(prev => ({ ...prev, [projectKey]: parsedSprints }))
      setSelectedProjectKey(projectKey)
  // Sprints para ${projectKey} cargados desde LocalStorage.
      setLoading(false)
      return
    }
    if (sprintsCache[projectKey]) {
      const cachedSprintsFromMemory = sprintsCache[projectKey]
      setSprints(cachedSprintsFromMemory)
      localStorage.setItem(localStorageKey, JSON.stringify(cachedSprintsFromMemory))
      setSelectedProjectKey(projectKey)
  // Sprints para ${projectKey} cargados desde caché en memoria.
      setLoading(false)
      return
    }
  // Solicitando sprints desde la API de Jira para el proyecto: ${projectKey}
    const response = await fetch('/api/jira/sprints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectKey }),
    })
    if (!response.ok) {
      const { error: errMessage } = await response.json()
      throw new Error(errMessage || 'Failed to fetch sprints.')
    }
    const data = await response.json()
    const fetchedSprints: JiraSprint[] = data.sprints || []
    setSprints(fetchedSprints)
    localStorage.setItem(localStorageKey, JSON.stringify(fetchedSprints))
    setSprintsCache(prev => ({ ...prev, [projectKey]: fetchedSprints }))
  setSelectedProjectKey(projectKey)
  // Sprints obtenidos correctamente desde la API para el proyecto: ${projectKey}
  } catch (err: unknown) {
  // Error al obtener sprints: ${err instanceof Error ? err.message : String(err)}
    setError(err instanceof Error ? err.message : "Ocurrió un error desconocido al obtener los sprints.")
    setSprints([])
  } finally {
    setLoading(false)
  }
}

async function fetchTasks({ sprintId, tasksCache, setRawTasks, setTasksCache, setSprintInfo, setLoading, setLogMessages, setError, sprints }: {
  sprintId: number,
  tasksCache: Record<number, NormalizedTask[]>,
  setRawTasks: (tasks: NormalizedTask[]) => void,
  setTasksCache: (cb: (prev: Record<number, NormalizedTask[]>) => Record<number, NormalizedTask[]>) => void,
  setSprintInfo: (sprint: JiraSprint | null) => void,
  setLoading: (loading: boolean) => void,
  setLogMessages: (msgs: string[]) => void,
  setError: (err: string | null) => void,
  sprints: JiraSprint[],
}) {
  if (!sprintId) return
  setLoading(true)
  setLogMessages([])
  setError(null)
  try {
    const localStorageKey = `jiraTasks-${sprintId}`
    const cachedTasksFromLocalStorage = localStorage.getItem(localStorageKey)
    if (cachedTasksFromLocalStorage) {
      const parsedTasks = JSON.parse(cachedTasksFromLocalStorage)
      setRawTasks(parsedTasks)
      setTasksCache(prev => ({ ...prev, [sprintId]: parsedTasks }))
      const selectedSprint = sprints.find(s => s.id === sprintId)
      setSprintInfo(selectedSprint || null)
  // Tareas para sprint ${sprintId} cargadas desde LocalStorage.
      setLoading(false)
      return
    }
    if (tasksCache[sprintId]) {
      const cachedTasksFromMemory = tasksCache[sprintId]
      setRawTasks(cachedTasksFromMemory)
      localStorage.setItem(localStorageKey, JSON.stringify(cachedTasksFromMemory))
      const selectedSprint = sprints.find(s => s.id === sprintId)
      setSprintInfo(selectedSprint || null)
  // Tareas para sprint ${sprintId} cargadas desde caché en memoria.
      setLoading(false)
      return
    }
  // Solicitando tareas desde la API de Jira para el sprint: ${sprintId}
    const response = await fetch('/api/jira/issues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sprintId }),
    })
    if (!response.ok) {
      const { error: errMessage } = await response.json()
      throw new Error(errMessage || 'Failed to fetch tasks.')
    }
    const data = await response.json()
    const issues = data.issues && Array.isArray(data.issues.issues)
      ? data.issues.issues
      : Array.isArray(data.issues)
      ? data.issues
      : []
    setRawTasks(issues)
    localStorage.setItem(localStorageKey, JSON.stringify(issues))
    setTasksCache(prev => ({ ...prev, [sprintId]: issues }))
    const selectedSprint = sprints.find(s => s.id === sprintId)
    setSprintInfo(selectedSprint || null)
  // Tareas obtenidas correctamente desde la API para el sprint: ${sprintId}
  } catch (err: unknown) {
  // Error al obtener tareas: ${err instanceof Error ? err.message : String(err)}
    setError(err instanceof Error ? err.message : "Ocurrió un error desconocido al obtener las tareas.")
    setRawTasks([])
  } finally {
    setLoading(false)
  }
}

async function fetchUsers({ query = "", projectUsersCache, setProjectUsers, setProjectUsersCache, setLoading, setError, setUsers, users }: {
  query?: string,
  projectUsersCache: Record<string, JiraUser[]>,
  setProjectUsers: (users: JiraUser[]) => void,
  setProjectUsersCache: (cb: (prev: Record<string, JiraUser[]>) => Record<string, JiraUser[]>) => void,
  setLoading: (loading: boolean) => void,
  setError: (err: string | null) => void,
  setUsers: (users: Record<string, { name: string; avatarUrl: string }>) => void,
  users: Record<string, { name: string; avatarUrl: string }>,
}) {
  setLoading(true);
  setError(null);
  const isAll = !query || query === 'all';
  const cacheKey = isAll ? 'jiraUsers-global-all' : `jiraUsers-global-${query}`;
  try {
    const localStorageData = localStorage.getItem(cacheKey);
    if (localStorageData) {
      const parsedUsers = JSON.parse(localStorageData);
      setProjectUsers(parsedUsers);
      setProjectUsersCache(prev => ({ ...prev, [cacheKey]: parsedUsers }));
      const newUsersMap = parsedUsers.reduce(
        (acc: Record<string, { name: string; avatarUrl: string }>, user: JiraUser) => {
          acc[user.accountId] = { name: user.displayName, avatarUrl: user.avatarUrls['48x48'] };
          return acc;
        },
        {} as Record<string, { name: string; avatarUrl: string }>
      );
      if (JSON.stringify(newUsersMap) !== JSON.stringify(users)) {
        setUsers(newUsersMap);
      }
  // Usuarios cargados desde localStorage para query "${query || 'all'}".
      setLoading(false);
      return parsedUsers;
    }
    if (projectUsersCache[cacheKey]) {
      const cachedUsers = projectUsersCache[cacheKey];
      setProjectUsers(cachedUsers);
      localStorage.setItem(cacheKey, JSON.stringify(cachedUsers));
  // Usuarios cargados desde caché en memoria para query "${query || 'all'}".
      setLoading(false);
      return cachedUsers;
    }
    let url;
    if (isAll) {
      url = `/api/jira-proxy?endpoint=all-users`;
    } else {
      url = `/api/jira-proxy?endpoint=users&query=${encodeURIComponent(query)}`;
    }
    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'No JSON error message' }));
      throw new Error(errorData.error || 'Failed to search Jira user.');
    }
    const data = await response.json();
    const fetchedUsers: JiraUser[] = data.users || [];
    setProjectUsers(fetchedUsers);
    localStorage.setItem(cacheKey, JSON.stringify(fetchedUsers));
    setProjectUsersCache(prev => ({ ...prev, [cacheKey]: fetchedUsers }));
    const newUsersMap = fetchedUsers.reduce((acc, user) => {
      acc[user.accountId] = { name: user.displayName, avatarUrl: user.avatarUrls['48x48'] };
      return acc;
    }, {} as Record<string, { name: string; avatarUrl: string; }>);
    if (JSON.stringify(newUsersMap) !== JSON.stringify(users)) {
      setUsers(newUsersMap);
    }
    return fetchedUsers;
  } catch {
    setProjectUsers([]);
    setUsers({});
    return [];
  } finally {
    setLoading(false);
  }
}

export {
  fetchProjects,
  fetchSprints,
  fetchTasks,
  fetchUsers,
}

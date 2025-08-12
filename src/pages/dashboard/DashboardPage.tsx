import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useJira } from "@/hooks/useJira";
import type { JiraContextType } from "@/contexts/JiraContext";
import { StatCard } from "@/components/StatCard";
import { CheckCircle, ListTodo, Star } from "lucide-react";
import type { Task } from "@/data/schema";
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { AssigneeTasksModal } from "@/components/AssigneeTasksModal";
import { LoadingLogModal } from "@/components/LoadingLogModal";
import { isCarryover } from "@/helpers/is-carryover";

interface AssigneeStat {
  name: string;
  totalTasks: number;
  totalStoryPoints: number;
  averageComplexity: number;
  qaRework: number;
  delaysMinutes: number;
}

export const DashboardPage = () => {
  const {
    tasks,
    sprintInfo,
    loading,
    assigneeStats,
    weightStoryPoints,
    weightTasks,
    weightComplexity,
    weightRework,
    weightDelays,
    perfectWorkKpiLimit,
    historicalReworkRate,
    weightsSum,
    reworkKpiUpperLimit,
    totalStoryPointsTarget,
    totalTasksTarget,
    sprintAverageComplexityTarget,
    logMessages,
    sprints,
  } = useJira() as JiraContextType;

  const [kpis, setKpis] = useState<Record<string, number>>({});
  const [assigneeStatsCache, setAssigneeStatsCache] = useState<Record<string, { qaRework: number; delaysMinutes: number }>>({});

  useEffect(() => {
    const cache: Record<string, { qaRework: number; delaysMinutes: number }> = {};
    assigneeStats.forEach(stat => {
      const key = `assigneeStats_${stat.name}`;
      const cached = localStorage.getItem(key);
      if (cached) {
        const parsed = JSON.parse(cached!);
        cache[stat.name] = {
          qaRework: Number(parsed.qaRework) || 0,
          delaysMinutes: Number(parsed.delaysMinutes) || 0,
        };
      } else {
        cache[stat.name] = { qaRework: 0, delaysMinutes: 0 };
      }
    });
    setAssigneeStatsCache(cache);
    const sprintId = sprintInfo?.id ? String(sprintInfo.id) : 'unknown';
    const kpiCacheKey = `kpis_by_sprint_${sprintId}`;
    const kpiCacheRaw = localStorage.getItem(kpiCacheKey);
    let kpiCache: Record<string, number> = {};
    if (kpiCacheRaw) {
      try {
        kpiCache = JSON.parse(kpiCacheRaw);
        setKpis(kpiCache);
      } catch {
        setKpis({});
      }
    } else {
      const fetchKpis = async () => {
        try {
          const config = {
            weightStoryPoints,
            weightTasks,
            weightComplexity,
            weightRework,
            weightDelays,
            perfectWorkKpiLimit,
            historicalReworkRate,
            weightsSum,
            reworkKpiUpperLimit,
            totalStoryPointsTarget,
            totalTasksTarget,
            sprintAverageComplexityTarget,
          };
          const response = await axios.post("/api/kpi", {
            assigneeStats: assigneeStats.map(stat => ({
              ...stat,
              qaRework: cache[stat.name]?.qaRework ?? stat.qaRework,
            })),
            config,
          });
          const kpiCacheKeyLocal = `kpis_by_sprint_${sprintId}`;
          const kpiMap: Record<string, number> = {};
          const kpiCache: Record<string, number> = {};
          response.data.kpis.forEach((k: { name: string; kpi: number }) => {
            kpiMap[k.name] = k.kpi;
            kpiCache[k.name] = k.kpi;
          });
          setKpis(kpiMap);
          localStorage.setItem(kpiCacheKeyLocal, JSON.stringify(kpiCache));
        } catch {
          setKpis({});
        }
      };
      if (assigneeStats.length > 0) {
        fetchKpis();
      }
    }
  }, [assigneeStats, sprintInfo?.id, weightStoryPoints, weightTasks, weightComplexity, weightRework, weightDelays, perfectWorkKpiLimit, historicalReworkRate, weightsSum, reworkKpiUpperLimit, totalStoryPointsTarget, totalTasksTarget, sprintAverageComplexityTarget]);

  const handleUpdateAssigneeStats = useCallback((assigneeName: string, qaRework: number, delaysMinutes: number) => {
    setAssigneeStatsCache(prev => ({
      ...prev,
      [assigneeName]: { qaRework, delaysMinutes },
    }));
    localStorage.setItem(`assigneeStats_${assigneeName}`, JSON.stringify({ qaRework, delaysMinutes }));
  }, []);

  const validatedTasks = tasks.map((task: Task) => ({ ...task, sprintHistory: task.sprintHistory ?? [] }));
  const totalTasks = tasks.length;
  const totalStoryPoints = tasks.reduce((acc: number, task: Task) => acc + (task.storyPoints || 0), 0);
  const selectedSprintId = sprintInfo?.id ? sprintInfo.id.toString() : '';

  useEffect(() => {
  }, [tasks, validatedTasks, selectedSprintId]);
  const selectedSprint = sprintInfo;
  const allSprints = sprints;

  const carryoverTasks = tasks.filter((task: Task) =>
    isCarryover({ task, selectedSprint, allSprints })
  );
  const newTasks = tasks.filter((task: Task) =>
    !isCarryover({ task, selectedSprint, allSprints })
  );
  const newTasksCount = newTasks.length;
  const carryoverTasksCount = carryoverTasks.length;
  const newStoryPoints = newTasks.reduce((acc: number, task: Task) => acc + (task.storyPoints || 0), 0);
  const carryoverStoryPoints = carryoverTasks.reduce((acc: number, task: Task) => acc + (task.storyPoints || 0), 0);
  const tasksDone = tasks.filter((task: Task) => task.status === "done").length;

  if (loading) {
    return <div>Cargando dashboard...</div>;
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          Dashboard: {sprintInfo?.name || "Ningún Sprint Seleccionado"}
        </h2>
        <div className="flex items-center space-x-2"></div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Tareas Totales en Sprint"
          value={totalTasks.toString()}
          icon={<ListTodo className="h-4 w-4 text-muted-foreground" />}
        >
          <span>Nuevas: <span className="font-semibold text-foreground">{newTasksCount}</span></span>
          <span>Carryover: <span className="font-semibold text-foreground">{carryoverTasksCount}</span></span>
        </StatCard>
        <StatCard
          title="Puntos de Historia Totales"
          value={totalStoryPoints.toString()}
          icon={<Star className="h-4 w-4 text-muted-foreground" />}
        >
          <span>Nuevos: <span className="font-semibold text-foreground">{newStoryPoints}</span></span>
          <span>Carryover: <span className="font-semibold text-foreground">{carryoverStoryPoints}</span></span>
        </StatCard>
        <StatCard
          title="Tareas Completadas"
          value={`${tasksDone} of ${totalTasks}`}
          icon={<CheckCircle className="h-4 w-4 text-muted-foreground" />}
        />
      </div>
      {/* Tabla de tareas eliminada por requerimiento */}
      <LoadingLogModal isOpen={loading && logMessages.length > 0} messages={logMessages} />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {assigneeStats && assigneeStats.map((stat: AssigneeStat) => {
          const assigneeTasks = tasks.filter(
            (task: Task) => (task.assignee?.name || "Unassigned") === stat.name
          );
          return (
            <Card key={stat.name}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-semibold">{stat.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Tasks:</span>
                    <span className="font-medium text-foreground">{stat.totalTasks}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Story Points:</span>
                    <span className="font-medium text-foreground">{stat.totalStoryPoints}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg. Complexity:</span>
                    <span className="font-medium text-foreground">{stat.averageComplexity.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Retrabajos de QA:</span>
                    <span className="font-medium text-foreground">{assigneeStatsCache[stat.name]?.qaRework ?? stat.qaRework}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Atrasos (Minutos):</span>
                    <span className="font-medium text-foreground">{assigneeStatsCache[stat.name]?.delaysMinutes ?? stat.delaysMinutes}</span>
                  </div>
                  <AssigneeTasksModal
                    assigneeName={stat.name}
                    tasks={assigneeTasks}
                    onUpdateStats={handleUpdateAssigneeStats}
                    sprints={sprints}
                    selectedSprintId={selectedSprintId}
                  >
                    <Button variant="outline" size="sm" className="mt-2 w-full">
                      Detalles
                    </Button>
                  </AssigneeTasksModal>
                </div>
                <hr className="my-3 border-gray-200" />
                <div className="flex justify-between items-center mt-2">
                  <span className="font-semibold text-xs text-gray-500">KPI</span>
                  <span className="font-bold text-primary">
                    {kpis[stat.name] !== undefined ? `${kpis[stat.name]}%` : "-"}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

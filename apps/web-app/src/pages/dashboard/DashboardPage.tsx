import { CheckCircle, ListTodo, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { StatCard } from "../../components/StatCard";
import { useState, useEffect, useMemo } from "react";
import { useJira } from "../../hooks/useJira";
import type { JiraContextType } from "../../contexts/JiraContext.types";
import { AssigneeTasksModal } from "../../components/AssigneeTasksModal";
import { DashboardOptionsModal } from "../../components/DashboardOptionsModal";
import { Button } from "../../components/ui/button";



export const DashboardPage = () => {
  const { 
    projects, sprints, tasksCache, selectedProjectKey, sprintInfo, loading, fetchTasks,
    weightStoryPoints, weightTasks, weightComplexity, weightRework, weightDelays, historicalReworkRate, perfectWorkKpiLimit, kpiRecalcTrigger
  } = useJira() as JiraContextType;
  
  // Get tasks from cache for selected sprint
  const selectedSprintId = sprintInfo?.id?.toString() || '';
  const tasks = selectedSprintId ? (tasksCache[selectedSprintId] || []) : [];
  

  

  
  // Use sprintInfo from context
  const selectedSprint = sprintInfo;


  
  // Separate new vs carryover tasks using API classification
  const newTasks = tasks.filter((task: any) => task.isCarryover !== true);
  const carryoverTasks = tasks.filter((task: any) => task.isCarryover === true);
  

  
  // Calculate metrics
  const totalTasks = tasks.length;
  const newTasksCount = newTasks.length;
  const carryoverTasksCount = carryoverTasks.length;
  
  const totalStoryPoints = tasks.reduce((acc: number, task: any) => acc + (task.storyPoints || 0), 0);
  const newStoryPoints = newTasks.reduce((acc: number, task: any) => acc + (task.storyPoints || 0), 0);
  const carryoverStoryPoints = carryoverTasks.reduce((acc: number, task: any) => acc + (task.storyPoints || 0), 0);
  
  const tasksDone = tasks.filter((task: any) => task.status === 'Done' || task.status === 'done').length;
  
  // Group ALL tasks by assignee (for details modal) but calculate KPIs based only on new tasks - memoized
  const assigneeStatsArray = useMemo(() => {
    const assigneeStats = tasks.reduce((acc: any, task: any) => {
      const assigneeName = task.assignee?.displayName || task.assignee?.name || 'Unassigned';
      if (!acc[assigneeName]) {
        acc[assigneeName] = {
          name: assigneeName,
          totalTasks: 0,
          totalStoryPoints: 0,
          averageComplexity: 0,
          qaRework: 0,
          delaysMinutes: 0,
          tasks: []
        };
      }
      // Only count new tasks for KPI calculations
      if (task.isCarryover !== true) {
        acc[assigneeName].totalTasks += 1;
        acc[assigneeName].totalStoryPoints += task.storyPoints || 0;
      }
      // But include all tasks for the details modal
      acc[assigneeName].tasks.push(task);
      return acc;
    }, {});
    
    // Calculate average complexity and load cached metrics
    Object.values(assigneeStats).forEach((stat: any) => {
      if (stat.totalStoryPoints > 0 && stat.totalTasks > 0) {
        stat.averageComplexity = stat.totalStoryPoints / stat.totalTasks;
      }
      
      // Load cached metrics from localStorage
      const cachedStats = localStorage.getItem(`assigneeStats_${stat.name}`);
      if (cachedStats) {
        try {
          const parsed = JSON.parse(cachedStats);
          stat.qaRework = parsed.qaRework || 0;
          stat.delaysMinutes = parsed.delaysMinutes || 0;
        } catch (e) {

        }
      }
    });
    
    return Object.values(assigneeStats);
  }, [tasks, newTasks]);
  
  // Load KPI configuration from localStorage
  const [kpis, setKpis] = useState<Record<string, number>>({});
  
  useEffect(() => {
    // Load cached KPIs first
    const sprintId = selectedSprintId || 'unknown';
    const kpiCacheKey = `kpis_by_sprint_${sprintId}`;
    const kpiCacheRaw = localStorage.getItem(kpiCacheKey);
    if (kpiCacheRaw) {
      try {
        const kpiCache = JSON.parse(kpiCacheRaw);
        setKpis(kpiCache);
        return;
      } catch {
        // Continue to calculate KPIs if cache fails
      }
    }
    
    // Calculate KPIs if no cache or assignee stats available
    if (assigneeStatsArray.length > 0) {
      // Calculate dynamic targets based on sprint totals
      const targetStoryPoints = newStoryPoints / 2;
      const targetTasks = newTasksCount / 2;
      const sprintComplexity = newTasksCount > 0 ? newStoryPoints / newTasksCount : 0;
      
      const calculateKpi = (stat: any) => {
        // Use KPI configuration from context (already loaded from localStorage)
        
        const weightsSum = weightStoryPoints + weightTasks + weightComplexity + weightRework + weightDelays;
        
        // Step-by-step calculations with intermediate values
        const storyPointsRatio = targetStoryPoints > 0 ? stat.totalStoryPoints / targetStoryPoints : 0;
        const storyPointsKpi = storyPointsRatio * (weightStoryPoints / 100);
        
        const tasksRatio = targetTasks > 0 ? stat.totalTasks / targetTasks : 0;
        const tasksKpi = tasksRatio * (weightTasks / 100);
        
        const userComplexity = stat.totalTasks > 0 ? stat.totalStoryPoints / stat.totalTasks : 0;
        const targetComplexity = targetTasks > 0 ? targetStoryPoints / targetTasks : 0;
        const complexityRatio = targetComplexity > 0 ? userComplexity / targetComplexity : 0;
        const complexityKpi = complexityRatio * (weightComplexity / 100);
        
        const reworkRatio = historicalReworkRate > 0 ? stat.qaRework / historicalReworkRate : 0;
        const reworkPct = Math.max((perfectWorkKpiLimit / 100) - reworkRatio, 0);
        const reworkKpi = reworkPct * (weightRework / 100);
        
        const delaysRatio = stat.delaysMinutes / 60;
        const delaysPct = Math.max(1 - delaysRatio, 0);
        const delaysKpi = delaysPct * (weightDelays / 100);
        
        const kpiRaw = storyPointsKpi + tasksKpi + complexityKpi + reworkKpi + delaysKpi;
        const finalKpi = Math.round(kpiRaw * 100);
        
        console.log(`[KPI_CALCULATION] ${stat.name}:`, {
          inputs: {
            userStoryPoints: stat.totalStoryPoints,
            userTasks: stat.totalTasks,
            userQaRework: stat.qaRework,
            userDelaysMinutes: stat.delaysMinutes,
            targetStoryPoints,
            targetTasks,
            historicalReworkRate
          },
          ratios: {
            storyPointsRatio: storyPointsRatio.toFixed(4),
            tasksRatio: tasksRatio.toFixed(4),
            userComplexity: userComplexity.toFixed(4),
            targetComplexity: targetComplexity.toFixed(4),
            complexityRatio: complexityRatio.toFixed(4),
            reworkRatio: reworkRatio.toFixed(4),
            delaysRatio: delaysRatio.toFixed(4)
          },
          percentages: {
            reworkPct: reworkPct.toFixed(4),
            delaysPct: delaysPct.toFixed(4)
          },
          weights: {
            weightStoryPoints: `${weightStoryPoints}% (${weightStoryPoints/100})`,
            weightTasks: `${weightTasks}% (${weightTasks/100})`,
            weightComplexity: `${weightComplexity}% (${weightComplexity/100})`,
            weightRework: `${weightRework}% (${weightRework/100})`,
            weightDelays: `${weightDelays}% (${weightDelays/100})`
          },
          kpiComponents: {
            storyPointsKpi: storyPointsKpi.toFixed(6),
            tasksKpi: tasksKpi.toFixed(6),
            complexityKpi: complexityKpi.toFixed(6),
            reworkKpi: reworkKpi.toFixed(6),
            delaysKpi: delaysKpi.toFixed(6)
          },
          finalCalculation: {
            summation: `${storyPointsKpi.toFixed(6)} + ${tasksKpi.toFixed(6)} + ${complexityKpi.toFixed(6)} + ${reworkKpi.toFixed(6)} + ${delaysKpi.toFixed(6)}`,
            kpiRaw: kpiRaw.toFixed(6),
            kpiRawTimes100: (kpiRaw * 100).toFixed(2),
            finalKpi,
            formula: `(${storyPointsKpi.toFixed(6)} + ${tasksKpi.toFixed(6)} + ${complexityKpi.toFixed(6)} + ${reworkKpi.toFixed(6)} + ${delaysKpi.toFixed(6)}) × 100 = ${finalKpi}%`
          }
        });
        
        return finalKpi;
      };
      
      const newKpis: Record<string, number> = {};
      assigneeStatsArray.forEach((stat: any) => {
        newKpis[stat.name] = calculateKpi(stat);
      });
      
      setKpis(newKpis);
      
      // Cache the calculated KPIs
      localStorage.setItem(kpiCacheKey, JSON.stringify(newKpis));
    }
  }, [selectedSprintId, assigneeStatsArray.length, weightStoryPoints, weightTasks, weightComplexity, weightRework, weightDelays, historicalReworkRate, perfectWorkKpiLimit, newStoryPoints, newTasksCount, kpiRecalcTrigger]);




  if (loading) {
    return <div>Cargando dashboard...</div>;
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          Dashboard: {selectedSprint?.name || "No Sprint Selected"}
        </h2>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">
            Project: {selectedProjectKey || 'None'} | Tasks: {totalTasks} | Points: {totalStoryPoints}
          </span>
          <DashboardOptionsModal />
        </div>
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
      
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {assigneeStatsArray.map((stat: any) => (
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
                  <span className="font-medium text-foreground">{stat.qaRework}</span>
                </div>
                <div className="flex justify-between">
                  <span>Atrasos (Minutos):</span>
                  <span className="font-medium text-foreground">{stat.delaysMinutes}</span>
                </div>
              </div>
              <AssigneeTasksModal
                assigneeName={stat.name}
                tasks={stat.tasks}
                onUpdateStats={() => {}}
                sprints={sprints}
                selectedSprintId={selectedSprintId}
              >
                <Button variant="outline" size="sm" className="mt-2 w-full">
                  Detalles
                </Button>
              </AssigneeTasksModal>
              <hr className="my-3 border-gray-200" />
              <div className="flex justify-between items-center mt-2">
                <span className="font-semibold text-xs text-gray-500">KPI</span>
                <span className="font-bold text-primary">
                  {kpis[stat.name] !== undefined ? `${kpis[stat.name]}%` : "-"}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

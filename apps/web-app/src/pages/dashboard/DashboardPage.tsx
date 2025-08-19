import { CheckCircle, ListTodo, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { StatCard } from "../../components/StatCard";
import { useState, useEffect, useMemo } from "react";
import { useJira } from "../../hooks/useJira";
import type { JiraContextType } from "../../contexts/JiraContext.types";
import { AssigneeTasksModal } from "../../components/AssigneeTasksModal";
import { DashboardOptionsModal } from "../../components/DashboardOptionsModal";
import { Button } from "../../components/ui/button";
import { calculateFinalKpi, type KpiInputs, type KpiWeights } from "../../lib/kpiCalculators";
import { shouldIncludeTaskForKpi, getUserKpiTasks } from "../../lib/sprintDateFilter";



export const DashboardPage = () => {
  const { 
    projects, sprints, tasksCache, selectedProjectKey, sprintInfo, loading, fetchTasks, allUsers,
    weightStoryPoints, weightTasks, weightComplexity, weightRework, weightDelays, historicalReworkRate, perfectWorkKpiLimit, kpiRecalcTrigger,
    assigneeStatsBySprint, setAssigneeSprintStat, sprintQuality, tasksProcessed, recalculateKpis
  } = useJira() as JiraContextType;
  
  // Get tasks from cache for selected sprint
  const selectedSprintId = sprintInfo?.id?.toString() || '';
  const sprintTasks = selectedSprintId ? (tasksCache[selectedSprintId] || []) : [];
  
  // Use sprintInfo from context
  const selectedSprint = sprintInfo;

  // Separate new vs carryover tasks using API classification (for summary cards)
  const newTasks = sprintTasks.filter((task: any) => task.isCarryover !== true);
  const carryoverTasks = sprintTasks.filter((task: any) => task.isCarryover === true);
  

  
  // Calculate metrics for summary cards (only sprint tasks)
  const totalTasks = sprintTasks.length;
  const newTasksCount = newTasks.length;
  const carryoverTasksCount = carryoverTasks.length;
  
  const totalStoryPoints = sprintTasks.reduce((acc: number, task: any) => acc + (task.storyPoints || 0), 0);
  const newStoryPoints = newTasks.reduce((acc: number, task: any) => acc + (task.storyPoints || 0), 0);
  const carryoverStoryPoints = carryoverTasks.reduce((acc: number, task: any) => acc + (task.storyPoints || 0), 0);
  
  const tasksDone = sprintTasks.filter((task: any) => task.status === 'Done' || task.status === 'done').length;
  
  // Group ALL tasks by assignee (for details modal) but calculate KPIs based on sprint date assignment - memoized
  const assigneeStatsArray = useMemo(() => {
    const assigneeStats = sprintTasks.reduce((acc: any, task: any) => {
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
      // Count tasks assigned to user during sprint period for KPI calculations
      if (shouldIncludeTaskForKpi(task, assigneeName, selectedSprint?.startDate, selectedSprint?.completeDate)) {
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
  }, [sprintTasks, selectedSprint?.startDate, selectedSprint?.completeDate]);
  
  // Load KPI configuration from assigneeStatsBySprint
  const [kpis, setKpis] = useState<Record<string, number>>({});
  
  useEffect(() => {
    const sprintId = selectedSprintId || 'unknown';
    
    // Load cached KPIs from assigneeStatsBySprint
    if (assigneeStatsBySprint[sprintId]?.assigneeKpis) {
      const cachedKpis: Record<string, number> = {};
      assigneeStatsBySprint[sprintId].assigneeKpis.forEach((assignee: any) => {
        cachedKpis[assignee.name] = assignee.globalKpi;
      });
      setKpis(cachedKpis);
      return;
    }
    
    // Calculate KPIs if no cache or assignee stats available AND tasks are processed
    if (assigneeStatsArray.length > 0 && tasksProcessed[sprintId]) {
      // Calculate dynamic targets based on sprint totals
      const targetStoryPoints = newStoryPoints / 2;
      const targetTasks = newTasksCount / 2;
      const sprintComplexity = newTasksCount > 0 ? newStoryPoints / newTasksCount : 0;
      
      const calculateKpi = (stat: any) => {
        const inputs: KpiInputs = {
          userStoryPoints: stat.totalStoryPoints,
          userTasks: stat.totalTasks,
          userQaRework: stat.qaRework,
          userDelaysMinutes: stat.delaysMinutes,
          targetStoryPoints,
          targetTasks,
          historicalReworkRate,
          perfectWorkKpiLimit
        };
        
        const weights: KpiWeights = {
          weightStoryPoints,
          weightTasks,
          weightComplexity,
          weightRework,
          weightDelays
        };
        
        const { components, finalKpi } = calculateFinalKpi(inputs, weights);
        
        const kpiTasks = getUserKpiTasks(sprintTasks, stat.name, selectedSprint?.startDate, selectedSprint?.completeDate);
        
        console.log(`[KPI_CALCULATION] ${stat.name}:`, {
          inputs,
          weights,
          components,
          finalKpi,
          kpiTasks: kpiTasks.map(t => {
            const dateStr = t.assignedDate && t.assignedDate !== 'Unknown' 
              ? new Date(t.assignedDate).toLocaleDateString('es-CL') 
              : 'No date';
            return `${t.taskId} (assigned: ${dateStr}, points: ${t.storyPoints})`;
          }),
          sprintDates: {
            startDate: selectedSprint?.startDate,
            completeDate: selectedSprint?.completeDate
          }
        });
        
        return finalKpi;
      };
      
      const newKpis: Record<string, number> = {};
      const assigneeKpis: any[] = [];
      
      assigneeStatsArray.forEach((stat: any) => {
        const kpiResult = calculateKpi(stat);
        newKpis[stat.name] = kpiResult;
        assigneeKpis.push({
          name: stat.name,
          globalKpi: kpiResult,
          totalTasks: stat.totalTasks,
          totalStoryPoints: stat.totalStoryPoints,
          averageComplexity: stat.averageComplexity,
          qaRework: stat.qaRework,
          delaysMinutes: stat.delaysMinutes
        });
      });
      
      setKpis(newKpis);
      
      // Store in assigneeStatsBySprint structure
      const sprintStats = {
        sprintId: parseInt(sprintId),
        stats: {
          kpi_sprintQuality: sprintQuality,
          kpi_historicalReworkRate: historicalReworkRate,
          kpi_perfectWorkKpiLimit: perfectWorkKpiLimit,
          kpi_weightStoryPoints: weightStoryPoints,
          kpi_weightTasks: weightTasks,
          kpi_weightComplexity: weightComplexity,
          kpi_weightRework: weightRework,
          kpi_weightDelays: weightDelays,
          targetStoryPoints,
          targetTasks,
          newStoryPoints,
          newTasksCount
        },
        assigneeKpis
      };
      
      setAssigneeSprintStat(sprintId, sprintStats);
    }
  }, [selectedSprintId, assigneeStatsArray.length, weightStoryPoints, weightTasks, weightComplexity, weightRework, weightDelays, historicalReworkRate, perfectWorkKpiLimit, newStoryPoints, newTasksCount, kpiRecalcTrigger, tasksProcessed]);




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
            {selectedSprint?.startDate && (
              <>Inicio: {new Date(selectedSprint.startDate).toLocaleDateString('es-CL')}</>
            )}
            {(selectedSprint?.endDate || selectedSprint?.completeDate) && (
              <> | Fin: {new Date(selectedSprint.endDate || selectedSprint.completeDate!).toLocaleDateString('es-CL')}</>
            )}
          </span>
          <Button onClick={recalculateKpis} variant="outline" size="sm">
            Recalcular KPIs
          </Button>
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
        {assigneeStatsArray
          .filter((stat: any) => {
            const user = allUsers.find(u => u.displayName === stat.name || u.name === stat.name);
            return user?.active === true;
          })
          .map((stat: any) => (
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

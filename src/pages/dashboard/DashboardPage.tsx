import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useJira } from "@/hooks/useJira";
import { StatCard } from "@/components/StatCard";
import { CheckCircle, ListTodo, Star } from "lucide-react";
import type { Task } from "@/data/schema";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { AssigneeTasksModal } from "@/components/AssigneeTasksModal";
import { DashboardOptionsModal } from "@/components/DashboardOptionsModal";

interface AssigneeStat {
  name: string;
  totalTasks: number;
  totalStoryPoints: number;
  averageComplexity: number;
  qaRework: number; // Retrabajos de QA
  delaysMinutes: number; // Atrasos (Minutos)
}

export const DashboardPage = () => {
  const { tasks, sprintInfo, uniqueStatuses, loading, assigneeStats } = useJira();
  const [isDebugVisible, setIsDebugVisible] = useState(false);
  const [assigneeStatsCache, setAssigneeStatsCache] = useState<Record<string, { qaRework: number; delaysMinutes: number }>>({});

  useEffect(() => {
    // Cargar valores de QA y Atrasos desde localStorage para todos los asignados
    const cache: Record<string, { qaRework: number; delaysMinutes: number }> = {};
    assigneeStats.forEach(stat => {
      const key = `assigneeStats_${stat.name}`;
      const cached = localStorage.getItem(key);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          cache[stat.name] = {
            qaRework: Number(parsed.qaRework) || 0,
            delaysMinutes: Number(parsed.delaysMinutes) || 0,
          };
        } catch {
          cache[stat.name] = { qaRework: 0, delaysMinutes: 0 };
        }
      } else {
        cache[stat.name] = { qaRework: 0, delaysMinutes: 0 };
      }
    });
    setAssigneeStatsCache(cache);
  }, [assigneeStats]);

  // Función para actualizar el cache y localStorage desde el modal
  const handleUpdateAssigneeStats = useCallback((assigneeName: string, qaRework: number, delaysMinutes: number) => {
    setAssigneeStatsCache(prev => ({
      ...prev,
      [assigneeName]: { qaRework, delaysMinutes },
    }));
    localStorage.setItem(`assigneeStats_${assigneeName}`, JSON.stringify({ qaRework, delaysMinutes }));
  }, []);

  if (loading) {
    return <div>Loading dashboard...</div>;
  }

  const totalTasks = tasks.length;
  const totalStoryPoints = tasks.reduce((acc: number, task: Task) => acc + (task.storyPoints || 0), 0);

  const tasksDone = tasks.filter((task: Task) => task.status === "done").length;
  const completedStoryPoints = tasks
    .filter((task: Task) => task.status === "done")
    .reduce((acc: number, task: Task) => acc + (task.storyPoints || 0), 0);

  const progressPercentage = totalStoryPoints > 0 ? (completedStoryPoints / totalStoryPoints) * 100 : 0;

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          Dashboard: {sprintInfo?.name || "No Sprint Selected"}
        </h2>
        <div className="flex items-center space-x-2">
          <DashboardOptionsModal />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Tasks in Sprint"
          value={totalTasks.toString()}
          icon={<ListTodo className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          title="Total Story Points"
          value={totalStoryPoints.toString()}
          icon={<Star className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          title="Tasks Completed"
          value={`${tasksDone} of ${totalTasks}`}
          icon={<CheckCircle className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {assigneeStats && assigneeStats.map((stat: AssigneeStat) => {
          const assigneeTasks = tasks.filter(
            (task) => (task.assignee?.name || "Unassigned") === stat.name
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
                  >
                    <Button variant="outline" size="sm" className="mt-2 w-full">
                      Details
                    </Button>
                  </AssigneeTasksModal>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {isDebugVisible && (
        <>
          {uniqueStatuses && uniqueStatuses.length > 0 && (
            <div className="grid gap-4 grid-cols-1">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Unique Jira Statuses Detected (for debugging)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {uniqueStatuses.map((status: string) => (
                      <Badge key={status} variant="outline" className="mr-2 mb-2">
                        {status}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle className="text-sm font-medium">Tasks Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between text-sm">
                    <span>Total Tasks</span>
                    <span>{tasks.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Total Story Points</span>
                    <span>{totalStoryPoints}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Completed Story Points</span>
                    <span>{completedStoryPoints}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{`${progressPercentage.toFixed(2)}%`}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

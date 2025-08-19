import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/ui/tooltip";
import { labels, priorities, statuses } from "../data/data";
// Importar tipos al inicio
import type { Task } from "../dao/common";
import type { NormalizedTask } from "../types/NormalizedTask";
import type { JiraSprint } from '../dao/jira';
import type { ReactNode } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Pencil, Check } from "lucide-react";
import { useState, useEffect } from "react";
import { useJira } from "../hooks/useJira";
import { isCarryover } from "../helpers/is-carryover";

interface AssigneeTasksModalProps {
  assigneeName: string;
  tasks: Array<Task | NormalizedTask>;
  children: ReactNode;
  onUpdateStats?: (assigneeName: string, qaRework: number, delaysMinutes: number) => void;
  sprints?: JiraSprint[];
  selectedSprintId?: string;
}

const getAssigneeStatsKey = (assigneeName: string) => `assigneeStats_${assigneeName}`;

export function AssigneeTasksModal({ assigneeName, tasks, children, onUpdateStats, sprints, selectedSprintId }: AssigneeTasksModalProps) {
  // Estado local para edición
  const [editMode, setEditMode] = useState(false);
  const [qaRework, setQaRework] = useState(0);
  const [delaysMinutes, setDelaysMinutes] = useState(0);
  // Tipar userTypes correctamente
  const { userTypes, activeStatuses } = useJira() as { userTypes: Record<string, string>; activeStatuses: Record<string, boolean> };

  const filteredTasks = tasks.filter(task => {
    if (typeof task.status === 'string') return activeStatuses[task.status] !== false;
    if (typeof task.status === 'object' && task.status.name) return activeStatuses[task.status.name] !== false;
    return true;
  });

  // Cargar valores desde localStorage al abrir
  useEffect(() => {
    const key = getAssigneeStatsKey(assigneeName);
    const cached = localStorage.getItem(key);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setQaRework(Number(parsed.qaRework) || 0);
        setDelaysMinutes(Number(parsed.delaysMinutes) || 0);
      } catch {
        setQaRework(0);
        setDelaysMinutes(0);
      }
    } else {
      setQaRework(0);
      setDelaysMinutes(0);
    }
  }, [assigneeName]);

  // Guardar en localStorage
  const handleSave = () => {
    const key = getAssigneeStatsKey(assigneeName);
    localStorage.setItem(key, JSON.stringify({ qaRework, delaysMinutes }));
    if (onUpdateStats) {
      onUpdateStats(assigneeName, qaRework, delaysMinutes);
    }
    setEditMode(false);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle>Tareas Asignadas a {assigneeName}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2 items-center mb-2">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Retrabajos de QA</span>
              {editMode ? (
                <Input
                  type="number"
                  min={0}
                  value={qaRework}
                  onChange={e => setQaRework(Number(e.target.value))}
                  className="w-28"
                  aria-label="Editar retrabajos de QA"
                />
              ) : (
                <span className="font-semibold text-base">{qaRework}</span>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Atrasos (Minutos)</span>
              {editMode ? (
                <Input
                  type="number"
                  min={0}
                  value={delaysMinutes}
                  onChange={e => setDelaysMinutes(Number(e.target.value))}
                  className="w-28"
                  aria-label="Editar atrasos en minutos"
                />
              ) : (
                <span className="font-semibold text-base">{delaysMinutes}</span>
              )}
            </div>
            <div className="flex gap-2 ml-2 mt-5">
              {!editMode ? (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Editar campos de QA y atrasos"
                  onClick={() => setEditMode(true)}
                  tabIndex={0}
                >
                  <Pencil className="h-5 w-5" />
                </Button>
              ) : (
                <Button
                  variant="default"
                  size="icon"
                  aria-label="Guardar cambios de QA y atrasos"
                  onClick={handleSave}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  tabIndex={0}
                >
                  <Check className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID de Tarea</TableHead>
                  <TableHead>Nombre de Tarea</TableHead>
                  <TableHead>Tipo de Incidencia</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Prioridad</TableHead>
                  <TableHead className="text-right">Puntos de Historia</TableHead>
                  <TableHead>Tipo de Usuario</TableHead>
                  <TableHead>Última Actualización</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTasks.map((task) => {
                  // Compatibilidad para NormalizedTask y Task
                  const label = 'label' in task ? task.label : '';
                  const issueType = labels.find((l) => l.value === label);
                  const statusValue = typeof task.status === 'string' ? task.status : (task.status && task.status.name ? task.status.name : 'Unknown');
                  const status = statuses.find((s) => s.value === statusValue);
                  const priorityValue = typeof task.priority === 'string' ? task.priority : (task.priority && task.priority.name ? task.priority.name : 'Unknown');
                  const priority = priorities.find((p) => p.value === priorityValue);
                  const assigneeName = 'assignee' in task && task.assignee && typeof task.assignee === 'object' ? ('displayName' in task.assignee ? task.assignee.displayName : (task.assignee.name || 'Unknown')) : 'Unassigned';
                  const userType = assigneeName ? userTypes[assigneeName] || "Sin asignación" : "Sin asignación";
                  // Estado Nueva/Carryover usando props
                  const selectedSprint = sprints?.find(s => String(s.id) === selectedSprintId);
                  const isCarry = selectedSprint
                    ? isCarryover({
                        task: {
                          ...task,
                          sprintHistory: Array.isArray(task.sprintHistory)
                            ? task.sprintHistory.map((s: string | { id: string }) => typeof s === 'string' ? s : s.id)
                            : [],
                        },
                        selectedSprint,
                        allSprints: sprints || [],
                      })
                    : false;
                  let badgeColor = "bg-gray-400 text-white";
                  if (userType === "Desarrollador") badgeColor = "bg-blue-600 text-white";
                  else if (userType === "QA") badgeColor = "bg-green-600 text-white";
                  else if (userType !== "Sin asignación" && userType !== "Sin tipo") badgeColor = "bg-yellow-500 text-white";

                  return (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium">{task.id}</TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger className="truncate max-w-[30ch] text-left">
                              {'title' in task ? task.title : ('summary' in task ? (task as NormalizedTask).summary : '')}
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{'title' in task ? task.title : ('summary' in task ? (task as NormalizedTask).summary : '')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <span>{issueType?.label || label}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          {status?.icon && (
                            <status.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                          )}
                          <span>{status?.label || statusValue}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          {priority?.icon && (
                            <priority.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                          )}
                          <span>{priority?.label || priorityValue}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{task.storyPoints || 0}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${isCarry ? "bg-red-600 text-white" : "bg-green-600 text-white"}`}
                          tabIndex={0}
                          aria-label={isCarry ? "Carryover" : "Nueva"}
                          role="status"
                        >
                          {isCarry ? "Carryover" : "Nueva"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${badgeColor}`}
                          tabIndex={0}
                          aria-label={`Tipo de usuario: ${userType}`}
                          role="status"
                        >
                          {userType}
                        </span>
                      </TableCell>
                      <TableCell>
                        {/* Fecha de última actualización: solo sincronización local */}
                        {(() => {
                          const sync = localStorage.getItem(`lastSync_${task.id}`);
                          return sync
                          ? new Date(sync).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })
                          : 'Sin registro';
                      })()}
                    </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

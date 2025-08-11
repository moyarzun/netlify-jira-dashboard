import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Settings2, Wrench } from "lucide-react";
import { useJira } from "@/hooks/useJira";

export function DashboardOptionsModal() {
  const {
    uniqueStatuses,
    tasks,
    sprintQuality, setSprintQuality,
    historicalReworkRate, setHistoricalReworkRate,
    perfectWorkKpiLimit, setPerfectWorkKpiLimit,
    weightStoryPoints, setWeightStoryPoints,
    weightTasks, setWeightTasks,
    weightComplexity, setWeightComplexity,
    weightRework, setWeightRework,
    weightDelays, setWeightDelays,
    weightsSum, weightsAreValid,
  } = useJira();
  const [open, setOpen] = React.useState(false);
  const [showDebug, setShowDebug] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);

  // KPIs resumen
  const totalTasks = tasks.length;
  const totalStoryPoints = tasks.reduce((acc, t) => acc + (t.storyPoints || 0), 0);
  const completedStoryPoints = tasks.filter(t => t.status === "done").reduce((acc, t) => acc + (t.storyPoints || 0), 0);
  const progressPercentage = totalStoryPoints > 0 ? (completedStoryPoints / totalStoryPoints) * 100 : 0;

  const handleSave = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
    setOpen(false);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="ml-auto hidden h-8 lg:flex"
        aria-label="Opciones de KPI"
        title="Opciones de KPI"
        onClick={() => setOpen(true)}
      >
        <Settings2 className="mr-2 h-4 w-4" />
        Opciones de KPI
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg w-full max-h-[90vh] p-0 flex flex-col">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Opciones de KPI</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 pb-6 pt-2 flex flex-col gap-4">
            {/* Campos numéricos de KPI */}
            <div className="grid grid-cols-1 gap-3 border-b pb-4">
              <label className="flex flex-col gap-1">
                <span className="font-medium">Porcentaje de Calidad de Sprint (%)</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={sprintQuality}
                  onChange={e => setSprintQuality(Number(e.target.value))}
                  className="border rounded px-2 py-1 text-right focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-medium">Tasa Histórica de Retrabajos (%)</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={historicalReworkRate}
                  onChange={e => setHistoricalReworkRate(Number(e.target.value))}
                  className="border rounded px-2 py-1 text-right focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-medium">Límite superior de KPI por Trabajo Perfecto</span>
                <input
                  type="number"
                  min={0}
                  value={perfectWorkKpiLimit}
                  onChange={e => setPerfectWorkKpiLimit(Number(e.target.value))}
                  className="border rounded px-2 py-1 text-right focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </label>
            </div>
            {/* Ponderaciones */}
            <div className="grid grid-cols-1 gap-3 border-b pb-4">
              <div className="font-semibold mb-1">Ponderaciones:</div>
              <label className="flex flex-col gap-1">
                <span>Story Points</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={weightStoryPoints}
                  onChange={e => setWeightStoryPoints(Number(e.target.value))}
                  className="border rounded px-2 py-1 text-right focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span>Tareas</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={weightTasks}
                  onChange={e => setWeightTasks(Number(e.target.value))}
                  className="border rounded px-2 py-1 text-right focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span>Complejidad</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={weightComplexity}
                  onChange={e => setWeightComplexity(Number(e.target.value))}
                  className="border rounded px-2 py-1 text-right focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span>Retrabajos</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={weightRework}
                  onChange={e => setWeightRework(Number(e.target.value))}
                  className="border rounded px-2 py-1 text-right focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span>Atrasos</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={weightDelays}
                  onChange={e => setWeightDelays(Number(e.target.value))}
                  className="border rounded px-2 py-1 text-right focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </label>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm font-medium">Suma total:</span>
                <span className={weightsAreValid ? "text-green-600" : "text-red-600 font-bold"}>{weightsSum}</span>
                {!weightsAreValid && (
                  <span
                    className="ml-2 text-red-600 text-sm font-semibold"
                    role="alert"
                    aria-live="assertive"
                  >
                    La suma de las ponderaciones debe ser exactamente 100.
                  </span>
                )}
              </div>
            </div>
            {/* Debug collapsible */}
            <div>
              <Button
                variant="ghost"
                size="sm"
                className="mb-2 flex items-center gap-2"
                aria-expanded={showDebug}
                aria-controls="debug-section"
                onClick={() => setShowDebug(v => !v)}
              >
                <Wrench className="h-4 w-4" />
                Debug
                <span className="ml-1">{showDebug ? "▲" : "▼"}</span>
              </Button>
              {showDebug && (
                <div id="debug-section" className="grid gap-4 grid-cols-1">
                  {uniqueStatuses && uniqueStatuses.length > 0 && (
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                          Estados Únicos de Jira Detectados (debug)
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
                  )}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium">Resumen de Tareas</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between text-sm">
                          <span>Tareas Totales</span>
                          <span>{totalTasks}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Puntos de Historia Totales</span>
                          <span>{totalStoryPoints}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Puntos de Historia Completados</span>
                          <span>{completedStoryPoints}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Progreso</span>
                          <span>{`${progressPercentage.toFixed(2)}%`}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
          <div className="px-6 pb-4 flex flex-col gap-2">
            <Button
              className="w-full"
              variant="default"
              aria-label="Guardar valores de KPI"
              disabled={!weightsAreValid}
              onClick={handleSave}
            >
              Guardar
            </Button>
            {saveSuccess && (
              <div className="w-full text-center text-green-600 text-sm mt-1" role="status">
                ¡Valores guardados!
              </div>
            )}
            <DialogClose asChild>
              <Button variant="secondary" className="w-full mt-2">Cerrar</Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

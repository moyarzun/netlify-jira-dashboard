
import { useState } from "react";
import { useJira } from "../hooks/useJira";
import type { JiraContextType } from "../contexts/JiraContext.types";
import { Button } from "./ui/button";
import { RotateCw } from "lucide-react";
import { useToast } from "./ui/use-toast";

interface ForceJiraUpdateButtonProps {
  sprintId?: number | null;
  label?: string;
  selectedProjectKey?: string;
  // ...existing code...
  fetchSprints?: (projectKey: string) => Promise<void>;
  onAfterUpdate?: () => void;
}

/**
 * Button to force refresh Jira data and update cache.
 * Shows loading state and toast notification on success/error.
 */
export const ForceJiraUpdateButton = ({
  sprintId,
  label = "Actualizar desde Jira",
  selectedProjectKey,
  // ...existing code...
  fetchSprints,
  onAfterUpdate,
}: ForceJiraUpdateButtonProps) => {
  const { forceUpdate, fetchProjects, fetchAllUsers, fetchProjectStatuses, recalculateKpis } = useJira() as JiraContextType;
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleForceUpdate = async () => {
    // Si no hay sprintId ni selectedProjectKey, forzar actualización global
    if (!sprintId && !selectedProjectKey) {
      setLoading(true);
      try {
        toast({
          title: "Actualizando información general...",
          description: "Obteniendo proyectos y usuarios desde Jira.",
          variant: "default",
        });
    if (typeof fetchProjects === 'function') await fetchProjects();
    if (typeof fetchAllUsers === 'function') await fetchAllUsers();
        toast({
          title: "Información general actualizada",
          description: "Proyectos y usuarios sincronizados desde Jira.",
          variant: "default",
        });
      } catch (err) {
        toast({
          title: "Error al actualizar información general",
          description: err instanceof Error ? err.message : String(err),
          variant: "destructive",
        });
      }
      setLoading(false);
      if (typeof onAfterUpdate === 'function') onAfterUpdate();
      return;
    }

      // ...existing lógica para sprints...
      let cachedIds: number[] = [];
      try {
        const raw = localStorage.getItem('cachedSprintIds');
        if (raw) {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) {
            cachedIds = arr.filter((id) => typeof id === 'number' || (typeof id === 'string' && !isNaN(Number(id)))).map(Number);
          }
        }
      } catch {
        // No hacer nada, solo evitar crash
      }

      const idsToUpdate = cachedIds.length > 0 ? cachedIds : sprintId ? [sprintId] : [];
      if (idsToUpdate.length === 0) {
        toast({
          title: "Ningún sprint seleccionado",
          description: "Por favor selecciona un sprint para actualizar los datos de Jira.",
          variant: "destructive",
        });
        return;
      }
      setLoading(true);
      let successCount = 0;
      let errorCount = 0;
      // Also fetch users and projects when updating sprints
      try {
        await Promise.all([
          fetchProjects(),
          fetchAllUsers()
        ]);
      } catch (err) {
        console.error('Error fetching projects/users:', err);
      }
      
      for (const id of idsToUpdate) {
        try {
          // 1. Forzar actualización desde Jira (API)
          await forceUpdate(id);
          // 2. Actualizar caché en memoria y sincronizar con LocalStorage
          await new Promise(res => setTimeout(res, 300));
          if (typeof fetchSprints === 'function' && selectedProjectKey) {
            await Promise.all([
              fetchSprints(selectedProjectKey),
              fetchProjectStatuses(selectedProjectKey)
            ]);
          }
          // 3. Recalcular KPIs
          if (typeof recalculateKpis === 'function') {
            recalculateKpis();
          }
          successCount++;
        } catch {
          errorCount++;
        }
      }

      if (errorCount === 0) {
        toast({
          title: "Datos de Jira actualizados",
          description: idsToUpdate.length > 1
            ? `Se actualizaron correctamente ${successCount} sprints cacheados desde Jira.`
            : "Se obtuvieron los datos más recientes de Jira y se actualizó la caché y LocalStorage.",
          variant: "default",
        });
      } else {
        toast({
          title: "Error al actualizar datos de Jira",
          description: `Actualizados: ${successCount}, Errores: ${errorCount}`,
          variant: "destructive",
        });
      }
      setLoading(false);
      if (typeof onAfterUpdate === 'function') {
        onAfterUpdate();
      }
    };

    return (
      <Button
        variant="outline"
        size="sm"
        className="h-8 flex items-center gap-2"
        aria-label="Force Jira Update"
        title="Force Jira Update"
        onClick={handleForceUpdate}
        disabled={loading}
      >
        <RotateCw className={loading ? "animate-spin h-4 w-4" : "h-4 w-4"} />
        {loading ? "Actualizando..." : label}
      </Button>
    )
  }

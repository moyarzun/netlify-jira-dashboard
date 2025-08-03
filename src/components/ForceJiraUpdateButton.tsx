
import { useState } from "react";
import { useJira } from "@/hooks/useJira";
import { Button } from "@/components/ui/button";
import { RotateCw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface ForceJiraUpdateButtonProps {
  sprintId?: number | null;
  label?: string;
  selectedProjectKey?: string;
  fetchProjects?: () => Promise<void>;
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
  fetchProjects,
  fetchSprints,
  onAfterUpdate,
}: ForceJiraUpdateButtonProps) => {
  // Se asume que forceUpdate, fetchProjects y fetchSprints se pasan como props desde SprintSelector
  // Si no se pasan, se usa useJira para forceUpdate por compatibilidad
  const { forceUpdate } = useJira();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleForceUpdate = async () => {
    // Leer los sprints cacheados
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

    // Si hay sprints cacheados, actualizarlos todos; si no, solo el actual
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
    for (const id of idsToUpdate) {
      try {
        await forceUpdate(id);
        successCount++;
      } catch {
        errorCount++;
      }
    }
    // Refrescar proyectos y sprints tras actualizar todos los sprints
    if (typeof fetchProjects === 'function') {
      await fetchProjects();
    }
    if (typeof fetchSprints === 'function' && selectedProjectKey) {
      await fetchSprints(selectedProjectKey);
    }
    if (errorCount === 0) {
      toast({
        title: "Datos de Jira actualizados",
        description: idsToUpdate.length > 1
          ? `Se actualizaron correctamente ${successCount} sprints cacheados desde Jira.`
          : "Se obtuvieron los datos más recientes de Jira y se actualizó la caché.",
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
  );
};

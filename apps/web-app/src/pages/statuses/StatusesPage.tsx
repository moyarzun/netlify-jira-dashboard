import { useJira } from '../../hooks/useJira';
import type { JiraContextType } from '../../contexts/JiraContext.types';
import { Switch } from '../../components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";

const StatusesPage = () => {
  const { projectStatuses, loading, error, activeStatuses, toggleStatusActivation } = useJira() as JiraContextType;

  if (loading) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Gestión de Estados</h1>
        <p>Cargando estados...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Gestión de Estados</h1>
        <p className="text-red-500">Error al cargar estados: {error}</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Gestión de Estados</h1>
      {projectStatuses.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead className="text-right">Mostrar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projectStatuses.map((status) => (
              <TableRow key={status.id}>
                <TableCell className="font-medium">{status.id}</TableCell>
                <TableCell>{status.name}</TableCell>
                <TableCell>
                  {status.statusCategory?.name ? (
                    <span
                      className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                        status.statusCategory.name.toLocaleLowerCase() === 'listo'
                          ? 'bg-green-600 text-white'
                          : status.statusCategory.name.toLowerCase() === 'en curso'
                          ? 'bg-blue-600 text-white'
                          : status.statusCategory.name.toLowerCase() === 'por hacer'
                          ? 'bg-gray-400 text-white'
                          : 'bg-yellow-500 text-white' // Default/fallback color
                      }`}
                    >
                      {status.statusCategory.name}
                    </span>
                  ) : (
                    'N/A'
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Switch
                    checked={activeStatuses[status.id] === undefined ? true : activeStatuses[status.id]} // Default to active
                    onCheckedChange={() => toggleStatusActivation(status.id)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p>No hay estados configurados para el proyecto seleccionado.</p>
      )}
    </div>
  );
};

export default StatusesPage;
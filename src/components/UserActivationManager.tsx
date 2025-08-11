import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useJira } from "@/hooks/useJira";

export const UserActivationManager = () => {
  const { users, activeUsers, toggleUserActivation, userTypes, setUserType } = useJira() as {
    users: Record<string, { name: string }>;
    activeUsers: Record<string, boolean>;
    toggleUserActivation: (accountId: string) => void;
    userTypes: Record<string, string>;
    setUserType: (accountId: string, value: string) => void;
  };

  // Roles alineados con los badges de tareas
  const userRoles = ["Sin asignación", "Desarrollador", "QA", "Tech Leader", "Product Owner"];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">Gestionar Usuarios</Button>
      </PopoverTrigger>
      <PopoverContent className="max-w-[90vw] w-full overflow-auto">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Usuarios Activos</h4>
            <p className="text-sm text-muted-foreground">
              Activa o desactiva usuarios y asigna sus roles.
            </p>
          </div>
          <div className="grid gap-2">
            {Object.entries(users).map(([accountId, user]) => (
              <div key={accountId} className="flex items-center justify-between">
                <label htmlFor={`user-${accountId}`}>{user.name}</label>
                <div className="flex items-center gap-2">
                  {/* Badge visual del tipo actual */}
                  <span
                    className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                      userTypes[accountId] === "Desarrollador"
                        ? "bg-blue-600 text-white"
                        : userTypes[accountId] === "QA"
                        ? "bg-green-600 text-white"
                        : userTypes[accountId] === "Sin asignación" || !userTypes[accountId]
                        ? "bg-gray-400 text-white"
                        : "bg-yellow-500 text-white"
                    }`}
                    tabIndex={0}
                    aria-label={`Tipo de usuario: ${userTypes[accountId] || "Sin asignación"}`}
                    role="status"
                  >
                    {userTypes[accountId] || "Sin asignación"}
                  </span>
                  <Select
                    value={userTypes[accountId] || 'Sin asignación'}
                    onValueChange={(value) => setUserType(accountId, value)}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Selecciona un rol" />
                    </SelectTrigger>
                    <SelectContent>
                      {userRoles.map(role => (
                        <SelectItem key={role} value={role}>{role}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Switch
                    id={`user-${accountId}`}
                    checked={activeUsers[accountId] !== false} // Default to active
                    onCheckedChange={() => toggleUserActivation(accountId)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
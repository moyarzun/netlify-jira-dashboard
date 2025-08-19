import { Button } from "../components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { Switch } from "../components/ui/switch";
import { useJira } from "../hooks/useJira";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";

export const UserActivationManager = () => {
  const { users, activeUsers, userTypes, kpiCardVisibility, toggleKpiCardVisibility } = useJira() as {
    users: Record<string, { name: string; avatarUrl: string; }>;
    activeUsers: Record<string, boolean>;
    userTypes: Record<string, string>;
    kpiCardVisibility: Record<string, boolean>;
    toggleKpiCardVisibility: (accountId: string) => void;
  };

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
            {Object.entries(users)
              .filter(([accountId]) => activeUsers[accountId] !== false) // Filter for active users
              .map(([accountId, user]) => (
                <div key={accountId} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Avatar>
                      <AvatarImage src={user.avatarUrl} alt={user.name} />
                      <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <label htmlFor={`user-${accountId}`}>{user.name}</label>
                  </div>
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
                    
                    <Switch
                      id={`user-${accountId}`}
                      checked={kpiCardVisibility[accountId] === undefined ? true : kpiCardVisibility[accountId]} // Default to active
                      onCheckedChange={() => {
                        toggleKpiCardVisibility(accountId);
                      }}
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
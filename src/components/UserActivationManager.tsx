import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useJira } from "@/hooks/useJira";

export const UserActivationManager = () => {
  const { users, activeUsers, toggleUserActivation, userTypes, setUserType } = useJira();

  const userRoles = ["Sin asignación", "Desarrollo", "Quality Assurance", "Tech Leader", "Product Owner"];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">Gestionar Usuarios</Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
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
                  <Select
                    value={userTypes[accountId] || 'Sin asignación'}
                    onValueChange={(value) => setUserType(accountId, value)}
                  >
                    <SelectTrigger className="w-[180px]">
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
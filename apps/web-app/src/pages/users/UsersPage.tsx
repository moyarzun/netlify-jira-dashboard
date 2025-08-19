import { useEffect, useState, useMemo } from 'react';
import { useJira } from '../../hooks/useJira';
import type { JiraContextType } from '../../contexts/JiraContext.types';
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Switch } from "../../components/ui/switch";
import { Input } from "../../components/ui/input";

const UsersPage = () => {
  const { 
    fetchAllUsers, 
    loading,
    userTypes, // From JiraContext
    toggleUserActivation, // From JiraContext
    setUserType, // From JiraContext
    allUsers, // All users from Jira
  } = useJira() as JiraContextType;

  // Define user roles
  const userRoles = ["Sin Asignación", "Desarrollador", "Product Owner", "Quality Assurance", "Tech Leader"];
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter users based on search term - memoized for performance
  const filteredUsers = useMemo(() => {
    if (!searchTerm) return allUsers;
    const searchLower = searchTerm.toLowerCase();
    return allUsers.filter(user => {
      const userRole = userTypes[user.accountId] || "Sin Asignación";
      return (
        user.displayName?.toLowerCase().includes(searchLower) ||
        user.emailAddress?.toLowerCase().includes(searchLower) ||
        userRole.toLowerCase().includes(searchLower)
      );
    });
  }, [allUsers, searchTerm, userTypes]);

  useEffect(() => {
    if (allUsers.length === 0) {
      fetchAllUsers();
    }
  }, [fetchAllUsers, allUsers.length]);

  if (loading && allUsers.length === 0) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Gestión de Usuarios</h1>
        <p>Cargando usuarios...</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Gestión de Usuarios</h1>
      <div>
        <h2 className="text-xl font-semibold mb-3">Usuarios de la Organización</h2>
        <div className="mb-4">
          <Input
            placeholder="Buscar por nombre, correo o rol..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>
        {filteredUsers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUsers.map((user) => (
              <div key={user.accountId} className="flex flex-col space-y-3 p-4 border rounded-md shadow-sm">
                <div className="flex items-center space-x-4">
                  <Avatar>
                    <AvatarImage src={user.avatarUrls['48x48']} alt={user.displayName} />
                    <AvatarFallback>{user.displayName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{user.displayName}</p>
                    <p className="text-sm text-gray-500">{user.emailAddress}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <label htmlFor={`role-${user.accountId}`} className="text-sm font-medium">Rol:</label>
                  <Select
                    value={userTypes[user.accountId] || "Sin Asignación"}
                    onValueChange={(value) => setUserType(user.accountId, value)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Selecciona un rol" />
                    </SelectTrigger>
                    <SelectContent>
                      {userRoles.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <label htmlFor={`active-${user.accountId}`} className="text-sm font-medium">Activo:</label>
                  <Switch
                    key={`switch-${user.accountId}-${user.active}`}
                    id={`active-${user.accountId}`}
                    checked={user.active}
                    onCheckedChange={() => {
                      console.log(`[SWITCH_CLICK] ${user.displayName}: current=${user.active}`);
                      toggleUserActivation(user.accountId);
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>{searchTerm ? 'No se encontraron usuarios que coincidan con la búsqueda.' : 'No se encontraron usuarios.'}</p>
        )}
      </div>
    </div>
  );
};

export default UsersPage;

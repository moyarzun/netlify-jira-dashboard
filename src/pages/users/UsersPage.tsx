import React, { useEffect, useState } from 'react';
import { useJira } from '@/hooks/useJira'; // Import useJira hook
import type { JiraContextType } from '@/contexts/JiraContext'; // Import JiraContextType
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"; // Import Avatar components
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Import Select components
import { Switch } from "@/components/ui/switch"; // Import Switch component

const UsersPage = () => {
  const { 
    searchJiraUser, 
    selectedProjectKey, 
    loading,
    users, // From JiraContext
    activeUsers, // From JiraContext
    userTypes, // From JiraContext
    toggleUserActivation, // From JiraContext
    setUserType, // From JiraContext
  } = useJira() as JiraContextType;
  const [projectUsers, setProjectUsers] = useState<any[]>([]); // State to store fetched users

  // Define user roles
  const userRoles = ["Sin Asignación", "Desarrollador", "Product Owner", "Quality Assurance", "Tech Leader"];

  useEffect(() => {
    const fetchUsers = async () => {
      if (selectedProjectKey) {
        // Fetch users for the selected project
        // The 'query' can be empty to get all assignable users for the project
        const fetchedUsers = await searchJiraUser("", selectedProjectKey); 
        setProjectUsers(fetchedUsers);
      } else {
        setProjectUsers([]); // Clear users if no project is selected
      }
    };

    fetchUsers();
  }, [selectedProjectKey, searchJiraUser]); // Re-fetch when project changes or searchJiraUser changes

  if (loading) {
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
      {selectedProjectKey ? (
        <div>
          <h2 className="text-xl font-semibold mb-3">Usuarios en el Proyecto: {selectedProjectKey}</h2>
          {projectUsers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projectUsers.map((user) => (
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
                      id={`active-${user.accountId}`}
                      checked={activeUsers[user.accountId] ?? true} // Default to active if not explicitly set
                      onCheckedChange={() => toggleUserActivation(user.accountId)}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>No se encontraron usuarios para este proyecto.</p>
          )}
        </div>
      ) : (
        <p>Por favor, selecciona un proyecto para ver los usuarios.</p>
      )}
    </div>
  );
};

export default UsersPage;

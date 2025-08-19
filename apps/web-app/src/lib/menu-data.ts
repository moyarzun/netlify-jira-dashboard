import { Home, ClipboardList, Settings, Users, ListChecks } from 'lucide-react'; // Added Settings, Users, ListChecks
import type { MenuItem } from '../dao/common'; // New import for MenuItem

export const menuItems: MenuItem[] = [
  {
    path: '/',
    label: 'Dashboard',
    icon: Home,
  },
  {
    path: '/tasks',
    label: 'Tasks',
    icon: ClipboardList,
  },
  {
    path: '/settings',
    label: 'Configuración',
    icon: Settings,
    children: [
      {
        path: '/settings/users',
        label: 'Usuarios',
        icon: Users,
      },
      {
        path: '/settings/statuses',
        label: 'Estados',
        icon: ListChecks,
      },
    ],
  },
];

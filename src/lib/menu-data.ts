import { Home, ClipboardList } from 'lucide-react';
import type { MenuItem } from '@/dao/common'; // New import for MenuItem

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
];

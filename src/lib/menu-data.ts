import { Home, ClipboardList } from 'lucide-react';

export type MenuItem = {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

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

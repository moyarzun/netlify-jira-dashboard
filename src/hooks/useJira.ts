
import { useContext } from 'react';
import { JiraContext } from '@/contexts/JiraContext';

export const useJira = () => {
  const context = useContext(JiraContext);
  if (context === undefined) {
    throw new Error('useJira must be used within a JiraProvider');
  }
  return context;
};

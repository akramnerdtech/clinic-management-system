import { useState } from 'react';
import { navigationService } from '@/services/navigationService';

export function useNavigation() {
  const [navGroups] = useState(() => navigationService.getNavGroups());
  return { navGroups };
}

import { navGroups } from '@/data/navigation';
import { loadFromStorage } from '@/utils/storage';
import type { NavGroup } from '@/types';

const KEYS = {
  navGroups: 'curaclinic.navigation.navGroups',
};

export const navigationService = {
  getNavGroups(): NavGroup[] {
    return loadFromStorage(KEYS.navGroups, navGroups);
  },
};

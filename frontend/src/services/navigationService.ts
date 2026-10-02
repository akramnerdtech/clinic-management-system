import { navGroups } from '@/data/navigation';
import type { NavGroup } from '@/types';

// Navigation is static app configuration (nothing in the app edits it), so it is
// returned directly instead of being cached in localStorage. Caching it meant any
// browser that had already loaded the sidebar kept seeing the old menu and never
// got newly added pages (like Rooms).
export const navigationService = {
  getNavGroups(): NavGroup[] {
    return navGroups;
  },
};
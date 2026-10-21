import { useCallback, useEffect, useState } from 'react';
import { dashboardService } from '@/services/dashboardService';

export function useDashboardData() {
  const [metrics, setMetrics] = useState(() => dashboardService.getMetrics());
  const [tabs, setTabs] = useState(() => dashboardService.getTabs());
  const [selectedTab, setSelectedTab] = useState(() => dashboardService.getTabs()[0]);
  const [appointmentRows, setAppointmentRows] = useState(() =>
    dashboardService.getAppointmentRows(dashboardService.getTabs()[0]),
  );
  const [activityItems, setActivityItems] = useState(() => dashboardService.getActivityItems());
  const [activityIcons, setActivityIcons] = useState(() => dashboardService.getActivityIcons());
  const [trafficPoints, setTrafficPoints] = useState(() => dashboardService.getTrafficPoints());

  const refresh = useCallback((tab?: string) => {
    const freshTabs = dashboardService.getTabs();
    const activeTab = tab ?? selectedTab;
    const prefix = activeTab ? activeTab.split(' ')[0] : 'This';
    const matchingFreshTab = freshTabs.find((t) => t.startsWith(prefix)) ?? freshTabs[0];

    setMetrics(dashboardService.getMetrics());
    setTabs(freshTabs);
    setSelectedTab(matchingFreshTab);
    setAppointmentRows(dashboardService.getAppointmentRows(matchingFreshTab));
    setActivityItems(dashboardService.getActivityItems());
    setActivityIcons(dashboardService.getActivityIcons());
    setTrafficPoints(dashboardService.getTrafficPoints());
  }, [selectedTab]);

  useEffect(() => {
    const handleUpdate = () => refresh();

    window.addEventListener('clinic-appointments-updated', handleUpdate);
    window.addEventListener('clinic-doctors-updated', handleUpdate);
    window.addEventListener('clinic-patients-updated', handleUpdate);
    window.addEventListener('clinic-billing-updated', handleUpdate);
    window.addEventListener('clinic-calendar-updated', handleUpdate);
    window.addEventListener('clinic-room-stays-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('clinic-appointments-updated', handleUpdate);
      window.removeEventListener('clinic-doctors-updated', handleUpdate);
      window.removeEventListener('clinic-patients-updated', handleUpdate);
      window.removeEventListener('clinic-billing-updated', handleUpdate);
      window.removeEventListener('clinic-calendar-updated', handleUpdate);
      window.removeEventListener('clinic-room-stays-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [refresh]);

  const selectTab = (tab: string) => {
    setSelectedTab(tab);
    setAppointmentRows(dashboardService.getAppointmentRows(tab));
  };

  return {
    metrics,
    tabs,
    selectedTab,
    selectTab,
    appointmentRows,
    activityItems,
    activityIcons,
    trafficPoints,
    refresh,
  };
}

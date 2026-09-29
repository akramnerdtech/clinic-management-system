import { useState } from 'react';
import { dashboardService } from '@/services/dashboardService';

export function useDashboardData() {
  const [metrics] = useState(() => dashboardService.getMetrics());
  const [tabs] = useState(() => dashboardService.getTabs());
  const [appointmentRows] = useState(() => dashboardService.getAppointmentRows());
  const [activityItems] = useState(() => dashboardService.getActivityItems());
  const [activityIcons] = useState(() => dashboardService.getActivityIcons());
  const [trafficPoints] = useState(() => dashboardService.getTrafficPoints());

  return { metrics, tabs, appointmentRows, activityItems, activityIcons, trafficPoints };
}

import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Shell } from '@/components/layout/Shell';
import { DashboardPage } from '@/pages/DashboardPage';
import { DoctorsPage } from '@/pages/DoctorsPage';
import { AddDoctorPage } from '@/pages/AddDoctorPage';
import { PatientsPage } from '@/pages/PatientsPage';
import { SpecialtiesPage } from '@/pages/SpecialtiesPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { AccountSettingsPage } from '@/pages/AccountSettingsPage';
import { AppointmentsPage } from '@/pages/AppointmentsPage';
import { NewAppointmentPage } from '@/pages/NewAppointmentPage';
import { AddPatientPage } from '@/pages/AddPatientPage';
import { PlaceholderPage } from '@/pages/PlaceholderPage';
import { MasterCalendarPage } from '@/pages/MasterCalendarPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { SignupPage } from '@/pages/auth/SignupPage';
import { AuthProvider } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

// Everything below is the Main Project, completely unchanged: same routes,
// same pages, same Shell. It is now wrapped in ProtectedRoute so it's only
// reachable once the user has logged in.
function MainProjectRoutes() {
  return (
    <ProtectedRoute>
      <Shell>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/doctors" element={<DoctorsPage />} />
          <Route path="/doctors/new" element={<AddDoctorPage />} />
          <Route path="/patients" element={<PatientsPage />} />
          <Route path="/patients/new" element={<AddPatientPage />} />
          <Route path="/appointments" element={<AppointmentsPage />} />
          <Route path="/appointments/new" element={<NewAppointmentPage />} />
          <Route path="/calendar" element={<MasterCalendarPage />} />
          <Route path="/specialties" element={<SpecialtiesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/account" element={<AccountSettingsPage />} />
          <Route path="*" element={<PlaceholderPage />} />
        </Routes>
      </Shell>
    </ProtectedRoute>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/*" element={<MainProjectRoutes />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

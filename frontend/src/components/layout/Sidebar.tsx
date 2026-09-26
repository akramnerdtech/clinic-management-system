import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Bell, HeartPulse, LogOut } from "lucide-react";
import { useNavigation } from "@/hooks/useNavigation";
import { useToast } from "@/utils/toast";
import { useAuth } from "@/hooks/useAuth";

interface SidebarProps {
  mobileOpen: boolean;
  onNavigate: () => void;
}

export function Sidebar({ mobileOpen, onNavigate }: SidebarProps) {
  const { navGroups } = useNavigation();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const { logout } = useAuth();

  const handleSignOut = () => {
    logout();
    toast.info("Signed out.");
    navigate("/login", { replace: true });
  };

  return (
    <aside className={`clinic-sidebar ${mobileOpen ? "mobile-open" : ""}`}>
      <div className="clinic-brand">
        <div className="brand-mark">
          <HeartPulse size={11} />
        </div>
        <div>
          <strong>CuraClinic</strong>
          <span>Central Clinic & Specialty Suites</span>
        </div>
      </div>
      <nav className="sidebar-nav">
        {navGroups.map((group) => (
          <div key={group.label} className="nav-group">
            <p>{group.label}</p>
            {group.items.map((item) => {
              const active = location.pathname === item.to;
              const I = item.icon;
              return (
                <NavLink
                  key={item.label}
                  to={item.to}
                  onClick={onNavigate}
                  className={() => (active ? "active" : "")}
                  end
                >
                  <I size={15} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="receptionist">
        <img src="https://i.pravatar.cc/60?img=47" alt="Sarah Jenkins" />
        <div>
          <strong>Sarah Jenkins</strong>
          <span>Head Receptionist</span>
        </div>
        <Bell size={15} className="reception-bell" />
        <b>3</b>
        <small>ID: #REC-4092</small>
        <button onClick={handleSignOut}>
          <LogOut size={12} /> Sign out
        </button>
      </div>
    </aside>
  );
}

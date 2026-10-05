import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Bell, HeartPulse, LogOut } from "lucide-react";
import { useNavigation } from "@/hooks/useNavigation";
import { useToast } from "@/utils/toast";
import { useAuth } from "@/hooks/useAuth";
import { accountAvatar } from "@/data/account";

interface SidebarProps {
  mobileOpen: boolean;
  onNavigate: () => void;
}

export function Sidebar({ mobileOpen, onNavigate }: SidebarProps) {
  const { navGroups } = useNavigation();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const { logout, user } = useAuth();
  const avatar = user?.avatarUrl || accountAvatar;

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
        <img src={avatar} alt={user?.fullName || 'Profile'} />
        <div className="">
          <strong>{user?.fullName || 'Sarah Jenkins'}</strong>
       
        
        <button className="mt-2"  onClick={handleSignOut}>
          <LogOut  size={12} /> Sign out
        </button>
        </div>
        
      </div>
    </aside>
  );
}
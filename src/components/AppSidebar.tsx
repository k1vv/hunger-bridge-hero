import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  UtensilsCrossed,
  Plus,
  ClipboardList,
  Truck,
  Bell,
  BarChart3,
  User,
  Search,
  Star,
  Package,
  Users as UsersIcon,
  ShieldCheck,
  Eye,
  AlertCircle,
  Megaphone,
  BookOpen,
  FileText,
  Settings,
  Leaf,
  LogOut,
  HandHeart,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type NavItem = { label: string; icon: any; path: string };

const vendorNav: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Create Donation", icon: Plus, path: "/vendor/create" },
  { label: "My Donations", icon: ClipboardList, path: "/vendor/donations" },
  { label: "Pickups", icon: Truck, path: "/vendor/pickups" },
  { label: "Notifications", icon: Bell, path: "/notifications" },
  { label: "Impact Report", icon: BarChart3, path: "/vendor/impact" },
  { label: "Profile", icon: User, path: "/vendor/profile" },
];

const ngoNav: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Available Donations", icon: Search, path: "/ngo/available" },
  { label: "Recommended", icon: Star, path: "/ngo/recommended" },
  { label: "My Claims", icon: ClipboardList, path: "/ngo/claims" },
  { label: "Inventory", icon: Package, path: "/ngo/inventory" },
  { label: "Distribution", icon: HandHeart, path: "/ngo/distribution" },
  { label: "Notifications", icon: Bell, path: "/notifications" },
  { label: "Reports", icon: BarChart3, path: "/ngo/reports" },
  { label: "Profile", icon: User, path: "/ngo/profile" },
];

const adminNav: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Users", icon: UsersIcon, path: "/admin/users" },
  { label: "Verification", icon: ShieldCheck, path: "/admin/verification" },
  { label: "Donations", icon: UtensilsCrossed, path: "/admin/donations" },
  { label: "Claims Monitoring", icon: Eye, path: "/admin/claims" },
  { label: "Complaints", icon: AlertCircle, path: "/admin/complaints" },
  { label: "Analytics", icon: BarChart3, path: "/admin/analytics" },
  { label: "Announcements", icon: Megaphone, path: "/admin/announcements" },
  { label: "Rules & Settings", icon: BookOpen, path: "/admin/rules" },
  { label: "Audit Logs", icon: FileText, path: "/admin/audit" },
  { label: "Settings", icon: Settings, path: "/admin/settings" },
];

const AppSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { role, user, signOut } = useAuth();

  const navItems = role === "admin" ? adminNav : role === "ngo" ? ngoNav : vendorNav;
  const roleLabel = role === "admin" ? "Admin Portal" : role === "ngo" ? "NGO Portal" : "Vendor Portal";

  const handleLogout = async () => {
    await signOut();
    navigate("/login/vendor");
  };

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-border bg-card">
      <div className="flex items-center gap-2.5 px-6 py-5 border-b border-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
          <Leaf className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-base font-bold text-foreground tracking-tight">FoodBridge</h1>
          <p className="text-[11px] text-muted-foreground">Waste → Nourishment</p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-4 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <item.icon className="h-[18px] w-[18px]" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-4 space-y-3">
        <div className="rounded-lg bg-primary/5 p-3">
          <p className="text-xs font-semibold text-primary">{roleLabel}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{user?.email}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;

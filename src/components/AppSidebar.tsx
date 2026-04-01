import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  UtensilsCrossed,
  Building2,
  Users,
  Truck,
  BarChart3,
  Brain,
  Package,
  Settings,
  Leaf,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Food Listings", icon: UtensilsCrossed, path: "/listings" },
  { label: "NGOs & Foodbanks", icon: Building2, path: "/ngos" },
  { label: "Inventory", icon: Package, path: "/inventory" },
  { label: "Logistics", icon: Truck, path: "/logistics" },
  { label: "AI Insights", icon: Brain, path: "/ai-insights" },
  { label: "Analytics", icon: BarChart3, path: "/analytics" },
  { label: "Users", icon: Users, path: "/users" },
  { label: "Settings", icon: Settings, path: "/settings" },
];

const AppSidebar = () => {
  const location = useLocation();

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

      <div className="border-t border-border p-4">
        <div className="rounded-lg bg-primary/5 p-3">
          <p className="text-xs font-semibold text-primary">Admin Portal</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">admin@foodbridge.org</p>
        </div>
      </div>
    </aside>
  );
};

export default AppSidebar;

import PageLayout from "@/components/PageLayout";
import StatCard from "@/components/StatCard";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Users, Building2, UtensilsCrossed, CheckCircle, AlertTriangle, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";

const AdminDashboard = () => {
  const { data: vendorCount = 0 } = useQuery({
    queryKey: ["admin_vendor_count"],
    queryFn: async () => {
      const { count } = await supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "vendor");
      return count || 0;
    },
  });
  const { data: ngoCount = 0 } = useQuery({
    queryKey: ["admin_ngo_count"],
    queryFn: async () => {
      const { count } = await supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "ngo");
      return count || 0;
    },
  });
  const { data: listings = [] } = useQuery({
    queryKey: ["admin_all_listings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("food_listings").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const active = listings.filter(l => l.status === "available").length;
  const completed = listings.filter(l => l.status === "delivered").length;
  const expired = listings.filter(l => l.status === "expired").length;

  const monthlyData = listings.reduce((acc: any[], l) => {
    const month = new Date(l.created_at).toLocaleString("default", { month: "short" });
    const existing = acc.find(a => a.month === month);
    if (existing) { existing.total += 1; if (l.status === "delivered") existing.completed += 1; }
    else acc.push({ month, total: 1, completed: l.status === "delivered" ? 1 : 0 });
    return acc;
  }, []);

  return (
    <PageLayout title="Admin Dashboard" subtitle="System-wide overview">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard title="Total Vendors" value={vendorCount} icon={Users} variant="primary" />
        <StatCard title="Total NGOs" value={ngoCount} icon={Building2} variant="success" />
        <StatCard title="Active Donations" value={active} icon={UtensilsCrossed} variant="accent" />
        <StatCard title="Completed" value={completed} icon={CheckCircle} variant="default" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 mb-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="lg:col-span-2 rounded-xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-sm font-semibold text-foreground mb-4">Monthly Overview</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
              <Bar dataKey="total" fill="hsl(var(--primary))" name="Total" radius={[4, 4, 0, 0]} />
              <Bar dataKey="completed" fill="hsl(var(--success))" name="Completed" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="rounded-xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-sm font-semibold text-foreground mb-4">Quick Stats</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground flex items-center gap-2"><AlertTriangle className="h-3 w-3" /> Expired</span><span className="text-sm font-semibold text-destructive">{expired}</span></div>
            <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground flex items-center gap-2"><Clock className="h-3 w-3" /> Pending Pickup</span><span className="text-sm font-semibold text-info">{listings.filter(l => l.status === "reserved").length}</span></div>
            <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground flex items-center gap-2"><UtensilsCrossed className="h-3 w-3" /> Total Listings</span><span className="text-sm font-semibold text-foreground">{listings.length}</span></div>
          </div>
        </motion.div>
      </div>
    </PageLayout>
  );
};

export default AdminDashboard;

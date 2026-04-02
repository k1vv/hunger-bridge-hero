import PageLayout from "@/components/PageLayout";
import StatCard from "@/components/StatCard";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { UtensilsCrossed, TrendingDown, Truck, Recycle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { motion } from "framer-motion";

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--info))", "hsl(var(--warning))", "hsl(var(--muted-foreground))"];

const AdminAnalytics = () => {
  const { data: listings = [] } = useQuery({
    queryKey: ["admin_all_listings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("food_listings").select("*");
      if (error) throw error;
      return data;
    },
  });

  const totalKg = listings.filter(l => l.status === "delivered").reduce((sum, l) => {
    const match = l.quantity.match(/(\d+)/);
    return sum + (match ? parseInt(match[1]) : 0);
  }, 0);
  const completed = listings.filter(l => l.status === "delivered").length;
  const expired = listings.filter(l => l.status === "expired").length;
  const claimRate = listings.length > 0 ? Math.round((completed / listings.length) * 100) : 0;

  const categoryData = Object.entries(
    listings.reduce((acc: Record<string, number>, l) => { acc[l.category] = (acc[l.category] || 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name, value }));

  const monthlyData = listings.reduce((acc: any[], l) => {
    const month = new Date(l.created_at).toLocaleString("default", { month: "short" });
    const existing = acc.find(a => a.month === month);
    const kg = parseInt(l.quantity.match(/(\d+)/)?.[1] || "0");
    if (existing) { if (l.status === "delivered") existing.saved += kg; if (l.status === "expired") existing.wasted += kg; }
    else acc.push({ month, saved: l.status === "delivered" ? kg : 0, wasted: l.status === "expired" ? kg : 0 });
    return acc;
  }, []);

  return (
    <PageLayout title="Analytics" subtitle="Comprehensive platform metrics">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard title="Food Saved" value={`${totalKg} kg`} icon={UtensilsCrossed} variant="primary" />
        <StatCard title="Claim Success Rate" value={`${claimRate}%`} icon={Recycle} variant="success" />
        <StatCard title="Completed" value={completed} icon={Truck} variant="accent" />
        <StatCard title="Expired" value={expired} icon={TrendingDown} variant="default" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="lg:col-span-2 rounded-xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-sm font-semibold text-foreground mb-4">Food Saved vs Wasted</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
              <Bar dataKey="saved" fill="hsl(var(--primary))" name="Saved (kg)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="wasted" fill="hsl(var(--destructive))" name="Wasted (kg)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="rounded-xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-sm font-semibold text-foreground mb-4">By Category</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ fontSize: "12px", borderRadius: "8px" }} />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
    </PageLayout>
  );
};

export default AdminAnalytics;

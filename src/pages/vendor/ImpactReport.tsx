import PageLayout from "@/components/PageLayout";
import StatCard from "@/components/StatCard";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { UtensilsCrossed, Package, CheckCircle, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";

const ImpactReport = () => {
  const { user } = useAuth();

  const { data: listings = [] } = useQuery({
    queryKey: ["vendor_listings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("food_listings").select("*").eq("user_id", user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const completed = listings.filter(l => l.status === "delivered");
  const totalKg = completed.reduce((sum, l) => {
    const match = l.quantity.match(/(\d+)/);
    return sum + (match ? parseInt(match[1]) : 0);
  }, 0);
  const estimatedMeals = Math.round(totalKg * 2.5);

  // Group by month
  const monthlyData = listings.reduce((acc: any[], l) => {
    const month = new Date(l.created_at).toLocaleString("default", { month: "short" });
    const existing = acc.find(a => a.month === month);
    if (existing) {
      existing.donations += 1;
      if (l.status === "delivered") existing.completed += 1;
    } else {
      acc.push({ month, donations: 1, completed: l.status === "delivered" ? 1 : 0 });
    }
    return acc;
  }, []);

  return (
    <PageLayout title="Impact Report" subtitle="Your contribution to reducing food waste">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard title="Total Donations" value={listings.length} icon={UtensilsCrossed} variant="primary" />
        <StatCard title="Completed" value={completed.length} icon={CheckCircle} variant="success" />
        <StatCard title="Food Saved" value={`${totalKg} kg`} icon={Package} variant="accent" />
        <StatCard title="Est. Meals" value={estimatedMeals} icon={TrendingUp} variant="default" />
      </div>

      {monthlyData.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-sm font-semibold text-foreground mb-4">Monthly Donation Trends</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
              <Bar dataKey="donations" fill="hsl(var(--primary))" name="Total" radius={[4, 4, 0, 0]} />
              <Bar dataKey="completed" fill="hsl(var(--success))" name="Completed" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}
    </PageLayout>
  );
};

export default ImpactReport;

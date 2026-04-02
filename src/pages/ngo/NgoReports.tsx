import PageLayout from "@/components/PageLayout";
import StatCard from "@/components/StatCard";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Package, CheckCircle, HandHeart, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";

const NgoReports = () => {
  const { user } = useAuth();

  const { data: claims = [] } = useQuery({
    queryKey: ["ngo_claims", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("claims").select("*, food_listings(*)").eq("ngo_user_id", user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: distributions = [] } = useQuery({
    queryKey: ["distribution_records", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("distribution_records").select("*").eq("ngo_user_id", user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const completedClaims = claims.filter((c: any) => c.status === "completed");
  const totalReceived = completedClaims.reduce((sum: number, c: any) => {
    const match = c.food_listings?.quantity?.match(/(\d+)/);
    return sum + (match ? parseInt(match[1]) : 0);
  }, 0);
  const totalDistributed = distributions.reduce((sum: number, d: any) => {
    const match = d.quantity_distributed?.match(/(\d+)/);
    return sum + (match ? parseInt(match[1]) : 0);
  }, 0);

  const monthlyData = claims.reduce((acc: any[], c: any) => {
    const month = new Date(c.created_at).toLocaleString("default", { month: "short" });
    const existing = acc.find(a => a.month === month);
    if (existing) { existing.claims += 1; if (c.status === "completed") existing.completed += 1; }
    else acc.push({ month, claims: 1, completed: c.status === "completed" ? 1 : 0 });
    return acc;
  }, []);

  return (
    <PageLayout title="Reports" subtitle="Your food collection and distribution impact">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard title="Total Claims" value={claims.length} icon={Package} variant="primary" />
        <StatCard title="Completed" value={completedClaims.length} icon={CheckCircle} variant="success" />
        <StatCard title="Food Received" value={`${totalReceived} kg`} icon={TrendingUp} variant="accent" />
        <StatCard title="Distributed" value={`${totalDistributed} kg`} icon={HandHeart} variant="default" />
      </div>

      {monthlyData.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-sm font-semibold text-foreground mb-4">Monthly Activity</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
              <Bar dataKey="claims" fill="hsl(var(--primary))" name="Total Claims" radius={[4, 4, 0, 0]} />
              <Bar dataKey="completed" fill="hsl(var(--success))" name="Completed" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}
    </PageLayout>
  );
};

export default NgoReports;

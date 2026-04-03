import PageLayout from "@/components/PageLayout";
import StatCard from "@/components/StatCard";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CheckCircle, Package, TrendingUp, UtensilsCrossed } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const ImpactReport = () => {
  const { user } = useAuth();

  // 🔥 FETCH DATA FROM SUPABASE
  const { data: batches = [], isLoading, error } = useQuery({
    queryKey: ["vendor_batches", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("donation_batches")
        .select("*, donation_items(*)")
        .eq("vendor_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // 🔥 LOADING STATE
  if (isLoading) {
    return (
      <PageLayout title="Impact Report" subtitle="Loading...">
        <p className="text-sm text-muted-foreground">Fetching your data...</p>
      </PageLayout>
    );
  }

  // 🔥 ERROR STATE
  if (error) {
    return (
      <PageLayout title="Impact Report" subtitle="Error">
        <p className="text-sm text-destructive">Failed to load data</p>
      </PageLayout>
    );
  }

  // 🔥 PROCESS DATA
  const allItems = batches.flatMap((b: any) => b.donation_items || []);

  // For hackathon → treat all items as distributed
  const completedItems = allItems;

  const totalQty = completedItems.reduce(
    (sum: number, i: any) => sum + Number(i.quantity || 0),
    0
  );

  const estimatedMeals = Math.round(totalQty * 2);

  // 🔥 MONTHLY DATA FOR CHART
  const monthlyData = batches.reduce((acc: any[], b: any) => {
    const month = new Date(b.created_at).toLocaleString("default", {
      month: "short",
    });

    const items = b.donation_items?.length || 0;

    const existing = acc.find((a: any) => a.month === month);

    if (existing) {
      existing.batches += 1;
      existing.items += items;
    } else {
      acc.push({
        month,
        batches: 1,
        items,
      });
    }

    return acc;
  }, []);

  return (
    <PageLayout
      title="Impact Report"
      subtitle="Your contribution to reducing food waste"
    >
      {/* 🔥 EMPTY STATE */}
      {batches.length === 0 && (
        <div className="text-center text-sm text-muted-foreground mb-6">
          No donations yet. Start by creating your first donation!
        </div>
      )}

      {/* 🔥 STATS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          title="Total Batches"
          value={batches.length}
          icon={UtensilsCrossed}
          variant="primary"
        />
        <StatCard
          title="Total Items"
          value={allItems.length}
          icon={Package}
          variant="accent"
        />
        <StatCard
          title="Items Distributed"
          value={completedItems.length}
          icon={CheckCircle}
          variant="success"
        />
        <StatCard
          title="Est. Meals"
          value={estimatedMeals}
          icon={TrendingUp}
          variant="default"
        />
      </div>

      {/* 🔥 CHART */}
      {monthlyData.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl border border-border bg-card p-6 shadow-card"
        >
          <h2 className="text-sm font-semibold text-foreground mb-4">
            Monthly Donation Trends
          </h2>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Bar
                dataKey="batches"
                fill="hsl(var(--primary))"
                name="Batches"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="items"
                fill="hsl(var(--success))"
                name="Items"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}
    </PageLayout>
  );
};

export default ImpactReport;
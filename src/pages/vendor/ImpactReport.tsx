import PageLayout from "@/components/PageLayout";
import StatCard from "@/components/StatCard";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CheckCircle, Package, TrendingUp, UtensilsCrossed, DollarSign, Leaf, Utensils } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { calculateFoodValue, calculateMealsServed, calculateCO2Saved, formatImpactValue } from "@/lib/impact-calculations";

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

  // Items by status
  const completedItems = allItems.filter((i: any) => i.status === "completed");

  // Calculate impact metrics using proper calculations
  const impactMetrics = (() => {
    let totalValueRM = 0;
    let totalMeals = 0;
    let totalCO2Saved = 0;
    let completedValueRM = 0;
    let completedMeals = 0;
    let completedCO2Saved = 0;

    allItems.forEach((item: any) => {
      const qty = parseFloat(item.quantity) || 0;
      const unit = item.unit || "kg";
      const category = item.category || "Other";

      const value = calculateFoodValue(qty, unit, category);
      const meals = calculateMealsServed(qty, unit, category);
      const co2 = calculateCO2Saved(qty, unit, category);

      totalValueRM += value;
      totalMeals += meals;
      totalCO2Saved += co2;

      if (item.status === "completed") {
        completedValueRM += value;
        completedMeals += meals;
        completedCO2Saved += co2;
      }
    });

    return {
      totalValueRM,
      totalMeals,
      totalCO2Saved,
      completedValueRM,
      completedMeals,
      completedCO2Saved,
    };
  })();

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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
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
          title="Items Completed"
          value={completedItems.length}
          icon={CheckCircle}
          variant="success"
        />
        <StatCard
          title="Est. Meals"
          value={impactMetrics.totalMeals}
          icon={Utensils}
          variant="default"
        />
      </div>

      {/* 🔥 IMPACT METRICS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-success/30 bg-success/5 p-5 shadow-card"
        >
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-5 w-5 text-success" />
            <p className="text-sm font-medium text-success">Food Value Saved</p>
          </div>
          <p className="text-2xl font-bold text-success">
            {formatImpactValue(impactMetrics.completedValueRM, "currency")}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            of {formatImpactValue(impactMetrics.totalValueRM, "currency")} total donated
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-accent/30 bg-accent/5 p-5 shadow-card"
        >
          <div className="flex items-center gap-2 mb-2">
            <Utensils className="h-5 w-5 text-accent" />
            <p className="text-sm font-medium text-accent">Meals Provided</p>
          </div>
          <p className="text-2xl font-bold text-accent">
            {impactMetrics.completedMeals.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            of {impactMetrics.totalMeals.toLocaleString()} potential meals
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl border border-info/30 bg-info/5 p-5 shadow-card"
        >
          <div className="flex items-center gap-2 mb-2">
            <Leaf className="h-5 w-5 text-info" />
            <p className="text-sm font-medium text-info">CO₂ Emissions Prevented</p>
          </div>
          <p className="text-2xl font-bold text-info">
            {formatImpactValue(impactMetrics.completedCO2Saved, "co2")}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            of {formatImpactValue(impactMetrics.totalCO2Saved, "co2")} potential
          </p>
        </motion.div>
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
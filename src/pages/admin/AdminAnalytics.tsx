import PageLayout from "@/components/PageLayout";
import StatCard from "@/components/StatCard";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { UtensilsCrossed, TrendingDown, Truck, Recycle, Users, HandHeart, Package, Building2, Leaf, DollarSign, Utensils } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area } from "recharts";
import { motion } from "framer-motion";
import { calculateFoodValue, calculateMealsServed, calculateCO2Saved, formatImpactValue } from "@/lib/impact-calculations";

const COLORS = ["hsl(var(--destructive))", "hsl(var(--accent))", "hsl(var(--info))", "hsl(var(--warning))", "hsl(var(--success))", "hsl(var(--muted-foreground))"];

const AdminAnalytics = () => {
  // Fetch all donation batches with items
  const { data: batches = [] } = useQuery({
    queryKey: ["admin_analytics_batches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("donation_batches")
        .select("*, donation_items(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch all donation items
  const { data: items = [] } = useQuery({
    queryKey: ["admin_analytics_items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("donation_items")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch distribution records
  const { data: distributions = [] } = useQuery({
    queryKey: ["admin_analytics_distributions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("distribution_records")
        .select("*")
        .order("distribution_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch inventory
  const { data: inventory = [] } = useQuery({
    queryKey: ["admin_analytics_inventory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  // Fetch user counts
  const { data: vendorCount = 0 } = useQuery({
    queryKey: ["admin_analytics_vendor_count"],
    queryFn: async () => {
      const { count } = await supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "vendor");
      return count || 0;
    },
  });

  const { data: ngoCount = 0 } = useQuery({
    queryKey: ["admin_analytics_ngo_count"],
    queryFn: async () => {
      const { count } = await supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "ngo");
      return count || 0;
    },
  });

  // Calculate stats
  const totalItems = items.length;
  const completedItems = items.filter((i: any) => i.status === "completed").length;
  const expiredItems = items.filter((i: any) => i.status === "expired").length;
  const claimedItems = items.filter((i: any) => i.status === "claimed").length;
  const availableItems = items.filter((i: any) => i.status === "available").length;

  // Calculate total quantity (estimate from items)
  const totalQuantity = items.reduce((sum: number, i: any) => {
    const qty = parseFloat(i.quantity) || 0;
    return sum + qty;
  }, 0);

  const completedQuantity = items
    .filter((i: any) => i.status === "completed")
    .reduce((sum: number, i: any) => sum + (parseFloat(i.quantity) || 0), 0);

  const claimRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  // Calculate impact metrics using the impact-calculations library
  const impactMetrics = (() => {
    let totalValueRM = 0;
    let totalMeals = 0;
    let totalCO2Saved = 0;
    let completedValueRM = 0;
    let completedMeals = 0;
    let completedCO2Saved = 0;

    items.forEach((item: any) => {
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

  // Calculate beneficiaries from distributions
  const totalBeneficiaries = distributions.reduce((sum: number, d: any) => {
    try {
      const data = JSON.parse(d.notes || "{}");
      return sum + (parseInt(data.beneficiary_count) || 0);
    } catch {
      return sum;
    }
  }, 0);

  // Category breakdown from items
  const categoryData = Object.entries(
    items.reduce((acc: Record<string, number>, i: any) => {
      const cat = i.category || "Other";
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);

  // Monthly data for saved vs distributed
  const monthlyData = (() => {
    const months: Record<string, { month: string; donated: number; completed: number; distributed: number }> = {};

    // Process donation items
    items.forEach((i: any) => {
      const month = new Date(i.created_at).toLocaleString("default", { month: "short" });
      if (!months[month]) months[month] = { month, donated: 0, completed: 0, distributed: 0 };
      months[month].donated += 1;
      if (i.status === "completed") months[month].completed += 1;
    });

    // Process distributions
    distributions.forEach((d: any) => {
      const month = new Date(d.distribution_date).toLocaleString("default", { month: "short" });
      if (!months[month]) months[month] = { month, donated: 0, completed: 0, distributed: 0 };
      try {
        const data = JSON.parse(d.notes || "{}");
        months[month].distributed += (data.items || []).length || 1;
      } catch {
        months[month].distributed += 1;
      }
    });

    return Object.values(months);
  })();

  // Weekly trend
  const weeklyTrend = (() => {
    const weeks: any[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStr = date.toLocaleDateString("default", { weekday: "short" });
      const dateStr = date.toISOString().split("T")[0];

      const dayItems = items.filter((item: any) => item.created_at?.startsWith(dateStr));
      const dayCompleted = dayItems.filter((item: any) => item.status === "completed");
      const dayDistributions = distributions.filter((d: any) => d.distribution_date === dateStr);

      weeks.push({
        day: dayStr,
        donations: dayItems.length,
        completed: dayCompleted.length,
        distributions: dayDistributions.length,
      });
    }
    return weeks;
  })();

  // Status breakdown
  const statusData = [
    { name: "Available", value: availableItems, color: "hsl(var(--destructive))" },
    { name: "Claimed", value: claimedItems, color: "hsl(var(--info))" },
    { name: "Completed", value: completedItems, color: "hsl(var(--success))" },
    { name: "Expired", value: expiredItems, color: "hsl(var(--destructive))" },
  ].filter(s => s.value > 0);

  return (
    <PageLayout title="Analytics" subtitle="Comprehensive platform metrics and insights">
      {/* Primary Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 mb-6">
        <StatCard title="Total Donations" value={totalItems} icon={Package} variant="primary" />
        <StatCard title="Completed" value={completedItems} icon={Truck} variant="success" />
        <StatCard title="Success Rate" value={`${claimRate}%`} icon={Recycle} variant="accent" />
        <StatCard title="Beneficiaries" value={totalBeneficiaries} icon={HandHeart} variant="primary" />
        <StatCard title="Vendors" value={vendorCount} icon={Building2} variant="default" />
        <StatCard title="NGOs" value={ngoCount} icon={Users} variant="success" />
      </div>

      {/* Impact Statistics */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Leaf className="h-4 w-4 text-success" />
          Impact Metrics (Food Saved)
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-success/30 bg-success/5 p-4 shadow-card"
          >
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-success" />
              <p className="text-xs text-success">Value Saved</p>
            </div>
            <p className="text-xl font-bold text-success">{formatImpactValue(impactMetrics.completedValueRM, "currency")}</p>
            <p className="text-xs text-muted-foreground mt-1">
              of {formatImpactValue(impactMetrics.totalValueRM, "currency")} total
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-xl border border-accent/30 bg-accent/5 p-4 shadow-card"
          >
            <div className="flex items-center gap-2 mb-1">
              <Utensils className="h-4 w-4 text-accent" />
              <p className="text-xs text-accent">Meals Served</p>
            </div>
            <p className="text-xl font-bold text-accent">{impactMetrics.completedMeals.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">
              of {impactMetrics.totalMeals.toLocaleString()} potential
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-xl border border-info/30 bg-info/5 p-4 shadow-card"
          >
            <div className="flex items-center gap-2 mb-1">
              <Leaf className="h-4 w-4 text-info" />
              <p className="text-xs text-info">CO₂ Prevented</p>
            </div>
            <p className="text-xl font-bold text-info">{formatImpactValue(impactMetrics.completedCO2Saved, "co2")}</p>
            <p className="text-xs text-muted-foreground mt-1">
              of {formatImpactValue(impactMetrics.totalCO2Saved, "co2")} potential
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-xl border border-warning/30 bg-warning/5 p-4 shadow-card"
          >
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-warning" />
              <p className="text-xs text-warning">Value Lost (Expired)</p>
            </div>
            <p className="text-xl font-bold text-warning">
              {formatImpactValue(
                items
                  .filter((i: any) => i.status === "expired")
                  .reduce((sum: number, i: any) => sum + calculateFoodValue(parseFloat(i.quantity) || 0, i.unit || "kg", i.category || "Other"), 0),
                "currency"
              )}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {expiredItems} items expired
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-xl border border-border bg-card p-4 shadow-card"
          >
            <div className="flex items-center gap-2 mb-1">
              <Recycle className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Avg Value/Item</p>
            </div>
            <p className="text-xl font-bold text-foreground">
              {formatImpactValue(totalItems > 0 ? impactMetrics.totalValueRM / totalItems : 0, "currency")}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              per donation item
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="rounded-xl border border-border bg-card p-4 shadow-card"
          >
            <div className="flex items-center gap-2 mb-1">
              <HandHeart className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Avg Meals/Beneficiary</p>
            </div>
            <p className="text-xl font-bold text-foreground">
              {totalBeneficiaries > 0 ? (impactMetrics.completedMeals / totalBeneficiaries).toFixed(1) : "0"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              meals per person
            </p>
          </motion.div>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border bg-card p-4 shadow-card"
        >
          <p className="text-xs text-muted-foreground mb-1">Total Quantity Donated</p>
          <p className="text-xl font-bold text-foreground">{totalQuantity.toFixed(0)} units</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-xl border border-success/30 bg-success/5 p-4 shadow-card"
        >
          <p className="text-xs text-success mb-1">Quantity Completed</p>
          <p className="text-xl font-bold text-success">{completedQuantity.toFixed(0)} units</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 shadow-card"
        >
          <p className="text-xs text-destructive mb-1">Total Distributions</p>
          <p className="text-xl font-bold text-destructive">{distributions.length}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 shadow-card"
        >
          <p className="text-xs text-destructive mb-1">Expired Items</p>
          <p className="text-xl font-bold text-destructive">{expiredItems}</p>
        </motion.div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 mb-6">
        {/* Monthly Overview */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="lg:col-span-2 rounded-xl border border-border bg-card p-6 shadow-card"
        >
          <h2 className="text-sm font-semibold text-foreground mb-4">Monthly Activity</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="donated" fill="hsl(var(--destructive))" name="Donated" radius={[4, 4, 0, 0]} />
              <Bar dataKey="completed" fill="hsl(var(--success))" name="Completed" radius={[4, 4, 0, 0]} />
              <Bar dataKey="distributed" fill="hsl(var(--accent))" name="Distributed" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Category Pie Chart */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-border bg-card p-6 shadow-card"
        >
          <h2 className="text-sm font-semibold text-foreground mb-4">By Category</h2>
          {categoryData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
              No data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: "12px", borderRadius: "8px" }} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-6">
        {/* Weekly Trend */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl border border-border bg-card p-6 shadow-card"
        >
          <h2 className="text-sm font-semibold text-foreground mb-4">7-Day Activity Trend</h2>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={weeklyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Area type="monotone" dataKey="donations" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive)/0.2)" name="Donations" />
              <Area type="monotone" dataKey="completed" stroke="hsl(var(--success))" fill="hsl(var(--success)/0.2)" name="Completed" />
              <Area type="monotone" dataKey="distributions" stroke="hsl(var(--accent))" fill="hsl(var(--accent)/0.2)" name="Distributions" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Status Breakdown */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="rounded-xl border border-border bg-card p-6 shadow-card"
        >
          <h2 className="text-sm font-semibold text-foreground mb-4">Item Status Breakdown</h2>
          {statusData.length === 0 ? (
            <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">
              No data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {statusData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: "12px", borderRadius: "8px" }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="rounded-xl border border-border bg-card p-6 shadow-card"
        >
          <h3 className="text-sm font-semibold text-foreground mb-4">Donation Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Batches</span>
              <span className="font-medium">{batches.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Items</span>
              <span className="font-medium">{totalItems}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Available</span>
              <span className="font-medium text-destructive">{availableItems}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Pending Pickup</span>
              <span className="font-medium text-info">{claimedItems}</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="rounded-xl border border-border bg-card p-6 shadow-card"
        >
          <h3 className="text-sm font-semibold text-foreground mb-4">Distribution Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Distributions</span>
              <span className="font-medium">{distributions.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Beneficiaries Served</span>
              <span className="font-medium text-success">{totalBeneficiaries}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Inventory Items</span>
              <span className="font-medium">{inventory.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Avg per Distribution</span>
              <span className="font-medium">
                {distributions.length > 0 ? (totalBeneficiaries / distributions.length).toFixed(1) : 0}
              </span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="rounded-xl border border-border bg-card p-6 shadow-card"
        >
          <h3 className="text-sm font-semibold text-foreground mb-4">Platform Health</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Success Rate</span>
              <span className={`font-medium ${claimRate >= 70 ? "text-success" : claimRate >= 40 ? "text-warning" : "text-destructive"}`}>
                {claimRate}%
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Waste Rate</span>
              <span className={`font-medium ${totalItems > 0 ? (expiredItems / totalItems * 100 < 10 ? "text-success" : "text-destructive") : "text-muted-foreground"}`}>
                {totalItems > 0 ? ((expiredItems / totalItems) * 100).toFixed(1) : 0}%
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Active Users</span>
              <span className="font-medium">{vendorCount + ngoCount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Vendor:NGO Ratio</span>
              <span className="font-medium">
                {ngoCount > 0 ? (vendorCount / ngoCount).toFixed(2) : vendorCount}:1
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </PageLayout>
  );
};

export default AdminAnalytics;

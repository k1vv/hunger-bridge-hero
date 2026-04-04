import PageLayout from "@/components/PageLayout";
import StatCard from "@/components/StatCard";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Package,
  CheckCircle,
  HandHeart,
  TrendingUp,
  Users,
  Leaf,
  DollarSign,
  Utensils,
  Trash2,
  Calendar,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  calculateFoodValue,
  calculateMealsServed,
  calculateCO2Saved,
  formatImpactValue,
} from "@/lib/impact-calculations";

const NgoReports = () => {
  const { user } = useAuth();

  // Fetch inventory data (received food)
  const { data: inventory = [], isLoading: inventoryLoading } = useQuery({
    queryKey: ["ngo_inventory_report", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory")
        .select("*")
        .eq("ngo_user_id", user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch distribution records
  const { data: distributions = [], isLoading: distributionsLoading } = useQuery({
    queryKey: ["ngo_distributions_report", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("distribution_records")
        .select("*")
        .eq("ngo_user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch claims for monthly activity
  const { data: claims = [] } = useQuery({
    queryKey: ["ngo_claims_report", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("claims")
        .select("*")
        .eq("ngo_user_id", user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const isLoading = inventoryLoading || distributionsLoading;

  if (isLoading) {
    return (
      <PageLayout title="Impact Report" subtitle="Loading...">
        <p className="text-sm text-muted-foreground">Fetching your data...</p>
      </PageLayout>
    );
  }

  // Calculate impact metrics from inventory
  const impactMetrics = (() => {
    let totalReceivedKg = 0;
    let totalDistributedKg = 0;
    let totalWastedKg = 0;
    let totalValueRM = 0;
    let totalMeals = 0;
    let totalCO2Saved = 0;
    let distributedValueRM = 0;
    let distributedMeals = 0;
    let distributedCO2Saved = 0;

    inventory.forEach((item: any) => {
      const received = parseFloat(item.quantity_received) || 0;
      const distributed = parseFloat(item.quantity_distributed) || 0;
      const remaining = parseFloat(item.quantity_remaining) || 0;
      const unit = item.unit || "kg";
      const category = item.category || "Other";

      // Convert to kg for totals
      let receivedKg = received;
      let distributedKg = distributed;
      if (unit === "g") {
        receivedKg = received / 1000;
        distributedKg = distributed / 1000;
      } else if (unit === "pieces" || unit === "servings") {
        receivedKg = received * 0.3;
        distributedKg = distributed * 0.3;
      }

      totalReceivedKg += receivedKg;
      totalDistributedKg += distributedKg;

      // Calculate impact for received items
      const value = calculateFoodValue(received, unit, category);
      const meals = calculateMealsServed(received, unit, category);
      const co2 = calculateCO2Saved(received, unit, category);

      totalValueRM += value;
      totalMeals += meals;
      totalCO2Saved += co2;

      // Calculate impact for distributed items
      const distValue = calculateFoodValue(distributed, unit, category);
      const distMeals = calculateMealsServed(distributed, unit, category);
      const distCO2 = calculateCO2Saved(distributed, unit, category);

      distributedValueRM += distValue;
      distributedMeals += distMeals;
      distributedCO2Saved += distCO2;
    });

    // Calculate waste from distribution records
    distributions.forEach((d: any) => {
      if (d.record_type === "waste") {
        const qty = parseFloat(d.quantity_distributed) || 0;
        totalWastedKg += qty;
      }
    });

    return {
      totalReceivedKg: Math.round(totalReceivedKg),
      totalDistributedKg: Math.round(totalDistributedKg),
      totalWastedKg: Math.round(totalWastedKg),
      totalValueRM,
      totalMeals,
      totalCO2Saved,
      distributedValueRM,
      distributedMeals,
      distributedCO2Saved,
    };
  })();

  // Calculate beneficiaries served
  const totalBeneficiaries = distributions
    .filter((d: any) => d.record_type === "distribution")
    .reduce((sum: number, d: any) => sum + (parseInt(d.beneficiaries_count) || 0), 0);

  const distributionSessions = distributions.filter(
    (d: any) => d.record_type === "distribution"
  ).length;

  // Monthly data for chart
  const monthlyData = (() => {
    const months: Record<string, { month: string; received: number; distributed: number; beneficiaries: number }> = {};

    inventory.forEach((item: any) => {
      const month = new Date(item.created_at).toLocaleString("default", { month: "short" });
      if (!months[month]) {
        months[month] = { month, received: 0, distributed: 0, beneficiaries: 0 };
      }
      months[month].received += parseFloat(item.quantity_received) || 0;
      months[month].distributed += parseFloat(item.quantity_distributed) || 0;
    });

    distributions
      .filter((d: any) => d.record_type === "distribution")
      .forEach((d: any) => {
        const month = new Date(d.created_at).toLocaleString("default", { month: "short" });
        if (!months[month]) {
          months[month] = { month, received: 0, distributed: 0, beneficiaries: 0 };
        }
        months[month].beneficiaries += parseInt(d.beneficiaries_count) || 0;
      });

    return Object.values(months);
  })();

  // Distribution by type
  const distributionByType = (() => {
    const types: Record<string, number> = {};
    distributions
      .filter((d: any) => d.record_type === "distribution")
      .forEach((d: any) => {
        const type = d.distribution_type || "other";
        types[type] = (types[type] || 0) + 1;
      });

    return Object.entries(types).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1).replace("-", " "),
      value,
    }));
  })();

  // Beneficiary groups breakdown
  const beneficiaryGroups = (() => {
    const groups: Record<string, number> = {};
    distributions
      .filter((d: any) => d.record_type === "distribution")
      .forEach((d: any) => {
        const group = d.beneficiary_group || "General";
        groups[group] = (groups[group] || 0) + (parseInt(d.beneficiaries_count) || 0);
      });

    return Object.entries(groups).map(([name, value]) => ({ name, value }));
  })();

  const COLORS = [
    "hsl(var(--primary))",
    "hsl(var(--success))",
    "hsl(var(--accent))",
    "hsl(var(--info))",
    "hsl(var(--warning))",
  ];

  const completedClaims = claims.filter((c: any) => c.status === "completed");

  return (
    <PageLayout
      title="Impact Report"
      subtitle="Your contribution to fighting hunger and reducing food waste"
    >
      {/* Empty State */}
      {inventory.length === 0 && distributions.length === 0 && (
        <div className="text-center text-sm text-muted-foreground mb-6">
          No activity yet. Start by claiming available donations!
        </div>
      )}

      {/* Primary Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard
          title="Food Received"
          value={`${impactMetrics.totalReceivedKg} kg`}
          icon={Package}
          variant="accent"
        />
        <StatCard
          title="Food Distributed"
          value={`${impactMetrics.totalDistributedKg} kg`}
          icon={HandHeart}
          variant="success"
        />
        <StatCard
          title="Beneficiaries Served"
          value={totalBeneficiaries.toLocaleString()}
          icon={Users}
          variant="primary"
        />
        <StatCard
          title="Distribution Sessions"
          value={distributionSessions}
          icon={Calendar}
          variant="default"
        />
      </div>

      {/* Impact Metrics Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-success/30 bg-success/5 p-5 shadow-card"
        >
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-5 w-5 text-success" />
            <p className="text-sm font-medium text-success">Food Value Distributed</p>
          </div>
          <p className="text-2xl font-bold text-success">
            {formatImpactValue(impactMetrics.distributedValueRM, "currency")}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            of {formatImpactValue(impactMetrics.totalValueRM, "currency")} total received
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
            {impactMetrics.distributedMeals.toLocaleString()}
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
            {formatImpactValue(impactMetrics.distributedCO2Saved, "co2")}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            of {formatImpactValue(impactMetrics.totalCO2Saved, "co2")} potential
          </p>
        </motion.div>
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-xl border border-border bg-card p-4 shadow-card"
        >
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-primary" />
            <p className="text-xs font-medium text-muted-foreground">Claims Completed</p>
          </div>
          <p className="text-xl font-bold text-foreground">
            {completedClaims.length} / {claims.length}
          </p>
          <p className="text-xs text-muted-foreground">
            {claims.length > 0
              ? `${Math.round((completedClaims.length / claims.length) * 100)}% success rate`
              : "No claims yet"}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-xl border border-border bg-card p-4 shadow-card"
        >
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="h-4 w-4 text-success" />
            <p className="text-xs font-medium text-muted-foreground">Distribution Rate</p>
          </div>
          <p className="text-xl font-bold text-foreground">
            {impactMetrics.totalReceivedKg > 0
              ? `${Math.round((impactMetrics.totalDistributedKg / impactMetrics.totalReceivedKg) * 100)}%`
              : "0%"}
          </p>
          <p className="text-xs text-muted-foreground">
            of received food distributed
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 shadow-card"
        >
          <div className="flex items-center gap-2 mb-1">
            <Trash2 className="h-4 w-4 text-destructive" />
            <p className="text-xs font-medium text-muted-foreground">Food Waste</p>
          </div>
          <p className="text-xl font-bold text-destructive">
            {impactMetrics.totalWastedKg} kg
          </p>
          <p className="text-xs text-muted-foreground">
            {impactMetrics.totalReceivedKg > 0
              ? `${Math.round((impactMetrics.totalWastedKg / impactMetrics.totalReceivedKg) * 100)}% waste rate`
              : "0% waste rate"}
          </p>
        </motion.div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-6">
        {/* Monthly Trends */}
        {monthlyData.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-xl border border-border bg-card p-6 shadow-card"
          >
            <h2 className="text-sm font-semibold text-foreground mb-4">
              Monthly Activity
            </h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar
                  dataKey="received"
                  fill="hsl(var(--accent))"
                  name="Received (kg)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="distributed"
                  fill="hsl(var(--success))"
                  name="Distributed (kg)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Distribution by Type */}
        {distributionByType.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="rounded-xl border border-border bg-card p-6 shadow-card"
          >
            <h2 className="text-sm font-semibold text-foreground mb-4">
              Distribution by Type
            </h2>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={distributionByType}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} (${(percent * 100).toFixed(0)}%)`
                  }
                  labelLine={false}
                >
                  {distributionByType.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>
        )}
      </div>

      {/* Beneficiary Groups */}
      {beneficiaryGroups.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl border border-border bg-card p-6 shadow-card"
        >
          <h2 className="text-sm font-semibold text-foreground mb-4">
            Beneficiaries by Group
          </h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={beneficiaryGroups} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                width={120}
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
                dataKey="value"
                fill="hsl(var(--primary))"
                name="Beneficiaries"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}
    </PageLayout>
  );
};

export default NgoReports;

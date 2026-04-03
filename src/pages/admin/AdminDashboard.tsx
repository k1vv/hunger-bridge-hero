import PageLayout from "@/components/PageLayout";
import StatCard from "@/components/StatCard";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Users, Building2, UtensilsCrossed, CheckCircle, AlertTriangle, Clock, Package, TrendingUp, HandHeart } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

const AdminDashboard = () => {
  const navigate = useNavigate();

  // Fetch vendor count
  const { data: vendorCount = 0 } = useQuery({
    queryKey: ["admin_vendor_count"],
    queryFn: async () => {
      const { count } = await supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "vendor");
      return count || 0;
    },
  });

  // Fetch NGO count
  const { data: ngoCount = 0 } = useQuery({
    queryKey: ["admin_ngo_count"],
    queryFn: async () => {
      const { count } = await supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "ngo");
      return count || 0;
    },
  });

  // Fetch pending verification count
  const { data: pendingVerification = 0 } = useQuery({
    queryKey: ["admin_pending_verification_count"],
    queryFn: async () => {
      const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("verification_status", "pending");
      return count || 0;
    },
  });

  // Fetch all donation batches
  const { data: batches = [] } = useQuery({
    queryKey: ["admin_all_batches_dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("donation_batches")
        .select("*, donation_items(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch all donation items for detailed stats
  const { data: allItems = [] } = useQuery({
    queryKey: ["admin_all_donation_items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("donation_items")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch distribution records for impact
  const { data: distributions = [] } = useQuery({
    queryKey: ["admin_all_distributions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("distribution_records")
        .select("*")
        .order("distribution_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch recent activities (donation items)
  const { data: recentActivities = [] } = useQuery({
    queryKey: ["admin_recent_activities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("donation_items")
        .select("*, donation_batches(batch_number, vendor_id)")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;

      // Get vendor names
      const vendorIds = [...new Set((data || []).map((d: any) => d.donation_batches?.vendor_id).filter(Boolean))];
      let vendorMap: Record<string, any> = {};
      if (vendorIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id, name, business_name").in("id", vendorIds);
        (profiles || []).forEach((p: any) => { vendorMap[p.id] = p; });
      }

      return (data || []).map((d: any) => ({
        ...d,
        vendor: vendorMap[d.donation_batches?.vendor_id] || null,
      }));
    },
  });

  // Calculate stats
  const activeBatches = batches.filter((b: any) => b.status === "available" || b.status === "partially_claimed").length;
  const completedBatches = batches.filter((b: any) => b.status === "completed").length;
  const reservedBatches = batches.filter((b: any) => b.status === "reserved").length;
  const expiredItems = allItems.filter((i: any) => i.status === "expired").length;
  const claimedItems = allItems.filter((i: any) => i.status === "claimed").length;
  const completedItems = allItems.filter((i: any) => i.status === "completed").length;

  // Calculate total beneficiaries from distributions
  const totalBeneficiaries = distributions.reduce((sum: number, d: any) => {
    try {
      const data = JSON.parse(d.notes || "{}");
      return sum + (parseInt(data.beneficiary_count) || 0);
    } catch {
      return sum;
    }
  }, 0);

  // Monthly data for chart
  const monthlyData = batches.reduce((acc: any[], b: any) => {
    const month = new Date(b.created_at).toLocaleString("default", { month: "short" });
    const existing = acc.find(a => a.month === month);
    const items = b.donation_items || [];
    const itemCount = items.length;
    const completedCount = items.filter((i: any) => i.status === "completed").length;

    if (existing) {
      existing.total += itemCount;
      existing.completed += completedCount;
    } else {
      acc.push({ month, total: itemCount, completed: completedCount });
    }
    return acc;
  }, []);

  // Weekly trend data
  const weeklyTrend = (() => {
    const weeks: any[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStr = date.toLocaleDateString("default", { weekday: "short" });
      const dateStr = date.toISOString().split("T")[0];

      const dayBatches = batches.filter((b: any) => b.created_at?.startsWith(dateStr));
      const dayItems = allItems.filter((i: any) => i.created_at?.startsWith(dateStr));

      weeks.push({
        day: dayStr,
        batches: dayBatches.length,
        items: dayItems.length,
      });
    }
    return weeks;
  })();

  return (
    <PageLayout title="Admin Dashboard" subtitle="System-wide overview and monitoring">
      {/* Primary Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 mb-6">
        <StatCard title="Total Vendors" value={vendorCount} icon={Users} variant="primary" />
        <StatCard title="Total NGOs" value={ngoCount} icon={Building2} variant="success" />
        <StatCard title="Active Donations" value={activeBatches} icon={UtensilsCrossed} variant="accent" />
        <StatCard title="Pending Pickup" value={reservedBatches} icon={Clock} variant="default" />
        <StatCard title="Completed" value={completedBatches} icon={CheckCircle} variant="success" />
        <StatCard title="Beneficiaries" value={totalBeneficiaries} icon={HandHeart} variant="primary" />
      </div>

      {/* Alerts Section */}
      {(pendingVerification > 0 || expiredItems > 0) && (
        <div className="mb-6 space-y-2">
          {pendingVerification > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/5 p-3 cursor-pointer hover:bg-warning/10 transition-colors"
              onClick={() => navigate("/admin/user-verification")}
            >
              <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0" />
              <p className="text-sm text-warning">
                <strong>{pendingVerification} user(s)</strong> pending verification
              </p>
              <Badge variant="outline" className="ml-auto text-warning border-warning/50">Review</Badge>
            </motion.div>
          )}
          {expiredItems > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3"
            >
              <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
              <p className="text-sm text-destructive">
                <strong>{expiredItems} donation item(s)</strong> have expired
              </p>
            </motion.div>
          )}
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 mb-6">
        {/* Monthly Overview */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="lg:col-span-2 rounded-xl border border-border bg-card p-6 shadow-card"
        >
          <h2 className="text-sm font-semibold text-foreground mb-4">Monthly Donation Overview</h2>
          <ResponsiveContainer width="100%" height={280}>
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
              <Bar dataKey="total" fill="hsl(var(--destructive))" name="Total Items" radius={[4, 4, 0, 0]} />
              <Bar dataKey="completed" fill="hsl(var(--success))" name="Completed" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-border bg-card p-6 shadow-card"
        >
          <h2 className="text-sm font-semibold text-foreground mb-4">Quick Stats</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-2">
                <Package className="h-3 w-3" /> Total Batches
              </span>
              <span className="text-sm font-semibold text-foreground">{batches.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-2">
                <UtensilsCrossed className="h-3 w-3" /> Total Items
              </span>
              <span className="text-sm font-semibold text-foreground">{allItems.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-2">
                <Clock className="h-3 w-3" /> Claimed (Pending)
              </span>
              <span className="text-sm font-semibold text-info">{claimedItems}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-2">
                <CheckCircle className="h-3 w-3" /> Completed
              </span>
              <span className="text-sm font-semibold text-success">{completedItems}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="h-3 w-3" /> Expired
              </span>
              <span className="text-sm font-semibold text-destructive">{expiredItems}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-2">
                <HandHeart className="h-3 w-3" /> Distributions
              </span>
              <span className="text-sm font-semibold text-destructive">{distributions.length}</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Weekly Trend & Recent Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Weekly Trend */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl border border-border bg-card p-6 shadow-card"
        >
          <h2 className="text-sm font-semibold text-foreground mb-4">7-Day Activity Trend</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={weeklyTrend}>
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
              <Line type="monotone" dataKey="batches" stroke="hsl(var(--destructive))" name="Batches" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="items" stroke="hsl(var(--success))" name="Items" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="rounded-xl border border-border bg-card p-6 shadow-card"
        >
          <h2 className="text-sm font-semibold text-foreground mb-4">Recent Donations</h2>
          <div className="space-y-3 max-h-[200px] overflow-y-auto">
            {recentActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
            ) : (
              recentActivities.slice(0, 5).map((activity: any) => (
                <div key={activity.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-foreground">{activity.food_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {activity.vendor?.business_name || activity.vendor?.name || "Unknown"} · {activity.donation_batches?.batch_number}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-xs capitalize ${
                      activity.status === "completed" ? "bg-success/10 text-success" :
                      activity.status === "claimed" ? "bg-info/10 text-info" :
                      activity.status === "available" ? "bg-destructive/10 text-destructive" :
                      "bg-muted text-muted-foreground"
                    }`}
                  >
                    {activity.status}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </PageLayout>
  );
};

export default AdminDashboard;

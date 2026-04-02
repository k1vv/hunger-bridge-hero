import PageLayout from "@/components/PageLayout";
import StatCard from "@/components/StatCard";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Search, Package, CheckCircle, ClipboardList } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

const NgoDashboard = () => {
  const { user } = useAuth();

  const { data: availableCount = 0 } = useQuery({
    queryKey: ["available_batch_count"],
    queryFn: async () => {
      const { count } = await supabase.from("donation_batches").select("*", { count: "exact", head: true }).in("status", ["available", "partially_claimed"]);
      return count || 0;
    },
  });

  const { data: claimedItems = [] } = useQuery({
    queryKey: ["ngo_claimed_items", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("donation_items").select("*, donation_batches(batch_number, pickup_location)").eq("claimed_by", user!.id).order("claimed_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const activeClaims = claimedItems.filter((i: any) => i.status === "claimed");
  const completedClaims = claimedItems.filter((i: any) => i.status === "completed");

  return (
    <PageLayout title="NGO Dashboard" subtitle="Overview of your food collection activity">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard title="Available Batches" value={availableCount} icon={Search} variant="primary" />
        <StatCard title="Active Claims" value={activeClaims.length} icon={ClipboardList} variant="accent" />
        <StatCard title="Completed" value={completedClaims.length} icon={CheckCircle} variant="success" />
        <StatCard title="Total Claimed" value={claimedItems.length} icon={Package} variant="default" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">Recent Claims</h2>
            <Link to="/ngo/claims" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {activeClaims.slice(0, 5).map((item: any, i: number) => (
              <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-border bg-card p-4 shadow-card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.food_name}</p>
                    <p className="text-xs text-muted-foreground">{item.quantity} {item.unit} · {item.category} · {item.donation_batches?.batch_number}</p>
                  </div>
                  <Badge variant="outline" className="text-xs capitalize">{item.status}</Badge>
                </div>
              </motion.div>
            ))}
            {activeClaims.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No active claims</p>}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">Browse Donations</h2>
            <Link to="/ngo/available" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <div className="rounded-xl border border-border bg-card p-6 shadow-card text-center">
            <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Browse {availableCount} available donation batches</p>
            <Link to="/ngo/available" className="inline-block mt-3 text-sm text-primary hover:underline">Go to Available Donations →</Link>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default NgoDashboard;

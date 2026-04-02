import PageLayout from "@/components/PageLayout";
import StatCard from "@/components/StatCard";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Search, Package, CheckCircle, ClipboardList, Truck } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

const NgoDashboard = () => {
  const { user } = useAuth();

  const { data: availableCount = 0 } = useQuery({
    queryKey: ["available_count"],
    queryFn: async () => {
      const { count, error } = await supabase.from("food_listings").select("*", { count: "exact", head: true }).eq("status", "available");
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: claims = [] } = useQuery({
    queryKey: ["ngo_claims", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("claims").select("*, food_listings(*)").eq("ngo_user_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const pendingClaims = claims.filter((c: any) => c.status === "pending" || c.status === "confirmed");
  const completedClaims = claims.filter((c: any) => c.status === "completed");

  return (
    <PageLayout title="NGO Dashboard" subtitle="Overview of your food collection activity">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard title="Available Donations" value={availableCount} icon={Search} variant="primary" />
        <StatCard title="Active Claims" value={pendingClaims.length} icon={ClipboardList} variant="accent" />
        <StatCard title="Completed" value={completedClaims.length} icon={CheckCircle} variant="success" />
        <StatCard title="Total Claims" value={claims.length} icon={Package} variant="default" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">Active Claims</h2>
            <Link to="/ngo/claims" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {pendingClaims.slice(0, 5).map((claim: any, i: number) => (
              <motion.div key={claim.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-border bg-card p-4 shadow-card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{claim.food_listings?.title}</p>
                    <p className="text-xs text-muted-foreground">{claim.food_listings?.category} · {claim.food_listings?.quantity}</p>
                  </div>
                  <Badge variant="outline" className="text-xs capitalize">{claim.status}</Badge>
                </div>
              </motion.div>
            ))}
            {pendingClaims.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No active claims</p>}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">Browse Donations</h2>
            <Link to="/ngo/available" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <div className="rounded-xl border border-border bg-card p-6 shadow-card text-center">
            <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Browse {availableCount} available donations</p>
            <Link to="/ngo/available" className="inline-block mt-3 text-sm text-primary hover:underline">Go to Available Donations →</Link>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default NgoDashboard;

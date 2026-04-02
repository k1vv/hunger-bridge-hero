import PageLayout from "@/components/PageLayout";
import StatCard from "@/components/StatCard";
import { UtensilsCrossed, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Package } from "lucide-react";

const VendorDashboard = () => {
  const { user } = useAuth();

  const { data: batches = [] } = useQuery({
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

  const active = batches.filter((b: any) => b.status === "available");
  const reserved = batches.filter((b: any) => b.status === "reserved" || b.status === "partially_claimed");
  const completed = batches.filter((b: any) => b.status === "completed");
  const totalItems = batches.reduce((sum: number, b: any) => sum + (b.donation_items?.length || 0), 0);

  return (
    <PageLayout title="Vendor Dashboard" subtitle="Overview of your food donation activity">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard title="Active Batches" value={active.length} icon={UtensilsCrossed} variant="primary" />
        <StatCard title="Pending Pickups" value={reserved.length} icon={Clock} variant="accent" />
        <StatCard title="Completed" value={completed.length} icon={CheckCircle} variant="success" />
        <StatCard title="Total Items" value={totalItems} icon={Package} variant="default" />
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-foreground">Recent Donation Batches</h2>
        <Link to="/vendor/create">
          <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Donation</Button>
        </Link>
      </div>

      <div className="space-y-3">
        {batches.slice(0, 5).map((batch: any, i: number) => (
          <motion.div key={batch.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Link to={`/vendor/donations/${batch.id}`} className="block rounded-xl border border-border bg-card p-4 shadow-card hover:border-primary/30 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-primary">{batch.batch_number}</span>
                    <Badge variant="outline" className="text-xs capitalize">{batch.status}</Badge>
                    <Badge variant="outline" className="text-xs capitalize">{batch.donation_type}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{batch.pickup_location}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {batch.donation_items?.length || 0} item(s) · Pickup: {batch.pickup_date}
                    {batch.pickup_time_start && ` ${batch.pickup_time_start}`}
                    {batch.pickup_time_end && ` - ${batch.pickup_time_end}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{new Date(batch.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              {batch.donation_items && batch.donation_items.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {batch.donation_items.slice(0, 4).map((item: any) => (
                    <span key={item.id} className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                      {item.quantity} {item.unit} {item.food_name}
                    </span>
                  ))}
                  {batch.donation_items.length > 4 && (
                    <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">+{batch.donation_items.length - 4} more</span>
                  )}
                </div>
              )}
            </Link>
          </motion.div>
        ))}
        {batches.length === 0 && (
          <div className="text-center py-12 text-sm text-muted-foreground">
            No donations yet. <Link to="/vendor/create" className="text-primary hover:underline">Create your first donation</Link>
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default VendorDashboard;

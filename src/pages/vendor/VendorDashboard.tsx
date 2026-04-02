import PageLayout from "@/components/PageLayout";
import StatCard from "@/components/StatCard";
import { UtensilsCrossed, Clock, CheckCircle, AlertTriangle, Truck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const VendorDashboard = () => {
  const { user } = useAuth();

  const { data: listings = [] } = useQuery({
    queryKey: ["vendor_listings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("food_listings")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const active = listings.filter((l) => l.status === "available");
  const reserved = listings.filter((l) => l.status === "reserved");
  const completed = listings.filter((l) => l.status === "delivered");
  const today = new Date().toISOString().split("T")[0];
  const expiringSoon = listings.filter(
    (l) => l.status === "available" && l.expiry_date <= new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0]
  );
  const totalKg = listings.filter(l => l.status === "delivered").reduce((sum, l) => {
    const match = l.quantity.match(/(\d+)/);
    return sum + (match ? parseInt(match[1]) : 0);
  }, 0);

  return (
    <PageLayout title="Vendor Dashboard" subtitle="Overview of your food donation activity">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard title="Active Donations" value={active.length} icon={UtensilsCrossed} variant="primary" />
        <StatCard title="Pending Pickups" value={reserved.length} icon={Clock} variant="accent" />
        <StatCard title="Completed" value={completed.length} icon={CheckCircle} variant="success" />
        <StatCard title="Expiring Soon" value={expiringSoon.length} icon={AlertTriangle} variant="default" />
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-foreground">Recent Donations</h2>
        <Link to="/vendor/create">
          <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Donation</Button>
        </Link>
      </div>

      <div className="space-y-3">
        {listings.slice(0, 5).map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-border bg-card p-4 shadow-card"
          >
            <Link to={`/vendor/donations/${item.id}`} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {item.image_url && (
                  <img src={item.image_url} alt={item.title} className="h-12 w-12 rounded-lg object-cover" />
                )}
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.category} · {item.quantity} · Expires {item.expiry_date}</p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs capitalize">{item.status}</Badge>
            </Link>
          </motion.div>
        ))}
        {listings.length === 0 && (
          <div className="text-center py-12 text-sm text-muted-foreground">
            No donations yet. <Link to="/vendor/create" className="text-primary hover:underline">Create your first donation</Link>
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default VendorDashboard;

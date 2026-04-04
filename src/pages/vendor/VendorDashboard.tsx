import PageLayout from "@/components/PageLayout";
import StatCard from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CheckCircle, Clock, Package, Plus, UtensilsCrossed } from "lucide-react";
import { Link } from "react-router-dom";

const VendorDashboard = () => {
  const { user } = useAuth();

  // 🔥 FETCH DATA
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

  // 🔥 LOADING
  if (isLoading) {
    return (
      <PageLayout title="Vendor Dashboard" subtitle="Loading...">
        <p className="text-sm text-muted-foreground">Fetching your data...</p>
      </PageLayout>
    );
  }

  // 🔥 ERROR
  if (error) {
    return (
      <PageLayout title="Vendor Dashboard" subtitle="Error">
        <p className="text-sm text-destructive">Failed to load data</p>
      </PageLayout>
    );
  }

  // 🔥 FILTER BY ACTUAL STATUS
  // Batch statuses: available → partially_claimed → reserved → completed
  const available = batches.filter((b: any) => b.status === "available");
  const partiallyClaimed = batches.filter((b: any) => b.status === "partially_claimed");
  const reserved = batches.filter((b: any) => b.status === "reserved"); // All items claimed, pending pickup
  const completed = batches.filter((b: any) => b.status === "completed");

  const totalItems = batches.reduce(
    (sum: number, b: any) => sum + (b.donation_items?.length || 0),
    0
  );

  return (
    <PageLayout
      title="Vendor Dashboard"
      subtitle="Overview of your food donation activity"
    >
      {/* 🔥 STATS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          title="Available"
          value={available.length + partiallyClaimed.length}
          icon={UtensilsCrossed}
          variant="primary"
        />
        <StatCard
          title="Pending Pickup"
          value={reserved.length}
          icon={Clock}
          variant="accent"
        />
        <StatCard
          title="Completed"
          value={completed.length}
          icon={CheckCircle}
          variant="success"
        />
        <StatCard
          title="Total Items"
          value={totalItems}
          icon={Package}
          variant="default"
        />
      </div>

      {/* 🔥 HEADER */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-foreground">
          Recent Donation Batches
        </h2>
        <Link to="/vendor/create">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" /> New Donation
          </Button>
        </Link>
      </div>

      {/* 🔥 LIST */}
      <div className="space-y-3">
        {batches.slice(0, 5).map((batch: any, i: number) => (
          <motion.div
            key={batch.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Link
              to={`/vendor/donations/${batch.id}`}
              className="block rounded-xl border border-border bg-card p-4 shadow-card hover:border-primary/30 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-primary">
                      {batch.batch_number || "Batch"}
                    </span>

                    <Badge
                      variant="outline"
                      className={`text-xs capitalize ${
                        batch.status === "completed"
                          ? "border-success text-success"
                          : batch.status === "reserved"
                            ? "border-accent text-accent"
                            : batch.status === "partially_claimed"
                              ? "border-info text-info"
                              : batch.status === "cancelled" || batch.status === "expired"
                                ? "border-destructive text-destructive"
                                : ""
                      }`}
                    >
                      {batch.status === "reserved" ? "Pending Pickup" : batch.status === "partially_claimed" ? "Partially Claimed" : batch.status}
                    </Badge>

                    <Badge variant="outline" className="text-xs capitalize">
                      {batch.donation_type}
                    </Badge>
                  </div>

                  <p className="text-sm text-muted-foreground mt-1">
                    {batch.pickup_location}
                  </p>

                  <p className="text-xs text-muted-foreground mt-0.5">
                    {batch.donation_items?.length || 0} item(s) · Pickup:{" "}
                    {batch.pickup_date}
                    {batch.pickup_time_start &&
                      ` ${batch.pickup_time_start}`}
                    {batch.pickup_time_end &&
                      ` - ${batch.pickup_time_end}`}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    {new Date(batch.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* 🔥 ITEMS PREVIEW */}
              {batch.donation_items &&
                batch.donation_items.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {batch.donation_items.slice(0, 4).map((item: any) => (
                      <span
                        key={item.id}
                        className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground"
                      >
                        {item.quantity} {item.unit} {item.food_name}
                      </span>
                    ))}

                    {batch.donation_items.length > 4 && (
                      <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                        +{batch.donation_items.length - 4} more
                      </span>
                    )}
                  </div>
                )}
            </Link>
          </motion.div>
        ))}

        {/* 🔥 EMPTY STATE */}
        {batches.length === 0 && (
          <div className="text-center py-12 text-sm text-muted-foreground">
            No donations yet.{" "}
            <Link
              to="/vendor/create"
              className="text-primary hover:underline"
            >
              Create your first donation
            </Link>
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default VendorDashboard;
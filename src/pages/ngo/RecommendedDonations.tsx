import PageLayout from "@/components/PageLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Star, MapPin, Clock, Package } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

const RecommendedDonations = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: batches = [] } = useQuery({
    queryKey: ["recommended_batches"],
    queryFn: async () => {
      logger.ngo.info("Fetching recommended donations", undefined, user?.id);
      const { data, error } = await supabase
        .from("donation_batches")
        .select("*, donation_items(*), profiles:vendor_id(name, business_name)")
        .in("status", ["available", "partially_claimed"])
        .order("pickup_date", { ascending: true })
        .limit(10);
      if (error) {
        logger.ngo.error("Failed to fetch recommended donations", error.message, { code: error.code }, user?.id);
        throw error;
      }
      logger.ngo.info("Successfully fetched recommended donations", { count: data?.length || 0 }, user?.id);
      return data;
    },
  });

  const claimAllMutation = useMutation({
    mutationFn: async (batch: any) => {
      const availableItems = (batch.donation_items || []).filter((i: any) => i.status === "available");
      const ids = availableItems.map((i: any) => i.id);
      logger.ngo.info("Claiming all items from batch", { batchId: batch.id, batchNumber: batch.batch_number, itemCount: ids.length }, user?.id);

      const { error } = await supabase.from("donation_items").update({ status: "claimed", claimed_by: user!.id, claimed_at: new Date().toISOString() }).in("id", ids);
      if (error) {
        logger.ngo.error("Failed to claim all items", error.message, { batchId: batch.id, itemIds: ids, code: error.code }, user?.id);
        throw error;
      }
      logger.ngo.info("Successfully claimed all items", { batchId: batch.id, itemCount: ids.length }, user?.id);

      const { error: batchError } = await supabase.from("donation_batches").update({ status: "reserved" }).eq("id", batch.id);
      if (batchError) {
        logger.ngo.error("Failed to update batch status to reserved", batchError.message, { batchId: batch.id }, user?.id);
      } else {
        logger.ngo.info("Updated batch status to reserved", { batchId: batch.id }, user?.id);
      }
    },
    onSuccess: () => {
      logger.ngo.info("Claim all process completed successfully", undefined, user?.id);
      toast.success("All items claimed!");
      queryClient.invalidateQueries({ queryKey: ["recommended_batches"] });
    },
    onError: (err: any) => {
      logger.ngo.error("Claim all process failed", err.message, { fullError: err }, user?.id);
      toast.error(err.message);
    },
  });

  return (
    <PageLayout title="Recommended Donations" subtitle="Prioritized by urgency and proximity">
      <div className="space-y-4">
        {batches.map((batch: any, i: number) => {
          const items = (batch.donation_items || []).filter((i: any) => i.status === "available");
          if (items.length === 0) return null;
          const urgentCount = items.filter((i: any) => i.spoilage_risk === "high").length;
          const score = Math.min(100, 60 + urgentCount * 15);

          return (
            <motion.div key={batch.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-border bg-card p-5 shadow-card">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                    <Star className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-primary">{batch.batch_number}</span>
                      <span className="text-sm font-medium text-foreground">{batch.profiles?.business_name || batch.profiles?.name}</span>
                      <span className="text-xs font-bold text-primary">{score}% match</span>
                    </div>
                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {batch.pickup_location}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {batch.pickup_date}</span>
                      <span className="flex items-center gap-1"><Package className="h-3 w-3" /> {items.length} items</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {items.map((item: any) => (
                        <span key={item.id} className={`text-xs px-2 py-0.5 rounded-full ${item.spoilage_risk === "high" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>
                          {item.quantity} {item.unit} {item.food_name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <Button size="sm" onClick={() => claimAllMutation.mutate(batch)} disabled={claimAllMutation.isPending}>
                  Claim All
                </Button>
              </div>
            </motion.div>
          );
        })}
        {batches.length === 0 && <div className="text-center py-12 text-sm text-muted-foreground">No recommendations available</div>}
      </div>
    </PageLayout>
  );
};

export default RecommendedDonations;

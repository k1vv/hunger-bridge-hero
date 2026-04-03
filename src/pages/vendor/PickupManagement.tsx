import PageLayout from "@/components/PageLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Truck, User, MapPin, Clock, CheckCircle2, Package } from "lucide-react";
import { motion } from "framer-motion";
import { notifyNgoOfPickupComplete } from "@/lib/notifications";
import { logger } from "@/lib/logger";

const PickupManagement = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch vendor profile for notifications
  const { data: vendorProfile } = useQuery({
    queryKey: ["vendor_profile", user?.id],
    queryFn: async () => {
      logger.vendor.debug("Fetching vendor profile", undefined, user?.id);
      const { data, error } = await supabase.from("profiles").select("name, business_name").eq("id", user!.id).single();
      if (error) {
        logger.vendor.error("Failed to fetch vendor profile", error.message, { code: error.code }, user?.id);
        throw error;
      }
      logger.vendor.debug("Vendor profile fetched", { name: data?.name, businessName: data?.business_name }, user?.id);
      return data;
    },
    enabled: !!user,
  });

  // Fetch claimed items from vendor's donation batches
  const { data: pickups = [] } = useQuery({
    queryKey: ["vendor_pickups", user?.id],
    queryFn: async () => {
      logger.vendor.info("Fetching vendor pickups", undefined, user?.id);

      // Get all batches belonging to this vendor that have claimed items
      logger.vendor.debug("Fetching vendor donation batches with claimed items", undefined, user?.id);
      const { data: batches, error: batchesError } = await supabase
        .from("donation_batches")
        .select(`
          id,
          batch_number,
          pickup_location,
          pickup_date,
          pickup_time_start,
          pickup_time_end,
          contact_person,
          contact_phone,
          donation_items!inner(
            id,
            food_name,
            quantity,
            unit,
            category,
            status,
            claimed_by,
            claimed_at
          )
        `)
        .eq("vendor_id", user!.id)
        .in("status", ["partially_claimed", "reserved"]);

      if (batchesError) {
        logger.vendor.error("Failed to fetch donation batches", batchesError.message, { code: batchesError.code }, user?.id);
        throw batchesError;
      }

      // Filter to only include claimed items
      const claimedItems: any[] = [];
      for (const batch of batches || []) {
        const claimed = (batch.donation_items || []).filter((item: any) => item.status === "claimed" && item.claimed_by);
        for (const item of claimed) {
          claimedItems.push({
            ...item,
            batch,
          });
        }
      }

      logger.vendor.debug("Found claimed items", { count: claimedItems.length }, user?.id);

      if (claimedItems.length === 0) {
        logger.vendor.info("No claimed items found", undefined, user?.id);
        return [];
      }

      // Get unique NGO IDs and fetch their profiles
      const ngoIds = [...new Set(claimedItems.map(item => item.claimed_by))];
      logger.vendor.debug("Fetching NGO profiles", { ngoCount: ngoIds.length }, user?.id);

      let profilesMap: Record<string, any> = {};
      if (ngoIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, name, business_name, email, phone")
          .in("id", ngoIds);

        if (profilesError) {
          logger.vendor.warn("Failed to fetch NGO profiles", profilesError.message, { code: profilesError.code }, user?.id);
        } else {
          (profiles || []).forEach(p => { profilesMap[p.id] = p; });
        }
      }

      // Enrich items with NGO profile data
      const enrichedItems = claimedItems.map(item => ({
        ...item,
        ngo_profile: profilesMap[item.claimed_by] || null,
      }));

      logger.vendor.info("Successfully fetched pickups", { count: enrichedItems.length }, user?.id);
      return enrichedItems;
    },
    enabled: !!user,
  });

  // Confirm handover - mark item as completed
  const confirmHandover = useMutation({
    mutationFn: async (item: any) => {
      logger.vendor.info("Confirming handover", { itemId: item.id, foodName: item.food_name }, user?.id);

      // Update item status to completed
      logger.vendor.debug("Updating item status to completed", { itemId: item.id }, user?.id);
      const { error } = await supabase
        .from("donation_items")
        .update({ status: "completed" })
        .eq("id", item.id);

      if (error) {
        logger.vendor.error("Failed to update item status", error.message, { itemId: item.id, code: error.code }, user?.id);
        throw error;
      }
      logger.vendor.debug("Item status updated successfully", { itemId: item.id }, user?.id);

      // Check if all items in the batch are now completed
      logger.vendor.debug("Checking batch status", { batchId: item.batch.id }, user?.id);
      const { data: remainingItems } = await supabase
        .from("donation_items")
        .select("id, status")
        .eq("batch_id", item.batch.id)
        .neq("status", "completed");

      if ((remainingItems?.length || 0) === 0) {
        logger.vendor.debug("All items completed, updating batch to completed", { batchId: item.batch.id }, user?.id);
        await supabase
          .from("donation_batches")
          .update({ status: "completed" })
          .eq("id", item.batch.id);
      }

      // Notify NGO that pickup is complete
      const vendorName = vendorProfile?.business_name || vendorProfile?.name || "A vendor";
      logger.vendor.debug("Sending notification to NGO", { ngoId: item.claimed_by, vendorName }, user?.id);

      try {
        await notifyNgoOfPickupComplete(
          item.claimed_by,
          vendorName,
          item.food_name,
          item.id
        );
        logger.vendor.info("NGO notified of pickup completion", { ngoId: item.claimed_by, itemId: item.id }, user?.id);
      } catch (notifyErr: any) {
        logger.vendor.error("Failed to send notification to NGO", notifyErr.message, { ngoId: item.claimed_by, itemId: item.id }, user?.id);
      }
    },
    onSuccess: (_, item) => {
      logger.vendor.info("Handover confirmation completed successfully", { itemId: item.id }, user?.id);
      toast.success("Handover confirmed!");
      queryClient.invalidateQueries({ queryKey: ["vendor_pickups"] });
      queryClient.invalidateQueries({ queryKey: ["vendor_batches"] });
    },
    onError: (err: any, item) => {
      logger.vendor.error("Handover confirmation failed", err.message, { itemId: item.id, fullError: err }, user?.id);
      toast.error(err.message);
    },
  });

  // Group pickups by batch for better display
  const groupedByBatch = pickups.reduce((acc: Record<string, { batch: any; items: any[] }>, item: any) => {
    const batchId = item.batch.id;
    if (!acc[batchId]) {
      acc[batchId] = { batch: item.batch, items: [] };
    }
    acc[batchId].items.push(item);
    return acc;
  }, {});

  return (
    <PageLayout title="Pickup Management" subtitle="Manage scheduled pickups and confirm handovers">
      <div className="space-y-4">
        {Object.entries(groupedByBatch).map(([batchId, group]: [string, any], i: number) => (
          <motion.div
            key={batchId}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-border bg-card shadow-card overflow-hidden"
          >
            {/* Batch Header */}
            <div className="p-4 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-primary" />
                <span className="text-sm font-bold text-primary">{group.batch.batch_number}</span>
              </div>
              <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {group.batch.pickup_location}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {group.batch.pickup_date}
                  {group.batch.pickup_time_start && ` ${group.batch.pickup_time_start}`}
                  {group.batch.pickup_time_end && ` - ${group.batch.pickup_time_end}`}
                </span>
                <span className="flex items-center gap-1">
                  <Package className="h-3 w-3" /> {group.items.length} item(s) pending pickup
                </span>
              </div>
            </div>

            {/* Items */}
            <div className="p-4 space-y-3">
              {group.items.map((item: any) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.food_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.quantity} {item.unit} · {item.category}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>
                          Claimed by: {item.ngo_profile?.business_name || item.ngo_profile?.name || "NGO"}
                        </span>
                        {item.claimed_at && (
                          <span className="text-muted-foreground/70">
                            · {new Date(item.claimed_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs capitalize">{item.status}</Badge>
                    <Button
                      size="sm"
                      onClick={() => confirmHandover.mutate(item)}
                      disabled={confirmHandover.isPending}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Confirm Pickup
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ))}

        {pickups.length === 0 && (
          <div className="text-center py-12 text-sm text-muted-foreground">
            No pending pickups. Items will appear here when NGOs claim your donations.
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default PickupManagement;

import PageLayout from "@/components/PageLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Truck, User, MapPin, Clock, CheckCircle2, Package, XCircle } from "lucide-react";
import { motion } from "framer-motion";
import { notifyNgoOfPickupComplete, notifyNgoOfClaimCancelledByVendor } from "@/lib/notifications";
import { logger } from "@/lib/logger";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const CANCEL_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour

const isCancellable = (claimedAt: string | null): boolean => {
  if (!claimedAt) return false;
  return Date.now() - new Date(claimedAt).getTime() >= CANCEL_TIMEOUT_MS;
};

const getTimeRemaining = (claimedAt: string | null): string | null => {
  if (!claimedAt) return null;
  const elapsed = Date.now() - new Date(claimedAt).getTime();
  const remaining = CANCEL_TIMEOUT_MS - elapsed;
  if (remaining <= 0) return null;
  const mins = Math.ceil(remaining / 60000);
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  }
  return `${mins}m`;
};

const PickupManagement = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: vendorProfile } = useQuery({
    queryKey: ["vendor_profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("name, business_name").eq("id", user!.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: pickups = [] } = useQuery({
    queryKey: ["vendor_pickups", user?.id],
    queryFn: async () => {
      const { data: batches, error: batchesError } = await supabase
        .from("donation_batches")
        .select(`
          id, batch_number, pickup_location, pickup_date,
          pickup_time_start, pickup_time_end, contact_person, contact_phone,
          donation_items!inner(id, food_name, quantity, unit, category, status, claimed_by, claimed_at)
        `)
        .eq("vendor_id", user!.id)
        .in("status", ["partially_claimed", "reserved"]);

      if (batchesError) throw batchesError;

      const claimedItems: any[] = [];
      for (const batch of batches || []) {
        for (const item of (batch.donation_items || []).filter((i: any) => i.status === "claimed" && i.claimed_by)) {
          claimedItems.push({ ...item, batch });
        }
      }

      if (claimedItems.length === 0) return [];

      const ngoIds = [...new Set(claimedItems.map(item => item.claimed_by))];
      let profilesMap: Record<string, any> = {};
      if (ngoIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, name, business_name, email, phone")
          .in("id", ngoIds);
        if (!profilesError) {
          (profiles || []).forEach(p => { profilesMap[p.id] = p; });
        }
      }

      return claimedItems.map(item => ({
        ...item,
        ngo_profile: profilesMap[item.claimed_by] || null,
      }));
    },
    enabled: !!user,
  });

  const confirmHandover = useMutation({
    mutationFn: async (item: any) => {
      logger.vendor.info("Confirming handover", { itemId: item.id, foodName: item.food_name }, user?.id);

      // 1. Update donation item status to completed
      const { error } = await supabase
        .from("donation_items")
        .update({ status: "completed" })
        .eq("id", item.id);
      if (error) throw error;

      // 2. Check if batch is fully completed
      const { data: remainingItems } = await supabase
        .from("donation_items")
        .select("id, status")
        .eq("batch_id", item.batch.id)
        .neq("status", "completed");

      if ((remainingItems?.length || 0) === 0) {
        await supabase
          .from("donation_batches")
          .update({ status: "completed" })
          .eq("id", item.batch.id);
      }

      // 3. Auto-add item to NGO's inventory
      const vendorName = vendorProfile?.business_name || vendorProfile?.name || "A vendor";
      const sourceInfo = JSON.stringify({
        source_type: "donation",
        source_name: vendorName,
        donation_item_id: item.id,
        batch_number: item.batch.batch_number,
        pickup_location: item.batch.pickup_location,
      });

      const { error: inventoryError } = await supabase
        .from("inventory")
        .insert({
          ngo_user_id: item.claimed_by,
          food_title: item.food_name,
          category: item.category || "Other",
          quantity_received: item.quantity || "1",
          quantity_remaining: item.quantity || "1",
          expiry_date: item.expiry_date || null,
          notes: sourceInfo,
        });

      if (inventoryError) {
        logger.vendor.error("Failed to add item to NGO inventory", inventoryError.message, { itemId: item.id }, user?.id);
        // Don't throw - pickup is still confirmed, just log the inventory error
      } else {
        logger.vendor.info("Item added to NGO inventory", { itemId: item.id, ngoId: item.claimed_by }, user?.id);
      }

      // 4. Notify NGO
      try {
        await notifyNgoOfPickupComplete(item.claimed_by, vendorName, item.food_name, item.id);
      } catch (e) {
        logger.vendor.error("Failed to notify NGO", (e as any).message, {}, user?.id);
      }
    },
    onSuccess: () => {
      toast.success("Handover confirmed!");
      queryClient.invalidateQueries({ queryKey: ["vendor_pickups"] });
      queryClient.invalidateQueries({ queryKey: ["vendor_batches"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const cancelReservation = useMutation({
    mutationFn: async (item: any) => {
      // Reset item to available
      const { error } = await supabase
        .from("donation_items")
        .update({ status: "available", claimed_by: null, claimed_at: null })
        .eq("id", item.id);
      if (error) throw error;

      // Check if batch needs status update back to available
      const { data: claimedItems } = await supabase
        .from("donation_items")
        .select("id, status")
        .eq("batch_id", item.batch.id)
        .eq("status", "claimed");

      if ((claimedItems?.length || 0) === 0) {
        // No more claimed items — check if any are available
        const { data: availableItems } = await supabase
          .from("donation_items")
          .select("id")
          .eq("batch_id", item.batch.id)
          .eq("status", "available");

        if ((availableItems?.length || 0) > 0) {
          await supabase
            .from("donation_batches")
            .update({ status: "available" })
            .eq("id", item.batch.id);
        }
      }

      // Notify NGO
      const vendorName = vendorProfile?.business_name || vendorProfile?.name || "A vendor";
      try {
        await notifyNgoOfClaimCancelledByVendor(item.claimed_by, vendorName, item.food_name, item.id);
      } catch (e) {
        logger.vendor.error("Failed to notify NGO of cancellation", (e as any).message, {}, user?.id);
      }
    },
    onSuccess: () => {
      toast.success("Reservation cancelled. Item is now available again.");
      queryClient.invalidateQueries({ queryKey: ["vendor_pickups"] });
      queryClient.invalidateQueries({ queryKey: ["vendor_batches"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const groupedByBatch = pickups.reduce((acc: Record<string, { batch: any; items: any[] }>, item: any) => {
    const batchId = item.batch.id;
    if (!acc[batchId]) acc[batchId] = { batch: item.batch, items: [] };
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

            <div className="p-4 space-y-3">
              {group.items.length > 1 && (
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => group.items.forEach((item: any) => confirmHandover.mutate(item))}
                    disabled={confirmHandover.isPending}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Confirm All Pickups
                  </Button>
                </div>
              )}
              {group.items.map((item: any) => {
                const canCancel = isCancellable(item.claimed_at);
                const timeLeft = getTimeRemaining(item.claimed_at);

                return (
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
                        {!canCancel && timeLeft && (
                          <p className="text-xs text-muted-foreground/60 mt-1">
                            Cancel available in {timeLeft}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs capitalize">{item.status}</Badge>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!canCancel || cancelReservation.isPending}
                            className={canCancel
                              ? "border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                              : "opacity-50"
                            }
                          >
                            <XCircle className="h-4 w-4 mr-1" /> Cancel
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Cancel Reservation</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will cancel the NGO's claim on "{item.food_name}" and make it available again for other NGOs. The NGO will be notified.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Keep Reservation</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => cancelReservation.mutate(item)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Cancel Reservation
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      <Button
                        size="sm"
                        onClick={() => confirmHandover.mutate(item)}
                        disabled={confirmHandover.isPending}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" /> Confirm Pickup
                      </Button>
                    </div>
                  </div>
                );
              })}
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

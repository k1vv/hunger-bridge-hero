import PageLayout from "@/components/PageLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Truck, User, MapPin, Clock, CheckCircle2, Package, XCircle, Camera, X, Upload } from "lucide-react";
import { motion } from "framer-motion";
import { notifyNgoOfPickupComplete, notifyNgoOfClaimCancelledByVendor } from "@/lib/notifications";
import { logger } from "@/lib/logger";
import { useState, useRef } from "react";
import { useRealtimePickups } from "@/hooks/useRealtimeSubscription";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

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

  // Subscribe to real-time pickup updates
  useRealtimePickups(user?.id);

  // State for pickup confirmation dialog
  const [confirmingItem, setConfirmingItem] = useState<any>(null);
  const [pickupPhoto, setPickupPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Photo must be less than 5MB");
        return;
      }
      setPickupPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const clearPhoto = () => {
    setPickupPhoto(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const closeConfirmDialog = () => {
    setConfirmingItem(null);
    clearPhoto();
  };

  const handleConfirmWithPhoto = async () => {
    if (!confirmingItem) return;
    setIsUploading(true);

    try {
      let photoUrl: string | undefined;

      // Upload photo if provided
      if (pickupPhoto) {
        const fileExt = pickupPhoto.name.split(".").pop();
        const fileName = `${confirmingItem.id}_${Date.now()}.${fileExt}`;
        const filePath = `${user?.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("pickup-photos")
          .upload(filePath, pickupPhoto);

        if (uploadError) {
          logger.vendor.error("Failed to upload pickup photo", uploadError.message, {}, user?.id);
          toast.error("Failed to upload photo, but proceeding with confirmation");
        } else {
          const { data: urlData } = supabase.storage
            .from("pickup-photos")
            .getPublicUrl(filePath);
          photoUrl = urlData.publicUrl;
          logger.vendor.info("Pickup photo uploaded", { photoUrl }, user?.id);
        }
      }

      await confirmHandover.mutateAsync({ item: confirmingItem, photoUrl });
      closeConfirmDialog();
    } catch (error) {
      logger.vendor.error("Handover confirmation failed", (error as any).message, {}, user?.id);
    } finally {
      setIsUploading(false);
    }
  };

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
      logger.vendor.info("Fetching pickups for vendor", undefined, user?.id);

      // First, let's check ALL batches for this vendor to understand data state
      const { data: allBatches, error: allBatchesError } = await supabase
        .from("donation_batches")
        .select("id, batch_number, status")
        .eq("vendor_id", user!.id);

      if (allBatchesError) {
        logger.vendor.error("Failed to fetch all batches for debug", allBatchesError.message, { code: allBatchesError.code }, user?.id);
      } else {
        const statusCounts = (allBatches || []).reduce((acc: Record<string, number>, b: any) => {
          acc[b.status] = (acc[b.status] || 0) + 1;
          return acc;
        }, {});
        logger.vendor.info("DEBUG: All vendor batches", { total: allBatches?.length || 0, statusCounts }, user?.id);
      }

      const { data: batches, error: batchesError } = await supabase
        .from("donation_batches")
        .select(`
          id, batch_number, pickup_location, pickup_date,
          pickup_time_start, pickup_time_end, contact_person, contact_phone,
          donation_items!inner(id, food_name, quantity, unit, category, status, claimed_by, claimed_at, expiry_date)
        `)
        .eq("vendor_id", user!.id)
        .in("status", ["partially_claimed", "reserved"]);

      if (batchesError) {
        const isRLSError = batchesError.code === "42501" || batchesError.code === "PGRST301";
        logger.vendor.error(
          isRLSError ? "RLS POLICY ERROR: Cannot fetch batches" : "Failed to fetch batches",
          batchesError.message,
          { code: batchesError.code },
          user?.id
        );
        throw batchesError;
      }

      logger.vendor.info("Fetched claimed/reserved batches", { count: batches?.length || 0 }, user?.id);

      // Log item statuses within batches for debugging
      if (batches && batches.length > 0) {
        for (const batch of batches) {
          const itemStatuses = (batch.donation_items || []).map((i: any) => ({
            id: i.id,
            status: i.status,
            claimed_by: i.claimed_by,
            food_name: i.food_name,
          }));
          logger.vendor.info("DEBUG: Batch items", {
            batchId: batch.id,
            batchNumber: batch.batch_number,
            itemCount: itemStatuses.length,
            items: itemStatuses,
          }, user?.id);
        }
      }

      const claimedItems: any[] = [];
      for (const batch of batches || []) {
        for (const item of (batch.donation_items || []).filter((i: any) => i.status === "claimed" && i.claimed_by)) {
          claimedItems.push({ ...item, batch });
        }
      }

      logger.vendor.info("Found claimed items ready for pickup", { count: claimedItems.length }, user?.id);

      if (claimedItems.length === 0) return [];

      const ngoIds = [...new Set(claimedItems.map(item => item.claimed_by))];
      let profilesMap: Record<string, any> = {};
      if (ngoIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, name, business_name, email, phone")
          .in("id", ngoIds);

        if (profilesError) {
          logger.vendor.error("Failed to fetch NGO profiles", profilesError.message, { ngoIds, code: profilesError.code }, user?.id);
        } else if (profiles && profiles.length === 0 && ngoIds.length > 0) {
          logger.vendor.warn("RLS POLICY WARNING: Query returned 0 profiles but expected " + ngoIds.length, undefined, user?.id);
        } else {
          logger.vendor.info("Fetched NGO profiles", { count: profiles?.length }, user?.id);
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
    mutationFn: async ({ item, photoUrl }: { item: any; photoUrl?: string }) => {
      logger.vendor.info("Confirming handover", { itemId: item.id, foodName: item.food_name, hasPhoto: !!photoUrl }, user?.id);

      // 1. Update donation item status to completed (with optional photo)
      const updateData: any = { status: "completed" };
      if (photoUrl) {
        updateData.pickup_photo_url = photoUrl;
      }
      const { error } = await supabase
        .from("donation_items")
        .update(updateData)
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
                    onClick={() => group.items.forEach((item: any) => confirmHandover.mutate({ item }))}
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
                        onClick={() => setConfirmingItem(item)}
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

      {/* Pickup Confirmation Dialog with Optional Photo */}
      <Dialog open={!!confirmingItem} onOpenChange={(open) => !open && closeConfirmDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Pickup</DialogTitle>
            <DialogDescription>
              Confirm that <strong>{confirmingItem?.ngo_profile?.business_name || confirmingItem?.ngo_profile?.name || "the NGO"}</strong> has picked up <strong>{confirmingItem?.food_name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pickup-photo" className="text-sm font-medium">
                Pickup Photo <span className="text-muted-foreground">(optional)</span>
              </Label>
              <p className="text-xs text-muted-foreground">
                Upload a photo of the pickup for documentation purposes.
              </p>

              {!photoPreview ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-6 cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
                >
                  <Camera className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Click to upload photo</span>
                  <span className="text-xs text-muted-foreground">Max 5MB</span>
                </div>
              ) : (
                <div className="relative">
                  <img
                    src={photoPreview}
                    alt="Pickup preview"
                    className="w-full h-48 object-cover rounded-lg border border-border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8"
                    onClick={clearPhoto}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                id="pickup-photo"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoSelect}
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button variant="outline" onClick={closeConfirmDialog} disabled={isUploading}>
              Cancel
            </Button>
            <Button onClick={handleConfirmWithPhoto} disabled={isUploading}>
              {isUploading ? (
                <>
                  <Upload className="h-4 w-4 mr-1 animate-pulse" /> Confirming...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Confirm Pickup
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};

export default PickupManagement;

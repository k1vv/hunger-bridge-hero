/**
 * Realtime Subscription Hooks
 *
 * These hooks provide live updates from Supabase Realtime.
 * When data changes in the database, subscribed components update automatically.
 */

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";
import { toast } from "sonner";

type TableName =
  | "donation_batches"
  | "donation_items"
  | "notifications"
  | "inventory"
  | "claim_cancellations"
  | "beneficiaries"
  | "distribution_records";

interface UseRealtimeOptions {
  table: TableName;
  filter?: {
    column: string;
    value: string;
  };
  queryKeys: string[][];
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
  showToast?: boolean;
}

/**
 * Generic hook for subscribing to table changes
 */
export function useRealtimeSubscription({
  table,
  filter,
  queryKeys,
  onInsert,
  onUpdate,
  onDelete,
  showToast = false,
}: UseRealtimeOptions) {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    // Build channel name
    const channelName = filter
      ? `${table}_${filter.column}_${filter.value}`
      : `${table}_all`;

    // Build filter string for Supabase
    const filterString = filter
      ? `${filter.column}=eq.${filter.value}`
      : undefined;

    // Subscribe to changes
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: table,
          filter: filterString,
        },
        (payload) => {
          // Invalidate queries to refetch data
          queryKeys.forEach((key) => {
            queryClient.invalidateQueries({ queryKey: key });
          });

          // Call specific handlers
          if (payload.eventType === "INSERT" && onInsert) {
            onInsert(payload.new);
          } else if (payload.eventType === "UPDATE" && onUpdate) {
            onUpdate(payload.new);
          } else if (payload.eventType === "DELETE" && onDelete) {
            onDelete(payload.old);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [table, filter?.column, filter?.value, queryClient]);
}

/**
 * Hook for real-time donation updates (for NGO Available Donations page)
 */
export function useRealtimeDonations() {
  const queryClient = useQueryClient();

  useRealtimeSubscription({
    table: "donation_batches",
    queryKeys: [["all_available_batches"]],
    onInsert: (batch) => {
      if (batch.status === "available") {
        toast.info("New donation available!", {
          description: `Batch ${batch.batch_number} is now available`,
        });
      }
    },
    onUpdate: (batch) => {
      // Batch status changed
      if (batch.status === "available") {
        toast.info("Donation now available", {
          description: `Batch ${batch.batch_number}`,
        });
      }
    },
  });

  // Also subscribe to item changes
  useRealtimeSubscription({
    table: "donation_items",
    queryKeys: [["all_available_batches"]],
  });
}

/**
 * Hook for real-time claim updates (for NGO My Claims page)
 */
export function useRealtimeClaims(ngoId: string | undefined) {
  useRealtimeSubscription({
    table: "donation_items",
    filter: ngoId ? { column: "claimed_by", value: ngoId } : undefined,
    queryKeys: [["ngo_claimed_items", ngoId], ["ngo_cancellations", ngoId]],
    onUpdate: (item) => {
      if (item.status === "completed") {
        toast.success("Pickup confirmed!", {
          description: `${item.food_name} has been added to your inventory`,
        });
      }
    },
  });
}

/**
 * Hook for real-time pickup updates (for Vendor Pickups page)
 */
export function useRealtimePickups(vendorId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!vendorId) return;

    const channel = supabase
      .channel(`vendor_pickups_${vendorId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "donation_items",
        },
        (payload) => {
          const item = payload.new as any;
          const oldItem = payload.old as any;

          // Item was claimed (new pickup pending)
          if (oldItem.status === "available" && item.status === "claimed") {
            queryClient.invalidateQueries({ queryKey: ["vendor_pickups"] });
            toast.info("New pickup scheduled!", {
              description: `${item.food_name} has been claimed`,
            });
          }

          // Item claim was cancelled
          if (oldItem.status === "claimed" && item.status === "available") {
            queryClient.invalidateQueries({ queryKey: ["vendor_pickups"] });
            toast.warning("Claim cancelled", {
              description: `${item.food_name} is now available again`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [vendorId, queryClient]);
}

/**
 * Hook for real-time notification updates
 */
export function useRealtimeNotifications(userId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications_${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const notification = payload.new as any;
          queryClient.invalidateQueries({ queryKey: ["notifications", userId] });

          // Show toast for new notifications
          toast(notification.title, {
            description: notification.message,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
}

/**
 * Hook for real-time inventory updates (for NGO Inventory page)
 */
export function useRealtimeInventory(ngoId: string | undefined) {
  useRealtimeSubscription({
    table: "inventory",
    filter: ngoId ? { column: "ngo_user_id", value: ngoId } : undefined,
    queryKeys: [["ngo_inventory", ngoId]],
    onInsert: (item) => {
      toast.success("New item in inventory!", {
        description: `${item.food_title} has been added`,
      });
    },
  });
}

import { useState } from "react";
import PageLayout from "@/components/PageLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Package, MapPin, Clock, Truck, CheckCircle, ChevronDown, ChevronUp, User, Phone, Utensils } from "lucide-react";
import { logger } from "@/lib/logger";
import { notifyVendorOfClaimCancellation } from "@/lib/notifications";
import PickupLocationMap from "@/components/PickupLocationMap";

const statusFilters = ["all", "pending_pickup", "completed", "cancelled"] as const;

const MyClaims = () => {
  const { user } = useAuth();
  const [filter, setFilter] = useState("all");
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: claimedItems = [] } = useQuery({
    queryKey: ["ngo_claimed_items", user?.id],
    queryFn: async () => {
      logger.ngo.info("Fetching claimed items", undefined, user?.id);
      const { data, error } = await supabase
        .from("donation_items")
        .select("*, donation_batches(id, batch_number, pickup_location, pickup_date, pickup_time_start, pickup_time_end, pickup_lat, pickup_lng, vendor_id, contact_person, contact_phone, donation_type, notes, status)")
        .eq("claimed_by", user!.id)
        .order("claimed_at", { ascending: false });
      if (error) {
        logger.ngo.error("Failed to fetch claimed items", error.message, { code: error.code }, user?.id);
        throw error;
      }

      const vendorIds = Array.from(new Set((data || []).map((item: any) => item.donation_batches?.vendor_id).filter(Boolean)));
      let profileMap = new Map();
      if (vendorIds.length > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from("profiles")
          .select("id, name, business_name, phone, email")
          .in("id", vendorIds);

        if (profileError) {
          const isRLSError = profileError.message.includes("permission") ||
                            profileError.message.includes("policy") ||
                            profileError.code === "42501" ||
                            profileError.code === "PGRST301";
          logger.ngo.error(
            isRLSError ? "RLS POLICY ERROR: Cannot fetch vendor profiles" : "Failed to fetch vendor profiles",
            profileError.message,
            { vendorIds, code: profileError.code, hint: profileError.hint, isRLSError },
            user?.id
          );
        } else if (profiles && profiles.length === 0 && vendorIds.length > 0) {
          logger.ngo.warn("RLS POLICY WARNING: Query returned 0 profiles but expected " + vendorIds.length + ". Check RLS policies on profiles table.", undefined, user?.id);
        } else {
          logger.ngo.info("Fetched vendor profiles", { vendorIds, profileCount: profiles?.length, profiles: profiles?.map(p => ({ id: p.id, name: p.name, business_name: p.business_name })) }, user?.id);
        }

        profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
      }

      logger.ngo.info("Successfully fetched claimed items", { count: data?.length || 0, vendorIds }, user?.id);
      return (data || []).map((item: any) => ({
        ...item,
        donation_batches: {
          ...item.donation_batches,
          profiles: profileMap.get(item.donation_batches?.vendor_id) || null,
        },
      }));
    },
    enabled: !!user,
  });

  const { data: ngoProfile } = useQuery({
    queryKey: ["ngo_profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("name, business_name").eq("id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const grouped = claimedItems.reduce((acc: Record<string, { batch: any; items: any[] }>, item: any) => {
    const batchId = item.batch_id;
    if (!acc[batchId]) {
      acc[batchId] = { batch: item.donation_batches, items: [] };
    }
    acc[batchId].items.push(item);
    return acc;
  }, {});

  const filteredGroups = Object.entries(grouped)
    .map(([batchId, group]: any) => {
      if (filter === "all") return [batchId, group];
      const statusToFilter = filter === "pending_pickup" ? "claimed" : filter;
      const filteredItems = group.items.filter((i: any) => i.status === statusToFilter);
      return [batchId, { ...group, items: filteredItems }];
    })
    .filter(([_, group]: any) => group.items.length > 0);

  const cancelItemMutation = useMutation({
    mutationFn: async (item: any) => {
      logger.ngo.info("Cancelling item claim", { itemId: item.id, batchId: item.batch_id, foodName: item.food_name }, user?.id);
      const { error } = await supabase.from("donation_items").update({ status: "available", claimed_by: null, claimed_at: null }).eq("id", item.id);
      if (error) {
        logger.ngo.error("Failed to cancel item claim", error.message, { itemId: item.id, code: error.code }, user?.id);
        throw error;
      }
      logger.ngo.info("Successfully cancelled item claim", { itemId: item.id }, user?.id);

      const { data: remaining } = await supabase.from("donation_items").select("id").eq("batch_id", item.batch_id).neq("status", "available");
      if ((remaining?.length || 0) <= 1) {
        await supabase.from("donation_batches").update({ status: "available" }).eq("id", item.batch_id);
      } else {
        await supabase.from("donation_batches").update({ status: "partially_claimed" }).eq("id", item.batch_id);
      }

      const ngoName = ngoProfile?.business_name || ngoProfile?.name || "An NGO";
      try {
        await notifyVendorOfClaimCancellation(
          item.donation_batches?.vendor_id,
          ngoName,
          item.food_name,
          item.donation_batches?.batch_number || "Unknown",
          item.id
        );
      } catch (notifyErr) {
        console.error("Failed to send notification:", notifyErr);
      }
    },
    onSuccess: () => {
      toast.success("Item claim cancelled");
      queryClient.invalidateQueries({ queryKey: ["ngo_claimed_items"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const pendingPickups = claimedItems.filter((item: any) => item.status === "claimed").length;
  const completedItems = claimedItems.filter((item: any) => item.status === "completed").length;

  const toggleBatch = (batchId: string) => {
    setExpandedBatch((prev) => (prev === batchId ? null : batchId));
  };

  return (
    <PageLayout title="My Claims" subtitle="View and manage your claimed items">
      {claimedItems.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
            <div className="flex items-center gap-2 text-accent mb-1">
              <Truck className="h-4 w-4" />
              <span className="text-xs">Pending Pickup</span>
            </div>
            <p className="text-2xl font-bold text-accent">{pendingPickups}</p>
          </div>
          <div className="rounded-xl border border-success/30 bg-success/5 p-4">
            <div className="flex items-center gap-2 text-success mb-1">
              <CheckCircle className="h-4 w-4" />
              <span className="text-xs">Completed</span>
            </div>
            <p className="text-2xl font-bold text-success">{completedItems}</p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap mb-6">
        {statusFilters.map((s) => {
          const label = s === "pending_pickup" ? "Pending Pickup" : s;
          return (
            <button key={s} onClick={() => setFilter(s)} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors capitalize ${filter === s ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
              {label}
            </button>
          );
        })}
      </div>

      <div className="space-y-4">
        {filteredGroups.map(([batchId, group]: any, i: number) => {
          const isExpanded = expandedBatch === batchId;
          const batch = group.batch;
          return (
            <motion.div key={batchId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
              {/* Clickable batch header */}
              <button
                type="button"
                onClick={() => toggleBatch(batchId)}
                className="w-full p-4 border-b border-border bg-muted/30 text-left hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-accent">{batch?.batch_number}</span>
                      {(batch?.profiles?.business_name || batch?.profiles?.name) && (
                        <span className="text-xs text-muted-foreground">·</span>
                      )}
                      {(batch?.profiles?.business_name || batch?.profiles?.name) && (
                        <span className="text-sm text-foreground flex items-center gap-1">
                          <User className="h-3 w-3 text-muted-foreground" />
                          {batch.profiles.business_name || batch.profiles.name}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {batch?.pickup_location}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {batch?.pickup_date}</span>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </button>

              {/* Expanded batch details */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 border-b border-border bg-muted/10 grid gap-4 sm:grid-cols-2">
                      {/* Batch info */}
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-xs text-muted-foreground">Vendor</p>
                            <p className="text-sm font-medium text-foreground">{batch?.profiles?.business_name || batch?.profiles?.name || "Unknown Vendor"}</p>
                            {batch?.profiles?.email && <p className="text-xs text-muted-foreground">{batch.profiles.email}</p>}
                            {batch?.profiles?.phone && <p className="text-xs text-muted-foreground">{batch.profiles.phone}</p>}
                          </div>
                        </div>
                        {batch?.contact_person && (
                          <div className="flex items-start gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div>
                              <p className="text-xs text-muted-foreground">Contact Person</p>
                              <p className="text-sm text-foreground">{batch.contact_person}</p>
                              {batch.contact_phone && <p className="text-xs text-muted-foreground">{batch.contact_phone}</p>}
                            </div>
                          </div>
                        )}
                        {(batch?.pickup_time_start || batch?.pickup_time_end) && (
                          <div className="flex items-start gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div>
                              <p className="text-xs text-muted-foreground">Pickup Window</p>
                              <p className="text-sm text-foreground">
                                {batch.pickup_time_start?.slice(0, 5) || "?"} – {batch.pickup_time_end?.slice(0, 5) || "?"}
                              </p>
                            </div>
                          </div>
                        )}
                        {batch?.donation_type && (
                          <div className="flex items-start gap-2">
                            <Utensils className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div>
                              <p className="text-xs text-muted-foreground">Donation Type</p>
                              <p className="text-sm text-foreground capitalize">{batch.donation_type}</p>
                            </div>
                          </div>
                        )}
                        {batch?.notes && (
                          <div className="rounded-lg border border-border bg-background p-2">
                            <p className="text-xs text-muted-foreground mb-0.5">Notes</p>
                            <p className="text-sm text-foreground">{batch.notes}</p>
                          </div>
                        )}
                      </div>

                      {/* Map */}
                      <PickupLocationMap
                        lat={batch?.pickup_lat}
                        lng={batch?.pickup_lng}
                        address={batch?.pickup_location || ""}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Items list */}
              <div className="p-4 space-y-2">
                {group.items.map((item: any) => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between rounded-lg border p-3 ${
                      item.status === "claimed" ? "border-accent/30 bg-accent/5" :
                      item.status === "completed" ? "border-success/30 bg-success/5" :
                      "border-border"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {item.image_url && <img src={item.image_url} alt="" className="h-10 w-10 rounded-lg object-cover" />}
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.food_name}</p>
                        <p className="text-xs text-muted-foreground">{item.quantity} {item.unit} · {item.category}</p>
                        {item.status === "claimed" && (
                          <p className="text-xs text-accent mt-1 flex items-center gap-1">
                            <Truck className="h-3 w-3" /> Ready for pickup
                          </p>
                        )}
                        {item.status === "completed" && (
                          <p className="text-xs text-success mt-1 flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" /> Added to your inventory
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`text-xs capitalize ${
                          item.status === "claimed" ? "border-accent text-accent" :
                          item.status === "completed" ? "border-success text-success" :
                          ""
                        }`}
                      >
                        {item.status === "claimed" ? "Pending Pickup" : item.status}
                      </Badge>
                      {item.status === "claimed" && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => cancelItemMutation.mutate(item)}>Cancel</Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })}
        {filteredGroups.length === 0 && <div className="text-center py-12 text-sm text-muted-foreground">No claims found</div>}
      </div>
    </PageLayout>
  );
};

export default MyClaims;

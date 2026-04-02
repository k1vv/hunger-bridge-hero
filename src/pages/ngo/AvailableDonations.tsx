import { useState } from "react";
import PageLayout from "@/components/PageLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MapPin, Clock, Package, Leaf, Thermometer } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { logger } from "@/lib/logger";

const AvailableDonations = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [halalFilter, setHalalFilter] = useState("all");
  const [selectedItems, setSelectedItems] = useState<Record<string, Set<string>>>({});
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);

  const { data: batches = [] } = useQuery({
    queryKey: ["available_batches"],
    queryFn: async () => {
      logger.ngo.info("Fetching available donation batches", undefined, user?.id);
      const { data, error } = await supabase
        .from("donation_batches")
        .select("*, donation_items(*)")
        .in("status", ["available", "partially_claimed"])
        .order("created_at", { ascending: false });
      if (error) {
        logger.ngo.error("Failed to fetch donation batches", error.message, { code: error.code }, user?.id);
        throw error;
      }

      const vendorIds = Array.from(new Set((data || []).map((batch: any) => batch.vendor_id).filter(Boolean)));

      if (vendorIds.length === 0) {
        logger.ngo.info("No batches found", { count: 0 }, user?.id);
        return data || [];
      }

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, name, business_name, email")
        .in("id", vendorIds);

      if (profilesError) {
        logger.ngo.error("Failed to fetch vendor profiles", profilesError.message, { code: profilesError.code }, user?.id);
        throw profilesError;
      }

      const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]));

      logger.ngo.info("Successfully fetched available batches", { count: data?.length || 0 }, user?.id);
      return (data || []).map((batch: any) => ({
        ...batch,
        profiles: profileMap.get(batch.vendor_id) || null,
      }));
    },
  });

  const filtered = batches.filter((b: any) => {
    const items = b.donation_items || [];
    const availableItems = items.filter((i: any) => i.status === "available");
    if (availableItems.length === 0) return false;

    const matchesSearch = b.batch_number.toLowerCase().includes(search.toLowerCase()) ||
      b.pickup_location.toLowerCase().includes(search.toLowerCase()) ||
      items.some((i: any) => i.food_name.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = categoryFilter === "all" || items.some((i: any) => i.category === categoryFilter && i.status === "available");
    const matchesHalal = halalFilter === "all" || items.some((i: any) => i.halal_status === halalFilter && i.status === "available");
    return matchesSearch && matchesCategory && matchesHalal;
  });

  const toggleItem = (batchId: string, itemId: string) => {
    setSelectedItems(prev => {
      const batchSet = new Set(prev[batchId] || []);
      if (batchSet.has(itemId)) batchSet.delete(itemId); else batchSet.add(itemId);
      return { ...prev, [batchId]: batchSet };
    });
  };

  const selectAll = (batchId: string, items: any[]) => {
    const available = items.filter((i: any) => i.status === "available");
    setSelectedItems(prev => ({
      ...prev,
      [batchId]: new Set(available.map((i: any) => i.id)),
    }));
  };

  const claimMutation = useMutation({
    mutationFn: async ({ batchId, itemIds }: { batchId: string; itemIds: string[] }) => {
      logger.ngo.info("Starting claim process", { batchId, itemIds, itemCount: itemIds.length }, user?.id);

      // Claim selected items
      logger.ngo.debug("Updating donation_items status to claimed", { itemIds }, user?.id);
      const { error } = await supabase
        .from("donation_items")
        .update({ status: "claimed", claimed_by: user!.id, claimed_at: new Date().toISOString() })
        .in("id", itemIds);
      if (error) {
        logger.ngo.error("Failed to claim items", error.message, { batchId, itemIds, code: error.code, details: error.details, hint: error.hint }, user?.id);
        throw error;
      }
      logger.ngo.info("Successfully updated items to claimed status", { itemIds }, user?.id);

      // Check if all items in batch are now claimed
      logger.ngo.debug("Checking remaining available items in batch", { batchId }, user?.id);
      const { data: remaining, error: remainingError } = await supabase
        .from("donation_items")
        .select("id")
        .eq("batch_id", batchId)
        .eq("status", "available");

      if (remainingError) {
        logger.ngo.error("Failed to check remaining items", remainingError.message, { batchId, code: remainingError.code }, user?.id);
      }

      const newBatchStatus = (remaining?.length || 0) === 0 ? "reserved" : "partially_claimed";
      logger.ngo.debug("Updating batch status", { batchId, newBatchStatus, remainingItems: remaining?.length || 0 }, user?.id);

      const { error: batchError } = await supabase.from("donation_batches").update({ status: newBatchStatus }).eq("id", batchId);
      if (batchError) {
        logger.ngo.error("Failed to update batch status", batchError.message, { batchId, newBatchStatus, code: batchError.code }, user?.id);
      } else {
        logger.ngo.info("Successfully updated batch status", { batchId, newBatchStatus }, user?.id);
      }
    },
    onSuccess: () => {
      logger.ngo.info("Claim process completed successfully", undefined, user?.id);
      toast.success("Items claimed successfully!");
      queryClient.invalidateQueries({ queryKey: ["available_batches"] });
      queryClient.invalidateQueries({ queryKey: ["ngo_claims"] });
      setSelectedItems({});
    },
    onError: (err: any) => {
      logger.ngo.error("Claim process failed", err.message, { fullError: err }, user?.id);
      toast.error(err.message);
    },
  });

  const handleClaim = (batchId: string) => {
    const itemIds = Array.from(selectedItems[batchId] || []);
    logger.ngo.info("handleClaim called", { batchId, selectedItemsCount: itemIds.length }, user?.id);
    if (itemIds.length === 0) {
      logger.ngo.warn("Claim attempted with no items selected", { batchId }, user?.id);
      toast.error("Select at least one item to claim");
      return;
    }
    claimMutation.mutate({ batchId, itemIds });
  };

  const spoilageColor = (risk: string) => {
    switch (risk) {
      case "high": case "expired": return "text-destructive bg-destructive/10";
      case "medium": return "text-warning bg-warning/10";
      default: return "text-success bg-success/10";
    }
  };

  return (
    <PageLayout title="Available Donations" subtitle="Browse donation batches and claim items">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9 text-sm" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40 h-9"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {["Vegetables", "Fruits", "Bakery", "Dairy", "Grains", "Canned", "Frozen", "Cooked", "Beverage", "Ready-to-eat", "Other"].map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={halalFilter} onValueChange={setHalalFilter}>
          <SelectTrigger className="w-32 h-9"><SelectValue placeholder="Halal" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="halal">Halal</SelectItem>
            <SelectItem value="non_halal">Non-Halal</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {filtered.map((batch: any, bi: number) => {
          const items = (batch.donation_items || []).filter((i: any) => i.status === "available");
          const selected = selectedItems[batch.id] || new Set();
          const isExpanded = expandedBatch === batch.id;

          return (
            <motion.div key={batch.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: bi * 0.03 }}
              className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
              {/* Batch header */}
              <div className="p-4 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setExpandedBatch(isExpanded ? null : batch.id)}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-primary">{batch.batch_number}</span>
                      <span className="text-sm font-medium text-foreground">— {batch.profiles?.business_name || batch.profiles?.name || "Donor"}</span>
                    </div>
                    <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {batch.pickup_location}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {batch.pickup_date}
                        {batch.pickup_time_start && ` ${batch.pickup_time_start}`}
                        {batch.pickup_time_end && ` - ${batch.pickup_time_end}`}
                      </span>
                      <span className="flex items-center gap-1"><Package className="h-3 w-3" /> {items.length} available item(s)</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs capitalize">{batch.donation_type}</Badge>
                </div>
                {/* Item preview chips */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {items.slice(0, 5).map((item: any) => (
                    <span key={item.id} className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                      {item.quantity} {item.unit} {item.food_name}
                    </span>
                  ))}
                  {items.length > 5 && <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">+{items.length - 5} more</span>}
                </div>
              </div>

              {/* Expanded items */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="border-t border-border">
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-foreground">Select items to claim:</p>
                        <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => selectAll(batch.id, items)}>Select All</Button>
                      </div>

                      {items.map((item: any) => (
                        <div key={item.id} className={`rounded-lg border p-3 transition-colors ${selected.has(item.id) ? "border-primary bg-primary/5" : "border-border"}`}>
                          <div className="flex items-start gap-3">
                            <Checkbox checked={selected.has(item.id)} onCheckedChange={() => toggleItem(batch.id, item.id)} className="mt-0.5" />
                            {item.image_url && <img src={item.image_url} alt={item.food_name} className="h-12 w-12 rounded-lg object-cover flex-shrink-0" />}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-semibold text-foreground">{item.food_name}</h4>
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${spoilageColor(item.spoilage_risk)}`}>{item.spoilage_risk}</span>
                              </div>
                              <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
                                <span><strong>{item.quantity}</strong> {item.unit}</span>
                                <span>· {item.category}</span>
                                <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" /> {item.expiry_date}{item.expiry_time && ` ${item.expiry_time}`}</span>
                                <span className="flex items-center gap-0.5"><Thermometer className="h-3 w-3" /> {item.storage_condition?.replace("_", " ")}</span>
                                <span className="flex items-center gap-0.5"><Leaf className="h-3 w-3" /> {item.halal_status}</span>
                              </div>
                              {item.notes && <p className="text-xs text-muted-foreground mt-1 italic">{item.notes}</p>}
                            </div>
                          </div>
                        </div>
                      ))}

                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <p className="text-xs text-muted-foreground">{selected.size} of {items.length} item(s) selected</p>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => { selectAll(batch.id, items); handleClaim(batch.id); }}>
                            Claim All ({items.length})
                          </Button>
                          <Button size="sm" onClick={() => handleClaim(batch.id)} disabled={selected.size === 0 || claimMutation.isPending}>
                            Claim Selected ({selected.size})
                          </Button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
        {filtered.length === 0 && <div className="text-center py-12 text-sm text-muted-foreground">No available donations found</div>}
      </div>
    </PageLayout>
  );
};

export default AvailableDonations;

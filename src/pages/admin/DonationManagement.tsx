import { useState, useMemo } from "react";
import PageLayout from "@/components/PageLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Search, Package, MapPin, Trash2, AlertTriangle, Clock, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";
import { logger } from "@/lib/logger";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { calculateUnclaimedRisk, type UnclaimedRiskFactors } from "@/lib/impact-calculations";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const statusFilters = ["all", "available", "partially_claimed", "reserved", "completed", "expired", "cancelled"] as const;

const DonationManagement = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState("");

  const { data: batches = [] } = useQuery({
    queryKey: ["admin_all_batches"],
    queryFn: async () => {
      logger.admin.info("Fetching all donation batches", undefined, user?.id);
      const { data, error } = await supabase
        .from("donation_batches")
        .select("*, donation_items(*)")
        .order("created_at", { ascending: false });
      if (error) {
        logger.admin.error("Failed to fetch donation batches", error.message, { code: error.code }, user?.id);
        throw error;
      }
      const vendorIds = [...new Set((data || []).map((b: any) => b.vendor_id))];
      let vendorMap: Record<string, any> = {};
      if (vendorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name, email, business_name, phone")
          .in("id", vendorIds);
        (profiles || []).forEach((p: any) => { vendorMap[p.id] = p; });
      }
      const enriched = (data || []).map((b: any) => ({ ...b, profiles: vendorMap[b.vendor_id] || null }));
      logger.admin.info("Successfully fetched donation batches", { count: enriched.length }, user?.id);
      return enriched;
    },
  });

  const cancelBatchMutation = useMutation({
    mutationFn: async ({ batchId, reason }: { batchId: string; reason: string }) => {
      logger.admin.info("Cancelling donation batch", { batchId, reason }, user?.id);

      // Update batch status to cancelled and store reason in notes
      const { error: batchError } = await supabase
        .from("donation_batches")
        .update({
          status: "cancelled",
          notes: `Cancelled by admin: ${reason}`
        })
        .eq("id", batchId);

      if (batchError) throw batchError;

      // Update all items in the batch to cancelled
      const { error: itemsError } = await supabase
        .from("donation_items")
        .update({ status: "cancelled" })
        .eq("batch_id", batchId);

      if (itemsError) throw itemsError;

      logger.admin.info("Successfully cancelled donation batch", { batchId }, user?.id);
    },
    onSuccess: () => {
      toast.success("Donation listing cancelled successfully");
      queryClient.invalidateQueries({ queryKey: ["admin_all_batches"] });
      setCancelDialogOpen(false);
      setSelectedBatch(null);
      setCancelReason("");
    },
    onError: (err: any) => {
      logger.admin.error("Failed to cancel donation batch", err.message, {}, user?.id);
      toast.error(err.message);
    },
  });

  const handleCancelClick = (batch: any) => {
    setSelectedBatch(batch);
    setCancelReason("");
    setCancelDialogOpen(true);
  };

  const handleConfirmCancel = () => {
    if (!cancelReason.trim()) {
      toast.error("Please provide a reason for cancellation");
      return;
    }
    if (selectedBatch) {
      cancelBatchMutation.mutate({ batchId: selectedBatch.id, reason: cancelReason });
    }
  };

  const filtered = batches.filter((b: any) => {
    const matchesFilter = filter === "all" || b.status === filter;
    const matchesSearch = b.batch_number.toLowerCase().includes(search.toLowerCase()) ||
      b.pickup_location.toLowerCase().includes(search.toLowerCase()) ||
      b.profiles?.name?.toLowerCase().includes(search.toLowerCase()) ||
      b.profiles?.business_name?.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Calculate risk for each batch - memoized to avoid recalculation
  const batchRisks = useMemo(() => {
    const risks: Record<string, ReturnType<typeof calculateUnclaimedRisk>> = {};
    const now = new Date();
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;

    for (const batch of batches) {
      // Only calculate risk for available or partially_claimed batches
      if (batch.status !== "available" && batch.status !== "partially_claimed") continue;

      const items = batch.donation_items || [];
      const createdAt = new Date(batch.created_at);
      const hourssincePosted = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

      // Calculate hours until expiry from pickup_date
      const pickupDate = new Date(batch.pickup_date);
      const hoursUntilExpiry = (pickupDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      // Determine primary category from items
      const categories = items.map((i: any) => i.category);
      const category = categories[0] || "Other";

      // Determine spoilage risk based on category (using standardized category names)
      const highSpoilageCategories = ["Cooked Meals", "Ready-to-Eat", "Dairy Products", "Meat & Seafood"];
      const mediumSpoilageCategories = ["Bakery & Bread", "Fruits", "Vegetables"];
      let spoilageRisk: "low" | "medium" | "high" = "low";
      if (highSpoilageCategories.includes(category)) spoilageRisk = "high";
      else if (mediumSpoilageCategories.includes(category)) spoilageRisk = "medium";

      const factors: UnclaimedRiskFactors = {
        hourssincePosted,
        hoursUntilExpiry,
        category,
        spoilageRisk,
        hasBeenClaimed: batch.status === "partially_claimed",
        isWeekend,
      };

      risks[batch.id] = calculateUnclaimedRisk(factors);
    }

    return risks;
  }, [batches]);

  const statusColor = (s: string) => {
    switch (s) {
      case "available": return "bg-success/10 text-success border-success/30";
      case "partially_claimed": return "bg-info/10 text-info border-info/30";
      case "reserved": return "bg-warning/10 text-warning border-warning/30";
      case "completed": return "bg-primary/10 text-primary border-primary/30";
      case "expired": return "bg-destructive/10 text-destructive border-destructive/30";
      case "cancelled": return "bg-muted text-muted-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <PageLayout title="Donation Management" subtitle="View and manage all donation batches across the platform">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          {statusFilters.map(s => (
            <button key={s} onClick={() => setFilter(s)} className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${filter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
              {s === "partially_claimed" ? "Partial" : s}
            </button>
          ))}
        </div>
        <div className="relative sm:ml-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9 w-full sm:w-64 text-sm" />
        </div>
      </div>

      <TooltipProvider>
      <div className="space-y-3">
        {filtered.map((batch: any, i: number) => {
          const items = batch.donation_items || [];
          const canCancel = batch.status !== "cancelled" && batch.status !== "completed";
          const risk = batchRisks[batch.id];

          // Risk indicator colors
          const getRiskColor = (level: string) => {
            switch (level) {
              case "critical": return "bg-destructive/10 text-destructive border-destructive/30";
              case "high": return "bg-orange-500/10 text-orange-600 border-orange-500/30";
              case "medium": return "bg-warning/10 text-warning border-warning/30";
              default: return "bg-success/10 text-success border-success/30";
            }
          };

          const getRiskIcon = (level: string) => {
            switch (level) {
              case "critical": return <AlertTriangle className="h-3 w-3" />;
              case "high": return <TrendingDown className="h-3 w-3" />;
              case "medium": return <Clock className="h-3 w-3" />;
              default: return null;
            }
          };

          return (
            <motion.div key={batch.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
              className="rounded-xl border border-border bg-card p-4 shadow-card">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-primary">{batch.batch_number}</span>
                    <span className="text-sm text-foreground">{batch.profiles?.business_name || batch.profiles?.name}</span>
                    <Badge variant="outline" className={`text-xs capitalize ${statusColor(batch.status)}`}>{batch.status}</Badge>
                    {risk && risk.riskLevel !== "low" && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className={`text-xs flex items-center gap-1 cursor-help ${getRiskColor(risk.riskLevel)}`}>
                            {getRiskIcon(risk.riskLevel)}
                            {risk.riskLevel === "critical" ? "Critical Risk" : risk.riskLevel === "high" ? "High Risk" : "At Risk"}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <div className="space-y-1">
                            <p className="font-semibold">Unclaimed Risk: {risk.riskScore}%</p>
                            <ul className="text-xs list-disc list-inside">
                              {risk.reasons.map((reason, idx) => (
                                <li key={idx}>{reason}</li>
                              ))}
                            </ul>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                  <div className="flex gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {batch.pickup_location}</span>
                    <span className="flex items-center gap-1"><Package className="h-3 w-3" /> {items.length} items</span>
                    <span>{batch.pickup_date}</span>
                  </div>
                  {batch.profiles?.email && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Contact: {batch.profiles.email} {batch.profiles.phone && `· ${batch.profiles.phone}`}
                    </p>
                  )}
                  {batch.status === "cancelled" && batch.notes && (
                    <p className="text-xs text-destructive mt-2 italic">{batch.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground">{new Date(batch.created_at).toLocaleDateString()}</p>
                  {canCancel && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2 text-destructive border-destructive/50 hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => handleCancelClick(batch)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
              {items.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {items.map((item: any) => (
                    <span key={item.id} className={`text-xs px-2 py-0.5 rounded-full ${
                      item.status === "claimed" ? "bg-info/10 text-info" :
                      item.status === "completed" ? "bg-success/10 text-success" :
                      item.status === "cancelled" ? "bg-muted text-muted-foreground line-through" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {item.quantity} {item.unit} {item.food_name} ({item.status})
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          );
        })}
        {filtered.length === 0 && <div className="text-center py-12 text-sm text-muted-foreground">No donations found</div>}
      </div>
      </TooltipProvider>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Donation Listing</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to cancel the donation listing <strong>{selectedBatch?.batch_number}</strong> from <strong>{selectedBatch?.profiles?.business_name || selectedBatch?.profiles?.name}</strong>.
              <br /><br />
              This action will mark the listing and all its items as cancelled. The listing will not be deleted but will no longer be available for claims.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label htmlFor="cancelReason" className="text-sm font-medium">
              Reason for cancellation <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="cancelReason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Please provide a reason for cancelling this listing..."
              className="mt-2"
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setSelectedBatch(null);
              setCancelReason("");
            }}>
              Keep Listing
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              disabled={cancelBatchMutation.isPending || !cancelReason.trim()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelBatchMutation.isPending ? "Cancelling..." : "Cancel Listing"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
};

export default DonationManagement;

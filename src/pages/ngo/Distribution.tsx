import { useState } from "react";
import PageLayout from "@/components/PageLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, HandHeart, Package } from "lucide-react";
import { motion } from "framer-motion";
import { logger } from "@/lib/logger";

const Distribution = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedInventoryId, setSelectedInventoryId] = useState<string>("");
  const [beneficiaryGroup, setBeneficiaryGroup] = useState("");
  const [quantityDistributed, setQuantityDistributed] = useState("");
  const [distributionDate, setDistributionDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  // Fetch inventory items with remaining quantity > 0
  const { data: inventoryItems = [] } = useQuery({
    queryKey: ["ngo_inventory_for_distribution", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory")
        .select("*")
        .eq("ngo_user_id", user!.id)
        .gt("quantity_remaining", "0")
        .order("expiry_date", { ascending: true }); // FIFO - earliest expiry first
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: records = [] } = useQuery({
    queryKey: ["distribution_records", user?.id],
    queryFn: async () => {
      logger.ngo.info("Fetching distribution records", undefined, user?.id);
      const { data, error } = await supabase.from("distribution_records").select("*").eq("ngo_user_id", user!.id).order("distribution_date", { ascending: false });
      if (error) {
        logger.ngo.error("Failed to fetch distribution records", error.message, { code: error.code }, user?.id);
        throw error;
      }
      logger.ngo.info("Successfully fetched distribution records", { count: data?.length || 0 }, user?.id);
      return data;
    },
    enabled: !!user,
  });

  // Get selected inventory item details
  const selectedItem = inventoryItems.find((item: any) => item.id === selectedInventoryId);

  const createMutation = useMutation({
    mutationFn: async () => {
      logger.ngo.info("Creating distribution record", { beneficiaryGroup, quantityDistributed, distributionDate, inventoryId: selectedInventoryId }, user?.id);

      // 1. Create distribution record
      const distributionData: any = {
        ngo_user_id: user!.id,
        beneficiary_group: beneficiaryGroup,
        quantity_distributed: quantityDistributed,
        distribution_date: distributionDate,
        notes: notes || null,
      };

      // Include inventory reference if selected
      if (selectedInventoryId && selectedItem) {
        distributionData.notes = JSON.stringify({
          user_notes: notes || "",
          inventory_id: selectedInventoryId,
          food_title: selectedItem.food_title,
        });
      }

      const { error } = await supabase.from("distribution_records").insert(distributionData);
      if (error) {
        logger.ngo.error("Failed to create distribution record", error.message, { code: error.code, beneficiaryGroup }, user?.id);
        throw error;
      }

      // 2. Update inventory quantity if an inventory item was selected
      if (selectedInventoryId && selectedItem) {
        const currentRemaining = parseFloat(selectedItem.quantity_remaining) || 0;
        const distributed = parseFloat(quantityDistributed) || 0;
        const newRemaining = Math.max(0, currentRemaining - distributed);

        const { error: inventoryError } = await supabase
          .from("inventory")
          .update({ quantity_remaining: newRemaining.toString() })
          .eq("id", selectedInventoryId);

        if (inventoryError) {
          logger.ngo.error("Failed to update inventory quantity", inventoryError.message, { inventoryId: selectedInventoryId }, user?.id);
          // Don't throw - distribution is recorded, just log the error
        } else {
          logger.ngo.info("Inventory quantity updated", { inventoryId: selectedInventoryId, newRemaining }, user?.id);
        }
      }

      logger.ngo.info("Successfully created distribution record", { beneficiaryGroup, quantityDistributed }, user?.id);
    },
    onSuccess: () => {
      logger.ngo.info("Distribution record creation completed", undefined, user?.id);
      toast.success("Distribution recorded!");
      queryClient.invalidateQueries({ queryKey: ["distribution_records"] });
      queryClient.invalidateQueries({ queryKey: ["ngo_inventory"] });
      queryClient.invalidateQueries({ queryKey: ["ngo_inventory_for_distribution"] });
      setOpen(false);
      setSelectedInventoryId("");
      setBeneficiaryGroup("");
      setQuantityDistributed("");
      setNotes("");
    },
    onError: (err: any) => {
      logger.ngo.error("Distribution record creation failed", err.message, { fullError: err }, user?.id);
      toast.error(err.message);
    },
  });

  return (
    <PageLayout title="Distribution" subtitle="Record food distribution to beneficiaries">
      <div className="flex justify-end mb-6">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Record Distribution</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Record Distribution</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              {/* Inventory Item Selection */}
              <div className="space-y-2">
                <Label>From Inventory (Optional)</Label>
                <Select value={selectedInventoryId} onValueChange={setSelectedInventoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select inventory item to distribute" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No inventory item (manual entry)</SelectItem>
                    {inventoryItems.map((item: any) => (
                      <SelectItem key={item.id} value={item.id}>
                        <div className="flex items-center gap-2">
                          <Package className="h-3 w-3" />
                          <span>{item.food_title}</span>
                          <span className="text-muted-foreground">({item.quantity_remaining} remaining)</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedItem && (
                  <p className="text-xs text-muted-foreground">
                    Available: {selectedItem.quantity_remaining} · Category: {selectedItem.category}
                    {selectedItem.expiry_date && ` · Expires: ${selectedItem.expiry_date}`}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Beneficiary Group *</Label>
                <Input value={beneficiaryGroup} onChange={(e) => setBeneficiaryGroup(e.target.value)} placeholder="e.g. Elderly Home, Orphanage" required />
              </div>

              <div className="space-y-2">
                <Label>Quantity Distributed *</Label>
                <Input
                  value={quantityDistributed}
                  onChange={(e) => setQuantityDistributed(e.target.value)}
                  placeholder={selectedItem ? `Max: ${selectedItem.quantity_remaining}` : "e.g. 20 kg"}
                  required
                />
                {selectedItem && parseFloat(quantityDistributed) > parseFloat(selectedItem.quantity_remaining) && (
                  <p className="text-xs text-destructive">Quantity exceeds available stock</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={distributionDate} onChange={(e) => setDistributionDate(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes about this distribution" />
              </div>

              <Button
                onClick={() => createMutation.mutate()}
                className="w-full"
                disabled={
                  createMutation.isPending ||
                  !beneficiaryGroup ||
                  !quantityDistributed ||
                  (selectedItem && parseFloat(quantityDistributed) > parseFloat(selectedItem.quantity_remaining))
                }
              >
                {createMutation.isPending ? "Saving..." : "Save Record"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {records.map((record: any, i: number) => {
          // Parse notes to extract inventory info if present
          let displayNotes = record.notes;
          let foodTitle = null;
          try {
            const parsed = JSON.parse(record.notes);
            if (parsed.food_title) {
              foodTitle = parsed.food_title;
              displayNotes = parsed.user_notes || null;
            }
          } catch {
            // Not JSON, use as regular notes
          }

          return (
            <motion.div key={record.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="rounded-xl border border-border bg-card p-4 shadow-card">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                  <HandHeart className="h-5 w-5 text-success" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">{record.beneficiary_group}</p>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>{record.quantity_distributed}</span>
                    <span>·</span>
                    <span>{record.distribution_date}</span>
                    {foodTitle && (
                      <>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Package className="h-3 w-3" /> {foodTitle}
                        </span>
                      </>
                    )}
                  </div>
                  {displayNotes && <p className="text-xs text-muted-foreground mt-1">{displayNotes}</p>}
                </div>
              </div>
            </motion.div>
          );
        })}
        {records.length === 0 && <div className="text-center py-12 text-sm text-muted-foreground">No distribution records yet</div>}
      </div>
    </PageLayout>
  );
};

export default Distribution;

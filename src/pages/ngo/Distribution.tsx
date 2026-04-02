import { useState } from "react";
import PageLayout from "@/components/PageLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, HandHeart } from "lucide-react";
import { motion } from "framer-motion";

const Distribution = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [beneficiaryGroup, setBeneficiaryGroup] = useState("");
  const [quantityDistributed, setQuantityDistributed] = useState("");
  const [distributionDate, setDistributionDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  const { data: records = [] } = useQuery({
    queryKey: ["distribution_records", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("distribution_records").select("*").eq("ngo_user_id", user!.id).order("distribution_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("distribution_records").insert({
        ngo_user_id: user!.id,
        beneficiary_group: beneficiaryGroup,
        quantity_distributed: quantityDistributed,
        distribution_date: distributionDate,
        notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Distribution recorded!");
      queryClient.invalidateQueries({ queryKey: ["distribution_records"] });
      setOpen(false);
      setBeneficiaryGroup(""); setQuantityDistributed(""); setNotes("");
    },
    onError: (err: any) => toast.error(err.message),
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
              <div className="space-y-2"><Label>Beneficiary Group</Label><Input value={beneficiaryGroup} onChange={(e) => setBeneficiaryGroup(e.target.value)} placeholder="e.g. Elderly Home, Orphanage" required /></div>
              <div className="space-y-2"><Label>Quantity Distributed</Label><Input value={quantityDistributed} onChange={(e) => setQuantityDistributed(e.target.value)} placeholder="e.g. 20 kg" required /></div>
              <div className="space-y-2"><Label>Date</Label><Input type="date" value={distributionDate} onChange={(e) => setDistributionDate(e.target.value)} /></div>
              <div className="space-y-2"><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
              <Button onClick={() => createMutation.mutate()} className="w-full" disabled={createMutation.isPending}>Save Record</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {records.map((record: any, i: number) => (
          <motion.div key={record.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
            className="rounded-xl border border-border bg-card p-4 shadow-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                <HandHeart className="h-5 w-5 text-success" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{record.beneficiary_group}</p>
                <p className="text-xs text-muted-foreground">{record.quantity_distributed} · {record.distribution_date}</p>
                {record.notes && <p className="text-xs text-muted-foreground mt-1">{record.notes}</p>}
              </div>
            </div>
          </motion.div>
        ))}
        {records.length === 0 && <div className="text-center py-12 text-sm text-muted-foreground">No distribution records yet</div>}
      </div>
    </PageLayout>
  );
};

export default Distribution;

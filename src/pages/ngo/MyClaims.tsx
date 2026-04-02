import { useState } from "react";
import PageLayout from "@/components/PageLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Package, MapPin, Clock } from "lucide-react";

const statusFilters = ["all", "claimed", "completed", "cancelled"] as const;

const MyClaims = () => {
  const { user } = useAuth();
  const [filter, setFilter] = useState("all");
  const queryClient = useQueryClient();

  // Get all items claimed by this NGO, grouped by batch
  const { data: claimedItems = [] } = useQuery({
    queryKey: ["ngo_claimed_items", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("donation_items")
        .select("*, donation_batches(*, profiles:vendor_id(name, business_name))")
        .eq("claimed_by", user!.id)
        .order("claimed_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Group by batch
  const grouped = claimedItems.reduce((acc: Record<string, { batch: any; items: any[] }>, item: any) => {
    const batchId = item.batch_id;
    if (!acc[batchId]) {
      acc[batchId] = { batch: item.donation_batches, items: [] };
    }
    acc[batchId].items.push(item);
    return acc;
  }, {});

  const filteredGroups = Object.entries(grouped).filter(([_, group]: any) => {
    if (filter === "all") return true;
    return group.items.some((i: any) => i.status === filter);
  });

  const cancelItemMutation = useMutation({
    mutationFn: async (item: any) => {
      const { error } = await supabase.from("donation_items").update({ status: "available", claimed_by: null, claimed_at: null }).eq("id", item.id);
      if (error) throw error;
      // Check if batch should go back to available
      const { data: remaining } = await supabase.from("donation_items").select("id").eq("batch_id", item.batch_id).neq("status", "available");
      if ((remaining?.length || 0) <= 1) {
        await supabase.from("donation_batches").update({ status: "available" }).eq("id", item.batch_id);
      } else {
        await supabase.from("donation_batches").update({ status: "partially_claimed" }).eq("id", item.batch_id);
      }
    },
    onSuccess: () => {
      toast.success("Item claim cancelled");
      queryClient.invalidateQueries({ queryKey: ["ngo_claimed_items"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <PageLayout title="My Claims" subtitle="View and manage your claimed items">
      <div className="flex items-center gap-2 flex-wrap mb-6">
        {statusFilters.map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors capitalize ${filter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
            {s}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredGroups.map(([batchId, group]: any, i: number) => (
          <motion.div key={batchId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-primary">{group.batch?.batch_number}</span>
                <span className="text-sm text-foreground">{group.batch?.profiles?.business_name || group.batch?.profiles?.name}</span>
              </div>
              <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {group.batch?.pickup_location}</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {group.batch?.pickup_date}</span>
              </div>
            </div>
            <div className="p-4 space-y-2">
              {group.items.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="flex items-center gap-3">
                    {item.image_url && <img src={item.image_url} alt="" className="h-10 w-10 rounded-lg object-cover" />}
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.food_name}</p>
                      <p className="text-xs text-muted-foreground">{item.quantity} {item.unit} · {item.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs capitalize">{item.status}</Badge>
                    {item.status === "claimed" && (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => cancelItemMutation.mutate(item)}>Cancel</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
        {filteredGroups.length === 0 && <div className="text-center py-12 text-sm text-muted-foreground">No claims found</div>}
      </div>
    </PageLayout>
  );
};

export default MyClaims;

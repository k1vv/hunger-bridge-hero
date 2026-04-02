import { useState } from "react";
import PageLayout from "@/components/PageLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion } from "framer-motion";

const statusFilters = ["all", "pending", "confirmed", "in_transit", "completed", "cancelled"] as const;

const MyClaims = () => {
  const { user } = useAuth();
  const [filter, setFilter] = useState("all");
  const queryClient = useQueryClient();

  const { data: claims = [] } = useQuery({
    queryKey: ["ngo_claims", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("claims")
        .select("*, food_listings(*)")
        .eq("ngo_user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const cancelMutation = useMutation({
    mutationFn: async (claim: any) => {
      const { error } = await supabase.from("claims").update({ status: "cancelled" }).eq("id", claim.id);
      if (error) throw error;
      await supabase.from("food_listings").update({ status: "available", reserved_by: null, reserved_at: null }).eq("id", claim.food_listing_id);
    },
    onSuccess: () => {
      toast.success("Claim cancelled");
      queryClient.invalidateQueries({ queryKey: ["ngo_claims"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filtered = claims.filter((c: any) => filter === "all" || c.status === filter);

  return (
    <PageLayout title="My Claims" subtitle="View and manage your claimed donations">
      <div className="flex items-center gap-2 flex-wrap mb-6">
        {statusFilters.map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors capitalize ${filter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
            {s}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((claim: any, i: number) => (
          <motion.div key={claim.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
            className="rounded-xl border border-border bg-card p-4 shadow-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {claim.food_listings?.image_url && <img src={claim.food_listings.image_url} alt="" className="h-12 w-12 rounded-lg object-cover" />}
                <div>
                  <p className="text-sm font-semibold text-foreground">{claim.food_listings?.title}</p>
                  <p className="text-xs text-muted-foreground">{claim.food_listings?.category} · {claim.food_listings?.quantity} · {claim.food_listings?.pickup_location}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs capitalize">{claim.status}</Badge>
                {(claim.status === "pending" || claim.status === "confirmed") && (
                  <Button size="sm" variant="outline" onClick={() => cancelMutation.mutate(claim)}>Cancel</Button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
        {filtered.length === 0 && <div className="text-center py-12 text-sm text-muted-foreground">No claims found</div>}
      </div>
    </PageLayout>
  );
};

export default MyClaims;

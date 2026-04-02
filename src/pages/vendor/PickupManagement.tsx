import PageLayout from "@/components/PageLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Truck, User, Phone, CheckCircle2, MapPin } from "lucide-react";
import { motion } from "framer-motion";

const PickupManagement = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: pickups = [] } = useQuery({
    queryKey: ["vendor_pickups", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("claims")
        .select("*, food_listings!inner(*), profiles:ngo_user_id(name, email, phone)")
        .eq("food_listings.user_id", user!.id)
        .in("status", ["pending", "confirmed", "in_transit"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const confirmHandover = useMutation({
    mutationFn: async (claimId: string) => {
      const { error } = await supabase.from("claims").update({ status: "completed" }).eq("id", claimId);
      if (error) throw error;
      const claim = pickups.find(p => p.id === claimId);
      if (claim) {
        await supabase.from("food_listings").update({ status: "delivered" }).eq("id", claim.food_listing_id);
      }
    },
    onSuccess: () => {
      toast.success("Handover confirmed!");
      queryClient.invalidateQueries({ queryKey: ["vendor_pickups"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <PageLayout title="Pickup Management" subtitle="Manage scheduled pickups and confirm handovers">
      <div className="space-y-4">
        {pickups.map((pickup: any, i: number) => (
          <motion.div key={pickup.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                  <Truck className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{pickup.food_listings?.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{pickup.food_listings?.quantity} · {pickup.food_listings?.category}</p>
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {pickup.food_listings?.pickup_location}</span>
                    <span className="flex items-center gap-1"><User className="h-3 w-3" /> {pickup.profiles?.name || "NGO"}</span>
                    {pickup.volunteer_name && <span className="flex items-center gap-1"><User className="h-3 w-3" /> Vol: {pickup.volunteer_name}</span>}
                    {pickup.volunteer_phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {pickup.volunteer_phone}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs capitalize">{pickup.status}</Badge>
                {pickup.status !== "completed" && (
                  <Button size="sm" onClick={() => confirmHandover.mutate(pickup.id)}>
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Confirm
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
        {pickups.length === 0 && <div className="text-center py-12 text-sm text-muted-foreground">No scheduled pickups</div>}
      </div>
    </PageLayout>
  );
};

export default PickupManagement;

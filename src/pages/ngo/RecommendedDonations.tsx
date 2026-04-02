import PageLayout from "@/components/PageLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Star, MapPin, Clock, Package } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const RecommendedDonations = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: listings = [] } = useQuery({
    queryKey: ["recommended_listings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("food_listings")
        .select("*, profiles:user_id(name, business_name)")
        .eq("status", "available")
        .order("expiry_date", { ascending: true })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  const claimMutation = useMutation({
    mutationFn: async (listingId: string) => {
      const { error } = await supabase.from("claims").insert({ food_listing_id: listingId, ngo_user_id: user!.id });
      if (error) throw error;
      await supabase.from("food_listings").update({ status: "reserved", reserved_by: user!.id, reserved_at: new Date().toISOString() }).eq("id", listingId);
    },
    onSuccess: () => {
      toast.success("Donation claimed!");
      queryClient.invalidateQueries({ queryKey: ["recommended_listings"] });
      queryClient.invalidateQueries({ queryKey: ["ngo_claims"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <PageLayout title="Recommended Donations" subtitle="AI-matched donations based on urgency and your preferences">
      <div className="space-y-4">
        {listings.map((listing: any, i: number) => {
          const daysToExpiry = Math.ceil((new Date(listing.expiry_date).getTime() - Date.now()) / 86400000);
          const score = Math.max(10, 100 - daysToExpiry * 10);
          return (
            <motion.div key={listing.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-border bg-card p-5 shadow-card">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Star className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">{listing.title}</h3>
                      <span className="text-xs font-bold text-primary">{score}% match</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{listing.profiles?.business_name || listing.profiles?.name}</p>
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Package className="h-3 w-3" /> {listing.category} · {listing.quantity}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {daysToExpiry <= 0 ? "Expired" : `${daysToExpiry}d left`}</span>
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {listing.pickup_location}</span>
                    </div>
                  </div>
                </div>
                <Button size="sm" onClick={() => claimMutation.mutate(listing.id)} disabled={claimMutation.isPending}>Claim</Button>
              </div>
            </motion.div>
          );
        })}
        {listings.length === 0 && <div className="text-center py-12 text-sm text-muted-foreground">No recommendations available</div>}
      </div>
    </PageLayout>
  );
};

export default RecommendedDonations;

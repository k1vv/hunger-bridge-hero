import PageLayout from "@/components/PageLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Truck, CheckCircle2, User, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import { logger } from "@/lib/logger";

const CollectionManagement = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedClaim, setSelectedClaim] = useState<any>(null);
  const [volunteerName, setVolunteerName] = useState("");
  const [volunteerPhone, setVolunteerPhone] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: claims = [] } = useQuery({
    queryKey: ["ngo_active_claims", user?.id],
    queryFn: async () => {
      logger.ngo.info("Fetching active claims for collection management", undefined, user?.id);
      const { data, error } = await supabase
        .from("claims")
        .select("*, food_listings(*)")
        .eq("ngo_user_id", user!.id)
        .in("status", ["pending", "confirmed", "in_transit"])
        .order("created_at", { ascending: false });
      if (error) {
        logger.ngo.error("Failed to fetch active claims", error.message, { code: error.code }, user?.id);
        throw error;
      }
      logger.ngo.info("Successfully fetched active claims", { count: data?.length || 0 }, user?.id);
      return data;
    },
    enabled: !!user,
  });

  const updateClaim = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      logger.ngo.info("Updating claim", { claimId: id, updates }, user?.id);
      const { error } = await supabase.from("claims").update(updates).eq("id", id);
      if (error) {
        logger.ngo.error("Failed to update claim", error.message, { claimId: id, updates, code: error.code }, user?.id);
        throw error;
      }
      logger.ngo.info("Successfully updated claim", { claimId: id }, user?.id);
    },
    onSuccess: () => {
      logger.ngo.info("Claim update completed successfully", undefined, user?.id);
      toast.success("Updated!");
      queryClient.invalidateQueries({ queryKey: ["ngo_active_claims"] });
      setDialogOpen(false);
    },
    onError: (err: any) => {
      logger.ngo.error("Claim update failed", err.message, { fullError: err }, user?.id);
      toast.error(err.message);
    },
  });

  const assignVolunteer = () => {
    if (!selectedClaim) {
      logger.ngo.warn("assignVolunteer called without selected claim", undefined, user?.id);
      return;
    }
    logger.ngo.info("Assigning volunteer to claim", { claimId: selectedClaim.id, volunteerName, volunteerPhone }, user?.id);
    updateClaim.mutate({ id: selectedClaim.id, updates: { volunteer_name: volunteerName, volunteer_phone: volunteerPhone, status: "confirmed" } });
  };

  const markReceived = (claimId: string, listingId: string) => {
    logger.ngo.info("Marking claim as received", { claimId, listingId }, user?.id);
    updateClaim.mutate({ id: claimId, updates: { status: "completed" } });
    supabase.from("food_listings").update({ status: "delivered" }).eq("id", listingId).then(({ error }) => {
      if (error) {
        logger.ngo.error("Failed to update food listing status", error.message, { listingId, code: error.code }, user?.id);
      } else {
        logger.ngo.info("Food listing marked as delivered", { listingId }, user?.id);
      }
    });
  };

  return (
    <PageLayout title="Collection Management" subtitle="Schedule pickups and confirm collections">
      <div className="space-y-4">
        {claims.map((claim: any, i: number) => (
          <motion.div key={claim.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">{claim.food_listings?.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{claim.food_listings?.pickup_location}</p>
                {claim.volunteer_name && (
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><User className="h-3 w-3" /> {claim.volunteer_name}</span>
                    {claim.volunteer_phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {claim.volunteer_phone}</span>}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs capitalize">{claim.status}</Badge>
                {claim.status === "pending" && (
                  <Dialog open={dialogOpen && selectedClaim?.id === claim.id} onOpenChange={(o) => { setDialogOpen(o); if (o) setSelectedClaim(claim); }}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">Assign Volunteer</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Assign Volunteer</DialogTitle></DialogHeader>
                      <div className="space-y-4 mt-2">
                        <div className="space-y-2"><Label>Name</Label><Input value={volunteerName} onChange={(e) => setVolunteerName(e.target.value)} /></div>
                        <div className="space-y-2"><Label>Phone</Label><Input value={volunteerPhone} onChange={(e) => setVolunteerPhone(e.target.value)} /></div>
                        <Button onClick={assignVolunteer} className="w-full">Assign & Confirm</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
                {(claim.status === "confirmed" || claim.status === "in_transit") && (
                  <Button size="sm" onClick={() => markReceived(claim.id, claim.food_listing_id)}>
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Mark Received
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
        {claims.length === 0 && <div className="text-center py-12 text-sm text-muted-foreground">No active collections</div>}
      </div>
    </PageLayout>
  );
};

export default CollectionManagement;

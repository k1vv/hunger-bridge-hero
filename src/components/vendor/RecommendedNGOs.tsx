import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Building2, MapPin, CheckCircle2, Star, ThumbsUp, Truck } from "lucide-react";
import { getRecommendedNGOs, formatDistance, type DonationItem } from "@/lib/matching-utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface RecommendedNGOsProps {
  items: DonationItem[];
  vendorLat?: number;
  vendorLng?: number;
}

const RecommendedNGOs = ({ items, vendorLat, vendorLng }: RecommendedNGOsProps) => {
  // Fetch verified NGOs with their profiles
  const { data: ngos = [], isLoading } = useQuery({
    queryKey: ["recommended_ngos"],
    queryFn: async () => {
      // Fetch NGO role user IDs first (no FK between profiles and user_roles)
      const { data: ngoRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "ngo");

      if (rolesError) throw rolesError;
      const ngoUserIds = (ngoRoles || []).map((r) => r.user_id);
      if (ngoUserIds.length === 0) return [];

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .in("id", ngoUserIds)
        .eq("verification_status", "verified");

      if (error) throw error;
      return data || [];
    },
  });

  // Calculate recommended NGOs
  const recommended = getRecommendedNGOs(
    ngos.map((ngo: any) => ({
      id: ngo.id,
      organization_name: ngo.organization_name || ngo.business_name || ngo.name,
      address: ngo.address,
      lat: ngo.lat,
      lng: ngo.lng,
      food_types: ngo.food_types || [],
      storage_types: ngo.storage_types || [],
      pickup_radius: ngo.pickup_radius || 10,
      priority_needs: ngo.priority_needs || [],
      halal_only: ngo.halal_only,
      verification_status: ngo.verification_status,
    })),
    items,
    vendorLat,
    vendorLng
  );

  if (items.length === 0) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 shadow-card">
        <div className="flex items-center gap-2 mb-3">
          <Star className="h-4 w-4 text-accent animate-pulse" />
          <h3 className="text-sm font-semibold text-foreground">Finding Best NGO Matches...</h3>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-muted/50 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (recommended.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-muted-foreground/30 bg-muted/5 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-muted-foreground">No NGO Matches Found</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Add items to your donation to see NGO recommendations based on their preferences and location.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 shadow-card">
      <div className="flex items-center gap-2 mb-3">
        <Star className="h-4 w-4 text-accent" />
        <h3 className="text-sm font-semibold text-foreground">Recommended NGOs</h3>
        <span className="text-xs text-muted-foreground ml-auto">
          Based on your donation items
        </span>
      </div>

      <ScrollArea className="max-h-64">
        <div className="space-y-2">
          {recommended.map((ngo, idx) => {
            const score = ngo.score.total;
            const scoreColor = score >= 70 ? "text-success" : score >= 40 ? "text-accent" : "text-muted-foreground";
            const scoreBg = score >= 70 ? "bg-success/10" : score >= 40 ? "bg-accent/10" : "bg-muted";

            return (
              <motion.div
                key={ngo.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={`rounded-lg border p-3 ${
                  score >= 70 ? "border-success/30 bg-success/5" :
                  score >= 40 ? "border-accent/30 bg-accent/5" :
                  "border-border bg-card"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full ${scoreBg}`}>
                    <Building2 className={`h-5 w-5 ${scoreColor}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">
                        {ngo.organization_name}
                      </p>
                      <CheckCircle2 className="h-3.5 w-3.5 text-success flex-shrink-0" />
                    </div>

                    {ngo.address && (
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        {ngo.address}
                      </p>
                    )}

                    <div className="flex items-center gap-3 mt-2">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${scoreColor}`}>
                        <ThumbsUp className="h-3 w-3" />
                        {score}% match
                      </span>
                      {ngo.score.distance !== null && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Truck className="h-3 w-3" />
                          {formatDistance(ngo.score.distance)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Score breakdown tooltip-like display */}
                  <div className="hidden sm:flex flex-col items-end text-[10px] text-muted-foreground">
                    <span>Food: {ngo.score.foodMatch}/30</span>
                    <span>Distance: {ngo.score.location}/25</span>
                    <span>Storage: {ngo.score.storage}/20</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </ScrollArea>

      <p className="text-xs text-muted-foreground mt-3 text-center">
        NGOs are matched based on food preferences, location, storage capabilities, and verification status.
      </p>
    </div>
  );
};

export default RecommendedNGOs;

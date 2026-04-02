import { useParams, Link, useNavigate } from "react-router-dom";
import PageLayout from "@/components/PageLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Edit, Trash2, MapPin, Clock, Package, Leaf, Thermometer, FileText } from "lucide-react";

const DonationDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: listing, isLoading } = useQuery({
    queryKey: ["food_listing", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("food_listings").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: claims = [] } = useQuery({
    queryKey: ["listing_claims", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("claims").select("*, profiles:ngo_user_id(name, email)").eq("food_listing_id", id!);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("food_listings").delete().eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Donation deleted");
      queryClient.invalidateQueries({ queryKey: ["vendor_listings"] });
      navigate("/vendor/donations");
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (isLoading) return <PageLayout title="Loading..."><div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div></PageLayout>;
  if (!listing) return <PageLayout title="Not Found"><p className="text-muted-foreground">Donation not found.</p></PageLayout>;

  const canEdit = listing.status === "available" && listing.user_id === user?.id;
  const canDelete = (listing.status === "available" || listing.status === "cancelled") && listing.user_id === user?.id;

  return (
    <PageLayout title={listing.title} subtitle="Donation details">
      <div className="max-w-3xl space-y-6">
        {listing.image_url && (
          <img src={listing.image_url} alt={listing.title} className="w-full h-64 object-cover rounded-xl border border-border" />
        )}

        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-sm capitalize">{listing.status}</Badge>
          {canEdit && <Link to={`/vendor/donations/${id}/edit`}><Button size="sm" variant="outline"><Edit className="h-4 w-4 mr-1" /> Edit</Button></Link>}
          {canDelete && <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate()}><Trash2 className="h-4 w-4 mr-1" /> Delete</Button>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Food Info</h3>
            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2 text-muted-foreground"><Package className="h-4 w-4" /> {listing.category} · {listing.quantity}</p>
              <p className="flex items-center gap-2 text-muted-foreground"><Clock className="h-4 w-4" /> Expires: {listing.expiry_date}</p>
              <p className="flex items-center gap-2 text-muted-foreground"><Leaf className="h-4 w-4" /> Halal: {listing.halal_status || "Unknown"}</p>
              <p className="flex items-center gap-2 text-muted-foreground"><Thermometer className="h-4 w-4" /> Storage: {listing.storage_condition || "Room temp"}</p>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Pickup Info</h3>
            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-4 w-4" /> {listing.pickup_location}</p>
              {listing.pickup_time_start && <p className="flex items-center gap-2 text-muted-foreground"><Clock className="h-4 w-4" /> {listing.pickup_time_start} - {listing.pickup_time_end}</p>}
            </div>
          </div>
        </div>

        {listing.notes_for_receiver && (
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><FileText className="h-4 w-4" /> Notes for Receiver</h3>
            <p className="text-sm text-muted-foreground mt-2">{listing.notes_for_receiver}</p>
          </div>
        )}

        {claims.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Claims ({claims.length})</h3>
            <div className="space-y-2">
              {claims.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{c.profiles?.name || "NGO"}</p>
                    <p className="text-xs text-muted-foreground">{c.profiles?.email}</p>
                  </div>
                  <Badge variant="outline" className="text-xs capitalize">{c.status}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default DonationDetails;

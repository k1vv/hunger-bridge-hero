import { useState } from "react";
import PageLayout from "@/components/PageLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MapPin, Clock, Package, Leaf } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const AvailableDonations = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [halalFilter, setHalalFilter] = useState("all");

  const { data: listings = [] } = useQuery({
    queryKey: ["available_listings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("food_listings")
        .select("*, profiles:user_id(name, business_name)")
        .eq("status", "available")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = listings.filter((l: any) => {
    const matchesSearch = l.title.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || l.category === categoryFilter;
    const matchesHalal = halalFilter === "all" || l.halal_status === halalFilter;
    return matchesSearch && matchesCategory && matchesHalal;
  });

  const claimMutation = useMutation({
    mutationFn: async (listingId: string) => {
      const { error } = await supabase.from("claims").insert({ food_listing_id: listingId, ngo_user_id: user!.id });
      if (error) throw error;
      await supabase.from("food_listings").update({ status: "reserved", reserved_by: user!.id, reserved_at: new Date().toISOString() }).eq("id", listingId);
    },
    onSuccess: () => {
      toast.success("Donation claimed!");
      queryClient.invalidateQueries({ queryKey: ["available_listings"] });
      queryClient.invalidateQueries({ queryKey: ["ngo_claims"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <PageLayout title="Available Donations" subtitle="Browse and claim food donations">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search donations..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9 text-sm" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40 h-9"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {["Vegetables", "Bakery", "Dairy", "Grains", "Canned", "Frozen", "Cooked", "Fruits", "Other"].map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={halalFilter} onValueChange={setHalalFilter}>
          <SelectTrigger className="w-36 h-9"><SelectValue placeholder="Halal" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="halal">Halal</SelectItem>
            <SelectItem value="non_halal">Non-Halal</SelectItem>
            <SelectItem value="unknown">Unknown</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((listing: any, i: number) => (
          <motion.div key={listing.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
            className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
            {listing.image_url && <img src={listing.image_url} alt={listing.title} className="w-full h-40 object-cover" />}
            <div className="p-4 space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">{listing.title}</h3>
                <p className="text-xs text-muted-foreground">{listing.profiles?.business_name || listing.profiles?.name || "Donor"}</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Package className="h-3 w-3" /> {listing.category} · {listing.quantity}</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Exp: {listing.expiry_date}</span>
                <span className="flex items-center gap-1"><Leaf className="h-3 w-3" /> {listing.halal_status}</span>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> {listing.pickup_location}</p>
              <Button size="sm" className="w-full" onClick={() => claimMutation.mutate(listing.id)} disabled={claimMutation.isPending}>
                Claim Donation
              </Button>
            </div>
          </motion.div>
        ))}
      </div>
      {filtered.length === 0 && <div className="text-center py-12 text-sm text-muted-foreground">No available donations found</div>}
    </PageLayout>
  );
};

export default AvailableDonations;

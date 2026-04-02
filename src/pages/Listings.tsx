import { useState, useRef } from "react";
import PageLayout from "@/components/PageLayout";
import ListingCard from "@/components/ListingCard";
import { mockListings, ListingStatus } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, ImagePlus, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import LocationPickerMap, { type PickedLocation } from "@/components/LocationPickerMap";

const statusFilters: { label: string; value: ListingStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Available", value: "available" },
  { label: "Reserved", value: "reserved" },
  { label: "Delivered", value: "delivered" },
  { label: "Expired", value: "expired" },
];

const Listings = () => {
  const [filter, setFilter] = useState<ListingStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [quantity, setQuantity] = useState("");
  const [expiry, setExpiry] = useState("");
  const [pickupLocation, setPickupLocation] = useState<PickedLocation>({ address: "", lat: null, lng: null });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch listings from DB
  const { data: dbListings = [] } = useQuery({
    queryKey: ["food_listings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("food_listings")
        .select("*, profiles(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Combine DB listings with mock data for display
  const allListings = [
    ...dbListings.map((l) => ({
      id: l.id,
      title: l.title,
      category: l.category,
      quantity: l.quantity,
      expiryDate: l.expiry_date,
      donorName: (l.profiles as any)?.name || "Unknown",
      donorId: l.user_id,
      location: l.pickup_location,
      status: l.status as ListingStatus,
      createdAt: l.created_at,
      reservedBy: l.reserved_by ?? undefined,
      reservedAt: l.reserved_at ?? undefined,
      pickupDeadline: l.pickup_deadline ?? undefined,
      spoilageRisk: (l.spoilage_risk as "low" | "medium" | "high") ?? undefined,
      imageUrl: l.image_url ?? undefined,
    })),
    ...mockListings,
  ];

  const filtered = allListings.filter((l) => {
    const matchesFilter = filter === "all" || l.status === filter;
    const matchesSearch =
      l.title.toLowerCase().includes(search.toLowerCase()) ||
      l.donorName.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const resetForm = () => {
    setTitle("");
    setCategory("");
    setQuantity("");
    setExpiry("");
    setPickupLocation({ address: "", lat: null, lng: null });
    removeImage();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("You must be logged in");
      return;
    }
    if (!category) {
      toast.error("Please select a category");
      return;
    }
    setCreating(true);

    try {
      let imageUrl: string | null = null;

      // Upload image if selected
      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("food-images")
          .upload(path, imageFile);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("food-images")
          .getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }

      const { error } = await supabase.from("food_listings").insert({
        user_id: user.id,
        title,
        category,
        quantity,
        expiry_date: expiry,
        pickup_location: location,
        image_url: imageUrl,
      });

      if (error) throw error;

      toast.success("Food listing created successfully!");
      queryClient.invalidateQueries({ queryKey: ["food_listings"] });
      resetForm();
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to create listing");
    } finally {
      setCreating(false);
    }
  };

  return (
    <PageLayout title="Food Listings" subtitle="Manage and track all food donations">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex items-center gap-2">
          {statusFilters.map((s) => (
            <button
              key={s.value}
              onClick={() => setFilter(s.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === s.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search listings..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 w-64 text-sm"
            />
          </div>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-9">
                <Plus className="h-4 w-4 mr-1" /> New Listing
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Food Listing</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" placeholder="e.g. Fresh Vegetables" value={title} onChange={(e) => setTitle(e.target.value)} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Vegetables">Vegetables</SelectItem>
                        <SelectItem value="Bakery">Bakery</SelectItem>
                        <SelectItem value="Dairy">Dairy</SelectItem>
                        <SelectItem value="Grains">Grains</SelectItem>
                        <SelectItem value="Canned">Canned</SelectItem>
                        <SelectItem value="Frozen">Frozen</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input id="quantity" placeholder="e.g. 50 kg" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="expiry">Expiry Date</Label>
                    <Input id="expiry" type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Pickup Location</Label>
                    <Input id="location" placeholder="e.g. Main St" value={location} onChange={(e) => setLocation(e.target.value)} required />
                  </div>
                </div>

                {/* Image Upload */}
                <div className="space-y-2">
                  <Label>Food Photo</Label>
                  {imagePreview ? (
                    <div className="relative rounded-lg overflow-hidden border border-border">
                      <img src={imagePreview} alt="Preview" className="w-full h-40 object-cover" />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute top-2 right-2 rounded-full bg-background/80 p-1 hover:bg-background transition-colors"
                      >
                        <X className="h-4 w-4 text-foreground" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-32 rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
                    >
                      <ImagePlus className="h-8 w-8" />
                      <span className="text-sm">Click to add a photo</span>
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={creating}>
                  {creating ? "Creating..." : "Create Listing"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((listing, i) => (
          <ListingCard key={listing.id} listing={listing} index={i} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-muted-foreground">No listings found</p>
        </div>
      )}
    </PageLayout>
  );
};

export default Listings;

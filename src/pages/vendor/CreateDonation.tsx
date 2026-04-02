import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import LocationPickerMap, { type PickedLocation } from "@/components/LocationPickerMap";
import { ImagePlus, X } from "lucide-react";

const CreateDonation = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [quantity, setQuantity] = useState("");
  const [expiry, setExpiry] = useState("");
  const [pickupLocation, setPickupLocation] = useState<PickedLocation>({ address: "", lat: null, lng: null });
  const [pickupTimeStart, setPickupTimeStart] = useState("");
  const [pickupTimeEnd, setPickupTimeEnd] = useState("");
  const [halalStatus, setHalalStatus] = useState("unknown");
  const [storageCondition, setStorageCondition] = useState("room_temperature");
  const [notesForReceiver, setNotesForReceiver] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be less than 5MB"); return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error("You must be logged in"); return; }
    if (!category) { toast.error("Please select a category"); return; }
    setCreating(true);

    try {
      let imageUrl: string | null = null;
      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("food-images").upload(path, imageFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("food-images").getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }

      const { error } = await supabase.from("food_listings").insert({
        user_id: user.id,
        title,
        category,
        quantity,
        expiry_date: expiry,
        pickup_location: pickupLocation.address,
        pickup_lat: pickupLocation.lat,
        pickup_lng: pickupLocation.lng,
        pickup_time_start: pickupTimeStart || null,
        pickup_time_end: pickupTimeEnd || null,
        halal_status: halalStatus,
        storage_condition: storageCondition,
        notes_for_receiver: notesForReceiver || null,
        image_url: imageUrl,
      });

      if (error) throw error;
      toast.success("Donation created successfully!");
      queryClient.invalidateQueries({ queryKey: ["vendor_listings"] });
      navigate("/vendor/donations");
    } catch (err: any) {
      toast.error(err.message || "Failed to create donation");
    } finally {
      setCreating(false);
    }
  };

  return (
    <PageLayout title="Create Donation" subtitle="Add surplus food for donation">
      <div className="max-w-2xl">
        <form onSubmit={handleCreate} className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Food Details</h3>
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" placeholder="e.g. Fresh Vegetables" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Vegetables">Vegetables</SelectItem>
                    <SelectItem value="Bakery">Bakery</SelectItem>
                    <SelectItem value="Dairy">Dairy</SelectItem>
                    <SelectItem value="Grains">Grains</SelectItem>
                    <SelectItem value="Canned">Canned</SelectItem>
                    <SelectItem value="Frozen">Frozen</SelectItem>
                    <SelectItem value="Cooked">Cooked Food</SelectItem>
                    <SelectItem value="Fruits">Fruits</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input id="quantity" placeholder="e.g. 50 kg" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiry">Expiry / Best Before Date</Label>
              <Input id="expiry" type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Halal Status</Label>
                <Select value={halalStatus} onValueChange={setHalalStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="halal">Halal</SelectItem>
                    <SelectItem value="non_halal">Non-Halal</SelectItem>
                    <SelectItem value="unknown">Unknown</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Storage Condition</Label>
                <Select value={storageCondition} onValueChange={setStorageCondition}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="room_temperature">Room Temperature</SelectItem>
                    <SelectItem value="refrigerated">Refrigerated</SelectItem>
                    <SelectItem value="frozen">Frozen</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Pickup Details</h3>
            <LocationPickerMap value={pickupLocation} onChange={setPickupLocation} />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Pickup Time Start</Label>
                <Input type="time" value={pickupTimeStart} onChange={(e) => setPickupTimeStart(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Pickup Time End</Label>
                <Input type="time" value={pickupTimeEnd} onChange={(e) => setPickupTimeEnd(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Additional Info</h3>
            <div className="space-y-2">
              <Label>Notes for Receiver</Label>
              <Textarea placeholder="Any special instructions or notes..." value={notesForReceiver} onChange={(e) => setNotesForReceiver(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Food Photo</Label>
              {imagePreview ? (
                <div className="relative rounded-lg overflow-hidden border border-border">
                  <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover" />
                  <button type="button" onClick={removeImage} className="absolute top-2 right-2 rounded-full bg-background/80 p-1 hover:bg-background transition-colors">
                    <X className="h-4 w-4 text-foreground" />
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full h-32 rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground">
                  <ImagePlus className="h-8 w-8" />
                  <span className="text-sm">Click to add a photo</span>
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={creating}>
            {creating ? "Creating..." : "Create Donation"}
          </Button>
        </form>
      </div>
    </PageLayout>
  );
};

export default CreateDonation;

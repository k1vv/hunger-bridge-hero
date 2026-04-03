import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import LocationPickerMap, { type PickedLocation } from "@/components/LocationPickerMap";
import { ImagePlus, X, Plus, Trash2, Package, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { logger } from "@/lib/logger";
import { notifyNgosOfNewDonation } from "@/lib/notifications";

interface FoodItem {
  id: string;
  foodName: string;
  category: string;
  quantity: string;
  unit: string;
  expiryDate: string;
  expiryTime: string;
  storageCondition: string;
  halalStatus: string;
  imageFile: File | null;
  imagePreview: string | null;
  notes: string;
}

const emptyItem = (): FoodItem => ({
  id: crypto.randomUUID(),
  foodName: "",
  category: "",
  quantity: "",
  unit: "packs",
  expiryDate: "",
  expiryTime: "",
  storageCondition: "room_temperature",
  halalStatus: "unknown",
  imageFile: null,
  imagePreview: null,
  notes: "",
});

const categories = ["Vegetables", "Fruits", "Bakery", "Dairy", "Grains", "Canned", "Frozen", "Cooked", "Beverage", "Ready-to-eat", "Other"];
const units = ["packs", "boxes", "kg", "litres", "bottles", "pieces", "trays", "bags"];

const CreateDonation = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch vendor profile for notifications
  const { data: vendorProfile } = useQuery({
    queryKey: ["vendor_profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("name, business_name").eq("id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  // Section A: Batch info
  const [pickupLocation, setPickupLocation] = useState<PickedLocation>({ address: "", lat: null, lng: null });
  const [pickupDate, setPickupDate] = useState(new Date().toISOString().split("T")[0]);
  const [pickupTimeStart, setPickupTimeStart] = useState("");
  const [pickupTimeEnd, setPickupTimeEnd] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [donationType, setDonationType] = useState("immediate");
  const [batchNotes, setBatchNotes] = useState("");

  // Section B: Food items
  const [items, setItems] = useState<FoodItem[]>([emptyItem()]);
  const [creating, setCreating] = useState(false);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const addItem = () => setItems([...items, emptyItem()]);

  const removeItem = (id: string) => {
    if (items.length <= 1) { toast.error("At least one food item is required"); return; }
    setItems(items.filter(i => i.id !== id));
  };

  const updateItem = (id: string, field: keyof FoodItem, value: any) => {
    setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const handleImageSelect = (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be less than 5MB"); return; }
    updateItem(itemId, "imageFile", file);
    updateItem(itemId, "imagePreview", URL.createObjectURL(file));
  };

  const removeImage = (itemId: string) => {
    updateItem(itemId, "imageFile", null);
    updateItem(itemId, "imagePreview", null);
    const ref = fileInputRefs.current[itemId];
    if (ref) ref.value = "";
  };

  const validate = (): boolean => {
    if (!pickupLocation.address) { toast.error("Please set a pickup location"); return false; }
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.foodName) { toast.error(`Item ${i + 1}: Food name is required`); return false; }
      if (!item.category) { toast.error(`Item ${i + 1}: Category is required`); return false; }
      if (!item.quantity || parseFloat(item.quantity) <= 0) { toast.error(`Item ${i + 1}: Quantity must be > 0`); return false; }
      if (!item.expiryDate) { toast.error(`Item ${i + 1}: Expiry date is required`); return false; }
    }
    return true;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      logger.vendor.warn("Create donation attempted without login", undefined, undefined);
      toast.error("You must be logged in");
      return;
    }
    if (!validate()) {
      logger.vendor.warn("Create donation validation failed", { itemCount: items.length }, user.id);
      return;
    }
    setCreating(true);
    logger.vendor.info("Starting donation creation", { itemCount: items.length, donationType, pickupLocation: pickupLocation.address }, user.id);

    try {
      // 1. Create batch
      logger.vendor.debug("Creating donation batch", { pickupLocation: pickupLocation.address, pickupDate, donationType }, user.id);
      const { data: batch, error: batchError } = await supabase.from("donation_batches").insert({
        vendor_id: user.id,
        pickup_location: pickupLocation.address,
        pickup_lat: pickupLocation.lat,
        pickup_lng: pickupLocation.lng,
        pickup_date: pickupDate,
        pickup_time_start: pickupTimeStart || null,
        pickup_time_end: pickupTimeEnd || null,
        contact_person: contactPerson || null,
        contact_phone: contactPhone || null,
        donation_type: donationType,
        notes: batchNotes || null,
      }).select("id").single();

      if (batchError) {
        logger.vendor.error("Failed to create donation batch", batchError.message, { code: batchError.code, details: batchError.details }, user.id);
        throw batchError;
      }
      logger.vendor.info("Successfully created donation batch", { batchId: batch.id }, user.id);

      // 2. Upload images & create items
      logger.vendor.debug("Processing food items", { itemCount: items.length }, user.id);
      const itemInserts = await Promise.all(items.map(async (item, index) => {
        let imageUrl: string | null = null;
        if (item.imageFile) {
          logger.vendor.debug("Uploading image for item", { itemIndex: index, foodName: item.foodName }, user.id);
          const ext = item.imageFile.name.split(".").pop();
          const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
          const { error: uploadError } = await supabase.storage.from("food-images").upload(path, item.imageFile);
          if (uploadError) {
            logger.vendor.error("Failed to upload image", uploadError.message, { itemIndex: index, foodName: item.foodName }, user.id);
            throw uploadError;
          }
          const { data: urlData } = supabase.storage.from("food-images").getPublicUrl(path);
          imageUrl = urlData.publicUrl;
          logger.vendor.debug("Image uploaded successfully", { itemIndex: index, imageUrl }, user.id);
        }

        // Auto-tag spoilage risk
        const daysToExpiry = Math.ceil((new Date(item.expiryDate).getTime() - Date.now()) / 86400000);
        let spoilageRisk = "low";
        if (daysToExpiry <= 0) spoilageRisk = "expired";
        else if (daysToExpiry <= 1) spoilageRisk = "high";
        else if (daysToExpiry <= 3) spoilageRisk = "medium";

        return {
          batch_id: batch.id,
          food_name: item.foodName,
          category: item.category,
          quantity: parseFloat(item.quantity),
          unit: item.unit,
          expiry_date: item.expiryDate,
          expiry_time: item.expiryTime || null,
          storage_condition: item.storageCondition,
          halal_status: item.halalStatus,
          image_url: imageUrl,
          notes: item.notes || null,
          spoilage_risk: spoilageRisk,
        };
      }));

      logger.vendor.debug("Inserting donation items", { itemCount: itemInserts.length }, user.id);
      const { error: itemsError } = await supabase.from("donation_items").insert(itemInserts);
      if (itemsError) {
        logger.vendor.error("Failed to insert donation items", itemsError.message, { code: itemsError.code, batchId: batch.id }, user.id);
        throw itemsError;
      }

      logger.vendor.info("Donation created successfully", { batchId: batch.id, itemCount: items.length }, user.id);

      // Notify NGOs whose preferences match the donation categories
      const vendorName = vendorProfile?.business_name || vendorProfile?.name || "A vendor";
      const itemCategories = [...new Set(items.map(item => item.category).filter(Boolean))];
      try {
        await notifyNgosOfNewDonation(vendorName, itemCategories, pickupLocation.address, batch.id);
        logger.vendor.info("Matching NGOs notified of new donation", { batchId: batch.id, categories: itemCategories }, user.id);
      } catch (notifyErr) {
        console.error("Failed to notify NGOs:", notifyErr);
      }

      toast.success(`Donation batch created with ${items.length} item(s)!`);
      queryClient.invalidateQueries({ queryKey: ["vendor_batches"] });
      navigate("/vendor/donations");
    } catch (err: any) {
      logger.vendor.error("Donation creation failed", err.message, { fullError: err }, user.id);
      toast.error(err.message || "Failed to create donation");
    } finally {
      setCreating(false);
    }
  };

  return (
    <PageLayout title="Create Donation" subtitle="Add a donation batch with multiple food items">
      <div className="max-w-3xl">
        <form onSubmit={handleCreate} className="space-y-6">
          {/* Section A: Donation Information */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">A</div>
              <h3 className="text-sm font-semibold text-foreground">Donation Information</h3>
            </div>
            <p className="text-xs text-muted-foreground">Shared info that applies to all food items in this batch.</p>

            <LocationPickerMap value={pickupLocation} onChange={setPickupLocation} />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Pickup Date</Label>
                <Input type="date" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Donation Type</Label>
                <RadioGroup value={donationType} onValueChange={setDonationType} className="flex gap-4 pt-2">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="immediate" id="immediate" />
                    <Label htmlFor="immediate" className="text-sm font-normal cursor-pointer">Immediate</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="scheduled" id="scheduled" />
                    <Label htmlFor="scheduled" className="text-sm font-normal cursor-pointer">Scheduled</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contact Person</Label>
                <Input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} placeholder="Name" />
              </div>
              <div className="space-y-2">
                <Label>Contact Phone</Label>
                <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+60..." />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Overall Notes</Label>
              <Textarea value={batchNotes} onChange={(e) => setBatchNotes(e.target.value)} placeholder="Any general notes about this donation..." />
            </div>
          </div>

          {/* Section B: Food Items */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">B</div>
                <h3 className="text-sm font-semibold text-foreground">Food Items ({items.length})</h3>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={addItem}>
                <Plus className="h-4 w-4 mr-1" /> Add Item
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Add each food item with its details. You can add multiple items to one donation batch.</p>

            <AnimatePresence>
              {items.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-lg border border-border p-4 space-y-3 relative"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold text-foreground">Item {index + 1}</span>
                    </div>
                    <Button type="button" size="sm" variant="ghost" className="text-destructive h-7 w-7 p-0" onClick={() => removeItem(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5 col-span-2">
                      <Label className="text-xs">Food Name *</Label>
                      <Input value={item.foodName} onChange={(e) => updateItem(item.id, "foodName", e.target.value)} placeholder="e.g. Chicken sandwich" className="h-9 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Category *</Label>
                      <Select value={item.category} onValueChange={(v) => updateItem(item.id, "category", v)}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Qty *</Label>
                        <Input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(item.id, "quantity", e.target.value)} placeholder="20" className="h-9 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Unit</Label>
                        <Select value={item.unit} onValueChange={(v) => updateItem(item.id, "unit", v)}>
                          <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {units.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Expiry Date *</Label>
                      <Input type="date" value={item.expiryDate} onChange={(e) => updateItem(item.id, "expiryDate", e.target.value)} className="h-9 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Expiry Time</Label>
                      <Input type="time" value={item.expiryTime} onChange={(e) => updateItem(item.id, "expiryTime", e.target.value)} className="h-9 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Storage</Label>
                      <Select value={item.storageCondition} onValueChange={(v) => updateItem(item.id, "storageCondition", v)}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="room_temperature">Room Temperature</SelectItem>
                          <SelectItem value="refrigerated">Refrigerated</SelectItem>
                          <SelectItem value="frozen">Frozen</SelectItem>
                          <SelectItem value="keep_warm">Keep Warm</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Halal</Label>
                      <Select value={item.halalStatus} onValueChange={(v) => updateItem(item.id, "halalStatus", v)}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="halal">Halal</SelectItem>
                          <SelectItem value="non_halal">Non-Halal</SelectItem>
                          <SelectItem value="unknown">Unknown</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Notes</Label>
                    <Input value={item.notes} onChange={(e) => updateItem(item.id, "notes", e.target.value)} placeholder="Optional notes for this item" className="h-9 text-sm" />
                  </div>

                  {/* Image */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Photo</Label>
                    {item.imagePreview ? (
                      <div className="relative rounded-lg overflow-hidden border border-border h-24 w-32">
                        <img src={item.imagePreview} alt="" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => removeImage(item.id)} className="absolute top-1 right-1 rounded-full bg-background/80 p-0.5">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => fileInputRefs.current[item.id]?.click()}
                        className="h-16 w-32 rounded-lg border border-dashed border-border hover:border-primary/50 transition-colors flex items-center justify-center gap-1.5 text-muted-foreground text-xs">
                        <ImagePlus className="h-4 w-4" /> Add photo
                      </button>
                    )}
                    <input ref={(el) => { fileInputRefs.current[item.id] = el; }} type="file" accept="image/*" onChange={(e) => handleImageSelect(item.id, e)} className="hidden" />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            <Button type="button" variant="outline" className="w-full border-dashed" onClick={addItem}>
              <Plus className="h-4 w-4 mr-2" /> Add Another Food Item
            </Button>
          </div>

          {/* Summary & Submit */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Ready to submit</p>
                <p className="text-xs text-muted-foreground">{items.length} food item(s) · {donationType} pickup · {pickupLocation.address || "No location set"}</p>
              </div>
              <Button type="submit" disabled={creating}>
                {creating ? "Creating..." : "Submit Donation"} <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </form>
      </div>
    </PageLayout>
  );
};

export default CreateDonation;

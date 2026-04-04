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
import { ImagePlus, X, Plus, Trash2, Package, ChevronRight, Sparkles, Loader2, CheckCircle2, XCircle, AlertTriangle, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { logger } from "@/lib/logger";
import { notifyNgosOfNewDonation } from "@/lib/notifications";
import RecommendedNGOs from "@/components/vendor/RecommendedNGOs";
import DonationTemplates, { type DonationTemplate, type TemplateItem } from "@/components/vendor/DonationTemplates";
import { analyzeFoodImage, fileToBase64 } from "@/lib/ai/foodRecognition";
import { verifyFoodBatch, type VerificationResult } from "@/lib/ai/foodVerification";
import {
  FOOD_CATEGORIES,
  FOOD_UNITS,
  STORAGE_CONDITIONS,
  STORAGE_CONDITION_LABELS,
  HALAL_STATUS,
  HALAL_STATUS_LABELS,
} from "@/lib/constants";

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
  estimatedValue: string;
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
  estimatedValue: "",
});

// Using centralized constants from @/lib/constants

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
  const [analyzingItems, setAnalyzingItems] = useState<Record<string, boolean>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Verification state
  const [verifying, setVerifying] = useState(false);
  const [verificationResults, setVerificationResults] = useState<VerificationResult[] | null>(null);
  const [verificationPassed, setVerificationPassed] = useState<boolean | null>(null);

  const addItem = () => {
    setItems([...items, emptyItem()]);
    resetVerification();
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) { toast.error("At least one food item is required"); return; }
    setItems(items.filter(i => i.id !== id));
    resetVerification();
  };

  const updateItem = (id: string, field: keyof FoodItem, value: any) => {
    setItems(prevItems => prevItems.map(i => i.id === id ? { ...i, [field]: value } : i));
    resetVerification(); // Reset verification when any item changes
  };

  const handleImageSelect = async (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be less than 5MB"); return; }

    // Set image preview immediately
    updateItem(itemId, "imageFile", file);
    updateItem(itemId, "imagePreview", URL.createObjectURL(file));

    // Analyze with AI if API key is available
    const apiKey = import.meta.env.VITE_GOOGLE_VISION_API_KEY;
    if (!apiKey) return;

    setAnalyzingItems(prev => ({ ...prev, [itemId]: true }));
    try {
      const base64 = await fileToBase64(file);
      const analysis = await analyzeFoodImage(base64);

      // Auto-fill fields if confident enough
      if (analysis.confidence > 0.5) {
        updateItem(itemId, "foodName", analysis.suggestedName);
        updateItem(itemId, "category", analysis.category);
        updateItem(itemId, "storageCondition", analysis.storageRecommendation);
        if (analysis.isHalal !== null) {
          updateItem(itemId, "halalStatus", analysis.isHalal ? "halal" : "non_halal");
        }

        toast.success(`AI detected: ${analysis.suggestedName}`, {
          description: `Category: ${analysis.category} (${Math.round(analysis.confidence * 100)}% confident)`,
        });
      } else if (analysis.suggestedName) {
        // Lower confidence - just notify, don't auto-fill
        toast.info(`AI suggestion: ${analysis.suggestedName}`, {
          description: "Low confidence - please verify and fill manually",
        });
      }
    } catch (error) {
      console.error("Food analysis failed:", error);
      // Silent fail - user can still fill form manually
    } finally {
      setAnalyzingItems(prev => ({ ...prev, [itemId]: false }));
    }
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
      if (!item.estimatedValue || parseFloat(item.estimatedValue) <= 0) { toast.error(`Item ${i + 1}: Estimated value is required`); return false; }
      if (!item.imageFile) { toast.error(`Item ${i + 1}: Photo is required for AI verification`); return false; }
    }
    return true;
  };

  // AI Verification step
  const handleVerify = async () => {
    if (!validate()) return;

    setVerifying(true);
    setVerificationResults(null);
    setVerificationPassed(null);

    try {
      // Convert items to verification format
      const itemsToVerify = await Promise.all(items.map(async (item) => {
        const base64 = item.imageFile ? await fileToBase64(item.imageFile) : "";
        return {
          foodName: item.foodName,
          category: item.category,
          quantity: parseFloat(item.quantity),
          unit: item.unit,
          expiryDate: item.expiryDate,
          storageCondition: item.storageCondition,
          halalStatus: item.halalStatus,
          imageBase64: base64,
        };
      }));

      const result = await verifyFoodBatch(itemsToVerify);
      setVerificationResults(result.results);
      setVerificationPassed(result.passed);

      if (result.passed) {
        toast.success("Verification passed!", { description: result.summary });
      } else {
        toast.error("Verification failed", { description: result.summary });
      }
    } catch (error) {
      console.error("Verification error:", error);
      toast.error("Verification failed", { description: "An error occurred during verification" });
      setVerificationPassed(false);
    } finally {
      setVerifying(false);
    }
  };

  // Reset verification when items change
  const resetVerification = () => {
    setVerificationResults(null);
    setVerificationPassed(null);
  };

  const handleSelectTemplate = (template: DonationTemplate) => {
    // Load location
    if (template.pickup_location) {
      setPickupLocation({
        address: template.pickup_location,
        lat: template.pickup_lat || null,
        lng: template.pickup_lng || null,
      });
    }

    // Load time window
    if (template.pickup_time_start) setPickupTimeStart(template.pickup_time_start);
    if (template.pickup_time_end) setPickupTimeEnd(template.pickup_time_end);

    // Load contact info
    if (template.contact_person) setContactPerson(template.contact_person);
    if (template.contact_phone) setContactPhone(template.contact_phone);

    // Load items
    if (template.items && template.items.length > 0) {
      const newItems: FoodItem[] = template.items.map((item: TemplateItem) => ({
        id: crypto.randomUUID(),
        foodName: item.foodName,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit || "packs",
        expiryDate: "", // Don't copy expiry date from template
        expiryTime: "",
        storageCondition: item.storageCondition || "room_temperature",
        halalStatus: item.halalStatus || "unknown",
        imageFile: null,
        imagePreview: null,
        notes: "",
        estimatedValue: "", // Don't copy estimated value from template
      }));
      setItems(newItems);
    }
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
    // Check if verification passed
    if (!verificationPassed) {
      toast.error("Please verify your donation first", { description: "Click 'Verify with AI' to check your food items" });
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
          estimated_value: parseFloat(item.estimatedValue),
        };
      }));

      logger.vendor.debug("Inserting donation items", { itemCount: itemInserts.length }, user.id);
      const { error: itemsError } = await supabase.from("donation_items").insert(itemInserts);
      if (itemsError) {
        logger.vendor.error("Failed to insert donation items", itemsError.message, { code: itemsError.code, batchId: batch.id }, user.id);
        throw itemsError;
      }

      logger.vendor.info("Donation created successfully", { batchId: batch.id, itemCount: items.length }, user.id);

      // Notify NGOs whose preferences match the donation - using full scoring algorithm
      const vendorName = vendorProfile?.business_name || vendorProfile?.name || "A vendor";
      const notificationItems = items.map(item => {
        const daysToExpiry = Math.ceil((new Date(item.expiryDate).getTime() - Date.now()) / 86400000);
        let spoilageRisk = "low";
        if (daysToExpiry <= 0) spoilageRisk = "expired";
        else if (daysToExpiry <= 1) spoilageRisk = "high";
        else if (daysToExpiry <= 3) spoilageRisk = "medium";

        return {
          category: item.category,
          storage_condition: item.storageCondition,
          quantity: parseFloat(item.quantity) || 0,
          spoilage_risk: spoilageRisk,
        };
      });

      try {
        await notifyNgosOfNewDonation(
          vendorName,
          notificationItems,
          pickupLocation.address,
          batch.id,
          {
            pickup_lat: pickupLocation.lat,
            pickup_lng: pickupLocation.lng,
            pickup_date: pickupDate,
          }
        );
        logger.vendor.info("Matching NGOs notified of new donation", { batchId: batch.id, notifiedBasedOnScoring: true }, user.id);
      } catch (notifyErr) {
        logger.vendor.warn("Failed to notify NGOs", { error: (notifyErr as Error).message }, user.id);
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
        {/* Donation Templates */}
        <DonationTemplates
          onSelectTemplate={handleSelectTemplate}
          currentItems={items.filter(i => i.foodName).map(i => ({
            foodName: i.foodName,
            category: i.category,
            quantity: i.quantity,
            unit: i.unit,
            storageCondition: i.storageCondition,
            halalStatus: i.halalStatus,
          }))}
          currentLocation={pickupLocation}
          currentPickupTimeStart={pickupTimeStart}
          currentPickupTimeEnd={pickupTimeEnd}
          currentContactPerson={contactPerson}
          currentContactPhone={contactPhone}
        />

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
                          {FOOD_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
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
                            {FOOD_UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
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
                          {STORAGE_CONDITIONS.map(s => (
                            <SelectItem key={s} value={s}>{STORAGE_CONDITION_LABELS[s]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Halal</Label>
                      <Select value={item.halalStatus} onValueChange={(v) => updateItem(item.id, "halalStatus", v)}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {HALAL_STATUS.map(h => (
                            <SelectItem key={h} value={h}>{HALAL_STATUS_LABELS[h]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Estimated Value (RM) *</Label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">RM</span>
                        <Input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={item.estimatedValue}
                          onChange={(e) => updateItem(item.id, "estimatedValue", e.target.value)}
                          placeholder="0.00"
                          className="h-9 text-sm pl-9"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Notes</Label>
                      <Input value={item.notes} onChange={(e) => updateItem(item.id, "notes", e.target.value)} placeholder="Optional notes" className="h-9 text-sm" />
                    </div>
                  </div>

                  {/* Image */}
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1.5">
                      Photo *
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">
                        <Sparkles className="h-2.5 w-2.5" /> AI Verified
                      </span>
                    </Label>
                    {item.imagePreview ? (
                      <div className="relative rounded-lg overflow-hidden border border-border h-24 w-32">
                        <img src={item.imagePreview} alt="" className="w-full h-full object-cover" />
                        {analyzingItems[item.id] && (
                          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                            <div className="flex flex-col items-center gap-1">
                              <Loader2 className="h-5 w-5 animate-spin text-primary" />
                              <span className="text-[10px] text-primary font-medium">Analyzing...</span>
                            </div>
                          </div>
                        )}
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

          {/* Recommended NGOs */}
          <RecommendedNGOs
            items={items.map(item => ({
              category: item.category,
              storage_condition: item.storageCondition,
              quantity: parseFloat(item.quantity) || 0,
              unit: item.unit,
              halal_status: item.halalStatus,
            }))}
            vendorLat={pickupLocation.lat ?? undefined}
            vendorLng={pickupLocation.lng ?? undefined}
          />

          {/* AI Verification Section */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                <ShieldCheck className="h-4 w-4 text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">AI Verification</h3>
              {verificationPassed === true && (
                <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                  <CheckCircle2 className="h-3 w-3" /> Passed
                </span>
              )}
              {verificationPassed === false && (
                <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium">
                  <XCircle className="h-3 w-3" /> Failed
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Our AI will verify that your food items are valid, fresh, and properly documented before listing them for NGOs.
            </p>

            {/* Verification Results */}
            {verificationResults && (
              <div className="space-y-3">
                {verificationResults.map((result, index) => (
                  <div
                    key={items[index]?.id || index}
                    className={`rounded-lg border p-3 ${
                      result.passed
                        ? "border-green-200 bg-green-50"
                        : "border-red-200 bg-red-50"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {result.passed ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className="text-sm font-medium">
                        Item {index + 1}: {items[index]?.foodName || "Unknown"}
                      </span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        Score: {result.score}/100
                      </span>
                    </div>

                    {result.detectedFood && (
                      <p className="text-xs text-muted-foreground mb-2">
                        AI detected: {result.detectedFood}
                      </p>
                    )}

                    {result.issues.length > 0 && (
                      <div className="space-y-1">
                        {result.issues.map((issue, i) => (
                          <div
                            key={i}
                            className={`flex items-start gap-2 text-xs ${
                              issue.severity === "error" ? "text-red-700" : "text-amber-700"
                            }`}
                          >
                            {issue.severity === "error" ? (
                              <XCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            ) : (
                              <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            )}
                            <span>{issue.message}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Verify Button */}
            <Button
              type="button"
              variant={verificationPassed ? "outline" : "default"}
              onClick={handleVerify}
              disabled={verifying}
              className="w-full"
            >
              {verifying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verifying with AI...
                </>
              ) : verificationPassed ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Re-verify Items
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Verify with AI
                </>
              )}
            </Button>
          </div>

          {/* Summary & Submit */}
          <div className={`rounded-xl border p-4 ${
            verificationPassed
              ? "border-green-200 bg-green-50"
              : "border-primary/20 bg-primary/5"
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {verificationPassed ? "Ready to submit" : "Verification required"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {items.length} food item(s) · {donationType} pickup · {pickupLocation.address || "No location set"}
                </p>
              </div>
              <Button type="submit" disabled={creating || !verificationPassed}>
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

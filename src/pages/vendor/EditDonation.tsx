import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PageLayout from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import LocationPickerMap, { type PickedLocation } from "@/components/LocationPickerMap";
import {
  FOOD_CATEGORIES,
  FOOD_UNITS,
  STORAGE_CONDITIONS,
  STORAGE_CONDITION_LABELS,
  HALAL_STATUS,
  HALAL_STATUS_LABELS,
} from "@/lib/constants";
import { Plus, Trash2 } from "lucide-react";

interface ItemForm {
  id?: string;
  food_name: string;
  category: string;
  quantity: number;
  unit: string;
  halal_status: string;
  storage_condition: string;
  expiry_date: string;
  expiry_time: string;
  spoilage_risk: string;
  notes: string;
  estimated_value: string;
}

const emptyItem = (): ItemForm => ({
  food_name: "", category: FOOD_CATEGORIES[0], quantity: 1, unit: "packs",
  halal_status: "unknown", storage_condition: "room_temperature",
  expiry_date: "", expiry_time: "", spoilage_risk: "low", notes: "",
  estimated_value: "",
});

const EditDonation = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: batch, isLoading } = useQuery({
    queryKey: ["donation_batch", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("donation_batches")
        .select("*, donation_items(*)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Batch fields
  const [pickupLocation, setPickupLocation] = useState<PickedLocation>({ address: "", lat: null, lng: null });
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTimeStart, setPickupTimeStart] = useState("");
  const [pickupTimeEnd, setPickupTimeEnd] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [notes, setNotes] = useState("");

  // Items
  const [items, setItems] = useState<ItemForm[]>([]);
  const [deletedItemIds, setDeletedItemIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (batch) {
      setPickupLocation({
        address: batch.pickup_location,
        lat: batch.pickup_lat,
        lng: batch.pickup_lng,
      });
      setPickupDate(batch.pickup_date);
      setPickupTimeStart(batch.pickup_time_start || "");
      setPickupTimeEnd(batch.pickup_time_end || "");
      setContactPerson(batch.contact_person || "");
      setContactPhone(batch.contact_phone || "");
      setNotes(batch.notes || "");

      const existingItems = ((batch as any).donation_items || []).map((item: any) => ({
        id: item.id,
        food_name: item.food_name,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        halal_status: item.halal_status,
        storage_condition: item.storage_condition,
        expiry_date: item.expiry_date || "",
        expiry_time: item.expiry_time || "",
        spoilage_risk: item.spoilage_risk || "low",
        notes: item.notes || "",
        estimated_value: item.estimated_value?.toString() || "",
      }));
      setItems(existingItems.length > 0 ? existingItems : [emptyItem()]);
    }
  }, [batch]);

  const updateItem = (index: number, field: keyof ItemForm, value: any) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const addItem = () => setItems(prev => [...prev, emptyItem()]);

  const removeItem = (index: number) => {
    const item = items[index];
    if (item.id) setDeletedItemIds(prev => [...prev, item.id!]);
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) { toast.error("Add at least one food item"); return; }
    if (items.some(i => !i.food_name || !i.category)) { toast.error("Please fill in all item details"); return; }
    if (items.some(i => !i.estimated_value || parseFloat(i.estimated_value) <= 0)) { toast.error("Please enter an estimated value for all items"); return; }

    setSaving(true);
    try {
      // Update batch
      const { error: batchError } = await supabase.from("donation_batches").update({
        pickup_location: pickupLocation.address,
        pickup_lat: pickupLocation.lat,
        pickup_lng: pickupLocation.lng,
        pickup_date: pickupDate,
        pickup_time_start: pickupTimeStart || null,
        pickup_time_end: pickupTimeEnd || null,
        contact_person: contactPerson || null,
        contact_phone: contactPhone || null,
        notes: notes || null,
      }).eq("id", id!);
      if (batchError) throw batchError;

      // Delete removed items
      if (deletedItemIds.length > 0) {
        const { error: delErr } = await supabase.from("donation_items").delete().in("id", deletedItemIds);
        if (delErr) throw delErr;
      }

      // Upsert items
      for (const item of items) {
        if (item.id) {
          // Update existing
          const { error } = await supabase.from("donation_items").update({
            food_name: item.food_name,
            category: item.category,
            quantity: item.quantity,
            unit: item.unit,
            halal_status: item.halal_status,
            storage_condition: item.storage_condition,
            expiry_date: item.expiry_date || null,
            expiry_time: item.expiry_time || null,
            spoilage_risk: item.spoilage_risk,
            notes: item.notes || null,
            estimated_value: item.estimated_value ? parseFloat(item.estimated_value) : null,
          }).eq("id", item.id);
          if (error) throw error;
        } else {
          // Insert new
          const { error } = await supabase.from("donation_items").insert({
            batch_id: id!,
            food_name: item.food_name,
            category: item.category,
            quantity: item.quantity,
            unit: item.unit,
            halal_status: item.halal_status,
            storage_condition: item.storage_condition,
            expiry_date: item.expiry_date || null,
            expiry_time: item.expiry_time || null,
            spoilage_risk: item.spoilage_risk,
            notes: item.notes || null,
            estimated_value: item.estimated_value ? parseFloat(item.estimated_value) : null,
          });
          if (error) throw error;
        }
      }

      toast.success("Donation batch updated!");
      queryClient.invalidateQueries({ queryKey: ["donation_batch", id] });
      queryClient.invalidateQueries({ queryKey: ["vendor_batches"] });
      navigate(`/vendor/donations/${id}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <PageLayout title="Loading..."><div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div></PageLayout>;
  if (!batch) return <PageLayout title="Not Found"><p className="text-muted-foreground">Donation batch not found.</p></PageLayout>;
  if (batch.status !== "available" || batch.vendor_id !== user?.id) return <PageLayout title="Cannot Edit"><p className="text-muted-foreground">This batch cannot be edited.</p></PageLayout>;

  return (
    <PageLayout title="Edit Donation Batch" subtitle={`Editing batch ${batch.batch_number}`}>
      <div className="max-w-3xl">
        <form onSubmit={handleSave} className="space-y-6">
          {/* Pickup Information */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Pickup Information</h3>
            <LocationPickerMap value={pickupLocation} onChange={setPickupLocation} />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Pickup Date</Label>
                <Input type="date" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Contact Person</Label>
                <Input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Pickup Start Time</Label>
                <Input type="time" value={pickupTimeStart} onChange={(e) => setPickupTimeStart(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Pickup End Time</Label>
                <Input type="time" value={pickupTimeEnd} onChange={(e) => setPickupTimeEnd(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Contact Phone</Label>
              <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any additional information..." />
            </div>
          </div>

          {/* Food Items */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Food Items ({items.length})</h3>
              <Button type="button" size="sm" variant="outline" onClick={addItem}>
                <Plus className="h-4 w-4 mr-1" /> Add Item
              </Button>
            </div>

            {items.map((item, index) => (
              <div key={index} className="rounded-lg border border-border p-4 space-y-3 relative">
                {items.length > 1 && (
                  <Button type="button" size="icon" variant="ghost" className="absolute top-2 right-2 h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => removeItem(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Food Name *</Label>
                    <Input value={item.food_name} onChange={(e) => updateItem(index, "food_name", e.target.value)} required />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Category *</Label>
                    <Select value={item.category} onValueChange={(v) => updateItem(index, "category", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FOOD_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Quantity *</Label>
                    <Input type="number" min={1} value={item.quantity} onChange={(e) => updateItem(index, "quantity", Number(e.target.value))} required />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Unit</Label>
                    <Select value={item.unit} onValueChange={(v) => updateItem(index, "unit", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FOOD_UNITS.map(u => (
                          <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Halal Status</Label>
                    <Select value={item.halal_status} onValueChange={(v) => updateItem(index, "halal_status", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {HALAL_STATUS.map(s => <SelectItem key={s} value={s}>{HALAL_STATUS_LABELS[s]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Storage</Label>
                    <Select value={item.storage_condition} onValueChange={(v) => updateItem(index, "storage_condition", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STORAGE_CONDITIONS.map(s => <SelectItem key={s} value={s}>{STORAGE_CONDITION_LABELS[s]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Expiry Date</Label>
                    <Input type="date" value={item.expiry_date} onChange={(e) => updateItem(index, "expiry_date", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Spoilage Risk</Label>
                    <Select value={item.spoilage_risk} onValueChange={(v) => updateItem(index, "spoilage_risk", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Estimated Value (RM) *</Label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">RM</span>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={item.estimated_value}
                        onChange={(e) => updateItem(index, "estimated_value", e.target.value)}
                        placeholder="0.00"
                        className="pl-9"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Notes</Label>
                    <Input value={item.notes} onChange={(e) => updateItem(index, "notes", e.target.value)} placeholder="Optional notes..." />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
          </div>
        </form>
      </div>
    </PageLayout>
  );
};

export default EditDonation;

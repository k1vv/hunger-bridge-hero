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
  STORAGE_CONDITIONS,
  STORAGE_CONDITION_LABELS,
  HALAL_STATUS,
  HALAL_STATUS_LABELS,
} from "@/lib/constants";

const EditDonation = () => {
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
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (listing) {
      setTitle(listing.title);
      setCategory(listing.category);
      setQuantity(listing.quantity);
      setExpiry(listing.expiry_date);
      setPickupLocation({ address: listing.pickup_location, lat: listing.pickup_lat, lng: listing.pickup_lng });
      setPickupTimeStart(listing.pickup_time_start || "");
      setPickupTimeEnd(listing.pickup_time_end || "");
      setHalalStatus(listing.halal_status || "unknown");
      setStorageCondition(listing.storage_condition || "room_temperature");
      setNotesForReceiver(listing.notes_for_receiver || "");
    }
  }, [listing]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase.from("food_listings").update({
        title, category, quantity, expiry_date: expiry,
        pickup_location: pickupLocation.address, pickup_lat: pickupLocation.lat, pickup_lng: pickupLocation.lng,
        pickup_time_start: pickupTimeStart || null, pickup_time_end: pickupTimeEnd || null,
        halal_status: halalStatus, storage_condition: storageCondition, notes_for_receiver: notesForReceiver || null,
      }).eq("id", id!);
      if (error) throw error;
      toast.success("Donation updated!");
      queryClient.invalidateQueries({ queryKey: ["food_listing", id] });
      queryClient.invalidateQueries({ queryKey: ["vendor_listings"] });
      navigate(`/vendor/donations/${id}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <PageLayout title="Loading..."><div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div></PageLayout>;
  if (!listing || listing.status !== "available") return <PageLayout title="Cannot Edit"><p className="text-muted-foreground">This donation cannot be edited.</p></PageLayout>;

  return (
    <PageLayout title="Edit Donation" subtitle={`Editing: ${listing.title}`}>
      <div className="max-w-2xl">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FOOD_CATEGORIES.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Expiry Date</Label>
              <Input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Halal Status</Label>
                <Select value={halalStatus} onValueChange={setHalalStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {HALAL_STATUS.map(status => (
                      <SelectItem key={status} value={status}>{HALAL_STATUS_LABELS[status]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Storage Condition</Label>
                <Select value={storageCondition} onValueChange={setStorageCondition}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STORAGE_CONDITIONS.map(condition => (
                      <SelectItem key={condition} value={condition}>{STORAGE_CONDITION_LABELS[condition]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
            <LocationPickerMap value={pickupLocation} onChange={setPickupLocation} />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Pickup Start</Label>
                <Input type="time" value={pickupTimeStart} onChange={(e) => setPickupTimeStart(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Pickup End</Label>
                <Input type="time" value={pickupTimeEnd} onChange={(e) => setPickupTimeEnd(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
            <div className="space-y-2">
              <Label>Notes for Receiver</Label>
              <Textarea value={notesForReceiver} onChange={(e) => setNotesForReceiver(e.target.value)} />
            </div>
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

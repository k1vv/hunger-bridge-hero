import { useState, useEffect } from "react";
import PageLayout from "@/components/PageLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Building2, User, Phone, Mail, MapPin, Clock, Store } from "lucide-react";
import AddressPickerMap, { type StructuredAddress } from "@/components/AddressPickerMap";

const BUSINESS_TYPES = [
  "Restaurant",
  "Cafe",
  "Bakery",
  "Hotel",
  "Supermarket",
  "Grocery Store",
  "Catering Service",
  "Event Organizer",
  "Food Manufacturer",
  "Other",
] as const;

const VendorProfile = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Basic Info
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");

  // Business Details
  const [businessType, setBusinessType] = useState("");
  const [operationHours, setOperationHours] = useState("");
  const [hasMultipleOutlets, setHasMultipleOutlets] = useState(false);
  const [branchName, setBranchName] = useState("");

  // Address
  const [address, setAddress] = useState<StructuredAddress>({
    street1: "",
    street2: "",
    city: "",
    postcode: "",
    state: "",
    fullAddress: "",
    lat: null,
    lng: null,
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setBusinessName(profile.business_name || "");
      setPhone(profile.phone || "");
      setBusinessType(profile.business_type || "");
      setOperationHours(profile.operation_hours || "");
      setHasMultipleOutlets(profile.has_multiple_outlets || false);
      setBranchName(profile.branch_name || "");

      // Set address from profile
      setAddress({
        street1: "",
        street2: "",
        city: "",
        postcode: "",
        state: "",
        fullAddress: profile.address || "",
        lat: profile.address_lat || null,
        lng: profile.address_lng || null,
      });
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({
        name,
        business_name: businessName,
        phone,
        business_type: businessType,
        operation_hours: operationHours,
        has_multiple_outlets: hasMultipleOutlets,
        branch_name: branchName,
        address: address.fullAddress,
        address_lat: address.lat,
        address_lng: address.lng,
      }).eq("id", user!.id);

      if (error) throw error;
      toast.success("Profile updated!");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageLayout title="Vendor Profile" subtitle="Manage your business information">
      <form onSubmit={handleSave} className="max-w-4xl space-y-6">
        {/* Basic Information */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Basic Information</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name *</Label>
              <Input
                id="businessName"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Your business name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Contact Person Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Person to contact"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  value={user?.email || ""}
                  disabled
                  className="bg-muted pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+60123456789"
                  className="pl-10"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Business Details */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Business Details</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="businessType">Business Type *</Label>
              <Select value={businessType} onValueChange={setBusinessType} required>
                <SelectTrigger id="businessType">
                  <SelectValue placeholder="Select business type" />
                </SelectTrigger>
                <SelectContent>
                  {BUSINESS_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="operationHours">Operating Hours</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="operationHours"
                  value={operationHours}
                  onChange={(e) => setOperationHours(e.target.value)}
                  placeholder="e.g. Mon-Fri 9am-6pm"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="sm:col-span-2 flex items-center justify-between rounded-lg border border-border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="multipleOutlets" className="text-sm font-medium">
                  Multiple Outlets
                </Label>
                <p className="text-xs text-muted-foreground">
                  Do you have multiple locations/branches?
                </p>
              </div>
              <Switch
                id="multipleOutlets"
                checked={hasMultipleOutlets}
                onCheckedChange={setHasMultipleOutlets}
              />
            </div>

            {hasMultipleOutlets && (
              <div className="sm:col-span-2 space-y-2">
                <Label htmlFor="branchName">Branch Name</Label>
                <div className="relative">
                  <Store className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="branchName"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    placeholder="e.g. Main Branch, Outlet 1, Downtown Location"
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Identify this specific branch/outlet location
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Business Address */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Business Address</h2>
          </div>

          <AddressPickerMap value={address} onChange={setAddress} mapHeight={300} />
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button type="submit" disabled={saving} size="lg">
            {saving ? "Saving..." : "Save Profile"}
          </Button>
        </div>
      </form>
    </PageLayout>
  );
};

export default VendorProfile;

import { useState, useEffect } from "react";
import PageLayout from "@/components/PageLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  Clock,
  Store,
  Save,
  FileCheck,
  BarChart3,
  AlertCircle,
  CheckCircle,
  Package,
  TrendingUp,
} from "lucide-react";
import AddressPickerMap, { type StructuredAddress } from "@/components/AddressPickerMap";
import { logger } from "@/lib/logger";

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

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch system-generated stats
  const { data: stats } = useQuery({
    queryKey: ["vendor_stats", user?.id],
    queryFn: async () => {
      // Total donations created
      const { data: batches } = await supabase
        .from("donation_batches")
        .select("id, status")
        .eq("vendor_id", user!.id);

      // Total items donated
      const { data: items } = await supabase
        .from("donation_items")
        .select("id, status, quantity")
        .in("batch_id", batches?.map(b => b.id) || []);

      const totalBatches = batches?.length || 0;
      const completedBatches = batches?.filter(b => b.status === "completed").length || 0;
      const totalItems = items?.length || 0;
      const completedItems = items?.filter(i => i.status === "completed").length || 0;

      return {
        totalBatches,
        completedBatches,
        totalItems,
        completedItems,
        completionRate: totalBatches > 0 ? Math.round((completedBatches / totalBatches) * 100) : 0,
      };
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
  const [activeSection, setActiveSection] = useState("basic");

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
    logger.vendor.info("Saving profile", { section: activeSection }, user?.id);

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
      toast.success("Profile updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    } catch (err: any) {
      logger.vendor.error("Failed to save profile", err.message, {}, user?.id);
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const sections = [
    { id: "basic", label: "Basic Info", icon: User },
    { id: "business", label: "Business Details", icon: Building2 },
    { id: "address", label: "Location", icon: MapPin },
    { id: "verification", label: "Verification", icon: FileCheck },
    { id: "stats", label: "Statistics", icon: BarChart3 },
  ];

  if (isLoading) {
    return (
      <PageLayout title="Vendor Profile" subtitle="Loading...">
        <div className="text-center py-12 text-muted-foreground">Loading profile...</div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Business Profile" subtitle="Manage your vendor information for food donations">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:w-64 flex-shrink-0">
          <div className="rounded-xl border border-border bg-card p-4 shadow-card sticky top-4">
            <nav className="space-y-1">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      activeSection === section.id
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {section.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <form onSubmit={handleSave}>
            {/* Basic Information */}
            {activeSection === "basic" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-border bg-card p-6 shadow-card space-y-6"
              >
                <div className="flex items-center gap-2 mb-4">
                  <User className="h-5 w-5 text-accent" />
                  <h2 className="text-lg font-semibold">Basic Information</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" /> Business Name *
                    </Label>
                    <Input
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="Your business name"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <User className="h-4 w-4" /> Contact Person *
                    </Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Person to contact"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Mail className="h-4 w-4" /> Email
                    </Label>
                    <Input value={user?.email || ""} disabled className="bg-muted" />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Phone className="h-4 w-4" /> Phone Number *
                    </Label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+60 12-345 6789"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" disabled={saving} className="w-full sm:w-auto">
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </motion.div>
            )}

            {/* Business Details */}
            {activeSection === "business" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-border bg-card p-6 shadow-card space-y-6"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className="h-5 w-5 text-accent" />
                  <h2 className="text-lg font-semibold">Business Details</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Business Type *</Label>
                    <Select value={businessType} onValueChange={setBusinessType} required>
                      <SelectTrigger>
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
                    <Label className="flex items-center gap-2">
                      <Clock className="h-4 w-4" /> Operating Hours
                    </Label>
                    <Input
                      value={operationHours}
                      onChange={(e) => setOperationHours(e.target.value)}
                      placeholder="e.g. Mon-Fri 9am-6pm"
                    />
                  </div>

                  {/* Multiple Outlets Section */}
                  <div className="md:col-span-2 flex items-center justify-between rounded-lg border border-border p-4">
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
                    <div className="md:col-span-2 space-y-2">
                      <Label className="flex items-center gap-2">
                        <Store className="h-4 w-4" /> Branch Name
                      </Label>
                      <Input
                        value={branchName}
                        onChange={(e) => setBranchName(e.target.value)}
                        placeholder="e.g. Main Branch, Outlet 1, Downtown Location"
                      />
                      <p className="text-xs text-muted-foreground">
                        Identify this specific branch/outlet location
                      </p>
                    </div>
                  )}
                </div>

                <Button type="submit" disabled={saving} className="w-full sm:w-auto">
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </motion.div>
            )}

            {/* Address Section */}
            {activeSection === "address" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-border bg-card p-6 shadow-card space-y-6"
              >
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="h-5 w-5 text-accent" />
                  <h2 className="text-lg font-semibold">Business Location</h2>
                </div>

                <p className="text-sm text-muted-foreground">
                  Your business location helps NGOs find and collect donations from your establishment.
                </p>

                <AddressPickerMap value={address} onChange={setAddress} mapHeight={300} />

                <Button type="submit" disabled={saving} className="w-full sm:w-auto">
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </motion.div>
            )}

            {/* Verification */}
            {activeSection === "verification" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-border bg-card p-6 shadow-card space-y-6"
              >
                <div className="flex items-center gap-2 mb-4">
                  <FileCheck className="h-5 w-5 text-accent" />
                  <h2 className="text-lg font-semibold">Verification Status</h2>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-lg border border-border bg-muted/30">
                  {profile?.verification_status === "verified" ? (
                    <>
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
                        <CheckCircle className="h-6 w-6 text-success" />
                      </div>
                      <div>
                        <p className="font-semibold text-success">Verified Vendor</p>
                        <p className="text-sm text-muted-foreground">Your business has been verified by our team.</p>
                      </div>
                      <Badge className="ml-auto bg-success text-success-foreground">Verified</Badge>
                    </>
                  ) : profile?.verification_status === "pending" ? (
                    <>
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning/10">
                        <Clock className="h-6 w-6 text-warning" />
                      </div>
                      <div>
                        <p className="font-semibold text-warning">Verification Pending</p>
                        <p className="text-sm text-muted-foreground">Your verification is being reviewed by our team.</p>
                      </div>
                      <Badge variant="outline" className="ml-auto border-warning text-warning">Pending</Badge>
                    </>
                  ) : (
                    <>
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                        <AlertCircle className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-semibold">Not Verified</p>
                        <p className="text-sm text-muted-foreground">Complete your profile to get verified.</p>
                      </div>
                      <Badge variant="outline" className="ml-auto">Unverified</Badge>
                    </>
                  )}
                </div>

                <div className="p-4 rounded-lg border border-dashed border-border bg-muted/20">
                  <p className="text-sm text-muted-foreground text-center">
                    Document upload feature coming soon. For now, please contact admin to submit verification documents.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Statistics */}
            {activeSection === "stats" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-border bg-card p-6 shadow-card space-y-6"
              >
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="h-5 w-5 text-accent" />
                  <h2 className="text-lg font-semibold">Donation Statistics</h2>
                </div>

                <p className="text-sm text-muted-foreground">
                  These statistics are automatically generated based on your donation activity on the platform.
                </p>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
                    <Package className="h-6 w-6 text-accent mx-auto mb-2" />
                    <p className="text-2xl font-bold text-foreground">{stats?.totalBatches || 0}</p>
                    <p className="text-xs text-muted-foreground">Total Batches</p>
                  </div>

                  <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
                    <CheckCircle className="h-6 w-6 text-success mx-auto mb-2" />
                    <p className="text-2xl font-bold text-foreground">{stats?.completedBatches || 0}</p>
                    <p className="text-xs text-muted-foreground">Completed</p>
                  </div>

                  <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
                    <TrendingUp className="h-6 w-6 text-accent mx-auto mb-2" />
                    <p className="text-2xl font-bold text-foreground">{stats?.totalItems || 0}</p>
                    <p className="text-xs text-muted-foreground">Items Donated</p>
                  </div>

                  <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
                    <Package className="h-6 w-6 text-success mx-auto mb-2" />
                    <p className="text-2xl font-bold text-foreground">{stats?.completedItems || 0}</p>
                    <p className="text-xs text-muted-foreground">Items Picked Up</p>
                  </div>

                  <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
                    <BarChart3 className="h-6 w-6 text-accent mx-auto mb-2" />
                    <p className="text-2xl font-bold text-foreground">{stats?.completionRate || 0}%</p>
                    <p className="text-xs text-muted-foreground">Completion Rate</p>
                  </div>
                </div>

                <div className="p-4 rounded-lg border border-accent/20 bg-accent/5">
                  <p className="text-sm text-muted-foreground">
                    <strong>Tip:</strong> Provide accurate pickup times and detailed food descriptions to improve your completion rate. NGOs appreciate clear information!
                  </p>
                </div>
              </motion.div>
            )}
          </form>
        </div>
      </div>
    </PageLayout>
  );
};

export default VendorProfile;

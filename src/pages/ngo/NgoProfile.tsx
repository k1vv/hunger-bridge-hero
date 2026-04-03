import { useState, useEffect } from "react";
import PageLayout from "@/components/PageLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  Clock,
  Package,
  Thermometer,
  Truck,
  Users,
  Heart,
  FileCheck,
  BarChart3,
  AlertCircle,
  Save,
  Snowflake,
  UtensilsCrossed,
  Check,
  CheckCircle,
} from "lucide-react";
import { logger } from "@/lib/logger";

// Constants
const ORGANIZATION_TYPES = [
  "Foodbank",
  "NGO",
  "Shelter",
  "Mosque",
  "Temple",
  "Church",
  "Community Center",
  "School",
  "Hospital",
  "Other",
];

const FOOD_TYPES = [
  "Cooked Meals",
  "Bakery",
  "Vegetables",
  "Fruits",
  "Dairy",
  "Grains",
  "Canned Food",
  "Frozen Food",
  "Beverages",
  "Ready-to-eat",
  "Packaged Food",
];

const BENEFICIARY_TYPES = [
  "Homeless",
  "Low-income Families",
  "Students",
  "Refugees",
  "Elderly",
  "Orphans",
  "Disabled",
  "Single Parents",
  "Unemployed",
  "General Public",
];

const DISTRIBUTION_FREQUENCIES = ["Daily", "Weekly", "Bi-weekly", "Monthly", "As needed"];

interface ExtendedProfileData {
  // Organization Details
  organization_type: string;
  registration_number: string;

  // Capacity & Storage
  storage_room_temp: boolean;
  storage_refrigerator: boolean;
  storage_freezer: boolean;
  max_capacity_meals: string;
  can_handle_cooked: boolean;

  // Food Preferences
  food_restrictions: string;
  priority_needs: string[];

  // Beneficiary Info
  people_served: string;
  beneficiary_types: string[];
  distribution_frequency: string;

  // Logistics
  has_transport: boolean;
  vehicle_count: string;
  can_urgent_pickup: boolean;
  pickup_radius: string;
}

const defaultExtendedData: ExtendedProfileData = {
  organization_type: "",
  registration_number: "",
  storage_room_temp: true,
  storage_refrigerator: false,
  storage_freezer: false,
  max_capacity_meals: "",
  can_handle_cooked: true,
  food_restrictions: "",
  priority_needs: [],
  people_served: "",
  beneficiary_types: [],
  distribution_frequency: "Weekly",
  has_transport: false,
  vehicle_count: "0",
  can_urgent_pickup: false,
  pickup_radius: "10",
};

const NgoProfile = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Basic profile fields
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [serviceArea, setServiceArea] = useState("");
  const [storageCapacity, setStorageCapacity] = useState("");
  const [operationHours, setOperationHours] = useState("");
  const [foodTypes, setFoodTypes] = useState<string[]>([]);
  const [hasMultipleOutlets, setHasMultipleOutlets] = useState(false);
  const [branchName, setBranchName] = useState("");

  // Extended profile data (stored as JSON in storage_capacity field)
  const [extendedData, setExtendedData] = useState<ExtendedProfileData>(defaultExtendedData);

  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState("basic");

  // Fetch profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ["ngo_profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch system-generated stats
  const { data: stats } = useQuery({
    queryKey: ["ngo_stats", user?.id],
    queryFn: async () => {
      // Total food received (completed claims)
      const { data: completedItems } = await supabase
        .from("donation_items")
        .select("id, quantity")
        .eq("claimed_by", user!.id)
        .eq("status", "completed");

      // Distribution records
      const { data: distributions } = await supabase
        .from("distribution_records")
        .select("id, quantity_distributed")
        .eq("ngo_user_id", user!.id);

      // Claims history for response time and no-show rate
      const { data: allClaims } = await supabase
        .from("donation_items")
        .select("id, status, claimed_at")
        .eq("claimed_by", user!.id);

      const totalReceived = completedItems?.length || 0;
      const totalDistributed = distributions?.length || 0;
      const completedClaims = allClaims?.filter(c => c.status === "completed").length || 0;
      const cancelledClaims = allClaims?.filter(c => c.status === "available").length || 0; // cancelled = reset to available
      const totalClaims = allClaims?.length || 0;

      return {
        totalFoodReceived: totalReceived,
        totalDistributions: totalDistributed,
        distributionEfficiency: totalReceived > 0 ? Math.round((totalDistributed / totalReceived) * 100) : 0,
        noShowRate: totalClaims > 0 ? Math.round((cancelledClaims / totalClaims) * 100) : 0,
        completionRate: totalClaims > 0 ? Math.round((completedClaims / totalClaims) * 100) : 0,
      };
    },
    enabled: !!user,
  });

  // Load profile data
  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setBusinessName(profile.business_name || "");
      setPhone(profile.phone || "");
      setAddress(profile.address || "");
      setServiceArea(profile.service_area || "");
      setOperationHours(profile.operation_hours || "");
      setFoodTypes(profile.food_types || []);
      setHasMultipleOutlets(profile.has_multiple_outlets || false);
      setBranchName(profile.branch_name || "");

      // Parse extended data from storage_capacity (JSON)
      if (profile.storage_capacity) {
        try {
          const parsed = JSON.parse(profile.storage_capacity);
          if (typeof parsed === "object" && parsed !== null) {
            setExtendedData({ ...defaultExtendedData, ...parsed });
            setStorageCapacity(parsed.max_capacity_meals || "");
          } else {
            // Legacy: plain string storage capacity
            setStorageCapacity(profile.storage_capacity);
          }
        } catch {
          // Legacy: plain string storage capacity
          setStorageCapacity(profile.storage_capacity);
        }
      }
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    logger.ngo.info("Saving profile", { section: activeSection }, user?.id);

    try {
      // Merge extended data with max capacity
      const extendedWithCapacity = {
        ...extendedData,
        max_capacity_meals: storageCapacity,
      };

      const { error } = await supabase.from("profiles").update({
        name,
        business_name: businessName,
        phone,
        address,
        service_area: serviceArea,
        operation_hours: operationHours,
        food_types: foodTypes,
        storage_capacity: JSON.stringify(extendedWithCapacity),
        has_multiple_outlets: hasMultipleOutlets,
        branch_name: hasMultipleOutlets ? branchName : null,
      }).eq("id", user!.id);

      if (error) throw error;
      toast.success("Profile updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["ngo_profile"] });
    } catch (err: any) {
      logger.ngo.error("Failed to save profile", err.message, {}, user?.id);
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateExtendedData = (key: keyof ExtendedProfileData, value: any) => {
    setExtendedData(prev => ({ ...prev, [key]: value }));
  };

  const toggleArrayItem = (array: string[], item: string, setter: (arr: string[]) => void) => {
    if (array.includes(item)) {
      setter(array.filter(i => i !== item));
    } else {
      setter([...array, item]);
    }
  };

  const sections = [
    { id: "basic", label: "Basic Info", icon: Building2 },
    { id: "capacity", label: "Capacity & Storage", icon: Package },
    { id: "food", label: "Food Preferences", icon: UtensilsCrossed },
    { id: "beneficiary", label: "Beneficiaries", icon: Users },
    { id: "logistics", label: "Logistics", icon: Truck },
    { id: "verification", label: "Verification", icon: FileCheck },
    { id: "stats", label: "Statistics", icon: BarChart3 },
  ];

  if (isLoading) {
    return (
      <PageLayout title="NGO Profile" subtitle="Loading...">
        <div className="text-center py-12 text-muted-foreground">Loading profile...</div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Organization Profile" subtitle="Manage your NGO information for better food matching">
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
                  <Building2 className="h-5 w-5 text-accent" />
                  <h2 className="text-lg font-semibold">Basic Information</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" /> Organization Name *
                    </Label>
                    <Input
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. Food Aid Foundation"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <User className="h-4 w-4" /> Contact Person
                    </Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Full name"
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
                      <Phone className="h-4 w-4" /> Phone Number
                    </Label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+60 12-345 6789"
                    />
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <Label className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" /> Address
                    </Label>
                    <Textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Full address"
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Organization Type</Label>
                    <Select
                      value={extendedData.organization_type}
                      onValueChange={(v) => updateExtendedData("organization_type", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {ORGANIZATION_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Registration Number</Label>
                    <Input
                      value={extendedData.registration_number}
                      onChange={(e) => updateExtendedData("registration_number", e.target.value)}
                      placeholder="e.g. NGO-12345"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" /> Service Area
                    </Label>
                    <Input
                      value={serviceArea}
                      onChange={(e) => setServiceArea(e.target.value)}
                      placeholder="e.g. Kuala Lumpur, Selangor"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Clock className="h-4 w-4" /> Operating Hours
                    </Label>
                    <Input
                      value={operationHours}
                      onChange={(e) => setOperationHours(e.target.value)}
                      placeholder="e.g. Mon-Sat 8am-5pm"
                    />
                  </div>

                  {/* Multiple Outlets Section */}
                  <div className="md:col-span-2 flex items-center justify-between rounded-lg border border-border p-4">
                    <div className="space-y-0.5">
                      <Label htmlFor="multipleOutlets" className="text-sm font-medium">
                        Multiple Outlets
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Does your organization have multiple locations/branches?
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
                      <Label htmlFor="branchName" className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" /> Branch Name
                      </Label>
                      <Input
                        id="branchName"
                        value={branchName}
                        onChange={(e) => setBranchName(e.target.value)}
                        placeholder="e.g. Main Center, North Branch, Downtown Office"
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

            {/* Capacity & Storage */}
            {activeSection === "capacity" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-border bg-card p-6 shadow-card space-y-6"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Package className="h-5 w-5 text-accent" />
                  <h2 className="text-lg font-semibold">Capacity & Storage</h2>
                </div>

                <p className="text-sm text-muted-foreground">
                  This information helps us match you with appropriate food donations based on your storage capabilities.
                </p>

                <div className="space-y-4">
                  <Label className="text-base font-medium">Storage Types Available</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div
                      className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                        extendedData.storage_room_temp ? "border-accent bg-accent/5" : "border-border"
                      }`}
                      onClick={() => updateExtendedData("storage_room_temp", !extendedData.storage_room_temp)}
                    >
                      <Thermometer className={`h-5 w-5 ${extendedData.storage_room_temp ? "text-accent" : "text-muted-foreground"}`} />
                      <div>
                        <p className="font-medium text-sm">Room Temperature</p>
                        <p className="text-xs text-muted-foreground">Dry goods, canned food</p>
                      </div>
                      <div className={`ml-auto h-4 w-4 rounded border flex items-center justify-center ${extendedData.storage_room_temp ? "bg-accent border-accent" : "border-muted-foreground"}`}>
                        {extendedData.storage_room_temp && <Check className="h-3 w-3 text-accent-foreground" />}
                      </div>
                    </div>

                    <div
                      className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                        extendedData.storage_refrigerator ? "border-accent bg-accent/5" : "border-border"
                      }`}
                      onClick={() => updateExtendedData("storage_refrigerator", !extendedData.storage_refrigerator)}
                    >
                      <Package className={`h-5 w-5 ${extendedData.storage_refrigerator ? "text-accent" : "text-muted-foreground"}`} />
                      <div>
                        <p className="font-medium text-sm">Refrigerator</p>
                        <p className="text-xs text-muted-foreground">Chilled food, dairy</p>
                      </div>
                      <div className={`ml-auto h-4 w-4 rounded border flex items-center justify-center ${extendedData.storage_refrigerator ? "bg-accent border-accent" : "border-muted-foreground"}`}>
                        {extendedData.storage_refrigerator && <Check className="h-3 w-3 text-accent-foreground" />}
                      </div>
                    </div>

                    <div
                      className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                        extendedData.storage_freezer ? "border-accent bg-accent/5" : "border-border"
                      }`}
                      onClick={() => updateExtendedData("storage_freezer", !extendedData.storage_freezer)}
                    >
                      <Snowflake className={`h-5 w-5 ${extendedData.storage_freezer ? "text-accent" : "text-muted-foreground"}`} />
                      <div>
                        <p className="font-medium text-sm">Freezer</p>
                        <p className="text-xs text-muted-foreground">Frozen food, ice cream</p>
                      </div>
                      <div className={`ml-auto h-4 w-4 rounded border flex items-center justify-center ${extendedData.storage_freezer ? "bg-accent border-accent" : "border-muted-foreground"}`}>
                        {extendedData.storage_freezer && <Check className="h-3 w-3 text-accent-foreground" />}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Maximum Storage Capacity</Label>
                    <Input
                      value={storageCapacity}
                      onChange={(e) => setStorageCapacity(e.target.value)}
                      placeholder="e.g. 100 meals/day or 500 kg"
                    />
                    <p className="text-xs text-muted-foreground">How much food can you store/handle per day?</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Can Handle Cooked Food?</Label>
                    <div className="flex items-center gap-3 mt-2">
                      <Switch
                        checked={extendedData.can_handle_cooked}
                        onCheckedChange={(v) => updateExtendedData("can_handle_cooked", v)}
                      />
                      <span className="text-sm text-muted-foreground">
                        {extendedData.can_handle_cooked ? "Yes, we can handle cooked meals" : "No, only packaged/dry food"}
                      </span>
                    </div>
                  </div>
                </div>

                <Button type="submit" disabled={saving} className="w-full sm:w-auto">
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </motion.div>
            )}

            {/* Food Preferences */}
            {activeSection === "food" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-border bg-card p-6 shadow-card space-y-6"
              >
                <div className="flex items-center gap-2 mb-4">
                  <UtensilsCrossed className="h-5 w-5 text-accent" />
                  <h2 className="text-lg font-semibold">Food Preferences & Needs</h2>
                </div>

                <p className="text-sm text-muted-foreground">
                  Tell us what types of food you accept. This helps match you with relevant donations and sends you notifications for recommended items.
                </p>

                <div className="space-y-4">
                  <Label className="text-base font-medium">Food Types Accepted</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {FOOD_TYPES.map((type) => (
                      <div
                        key={type}
                        className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                          foodTypes.includes(type) ? "border-accent bg-accent/5" : "border-border hover:border-accent/50"
                        }`}
                        onClick={() => toggleArrayItem(foodTypes, type, setFoodTypes)}
                      >
                        <div className={`h-4 w-4 rounded border flex items-center justify-center flex-shrink-0 ${foodTypes.includes(type) ? "bg-accent border-accent" : "border-muted-foreground"}`}>
                          {foodTypes.includes(type) && <Check className="h-3 w-3 text-accent-foreground" />}
                        </div>
                        <span className="text-sm">{type}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {foodTypes.length === 0 ? "No preferences selected (you'll receive all donation notifications)" : `${foodTypes.length} type(s) selected`}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Food Restrictions</Label>
                  <Textarea
                    value={extendedData.food_restrictions}
                    onChange={(e) => updateExtendedData("food_restrictions", e.target.value)}
                    placeholder="e.g. No raw meat, no expired items, halal only"
                    rows={2}
                  />
                </div>

                <div className="space-y-4">
                  <Label className="text-base font-medium">Priority Needs</Label>
                  <p className="text-xs text-muted-foreground">Select items you need most urgently</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {FOOD_TYPES.map((type) => (
                      <div
                        key={type}
                        className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                          extendedData.priority_needs.includes(type) ? "border-warning bg-warning/5" : "border-border hover:border-warning/50"
                        }`}
                        onClick={() => {
                          const newPriorities = extendedData.priority_needs.includes(type)
                            ? extendedData.priority_needs.filter(t => t !== type)
                            : [...extendedData.priority_needs, type];
                          updateExtendedData("priority_needs", newPriorities);
                        }}
                      >
                        <div className={`h-4 w-4 rounded border flex items-center justify-center flex-shrink-0 ${extendedData.priority_needs.includes(type) ? "bg-warning border-warning" : "border-muted-foreground"}`}>
                          {extendedData.priority_needs.includes(type) && <Check className="h-3 w-3 text-warning-foreground" />}
                        </div>
                        <span className="text-sm">{type}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Button type="submit" disabled={saving} className="w-full sm:w-auto">
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </motion.div>
            )}

            {/* Beneficiary Information */}
            {activeSection === "beneficiary" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-border bg-card p-6 shadow-card space-y-6"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Users className="h-5 w-5 text-accent" />
                  <h2 className="text-lg font-semibold">Beneficiary Information</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Heart className="h-4 w-4" /> Estimated People Served
                    </Label>
                    <Input
                      value={extendedData.people_served}
                      onChange={(e) => updateExtendedData("people_served", e.target.value)}
                      placeholder="e.g. 200 people/week"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Distribution Frequency</Label>
                    <Select
                      value={extendedData.distribution_frequency}
                      onValueChange={(v) => updateExtendedData("distribution_frequency", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        {DISTRIBUTION_FREQUENCIES.map((freq) => (
                          <SelectItem key={freq} value={freq}>{freq}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-base font-medium">Types of Beneficiaries Served</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {BENEFICIARY_TYPES.map((type) => (
                      <div
                        key={type}
                        className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                          extendedData.beneficiary_types.includes(type) ? "border-success bg-success/5" : "border-border hover:border-success/50"
                        }`}
                        onClick={() => {
                          const newTypes = extendedData.beneficiary_types.includes(type)
                            ? extendedData.beneficiary_types.filter(t => t !== type)
                            : [...extendedData.beneficiary_types, type];
                          updateExtendedData("beneficiary_types", newTypes);
                        }}
                      >
                        <div className={`h-4 w-4 rounded border flex items-center justify-center flex-shrink-0 ${extendedData.beneficiary_types.includes(type) ? "bg-success border-success" : "border-muted-foreground"}`}>
                          {extendedData.beneficiary_types.includes(type) && <Check className="h-3 w-3 text-success-foreground" />}
                        </div>
                        <span className="text-sm">{type}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Button type="submit" disabled={saving} className="w-full sm:w-auto">
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </motion.div>
            )}

            {/* Logistics Capability */}
            {activeSection === "logistics" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-border bg-card p-6 shadow-card space-y-6"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Truck className="h-5 w-5 text-accent" />
                  <h2 className="text-lg font-semibold">Logistics Capability</h2>
                </div>

                <p className="text-sm text-muted-foreground">
                  Your transport capability affects how donations are assigned and routed to you.
                </p>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                    <div className="flex items-center gap-3">
                      <Truck className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Do you have transport?</p>
                        <p className="text-xs text-muted-foreground">Can you pick up donations yourself?</p>
                      </div>
                    </div>
                    <Switch
                      checked={extendedData.has_transport}
                      onCheckedChange={(v) => updateExtendedData("has_transport", v)}
                    />
                  </div>

                  {extendedData.has_transport && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4 border-l-2 border-accent/30"
                    >
                      <div className="space-y-2">
                        <Label>Number of Vehicles</Label>
                        <Input
                          type="number"
                          value={extendedData.vehicle_count}
                          onChange={(e) => updateExtendedData("vehicle_count", e.target.value)}
                          placeholder="e.g. 2"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Pickup Radius (km)</Label>
                        <Input
                          type="number"
                          value={extendedData.pickup_radius}
                          onChange={(e) => updateExtendedData("pickup_radius", e.target.value)}
                          placeholder="e.g. 10"
                        />
                      </div>
                    </motion.div>
                  )}

                  <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Can Handle Urgent Pickups?</p>
                        <p className="text-xs text-muted-foreground">Available for same-day or emergency pickups</p>
                      </div>
                    </div>
                    <Switch
                      checked={extendedData.can_urgent_pickup}
                      onCheckedChange={(v) => updateExtendedData("can_urgent_pickup", v)}
                    />
                  </div>
                </div>

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
                        <p className="font-semibold text-success">Verified Organization</p>
                        <p className="text-sm text-muted-foreground">Your organization has been verified by our team.</p>
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
                        <p className="text-sm text-muted-foreground">Complete your profile and upload documents to get verified.</p>
                      </div>
                      <Badge variant="outline" className="ml-auto">Unverified</Badge>
                    </>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Registration Number</Label>
                  <Input
                    value={extendedData.registration_number}
                    onChange={(e) => updateExtendedData("registration_number", e.target.value)}
                    placeholder="Your NGO registration number"
                  />
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
                  <h2 className="text-lg font-semibold">System Statistics</h2>
                </div>

                <p className="text-sm text-muted-foreground">
                  These statistics are automatically generated based on your activity on the platform.
                </p>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
                    <Package className="h-6 w-6 text-accent mx-auto mb-2" />
                    <p className="text-2xl font-bold text-foreground">{stats?.totalFoodReceived || 0}</p>
                    <p className="text-xs text-muted-foreground">Total Food Received</p>
                  </div>

                  <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
                    <Heart className="h-6 w-6 text-success mx-auto mb-2" />
                    <p className="text-2xl font-bold text-foreground">{stats?.totalDistributions || 0}</p>
                    <p className="text-xs text-muted-foreground">Distributions Made</p>
                  </div>

                  <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
                    <BarChart3 className="h-6 w-6 text-accent mx-auto mb-2" />
                    <p className="text-2xl font-bold text-foreground">{stats?.distributionEfficiency || 0}%</p>
                    <p className="text-xs text-muted-foreground">Distribution Efficiency</p>
                  </div>

                  <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
                    <CheckCircle className="h-6 w-6 text-success mx-auto mb-2" />
                    <p className="text-2xl font-bold text-foreground">{stats?.completionRate || 0}%</p>
                    <p className="text-xs text-muted-foreground">Completion Rate</p>
                  </div>

                  <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
                    <AlertCircle className={`h-6 w-6 mx-auto mb-2 ${(stats?.noShowRate || 0) > 20 ? "text-destructive" : "text-success"}`} />
                    <p className="text-2xl font-bold text-foreground">{stats?.noShowRate || 0}%</p>
                    <p className="text-xs text-muted-foreground">Cancellation Rate</p>
                  </div>
                </div>

                <div className="p-4 rounded-lg border border-accent/20 bg-accent/5">
                  <p className="text-sm text-muted-foreground">
                    <strong>Tip:</strong> Maintain a high completion rate and low cancellation rate to be prioritized for donations.
                    Respond quickly to donation notifications for better matching.
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

export default NgoProfile;

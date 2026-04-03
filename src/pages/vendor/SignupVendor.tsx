import AddressPickerMap, { type StructuredAddress } from "@/components/AddressPickerMap";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { Store, Building2, User, Clock } from "lucide-react";
import foodbridgeLogo from "@/assets/foodbridge-logo.png";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

// Initial empty address
const emptyAddress: StructuredAddress = {
  street1: "",
  street2: "",
  city: "",
  postcode: "",
  state: "",
  fullAddress: "",
  lat: null,
  lng: null,
};

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

const SignupVendor = () => {
  // Basic Info
  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Business Details
  const [businessType, setBusinessType] = useState("");
  const [operationHours, setOperationHours] = useState("");
  const [hasMultipleOutlets, setHasMultipleOutlets] = useState(false);
  const [branchName, setBranchName] = useState("");

  // Address & Auth
  const [address, setAddress] = useState<StructuredAddress>(emptyAddress);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (!address.street1 || !address.city || !address.postcode || !address.state) {
      toast.error("Please fill in all required address fields");
      return;
    }
    if (!businessType) {
      toast.error("Please select a business type");
      return;
    }

    setLoading(true);

    try {
      // 1. Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { role: "vendor" },
          emailRedirectTo: window.location.origin,
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Signup failed. No user returned.");

      // 2. Update profile with all vendor details
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          name: contactName,
          business_name: businessName,
          phone,
          business_type: businessType,
          operation_hours: operationHours,
          has_multiple_outlets: hasMultipleOutlets,
          branch_name: hasMultipleOutlets ? branchName : null,
          address: address.fullAddress,
          address_lat: address.lat,
          address_lng: address.lng,
        })
        .eq("id", authData.user.id);

      if (updateError) throw updateError;

      toast.success("Account created! Please check your email to verify.");
      navigate("/login/vendor");
    } catch (error: any) {
      toast.error(error.message || "Something went wrong during signup.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-2/5 flex-col items-center justify-center gap-4 bg-background px-8">
        <img src={foodbridgeLogo} alt="FoodBridge" className="h-80 w-80 rounded-2xl object-contain" />
        <h1 className="text-2xl font-bold text-foreground">FoodBridge</h1>
        <div className="flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5">
          <Store className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-primary">Vendor Portal</span>
        </div>
        <p className="mt-4 max-w-sm text-center text-muted-foreground">
          Join our network of food donors and help reduce waste while feeding communities in need.
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex w-full lg:w-3/5 items-center justify-center px-4 py-8 overflow-y-auto">
        <div className="w-full max-w-2xl space-y-6">
          {/* Mobile-only branding */}
          <div className="flex flex-col items-center gap-2 lg:hidden">
            <img src={foodbridgeLogo} alt="FoodBridge" className="h-20 w-20 rounded-xl object-contain" />
            <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1">
              <Store className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Vendor Portal</span>
            </div>
          </div>

          <Card>
            <CardHeader className="text-center">
              <CardTitle>Vendor Sign Up</CardTitle>
              <CardDescription>Create an account to list food donations</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignup} className="space-y-6">
                {/* Basic Information Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <User className="h-4 w-4 text-primary" />
                    Basic Information
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="businessName">Business Name *</Label>
                      <Input
                        id="businessName"
                        placeholder="Your business name"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contactName">Contact Person Name *</Label>
                      <Input
                        id="contactName"
                        placeholder="Person to contact"
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="vendor@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+60123456789"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Business Details Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Building2 className="h-4 w-4 text-primary" />
                    Business Details
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
                          placeholder="e.g. Mon-Fri 9am-6pm"
                          value={operationHours}
                          onChange={(e) => setOperationHours(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div className="space-y-0.5">
                      <Label htmlFor="multipleOutlets" className="text-sm font-medium">
                        Multiple Outlets
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Do you have multiple locations?
                      </p>
                    </div>
                    <Switch
                      id="multipleOutlets"
                      checked={hasMultipleOutlets}
                      onCheckedChange={setHasMultipleOutlets}
                    />
                  </div>

                  {hasMultipleOutlets && (
                    <div className="space-y-2">
                      <Label htmlFor="branchName">Branch Name</Label>
                      <Input
                        id="branchName"
                        placeholder="e.g. Main Branch, Outlet 1"
                        value={branchName}
                        onChange={(e) => setBranchName(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Identify this specific branch/outlet
                      </p>
                    </div>
                  )}
                </div>

                {/* Business Address Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Store className="h-4 w-4 text-primary" />
                    Business Address
                  </div>
                  <AddressPickerMap value={address} onChange={setAddress} mapHeight={250} />
                </div>

                {/* Password Section */}
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creating account..." : "Create Account"}
                </Button>
              </form>

              <div className="mt-4 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login/vendor" className="text-primary hover:underline">
                  Sign In
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SignupVendor;

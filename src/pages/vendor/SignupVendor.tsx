import AddressPickerMap, { type StructuredAddress } from "@/components/AddressPickerMap";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Store } from "lucide-react";
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

type Vendor = {
  auth_id: string;
  name: string;
  email: string;
  phone: string;
  role: "vendor";
  address: string;
  address_street1: string;
  address_street2?: string;
  address_city: string;
  address_postcode: string;
  address_state: string;
  address_lat: number | null;
  address_lng: number | null;
};

const SignupVendor = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
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

    setLoading(true);

    try {
      // 1️⃣ Sign up with Supabase Auth
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

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          name,
          phone,
          address: address.fullAddress,
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
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center gap-4 bg-background px-8 -mt-[28vh]">
        <img src={foodbridgeLogo} alt="FoodBridge" className="h-96 w-96 rounded-2xl object-contain" />
        <h1 className="text-2xl font-bold text-foreground">FoodBridge</h1>
        <div className="flex items-center gap-2 rounded-full bg-secondary px-4 py-1.5">
          <Store className="h-4 w-4 text-secondary-foreground" />
          <span className="text-sm font-medium text-secondary-foreground">Vendor Portal</span>
        </div>
        <p className="mt-4 max-w-sm text-center text-muted-foreground">
          Join our network of food donors and help reduce waste while feeding communities in need.
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex w-full lg:w-1/2 items-center justify-center px-4 py-8 overflow-y-auto">
        <div className="w-full max-w-2xl space-y-6">
          {/* Mobile-only branding */}
          <div className="flex flex-col items-center gap-2 lg:hidden">
            <img src={foodbridgeLogo} alt="FoodBridge" className="h-20 w-20 rounded-xl object-contain" />
            <div className="flex items-center gap-2 rounded-full bg-secondary px-3 py-1">
              <Store className="h-4 w-4 text-secondary-foreground" />
              <span className="text-sm font-medium text-secondary-foreground">Vendor Portal</span>
            </div>
          </div>

          <Card>
            <CardHeader className="text-center">
              <CardTitle>Vendor Sign Up</CardTitle>
              <CardDescription>Create an account to list food donations</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Business Name</Label>
                  <Input
                    id="name"
                    placeholder="Your business name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
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
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+60123456789"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <AddressPickerMap value={address} onChange={setAddress} mapHeight={280} />

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
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

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import AddressPickerMap, { type StructuredAddress } from "@/components/AddressPickerMap";
import foodbridgeLogo from "@/assets/foodbridge-logo.png";

const emptyAddress: StructuredAddress = {
  street1: "", street2: "", city: "", postcode: "", state: "",
  fullAddress: "", lat: null, lng: null,
};

const SignupNGO = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState<StructuredAddress>(emptyAddress);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (!address.street1 || !address.city || !address.postcode || !address.state) {
      toast.error("Please fill in all required address fields");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name, phone, role: "ngo",
          address: address.fullAddress,
          address_street1: address.street1,
          address_street2: address.street2,
          address_city: address.city,
          address_postcode: address.postcode,
          address_state: address.state,
          address_lat: address.lat,
          address_lng: address.lng,
        },
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Account created! Please check your email to verify.");
    navigate("/login/ngo");
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-2/4 flex-col items-center justify-center gap-4 bg-background px-8 -mt-[28vh]">
        <img src={foodbridgeLogo} alt="FoodBridge" className="h-96 w-96 rounded-2xl object-contain" />
        <h1 className="text-2xl font-bold text-foreground">FoodBridge</h1>
        <div className="flex items-center gap-2 rounded-full bg-accent/10 px-4 py-1.5">
          <Building2 className="h-4 w-4 text-accent" />
          <span className="text-sm font-medium text-accent">NGO / Foodbank Portal</span>
        </div>
        <p className="mt-4 max-w-sm text-center text-muted-foreground">
          Register your organization to receive food donations and help feed communities in need.
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex w-full lg:w-3/5 items-center justify-center px-4 py-8 overflow-y-auto">
        <div className="w-full max-w-4xl space-y-6">
          {/* Mobile-only branding */}
          <div className="flex flex-col items-center gap-2 lg:hidden">
            <img src={foodbridgeLogo} alt="FoodBridge" className="h-20 w-20 rounded-xl object-contain" />
            <div className="flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1">
              <Building2 className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-accent">NGO / Foodbank Portal</span>
            </div>
          </div>

          <Card>
            <CardHeader className="text-center">
              <CardTitle>NGO Sign Up</CardTitle>
              <CardDescription>Register your organization to receive food donations</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Organization Name</Label>
                  <Input id="name" placeholder="Your NGO name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="ngo@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" type="tel" placeholder="+60123456789" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>

                <AddressPickerMap value={address} onChange={setAddress} mapHeight={280} />

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full bg-accent hover:bg-accent/90" disabled={loading}>
                  {loading ? "Creating account..." : "Create Account"}
                </Button>
              </form>
              <div className="mt-4 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login/ngo" className="text-primary hover:underline">Sign In</Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SignupNGO;

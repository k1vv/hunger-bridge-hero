import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Leaf, Building2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const LoginNGO = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }

    // Check if user has NGO role
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", authData.user.id);

    const hasNgoRole = roles?.some((r) => r.role === "ngo");

    if (!hasNgoRole) {
      await supabase.auth.signOut();
      setLoading(false);
      toast.error("This account is not registered as an NGO. Please use the correct login portal.");
      return;
    }

    setLoading(false);
    toast.success("NGO login successful!");
    navigate("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent">
            <Leaf className="h-6 w-6 text-accent-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">FoodBridge</h1>
          <div className="flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1">
            <Building2 className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium text-accent">NGO / Foodbank Portal</span>
          </div>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle>NGO Login</CardTitle>
            <CardDescription>Sign in to browse and reserve food listings</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="ngo@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full bg-accent hover:bg-accent/90" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link to="/signup/ngo" className="text-primary hover:underline">Sign Up</Link>
            </div>
            <div className="mt-2 text-center text-sm text-muted-foreground">
              Not an NGO?{" "}
              <Link to="/login/vendor" className="text-primary hover:underline">Vendor Login</Link>
              {" · "}
              <Link to="/login/admin" className="text-primary hover:underline">Admin Login</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginNGO;

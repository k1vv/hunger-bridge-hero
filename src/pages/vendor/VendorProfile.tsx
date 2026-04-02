import { useState, useEffect } from "react";
import PageLayout from "@/components/PageLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

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

  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [operationHours, setOperationHours] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setBusinessName(profile.business_name || "");
      setPhone(profile.phone || "");
      setAddress(profile.address || "");
      setOperationHours(profile.operation_hours || "");
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({
        name, business_name: businessName, phone, address, operation_hours: operationHours,
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
      <div className="max-w-xl">
        <form onSubmit={handleSave} className="rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
          <div className="space-y-2">
            <Label>Contact Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Business Name</Label>
            <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Your business name" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user?.email || ""} disabled className="bg-muted" />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+60..." />
          </div>
          <div className="space-y-2">
            <Label>Address / Branch Location</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Operation Hours</Label>
            <Input value={operationHours} onChange={(e) => setOperationHours(e.target.value)} placeholder="e.g. Mon-Fri 9am-6pm" />
          </div>
          <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Profile"}</Button>
        </form>
      </div>
    </PageLayout>
  );
};

export default VendorProfile;

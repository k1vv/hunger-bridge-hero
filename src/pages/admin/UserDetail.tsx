import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageLayout from "@/components/PageLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Mail, Phone, Building, MapPin, Clock, Utensils, Warehouse, Globe } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const UserDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["admin_user_detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["admin_user_roles", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", id!);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: stats } = useQuery({
    queryKey: ["admin_user_stats", id],
    queryFn: async () => {
      const role = roles[0]?.role;

      let donations = 0;
      let claims = 0;
      let complaints = 0;

      if (role === "vendor") {
        const { count } = await supabase
          .from("donation_batches")
          .select("*", { count: "exact", head: true })
          .eq("vendor_id", id!);
        donations = count || 0;
      }

      if (role === "ngo") {
        const { count } = await supabase
          .from("claims")
          .select("*", { count: "exact", head: true })
          .eq("ngo_user_id", id!);
        claims = count || 0;
      }

      const { count: complaintCount } = await supabase
        .from("complaints")
        .select("*", { count: "exact", head: true })
        .eq("reporter_id", id!);
      complaints = complaintCount || 0;

      return { donations, claims, complaints };
    },
    enabled: !!id && roles.length > 0,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "verified": return "bg-success/10 text-success border-success/30";
      case "rejected": return "bg-destructive/10 text-destructive border-destructive/30";
      case "pending": return "bg-warning/10 text-warning border-warning/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  if (profileLoading) {
    return (
      <PageLayout title="User Details" subtitle="Loading...">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PageLayout>
    );
  }

  if (!profile) {
    return (
      <PageLayout title="User Not Found" subtitle="The requested user could not be found">
        <Button variant="outline" onClick={() => navigate("/admin/users")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Users
        </Button>
      </PageLayout>
    );
  }

  const infoItems = [
    { icon: Mail, label: "Email", value: profile.email, href: profile.email ? `mailto:${profile.email}` : undefined },
    { icon: Phone, label: "Phone", value: profile.phone, href: profile.phone ? `tel:${profile.phone}` : undefined },
    { icon: Building, label: "Business Name", value: profile.business_name },
    { icon: MapPin, label: "Address", value: profile.address },
    { icon: Clock, label: "Operation Hours", value: profile.operation_hours },
    { icon: Globe, label: "Service Area", value: profile.service_area },
    { icon: Warehouse, label: "Storage Capacity", value: profile.storage_capacity },
  ];

  return (
    <PageLayout title="User Details" subtitle={profile.name || profile.business_name || "Unknown User"}>
      <Button
        variant="ghost"
        size="sm"
        className="mb-4 text-muted-foreground hover:text-foreground"
        onClick={() => navigate("/admin/users")}
      >
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Users
      </Button>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Info Card */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{profile.name || "Unnamed User"}</CardTitle>
              <div className="flex items-center gap-2">
                {roles.map((r) => (
                  <Badge key={r.role} variant="outline" className="capitalize text-xs">
                    {r.role}
                  </Badge>
                ))}
                <Badge variant="outline" className={`capitalize text-xs ${getStatusColor(profile.verification_status)}`}>
                  {profile.verification_status}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {infoItems.map(({ icon: Icon, label, value, href }) =>
              value ? (
                <div key={label} className="flex items-start gap-3">
                  <Icon className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    {href ? (
                      <a href={href} className="text-sm text-foreground hover:text-primary">
                        {value}
                      </a>
                    ) : (
                      <p className="text-sm text-foreground">{value}</p>
                    )}
                  </div>
                </div>
              ) : null
            )}

            {profile.food_types && profile.food_types.length > 0 && (
              <div className="flex items-start gap-3">
                <Utensils className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Food Types</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {profile.food_types.map((type) => (
                      <Badge key={type} variant="secondary" className="text-xs">
                        {type}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <Separator />

            <div className="flex items-start gap-3">
              <Clock className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Joined</p>
                <p className="text-sm text-foreground">
                  {new Date(profile.created_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {roles[0]?.role === "vendor" && (
              <div className="rounded-lg border border-border p-3 text-center">
                <p className="text-2xl font-bold text-foreground">{stats?.donations ?? "—"}</p>
                <p className="text-xs text-muted-foreground">Donation Batches</p>
              </div>
            )}
            {roles[0]?.role === "ngo" && (
              <div className="rounded-lg border border-border p-3 text-center">
                <p className="text-2xl font-bold text-foreground">{stats?.claims ?? "—"}</p>
                <p className="text-xs text-muted-foreground">Claims Made</p>
              </div>
            )}
            <div className="rounded-lg border border-border p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{stats?.complaints ?? "—"}</p>
              <p className="text-xs text-muted-foreground">Complaints Filed</p>
            </div>

            {profile.address_lat && profile.address_lng && (
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground mb-1">Location</p>
                <a
                  href={`https://www.google.com/maps?q=${profile.address_lat},${profile.address_lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-accent hover:underline"
                >
                  View on Google Maps
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
};

export default UserDetail;

import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageLayout from "@/components/PageLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Mail, Phone, Building, MapPin, Clock, Utensils, Warehouse, Globe, CheckCircle, XCircle, AlertCircle, FileText, Store, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { notifyUserOfVerificationStatus } from "@/lib/notifications";
import { useAuth } from "@/contexts/AuthContext";

const UserDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

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

  // Verification mutation
  const updateVerification = useMutation({
    mutationFn: async ({ status, reason }: { status: string; reason?: string }) => {
      const updateData: any = { verification_status: status };
      if (reason) {
        updateData.rejection_reason = reason;
      }

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", id!);

      if (error) throw error;

      // Notify user
      try {
        await notifyUserOfVerificationStatus(
          id!,
          status as "verified" | "rejected",
          profile?.name || profile?.business_name
        );
      } catch (e) {
        console.error("Failed to send notification:", e);
      }
    },
    onSuccess: (_, { status }) => {
      toast.success(`User ${status}!`);
      queryClient.invalidateQueries({ queryKey: ["admin_user_detail", id] });
      queryClient.invalidateQueries({ queryKey: ["admin_users"] });
      setRejectDialogOpen(false);
      setRejectionReason("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleApprove = () => {
    updateVerification.mutate({ status: "verified" });
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    updateVerification.mutate({ status: "rejected", reason: rejectionReason });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "verified": return "bg-success/10 text-success border-success/30";
      case "rejected": return "bg-destructive/10 text-destructive border-destructive/30";
      case "pending": return "bg-warning/10 text-warning border-warning/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "verified": return <CheckCircle className="h-5 w-5 text-success" />;
      case "rejected": return <XCircle className="h-5 w-5 text-destructive" />;
      case "pending": return <AlertCircle className="h-5 w-5 text-warning" />;
      default: return null;
    }
  };

  // Parse extended profile data (for NGOs)
  const extendedData = profile?.storage_capacity ? (() => {
    try {
      const parsed = JSON.parse(profile.storage_capacity);
      if (typeof parsed === "object") return parsed;
    } catch {}
    return null;
  })() : null;

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
    { icon: Store, label: "Business Type", value: profile.business_type },
    { icon: MapPin, label: "Address", value: profile.address },
    { icon: Clock, label: "Operation Hours", value: profile.operation_hours },
    { icon: Globe, label: "Service Area", value: profile.service_area },
    { icon: FileText, label: "Registration Number", value: extendedData?.registration_number },
  ];

  return (
    <>
      {/* Rejection Reason Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject User Verification</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting {profile?.name || profile?.business_name}'s verification request.
              This will be sent to the user.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reason">Rejection Reason *</Label>
            <Textarea
              id="reason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Incomplete registration documents, Invalid business registration number..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={updateVerification.isPending}
            >
              {updateVerification.isPending ? "Rejecting..." : "Reject User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    <PageLayout title="User Details" subtitle={profile.name || profile.business_name || "Unknown User"}>
      <Button
        variant="ghost"
        size="sm"
        className="mb-4 text-muted-foreground hover:text-foreground"
        onClick={() => navigate("/admin/users")}
      >
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Users
      </Button>

      {/* Verification Action Card - Show prominently for pending users */}
      {profile.verification_status === "pending" && (
        <Card className="mb-6 border-warning/30 bg-warning/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/10">
                  <AlertCircle className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="font-semibold text-warning">Verification Pending</p>
                  <p className="text-sm text-muted-foreground">Review this user's information and verify or reject their account</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleApprove}
                  disabled={updateVerification.isPending}
                  className="bg-success hover:bg-success/90"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setRejectDialogOpen(true)}
                  disabled={updateVerification.isPending}
                  className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rejected Status Card */}
      {profile.verification_status === "rejected" && (
        <Card className="mb-6 border-destructive/30 bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                  <XCircle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="font-semibold text-destructive">Verification Rejected</p>
                  {profile.rejection_reason && (
                    <p className="text-sm text-muted-foreground">Reason: {profile.rejection_reason}</p>
                  )}
                </div>
              </div>
              <Button
                onClick={handleApprove}
                disabled={updateVerification.isPending}
                className="bg-success hover:bg-success/90"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Verified Status Card */}
      {profile.verification_status === "verified" && (
        <Card className="mb-6 border-success/30 bg-success/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10">
                  <CheckCircle className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="font-semibold text-success">Verified User</p>
                  <p className="text-sm text-muted-foreground">This user has been verified and can use all platform features</p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => setRejectDialogOpen(true)}
                disabled={updateVerification.isPending}
                className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Revoke Verification
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
    </>
  );
};

export default UserDetail;

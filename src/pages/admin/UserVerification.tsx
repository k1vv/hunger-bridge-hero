import PageLayout from "@/components/PageLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle, XCircle, User } from "lucide-react";
import { motion } from "framer-motion";

const UserVerification = () => {
  const queryClient = useQueryClient();

  const { data: pendingUsers = [] } = useQuery({
    queryKey: ["pending_verification"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*, user_roles(role)").eq("verification_status", "pending").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
      const { error } = await supabase.from("profiles").update({ verification_status: status }).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      toast.success(`User ${status}!`);
      queryClient.invalidateQueries({ queryKey: ["pending_verification"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <PageLayout title="User Verification" subtitle="Review and approve user registrations">
      <div className="space-y-4">
        {pendingUsers.map((user: any, i: number) => (
          <motion.div key={user.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{user.name || user.business_name || "Unknown"}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {user.user_roles?.map((r: any) => (
                      <Badge key={r.role} variant="outline" className="text-xs capitalize">{r.role}</Badge>
                    ))}
                  </div>
                  {user.phone && <p className="text-xs text-muted-foreground mt-1">Phone: {user.phone}</p>}
                  {user.address && <p className="text-xs text-muted-foreground">Address: {user.address}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="text-success" onClick={() => updateStatus.mutate({ userId: user.id, status: "verified" })}>
                  <CheckCircle className="h-4 w-4 mr-1" /> Approve
                </Button>
                <Button size="sm" variant="outline" className="text-destructive" onClick={() => updateStatus.mutate({ userId: user.id, status: "rejected" })}>
                  <XCircle className="h-4 w-4 mr-1" /> Reject
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
        {pendingUsers.length === 0 && <div className="text-center py-12 text-sm text-muted-foreground">No users pending verification</div>}
      </div>
    </PageLayout>
  );
};

export default UserVerification;

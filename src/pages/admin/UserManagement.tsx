import { useState } from "react";
import PageLayout from "@/components/PageLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { useAuth } from "@/contexts/AuthContext";

const UserManagement = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [roleFilter, setRoleFilter] = useState("all");

  const { data: users = [] } = useQuery({
    queryKey: ["admin_users"],
    queryFn: async () => {
      logger.admin.info("Fetching all users", undefined, user?.id);
      const { data, error } = await supabase.from("profiles").select("*, user_roles(role)").order("created_at", { ascending: false });
      if (error) {
        logger.admin.error("Failed to fetch users", error.message, { code: error.code }, user?.id);
        throw error;
      }
      logger.admin.info("Successfully fetched users", { count: data?.length || 0 }, user?.id);
      return data;
    },
  });

  const filtered = users.filter((u: any) => {
    if (roleFilter === "all") return true;
    return u.user_roles?.some((r: any) => r.role === roleFilter);
  });

  return (
    <PageLayout title="User Management" subtitle="Manage all platform users">
      <div className="flex items-center gap-2 mb-6">
        {["all", "vendor", "ngo", "admin"].map(r => (
          <button key={r} onClick={() => setRoleFilter(r)} className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${roleFilter === r ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
            {r}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Name</TableHead>
              <TableHead className="text-xs">Email</TableHead>
              <TableHead className="text-xs">Role</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs">Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((user: any) => (
              <TableRow key={user.id}>
                <TableCell className="text-sm font-medium">{user.name || user.business_name || "-"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                <TableCell>
                  {user.user_roles?.map((r: any) => (
                    <Badge key={r.role} variant="outline" className="text-xs capitalize mr-1">{r.role}</Badge>
                  ))}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-xs capitalize ${user.verification_status === "verified" ? "bg-success/10 text-success" : user.verification_status === "rejected" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"}`}>
                    {user.verification_status}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(user.created_at).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </PageLayout>
  );
};

export default UserManagement;

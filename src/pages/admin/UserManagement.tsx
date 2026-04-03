import { useState } from "react";
import PageLayout from "@/components/PageLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle, XCircle, Search, Mail, Phone, Building, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { logger } from "@/lib/logger";
import { fetchProfilesWithRoles } from "@/lib/admin-queries";
import { useAuth } from "@/contexts/AuthContext";
import { notifyUserOfVerificationStatus } from "@/lib/notifications";

const UserManagement = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin_users"],
    queryFn: async () => {
      logger.admin.info("Fetching all users", undefined, user?.id);
      try {
        const data = await fetchProfilesWithRoles();
        logger.admin.info("Successfully fetched users", { count: data.length || 0 }, user?.id);
        return data;
      } catch (error: any) {
        logger.admin.error("Failed to fetch users", error.message, { code: error.code }, user?.id);
        throw error;
      }
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ userId, status, userName }: { userId: string; status: string; userName?: string }) => {
      logger.admin.info("Updating user verification status", { targetUserId: userId, newStatus: status }, user?.id);
      const { error } = await supabase.from("profiles").update({ verification_status: status }).eq("id", userId);
      if (error) {
        logger.admin.error("Failed to update verification status", error.message, { targetUserId: userId, newStatus: status, code: error.code }, user?.id);
        throw error;
      }
      logger.admin.info("Successfully updated verification status", { targetUserId: userId, newStatus: status }, user?.id);

      try {
        await notifyUserOfVerificationStatus(userId, status as "verified" | "rejected", userName);
        logger.admin.info("User notified of verification status", { targetUserId: userId }, user?.id);
      } catch (notifyErr) {
        console.error("Failed to send notification:", notifyErr);
      }
    },
    onSuccess: (_, { status }) => {
      toast.success(`User ${status}!`);
      queryClient.invalidateQueries({ queryKey: ["admin_users"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filtered = users.filter((u: any) => {
    const matchesRole = roleFilter === "all" || u.user_roles?.some((r: any) => r.role === roleFilter);
    const matchesStatus = statusFilter === "all" || u.verification_status === statusFilter;
    const searchLower = search.toLowerCase();
    const matchesSearch = !search ||
      u.name?.toLowerCase().includes(searchLower) ||
      u.business_name?.toLowerCase().includes(searchLower) ||
      u.email?.toLowerCase().includes(searchLower) ||
      u.phone?.toLowerCase().includes(searchLower);
    return matchesRole && matchesStatus && matchesSearch;
  });

  const pendingCount = users.filter((u: any) => u.verification_status === "pending").length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "verified": return "bg-success/10 text-success border-success/30";
      case "rejected": return "bg-destructive/10 text-destructive border-destructive/30";
      case "pending": return "bg-warning/10 text-warning border-warning/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <PageLayout title="User Management" subtitle="Manage all platform users and verifications">
      {/* Pending Alert */}
      {pendingCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/5 p-3"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-warning/10">
            <span className="text-sm font-bold text-warning">{pendingCount}</span>
          </div>
          <p className="text-sm text-warning">
            <strong>{pendingCount} user(s)</strong> pending verification
          </p>
          <Button
            size="sm"
            variant="outline"
            className="ml-auto border-warning text-warning hover:bg-warning hover:text-warning-foreground"
            onClick={() => setStatusFilter("pending")}
          >
            Review Now
          </Button>
        </motion.div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center mb-6">
        <div className="flex items-center gap-3">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[130px] h-9 text-sm">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="vendor">Vendor</SelectItem>
              <SelectItem value="ngo">NGO</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] h-9 text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">
                Pending {pendingCount > 0 && `(${pendingCount})`}
              </SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="relative sm:ml-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 w-full sm:w-64 text-sm"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">User</TableHead>
              <TableHead className="text-xs">Contact</TableHead>
              <TableHead className="text-xs">Role</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs">Joined</TableHead>
              <TableHead className="text-xs text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-sm text-muted-foreground">
                  Loading users...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-sm text-muted-foreground">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((u: any) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium text-foreground">{u.name || "-"}</p>
                      {u.business_name && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Building className="h-3 w-3" />
                          {u.business_name}
                        </p>
                      )}
                      {u.address && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate max-w-[200px]">{u.address}</span>
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        <a href={`mailto:${u.email}`} className="hover:text-primary">{u.email}</a>
                      </p>
                      {u.phone && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          <a href={`tel:${u.phone}`} className="hover:text-primary">{u.phone}</a>
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {u.user_roles?.map((r: any) => (
                      <Badge key={r.role} variant="outline" className="text-xs capitalize mr-1">
                        {r.role}
                      </Badge>
                    ))}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs capitalize ${getStatusColor(u.verification_status)}`}>
                      {u.verification_status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {u.verification_status !== "verified" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs bg-success/10 text-success border-success/30 hover:bg-success hover:text-success-foreground"
                          onClick={() => updateStatus.mutate({ userId: u.id, status: "verified", userName: u.name || u.business_name })}
                          disabled={updateStatus.isPending}
                        >
                          <CheckCircle className="h-3.5 w-3.5 mr-1" />
                          Approve
                        </Button>
                      )}
                      {u.verification_status !== "rejected" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => updateStatus.mutate({ userId: u.id, status: "rejected", userName: u.name || u.business_name })}
                          disabled={updateStatus.isPending}
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" />
                          Revoke
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </PageLayout>
  );
};

export default UserManagement;

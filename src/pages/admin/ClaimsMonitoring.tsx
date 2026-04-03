import { useState } from "react";
import PageLayout from "@/components/PageLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Package, User, Building, Clock, CheckCircle, MapPin } from "lucide-react";
import { motion } from "framer-motion";

const statusFilters = ["all", "claimed", "completed", "cancelled"] as const;

const ClaimsMonitoring = () => {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Fetch all claimed/completed donation items with related data
  const { data: claims = [], isLoading } = useQuery({
    queryKey: ["admin_all_claims"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("donation_items")
        .select("*, donation_batches(batch_number, pickup_location, pickup_date, vendor_id)")
        .not("claimed_by", "is", null)
        .order("claimed_at", { ascending: false });

      if (error) throw error;

      // Get unique user IDs (both NGOs and vendors)
      const ngoIds = [...new Set((data || []).map((d: any) => d.claimed_by).filter(Boolean))];
      const vendorIds = [...new Set((data || []).map((d: any) => d.donation_batches?.vendor_id).filter(Boolean))];
      const allUserIds = [...new Set([...ngoIds, ...vendorIds])];

      let profileMap: Record<string, any> = {};
      if (allUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name, business_name, email")
          .in("id", allUserIds);
        (profiles || []).forEach((p: any) => { profileMap[p.id] = p; });
      }

      return (data || []).map((item: any) => ({
        ...item,
        ngo_profile: profileMap[item.claimed_by] || null,
        vendor_profile: profileMap[item.donation_batches?.vendor_id] || null,
      }));
    },
  });

  // Filter claims
  const filtered = claims.filter((c: any) => {
    const matchesFilter = filter === "all" || c.status === filter;
    const searchLower = search.toLowerCase();
    const matchesSearch =
      c.food_name?.toLowerCase().includes(searchLower) ||
      c.ngo_profile?.name?.toLowerCase().includes(searchLower) ||
      c.ngo_profile?.business_name?.toLowerCase().includes(searchLower) ||
      c.vendor_profile?.name?.toLowerCase().includes(searchLower) ||
      c.vendor_profile?.business_name?.toLowerCase().includes(searchLower) ||
      c.donation_batches?.batch_number?.toLowerCase().includes(searchLower);
    return matchesFilter && matchesSearch;
  });

  // Stats
  const stats = {
    total: claims.length,
    pending: claims.filter((c: any) => c.status === "claimed").length,
    completed: claims.filter((c: any) => c.status === "completed").length,
    cancelled: claims.filter((c: any) => c.status === "cancelled" || c.status === "available").length,
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "claimed": return "bg-info/10 text-info border-info/30";
      case "completed": return "bg-success/10 text-success border-success/30";
      case "cancelled": return "bg-destructive/10 text-destructive border-destructive/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <PageLayout title="Claims Monitoring" subtitle="Monitor all claim transactions across the platform">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border bg-card p-4 shadow-card"
        >
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Package className="h-4 w-4" />
            <span className="text-xs">Total Claims</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-xl border border-info/30 bg-info/5 p-4 shadow-card"
        >
          <div className="flex items-center gap-2 text-info mb-1">
            <Clock className="h-4 w-4" />
            <span className="text-xs">Pending Pickup</span>
          </div>
          <p className="text-2xl font-bold text-info">{stats.pending}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-success/30 bg-success/5 p-4 shadow-card"
        >
          <div className="flex items-center gap-2 text-success mb-1">
            <CheckCircle className="h-4 w-4" />
            <span className="text-xs">Completed</span>
          </div>
          <p className="text-2xl font-bold text-success">{stats.completed}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-xl border border-border bg-card p-4 shadow-card"
        >
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Package className="h-4 w-4" />
            <span className="text-xs">Cancelled</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.cancelled}</p>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          {statusFilters.map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                filter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="relative sm:ml-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search claims..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 w-full sm:w-64 text-sm"
          />
        </div>
      </div>

      {/* Claims Table */}
      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Food Item</TableHead>
              <TableHead className="text-xs">Batch</TableHead>
              <TableHead className="text-xs">Vendor</TableHead>
              <TableHead className="text-xs">NGO</TableHead>
              <TableHead className="text-xs">Location</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs">Claimed At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">
                  Loading claims...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">
                  {claims.length === 0 ? "No claims yet" : "No claims match your filters"}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((claim: any) => (
                <TableRow key={claim.id}>
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium">{claim.food_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {claim.quantity} {claim.unit} · {claim.category}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-medium text-primary">
                      {claim.donation_batches?.batch_number || "-"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Building className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm">
                        {claim.vendor_profile?.business_name || claim.vendor_profile?.name || "-"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm">
                        {claim.ngo_profile?.business_name || claim.ngo_profile?.name || "-"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate max-w-[150px]">
                        {claim.donation_batches?.pickup_location || "-"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs capitalize ${statusColor(claim.status)}`}>
                      {claim.status === "claimed" ? "Pending Pickup" : claim.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {claim.claimed_at ? new Date(claim.claimed_at).toLocaleString() : "-"}
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

export default ClaimsMonitoring;

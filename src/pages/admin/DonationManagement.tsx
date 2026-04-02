import { useState } from "react";
import PageLayout from "@/components/PageLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Package, MapPin } from "lucide-react";
import { motion } from "framer-motion";

const statusFilters = ["all", "available", "partially_claimed", "reserved", "completed", "expired", "cancelled"] as const;

const DonationManagement = () => {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const { data: batches = [] } = useQuery({
    queryKey: ["admin_all_batches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("donation_batches")
        .select("*, donation_items(*), profiles:vendor_id(name, email, business_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = batches.filter((b: any) => {
    const matchesFilter = filter === "all" || b.status === filter;
    const matchesSearch = b.batch_number.toLowerCase().includes(search.toLowerCase()) ||
      b.pickup_location.toLowerCase().includes(search.toLowerCase()) ||
      b.profiles?.name?.toLowerCase().includes(search.toLowerCase()) ||
      b.profiles?.business_name?.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const statusColor = (s: string) => {
    switch (s) {
      case "available": return "bg-success/10 text-success";
      case "partially_claimed": return "bg-info/10 text-info";
      case "reserved": return "bg-warning/10 text-warning";
      case "completed": return "bg-primary/10 text-primary";
      case "expired": return "bg-destructive/10 text-destructive";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <PageLayout title="Donation Management" subtitle="View and manage all donation batches across the platform">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          {statusFilters.map(s => (
            <button key={s} onClick={() => setFilter(s)} className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${filter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              {s === "partially_claimed" ? "Partial" : s}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9 w-48 text-sm" />
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((batch: any, i: number) => {
          const items = batch.donation_items || [];
          return (
            <motion.div key={batch.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
              className="rounded-xl border border-border bg-card p-4 shadow-card">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-primary">{batch.batch_number}</span>
                    <span className="text-sm text-foreground">{batch.profiles?.business_name || batch.profiles?.name}</span>
                    <Badge variant="outline" className={`text-xs capitalize ${statusColor(batch.status)}`}>{batch.status}</Badge>
                  </div>
                  <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {batch.pickup_location}</span>
                    <span className="flex items-center gap-1"><Package className="h-3 w-3" /> {items.length} items</span>
                    <span>{batch.pickup_date}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{new Date(batch.created_at).toLocaleDateString()}</p>
              </div>
              {items.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {items.map((item: any) => (
                    <span key={item.id} className={`text-xs px-2 py-0.5 rounded-full ${item.status === "claimed" ? "bg-info/10 text-info" : item.status === "completed" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                      {item.quantity} {item.unit} {item.food_name} ({item.status})
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          );
        })}
        {filtered.length === 0 && <div className="text-center py-12 text-sm text-muted-foreground">No donations found</div>}
      </div>
    </PageLayout>
  );
};

export default DonationManagement;

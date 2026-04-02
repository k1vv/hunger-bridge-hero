import { useState } from "react";
import { Link } from "react-router-dom";
import PageLayout from "@/components/PageLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const statusFilters = ["all", "available", "partially_claimed", "reserved", "completed", "expired", "cancelled"] as const;

const MyDonations = () => {
  const { user } = useAuth();
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data: batches = [] } = useQuery({
    queryKey: ["vendor_batches", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("donation_batches")
        .select("*, donation_items(*)")
        .eq("vendor_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const filtered = batches.filter((b: any) => {
    const matchesFilter = filter === "all" || b.status === filter;
    const matchesSearch = b.batch_number.toLowerCase().includes(search.toLowerCase()) ||
      b.pickup_location.toLowerCase().includes(search.toLowerCase()) ||
      b.donation_items?.some((i: any) => i.food_name.toLowerCase().includes(search.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const statusColor = (s: string) => {
    switch (s) {
      case "available": return "bg-success/10 text-success border-success/20";
      case "partially_claimed": return "bg-info/10 text-info border-info/20";
      case "reserved": return "bg-warning/10 text-warning border-warning/20";
      case "completed": return "bg-primary/10 text-primary border-primary/20";
      case "expired": return "bg-destructive/10 text-destructive border-destructive/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <PageLayout title="My Donations" subtitle="View and manage all your donation batches">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          {statusFilters.map((s) => (
            <button key={s} onClick={() => setFilter(s)} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors capitalize ${filter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
              {s === "partially_claimed" ? "Partial" : s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9 w-48 text-sm" />
          </div>
          <Link to="/vendor/create">
            <Button size="sm" className="h-9"><Plus className="h-4 w-4 mr-1" /> New</Button>
          </Link>
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((batch: any, i: number) => (
          <motion.div key={batch.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
            <Link to={`/vendor/donations/${batch.id}`} className="block rounded-xl border border-border bg-card p-4 shadow-card hover:border-primary/30 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-primary">{batch.batch_number}</span>
                    <Badge variant="outline" className={`text-xs capitalize ${statusColor(batch.status)}`}>{batch.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{batch.pickup_location}</p>
                  <p className="text-xs text-muted-foreground">{batch.donation_items?.length || 0} item(s) · {batch.pickup_date}</p>
                </div>
                <p className="text-xs text-muted-foreground">{new Date(batch.created_at).toLocaleDateString()}</p>
              </div>
              {batch.donation_items && batch.donation_items.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {batch.donation_items.map((item: any) => (
                    <span key={item.id} className={`text-xs px-2 py-0.5 rounded-full ${item.status === "claimed" ? "bg-info/10 text-info" : "bg-muted text-muted-foreground"}`}>
                      {item.quantity} {item.unit} {item.food_name}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          </motion.div>
        ))}
        {filtered.length === 0 && <div className="text-center py-12 text-sm text-muted-foreground">No donations found</div>}
      </div>
    </PageLayout>
  );
};

export default MyDonations;

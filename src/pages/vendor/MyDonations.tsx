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

const statusFilters = ["all", "available", "reserved", "delivered", "expired", "cancelled"] as const;

const MyDonations = () => {
  const { user } = useAuth();
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data: listings = [] } = useQuery({
    queryKey: ["vendor_listings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("food_listings")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const filtered = listings.filter((l) => {
    const matchesFilter = filter === "all" || l.status === filter;
    const matchesSearch = l.title.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const statusColor = (s: string) => {
    switch (s) {
      case "available": return "bg-success/10 text-success border-success/20";
      case "reserved": return "bg-info/10 text-info border-info/20";
      case "delivered": return "bg-primary/10 text-primary border-primary/20";
      case "expired": return "bg-destructive/10 text-destructive border-destructive/20";
      case "cancelled": return "bg-muted text-muted-foreground";
      default: return "";
    }
  };

  return (
    <PageLayout title="My Donations" subtitle="View and manage all your food donations">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          {statusFilters.map((s) => (
            <button key={s} onClick={() => setFilter(s)} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors capitalize ${filter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
              {s}
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
        {filtered.map((item, i) => (
          <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
            <Link to={`/vendor/donations/${item.id}`} className="flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-card hover:border-primary/30 transition-colors">
              <div className="flex items-center gap-3">
                {item.image_url && <img src={item.image_url} alt={item.title} className="h-12 w-12 rounded-lg object-cover" />}
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.category} · {item.quantity} · Expires {item.expiry_date}</p>
                </div>
              </div>
              <Badge variant="outline" className={`text-xs capitalize ${statusColor(item.status)}`}>{item.status}</Badge>
            </Link>
          </motion.div>
        ))}
        {filtered.length === 0 && <div className="text-center py-12 text-sm text-muted-foreground">No donations found</div>}
      </div>
    </PageLayout>
  );
};

export default MyDonations;

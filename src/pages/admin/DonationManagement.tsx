import { useState } from "react";
import PageLayout from "@/components/PageLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { motion } from "framer-motion";

const statusFilters = ["all", "available", "reserved", "delivered", "expired", "cancelled"] as const;

const DonationManagement = () => {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const { data: listings = [] } = useQuery({
    queryKey: ["admin_all_listings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("food_listings").select("*, profiles:user_id(name, email, business_name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = listings.filter((l: any) => {
    const matchesFilter = filter === "all" || l.status === filter;
    const matchesSearch = l.title.toLowerCase().includes(search.toLowerCase()) || l.profiles?.name?.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const statusColor = (s: string) => {
    switch (s) {
      case "available": return "bg-success/10 text-success";
      case "reserved": return "bg-info/10 text-info";
      case "delivered": return "bg-primary/10 text-primary";
      case "expired": return "bg-destructive/10 text-destructive";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <PageLayout title="Donation Management" subtitle="View and manage all donations across the platform">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          {statusFilters.map(s => (
            <button key={s} onClick={() => setFilter(s)} className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${filter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{s}</button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9 w-48 text-sm" />
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((item: any, i: number) => (
          <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
            className="rounded-xl border border-border bg-card p-4 shadow-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {item.image_url && <img src={item.image_url} alt="" className="h-10 w-10 rounded-lg object-cover" />}
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.profiles?.business_name || item.profiles?.name} · {item.category} · {item.quantity}</p>
                </div>
              </div>
              <Badge variant="outline" className={`text-xs capitalize ${statusColor(item.status)}`}>{item.status}</Badge>
            </div>
          </motion.div>
        ))}
        {filtered.length === 0 && <div className="text-center py-12 text-sm text-muted-foreground">No donations found</div>}
      </div>
    </PageLayout>
  );
};

export default DonationManagement;

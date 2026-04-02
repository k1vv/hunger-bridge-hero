import { useState } from "react";
import PageLayout from "@/components/PageLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Clock } from "lucide-react";

const NgoInventory = () => {
  const { user } = useAuth();

  const { data: inventory = [] } = useQuery({
    queryKey: ["ngo_inventory", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory")
        .select("*")
        .eq("ngo_user_id", user!.id)
        .order("received_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return (
    <PageLayout title="Inventory" subtitle="Track received food stock and expiry">
      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Item</TableHead>
              <TableHead className="text-xs">Category</TableHead>
              <TableHead className="text-xs">Received</TableHead>
              <TableHead className="text-xs">Distributed</TableHead>
              <TableHead className="text-xs">Remaining</TableHead>
              <TableHead className="text-xs">Expiry</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inventory.map((item: any) => {
              const daysLeft = item.expiry_date ? Math.ceil((new Date(item.expiry_date).getTime() - Date.now()) / 86400000) : null;
              return (
                <TableRow key={item.id}>
                  <TableCell className="text-sm font-medium">{item.food_title}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{item.category}</TableCell>
                  <TableCell className="text-sm">{item.quantity_received}</TableCell>
                  <TableCell className="text-sm">{item.quantity_distributed}</TableCell>
                  <TableCell className="text-sm">{item.quantity_remaining}</TableCell>
                  <TableCell>
                    {daysLeft !== null && (
                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${daysLeft <= 1 ? "text-destructive" : daysLeft <= 3 ? "text-warning" : "text-success"}`}>
                        {daysLeft <= 1 ? <AlertTriangle className="h-3 w-3" /> : daysLeft <= 3 ? <Clock className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
                        {item.expiry_date}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {inventory.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-sm text-muted-foreground">No inventory records</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </PageLayout>
  );
};

export default NgoInventory;

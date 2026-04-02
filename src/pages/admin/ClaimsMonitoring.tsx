import PageLayout from "@/components/PageLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const ClaimsMonitoring = () => {
  const { data: claims = [] } = useQuery({
    queryKey: ["admin_all_claims"],
    queryFn: async () => {
      const { data, error } = await supabase.from("claims").select("*, food_listings(title, category), profiles:ngo_user_id(name, email)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <PageLayout title="Claims Monitoring" subtitle="Monitor all claim transactions across the platform">
      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Food Item</TableHead>
              <TableHead className="text-xs">NGO</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs">Volunteer</TableHead>
              <TableHead className="text-xs">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {claims.map((claim: any) => (
              <TableRow key={claim.id}>
                <TableCell className="text-sm font-medium">{claim.food_listings?.title}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{claim.profiles?.name || claim.profiles?.email}</TableCell>
                <TableCell><Badge variant="outline" className="text-xs capitalize">{claim.status}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">{claim.volunteer_name || "-"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(claim.created_at).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
            {claims.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-sm text-muted-foreground">No claims yet</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </PageLayout>
  );
};

export default ClaimsMonitoring;

import PageLayout from "@/components/PageLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";

const AuditLogs = () => {
  const { data: logs = [] } = useQuery({
    queryKey: ["audit_logs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data;
    },
  });

  return (
    <PageLayout title="Audit Logs" subtitle="Review important user actions and system events">
      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Action</TableHead>
              <TableHead className="text-xs">Entity</TableHead>
              <TableHead className="text-xs">Details</TableHead>
              <TableHead className="text-xs">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log: any) => (
              <TableRow key={log.id}>
                <TableCell className="text-sm font-medium">{log.action}</TableCell>
                <TableCell><Badge variant="outline" className="text-xs">{log.entity_type || "-"}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{log.details ? JSON.stringify(log.details) : "-"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString()}</TableCell>
              </TableRow>
            ))}
            {logs.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-8 text-sm text-muted-foreground">No audit logs yet</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </PageLayout>
  );
};

export default AuditLogs;

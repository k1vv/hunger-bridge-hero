import { useState } from "react";
import PageLayout from "@/components/PageLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { notifyUserOfComplaintResolution } from "@/lib/notifications";

const Complaints = () => {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [resolution, setResolution] = useState("");

  const { data: complaints = [] } = useQuery({
    queryKey: ["admin_complaints"],
    queryFn: async () => {
      const { data, error } = await supabase.from("complaints").select("*, reporter:reporter_id(name, email)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ id, resolution, reporterId, complaintType }: { id: string; resolution: string; reporterId: string; complaintType: string }) => {
      const { error } = await supabase.from("complaints").update({ status: "resolved", resolution }).eq("id", id);
      if (error) throw error;

      // Notify reporter that their complaint has been resolved
      try {
        await notifyUserOfComplaintResolution(reporterId, complaintType, resolution, id);
      } catch (notifyErr) {
        console.error("Failed to send notification:", notifyErr);
      }
    },
    onSuccess: () => {
      toast.success("Complaint resolved!");
      queryClient.invalidateQueries({ queryKey: ["admin_complaints"] });
      setSelectedId(null);
      setResolution("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <PageLayout title="Complaints" subtitle="Handle disputes and reports">
      <div className="space-y-4">
        {complaints.map((c: any, i: number) => (
          <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground capitalize">{c.complaint_type}</p>
                  <p className="text-xs text-muted-foreground">By: {c.reporter?.name || c.reporter?.email || "Unknown"}</p>
                  <p className="text-sm text-muted-foreground mt-2">{c.description}</p>
                  {c.resolution && <p className="text-xs text-success mt-2">Resolution: {c.resolution}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={`text-xs capitalize ${c.status === "resolved" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>{c.status}</Badge>
                {c.status !== "resolved" && (
                  <Dialog open={selectedId === c.id} onOpenChange={(o) => { if (o) setSelectedId(c.id); else setSelectedId(null); }}>
                    <DialogTrigger asChild><Button size="sm" variant="outline">Resolve</Button></DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Resolve Complaint</DialogTitle></DialogHeader>
                      <Textarea value={resolution} onChange={(e) => setResolution(e.target.value)} placeholder="Enter resolution..." className="mt-2" />
                      <Button onClick={() => resolveMutation.mutate({ id: c.id, resolution, reporterId: c.reporter_id, complaintType: c.complaint_type })} className="mt-2 w-full">Submit Resolution</Button>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
          </motion.div>
        ))}
        {complaints.length === 0 && <div className="text-center py-12 text-sm text-muted-foreground">No complaints</div>}
      </div>
    </PageLayout>
  );
};

export default Complaints;

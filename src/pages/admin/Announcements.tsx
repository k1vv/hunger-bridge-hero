import { useState } from "react";
import PageLayout from "@/components/PageLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Megaphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { notifyUsersOfAnnouncement } from "@/lib/notifications";

const Announcements = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [targetRole, setTargetRole] = useState("all");

  const { data: announcements = [] } = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const { data, error } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from("announcements").insert({
        author_id: user!.id,
        title, content,
        target_role: targetRole === "all" ? null : targetRole,
      }).select("id").single();
      if (error) throw error;

      // Notify users of the new announcement
      try {
        await notifyUsersOfAnnouncement(
          targetRole as "vendor" | "ngo" | "all",
          title,
          content,
          data.id
        );
      } catch (notifyErr) {
        console.error("Failed to send notifications:", notifyErr);
      }

      return data;
    },
    onSuccess: () => {
      toast.success("Announcement published!");
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      setOpen(false);
      setTitle(""); setContent(""); setTargetRole("all");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <PageLayout title="Announcements" subtitle="Send system-wide announcements">
      <div className="flex justify-end mb-6">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Announcement</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Announcement</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
              <div className="space-y-2"><Label>Content</Label><Textarea value={content} onChange={(e) => setContent(e.target.value)} required /></div>
              <div className="space-y-2">
                <Label>Target Audience</Label>
                <Select value={targetRole} onValueChange={setTargetRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="vendor">Vendors Only</SelectItem>
                    <SelectItem value="ngo">NGOs Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => createMutation.mutate()} className="w-full" disabled={createMutation.isPending}>Publish</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {announcements.map((a: any, i: number) => (
          <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
            className="rounded-xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                <Megaphone className="h-5 w-5 text-destructive" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground">{a.title}</h3>
                  {a.target_role && <Badge variant="outline" className="text-xs capitalize">{a.target_role}</Badge>}
                  <Badge variant="outline" className={`text-xs ${a.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>{a.is_active ? "Active" : "Inactive"}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{a.content}</p>
                <p className="text-xs text-muted-foreground mt-2">{new Date(a.created_at).toLocaleString()}</p>
              </div>
            </div>
          </motion.div>
        ))}
        {announcements.length === 0 && <div className="text-center py-12 text-sm text-muted-foreground">No announcements yet</div>}
      </div>
    </PageLayout>
  );
};

export default Announcements;

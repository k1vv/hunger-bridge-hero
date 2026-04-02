import PageLayout from "@/components/PageLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const Notifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("notifications").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      await supabase.from("notifications").update({ is_read: true }).eq("user_id", user!.id).eq("is_read", false);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unread = notifications.filter((n: any) => !n.is_read).length;

  return (
    <PageLayout title="Notifications" subtitle={`${unread} unread`}>
      {unread > 0 && (
        <div className="flex justify-end mb-4">
          <Button size="sm" variant="outline" onClick={() => markAllRead.mutate()}>
            <Check className="h-4 w-4 mr-1" /> Mark all read
          </Button>
        </div>
      )}
      <div className="space-y-3">
        {notifications.map((n: any, i: number) => (
          <motion.div key={n.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
            onClick={() => !n.is_read && markRead.mutate(n.id)}
            className={`rounded-xl border bg-card p-4 shadow-card cursor-pointer transition-colors ${n.is_read ? "border-border opacity-70" : "border-primary/30 bg-primary/5"}`}>
            <div className="flex items-start gap-3">
              <Bell className={`h-4 w-4 mt-0.5 ${n.is_read ? "text-muted-foreground" : "text-primary"}`} />
              <div>
                <p className="text-sm font-semibold text-foreground">{n.title}</p>
                {n.message && <p className="text-xs text-muted-foreground mt-1">{n.message}</p>}
                <p className="text-xs text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</p>
              </div>
            </div>
          </motion.div>
        ))}
        {notifications.length === 0 && <div className="text-center py-12 text-sm text-muted-foreground">No notifications</div>}
      </div>
    </PageLayout>
  );
};

export default Notifications;

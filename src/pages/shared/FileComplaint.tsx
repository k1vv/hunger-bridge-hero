import { useState } from "react";
import PageLayout from "@/components/PageLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { AlertCircle, Plus, Clock, CheckCircle, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const complaintTypes = [
  { value: "donation_issue", label: "Donation Issue" },
  { value: "pickup_issue", label: "Pickup/Collection Issue" },
  { value: "user_behavior", label: "User Behavior" },
  { value: "platform_bug", label: "Platform Bug" },
  { value: "other", label: "Other" },
];

const FileComplaint = () => {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [complaintType, setComplaintType] = useState("");
  const [description, setDescription] = useState("");
  const [relatedEntityId, setRelatedEntityId] = useState("");

  // Fetch user's complaints
  const { data: complaints = [], isLoading } = useQuery({
    queryKey: ["my_complaints", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("complaints")
        .select("*")
        .eq("reporter_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Submit complaint mutation
  const submitComplaint = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("complaints").insert({
        reporter_id: user!.id,
        complaint_type: complaintType,
        description,
        related_entity_id: relatedEntityId || null,
        related_entity_type: relatedEntityId ? "general" : null,
        status: "pending",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Complaint submitted successfully. Admin will review it shortly.");
      queryClient.invalidateQueries({ queryKey: ["my_complaints"] });
      setDialogOpen(false);
      setComplaintType("");
      setDescription("");
      setRelatedEntityId("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaintType || !description.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }
    submitComplaint.mutate();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "resolved":
        return <CheckCircle className="h-4 w-4 text-success" />;
      case "pending":
        return <Clock className="h-4 w-4 text-warning" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "resolved":
        return "bg-success/10 text-success border-success/30";
      case "pending":
        return "bg-warning/10 text-warning border-warning/30";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <PageLayout
      title="File Complaint"
      subtitle="Report issues or concerns to the admin team"
    >
      {/* New Complaint Button */}
      <div className="mb-6">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Complaint
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>File a Complaint</DialogTitle>
              <DialogDescription>
                Describe your issue and we'll review it as soon as possible.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="type">Complaint Type *</Label>
                <Select value={complaintType} onValueChange={setComplaintType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select complaint type" />
                  </SelectTrigger>
                  <SelectContent>
                    {complaintTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Please describe your issue in detail..."
                  rows={4}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="relatedId">Reference ID (optional)</Label>
                <Input
                  id="relatedId"
                  value={relatedEntityId}
                  onChange={(e) => setRelatedEntityId(e.target.value)}
                  placeholder="e.g., Batch number, Order ID"
                />
                <p className="text-xs text-muted-foreground">
                  If this relates to a specific donation or transaction, enter the reference ID
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitComplaint.isPending}
                  className="flex-1"
                >
                  {submitComplaint.isPending ? "Submitting..." : "Submit Complaint"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* My Complaints List */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground">My Complaints</h2>

        {isLoading ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            Loading complaints...
          </div>
        ) : complaints.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              You haven't filed any complaints yet.
            </p>
          </div>
        ) : (
          complaints.map((complaint: any, i: number) => (
            <motion.div
              key={complaint.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-border bg-card p-5 shadow-card"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-foreground capitalize">
                        {complaint.complaint_type.replace(/_/g, " ")}
                      </p>
                      <Badge
                        variant="outline"
                        className={`text-xs capitalize ${getStatusColor(complaint.status)}`}
                      >
                        {getStatusIcon(complaint.status)}
                        <span className="ml-1">{complaint.status}</span>
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {complaint.description}
                    </p>
                    {complaint.related_entity_id && (
                      <p className="text-xs text-muted-foreground">
                        Reference: {complaint.related_entity_id}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      Filed on {new Date(complaint.created_at).toLocaleDateString()} at{" "}
                      {new Date(complaint.created_at).toLocaleTimeString()}
                    </p>

                    {complaint.status === "resolved" && complaint.resolution && (
                      <div className="mt-3 p-3 rounded-lg bg-success/5 border border-success/20">
                        <p className="text-xs font-medium text-success mb-1">Resolution:</p>
                        <p className="text-sm text-foreground">{complaint.resolution}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </PageLayout>
  );
};

export default FileComplaint;

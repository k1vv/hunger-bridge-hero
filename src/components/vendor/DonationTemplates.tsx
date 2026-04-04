import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Bookmark, Plus, Trash2, Copy, MapPin, Clock, Phone, User } from "lucide-react";

export interface TemplateItem {
  foodName: string;
  category: string;
  quantity: string;
  unit: string;
  storageCondition: string;
  halalStatus: string;
}

export interface DonationTemplate {
  id: string;
  name: string;
  pickup_location?: string;
  pickup_lat?: number;
  pickup_lng?: number;
  pickup_time_start?: string;
  pickup_time_end?: string;
  contact_person?: string;
  contact_phone?: string;
  items: TemplateItem[];
  created_at: string;
}

interface DonationTemplatesProps {
  onSelectTemplate: (template: DonationTemplate) => void;
  currentItems?: TemplateItem[];
  currentLocation?: {
    address: string;
    lat: number | null;
    lng: number | null;
  };
  currentPickupTimeStart?: string;
  currentPickupTimeEnd?: string;
  currentContactPerson?: string;
  currentContactPhone?: string;
}

const DonationTemplates = ({
  onSelectTemplate,
  currentItems = [],
  currentLocation,
  currentPickupTimeStart,
  currentPickupTimeEnd,
  currentContactPerson,
  currentContactPhone,
}: DonationTemplatesProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [templateName, setTemplateName] = useState("");

  // Fetch templates
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["donation_templates", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("donation_templates")
        .select("*")
        .eq("vendor_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data.map((t: any) => ({
        ...t,
        items: t.items || [],
      })) as DonationTemplate[];
    },
    enabled: !!user,
  });

  // Save template mutation
  const saveTemplateMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!name.trim()) throw new Error("Template name is required");
      if (currentItems.length === 0) throw new Error("Add at least one item to save as template");

      const { error } = await supabase.from("donation_templates" as any).insert({
        vendor_id: user!.id,
        name: name.trim(),
        pickup_location: currentLocation?.address || null,
        pickup_lat: currentLocation?.lat || null,
        pickup_lng: currentLocation?.lng || null,
        pickup_time_start: currentPickupTimeStart || null,
        pickup_time_end: currentPickupTimeEnd || null,
        contact_person: currentContactPerson || null,
        contact_phone: currentContactPhone || null,
        items: currentItems,
      } as any);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Template saved!");
      queryClient.invalidateQueries({ queryKey: ["donation_templates"] });
      setShowSaveDialog(false);
      setTemplateName("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("donation_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Template deleted");
      queryClient.invalidateQueries({ queryKey: ["donation_templates"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleUseTemplate = (template: DonationTemplate) => {
    onSelectTemplate(template);
    toast.success(`Loaded template: ${template.name}`);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bookmark className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold text-foreground">Saved Templates</h3>
        </div>

        <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" disabled={currentItems.length === 0}>
              <Plus className="h-4 w-4 mr-1" /> Save Current
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save as Template</DialogTitle>
              <DialogDescription>
                Save your current donation settings as a template for quick reuse.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Template Name *</Label>
                <Input
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g. Weekly Bakery Donation"
                />
              </div>
              <div className="text-sm text-muted-foreground">
                <p className="font-medium mb-1">This template will include:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>{currentItems.length} food item(s)</li>
                  {currentLocation?.address && <li>Pickup location</li>}
                  {(currentPickupTimeStart || currentPickupTimeEnd) && <li>Pickup time window</li>}
                  {currentContactPerson && <li>Contact information</li>}
                </ul>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => saveTemplateMutation.mutate(templateName)}
                disabled={!templateName.trim() || saveTemplateMutation.isPending}
              >
                {saveTemplateMutation.isPending ? "Saving..." : "Save Template"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground text-center py-4">Loading templates...</div>
      ) : templates.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-4">
          No templates saved yet. Fill in your donation details and click "Save Current" to create a template.
        </div>
      ) : (
        <div className="space-y-2">
          {templates.map((template, idx) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-accent/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{template.name}</p>
                <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Copy className="h-3 w-3" /> {template.items.length} items
                  </span>
                  {template.pickup_location && (
                    <span className="flex items-center gap-1 truncate max-w-[120px]">
                      <MapPin className="h-3 w-3" /> {template.pickup_location}
                    </span>
                  )}
                  {template.pickup_time_start && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {template.pickup_time_start}
                      {template.pickup_time_end && `-${template.pickup_time_end}`}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 ml-2">
                <Button size="sm" variant="outline" onClick={() => handleUseTemplate(template)}>
                  Use
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="ghost" className="text-destructive h-8 w-8 p-0">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Template</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{template.name}"? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteTemplateMutation.mutate(template.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DonationTemplates;

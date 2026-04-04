import { useParams, useNavigate, Link } from "react-router-dom";
import PageLayout from "@/components/PageLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trash2, MapPin, Clock, Package, Leaf, Thermometer, Phone, User, Calendar, Edit, DollarSign, FileText } from "lucide-react";
import { motion } from "framer-motion";

/* Get item value from database */
const getItemValue = (item: any): number => {
  return item.estimated_value ?? 0;
};

const DonationDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: batch, isLoading } = useQuery({
    queryKey: ["donation_batch", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("donation_batches")
        .select("*, donation_items(*)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("donation_batches").delete().eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Donation batch deleted");
      queryClient.invalidateQueries({ queryKey: ["vendor_batches"] });
      navigate("/vendor/donations");
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (isLoading) return <PageLayout title="Loading..."><div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div></PageLayout>;
  if (!batch) return <PageLayout title="Not Found"><p className="text-muted-foreground">Donation batch not found.</p></PageLayout>;

  const canEdit = batch.status === "available" && batch.vendor_id === user?.id;
  const canDelete = batch.status === "available" && batch.vendor_id === user?.id;
  const items = (batch as any).donation_items || [];
  const totalEstimatedValue = items.reduce((sum: number, item: any) => sum + getItemValue(item), 0);

  const spoilageColor = (risk: string) => {
    switch (risk) {
      case "high": case "expired": return "text-destructive bg-destructive/10";
      case "medium": return "text-warning bg-warning/10";
      default: return "text-success bg-success/10";
    }
  };

  return (
    <PageLayout title={`Batch ${batch.batch_number}`} subtitle="Donation batch details">
      <div className="max-w-3xl space-y-6">
        {/* Action bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <Badge variant="outline" className="text-sm capitalize">{batch.status}</Badge>
          <Badge variant="outline" className="text-sm capitalize">{batch.donation_type}</Badge>
          <div className="flex-1" />
          {canEdit && (
            <Link to={`/vendor/donations/${batch.id}/edit`}>
              <Button size="sm" variant="outline"><Edit className="h-4 w-4 mr-1" /> Edit Batch</Button>
            </Link>
          )}
          {canDelete && (
            <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate()}>
              <Trash2 className="h-4 w-4 mr-1" /> Delete
            </Button>
          )}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <Package className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-lg font-bold text-foreground">{items.length}</p>
            <p className="text-xs text-muted-foreground">Items</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <DollarSign className="h-5 w-5 mx-auto text-success mb-1" />
            <p className="text-lg font-bold text-foreground">RM {totalEstimatedValue.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Est. Value</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <Calendar className="h-5 w-5 mx-auto text-info mb-1" />
            <p className="text-lg font-bold text-foreground">{batch.pickup_date}</p>
            <p className="text-xs text-muted-foreground">Pickup Date</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <Clock className="h-5 w-5 mx-auto text-warning mb-1" />
            <p className="text-lg font-bold text-foreground">
              {batch.pickup_time_start && batch.pickup_time_end
                ? `${batch.pickup_time_start.slice(0, 5)} - ${batch.pickup_time_end.slice(0, 5)}`
                : "Flexible"}
            </p>
            <p className="text-xs text-muted-foreground">Pickup Time</p>
          </div>
        </div>

        {/* Pickup Information */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Pickup Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <p className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-4 w-4 flex-shrink-0" /> {batch.pickup_location}</p>
            <p className="flex items-center gap-2 text-muted-foreground"><Calendar className="h-4 w-4" /> {batch.pickup_date}</p>
            {batch.pickup_time_start && (
              <p className="flex items-center gap-2 text-muted-foreground"><Clock className="h-4 w-4" /> {batch.pickup_time_start} - {batch.pickup_time_end}</p>
            )}
            {batch.contact_person && <p className="flex items-center gap-2 text-muted-foreground"><User className="h-4 w-4" /> {batch.contact_person}</p>}
            {batch.contact_phone && <p className="flex items-center gap-2 text-muted-foreground"><Phone className="h-4 w-4" /> {batch.contact_phone}</p>}
          </div>
        </div>

        {/* Notes */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-2">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <FileText className="h-4 w-4" /> Notes
          </h3>
          <p className={`text-sm ${batch.notes ? "text-muted-foreground" : "text-muted-foreground/50 italic"}`}>
            {batch.notes || "No notes"}
          </p>
        </div>

        {/* Estimated Value Breakdown */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <DollarSign className="h-4 w-4" /> Estimated Value Breakdown
          </h3>
          <div className="space-y-2">
            {items.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{item.food_name} ({item.quantity} {item.unit})</span>
                <span className="font-medium text-foreground">RM {getItemValue(item).toFixed(2)}</span>
              </div>
            ))}
            <div className="border-t border-border pt-2 flex items-center justify-between text-sm font-semibold">
              <span className="text-foreground">Total Estimated Value</span>
              <span className="text-success">RM {totalEstimatedValue.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Food Items ({items.length})</h3>
          {items.map((item: any, i: number) => (
            <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-border bg-card p-4 shadow-card">
              <div className="flex items-start gap-3">
                {item.image_url && <img src={item.image_url} alt={item.food_name} className="h-16 w-16 rounded-lg object-cover flex-shrink-0" />}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-foreground">{item.food_name}</h4>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs capitalize">{item.status}</Badge>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${spoilageColor(item.spoilage_risk)}`}>{item.spoilage_risk}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Package className="h-3 w-3" /> {item.quantity} {item.unit} · {item.category}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Exp: {item.expiry_date}{item.expiry_time && ` ${item.expiry_time}`}</span>
                    <span className="flex items-center gap-1"><Thermometer className="h-3 w-3" /> {item.storage_condition?.replace("_", " ")}</span>
                    <span className="flex items-center gap-1"><Leaf className="h-3 w-3" /> {item.halal_status}</span>
                  </div>
                  {item.notes && <p className="text-xs text-muted-foreground mt-1 italic">{item.notes}</p>}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </PageLayout>
  );
};

export default DonationDetails;

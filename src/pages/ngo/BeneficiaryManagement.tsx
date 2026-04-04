import { useState } from "react";
import PageLayout from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Plus,
  Phone,
  MapPin,
  Edit,
  Trash2,
  User,
  Users,
  Search,
  Home,
  History,
  Package,
} from "lucide-react";

const BENEFICIARY_CATEGORIES = [
  { value: "general", label: "General" },
  { value: "elderly", label: "Elderly" },
  { value: "family", label: "Family" },
  { value: "student", label: "Student" },
  { value: "disabled", label: "Disabled" },
  { value: "refugee", label: "Refugee" },
  { value: "homeless", label: "Homeless" },
  { value: "orphanage", label: "Orphanage" },
];

interface BeneficiaryForm {
  name: string;
  phone: string;
  household_size: number;
  category: string;
  address: string;
  notes: string;
}

const emptyForm: BeneficiaryForm = {
  name: "",
  phone: "",
  household_size: 1,
  category: "general",
  address: "",
  notes: "",
};

const BeneficiaryManagement = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingBeneficiary, setEditingBeneficiary] = useState<any>(null);
  const [deleteBeneficiary, setDeleteBeneficiary] = useState<any>(null);
  const [viewHistory, setViewHistory] = useState<any>(null);
  const [form, setForm] = useState<BeneficiaryForm>(emptyForm);

  // Fetch beneficiaries
  const { data: beneficiaries = [], isLoading } = useQuery({
    queryKey: ["ngo_beneficiaries", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("beneficiaries")
        .select("*")
        .eq("ngo_id", user!.id)
        .order("name", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch distribution history for a beneficiary
  const { data: distributionHistory = [] } = useQuery({
    queryKey: ["beneficiary_history", viewHistory?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("distribution_beneficiaries")
        .select("*, distribution_records(distribution_date, distribution_type, notes)")
        .eq("beneficiary_id", viewHistory!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!viewHistory?.id,
  });

  // Add/Edit beneficiary mutation
  const saveMutation = useMutation({
    mutationFn: async (data: BeneficiaryForm & { id?: string }) => {
      if (data.id) {
        const { error } = await supabase
          .from("beneficiaries")
          .update({
            name: data.name,
            phone: data.phone || null,
            household_size: data.household_size,
            category: data.category,
            address: data.address || null,
            notes: data.notes || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("beneficiaries").insert({
          ngo_id: user!.id,
          name: data.name,
          phone: data.phone || null,
          household_size: data.household_size,
          category: data.category,
          address: data.address || null,
          notes: data.notes || null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingBeneficiary ? "Beneficiary updated" : "Beneficiary added");
      queryClient.invalidateQueries({ queryKey: ["ngo_beneficiaries"] });
      setShowAddDialog(false);
      setEditingBeneficiary(null);
      setForm(emptyForm);
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Delete beneficiary mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("beneficiaries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Beneficiary removed");
      queryClient.invalidateQueries({ queryKey: ["ngo_beneficiaries"] });
      setDeleteBeneficiary(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Toggle active status
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("beneficiaries")
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ngo_beneficiaries"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) {
      toast.error("Name is required");
      return;
    }
    saveMutation.mutate({ ...form, id: editingBeneficiary?.id });
  };

  const openEditDialog = (beneficiary: any) => {
    setEditingBeneficiary(beneficiary);
    setForm({
      name: beneficiary.name,
      phone: beneficiary.phone || "",
      household_size: beneficiary.household_size || 1,
      category: beneficiary.category || "general",
      address: beneficiary.address || "",
      notes: beneficiary.notes || "",
    });
    setShowAddDialog(true);
  };

  const openAddDialog = () => {
    setEditingBeneficiary(null);
    setForm(emptyForm);
    setShowAddDialog(true);
  };

  // Filter beneficiaries
  const filteredBeneficiaries = beneficiaries.filter((b: any) => {
    const matchesSearch =
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.phone && b.phone.includes(searchQuery));
    const matchesCategory = categoryFilter === "all" || b.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const activeCount = beneficiaries.filter((b: any) => b.is_active).length;
  const totalHouseholds = beneficiaries.reduce(
    (sum: number, b: any) => sum + (b.household_size || 1),
    0
  );

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "elderly":
        return "bg-purple-100 text-purple-700";
      case "family":
        return "bg-blue-100 text-blue-700";
      case "student":
        return "bg-green-100 text-green-700";
      case "disabled":
        return "bg-orange-100 text-orange-700";
      case "refugee":
        return "bg-red-100 text-red-700";
      case "homeless":
        return "bg-gray-100 text-gray-700";
      case "orphanage":
        return "bg-pink-100 text-pink-700";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (isLoading) {
    return (
      <PageLayout title="Beneficiary Management" subtitle="Loading...">
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Beneficiary Management"
      subtitle="Register and manage food aid recipients"
    >
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <Users className="h-5 w-5 mx-auto text-primary mb-1" />
          <p className="text-lg font-bold text-foreground">{beneficiaries.length}</p>
          <p className="text-xs text-muted-foreground">Total Registered</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <User className="h-5 w-5 mx-auto text-success mb-1" />
          <p className="text-lg font-bold text-foreground">{activeCount}</p>
          <p className="text-xs text-muted-foreground">Active</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <Home className="h-5 w-5 mx-auto text-accent mb-1" />
          <p className="text-lg font-bold text-foreground">{totalHouseholds}</p>
          <p className="text-xs text-muted-foreground">Total Household Members</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <Package className="h-5 w-5 mx-auto text-info mb-1" />
          <p className="text-lg font-bold text-foreground">
            {BENEFICIARY_CATEGORIES.filter(
              (c) => beneficiaries.some((b: any) => b.category === c.value)
            ).length}
          </p>
          <p className="text-xs text-muted-foreground">Categories Served</p>
        </div>
      </div>

      {/* Search, Filter and Add */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {BENEFICIARY_CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={openAddDialog}>
          <Plus className="h-4 w-4 mr-1" /> Add Beneficiary
        </Button>
      </div>

      {/* Beneficiary List */}
      <div className="space-y-3">
        {filteredBeneficiaries.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            {searchQuery || categoryFilter !== "all"
              ? "No beneficiaries found matching your search"
              : "No beneficiaries registered yet. Add your first beneficiary to get started."}
          </div>
        ) : (
          filteredBeneficiaries.map((beneficiary: any, i: number) => (
            <motion.div
              key={beneficiary.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className={`rounded-xl border bg-card p-4 shadow-card ${
                beneficiary.is_active
                  ? "border-border"
                  : "border-muted bg-muted/30 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      beneficiary.is_active ? "bg-primary/10" : "bg-muted"
                    }`}
                  >
                    <User
                      className={`h-5 w-5 ${
                        beneficiary.is_active
                          ? "text-primary"
                          : "text-muted-foreground"
                      }`}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">
                        {beneficiary.name}
                      </h3>
                      <Badge
                        variant="outline"
                        className={`text-xs capitalize ${getCategoryColor(
                          beneficiary.category
                        )}`}
                      >
                        {beneficiary.category}
                      </Badge>
                      {!beneficiary.is_active && (
                        <Badge variant="outline" className="text-xs">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                      {beneficiary.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {beneficiary.phone}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Home className="h-3 w-3" /> {beneficiary.household_size} member(s)
                      </span>
                      {beneficiary.address && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {beneficiary.address}
                        </span>
                      )}
                    </div>
                    {beneficiary.notes && (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        {beneficiary.notes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    title="View History"
                    onClick={() => setViewHistory(beneficiary)}
                  >
                    <History className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      toggleActiveMutation.mutate({
                        id: beneficiary.id,
                        is_active: !beneficiary.is_active,
                      })
                    }
                  >
                    {beneficiary.is_active ? "Deactivate" : "Activate"}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => openEditDialog(beneficiary)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleteBeneficiary(beneficiary)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingBeneficiary ? "Edit Beneficiary" : "Add Beneficiary"}
            </DialogTitle>
            <DialogDescription>
              {editingBeneficiary
                ? "Update beneficiary information"
                : "Register a new beneficiary"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Full name"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="012-3456789"
                />
              </div>
              <div className="space-y-2">
                <Label>Household Size</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.household_size}
                  onChange={(e) =>
                    setForm({ ...form, household_size: parseInt(e.target.value) || 1 })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BENEFICIARY_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Optional address"
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Any additional notes..."
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending
                  ? "Saving..."
                  : editingBeneficiary
                  ? "Update"
                  : "Add Beneficiary"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View History Dialog */}
      <Dialog open={!!viewHistory} onOpenChange={() => setViewHistory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Distribution History</DialogTitle>
            <DialogDescription>
              Food aid received by {viewHistory?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[300px] overflow-y-auto space-y-3">
            {distributionHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No distribution records yet
              </p>
            ) : (
              distributionHistory.map((record: any) => (
                <div
                  key={record.id}
                  className="rounded-lg border border-border p-3 text-sm"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-foreground">
                      {new Date(
                        record.distribution_records?.distribution_date
                      ).toLocaleDateString()}
                    </span>
                    <Badge variant="outline" className="text-xs capitalize">
                      {record.distribution_records?.distribution_type}
                    </Badge>
                  </div>
                  {record.items_received && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(record.items_received as any[]).map((item: any, i: number) => (
                        <span
                          key={i}
                          className="text-xs bg-muted px-2 py-0.5 rounded-full"
                        >
                          {item.quantity} {item.unit} {item.item_name}
                        </span>
                      ))}
                    </div>
                  )}
                  {record.notes && (
                    <p className="text-xs text-muted-foreground mt-1 italic">
                      {record.notes}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewHistory(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteBeneficiary}
        onOpenChange={() => setDeleteBeneficiary(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Beneficiary</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {deleteBeneficiary?.name}? This will
              also remove their distribution history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteMutation.mutate(deleteBeneficiary.id)}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
};

export default BeneficiaryManagement;

import { useState } from "react";
import PageLayout from "@/components/PageLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  Clock,
  CheckCircle,
  Trash2,
  Edit,
  Archive,
  TrendingDown,
  Calendar,
  Thermometer,
  Filter,
  History,
  BarChart3,
  AlertCircle,
  ArrowUpDown,
  User,
  Store,
  Gift,
  ShoppingCart,
} from "lucide-react";
import { logger } from "@/lib/logger";

// Storage types
const STORAGE_TYPES = ["Room Temperature", "Chilled", "Frozen", "Dry Storage"];
const CATEGORIES = ["Vegetables", "Fruits", "Bakery", "Dairy", "Grains", "Canned", "Frozen", "Cooked", "Beverage", "Ready-to-eat", "Other"];
const ITEM_CONDITIONS = ["Excellent", "Good", "Fair", "Poor"];
const WASTE_REASONS = ["Expired", "Spoiled", "Not Collected", "Storage Issue", "Damaged", "Other"];

// Helper functions
const getExpiryUrgency = (expiryDate: string | null): { level: "urgent" | "medium" | "safe" | "expired"; hoursLeft: number | null } => {
  if (!expiryDate) return { level: "safe", hoursLeft: null };
  const now = Date.now();
  const expiry = new Date(expiryDate).getTime();
  const hoursLeft = Math.floor((expiry - now) / (1000 * 60 * 60));

  if (hoursLeft < 0) return { level: "expired", hoursLeft };
  if (hoursLeft <= 6) return { level: "urgent", hoursLeft };
  if (hoursLeft <= 24) return { level: "medium", hoursLeft };
  return { level: "safe", hoursLeft };
};

const formatTimeLeft = (hoursLeft: number | null): string => {
  if (hoursLeft === null) return "No expiry";
  if (hoursLeft < 0) return "Expired";
  if (hoursLeft < 1) return "< 1 hour";
  if (hoursLeft < 24) return `${hoursLeft}h left`;
  const days = Math.floor(hoursLeft / 24);
  return `${days}d left`;
};

const NgoInventory = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // State
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [storageFilter, setStorageFilter] = useState("all");
  const [expiryFilter, setExpiryFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"expiry" | "received" | "name">("expiry");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Form state for adding/editing
  const [formData, setFormData] = useState({
    food_title: "",
    category: "",
    quantity_received: "",
    quantity_remaining: "",
    expiry_date: "",
    storage_type: "Room Temperature",
    condition: "Good",
    notes: "",
    source_type: "manual", // manual, donation, or purchase
    source_name: "", // donor name or where it came from
  });

  // Fetch inventory
  const { data: inventory = [], isLoading } = useQuery({
    queryKey: ["ngo_inventory", user?.id],
    queryFn: async () => {
      logger.ngo.info("Fetching inventory", undefined, user?.id);
      const { data, error } = await supabase
        .from("inventory")
        .select("*")
        .eq("ngo_user_id", user!.id)
        .order("received_at", { ascending: false });
      if (error) {
        logger.ngo.error("Failed to fetch inventory", error.message, { code: error.code }, user?.id);
        throw error;
      }
      logger.ngo.info("Successfully fetched inventory", { count: data?.length || 0 }, user?.id);
      return data;
    },
    enabled: !!user,
  });

  // Fetch inventory history/logs
  const { data: inventoryLogs = [] } = useQuery({
    queryKey: ["ngo_inventory_logs", user?.id],
    queryFn: async () => {
      // For now, we'll use distribution_records as logs
      const { data, error } = await supabase
        .from("distribution_records")
        .select("*")
        .eq("ngo_user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Add inventory item mutation
  const addItemMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      logger.ngo.info("Adding inventory item", { foodTitle: data.food_title, source: data.source_name }, user?.id);

      // Store source info in notes as JSON
      const notesData = JSON.stringify({
        source_type: data.source_type,
        source_name: data.source_name || "Manual Entry",
        condition: data.condition,
        storage_type: data.storage_type,
        user_notes: data.notes,
      });

      const { error } = await supabase.from("inventory").insert({
        ngo_user_id: user!.id,
        food_title: data.food_title,
        category: data.category,
        quantity_received: data.quantity_received,
        quantity_remaining: data.quantity_remaining || data.quantity_received,
        expiry_date: data.expiry_date || null,
        notes: notesData,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Item added to inventory!");
      queryClient.invalidateQueries({ queryKey: ["ngo_inventory"] });
      setShowAddDialog(false);
      resetForm();
    },
    onError: (err: any) => {
      logger.ngo.error("Failed to add inventory item", err.message, {}, user?.id);
      toast.error(err.message);
    },
  });

  // Update inventory item mutation
  const updateItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      logger.ngo.info("Updating inventory item", { itemId: id }, user?.id);
      const { error } = await supabase.from("inventory").update({
        food_title: data.food_title,
        category: data.category,
        quantity_received: data.quantity_received,
        quantity_remaining: data.quantity_remaining,
        expiry_date: data.expiry_date || null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Item updated!");
      queryClient.invalidateQueries({ queryKey: ["ngo_inventory"] });
      setEditingItem(null);
      resetForm();
    },
    onError: (err: any) => {
      logger.ngo.error("Failed to update inventory item", err.message, {}, user?.id);
      toast.error(err.message);
    },
  });

  // Delete inventory item mutation
  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      logger.ngo.info("Deleting inventory item", { itemId: id }, user?.id);
      const { error } = await supabase.from("inventory").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Item deleted!");
      queryClient.invalidateQueries({ queryKey: ["ngo_inventory"] });
    },
    onError: (err: any) => {
      logger.ngo.error("Failed to delete inventory item", err.message, {}, user?.id);
      toast.error(err.message);
    },
  });

  // Mark as expired/wasted mutation
  const markAsWastedMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      logger.ngo.info("Marking item as wasted", { itemId: id, reason }, user?.id);
      // Update quantity_remaining to 0 and log the waste
      const { error } = await supabase.from("inventory").update({
        quantity_remaining: "0",
      }).eq("id", id);
      if (error) throw error;

      // Log the waste in distribution_records
      await supabase.from("distribution_records").insert({
        ngo_user_id: user!.id,
        beneficiary_group: `WASTE: ${reason}`,
        quantity_distributed: "0",
        notes: `Item wasted - Reason: ${reason}`,
      });
    },
    onSuccess: () => {
      toast.success("Item marked as wasted");
      queryClient.invalidateQueries({ queryKey: ["ngo_inventory"] });
      queryClient.invalidateQueries({ queryKey: ["ngo_inventory_logs"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const resetForm = () => {
    setFormData({
      food_title: "",
      category: "",
      quantity_received: "",
      quantity_remaining: "",
      expiry_date: "",
      storage_type: "Room Temperature",
      condition: "Good",
      notes: "",
      source_type: "manual",
      source_name: "",
    });
  };

  // Parse source info from the item (stored in notes as JSON)
  const parseSourceInfo = (item: any): { type: string; name: string; condition?: string; storageType?: string; userNotes?: string } => {
    // Check if item has vendor info from joined data
    if (item.vendor_name) {
      return { type: "donation", name: item.vendor_name };
    }
    // Check if source is stored in notes as JSON
    if (item.notes) {
      try {
        const parsed = JSON.parse(item.notes);
        if (parsed.source_type && parsed.source_name) {
          return {
            type: parsed.source_type,
            name: parsed.source_name,
            condition: parsed.condition,
            storageType: parsed.storage_type,
            userNotes: parsed.user_notes,
          };
        }
      } catch {
        // Not JSON, might be regular notes
      }
    }
    return { type: "manual", name: "Manual Entry" };
  };

  // Get icon for source type
  const getSourceIcon = (type: string) => {
    switch (type) {
      case "donation": return Gift;
      case "purchase": return ShoppingCart;
      case "transfer": return Store;
      default: return User;
    }
  };

  // Get label for source type
  const getSourceLabel = (type: string) => {
    switch (type) {
      case "donation": return "Donated by";
      case "purchase": return "Purchased from";
      case "transfer": return "Transferred from";
      default: return "Added by";
    }
  };

  const handleEdit = (item: any) => {
    const sourceInfo = parseSourceInfo(item);
    setEditingItem(item);
    setFormData({
      food_title: item.food_title || "",
      category: item.category || "",
      quantity_received: item.quantity_received || "",
      quantity_remaining: item.quantity_remaining || "",
      expiry_date: item.expiry_date || "",
      storage_type: "Room Temperature",
      condition: "Good",
      notes: "",
      source_type: sourceInfo.type,
      source_name: sourceInfo.name,
    });
  };

  // Calculate dashboard metrics
  const metrics = {
    totalItems: inventory.length,
    totalStock: inventory.reduce((sum, item) => sum + (parseFloat(item.quantity_remaining) || 0), 0),
    expiringSoon: inventory.filter(item => {
      const { level } = getExpiryUrgency(item.expiry_date);
      return level === "urgent" || level === "medium";
    }).length,
    expired: inventory.filter(item => getExpiryUrgency(item.expiry_date).level === "expired").length,
    lowStock: inventory.filter(item => {
      const remaining = parseFloat(item.quantity_remaining) || 0;
      const received = parseFloat(item.quantity_received) || 1;
      return remaining / received < 0.2 && remaining > 0;
    }).length,
    categoryBreakdown: inventory.reduce((acc: Record<string, number>, item) => {
      const cat = item.category || "Other";
      acc[cat] = (acc[cat] || 0) + (parseFloat(item.quantity_remaining) || 0);
      return acc;
    }, {}),
  };

  // Filter and sort inventory
  const filteredInventory = inventory
    .filter(item => {
      const matchesSearch = item.food_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
      const matchesExpiry = expiryFilter === "all" || getExpiryUrgency(item.expiry_date).level === expiryFilter;
      return matchesSearch && matchesCategory && matchesExpiry;
    })
    .sort((a, b) => {
      if (sortBy === "expiry") {
        const aExpiry = a.expiry_date ? new Date(a.expiry_date).getTime() : Infinity;
        const bExpiry = b.expiry_date ? new Date(b.expiry_date).getTime() : Infinity;
        return aExpiry - bExpiry; // FIFO - earliest expiry first
      }
      if (sortBy === "received") {
        return new Date(b.received_at).getTime() - new Date(a.received_at).getTime();
      }
      return (a.food_title || "").localeCompare(b.food_title || "");
    });

  return (
    <PageLayout title="Inventory Management" subtitle="Track, manage, and optimize your food stock">
      {/* Dashboard Section */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card p-4 shadow-card">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Package className="h-4 w-4" />
            <span className="text-xs">Total Items</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{metrics.totalItems}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-xl border border-border bg-card p-4 shadow-card">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <BarChart3 className="h-4 w-4" />
            <span className="text-xs">Total Stock</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{metrics.totalStock.toFixed(0)}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-xl border border-warning/30 bg-warning/5 p-4 shadow-card">
          <div className="flex items-center gap-2 text-warning mb-1">
            <Clock className="h-4 w-4" />
            <span className="text-xs">Expiring Soon</span>
          </div>
          <p className="text-2xl font-bold text-warning">{metrics.expiringSoon}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 shadow-card">
          <div className="flex items-center gap-2 text-destructive mb-1">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-xs">Expired</span>
          </div>
          <p className="text-2xl font-bold text-destructive">{metrics.expired}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-xl border border-primary/30 bg-primary/5 p-4 shadow-card">
          <div className="flex items-center gap-2 text-primary mb-1">
            <TrendingDown className="h-4 w-4" />
            <span className="text-xs">Low Stock</span>
          </div>
          <p className="text-2xl font-bold text-primary">{metrics.lowStock}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="rounded-xl border border-border bg-card p-4 shadow-card">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Archive className="h-4 w-4" />
            <span className="text-xs">Categories</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{Object.keys(metrics.categoryBreakdown).length}</p>
        </motion.div>
      </div>

      {/* Alerts Section */}
      {(metrics.expiringSoon > 0 || metrics.lowStock > 0) && (
        <div className="mb-6 space-y-2">
          {metrics.expiringSoon > 0 && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/5 p-3">
              <AlertCircle className="h-5 w-5 text-warning flex-shrink-0" />
              <p className="text-sm text-warning">
                <strong>{metrics.expiringSoon} item(s)</strong> expiring within 24 hours. Prioritize distribution!
              </p>
              <Button size="sm" variant="outline" className="ml-auto text-warning border-warning/50" onClick={() => setExpiryFilter("urgent")}>
                View Items
              </Button>
            </motion.div>
          )}
          {metrics.lowStock > 0 && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
              <TrendingDown className="h-5 w-5 text-primary flex-shrink-0" />
              <p className="text-sm text-primary">
                <strong>{metrics.lowStock} item(s)</strong> running low on stock.
              </p>
            </motion.div>
          )}
        </div>
      )}

      {/* Actions Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex flex-1 gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search inventory..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>

          {/* Category Filter */}
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40 h-9">
              <Filter className="h-3 w-3 mr-1" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Expiry Filter */}
          <Select value={expiryFilter} onValueChange={setExpiryFilter}>
            <SelectTrigger className="w-36 h-9">
              <Clock className="h-3 w-3 mr-1" />
              <SelectValue placeholder="Expiry" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Items</SelectItem>
              <SelectItem value="urgent">Urgent (&lt;6h)</SelectItem>
              <SelectItem value="medium">Medium (&lt;24h)</SelectItem>
              <SelectItem value="safe">Safe</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
            <SelectTrigger className="w-36 h-9">
              <ArrowUpDown className="h-3 w-3 mr-1" />
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="expiry">Expiry (FIFO)</SelectItem>
              <SelectItem value="received">Recently Added</SelectItem>
              <SelectItem value="name">Name</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          {/* History Button */}
          <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <History className="h-4 w-4 mr-1" /> History
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Inventory History</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 mt-4">
                {inventoryLogs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No history records</p>
                ) : (
                  inventoryLogs.map((log: any) => (
                    <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg border border-border">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                        <History className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{log.beneficiary_group || "Distribution"}</p>
                        <p className="text-xs text-muted-foreground">{log.notes || `Qty: ${log.quantity_distributed}`}</p>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          {new Date(log.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Add Item Button */}
          <Dialog open={showAddDialog} onOpenChange={(open) => { setShowAddDialog(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" /> Add Item
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Inventory Item</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Food Name *</Label>
                  <Input
                    value={formData.food_title}
                    onChange={(e) => setFormData({ ...formData, food_title: e.target.value })}
                    placeholder="e.g. Rice, Bread, Vegetables"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category *</Label>
                    <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Storage Type</Label>
                    <Select value={formData.storage_type} onValueChange={(v) => setFormData({ ...formData, storage_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STORAGE_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Quantity Received *</Label>
                    <Input
                      type="number"
                      value={formData.quantity_received}
                      onChange={(e) => setFormData({ ...formData, quantity_received: e.target.value, quantity_remaining: e.target.value })}
                      placeholder="e.g. 10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Expiry Date</Label>
                    <Input
                      type="date"
                      value={formData.expiry_date}
                      onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                    />
                  </div>
                </div>

                {/* Source Information */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Source Type *</Label>
                    <Select value={formData.source_type} onValueChange={(v) => setFormData({ ...formData, source_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="donation">Donation (from vendor)</SelectItem>
                        <SelectItem value="purchase">Purchase</SelectItem>
                        <SelectItem value="transfer">Transfer (from other NGO)</SelectItem>
                        <SelectItem value="manual">Manual Entry</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Source Name / Donor *</Label>
                    <Input
                      value={formData.source_name}
                      onChange={(e) => setFormData({ ...formData, source_name: e.target.value })}
                      placeholder="e.g. ABC Restaurant, Local Market"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Condition</Label>
                  <Select value={formData.condition} onValueChange={(v) => setFormData({ ...formData, condition: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ITEM_CONDITIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Optional notes..."
                    rows={2}
                  />
                </div>

                <Button
                  onClick={() => addItemMutation.mutate(formData)}
                  disabled={!formData.food_title || !formData.category || !formData.quantity_received || !formData.source_name || addItemMutation.isPending}
                  className="w-full"
                >
                  {addItemMutation.isPending ? "Adding..." : "Add to Inventory"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingItem} onOpenChange={(open) => { if (!open) { setEditingItem(null); resetForm(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Inventory Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Food Name *</Label>
              <Input
                value={formData.food_title}
                onChange={(e) => setFormData({ ...formData, food_title: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Expiry Date</Label>
                <Input
                  type="date"
                  value={formData.expiry_date}
                  onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantity Received</Label>
                <Input
                  type="number"
                  value={formData.quantity_received}
                  onChange={(e) => setFormData({ ...formData, quantity_received: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Quantity Remaining</Label>
                <Input
                  type="number"
                  value={formData.quantity_remaining}
                  onChange={(e) => setFormData({ ...formData, quantity_remaining: e.target.value })}
                />
              </div>
            </div>

            <Button
              onClick={() => updateItemMutation.mutate({ id: editingItem.id, data: formData })}
              disabled={!formData.food_title || updateItemMutation.isPending}
              className="w-full"
            >
              {updateItemMutation.isPending ? "Updating..." : "Update Item"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Inventory List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-12 text-sm text-muted-foreground">Loading inventory...</div>
        ) : filteredInventory.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            {inventory.length === 0 ? "No inventory items. Add your first item!" : "No items match your filters."}
          </div>
        ) : (
          filteredInventory.map((item: any, i: number) => {
            const { level, hoursLeft } = getExpiryUrgency(item.expiry_date);
            const remaining = parseFloat(item.quantity_remaining) || 0;
            const received = parseFloat(item.quantity_received) || 1;
            const stockPercent = (remaining / received) * 100;
            const isLowStock = stockPercent < 20 && remaining > 0;
            const sourceInfo = parseSourceInfo(item);
            const SourceIcon = getSourceIcon(sourceInfo.type);

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                className={`rounded-xl border bg-card p-4 shadow-card ${
                  level === "expired" ? "border-destructive/50 bg-destructive/5" :
                  level === "urgent" ? "border-warning/50 bg-warning/5" :
                  "border-border"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                      level === "expired" ? "bg-destructive/10" :
                      level === "urgent" ? "bg-warning/10" :
                      "bg-primary/10"
                    }`}>
                      <Package className={`h-5 w-5 ${
                        level === "expired" ? "text-destructive" :
                        level === "urgent" ? "text-warning" :
                        "text-primary"
                      }`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-foreground">{item.food_title}</h3>
                        {level === "expired" && <Badge variant="destructive" className="text-xs">Expired</Badge>}
                        {level === "urgent" && <Badge className="text-xs bg-warning text-warning-foreground">Urgent</Badge>}
                        {isLowStock && <Badge variant="outline" className="text-xs text-primary border-primary">Low Stock</Badge>}
                      </div>
                      <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Archive className="h-3 w-3" /> {item.category || "Uncategorized"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          <strong>{item.quantity_remaining}</strong> / {item.quantity_received} remaining
                        </span>
                        {item.expiry_date && (
                          <span className={`flex items-center gap-1 ${
                            level === "expired" ? "text-destructive" :
                            level === "urgent" ? "text-warning" :
                            level === "medium" ? "text-warning" :
                            "text-success"
                          }`}>
                            <Calendar className="h-3 w-3" />
                            {formatTimeLeft(hoursLeft)} ({item.expiry_date})
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground/70">
                        <span>Received: {new Date(item.received_at).toLocaleDateString()}</span>
                        <span className="flex items-center gap-1">
                          <SourceIcon className="h-3 w-3" />
                          {getSourceLabel(sourceInfo.type)}: <strong className="text-foreground/70">{sourceInfo.name}</strong>
                        </span>
                        {sourceInfo.storageType && sourceInfo.storageType !== "Room Temperature" && (
                          <span className="flex items-center gap-1">
                            <Thermometer className="h-3 w-3" /> {sourceInfo.storageType}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Edit Button */}
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(item)}>
                      <Edit className="h-4 w-4" />
                    </Button>

                    {/* Mark as Wasted */}
                    {remaining > 0 && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="text-warning">
                            <AlertTriangle className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Mark as Wasted</AlertDialogTitle>
                            <AlertDialogDescription>
                              Select a reason for wasting "{item.food_title}". This will set the remaining quantity to 0.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <div className="grid grid-cols-2 gap-2 my-4">
                            {WASTE_REASONS.map(reason => (
                              <Button
                                key={reason}
                                variant="outline"
                                size="sm"
                                onClick={() => markAsWastedMutation.mutate({ id: item.id, reason })}
                              >
                                {reason}
                              </Button>
                            ))}
                          </div>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}

                    {/* Delete Button */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Item</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{item.food_title}" from inventory? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteItemMutation.mutate(item.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                {/* Stock Progress Bar */}
                <div className="mt-3">
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        stockPercent < 20 ? "bg-destructive" :
                        stockPercent < 50 ? "bg-warning" :
                        "bg-success"
                      }`}
                      style={{ width: `${Math.min(stockPercent, 100)}%` }}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* FIFO Suggestion */}
      {filteredInventory.length > 0 && sortBy === "expiry" && (
        <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center gap-2 text-primary mb-2">
            <CheckCircle className="h-5 w-5" />
            <span className="text-sm font-semibold">FIFO Suggestion</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Items are sorted by expiry date (First In, First Out). Distribute <strong>"{filteredInventory[0]?.food_title}"</strong> first
            {filteredInventory[0]?.expiry_date && ` - expires ${filteredInventory[0].expiry_date}`}.
          </p>
        </div>
      )}
    </PageLayout>
  );
};

export default NgoInventory;

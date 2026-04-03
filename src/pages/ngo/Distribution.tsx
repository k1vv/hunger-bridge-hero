import { useState, useMemo } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  HandHeart,
  Package,
  Users,
  Calendar,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Search,
  Filter,
  ChevronRight,
  Minus,
  AlertCircle,
  CalendarDays,
  Building,
  User,
  Info,
  Trash2,
} from "lucide-react";
import { logger } from "@/lib/logger";

// ============================================================================
// CONSTANTS
// ============================================================================

const DISTRIBUTION_TYPES = [
  { value: "walk_in", label: "Walk-in / Direct", description: "Food given directly to people who come" },
  { value: "event", label: "Event / Scheduled", description: "Organized distribution session (e.g., Friday food aid)" },
  { value: "delivery", label: "Delivery", description: "Food delivered to beneficiaries" },
];

const BENEFICIARY_TYPES = [
  "Homeless",
  "Low-income Families",
  "Elderly",
  "Orphans",
  "Students",
  "Refugees",
  "Disabled",
  "General Public",
];

// ============================================================================
// HELPERS
// ============================================================================

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
  if (hoursLeft === null) return "";
  if (hoursLeft < 0) return "Expired";
  if (hoursLeft < 1) return "< 1h";
  if (hoursLeft < 24) return `${hoursLeft}h`;
  const days = Math.floor(hoursLeft / 24);
  return `${days}d`;
};

interface SelectedItem {
  inventoryId: string;
  quantity: number;
  item: any;
}

// ============================================================================
// COMPONENT
// ============================================================================

const Distribution = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Dialog state
  const [showNewDistribution, setShowNewDistribution] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);

  // Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  // Form state for new distribution
  const [distributionType, setDistributionType] = useState("walk_in");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [distributionDate, setDistributionDate] = useState(new Date().toISOString().split("T")[0]);
  const [distributionTime, setDistributionTime] = useState("");
  const [beneficiaryType, setBeneficiaryType] = useState("");
  const [beneficiaryCount, setBeneficiaryCount] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [step, setStep] = useState(1); // Multi-step form

  // ============================================================================
  // QUERIES
  // ============================================================================

  // Fetch inventory with remaining stock
  const { data: inventoryItems = [] } = useQuery({
    queryKey: ["ngo_inventory_for_distribution", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory")
        .select("*")
        .eq("ngo_user_id", user!.id)
        .gt("quantity_remaining", "0")
        .order("expiry_date", { ascending: true }); // FIFO
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch distribution records
  const { data: records = [], isLoading } = useQuery({
    queryKey: ["distribution_records", user?.id],
    queryFn: async () => {
      logger.ngo.info("Fetching distribution records", undefined, user?.id);
      const { data, error } = await supabase
        .from("distribution_records")
        .select("*")
        .eq("ngo_user_id", user!.id)
        .order("distribution_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  // Dashboard metrics
  const metrics = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const thisWeekStart = new Date();
    thisWeekStart.setDate(thisWeekStart.getDate() - 7);

    const todayDistributions = records.filter((r: any) => r.distribution_date === today);
    const weekDistributions = records.filter((r: any) => new Date(r.distribution_date) >= thisWeekStart);

    // Parse distribution data to get total beneficiaries and items
    let totalBeneficiaries = 0;
    let totalItemsDistributed = 0;
    let todayBeneficiaries = 0;

    records.forEach((r: any) => {
      try {
        const data = JSON.parse(r.notes || "{}");
        const count = parseInt(data.beneficiary_count) || 0;
        const itemCount = (data.items || []).length || 1;
        totalBeneficiaries += count;
        totalItemsDistributed += itemCount;
        if (r.distribution_date === today) {
          todayBeneficiaries += count;
        }
      } catch {
        // Legacy format
      }
    });

    // Expiring soon items
    const expiringSoon = inventoryItems.filter((item: any) => {
      const { level } = getExpiryUrgency(item.expiry_date);
      return level === "urgent" || level === "medium";
    });

    return {
      totalDistributions: records.length,
      todayDistributions: todayDistributions.length,
      weekDistributions: weekDistributions.length,
      totalBeneficiaries,
      todayBeneficiaries,
      totalItemsDistributed,
      availableStock: inventoryItems.length,
      expiringSoon: expiringSoon.length,
    };
  }, [records, inventoryItems]);

  // Filter records
  const filteredRecords = useMemo(() => {
    return records.filter((r: any) => {
      // Parse notes for search
      let searchContent = r.beneficiary_group || "";
      try {
        const data = JSON.parse(r.notes || "{}");
        searchContent += ` ${data.title || ""} ${data.location || ""}`;
      } catch {}

      const matchesSearch = searchContent.toLowerCase().includes(searchTerm.toLowerCase());

      // Type filter
      let matchesType = typeFilter === "all";
      if (!matchesType) {
        try {
          const data = JSON.parse(r.notes || "{}");
          matchesType = data.distribution_type === typeFilter;
        } catch {}
      }

      // Date filter
      let matchesDate = true;
      if (dateFilter === "today") {
        matchesDate = r.distribution_date === new Date().toISOString().split("T")[0];
      } else if (dateFilter === "week") {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        matchesDate = new Date(r.distribution_date) >= weekAgo;
      } else if (dateFilter === "month") {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        matchesDate = new Date(r.distribution_date) >= monthAgo;
      }

      return matchesSearch && matchesType && matchesDate;
    });
  }, [records, searchTerm, typeFilter, dateFilter]);

  // Items with FIFO warnings
  const inventoryWithWarnings = useMemo(() => {
    return inventoryItems.map((item: any, index: number) => {
      const { level, hoursLeft } = getExpiryUrgency(item.expiry_date);
      const isOldestInCategory = inventoryItems
        .filter((i: any) => i.category === item.category)
        .findIndex((i: any) => i.id === item.id) === 0;

      return {
        ...item,
        expiryLevel: level,
        hoursLeft,
        fifoRecommended: index < 5, // Top 5 items are FIFO recommended
        isOldestInCategory,
      };
    });
  }, [inventoryItems]);

  // ============================================================================
  // MUTATIONS
  // ============================================================================

  const createDistributionMutation = useMutation({
    mutationFn: async () => {
      logger.ngo.info("Creating distribution", { type: distributionType, itemCount: selectedItems.length }, user?.id);

      // Validate
      if (selectedItems.length === 0) {
        throw new Error("Please select at least one item to distribute");
      }

      // Build distribution data
      const distributionData = {
        distribution_type: distributionType,
        title: title || `${DISTRIBUTION_TYPES.find(t => t.value === distributionType)?.label} Distribution`,
        location,
        distribution_time: distributionTime,
        beneficiary_type: beneficiaryType,
        beneficiary_count: beneficiaryCount,
        items: selectedItems.map(s => ({
          inventory_id: s.inventoryId,
          food_title: s.item.food_title,
          quantity: s.quantity,
          category: s.item.category,
        })),
        user_notes: notes,
      };

      // Create distribution record
      const { error } = await supabase.from("distribution_records").insert({
        ngo_user_id: user!.id,
        beneficiary_group: beneficiaryType || "General Distribution",
        quantity_distributed: selectedItems.reduce((sum, s) => sum + s.quantity, 0).toString(),
        distribution_date: distributionDate,
        notes: JSON.stringify(distributionData),
      });

      if (error) throw error;

      // Update inventory quantities
      for (const selected of selectedItems) {
        const currentRemaining = parseFloat(selected.item.quantity_remaining) || 0;
        const newRemaining = Math.max(0, currentRemaining - selected.quantity);

        const { error: updateError } = await supabase
          .from("inventory")
          .update({ quantity_remaining: newRemaining.toString() })
          .eq("id", selected.inventoryId);

        if (updateError) {
          logger.ngo.error("Failed to update inventory", updateError.message, { id: selected.inventoryId }, user?.id);
        }
      }

      logger.ngo.info("Distribution created successfully", { itemCount: selectedItems.length }, user?.id);
    },
    onSuccess: () => {
      toast.success("Distribution recorded successfully!");
      queryClient.invalidateQueries({ queryKey: ["distribution_records"] });
      queryClient.invalidateQueries({ queryKey: ["ngo_inventory"] });
      queryClient.invalidateQueries({ queryKey: ["ngo_inventory_for_distribution"] });
      resetForm();
      setShowNewDistribution(false);
    },
    onError: (err: any) => {
      logger.ngo.error("Failed to create distribution", err.message, {}, user?.id);
      toast.error(err.message);
    },
  });

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const resetForm = () => {
    setDistributionType("walk_in");
    setTitle("");
    setLocation("");
    setDistributionDate(new Date().toISOString().split("T")[0]);
    setDistributionTime("");
    setBeneficiaryType("");
    setBeneficiaryCount("");
    setNotes("");
    setSelectedItems([]);
    setStep(1);
  };

  const addItem = (item: any) => {
    if (selectedItems.find(s => s.inventoryId === item.id)) {
      toast.error("Item already selected");
      return;
    }
    setSelectedItems([...selectedItems, {
      inventoryId: item.id,
      quantity: 1,
      item,
    }]);
  };

  const removeItem = (inventoryId: string) => {
    setSelectedItems(selectedItems.filter(s => s.inventoryId !== inventoryId));
  };

  const updateItemQuantity = (inventoryId: string, quantity: number) => {
    setSelectedItems(selectedItems.map(s => {
      if (s.inventoryId === inventoryId) {
        const maxQty = parseFloat(s.item.quantity_remaining) || 0;
        return { ...s, quantity: Math.min(Math.max(0, quantity), maxQty) };
      }
      return s;
    }));
  };

  const viewRecordDetail = (record: any) => {
    setSelectedRecord(record);
    setShowDetailDialog(true);
  };

  // Parse record data
  const parseRecordData = (record: any) => {
    try {
      return JSON.parse(record.notes || "{}");
    } catch {
      return { user_notes: record.notes };
    }
  };

  // Calculate total quantity to distribute
  const totalQuantity = selectedItems.reduce((sum, s) => sum + s.quantity, 0);

  // Check for FIFO violations
  const fifoViolations = useMemo(() => {
    const violations: string[] = [];
    selectedItems.forEach(selected => {
      const olderItems = inventoryWithWarnings.filter((inv: any) =>
        inv.category === selected.item.category &&
        inv.id !== selected.inventoryId &&
        !selectedItems.find(s => s.inventoryId === inv.id) &&
        inv.expiry_date && selected.item.expiry_date &&
        new Date(inv.expiry_date) < new Date(selected.item.expiry_date)
      );
      if (olderItems.length > 0) {
        violations.push(`"${selected.item.food_title}" - older stock available in same category`);
      }
    });
    return violations;
  }, [selectedItems, inventoryWithWarnings]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <PageLayout title="Distribution" subtitle="Record and manage food distribution to beneficiaries">
      {/* Dashboard Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border bg-card p-4 shadow-card"
        >
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <CalendarDays className="h-4 w-4" />
            <span className="text-xs">Today</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{metrics.todayDistributions}</p>
          <p className="text-xs text-muted-foreground">{metrics.todayBeneficiaries} people served</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-xl border border-border bg-card p-4 shadow-card"
        >
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs">This Week</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{metrics.weekDistributions}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-success/30 bg-success/5 p-4 shadow-card"
        >
          <div className="flex items-center gap-2 text-success mb-1">
            <Users className="h-4 w-4" />
            <span className="text-xs">Total Served</span>
          </div>
          <p className="text-2xl font-bold text-success">{metrics.totalBeneficiaries}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-xl border border-primary/30 bg-primary/5 p-4 shadow-card"
        >
          <div className="flex items-center gap-2 text-primary mb-1">
            <HandHeart className="h-4 w-4" />
            <span className="text-xs">Total Distributions</span>
          </div>
          <p className="text-2xl font-bold text-primary">{metrics.totalDistributions}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl border border-border bg-card p-4 shadow-card"
        >
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Package className="h-4 w-4" />
            <span className="text-xs">Available Stock</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{metrics.availableStock}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className={`rounded-xl border p-4 shadow-card ${metrics.expiringSoon > 0 ? "border-warning/30 bg-warning/5" : "border-border bg-card"}`}
        >
          <div className={`flex items-center gap-2 mb-1 ${metrics.expiringSoon > 0 ? "text-warning" : "text-muted-foreground"}`}>
            <Clock className="h-4 w-4" />
            <span className="text-xs">Expiring Soon</span>
          </div>
          <p className={`text-2xl font-bold ${metrics.expiringSoon > 0 ? "text-warning" : "text-foreground"}`}>
            {metrics.expiringSoon}
          </p>
        </motion.div>
      </div>

      {/* Expiring Soon Alert */}
      {metrics.expiringSoon > 0 && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/5 p-3 mb-6"
        >
          <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0" />
          <p className="text-sm text-warning">
            <strong>{metrics.expiringSoon} item(s)</strong> expiring soon. Prioritize distribution!
          </p>
          <Button
            size="sm"
            variant="outline"
            className="ml-auto text-warning border-warning/50"
            onClick={() => setShowNewDistribution(true)}
          >
            Distribute Now
          </Button>
        </motion.div>
      )}

      {/* Actions Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex flex-1 gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search distributions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40 h-9">
              <Filter className="h-3 w-3 mr-1" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {DISTRIBUTION_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-36 h-9">
              <Calendar className="h-3 w-3 mr-1" />
              <SelectValue placeholder="Date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button size="sm" onClick={() => setShowNewDistribution(true)}>
          <Plus className="h-4 w-4 mr-1" /> New Distribution
        </Button>
      </div>

      {/* Distribution List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-12 text-sm text-muted-foreground">Loading distributions...</div>
        ) : filteredRecords.length === 0 ? (
          <div className="text-center py-12">
            <HandHeart className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {records.length === 0 ? "No distributions recorded yet" : "No distributions match your filters"}
            </p>
            {records.length === 0 && (
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setShowNewDistribution(true)}>
                <Plus className="h-4 w-4 mr-1" /> Record First Distribution
              </Button>
            )}
          </div>
        ) : (
          filteredRecords.map((record: any, i: number) => {
            const data = parseRecordData(record);
            const itemCount = (data.items || []).length || 1;
            const typeInfo = DISTRIBUTION_TYPES.find(t => t.value === data.distribution_type);

            return (
              <motion.div
                key={record.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="rounded-xl border border-border bg-card p-4 shadow-card hover:border-primary/30 transition-colors cursor-pointer"
                onClick={() => viewRecordDetail(record)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                      <HandHeart className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-foreground">
                          {data.title || record.beneficiary_group || "Distribution"}
                        </h3>
                        {typeInfo && (
                          <Badge variant="outline" className="text-xs">{typeInfo.label}</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {record.distribution_date}
                          {data.distribution_time && ` at ${data.distribution_time}`}
                        </span>
                        {data.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {data.location}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Package className="h-3 w-3" /> {itemCount} item(s)
                        </span>
                        {data.beneficiary_count && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" /> {data.beneficiary_count} beneficiaries
                          </span>
                        )}
                      </div>
                      {/* Show distributed items preview */}
                      {data.items && data.items.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {data.items.slice(0, 3).map((item: any, idx: number) => (
                            <span key={idx} className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                              {item.quantity} {item.food_title}
                            </span>
                          ))}
                          {data.items.length > 3 && (
                            <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                              +{data.items.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* New Distribution Dialog */}
      <Dialog open={showNewDistribution} onOpenChange={(open) => { if (!open) resetForm(); setShowNewDistribution(open); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {step === 1 && "New Distribution - Details"}
              {step === 2 && "New Distribution - Select Items"}
              {step === 3 && "New Distribution - Review & Confirm"}
            </DialogTitle>
          </DialogHeader>

          {/* Step Indicator */}
          <div className="flex items-center gap-2 mb-4">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  {step > s ? <CheckCircle className="h-4 w-4" /> : s}
                </div>
                {s < 3 && <div className={`w-12 h-0.5 ${step > s ? "bg-primary" : "bg-muted"}`} />}
              </div>
            ))}
          </div>

          {/* Step 1: Distribution Details */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Distribution Type */}
              <div className="space-y-2">
                <Label>Distribution Type *</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {DISTRIBUTION_TYPES.map((type) => (
                    <div
                      key={type.value}
                      onClick={() => setDistributionType(type.value)}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        distributionType === type.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <p className="text-sm font-medium">{type.label}</p>
                      <p className="text-xs text-muted-foreground">{type.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Title (for events) */}
              {distributionType === "event" && (
                <div className="space-y-2">
                  <Label>Event Name</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Friday Community Food Aid"
                  />
                </div>
              )}

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Input
                    type="date"
                    value={distributionDate}
                    onChange={(e) => setDistributionDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Time</Label>
                  <Input
                    type="time"
                    value={distributionTime}
                    onChange={(e) => setDistributionTime(e.target.value)}
                  />
                </div>
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Location
                </Label>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Community Hall, Block A"
                />
              </div>

              {/* Beneficiary Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Beneficiary Type</Label>
                  <Select value={beneficiaryType || "none"} onValueChange={(v) => setBeneficiaryType(v === "none" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not specified</SelectItem>
                      {BENEFICIARY_TYPES.map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Users className="h-3 w-3" /> Number of Beneficiaries
                  </Label>
                  <Input
                    type="number"
                    value={beneficiaryCount}
                    onChange={(e) => setBeneficiaryCount(e.target.value)}
                    placeholder="e.g. 50"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes about this distribution..."
                  rows={2}
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={() => setStep(2)}>
                  Next: Select Items <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Select Items from Inventory */}
          {step === 2 && (
            <div className="space-y-4">
              {/* FIFO Recommendation */}
              {inventoryWithWarnings.filter((i: any) => i.fifoRecommended).length > 0 && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                  <div className="flex items-center gap-2 text-primary mb-2">
                    <Info className="h-4 w-4" />
                    <span className="text-sm font-medium">FIFO Recommendation</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Items are sorted by expiry date. Distribute items expiring soonest first to minimize waste.
                  </p>
                </div>
              )}

              {/* Available Inventory */}
              <div className="space-y-2">
                <Label>Available Inventory ({inventoryItems.length} items)</Label>
                <div className="max-h-60 overflow-y-auto space-y-2 border border-border rounded-lg p-2">
                  {inventoryWithWarnings.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No items in inventory</p>
                  ) : (
                    inventoryWithWarnings.map((item: any) => {
                      const isSelected = selectedItems.find(s => s.inventoryId === item.id);
                      const remaining = parseFloat(item.quantity_remaining) || 0;

                      return (
                        <div
                          key={item.id}
                          className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                            isSelected
                              ? "border-primary bg-primary/5"
                              : item.expiryLevel === "urgent"
                                ? "border-warning/50 bg-warning/5"
                                : item.expiryLevel === "expired"
                                  ? "border-destructive/50 bg-destructive/5 opacity-50"
                                  : "border-border hover:border-primary/30"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                              item.expiryLevel === "urgent" ? "bg-warning/10" :
                              item.expiryLevel === "expired" ? "bg-destructive/10" :
                              "bg-muted"
                            }`}>
                              <Package className={`h-4 w-4 ${
                                item.expiryLevel === "urgent" ? "text-warning" :
                                item.expiryLevel === "expired" ? "text-destructive" :
                                "text-muted-foreground"
                              }`} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium">{item.food_title}</p>
                                {item.fifoRecommended && (
                                  <Badge className="text-[10px] bg-primary/10 text-primary">FIFO</Badge>
                                )}
                                {item.expiryLevel === "urgent" && (
                                  <Badge className="text-[10px] bg-warning text-warning-foreground">Urgent</Badge>
                                )}
                                {item.expiryLevel === "expired" && (
                                  <Badge variant="destructive" className="text-[10px]">Expired</Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {remaining} available · {item.category}
                                {item.expiry_date && ` · Expires: ${item.expiry_date}`}
                                {item.hoursLeft !== null && item.hoursLeft >= 0 && ` (${formatTimeLeft(item.hoursLeft)})`}
                              </p>
                            </div>
                          </div>
                          {item.expiryLevel !== "expired" && (
                            <Button
                              size="sm"
                              variant={isSelected ? "secondary" : "outline"}
                              onClick={() => isSelected ? removeItem(item.id) : addItem(item)}
                            >
                              {isSelected ? "Remove" : "Add"}
                            </Button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Selected Items with Quantity */}
              {selectedItems.length > 0 && (
                <div className="space-y-2">
                  <Label>Selected Items ({selectedItems.length})</Label>
                  <div className="space-y-2 border border-primary/30 rounded-lg p-3 bg-primary/5">
                    {selectedItems.map((selected) => {
                      const maxQty = parseFloat(selected.item.quantity_remaining) || 0;
                      return (
                        <div key={selected.inventoryId} className="flex items-center justify-between bg-card rounded-lg p-2">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-destructive"
                              onClick={() => removeItem(selected.inventoryId)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                            <div>
                              <p className="text-sm font-medium">{selected.item.food_title}</p>
                              <p className="text-xs text-muted-foreground">Available: {maxQty}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 w-7 p-0"
                              onClick={() => updateItemQuantity(selected.inventoryId, selected.quantity - 1)}
                              disabled={selected.quantity <= 1}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Input
                              type="number"
                              value={selected.quantity}
                              onChange={(e) => updateItemQuantity(selected.inventoryId, parseInt(e.target.value) || 0)}
                              className="w-16 h-7 text-center text-sm"
                              min={1}
                              max={maxQty}
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 w-7 p-0"
                              onClick={() => updateItemQuantity(selected.inventoryId, selected.quantity + 1)}
                              disabled={selected.quantity >= maxQty}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* FIFO Violation Warning */}
              {fifoViolations.length > 0 && (
                <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
                  <div className="flex items-center gap-2 text-warning mb-1">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">FIFO Warning</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Older stock available that should be distributed first:
                  </p>
                  <ul className="text-xs text-warning mt-1 list-disc list-inside">
                    {fifoViolations.slice(0, 3).map((v, i) => <li key={i}>{v}</li>)}
                  </ul>
                </div>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                <Button onClick={() => setStep(3)} disabled={selectedItems.length === 0}>
                  Next: Review <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Review & Confirm */}
          {step === 3 && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="rounded-lg border border-border p-4 space-y-3">
                <h4 className="text-sm font-semibold">Distribution Summary</h4>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{distributionDate} {distributionTime && `at ${distributionTime}`}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span>{DISTRIBUTION_TYPES.find(t => t.value === distributionType)?.label}</span>
                  </div>
                  {location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{location}</span>
                    </div>
                  )}
                  {beneficiaryCount && (
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{beneficiaryCount} {beneficiaryType || "beneficiaries"}</span>
                    </div>
                  )}
                </div>

                {title && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-sm"><strong>Event:</strong> {title}</p>
                  </div>
                )}

                {notes && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-sm text-muted-foreground">{notes}</p>
                  </div>
                )}
              </div>

              {/* Items to Distribute */}
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Items to Distribute ({selectedItems.length})
                </h4>
                <div className="space-y-1">
                  {selectedItems.map((s) => (
                    <div key={s.inventoryId} className="flex justify-between text-sm">
                      <span>{s.item.food_title}</span>
                      <span className="font-medium">{s.quantity} units</span>
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-primary/30 flex justify-between font-semibold">
                  <span>Total Quantity</span>
                  <span>{totalQuantity} units</span>
                </div>
              </div>

              {/* Warnings */}
              {fifoViolations.length > 0 && (
                <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
                  <div className="flex items-center gap-2 text-warning">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm">FIFO violations detected. Proceed anyway?</span>
                  </div>
                </div>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                <Button
                  onClick={() => createDistributionMutation.mutate()}
                  disabled={createDistributionMutation.isPending}
                >
                  {createDistributionMutation.isPending ? "Saving..." : "Confirm Distribution"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Distribution Details</DialogTitle>
          </DialogHeader>
          {selectedRecord && (() => {
            const data = parseRecordData(selectedRecord);
            const typeInfo = DISTRIBUTION_TYPES.find(t => t.value === data.distribution_type);
            return (
              <div className="space-y-4 mt-2">
                {/* Header */}
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center">
                    <HandHeart className="h-6 w-6 text-success" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{data.title || selectedRecord.beneficiary_group || "Distribution"}</h3>
                    {typeInfo && <Badge variant="outline">{typeInfo.label}</Badge>}
                  </div>
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Date</p>
                    <p className="font-medium">{selectedRecord.distribution_date}</p>
                  </div>
                  {data.distribution_time && (
                    <div>
                      <p className="text-muted-foreground text-xs">Time</p>
                      <p className="font-medium">{data.distribution_time}</p>
                    </div>
                  )}
                  {data.location && (
                    <div>
                      <p className="text-muted-foreground text-xs">Location</p>
                      <p className="font-medium">{data.location}</p>
                    </div>
                  )}
                  {data.beneficiary_type && (
                    <div>
                      <p className="text-muted-foreground text-xs">Beneficiary Type</p>
                      <p className="font-medium">{data.beneficiary_type}</p>
                    </div>
                  )}
                  {data.beneficiary_count && (
                    <div>
                      <p className="text-muted-foreground text-xs">Beneficiaries Served</p>
                      <p className="font-medium">{data.beneficiary_count}</p>
                    </div>
                  )}
                </div>

                {/* Items */}
                {data.items && data.items.length > 0 && (
                  <div className="border-t pt-3">
                    <p className="text-sm font-medium mb-2">Items Distributed</p>
                    <div className="space-y-2">
                      {data.items.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-sm bg-muted/50 rounded-lg p-2">
                          <span>{item.food_title}</span>
                          <span className="font-medium">{item.quantity} units</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between text-sm font-semibold mt-2 pt-2 border-t">
                      <span>Total</span>
                      <span>{selectedRecord.quantity_distributed} units</span>
                    </div>
                  </div>
                )}

                {/* Notes */}
                {data.user_notes && (
                  <div className="border-t pt-3">
                    <p className="text-sm font-medium mb-1">Notes</p>
                    <p className="text-sm text-muted-foreground">{data.user_notes}</p>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};

export default Distribution;

import { FoodListing } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, MapPin, AlertTriangle, Brain } from "lucide-react";
import { motion } from "framer-motion";

const statusConfig: Record<string, { label: string; className: string }> = {
  available: { label: "Available", className: "bg-success/10 text-success border-success/20" },
  reserved: { label: "Reserved", className: "bg-info/10 text-info border-info/20" },
  delivered: { label: "Delivered", className: "bg-primary/10 text-primary border-primary/20" },
  expired: { label: "Expired", className: "bg-destructive/10 text-destructive border-destructive/20" },
  flagged: { label: "Flagged", className: "bg-warning/10 text-warning border-warning/20" },
};

const riskConfig: Record<string, { label: string; className: string }> = {
  low: { label: "Low Risk", className: "text-success" },
  medium: { label: "Medium Risk", className: "text-warning" },
  high: { label: "High Risk", className: "text-destructive" },
};

const ListingCard = ({ listing, index = 0 }: { listing: FoodListing; index?: number }) => {
  const status = statusConfig[listing.status];
  const risk = listing.spoilageRisk ? riskConfig[listing.spoilageRisk] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="rounded-xl border border-border bg-card p-5 shadow-card hover:shadow-elevated transition-shadow"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-foreground text-sm">{listing.title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">by {listing.donorName}</p>
        </div>
        <Badge variant="outline" className={status.className}>
          {status.label}
        </Badge>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          {listing.location}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          Expires: {listing.expiryDate}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-foreground">{listing.quantity}</span>
          <span className="text-xs text-muted-foreground">{listing.category}</span>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border pt-3">
        <div className="flex items-center gap-3">
          {listing.aiMatchScore && (
            <div className="flex items-center gap-1 text-xs">
              <Brain className="h-3.5 w-3.5 text-primary" />
              <span className="font-medium text-primary">{listing.aiMatchScore}%</span>
            </div>
          )}
          {risk && (
            <div className="flex items-center gap-1 text-xs">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span className={`font-medium ${risk.className}`}>{risk.label}</span>
            </div>
          )}
        </div>
        {listing.status === "available" && (
          <Button size="sm" className="h-7 text-xs">Reserve</Button>
        )}
      </div>

      {listing.reservedBy && (
        <div className="mt-3 rounded-lg bg-info/5 px-3 py-2 border border-info/10">
          <p className="text-xs text-info">Reserved by <span className="font-medium">{listing.reservedBy}</span></p>
        </div>
      )}
    </motion.div>
  );
};

export default ListingCard;

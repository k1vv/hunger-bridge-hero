import PageLayout from "@/components/PageLayout";
import { mockNGOs } from "@/lib/mock-data";
import { Building2, MapPin, Package, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";

const NGOs = () => {
  return (
    <PageLayout title="NGOs & Foodbanks" subtitle="Partner organizations receiving food donations">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {mockNGOs.map((ngo, i) => {
          const stockPercent = Math.round((ngo.currentStock / ngo.capacity) * 100);
          return (
            <motion.div
              key={ngo.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-border bg-card p-5 shadow-card"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-foreground">{ngo.name}</h3>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <MapPin className="h-3 w-3" /> {ngo.location} · {ngo.distance} km
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Package className="h-3 w-3" /> Stock Level
                    </span>
                    <span className="text-xs font-medium text-foreground">{ngo.currentStock}/{ngo.capacity}</span>
                  </div>
                  <Progress value={stockPercent} className="h-2" />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> Demand
                  </span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    ngo.demandLevel === "high"
                      ? "bg-destructive/10 text-destructive"
                      : ngo.demandLevel === "medium"
                      ? "bg-warning/10 text-warning"
                      : "bg-success/10 text-success"
                  }`}>
                    {ngo.demandLevel}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </PageLayout>
  );
};

export default NGOs;

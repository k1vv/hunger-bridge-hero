import PageLayout from "@/components/PageLayout";
import { mockListings } from "@/lib/mock-data";
import { Truck, User, MapPin, Clock, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const volunteers = ["Sarah K.", "James L.", "Maria G.", "David T."];

const Logistics = () => {
  const deliveries = mockListings.filter((l) => l.status === "reserved" || l.status === "delivered");

  return (
    <PageLayout title="Logistics Management" subtitle="Assign volunteers, optimize routes, and schedule deliveries">
      <div className="space-y-4">
        {deliveries.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-border bg-card p-5 shadow-card"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                  <Truck className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {item.location} → {item.reservedBy || "TBD"}</span>
                    <span className="flex items-center gap-1"><User className="h-3 w-3" /> {volunteers[i % volunteers.length]}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {item.quantity}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={item.status === "delivered" ? "bg-success/10 text-success border-success/20" : "bg-info/10 text-info border-info/20"}>
                  {item.status === "delivered" ? (
                    <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Delivered</span>
                  ) : "In Transit"}
                </Badge>
                {item.status === "reserved" && <Button size="sm" variant="outline" className="h-7 text-xs">Track</Button>}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </PageLayout>
  );
};

export default Logistics;

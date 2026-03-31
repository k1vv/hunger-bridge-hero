import PageLayout from "@/components/PageLayout";
import { mockListings } from "@/lib/mock-data";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { motion } from "framer-motion";

const Inventory = () => {
  const inventoryItems = mockListings.filter((l) => l.status === "delivered" || l.status === "reserved");

  return (
    <PageLayout title="Inventory Management" subtitle="Track stock levels, FIFO queues, and expiry dates">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-xl border border-border bg-card shadow-card overflow-hidden"
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Item</TableHead>
              <TableHead className="text-xs">Category</TableHead>
              <TableHead className="text-xs">Quantity</TableHead>
              <TableHead className="text-xs">Expiry</TableHead>
              <TableHead className="text-xs">Spoilage Risk</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs">FIFO Priority</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockListings.map((item, i) => (
              <TableRow key={item.id}>
                <TableCell className="text-sm font-medium">{item.title}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{item.category}</TableCell>
                <TableCell className="text-sm">{item.quantity}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{item.expiryDate}</TableCell>
                <TableCell>
                  <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                    item.spoilageRisk === "high" ? "text-destructive" : item.spoilageRisk === "medium" ? "text-warning" : "text-success"
                  }`}>
                    {item.spoilageRisk === "high" ? <AlertTriangle className="h-3 w-3" /> : item.spoilageRisk === "medium" ? <Clock className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
                    {item.spoilageRisk}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {item.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm font-medium text-foreground">#{i + 1}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </motion.div>
    </PageLayout>
  );
};

export default Inventory;

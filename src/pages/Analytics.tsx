import PageLayout from "@/components/PageLayout";
import StatCard from "@/components/StatCard";
import { mockStats, mockChartData } from "@/lib/mock-data";
import { UtensilsCrossed, TrendingDown, Truck, Recycle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { motion } from "framer-motion";

const pieData = [
  { name: "Vegetables", value: 35 },
  { name: "Bakery", value: 25 },
  { name: "Dairy", value: 15 },
  { name: "Grains", value: 15 },
  { name: "Other", value: 10 },
];

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--info))",
  "hsl(var(--warning))",
  "hsl(var(--muted-foreground))",
];

const Analytics = () => {
  return (
    <PageLayout title="Analytics & Reporting" subtitle="Comprehensive metrics on food rescue impact">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard title="Total Food Saved" value={`${mockStats.totalFoodSaved} kg`} icon={UtensilsCrossed} variant="primary" />
        <StatCard title="Waste Reduced" value={`${mockStats.wasteReduced}%`} icon={Recycle} variant="success" trend={{ value: 5, positive: true }} />
        <StatCard title="Deliveries" value={mockStats.deliveriesCompleted} icon={Truck} variant="accent" />
        <StatCard title="Pending" value={mockStats.pendingListings} icon={TrendingDown} variant="default" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="lg:col-span-2 rounded-xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-sm font-semibold text-foreground mb-4">Monthly Trends</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={mockChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
              <Bar dataKey="saved" fill="hsl(var(--primary))" name="Saved (kg)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="wasted" fill="hsl(var(--destructive))" name="Wasted (kg)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="rounded-xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-sm font-semibold text-foreground mb-4">By Category</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: "12px", borderRadius: "8px" }} />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
    </PageLayout>
  );
};

export default Analytics;

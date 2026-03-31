import PageLayout from "@/components/PageLayout";
import StatCard from "@/components/StatCard";
import ListingCard from "@/components/ListingCard";
import { mockStats, mockListings, mockChartData, mockNGOs } from "@/lib/mock-data";
import { UtensilsCrossed, Users, Building2, Truck, TrendingDown, Clock, Brain, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { motion } from "framer-motion";

const Index = () => {
  const recentListings = mockListings.filter((l) => l.status === "available").slice(0, 3);
  const urgentItems = mockListings.filter((l) => l.spoilageRisk === "high");

  return (
    <PageLayout title="Dashboard" subtitle="Overview of food rescue operations">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard title="Food Saved" value={`${mockStats.totalFoodSaved} kg`} icon={UtensilsCrossed} variant="primary" trend={{ value: 12, positive: true }} />
        <StatCard title="Active Donors" value={mockStats.activeDonors} icon={Users} variant="default" trend={{ value: 8, positive: true }} />
        <StatCard title="Partner NGOs" value={mockStats.activeNGOs} icon={Building2} variant="success" />
        <StatCard title="Deliveries" value={mockStats.deliveriesCompleted} icon={Truck} variant="accent" trend={{ value: 15, positive: true }} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 rounded-xl border border-border bg-card p-6 shadow-card"
        >
          <h2 className="text-sm font-semibold text-foreground mb-1">Food Saved vs Wasted</h2>
          <p className="text-xs text-muted-foreground mb-4">Last 6 months trend</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={mockChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Bar dataKey="saved" fill="hsl(var(--primary))" name="Saved (kg)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="wasted" fill="hsl(var(--destructive))" name="Wasted (kg)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* AI Alerts */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-xl border border-border bg-card p-6 shadow-card"
        >
          <div className="flex items-center gap-2 mb-4">
            <Brain className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">AI Insights</h2>
          </div>
          <div className="space-y-3">
            <div className="rounded-lg bg-destructive/5 border border-destructive/10 p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                <span className="text-xs font-semibold text-destructive">Expiry Alert</span>
              </div>
              <p className="text-xs text-muted-foreground">{urgentItems.length} items at high spoilage risk. Prioritize pickup.</p>
            </div>
            <div className="rounded-lg bg-warning/5 border border-warning/10 p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingDown className="h-3.5 w-3.5 text-warning" />
                <span className="text-xs font-semibold text-warning">Demand Forecast</span>
              </div>
              <p className="text-xs text-muted-foreground">South Side area projected 30% supply shortage next week.</p>
            </div>
            <div className="rounded-lg bg-primary/5 border border-primary/10 p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Clock className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold text-primary">Matching Update</span>
              </div>
              <p className="text-xs text-muted-foreground">3 new optimal NGO matches found for pending listings.</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Recent Available + Top NGOs */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mt-6">
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-4">Recent Available Listings</h2>
          <div className="space-y-3">
            {recentListings.map((listing, i) => (
              <ListingCard key={listing.id} listing={listing} index={i} />
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-foreground mb-4">Top NGOs by Demand</h2>
          <div className="space-y-2">
            {mockNGOs
              .sort((a, b) => (b.demandLevel === "high" ? 1 : 0) - (a.demandLevel === "high" ? 1 : 0))
              .slice(0, 4)
              .map((ngo, i) => (
                <motion.div
                  key={ngo.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * i }}
                  className="flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-card"
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">{ngo.name}</p>
                    <p className="text-xs text-muted-foreground">{ngo.location} · {ngo.distance} km</p>
                  </div>
                  <div className="text-right">
                    <div className="mb-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        ngo.demandLevel === "high"
                          ? "bg-destructive/10 text-destructive"
                          : ngo.demandLevel === "medium"
                          ? "bg-warning/10 text-warning"
                          : "bg-success/10 text-success"
                      }`}>
                        {ngo.demandLevel} demand
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{ngo.currentStock}/{ngo.capacity} stock</p>
                  </div>
                </motion.div>
              ))}
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default Index;

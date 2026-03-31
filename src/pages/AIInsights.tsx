import PageLayout from "@/components/PageLayout";
import { Brain, TrendingUp, AlertTriangle, Zap, MapPin, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import { mockNGOs, mockListings } from "@/lib/mock-data";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const forecastData = [
  { week: "W1", demand: 120, supply: 150 },
  { week: "W2", demand: 180, supply: 140 },
  { week: "W3", demand: 200, supply: 160 },
  { week: "W4", demand: 250, supply: 180 },
  { week: "W5", demand: 220, supply: 200 },
  { week: "W6", demand: 280, supply: 190 },
];

const AIInsights = () => {
  const highRiskItems = mockListings.filter((l) => l.spoilageRisk === "high");
  const topMatches = mockNGOs.filter((n) => n.demandLevel === "high");

  return (
    <PageLayout title="AI Insights" subtitle="Smart matching, expiry prediction, and demand forecasting">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Smart Matching */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card p-6 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Smart Matching Engine</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-4">AI-recommended NGO matches ranked by distance, urgency, and demand.</p>
          <div className="space-y-2">
            {topMatches.map((ngo, i) => (
              <div key={ngo.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">#{i + 1}</span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{ngo.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> {ngo.distance} km</p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-primary">{95 - i * 7}% match</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Expiry Risk */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-xl border border-border bg-card p-6 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <h2 className="text-sm font-semibold text-foreground">Expiry Risk Prediction</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-4">Items at high spoilage risk requiring immediate action.</p>
          <div className="space-y-2">
            {highRiskItems.length > 0 ? highRiskItems.map((item) => (
              <div key={item.id} className="rounded-lg bg-destructive/5 border border-destructive/10 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground">Expires: {item.expiryDate} · {item.quantity}</p>
                  </div>
                  <span className="text-xs font-semibold text-destructive">URGENT</span>
                </div>
              </div>
            )) : (
              <p className="text-xs text-muted-foreground">No high-risk items currently.</p>
            )}
          </div>
        </motion.div>

        {/* Demand Forecast */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-2 rounded-xl border border-border bg-card p-6 shadow-card">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="h-4 w-4 text-info" />
            <h2 className="text-sm font-semibold text-foreground">Demand vs Supply Forecast</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-4">Predicted shortages and high-need areas for the next 6 weeks.</p>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={forecastData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="week" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
              <Line type="monotone" dataKey="demand" stroke="hsl(var(--destructive))" strokeWidth={2} name="Demand" dot={{ r: 4 }} />
              <Line type="monotone" dataKey="supply" stroke="hsl(var(--primary))" strokeWidth={2} name="Supply" dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
    </PageLayout>
  );
};

export default AIInsights;

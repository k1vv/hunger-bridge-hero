import PageLayout from "@/components/PageLayout";
import { BookOpen, Shield, FileText } from "lucide-react";
import { motion } from "framer-motion";

const RulesSettings = () => {
  const sections = [
    {
      icon: Shield,
      title: "Food Safety Rules",
      description: "Define acceptable food donation standards, temperature requirements, and handling procedures.",
      items: ["All perishable items must be within expiry date", "Frozen items must maintain cold chain", "Allergen information must be declared", "Food must be in original packaging or sealed containers"],
    },
    {
      icon: BookOpen,
      title: "Acceptable Donation Categories",
      description: "Categories of food accepted on the platform.",
      items: ["Vegetables & Fruits", "Bakery & Bread", "Dairy Products", "Grains & Rice", "Canned & Preserved", "Frozen Foods", "Cooked Meals (same-day only)"],
    },
    {
      icon: FileText,
      title: "Platform Guidelines",
      description: "General rules for all users of the platform.",
      items: ["Vendors must provide accurate food descriptions", "NGOs must collect within the pickup window", "No-shows more than 3 times may result in suspension", "All users must maintain verified profiles"],
    },
  ];

  return (
    <PageLayout title="Rules & Settings" subtitle="Manage platform guidelines and food safety rules">
      <div className="space-y-6 max-w-3xl">
        {sections.map((section, i) => (
          <motion.div key={section.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="rounded-xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                <section.icon className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
                <p className="text-xs text-muted-foreground">{section.description}</p>
              </div>
            </div>
            <ul className="space-y-2 ml-13">
              {section.items.map((item, j) => (
                <li key={j} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-destructive/50 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </PageLayout>
  );
};

export default RulesSettings;

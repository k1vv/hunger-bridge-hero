export type UserRole = "donor" | "ngo" | "admin";

export type ListingStatus = "available" | "reserved" | "delivered" | "expired" | "flagged";

export interface FoodListing {
  id: string;
  title: string;
  category: string;
  quantity: string;
  expiryDate: string;
  donorName: string;
  donorId: string;
  location: string;
  status: ListingStatus;
  createdAt: string;
  reservedBy?: string;
  reservedAt?: string;
  pickupDeadline?: string;
  aiMatchScore?: number;
  spoilageRisk?: "low" | "medium" | "high";
  imageUrl?: string;
}

export interface NGO {
  id: string;
  name: string;
  location: string;
  capacity: number;
  currentStock: number;
  demandLevel: "low" | "medium" | "high";
  distance?: number;
}

export interface DashboardStats {
  totalFoodSaved: number;
  activeDonors: number;
  activeNGOs: number;
  deliveriesCompleted: number;
  wasteReduced: number;
  pendingListings: number;
}

export const mockStats: DashboardStats = {
  totalFoodSaved: 12450,
  activeDonors: 234,
  activeNGOs: 56,
  deliveriesCompleted: 1890,
  wasteReduced: 78,
  pendingListings: 23,
};

export const mockListings: FoodListing[] = [
  {
    id: "1",
    title: "Fresh Vegetables Assortment",
    category: "Vegetables",
    quantity: "50 kg",
    expiryDate: "2026-04-02",
    donorName: "Green Grocers Ltd",
    donorId: "d1",
    location: "Downtown Market",
    status: "available",
    createdAt: "2026-03-30",
    aiMatchScore: 95,
    spoilageRisk: "medium",
  },
  {
    id: "2",
    title: "Bakery Surplus - Bread & Pastries",
    category: "Bakery",
    quantity: "30 kg",
    expiryDate: "2026-04-01",
    donorName: "Sunrise Bakery",
    donorId: "d2",
    location: "Elm Street",
    status: "reserved",
    createdAt: "2026-03-29",
    reservedBy: "City Food Bank",
    reservedAt: "2026-03-30T10:00:00",
    pickupDeadline: "2026-03-31T10:00:00",
    aiMatchScore: 88,
    spoilageRisk: "high",
  },
  {
    id: "3",
    title: "Canned Goods Collection",
    category: "Canned",
    quantity: "100 units",
    expiryDate: "2026-12-01",
    donorName: "SuperMart",
    donorId: "d3",
    location: "Main Avenue",
    status: "available",
    createdAt: "2026-03-28",
    aiMatchScore: 72,
    spoilageRisk: "low",
  },
  {
    id: "4",
    title: "Dairy Products - Milk & Yogurt",
    category: "Dairy",
    quantity: "25 kg",
    expiryDate: "2026-04-01",
    donorName: "Farm Fresh Co",
    donorId: "d4",
    location: "West End",
    status: "delivered",
    createdAt: "2026-03-27",
    reservedBy: "Hope Kitchen",
    aiMatchScore: 91,
    spoilageRisk: "high",
  },
  {
    id: "5",
    title: "Rice & Grains Bundle",
    category: "Grains",
    quantity: "200 kg",
    expiryDate: "2026-09-15",
    donorName: "Harvest Mills",
    donorId: "d5",
    location: "Industrial Park",
    status: "available",
    createdAt: "2026-03-31",
    aiMatchScore: 85,
    spoilageRisk: "low",
  },
  {
    id: "6",
    title: "Frozen Meals - Ready to Eat",
    category: "Frozen",
    quantity: "80 units",
    expiryDate: "2026-05-20",
    donorName: "Quick Bites Restaurant",
    donorId: "d6",
    location: "Food Court Plaza",
    status: "expired",
    createdAt: "2026-03-20",
    spoilageRisk: "low",
  },
];

export const mockNGOs: NGO[] = [
  { id: "n1", name: "City Food Bank", location: "Central District", capacity: 500, currentStock: 320, demandLevel: "high", distance: 2.3 },
  { id: "n2", name: "Hope Kitchen", location: "South Side", capacity: 300, currentStock: 150, demandLevel: "high", distance: 4.1 },
  { id: "n3", name: "Community Pantry", location: "East Borough", capacity: 200, currentStock: 180, demandLevel: "medium", distance: 6.7 },
  { id: "n4", name: "Meals on Wheels", location: "North End", capacity: 400, currentStock: 250, demandLevel: "medium", distance: 3.5 },
  { id: "n5", name: "Shelter Alliance", location: "Uptown", capacity: 350, currentStock: 100, demandLevel: "high", distance: 5.2 },
];

export const mockChartData = [
  { month: "Oct", saved: 1200, wasted: 400 },
  { month: "Nov", saved: 1800, wasted: 350 },
  { month: "Dec", saved: 2200, wasted: 280 },
  { month: "Jan", saved: 2500, wasted: 220 },
  { month: "Feb", saved: 2800, wasted: 180 },
  { month: "Mar", saved: 3100, wasted: 150 },
];

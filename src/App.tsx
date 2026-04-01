import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Listings from "./pages/Listings";
import NGOs from "./pages/NGOs";
import Inventory from "./pages/Inventory";
import Logistics from "./pages/Logistics";
import AIInsights from "./pages/AIInsights";
import Analytics from "./pages/Analytics";
import LoginVendor from "./pages/LoginVendor";
import LoginNGO from "./pages/LoginNGO";
import LoginAdmin from "./pages/LoginAdmin";
import SignupVendor from "./pages/SignupVendor";
import SignupNGO from "./pages/SignupNGO";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login/vendor" element={<LoginVendor />} />
            <Route path="/login/ngo" element={<LoginNGO />} />
            <Route path="/login/admin" element={<LoginAdmin />} />
            <Route path="/signup/vendor" element={<SignupVendor />} />
            <Route path="/signup/ngo" element={<SignupNGO />} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/listings" element={<ProtectedRoute allowedRoles={["vendor", "admin"]}><Listings /></ProtectedRoute>} />
            <Route path="/ngos" element={<ProtectedRoute allowedRoles={["ngo", "admin"]}><NGOs /></ProtectedRoute>} />
            <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
            <Route path="/logistics" element={<ProtectedRoute><Logistics /></ProtectedRoute>} />
            <Route path="/ai-insights" element={<ProtectedRoute><AIInsights /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute allowedRoles={["admin"]}><Analytics /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

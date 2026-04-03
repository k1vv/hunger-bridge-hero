import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

// Shared pages
import NotFound from "./pages/shared/NotFound";
import RoleDashboard from "./pages/shared/RoleDashboard";


// Vendor pages
import LoginVendor from "./pages/vendor/LoginVendor";
import SignupVendor from "./pages/vendor/SignupVendor";
import VendorDashboard from "./pages/vendor/VendorDashboard";
import CreateDonation from "./pages/vendor/CreateDonation";
import MyDonations from "./pages/vendor/MyDonations";
import DonationDetails from "./pages/vendor/DonationDetails";
import EditDonation from "./pages/vendor/EditDonation";
import PickupManagement from "./pages/vendor/PickupManagement";
import VendorProfile from "./pages/vendor/VendorProfile";
import ImpactReport from "./pages/vendor/ImpactReport";

// NGO pages
import LoginNGO from "./pages/ngo/LoginNGO";
import SignupNGO from "./pages/ngo/SignupNGO";
import NgoDashboard from "./pages/ngo/NgoDashboard";
import AvailableDonations from "./pages/ngo/AvailableDonations";
import MyClaims from "./pages/ngo/MyClaims";
import CollectionManagement from "./pages/ngo/CollectionManagement";
import NgoInventory from "./pages/ngo/NgoInventory";
import Distribution from "./pages/ngo/Distribution";
import NgoReports from "./pages/ngo/NgoReports";
import NgoProfile from "./pages/ngo/NgoProfile";

// Admin pages
import LoginAdmin from "./pages/admin/LoginAdmin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import UserManagement from "./pages/admin/UserManagement";
import UserVerification from "./pages/admin/UserVerification";
import DonationManagement from "./pages/admin/DonationManagement";
import ClaimsMonitoring from "./pages/admin/ClaimsMonitoring";
import Complaints from "./pages/admin/Complaints";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import Announcements from "./pages/admin/Announcements";
import RulesSettings from "./pages/admin/RulesSettings";
import AuditLogs from "./pages/admin/AuditLogs";
import AdminSettings from "./pages/admin/AdminSettings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Auth */}
            <Route path="/login/vendor" element={<LoginVendor />} />
            <Route path="/login/ngo" element={<LoginNGO />} />
            <Route path="/login/admin" element={<LoginAdmin />} />
            <Route path="/signup/vendor" element={<SignupVendor />} />
            <Route path="/signup/ngo" element={<SignupNGO />} />

            {/* Role-based dashboard redirect */}
            <Route path="/" element={<ProtectedRoute><RoleDashboard /></ProtectedRoute>} />

            {/* Shared */}
            <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />

            {/* Vendor routes */}
            <Route path="/vendor/dashboard" element={<ProtectedRoute allowedRoles={["vendor"]}><VendorDashboard /></ProtectedRoute>} />
            <Route path="/vendor/create" element={<ProtectedRoute allowedRoles={["vendor"]}><CreateDonation /></ProtectedRoute>} />
            <Route path="/vendor/donations" element={<ProtectedRoute allowedRoles={["vendor"]}><MyDonations /></ProtectedRoute>} />
            <Route path="/vendor/donations/:id" element={<ProtectedRoute allowedRoles={["vendor"]}><DonationDetails /></ProtectedRoute>} />
            <Route path="/vendor/donations/:id/edit" element={<ProtectedRoute allowedRoles={["vendor"]}><EditDonation /></ProtectedRoute>} />
            <Route path="/vendor/pickups" element={<ProtectedRoute allowedRoles={["vendor"]}><PickupManagement /></ProtectedRoute>} />
            <Route path="/vendor/profile" element={<ProtectedRoute allowedRoles={["vendor"]}><VendorProfile /></ProtectedRoute>} />
            <Route path="/vendor/impact" element={<ProtectedRoute allowedRoles={["vendor"]}><ImpactReport /></ProtectedRoute>} />

            {/* NGO routes */}
            <Route path="/ngo/dashboard" element={<ProtectedRoute allowedRoles={["ngo"]}><NgoDashboard /></ProtectedRoute>} />
            <Route path="/ngo/available" element={<ProtectedRoute allowedRoles={["ngo"]}><AvailableDonations /></ProtectedRoute>} />
            <Route path="/ngo/claims" element={<ProtectedRoute allowedRoles={["ngo"]}><MyClaims /></ProtectedRoute>} />
            <Route path="/ngo/collection" element={<ProtectedRoute allowedRoles={["ngo"]}><CollectionManagement /></ProtectedRoute>} />
            <Route path="/ngo/inventory" element={<ProtectedRoute allowedRoles={["ngo"]}><NgoInventory /></ProtectedRoute>} />
            <Route path="/ngo/distribution" element={<ProtectedRoute allowedRoles={["ngo"]}><Distribution /></ProtectedRoute>} />
            <Route path="/ngo/reports" element={<ProtectedRoute allowedRoles={["ngo"]}><NgoReports /></ProtectedRoute>} />
            <Route path="/ngo/profile" element={<ProtectedRoute allowedRoles={["ngo"]}><NgoProfile /></ProtectedRoute>} />

            {/* Admin routes */}
            <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute allowedRoles={["admin"]}><UserManagement /></ProtectedRoute>} />
            <Route path="/admin/verification" element={<ProtectedRoute allowedRoles={["admin"]}><UserVerification /></ProtectedRoute>} />
            <Route path="/admin/donations" element={<ProtectedRoute allowedRoles={["admin"]}><DonationManagement /></ProtectedRoute>} />
            <Route path="/admin/claims" element={<ProtectedRoute allowedRoles={["admin"]}><ClaimsMonitoring /></ProtectedRoute>} />
            <Route path="/admin/complaints" element={<ProtectedRoute allowedRoles={["admin"]}><Complaints /></ProtectedRoute>} />
            <Route path="/admin/analytics" element={<ProtectedRoute allowedRoles={["admin"]}><AdminAnalytics /></ProtectedRoute>} />
            <Route path="/admin/announcements" element={<ProtectedRoute allowedRoles={["admin"]}><Announcements /></ProtectedRoute>} />
            <Route path="/admin/rules" element={<ProtectedRoute allowedRoles={["admin"]}><RulesSettings /></ProtectedRoute>} />
            <Route path="/admin/audit" element={<ProtectedRoute allowedRoles={["admin"]}><AuditLogs /></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={["admin"]}><AdminSettings /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

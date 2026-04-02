import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

// Role-based dashboard router
const RoleDashboard = () => {
  const { role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Lazy imports handled by parent router — this just redirects
  if (role === "admin") return <Navigate to="/admin/dashboard" replace />;
  if (role === "ngo") return <Navigate to="/ngo/dashboard" replace />;
  return <Navigate to="/vendor/dashboard" replace />;
};

export default RoleDashboard;

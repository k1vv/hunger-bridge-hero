import { Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import NotificationBell from "./NotificationBell";

const AppLayout = () => {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="ml-64">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;

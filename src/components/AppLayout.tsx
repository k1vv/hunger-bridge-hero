import { Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import NotificationBell from "./NotificationBell";
import { AIChatbot } from "./AIChatbot";

const AppLayout = () => {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="ml-64">
        <Outlet />
      </main>
      {/* AI Chatbot - floating assistant */}
      <AIChatbot />
    </div>
  );
};

export default AppLayout;

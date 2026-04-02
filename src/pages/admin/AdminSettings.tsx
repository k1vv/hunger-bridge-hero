import PageLayout from "@/components/PageLayout";
import { Settings as SettingsIcon } from "lucide-react";

const AdminSettings = () => {
  return (
    <PageLayout title="Settings" subtitle="System configuration">
      <div className="max-w-xl rounded-xl border border-border bg-card p-6 shadow-card">
        <div className="flex items-center gap-3 mb-4">
          <SettingsIcon className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">System Settings</h3>
        </div>
        <div className="space-y-4 text-sm text-muted-foreground">
          <p>System settings and configuration options will be available here. This includes:</p>
          <ul className="space-y-2 ml-4">
            <li>• Role permissions management</li>
            <li>• Matching rules configuration</li>
            <li>• Notification preferences</li>
            <li>• System-wide defaults</li>
          </ul>
        </div>
      </div>
    </PageLayout>
  );
};

export default AdminSettings;

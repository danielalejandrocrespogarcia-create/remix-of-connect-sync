import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { BottomNav } from "./BottomNav";
import { Loader2 } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { useLocalNotifications } from "@/hooks/useLocalNotifications";
import { useFcm } from "@/hooks/useFcm";
import { InstallPrompt } from "./InstallPrompt";

export const AppLayout = () => {
  const { user, loading } = useAuth();
  useNotifications();
  useLocalNotifications();
  useFcm();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="mx-auto min-h-screen max-w-md pb-24 safe-top safe-x">
      <div className="animate-fade-in">
        <Outlet />
      </div>
      <BottomNav />
      <InstallPrompt />
    </div>
  );
};

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as WebRouter, HashRouter, Route, Routes } from "react-router-dom";
import { isCapacitorApp } from "@/lib/platform";

// Inside the Android WebView, hash routing avoids blank screens on deep routes.
const BrowserRouter = isCapacitorApp ? HashRouter : WebRouter;
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Chat from "./pages/Chat";
import Profile from "./pages/Profile";
import TeacherPanel from "./pages/TeacherPanel";
import AdminPanel from "./pages/AdminPanel";
import SchedulePage from "./pages/SchedulePage";
import { AppLayout } from "@/components/AppLayout";
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
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/app" element={<AppLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="horario" element={<SchedulePage />} />
              <Route path="chat" element={<Chat />} />
              <Route path="perfil" element={<Profile />} />
              <Route path="docente" element={<TeacherPanel />} />
              <Route path="admin" element={<AdminPanel />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

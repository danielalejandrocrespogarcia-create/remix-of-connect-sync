import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { UPTLogo } from "@/components/UPTLogo";
import { Loader2 } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => {
      navigate(user ? "/app" : "/auth", { replace: true });
    }, 900);
    return () => clearTimeout(t);
  }, [user, loading, navigate]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="animate-fade-in flex flex-col items-center text-center">
        <UPTLogo size={120} />
        <h1 className="mt-6 text-3xl font-bold tracking-tight">
          UPT <span className="text-accent">ARAGUA</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Campus Conectado · Red estudiantil</p>
        <Loader2 className="mt-8 h-5 w-5 animate-spin text-accent" />
      </div>
    </main>
  );
};

export default Index;

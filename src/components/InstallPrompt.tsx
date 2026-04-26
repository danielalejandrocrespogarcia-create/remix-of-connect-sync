import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, X, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "upt_install_dismissed_at";
const DISMISS_DAYS = 7;

export const InstallPrompt = () => {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    // Already installed?
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-ignore – iOS Safari
      window.navigator.standalone === true;
    if (standalone) return;

    // Recently dismissed?
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_DAYS * 86400_000) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // iOS doesn't fire beforeinstallprompt — show manual hint
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua) && !/crios|fxios/.test(ua);
    if (isIOS) {
      setIosHint(true);
      setShow(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") setShow(false);
    setDeferred(null);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-24 left-1/2 z-50 w-[92%] max-w-md -translate-x-1/2 animate-fade-in">
      <div className="neon-card rounded-2xl border border-accent/40 bg-card/95 p-4 shadow-2xl backdrop-blur-xl">
        <button
          onClick={dismiss}
          className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground hover:bg-accent/10"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-start gap-3 pr-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
            <Download className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold">Instalar UPT Aragua</h3>
            {iosHint ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Toca <Share className="inline h-3 w-3" /> Compartir en Safari y luego{" "}
                <span className="font-semibold text-foreground">"Añadir a pantalla de inicio"</span>.
              </p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">
                Instálala en tu teléfono para acceso rápido, notificaciones y modo pantalla completa.
              </p>
            )}
            {!iosHint && (
              <Button
                size="sm"
                variant="neon"
                onClick={install}
                className="mt-3 w-full"
              >
                <Download className="h-3.5 w-3.5" />
                Instalar app
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

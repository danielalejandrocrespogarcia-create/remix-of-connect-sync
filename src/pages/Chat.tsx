import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useChat, ChatMessage } from "@/hooks/useChat";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Mic, Square, Play, Pause, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function Chat() {
  const { user, role, activeSection, loading: authLoading } = useAuth();
  const session = activeSection;
  const { messages, loading, getDisplayName, sendText, sendVoice } = useChat(session);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const recordTimerRef = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  if (authLoading || !user) {
    return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>;
  }

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    const { error } = await sendText(user.id, text);
    setSending(false);
    if (error) { toast.error("No se pudo enviar"); return; }
    setText("");
  };

  const startRecord = () => {
    setRecording(true);
    setRecordSeconds(0);
    recordTimerRef.current = window.setInterval(() => setRecordSeconds((s) => s + 1), 1000);
  };

  const stopRecord = async () => {
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    const dur = recordSeconds;
    setRecording(false);
    setRecordSeconds(0);
    if (dur < 1) return;
    const label = role === "teacher" ? "Aviso de voz oficial" : "Mensaje de voz";
    const { error } = await sendVoice(user.id, label, dur);
    if (error) toast.error("No se pudo enviar el audio");
  };

  return (
    <div className="flex h-[calc(100vh-5rem)] flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/50 px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold">Chat · {session}</h1>
            <p className="text-[10px] uppercase tracking-widest text-accent">Tiempo real</p>
          </div>
          <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent neon-border">
            {messages.length} msg
          </span>
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
        {loading ? (
          <div className="flex justify-center pt-8"><Loader2 className="h-5 w-5 animate-spin text-accent" /></div>
        ) : messages.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground pt-12">
            Sé el primero en saludar a tu sesión 👋
          </p>
        ) : (
          messages.map((m) => (
            <Bubble
              key={m.id}
              msg={m}
              mine={m.user_id === user.id}
              displayName={getDisplayName(m.user_id)}
              isAnonymous={getDisplayName(m.user_id).startsWith("Usuario_Anonimo_")}
              isTeacherMessage={false /* could be enhanced with role lookup */}
            />
          ))
        )}
      </div>

      {/* Composer */}
      <form onSubmit={handleSend} className="border-t border-border bg-card/80 px-3 py-3 backdrop-blur-xl">
        {recording ? (
          <div className="flex items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2">
            <span className="flex h-2 w-2 animate-pulse rounded-full bg-destructive" />
            <span className="flex-1 text-sm font-medium">Grabando · {formatTime(recordSeconds)}</span>
            <Button type="button" size="sm" variant="neon" onClick={stopRecord}>
              <Square className="h-3.5 w-3.5" /> Enviar
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Input value={text} onChange={(e) => setText(e.target.value)}
              placeholder="Escribe un mensaje..." className="flex-1" maxLength={500} />
            {text.trim() ? (
              <Button type="submit" size="icon" variant="neon" disabled={sending}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            ) : (
              <Button type="button" size="icon" variant="neon" onClick={startRecord}
                title={role === "teacher" ? "Aviso oficial de voz" : "Mensaje de voz"}>
                <Mic className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </form>
    </div>
  );
}

function Bubble({ msg, mine, displayName, isAnonymous }: {
  msg: ChatMessage; mine: boolean; displayName: string; isAnonymous: boolean; isTeacherMessage: boolean;
}) {
  return (
    <div className={cn("flex animate-fade-in", mine ? "justify-end" : "justify-start")}>
      <div className={cn(
        "max-w-[78%] rounded-2xl px-3 py-2",
        mine
          ? "bg-accent text-accent-foreground rounded-br-sm"
          : "neon-card rounded-bl-sm"
      )}>
        {!mine && (
          <p className={cn(
            "mb-0.5 text-[10px] font-bold uppercase tracking-wider",
            isAnonymous ? "text-muted-foreground" : "text-accent"
          )}>
            {displayName}
          </p>
        )}
        {msg.message_type === "voice" ? (
          <VoicePlayer label={msg.content} duration={msg.duration_seconds ?? 0} mine={mine} />
        ) : (
          <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
        )}
        <p className={cn("mt-1 text-[9px] opacity-70 text-right", mine ? "" : "text-muted-foreground")}>
          {new Date(msg.created_at).toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}

function VoicePlayer({ label, duration, mine }: { label: string; duration: number; mine: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<number | null>(null);

  const toggle = () => {
    if (playing) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setPlaying(false);
      return;
    }
    setPlaying(true);
    setProgress(0);
    const start = Date.now();
    intervalRef.current = window.setInterval(() => {
      const p = (Date.now() - start) / 1000;
      if (p >= duration) {
        setProgress(1);
        setPlaying(false);
        if (intervalRef.current) clearInterval(intervalRef.current);
      } else {
        setProgress(p / duration);
      }
    }, 50);
  };

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const bars = 18;
  return (
    <div className="flex items-center gap-2 min-w-[180px]">
      <button type="button" onClick={toggle}
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          mine ? "bg-accent-foreground/20" : "bg-accent/15 text-accent"
        )}>
        {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
      </button>
      <div className="flex flex-1 items-center gap-[2px]">
        {Array.from({ length: bars }).map((_, i) => {
          const filled = i / bars <= progress;
          const h = 6 + ((i * 7) % 12);
          return (
            <span key={i}
              className={cn("w-[2px] rounded-full transition-colors",
                mine ? (filled ? "bg-accent-foreground" : "bg-accent-foreground/30")
                     : (filled ? "bg-accent" : "bg-accent/25"))}
              style={{ height: `${h}px` }} />
          );
        })}
      </div>
      <span className={cn("text-[10px] tabular-nums", mine ? "text-accent-foreground/80" : "text-muted-foreground")}>
        {formatTime(duration)}
      </span>
    </div>
  );
}

function formatTime(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

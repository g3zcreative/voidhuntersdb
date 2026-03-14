import { useState, useEffect } from "react";
import { MessageSquare, Send, X, Heart } from "lucide-react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const EMOJIS = [
  { emoji: "😡", label: "Terrible" },
  { emoji: "😕", label: "Bad" },
  { emoji: "😐", label: "Okay" },
  { emoji: "🙂", label: "Good" },
  { emoji: "😍", label: "Love it" },
];

type WidgetState = "collapsed" | "rating" | "message" | "thanks";

export function FeedbackWidget() {
  const location = useLocation();
  const [state, setState] = useState<WidgetState>("collapsed");
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = location.pathname.startsWith("/admin");

  const reset = () => {
    setState("collapsed");
    setSelectedRating(null);
    setMessage("");
  };

  const handleRating = (rating: number) => {
    setSelectedRating(rating);
    setState("message");
  };

  const submit = async () => {
    if (selectedRating === null) return;
    setSubmitting(true);
    await supabase.from("feedback").insert({
      rating: selectedRating,
      message: message.trim() || null,
      page_url: location.pathname,
    });
    setSubmitting(false);
    setState("thanks");
  };

  useEffect(() => {
    if (state === "thanks") {
      const t = setTimeout(reset, 2000);
      return () => clearTimeout(t);
    }
  }, [state]);

  if (isAdmin) return null;

  if (state === "collapsed") {
    return (
      <button
        onClick={() => setState("rating")}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-border bg-card/80 px-4 py-2.5 text-sm text-muted-foreground shadow-lg backdrop-blur-sm transition-all hover:bg-card hover:text-foreground hover:shadow-xl hover:scale-105"
      >
        <MessageSquare className="h-4 w-4" />
        <span className="font-medium">Feedback</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-72 rounded-xl border border-border bg-card shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <span className="text-sm font-display font-semibold text-foreground">
          {state === "thanks" ? "Thank you!" : "How's your experience?"}
        </span>
        <button
          onClick={reset}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground hover:bg-muted"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Thanks state */}
      {state === "thanks" && (
        <div className="flex flex-col items-center gap-2 px-4 py-6 text-center">
          <Heart className="h-8 w-8 text-primary animate-in zoom-in duration-300" />
          <p className="text-sm text-muted-foreground">
            Your feedback helps us improve.
          </p>
        </div>
      )}

      {/* Rating state */}
      {state === "rating" && (
        <div className="px-4 py-4">
          <div className="flex justify-between gap-1">
            {EMOJIS.map((e, i) => (
              <button
                key={i}
                onClick={() => handleRating(i + 1)}
                className="group flex flex-col items-center gap-1.5 rounded-lg px-2 py-2 transition-all hover:bg-muted"
                title={e.label}
              >
                <span className="text-2xl transition-transform group-hover:scale-125">
                  {e.emoji}
                </span>
                <span className="text-[10px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                  {e.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Message state */}
      {state === "message" && (
        <div className="px-4 pb-4 pt-1 space-y-3">
          {/* Selected emoji recap */}
          <div className="flex items-center gap-2">
            {EMOJIS.map((e, i) => (
              <button
                key={i}
                onClick={() => setSelectedRating(i + 1)}
                className={`rounded-md p-1 text-lg transition-all ${
                  selectedRating === i + 1
                    ? "bg-primary/20 scale-110"
                    : "opacity-40 hover:opacity-70"
                }`}
              >
                {e.emoji}
              </button>
            ))}
          </div>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Anything else you'd like to share? (optional)"
            rows={2}
            className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />

          <div className="flex gap-2">
            <button
              onClick={submit}
              disabled={submitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              {submitting ? "Sending…" : "Send"}
            </button>
            <button
              onClick={() => { setMessage(""); submit(); }}
              disabled={submitting}
              className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Skip
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

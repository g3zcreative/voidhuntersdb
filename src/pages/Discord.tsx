import { useEffect } from "react";

const DiscordRedirect = () => {
  useEffect(() => {
    window.location.href = "https://discord.gg/q3be2EEwyZ";
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <p className="text-muted-foreground">Redirecting to Discord…</p>
    </div>
  );
};

export default DiscordRedirect;

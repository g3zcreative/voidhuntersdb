import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

function getSessionId() {
  let id = sessionStorage.getItem("pv_sid");
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem("pv_sid", id);
  }
  return id;
}

export function usePageView() {
  const location = useLocation();
  const lastPath = useRef<string>("");

  useEffect(() => {
    const path = location.pathname;
    // Skip admin pages and avoid duplicate fires
    if (path.startsWith("/admin") || path === lastPath.current) return;
    lastPath.current = path;

    const sessionId = getSessionId();
    supabase
      .from("page_views")
      .insert({ page_url: path, session_id: sessionId })
      .then(() => {});
  }, [location.pathname]);
}

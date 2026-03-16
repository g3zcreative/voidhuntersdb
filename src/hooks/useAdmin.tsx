import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useAdmin() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isContributor, setIsContributor] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setIsAdmin(false);
      setIsContributor(false);
      setLoading(false);
      return;
    }

    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .then(({ data }) => {
        const roles = (data || []).map((r) => r.role);
        setIsAdmin(roles.includes("admin"));
        setIsContributor(roles.includes("contributor"));
        setLoading(false);
      });
  }, [user, authLoading]);

  // canAccessAdmin = admin OR contributor
  return {
    isAdmin,
    isContributor,
    canAccessAdmin: isAdmin || isContributor,
    loading: loading || authLoading,
  };
}

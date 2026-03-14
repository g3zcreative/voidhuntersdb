import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface AdminHeaderState {
  breadcrumbs: { label: string; href?: string }[];
  actions: ReactNode;
}

interface AdminHeaderContextValue extends AdminHeaderState {
  setBreadcrumbs: (crumbs: { label: string; href?: string }[]) => void;
  setActions: (actions: ReactNode) => void;
}

const AdminHeaderContext = createContext<AdminHeaderContextValue | null>(null);

export function AdminHeaderProvider({ children }: { children: ReactNode }) {
  const [breadcrumbs, setBreadcrumbs] = useState<{ label: string; href?: string }[]>([]);
  const [actions, setActions] = useState<ReactNode>(null);

  return (
    <AdminHeaderContext.Provider value={{ breadcrumbs, actions, setBreadcrumbs: useCallback(setBreadcrumbs, []), setActions: useCallback(setActions, []) }}>
      {children}
    </AdminHeaderContext.Provider>
  );
}

export function useAdminHeader() {
  const ctx = useContext(AdminHeaderContext);
  if (!ctx) throw new Error("useAdminHeader must be used within AdminHeaderProvider");
  return ctx;
}

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminCrudPage, ColumnConfig } from "./AdminCrudPage";

export default function AdminWeapons() {
  const { data: factions = [] } = useQuery({
    queryKey: ["factions_for_select"],
    queryFn: async () => {
      const { data, error } = await supabase.from("factions").select("id, name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const factionOptions = factions.map((f) => ({ value: f.id, label: f.name }));

  const columns: ColumnConfig[] = [
    { key: "name", label: "Name", required: true, showInTable: true },
    { key: "slug", label: "Slug", required: true, showInTable: true },
    { key: "passive", label: "Passive", type: "textarea" },
    { key: "rank", label: "Rank", type: "number", required: true, showInTable: true },
    { key: "imprint_id", label: "Imprint ID" },
    { key: "rarity", label: "Rarity", type: "select", required: true, showInTable: true, options: [
      { value: "Rare", label: "Rare" },
      { value: "Epic", label: "Epic" },
      { value: "Legendary", label: "Legendary" },
    ]},
    { key: "faction_id", label: "Faction", type: "select", options: factionOptions, showInTable: false },
    { key: "image_url", label: "Image URL", storageBucket: "images" },
  ];

  return <AdminCrudPage tableName="weapons" title="Weapons" columns={columns} />;
}

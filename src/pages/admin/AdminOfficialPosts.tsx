import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminCrudPage, ColumnConfig } from "./AdminCrudPage";

export default function AdminOfficialPosts() {
  const { data: authors } = useQuery({
    queryKey: ["authors"],
    queryFn: async () => {
      const { data, error } = await supabase.from("authors").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const authorOptions = (authors ?? []).map((a) => ({
    value: a.name,
    label: `${a.name}${a.role ? ` (${a.role})` : ""}`,
  }));

  const columns: ColumnConfig[] = [
    { key: "title", label: "Title", showInTable: true },
    { key: "author", label: "Author", type: "select", options: authorOptions, required: true, showInTable: true },
    { key: "author_role", label: "Author Role", showInTable: true },
    { key: "source", label: "Source", showInTable: true },
    { key: "channel_name", label: "Channel Name", showInTable: true },
    { key: "content", label: "Content", type: "markdown", required: true, showInTable: true },
    { key: "image_url", label: "Image URL" },
    { key: "message_url", label: "Message URL" },
    { key: "region", label: "Region" },
    { key: "posted_at", label: "Posted At", type: "datetime" },
    { key: "is_edited", label: "Edited", type: "boolean" },
  ];

  return (
    <AdminCrudPage
      tableName="official_posts"
      title="Official Posts"
      columns={columns}
      defaults={{ source: "Discord" }}
    />
  );
}

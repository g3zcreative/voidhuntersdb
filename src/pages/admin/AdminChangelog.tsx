import { AdminCrudPage, ColumnConfig } from "./AdminCrudPage";

const columns: ColumnConfig[] = [
  { key: "title", label: "Title", required: true, showInTable: true },
  { key: "description", label: "Description", type: "textarea", required: true, showInTable: true },
  { key: "change_type", label: "Type", showInTable: true },
  { key: "version", label: "Version", showInTable: true },
  { key: "published_at", label: "Published At", type: "datetime", showInTable: true },
];

export default function AdminChangelog() {
  return <AdminCrudPage tableName="site_changelog" title="Changelog" columns={columns} />;
}

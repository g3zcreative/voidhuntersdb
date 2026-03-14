import { AdminCrudPage, ColumnConfig } from "./AdminCrudPage";

const columns: ColumnConfig[] = [
  { key: "title", label: "Title", required: true, showInTable: true },
  { key: "description", label: "Description", type: "textarea", showInTable: true },
  { key: "status", label: "Status", type: "select", options: [
    { value: "planned", label: "Planned" },
    { value: "in_progress", label: "In Progress" },
    { value: "completed", label: "Shipped" },
  ], showInTable: true },
  { key: "category", label: "Category", showInTable: true },
  { key: "sort_order", label: "Sort Order", type: "number" },
  { key: "target_date", label: "Target Date" },
];

export default function AdminRoadmap() {
  return <AdminCrudPage tableName="roadmap_items" title="Roadmap" columns={columns} />;
}

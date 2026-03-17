import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Plus, Trash2 } from "lucide-react";

export interface InlineSkill {
  _key: string; // local tracking key
  _status: "new" | "existing" | "deleted";
  id?: string;
  name: string;
  slug: string;
  type: string | null;
  sort_order: number | null;
  max_level: number | null;
  cooldown: number | null;
  description: string | null;
  icon: string | null;
  effects: Record<string, any> | null;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function JsonFieldEditorInline({
  value,
  onChange,
}: {
  value: Record<string, any> | null;
  onChange: (val: Record<string, any> | null) => void;
}) {
  const obj = value && typeof value === "object" ? value : {};
  const entries = Object.entries(obj);

  const update = (oldKey: string, newKey: string, newVal: string) => {
    const next: Record<string, any> = {};
    entries.forEach(([k, v]) => {
      if (k === oldKey) {
        if (newKey.trim()) next[newKey.trim()] = isNaN(Number(newVal)) ? newVal : Number(newVal);
      } else {
        next[k] = v;
      }
    });
    onChange(Object.keys(next).length > 0 ? next : null);
  };

  const remove = (key: string) => {
    const next = { ...obj };
    delete next[key];
    onChange(Object.keys(next).length > 0 ? next : null);
  };

  return (
    <div className="space-y-2">
      {entries.map(([key, val], i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            placeholder="Key (e.g. lv1)"
            value={key}
            onChange={(e) => update(key, e.target.value, String(val))}
            className="flex-1 font-mono text-xs"
          />
          <Input
            placeholder="Value"
            value={String(val ?? "")}
            onChange={(e) => update(key, key, e.target.value)}
            className="flex-1 font-mono text-xs"
          />
          <Button type="button" variant="ghost" size="icon" onClick={() => remove(key)} className="shrink-0 h-8 w-8">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange({ ...obj, "": "" })}
        className="text-xs"
      >
        + Add effect level
      </Button>
    </div>
  );
}

let keyCounter = 0;
function nextKey() {
  return `skill-${++keyCounter}-${Date.now()}`;
}

export function createEmptySkill(): InlineSkill {
  return {
    _key: nextKey(),
    _status: "new",
    name: "",
    slug: "",
    type: null,
    sort_order: null,
    max_level: null,
    cooldown: null,
    description: null,
    icon: null,
    effects: null,
  };
}

export function existingToInlineSkill(row: Record<string, any>): InlineSkill {
  return {
    _key: row.id || nextKey(),
    _status: "existing",
    id: row.id,
    name: row.name || "",
    slug: row.slug || "",
    type: row.type ?? null,
    sort_order: row.sort_order ?? null,
    max_level: row.max_level ?? null,
    cooldown: row.cooldown ?? null,
    description: row.description ?? null,
    icon: row.icon ?? null,
    effects: row.effects ?? null,
  };
}

interface Props {
  skills: InlineSkill[];
  onChange: (skills: InlineSkill[]) => void;
}

export function InlineSkillsEditor({ skills, onChange }: Props) {
  const visibleSkills = skills.filter((s) => s._status !== "deleted");

  const updateSkill = (key: string, field: keyof InlineSkill, value: any) => {
    onChange(
      skills.map((s) => {
        if (s._key !== key) return s;
        const updated = { ...s, [field]: value };
        // Auto-slug from name for new skills
        if (field === "name" && s._status === "new") {
          updated.slug = slugify(String(value || ""));
        }
        return updated;
      })
    );
  };

  const deleteSkill = (key: string) => {
    onChange(
      skills.map((s) => {
        if (s._key !== key) return s;
        if (s._status === "new") return { ...s, _status: "deleted" as const };
        return { ...s, _status: "deleted" as const };
      })
    );
  };

  const addSkill = () => {
    onChange([...skills, createEmptySkill()]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Skills
        </h2>
        <Button type="button" variant="outline" size="sm" onClick={addSkill}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Skill
        </Button>
      </div>

      {visibleSkills.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-6 text-center text-sm text-muted-foreground">
          No skills yet. Click "Add Skill" to get started.
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <Accordion type="multiple" className="w-full">
            {visibleSkills.map((skill, index) => (
              <AccordionItem key={skill._key} value={skill._key} className="border-border">
                <div className="flex items-center">
                  <AccordionTrigger className="flex-1 px-4 py-3 hover:no-underline">
                    <div className="flex items-center gap-2 text-left">
                      <span className="text-xs text-muted-foreground font-mono w-6">
                        {(skill.sort_order ?? index + 1)}
                      </span>
                      <span className="font-medium text-sm">
                        {skill.name || "New Skill"}
                      </span>
                      {skill.type && (
                        <span className="text-xs text-muted-foreground">· {skill.type}</span>
                      )}
                    </div>
                  </AccordionTrigger>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="mr-2 h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSkill(skill._key);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <AccordionContent className="px-4 pb-4">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Name */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Name</Label>
                      <Input
                        value={skill.name}
                        onChange={(e) => updateSkill(skill._key, "name", e.target.value)}
                        placeholder="Skill name"
                      />
                    </div>
                    {/* Slug */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Slug</Label>
                      <Input
                        value={skill.slug}
                        onChange={(e) => updateSkill(skill._key, "slug", e.target.value)}
                        placeholder="auto-generated"
                        className="font-mono text-xs"
                      />
                    </div>
                    {/* Type */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Type</Label>
                      <Input
                        value={skill.type ?? ""}
                        onChange={(e) => updateSkill(skill._key, "type", e.target.value || null)}
                        placeholder="e.g. Active, Passive"
                      />
                    </div>
                    {/* Sort Order */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Sort Order</Label>
                      <Input
                        type="number"
                        value={skill.sort_order ?? ""}
                        onChange={(e) =>
                          updateSkill(skill._key, "sort_order", e.target.value === "" ? null : Number(e.target.value))
                        }
                      />
                    </div>
                    {/* Max Level */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Max Level</Label>
                      <Input
                        type="number"
                        value={skill.max_level ?? ""}
                        onChange={(e) =>
                          updateSkill(skill._key, "max_level", e.target.value === "" ? null : Number(e.target.value))
                        }
                      />
                    </div>
                    {/* Cooldown */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Cooldown</Label>
                      <Input
                        type="number"
                        value={skill.cooldown ?? ""}
                        onChange={(e) =>
                          updateSkill(skill._key, "cooldown", e.target.value === "" ? null : Number(e.target.value))
                        }
                      />
                    </div>
                    {/* Icon URL */}
                    <div className="col-span-2 space-y-1.5">
                      <Label className="text-xs">Icon URL</Label>
                      <Input
                        value={skill.icon ?? ""}
                        onChange={(e) => updateSkill(skill._key, "icon", e.target.value || null)}
                        placeholder="https://..."
                      />
                    </div>
                    {/* Description */}
                    <div className="col-span-2 space-y-1.5">
                      <Label className="text-xs">Description</Label>
                      <Textarea
                        value={skill.description ?? ""}
                        onChange={(e) => updateSkill(skill._key, "description", e.target.value || null)}
                        className="min-h-[60px]"
                        placeholder="Skill description..."
                      />
                    </div>
                    {/* Effects JSON */}
                    <div className="col-span-2 space-y-1.5">
                      <Label className="text-xs">Effects (per level)</Label>
                      <JsonFieldEditorInline
                        value={skill.effects}
                        onChange={(val) => updateSkill(skill._key, "effects", val)}
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      )}
    </div>
  );
}

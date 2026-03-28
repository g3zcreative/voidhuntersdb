import React, { useRef, useEffect, useState } from "react";
import { calcMinMult, calcMaxMult, getEfficiencyRating, RATING_COLORS } from "@/lib/skill-efficiency";
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
import { Plus, Trash2, Upload, Loader2, X, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const KNOWN_SKILL_TAGS = [
  "Melee", "Ranged", "AoE", "Damage", "Healing", "Debuffs", "Buffs",
  "Support", "Fire", "Light", "Void", "Void Touch", "Turn Meter Down",
];

function SkillTagsMultiSelect({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const selected = value ? value.split(",").map((t) => t.trim()).filter(Boolean) : [];
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const allTags = Array.from(new Set([...KNOWN_SKILL_TAGS, ...selected])).sort();
  const filtered = allTags.filter((t) => !selected.includes(t) && t.toLowerCase().includes(search.toLowerCase()));

  const toggle = (tag: string) => {
    const next = selected.includes(tag) ? selected.filter((t) => t !== tag) : [...selected, tag];
    onChange(next.length > 0 ? next.join(", ") : null);
  };

  const addCustom = () => {
    const tag = search.trim();
    if (tag && !selected.includes(tag)) {
      onChange([...selected, tag].join(", "));
    }
    setSearch("");
  };

  return (
    <div className="space-y-2">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1 text-xs">
              {tag}
              <button type="button" onClick={() => toggle(tag)} className="ml-0.5 hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className="w-full justify-between text-sm font-normal text-muted-foreground">
            {selected.length > 0 ? `${selected.length} selected` : "Select tags…"}
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-2" align="start">
          <Input
            placeholder="Search or create tag…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }}
            className="mb-2"
          />
          <div className="max-h-[180px] overflow-y-auto space-y-0.5">
            {filtered.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggle(tag)}
                className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent"
              >
                {tag}
              </button>
            ))}
            {filtered.length === 0 && search.trim() && (
              <button
                type="button"
                onClick={addCustom}
                className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent text-primary"
              >
                Create "{search.trim()}"
              </button>
            )}
            {filtered.length === 0 && !search.trim() && (
              <p className="text-xs text-muted-foreground px-2 py-1.5">All tags selected</p>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
import { supabase } from "@/integrations/supabase/client";
import { compressImage, compressedExtension } from "@/lib/image-utils";
import { toast } from "@/hooks/use-toast";

function InlineImageUpload({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setUploading(true);
    try {
      const compressed = await compressImage(file);
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${compressedExtension}`;
      const { error } = await supabase.storage.from("images").upload(path, compressed);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("images").getPublicUrl(path);
      onChange(urlData.publicUrl);
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <Input
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        placeholder="https://..."
        className="flex-1"
      />
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
      <Button type="button" variant="outline" size="icon" className="shrink-0 h-9 w-9" onClick={() => inputRef.current?.click()} disabled={uploading} title="Upload image">
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
      </Button>
      {value && (
        <Button type="button" variant="ghost" size="icon" className="shrink-0 h-9 w-9" onClick={() => onChange(null)} title="Clear">
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

export interface InlineAwakening {
  _key: string;
  _status: "new" | "existing" | "deleted";
  id?: string;
  awakening_level: number | null;
  effect: string | null;
}

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
  // Efficiency fields
  skill_levels: number | null;
  max_cd: number | null;
  skill_tags: string | null;
  target_type: string | null;
  hit1_percent: number | null;
  hit1_count: number | null;
  hit1_book_bonus: number | null;
  hit2_percent: number | null;
  hit2_count: number | null;
  hit2_book_bonus: number | null;
  // Nested awakenings
  _children_awakenings?: InlineAwakening[];
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

  const addNextLevel = () => {
    const existingLevels = entries
      .map(([k]) => { const m = k.match(/(\d+)/); return m ? parseInt(m[1]) : 0; })
      .filter((n) => n > 0);
    const nextLevel = existingLevels.length === 0 ? 2 : Math.max(...existingLevels) + 1;
    const key = `Level ${nextLevel}`;
    onChange({ ...obj, [key]: "" });
  };

  return (
    <div className="space-y-2">
      {entries.map(([key, val], i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground w-16 shrink-0">{key}</span>
          <Input
            placeholder="Effect description..."
            value={String(val ?? "")}
            onChange={(e) => update(key, key, e.target.value)}
            className="flex-1 text-xs"
          />
          <Button type="button" variant="ghost" size="icon" onClick={() => remove(key)} className="shrink-0 h-8 w-8">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}
      {entries.length < 5 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addNextLevel}
          className="text-xs"
        >
          + Add effect level
        </Button>
      )}
    </div>
  );
}

let keyCounter = 0;
function nextKey() {
  return `skill-${++keyCounter}-${Date.now()}`;
}

const EFFICIENCY_DEFAULTS = {
  skill_levels: null, max_cd: null, skill_tags: null, target_type: null,
  hit1_percent: null, hit1_count: null, hit1_book_bonus: null,
  hit2_percent: null, hit2_count: null, hit2_book_bonus: null,
};

export function createEmptySkill(): InlineSkill {
  return {
    _key: nextKey(), _status: "new", name: "", slug: "",
    type: null, sort_order: null, max_level: null, cooldown: null,
    description: null, icon: null, effects: null, ...EFFICIENCY_DEFAULTS,
  };
}

export function existingToInlineSkill(row: Record<string, any>): InlineSkill {
  const awakenings = (row._children_awakenings || []).map((a: any) => ({
    _key: a.id || a._key || `awk-${++keyCounter}-${Date.now()}`,
    _status: a._status || "existing" as const,
    id: a.id,
    awakening_level: a.awakening_level ?? null,
    effect: a.effect ?? null,
  }));
  return {
    _key: row.id || nextKey(), _status: "existing", id: row.id,
    name: row.name || "", slug: row.slug || "", type: row.type ?? null,
    sort_order: row.sort_order ?? null, max_level: row.max_level ?? null,
    cooldown: row.cooldown ?? null, description: row.description ?? null,
    icon: row.icon ?? null, effects: row.effects ?? null,
    skill_levels: row.skill_levels ?? null, max_cd: row.max_cd ?? null,
    skill_tags: row.skill_tags ?? null, target_type: row.target_type ?? null,
    hit1_percent: row.hit1_percent ?? null, hit1_count: row.hit1_count ?? null,
    hit1_book_bonus: row.hit1_book_bonus ?? null, hit2_percent: row.hit2_percent ?? null,
    hit2_count: row.hit2_count ?? null, hit2_book_bonus: row.hit2_book_bonus ?? null,
    _children_awakenings: awakenings,
  };
}

interface Props {
  skills: InlineSkill[];
  onChange: (skills: InlineSkill[]) => void;
}

export function InlineSkillsEditor({ skills, onChange }: Props) {
  const visibleSkills = skills.filter((s) => s._status !== "deleted");
  const [openItems, setOpenItems] = useState<string[]>([]);
  const lastAddedKeyRef = useRef<string | null>(null);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (lastAddedKeyRef.current) {
      const el = itemRefs.current[lastAddedKeyRef.current];
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 150);
      }
      lastAddedKeyRef.current = null;
    }
  }, [skills]);

  const updateSkill = (key: string, field: keyof InlineSkill, value: any) => {
    onChange(
      skills.map((s) => {
        if (s._key !== key) return s;
        const updated = { ...s, [field]: value };
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
    const newSkill = createEmptySkill();
    lastAddedKeyRef.current = newSkill._key;
    setOpenItems((prev) => [...prev, newSkill._key]);
    onChange([...skills, newSkill]);
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
          <Accordion type="multiple" value={openItems} onValueChange={setOpenItems} className="w-full">
            {visibleSkills.map((skill, index) => (
              <AccordionItem key={skill._key} value={skill._key} className="border-border" ref={(el) => { itemRefs.current[skill._key] = el; }}>
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
                      <InlineImageUpload
                        value={skill.icon}
                        onChange={(v) => updateSkill(skill._key, "icon", v)}
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

                    {/* ── Damage Efficiency Section ── */}
                    <div className="col-span-2 mt-2 border-t border-border pt-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Damage Efficiency</p>
                      <div className="grid grid-cols-3 gap-4">
                        {/* Target Type */}
                        <div className="space-y-1.5">
                          <Label className="text-xs">Target Type</Label>
                          <select
                            value={skill.target_type ?? ""}
                            onChange={(e) => updateSkill(skill._key, "target_type", e.target.value || null)}
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                          >
                            <option value="">—</option>
                            <option value="ST">ST (Single)</option>
                            <option value="AoE">AoE</option>
                            <option value="RND">RND (Random)</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Skill Levels</Label>
                          <Input type="number" value={skill.skill_levels ?? ""} onChange={(e) => updateSkill(skill._key, "skill_levels", e.target.value === "" ? null : Number(e.target.value))} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Max CD</Label>
                          <Input type="number" value={skill.max_cd ?? ""} onChange={(e) => updateSkill(skill._key, "max_cd", e.target.value === "" ? null : Number(e.target.value))} />
                        </div>
                      </div>

                      {/* Hit 1 */}
                      <p className="text-xs text-muted-foreground mt-3 mb-1.5">Hit 1</p>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs">ATK %</Label>
                          <Input type="number" step="0.01" value={skill.hit1_percent ?? ""} onChange={(e) => updateSkill(skill._key, "hit1_percent", e.target.value === "" ? null : Number(e.target.value))} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Count</Label>
                          <Input type="number" value={skill.hit1_count ?? ""} onChange={(e) => updateSkill(skill._key, "hit1_count", e.target.value === "" ? null : Number(e.target.value))} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Book Bonus</Label>
                          <Input type="number" step="0.01" value={skill.hit1_book_bonus ?? ""} onChange={(e) => updateSkill(skill._key, "hit1_book_bonus", e.target.value === "" ? null : Number(e.target.value))} />
                        </div>
                      </div>

                      {/* Hit 2 */}
                      <p className="text-xs text-muted-foreground mt-3 mb-1.5">Hit 2</p>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs">ATK %</Label>
                          <Input type="number" step="0.01" value={skill.hit2_percent ?? ""} onChange={(e) => updateSkill(skill._key, "hit2_percent", e.target.value === "" ? null : Number(e.target.value))} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Count</Label>
                          <Input type="number" value={skill.hit2_count ?? ""} onChange={(e) => updateSkill(skill._key, "hit2_count", e.target.value === "" ? null : Number(e.target.value))} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Book Bonus</Label>
                          <Input type="number" step="0.01" value={skill.hit2_book_bonus ?? ""} onChange={(e) => updateSkill(skill._key, "hit2_book_bonus", e.target.value === "" ? null : Number(e.target.value))} />
                        </div>
                      </div>

                      {/* Skill Tags */}
                      <div className="mt-3 space-y-1.5">
                        <Label className="text-xs">Skill Tags</Label>
                        <SkillTagsMultiSelect
                          value={skill.skill_tags}
                          onChange={(v) => updateSkill(skill._key, "skill_tags", v)}
                        />
                      </div>

                      {/* Computed preview */}
                      {skill.hit1_percent && skill.hit1_count ? (() => {
                        const min = calcMinMult(skill);
                        const max = calcMaxMult(skill);
                        const rating = getEfficiencyRating(skill);
                        const colors = rating ? RATING_COLORS[rating] : null;
                        return (
                          <div className="mt-3 flex items-center gap-3 text-xs">
                            <span className="text-muted-foreground">Min: <strong className="text-foreground">{min.toFixed(1)}x</strong></span>
                            <span className="text-muted-foreground">Max: <strong className="text-foreground">{max.toFixed(1)}x</strong></span>
                            {rating && colors && (
                              <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${colors.bg} ${colors.text} ${colors.border}`}>
                                {rating}
                              </span>
                            )}
                          </div>
                        );
                      })() : null}
                    </div>

                    {/* ── Awakenings Section ── */}
                    <div className="col-span-2 mt-2 border-t border-border pt-3">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Awakenings</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => {
                            const awakenings = skill._children_awakenings || [];
                            const visibleAwk = awakenings.filter(a => a._status !== "deleted");
                            const nextLevel = visibleAwk.length === 0 ? 1 : Math.max(...visibleAwk.map(a => a.awakening_level ?? 0)) + 1;
                            const newAwk: InlineAwakening = {
                              _key: `awk-${++keyCounter}-${Date.now()}`,
                              _status: "new",
                              awakening_level: nextLevel,
                              effect: null,
                            };
                            updateSkill(skill._key, "_children_awakenings", [...awakenings, newAwk]);
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" /> Add Awakening
                        </Button>
                      </div>
                      {(skill._children_awakenings || []).filter(a => a._status !== "deleted").map((awk) => (
                        <div key={awk._key} className="flex items-center gap-3 mb-2">
                          <div className="space-y-1 w-20">
                            <Label className="text-xs">Level</Label>
                            <Input
                              type="number"
                              value={awk.awakening_level ?? ""}
                              onChange={(e) => {
                                const awakenings = (skill._children_awakenings || []).map(a =>
                                  a._key === awk._key ? { ...a, awakening_level: e.target.value === "" ? null : Number(e.target.value) } : a
                                );
                                updateSkill(skill._key, "_children_awakenings", awakenings);
                              }}
                            />
                          </div>
                          <div className="space-y-1 flex-1">
                            <Label className="text-xs">Effect</Label>
                            <Input
                              value={awk.effect ?? ""}
                              onChange={(e) => {
                                const awakenings = (skill._children_awakenings || []).map(a =>
                                  a._key === awk._key ? { ...a, effect: e.target.value || null } : a
                                );
                                updateSkill(skill._key, "_children_awakenings", awakenings);
                              }}
                              placeholder="Awakening effect..."
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive mt-5"
                            onClick={() => {
                              const awakenings = (skill._children_awakenings || []).map(a =>
                                a._key === awk._key ? { ...a, _status: "deleted" as const } : a
                              );
                              updateSkill(skill._key, "_children_awakenings", awakenings);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      {(skill._children_awakenings || []).filter(a => a._status !== "deleted").length === 0 && (
                        <p className="text-xs text-muted-foreground">No awakenings yet.</p>
                      )}
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

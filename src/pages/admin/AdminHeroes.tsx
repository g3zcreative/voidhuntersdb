import { useState, useRef, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminCrudPage, ColumnConfig } from "./AdminCrudPage";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link, Plus, Loader2, Upload, CheckCircle2, XCircle, SkipForward, AlertTriangle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

function useReferenceData() {
  const { data: factions = [] } = useQuery({
    queryKey: ["ref_factions"],
    queryFn: async () => {
      const { data } = await supabase.from("factions").select("id, name").order("name");
      return (data || []) as { id: string; name: string }[];
    },
  });
  const { data: archetypes = [] } = useQuery({
    queryKey: ["ref_archetypes"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("archetypes").select("id, name").order("name");
      return (data || []) as { id: string; name: string }[];
    },
  });
  const { data: affinities = [] } = useQuery({
    queryKey: ["ref_affinities"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("affinities").select("id, name").order("name");
      return (data || []) as { id: string; name: string }[];
    },
  });
  const { data: allegiances = [] } = useQuery({
    queryKey: ["ref_allegiances"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("allegiances").select("id, name").order("name");
      return (data || []) as { id: string; name: string }[];
    },
  });
  return { factions, archetypes, affinities, allegiances };
}

function buildColumns(
  factions: { id: string; name: string }[],
  archetypes: { id: string; name: string }[],
  affinities: { id: string; name: string }[],
  allegiances: { id: string; name: string }[],
): ColumnConfig[] {
  return [
    { key: "name", label: "Name", required: true, showInTable: true },
    { key: "subtitle", label: "Subtitle" },
    { key: "slug", label: "Slug", required: true, showInTable: true },
    {
      key: "faction_id", label: "Realm/Faction", type: "select", showInTable: true,
      options: factions.map(f => ({ value: f.id, label: f.name })),
    },
    {
      key: "archetype_id", label: "Archetype", type: "select", showInTable: true,
      options: archetypes.map(a => ({ value: a.id, label: a.name })),
    },
    {
      key: "affinity_id", label: "Affinity", type: "select", showInTable: true,
      options: affinities.map(a => ({ value: a.id, label: a.name })),
    },
    {
      key: "allegiance_id", label: "Allegiance", type: "select", showInTable: true,
      options: allegiances.map(a => ({ value: a.id, label: a.name })),
    },
    { key: "rarity", label: "Rarity", type: "number", required: true, showInTable: true },
    { key: "description", label: "Description", type: "textarea" },
    { key: "lore", label: "Lore", type: "textarea" },
    { key: "image_url", label: "Image URL", storageBucket: "hero-images" },
    {
      key: "image_focal_point", label: "Image Focal Point", type: "select",
      options: [
        { value: "top", label: "Top (default)" },
        { value: "center", label: "Center" },
        { value: "bottom", label: "Bottom" },
        { value: "50% 20%", label: "Upper middle" },
        { value: "50% 30%", label: "Upper third" },
        { value: "50% 40%", label: "Upper center" },
      ],
    },
    {
      key: "image_focal_x", label: "Image Horizontal Position", type: "slider",
      sliderMin: 0, sliderMax: 100, sliderStep: 1,
    },
    {
      key: "image_focal_y", label: "Image Vertical Position", type: "slider",
      sliderMin: 0, sliderMax: 100, sliderStep: 1,
    },
    {
      key: "image_zoom", label: "Image Zoom", type: "slider",
      sliderMin: 1.0, sliderMax: 3.0, sliderStep: 0.1,
      renderBelow: (formData) => {
        const imageUrl = formData.image_url ? String(formData.image_url) : "";
        const focalX = Number(formData.image_focal_x ?? 50);
        const focalY = Number(formData.image_focal_y ?? 0);
        const zoom = Number(formData.image_zoom ?? 1.5);
        if (!imageUrl) return null;
        const pos = `${focalX}% ${focalY}%`;
        return (
          <div className="mt-2 flex items-start gap-4">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Card preview</span>
              <div className="h-14 w-14 rounded-lg overflow-hidden border border-border">
                <img
                  src={imageUrl}
                  alt="Focal point preview"
                  className="h-full w-full object-cover"
                  style={{ objectPosition: pos, transform: `scale(${zoom})`, transformOrigin: pos }}
                />
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Full crop</span>
              <div className="h-24 w-24 rounded-lg overflow-hidden border border-border">
                <img
                  src={imageUrl}
                  alt="Focal point preview large"
                  className="h-full w-full object-cover"
                  style={{ objectPosition: pos, transform: `scale(${zoom})`, transformOrigin: pos }}
                />
              </div>
            </div>
          </div>
        );
      },
    },
    { key: "stats", label: "Stats (JSON)", type: "json" },
    { key: "leader_bonus", label: "Leader Bonus (JSON)", type: "json" },
    { key: "divinity_generator", label: "Divinity Generator", type: "textarea" },
    { key: "ascension_bonuses", label: "Ascension Bonuses (JSON)", type: "json" },
    { key: "awakening_bonuses", label: "Awakening Bonuses (JSON)", type: "json" },
  ];
}

type CreationMode = "picker" | "url" | "bulk" | "backfill" | "refresh-images" | null;

type BulkEntry = {
  heroName: string;
  url: string;
  status: "pending" | "importing" | "success" | "skipped" | "error";
  message?: string;
};

const HERO_CSV = `set,aaru,4,https://godforge.gg/heroes/set
osiris,aaru,4,https://godforge.gg/heroes/osiris
imhotep,aaru,4,https://godforge.gg/heroes/imhotep
hound-of-duat,aaru,4,https://godforge.gg/heroes/hound-of-duat
cleopatra,aaru,4,https://godforge.gg/heroes/cleopatra
bastet,aaru,4,https://godforge.gg/heroes/bastet
tutankhamun,aaru,3,https://godforge.gg/heroes/tutankhamun
ramses,aaru,3,https://godforge.gg/heroes/ramses
nitocris,aaru,3,https://godforge.gg/heroes/nitocris
nefertiti,aaru,3,https://godforge.gg/heroes/nefertiti
babi,aaru,3,https://godforge.gg/heroes/babi
ankhesenamun,aaru,3,https://godforge.gg/heroes/ankhesenamun
nubian-warrior,aaru,2,https://godforge.gg/heroes/nubian-warrior
mummy,aaru,2,https://godforge.gg/heroes/mummy
ymir,asgard,5,https://godforge.gg/heroes/ymir
odin,asgard,5,https://godforge.gg/heroes/odin
loki,asgard,5,https://godforge.gg/heroes/loki
hel,asgard,5,https://godforge.gg/heroes/hel
heimdall,asgard,5,https://godforge.gg/heroes/heimdall
grendel,asgard,5,https://godforge.gg/heroes/grendel
freya,asgard,5,https://godforge.gg/heroes/freya
fenrir,asgard,5,https://godforge.gg/heroes/fenrir
thorkell,asgard,4,https://godforge.gg/heroes/thorkell
ran,asgard,4,https://godforge.gg/heroes/ran
geri,asgard,4,https://godforge.gg/heroes/geri
freki,asgard,4,https://godforge.gg/heroes/freki
brynhild,asgard,4,https://godforge.gg/heroes/brynhild
beowulf,asgard,3,https://godforge.gg/heroes/beowulf
vidar,asgard,3,https://godforge.gg/heroes/vidar
ulfhednar,asgard,3,https://godforge.gg/heroes/ulfhednar
skadi,asgard,3,https://godforge.gg/heroes/skadi
sigurd,asgard,3,https://godforge.gg/heroes/sigurd
seeress,asgard,3,https://godforge.gg/heroes/seeress
ragnar-lothbrok,asgard,3,https://godforge.gg/heroes/ragnar-lothbrok
lagertha,asgard,3,https://godforge.gg/heroes/lagertha
aslaug,asgard,3,https://godforge.gg/heroes/aslaug
valkyrie,asgard,2,https://godforge.gg/heroes/valkyrie
jomsviking,asgard,2,https://godforge.gg/heroes/jomsviking
y-ddraid-goch,avalon,5,https://godforge.gg/heroes/y-ddraid-goch
viviane,avalon,5,https://godforge.gg/heroes/viviane
morrigan,avalon,5,https://godforge.gg/heroes/morrigan
morgan-le-fay,avalon,5,https://godforge.gg/heroes/morgan-le-fay
king-arthur,avalon,5,https://godforge.gg/heroes/king-arthur
fisher-king,avalon,5,https://godforge.gg/heroes/fisher-king
percival,avalon,4,https://godforge.gg/heroes/percival
mordred,avalon,4,https://godforge.gg/heroes/mordred
green-knight,avalon,4,https://godforge.gg/heroes/green-knight
gogmagog,avalon,4,https://godforge.gg/heroes/gogmagog
gawain,avalon,4,https://godforge.gg/heroes/gawain
bran,avalon,4,https://godforge.gg/heroes/bran
banshee,avalon,4,https://godforge.gg/heroes/banshee
tristan,avalon,3,https://godforge.gg/heroes/tristan
mabon,avalon,3,https://godforge.gg/heroes/mabon
isolde,avalon,3,https://godforge.gg/heroes/isolde
dagonet,avalon,3,https://godforge.gg/heroes/dagonet
ceridwen,avalon,3,https://godforge.gg/heroes/ceridwen
cait-sith,avalon,3,https://godforge.gg/heroes/cait-sith
knight,avalon,2,https://godforge.gg/heroes/knight
fae-enchantress,avalon,2,https://godforge.gg/heroes/fae-enchantress
druid,avalon,2,https://godforge.gg/heroes/druid
shamash,ekur,5,https://godforge.gg/heroes/shamash
pazuzu,ekur,5,https://godforge.gg/heroes/pazuzu
marduk,ekur,5,https://godforge.gg/heroes/marduk
lamashtu,ekur,5,https://godforge.gg/heroes/lamashtu
enki,ekur,5,https://godforge.gg/heroes/enki
anu,ekur,5,https://godforge.gg/heroes/anu
ninurta,ekur,4,https://godforge.gg/heroes/ninurta
ninsun,ekur,4,https://godforge.gg/heroes/ninsun
nanaya,ekur,4,https://godforge.gg/heroes/nanaya
ishtar,ekur,4,https://godforge.gg/heroes/ishtar
gilgamesh,ekur,4,https://godforge.gg/heroes/gilgamesh
aya,ekur,4,https://godforge.gg/heroes/aya
sargon,ekur,3,https://godforge.gg/heroes/sargon
nebuchadnezzar,ekur,3,https://godforge.gg/heroes/nebuchadnezzar
enkidu,ekur,3,https://godforge.gg/heroes/enkidu
asag,ekur,3,https://godforge.gg/heroes/asag
temple-priestess,ekur,2,https://godforge.gg/heroes/temple-priestess
shub-lugal,ekur,2,https://godforge.gg/heroes/shub-lugal
raijin,izumo,5,https://godforge.gg/heroes/raijin
oda-nobunaga,izumo,5,https://godforge.gg/heroes/oda-nobunaga
izanami,izumo,5,https://godforge.gg/heroes/izanami
izanagi,izumo,5,https://godforge.gg/heroes/izanagi
fujin,izumo,5,https://godforge.gg/heroes/fujin
amaterasu,izumo,5,https://godforge.gg/heroes/amaterasu
ryujin,izumo,4,https://godforge.gg/heroes/ryujin
musashi,izumo,4,https://godforge.gg/heroes/musashi
mezu,izumo,4,https://godforge.gg/heroes/mezu
kenshin,izumo,4,https://godforge.gg/heroes/kenshin
inari,izumo,4,https://godforge.gg/heroes/inari
himiko,izumo,4,https://godforge.gg/heroes/himiko
hattori-hanzo,izumo,4,https://godforge.gg/heroes/hattori-hanzo
gozu,izumo,4,https://godforge.gg/heroes/gozu
tomoe-gozen,izumo,3,https://godforge.gg/heroes/tomoe-gozen
tengu,izumo,3,https://godforge.gg/heroes/tengu
shinigami,izumo,3,https://godforge.gg/heroes/shinigami
onryo,izumo,3,https://godforge.gg/heroes/onryo
oni,izumo,3,https://godforge.gg/heroes/oni
li-naomasa,izumo,3,https://godforge.gg/heroes/li-naomasa
akuma,izumo,3,https://godforge.gg/heroes/akuma
kunoichi,izumo,2,https://godforge.gg/heroes/kunoichi
ashigaru,izumo,2,https://godforge.gg/heroes/ashigaru
zeus,olympus,5,https://godforge.gg/heroes/zeus
hercules,olympus,5,https://godforge.gg/heroes/hercules
hades,olympus,5,https://godforge.gg/heroes/hades
athena,olympus,5,https://godforge.gg/heroes/athena
artemis,olympus,5,https://godforge.gg/heroes/artemis
ares,olympus,5,https://godforge.gg/heroes/ares
apollo,olympus,5,https://godforge.gg/heroes/apollo
aphrodite,olympus,5,https://godforge.gg/heroes/aphrodite
polyphemus,olympus,4,https://godforge.gg/heroes/polyphemus
persephone,olympus,4,https://godforge.gg/heroes/persephone
pandora,olympus,4,https://godforge.gg/heroes/pandora
odysseus,olympus,4,https://godforge.gg/heroes/odysseus
leonidas,olympus,4,https://godforge.gg/heroes/leonidas
achilles,olympus,4,https://godforge.gg/heroes/achilles
orpheus,olympus,3,https://godforge.gg/heroes/orpheus
muse,olympus,3,https://godforge.gg/heroes/muse
minotaur,olympus,3,https://godforge.gg/heroes/minotaur
icarus,olympus,3,https://godforge.gg/heroes/icarus
hippolyta,olympus,3,https://godforge.gg/heroes/hippolyta
eurydice,olympus,3,https://godforge.gg/heroes/eurydice
cyclops,olympus,3,https://godforge.gg/heroes/cyclops
thracian-lion,olympus,2,https://godforge.gg/heroes/thracian-lion
spartan,olympus,2,https://godforge.gg/heroes/spartan
amazon,olympus,2,https://godforge.gg/heroes/amazon
tlaloc,omeyocan,5,https://godforge.gg/heroes/tlaloc
quetzalcoatl,omeyocan,5,https://godforge.gg/heroes/quetzalcoatl
moctezuma,omeyocan,5,https://godforge.gg/heroes/moctezuma
metztli,omeyocan,5,https://godforge.gg/heroes/metztli
kinich-ahau,omeyocan,5,https://godforge.gg/heroes/kinich-ahau
cizin,omeyocan,5,https://godforge.gg/heroes/cizin
camazotz,omeyocan,5,https://godforge.gg/heroes/camazotz
xtabay,omeyocan,4,https://godforge.gg/heroes/xtabay
xquic,omeyocan,4,https://godforge.gg/heroes/xquic
xolotl,omeyocan,4,https://godforge.gg/heroes/xolotl
xochiquetzal,omeyocan,4,https://godforge.gg/heroes/xochiquetzal
xipe-totec,omeyocan,4,https://godforge.gg/heroes/xipe-totec
xbalanque,omeyocan,4,https://godforge.gg/heroes/xbalanque
hunahpu,omeyocan,4,https://godforge.gg/heroes/hunahpu
tzilacatzin,omeyocan,3,https://godforge.gg/heroes/tzilacatzin
shorn-one,omeyocan,3,https://godforge.gg/heroes/shorn-one
lady-xoc,omeyocan,3,https://godforge.gg/heroes/lady-xoc
ixchel,omeyocan,3,https://godforge.gg/heroes/ixchel
eagle-archer,omeyocan,2,https://godforge.gg/heroes/eagle-archer
black-jaguar,omeyocan,2,https://godforge.gg/heroes/black-jaguar
yan-wang,tian,5,https://godforge.gg/heroes/yan-wang
tianlong,tian,5,https://godforge.gg/heroes/tianlong
sun-wukong,tian,5,https://godforge.gg/heroes/sun-wukong
pangu,tian,5,https://godforge.gg/heroes/pangu
mulan,tian,5,https://godforge.gg/heroes/mulan
xiwangmu,tian,4,https://godforge.gg/heroes/xiwangmu
sun-tzu,tian,4,https://godforge.gg/heroes/sun-tzu
nezha,tian,4,https://godforge.gg/heroes/nezha
luoshen,tian,4,https://godforge.gg/heroes/luoshen
jiutian,tian,4,https://godforge.gg/heroes/jiutian
hou-yi,tian,4,https://godforge.gg/heroes/hou-yi
shishi,tian,3,https://godforge.gg/heroes/shishi
ma-chao,tian,3,https://godforge.gg/heroes/ma-chao
lu-bu,tian,3,https://godforge.gg/heroes/lu-bu
guan-yu,tian,3,https://godforge.gg/heroes/guan-yu
diao-chan,tian,3,https://godforge.gg/heroes/diao-chan
change,tian,3,https://godforge.gg/heroes/change
terracotta-warrior,tian,2,https://godforge.gg/heroes/terracotta-warrior
shaolin-monk,tian,2,https://godforge.gg/heroes/shaolin-monk
svarog,vyraj,5,https://godforge.gg/heroes/svarog
perun,vyraj,5,https://godforge.gg/heroes/perun
dracula,vyraj,5,https://godforge.gg/heroes/dracula
chernobog,vyraj,5,https://godforge.gg/heroes/chernobog
belobog,vyraj,5,https://godforge.gg/heroes/belobog
poludnitsa,vyraj,4,https://godforge.gg/heroes/poludnitsa
mokosh,vyraj,4,https://godforge.gg/heroes/mokosh
leshy,vyraj,4,https://godforge.gg/heroes/leshy
koshchei,vyraj,4,https://godforge.gg/heroes/koshchei
devana,vyraj,4,https://godforge.gg/heroes/devana
volkodlak,vyraj,3,https://godforge.gg/heroes/volkodlak
vesna,vyraj,3,https://godforge.gg/heroes/vesna
maria-morevna,vyraj,3,https://godforge.gg/heroes/maria-morevna
lada,vyraj,3,https://godforge.gg/heroes/lada
dobrynya,vyraj,3,https://godforge.gg/heroes/dobrynya
bauk,vyraj,3,https://godforge.gg/heroes/bauk
vila,vyraj,2,https://godforge.gg/heroes/vila
vampir,vyraj,2,https://godforge.gg/heroes/vampir`;

function parseHeroCsv(): BulkEntry[] {
  return HERO_CSV.trim().split("\n").map(line => {
    const parts = line.split(",");
    const url = parts[3];
    const heroName = parts[0];
    return { heroName, url, status: "pending" as const };
  });
}

export default function AdminHeroes() {
  const { factions, archetypes, affinities, allegiances } = useReferenceData();
  const columns = useMemo(
    () => buildColumns(factions, archetypes, affinities, allegiances),
    [factions, archetypes, affinities, allegiances]
  );

  const [mode, setMode] = useState<CreationMode>(null);
  const [importUrl, setImportUrl] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [defaults, setDefaults] = useState<Record<string, unknown> | undefined>();
  const [triggerCreate, setTriggerCreate] = useState(0);
  const pendingSkills = useRef<any[]>([]);
  const pendingImprint = useRef<string | null>(null);
  const { toast } = useToast();

  // Bulk import state
  const [bulkEntries, setBulkEntries] = useState<BulkEntry[]>([]);
  const [bulkRunning, setBulkRunning] = useState(false);
  const bulkAbort = useRef(false);

  // Backfill state
  const [backfillEntries, setBackfillEntries] = useState<BulkEntry[]>([]);
  const [backfillRunning, setBackfillRunning] = useState(false);
  const backfillAbort = useRef(false);

  // Refresh images state
  const [refreshEntries, setRefreshEntries] = useState<BulkEntry[]>([]);
  const [refreshRunning, setRefreshRunning] = useState(false);
  const refreshAbort = useRef(false);

  // Fetch all heroes for backfill
  const { data: allHeroes = [] } = useQuery({
    queryKey: ["heroes_for_backfill"],
    queryFn: async () => {
      const { data, error } = await supabase.from("heroes").select("id, name, slug, faction_id").order("name");
      if (error) throw error;
      return data;
    },
  });

  const openPicker = () => setMode("picker");

  const importFromUrl = async () => {
    if (!importUrl.trim()) return;
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("scrape-hero", {
        body: { url: importUrl },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const skills = data.skills || [];
      pendingSkills.current = skills;
      pendingImprint.current = data.imprint_passive || null;

      // Resolve text values to FK IDs
      const findId = (list: { id: string; name: string }[], name: string) =>
        list.find(i => i.name.toLowerCase() === (name || "").toLowerCase())?.id || "";

      setDefaults({
        name: data.name || "",
        subtitle: data.subtitle || "",
        slug: data.slug || "",
        faction_id: findId(factions, data.element),
        archetype_id: findId(archetypes, data.class_type),
        affinity_id: findId(affinities, data.affinity),
        allegiance_id: findId(allegiances, data.allegiance),
        rarity: data.rarity ?? 5,
        description: data.description || "",
        lore: data.lore || "",
        image_url: data.image_url || "",
        stats: JSON.stringify(data.stats || {}, null, 2),
        leader_bonus: JSON.stringify(data.leader_bonus || {}, null, 2),
        divinity_generator: data.divinity_generator || "",
        ascension_bonuses: JSON.stringify(data.ascension_bonuses || [], null, 2),
        awakening_bonuses: JSON.stringify(data.awakening_bonuses || [], null, 2),
      });
      setTriggerCreate(t => t + 1);
      setMode(null);
      setImportUrl("");

      const skillNote = skills.length > 0 ? ` ${skills.length} skills found — they'll be added after you save.` : "";
      toast({ title: "Hero imported!", description: `Review and edit before saving.${skillNote}` });
    } catch (e: any) {
      toast({ title: "Import failed", description: e.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAfterCreate = async (row: Record<string, unknown>) => {
    const skills = pendingSkills.current;
    if (skills.length === 0) return;
    pendingSkills.current = [];

    const heroId = row.id as string;
    const heroSlug = (row.slug as string) || heroId;
    const skillRows = skills.map((s: any) => {
      const skillSlug = s.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      return {
      hero_id: heroId,
      name: s.name,
      slug: `${heroSlug}-${skillSlug}`,
      skill_type: s.skill_type || "Active",
      description: s.description || "",
      image_url: s.image_url || null,
      scaling_formula: s.scaling_formula || null,
      effects: s.effects || [],
      awakening_level: s.awakening_level || null,
      awakening_bonus: s.awakening_bonus || null,
      ultimate_cost: s.ultimate_cost || null,
      initial_divinity: s.initial_divinity || null,
    }});

    const { error } = await (supabase.from("skills") as any).insert(skillRows);
    if (error) {
      toast({ title: "Skills insert failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `${skillRows.length} skills added`, description: "Skills linked to the new hero." });
    }

    // Create imprint if extracted
    const imprintPassive = pendingImprint.current;
    pendingImprint.current = null;
    if (imprintPassive) {
      // Use passive skill icon for imprint image, falling back to hero image
      const passiveSkill = skills.find((s: any) => s.skill_type === "Passive");
      const imprintImage = passiveSkill?.image_url || (row.image_url as string) || null;

      const { error: imprintError } = await (supabase.from("imprints") as any).insert({
        name: row.name as string,
        slug: heroSlug,
        rarity: (row.rarity as number) || 3,
        source_hero_id: heroId,
        passive: imprintPassive,
        image_url: imprintImage,
      });
      if (imprintError) {
        toast({ title: "Imprint insert failed", description: imprintError.message, variant: "destructive" });
      } else {
        toast({ title: "Imprint created", description: `Imprint linked to ${row.name}.` });
      }
    }
  };

  const startBulkImport = useCallback(async () => {
    const entries = parseHeroCsv();
    setBulkEntries(entries);
    setBulkRunning(true);
    bulkAbort.current = false;

    const DELAY_MS = 2000; // delay between requests to avoid rate limits

    for (let i = 0; i < entries.length; i++) {
      if (bulkAbort.current) break;

      setBulkEntries(prev => prev.map((e, idx) => idx === i ? { ...e, status: "importing" } : e));

      try {
        const { data, error } = await supabase.functions.invoke("bulk-import-hero", {
          body: { url: entries[i].url },
        });

        if (error) throw error;

        if (data?.skipped) {
          setBulkEntries(prev => prev.map((e, idx) => idx === i ? { ...e, status: "skipped", message: data.message } : e));
        } else if (data?.error) {
          const retryable = data.retryable;
          if (retryable) {
            // Wait longer on rate limit and retry
            setBulkEntries(prev => prev.map((e, idx) => idx === i ? { ...e, status: "pending", message: "Rate limited, retrying..." } : e));
            await new Promise(r => setTimeout(r, 10000));
            i--; // retry this index
            continue;
          }
          setBulkEntries(prev => prev.map((e, idx) => idx === i ? { ...e, status: "error", message: data.error } : e));
        } else if (data?.success) {
          setBulkEntries(prev => prev.map((e, idx) => idx === i ? { ...e, status: "success", message: `${data.name} (${data.skillCount} skills)` } : e));
        }
      } catch (err: any) {
        setBulkEntries(prev => prev.map((e, idx) => idx === i ? { ...e, status: "error", message: err.message } : e));
      }

      if (i < entries.length - 1 && !bulkAbort.current) {
        await new Promise(r => setTimeout(r, DELAY_MS));
      }
    }

    setBulkRunning(false);
  }, []);

  const stopBulkImport = () => {
    bulkAbort.current = true;
  };

  const completedCount = bulkEntries.filter(e => e.status === "success" || e.status === "skipped" || e.status === "error").length;
  const successCount = bulkEntries.filter(e => e.status === "success").length;
  const skippedCount = bulkEntries.filter(e => e.status === "skipped").length;
  const errorCount = bulkEntries.filter(e => e.status === "error").length;
  const progressPct = bulkEntries.length > 0 ? (completedCount / bulkEntries.length) * 100 : 0;

  // Backfill logic — runs over a list of indices into allHeroes
  const runBackfillForIndices = useCallback(async (indices: number[]) => {
    setBackfillRunning(true);
    backfillAbort.current = false;

    const DELAY_MS = 3000;

    for (let j = 0; j < indices.length; j++) {
      if (backfillAbort.current) break;
      const i = indices[j];

      setBackfillEntries(prev => prev.map((e, idx) => idx === i ? { ...e, status: "importing", message: undefined } : e));

      try {
        const hero = allHeroes[i];
        const factionName = factions.find(f => f.id === hero.faction_id)?.name || "";
        const { data, error } = await supabase.functions.invoke("backfill-hero", {
          body: { hero_id: hero.id, slug: hero.slug, faction_name: factionName },
        });

        if (error) throw error;

        if (data?.error) {
          if (data.retryable) {
            setBackfillEntries(prev => prev.map((e, idx) => idx === i ? { ...e, status: "pending", message: "Rate limited, retrying..." } : e));
            await new Promise(r => setTimeout(r, 10000));
            j--; // retry
            continue;
          }
          setBackfillEntries(prev => prev.map((e, idx) => idx === i ? { ...e, status: "error", message: data.error } : e));
        } else if (data?.success) {
          setBackfillEntries(prev => prev.map((e, idx) => idx === i ? { ...e, status: "success", message: `${data.skillsUpdated} skills updated` } : e));
        }
      } catch (err: any) {
        setBackfillEntries(prev => prev.map((e, idx) => idx === i ? { ...e, status: "error", message: err.message } : e));
      }

      if (j < indices.length - 1 && !backfillAbort.current) {
        await new Promise(r => setTimeout(r, DELAY_MS));
      }
    }

    setBackfillRunning(false);
  }, [allHeroes, factions]);

  const startBackfill = useCallback(async () => {
    const entries: BulkEntry[] = allHeroes.map(h => ({
      heroName: h.name,
      url: h.slug,
      status: "pending" as const,
    }));
    setBackfillEntries(entries);
    await runBackfillForIndices(entries.map((_, i) => i));
  }, [allHeroes, runBackfillForIndices]);

  const retryFailedBackfill = useCallback(async () => {
    const failedIndices = backfillEntries
      .map((e, i) => e.status === "error" ? i : -1)
      .filter(i => i !== -1);
    if (failedIndices.length === 0) return;
    // Reset failed entries to pending
    setBackfillEntries(prev => prev.map((e, i) => failedIndices.includes(i) ? { ...e, status: "pending", message: undefined } : e));
    await runBackfillForIndices(failedIndices);
  }, [backfillEntries, runBackfillForIndices]);

  const stopBackfill = () => { backfillAbort.current = true; };

  const bfCompletedCount = backfillEntries.filter(e => e.status === "success" || e.status === "error").length;
  const bfSuccessCount = backfillEntries.filter(e => e.status === "success").length;
  const bfErrorCount = backfillEntries.filter(e => e.status === "error").length;
  const bfProgressPct = backfillEntries.length > 0 ? (bfCompletedCount / backfillEntries.length) * 100 : 0;

  // Refresh images logic
  const startRefreshImages = useCallback(async () => {
    const entries: BulkEntry[] = allHeroes.map(h => ({
      heroName: h.name,
      url: h.slug,
      status: "pending" as const,
    }));
    setRefreshEntries(entries);
    setRefreshRunning(true);
    refreshAbort.current = false;

    const DELAY_MS = 2000;

    for (let i = 0; i < entries.length; i++) {
      if (refreshAbort.current) break;

      setRefreshEntries(prev => prev.map((e, idx) => idx === i ? { ...e, status: "importing" } : e));

      try {
        const hero = allHeroes[i];
        const { data, error } = await supabase.functions.invoke("refresh-hero-image", {
          body: { hero_id: hero.id, slug: hero.slug },
        });

        if (error) throw error;

        if (data?.error) {
          if (data.retryable) {
            setRefreshEntries(prev => prev.map((e, idx) => idx === i ? { ...e, status: "pending", message: "Rate limited, retrying..." } : e));
            await new Promise(r => setTimeout(r, 10000));
            i--;
            continue;
          }
          setRefreshEntries(prev => prev.map((e, idx) => idx === i ? { ...e, status: "error", message: data.error } : e));
        } else if (data?.success) {
          setRefreshEntries(prev => prev.map((e, idx) => idx === i ? { ...e, status: "success", message: `${data.format} ✓` } : e));
        }
      } catch (err: any) {
        setRefreshEntries(prev => prev.map((e, idx) => idx === i ? { ...e, status: "error", message: err.message } : e));
      }

      if (i < entries.length - 1 && !refreshAbort.current) {
        await new Promise(r => setTimeout(r, DELAY_MS));
      }
    }

    setRefreshRunning(false);
  }, [allHeroes]);

  const stopRefreshImages = () => { refreshAbort.current = true; };

  const riCompletedCount = refreshEntries.filter(e => e.status === "success" || e.status === "error").length;
  const riSuccessCount = refreshEntries.filter(e => e.status === "success").length;
  const riErrorCount = refreshEntries.filter(e => e.status === "error").length;
  const riProgressPct = refreshEntries.length > 0 ? (riCompletedCount / refreshEntries.length) * 100 : 0;

  return (
    <>
      <AdminCrudPage
        tableName="heroes"
        title="Heroes"
        columns={columns}
        defaults={defaults}
        onNewOverride={openPicker}
        triggerCreate={triggerCreate}
        onAfterCreate={handleAfterCreate}
      />

      {/* Mode Picker */}
      <Dialog open={mode === "picker"} onOpenChange={open => !open && setMode(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Hero</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => setMode("url")}>
              <Link className="h-6 w-6" />
              <span className="text-sm">Import from URL</span>
            </Button>
            <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => { setMode("bulk"); }}>
              <Upload className="h-6 w-6" />
              <span className="text-sm">Bulk Import All</span>
            </Button>
            <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => { setMode("backfill"); }}>
              <RefreshCw className="h-6 w-6" />
              <span className="text-sm">Backfill All</span>
            </Button>
            <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => { setMode("refresh-images"); }}>
              <Upload className="h-6 w-6" />
              <span className="text-sm">Refresh Images</span>
            </Button>
            <Button variant="outline" className="h-24 flex-col gap-2 col-span-2" onClick={() => { setDefaults(undefined); setTriggerCreate(t => t + 1); setMode(null); }}>
              <Plus className="h-6 w-6" />
              <span className="text-sm">Blank</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import from URL */}
      <Dialog open={mode === "url"} onOpenChange={open => { if (!open && !isGenerating) setMode(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import Hero from URL</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Hero page URL</Label>
              <Input
                type="url"
                placeholder="https://godforge.gg/heroes/sun-wukong"
                value={importUrl}
                onChange={e => setImportUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Paste a link to a hero page on godforge.gg.</p>
            </div>
            <Button className="w-full" onClick={importFromUrl} disabled={isGenerating || !importUrl.trim()}>
              {isGenerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importing...</> : <><Link className="mr-2 h-4 w-4" /> Import Hero</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Import */}
      <Dialog open={mode === "bulk"} onOpenChange={open => { if (!open && !bulkRunning) setMode(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Bulk Import All Heroes</DialogTitle>
          </DialogHeader>

          {bulkEntries.length === 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This will scrape and import all <strong>182 heroes</strong> from godforge.gg. 
                Heroes that already exist in the database will be skipped.
                Each hero takes ~10-15 seconds to process.
              </p>
              <div className="flex items-center gap-2 p-3 rounded-md bg-yellow-500/10 border border-yellow-500/20">
                <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
                <p className="text-xs text-yellow-500">This will use Firecrawl credits and may take 30-60+ minutes.</p>
              </div>
              <Button className="w-full" onClick={startBulkImport}>
                <Upload className="mr-2 h-4 w-4" /> Start Bulk Import
              </Button>
            </div>
          ) : (
            <div className="space-y-4 flex-1 min-h-0 flex flex-col">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>{completedCount} / {bulkEntries.length} processed</span>
                  <span className="flex gap-3">
                    <span className="text-green-500">✓ {successCount}</span>
                    <span className="text-yellow-500">⊘ {skippedCount}</span>
                    <span className="text-red-500">✗ {errorCount}</span>
                  </span>
                </div>
                <Progress value={progressPct} className="h-2" />
              </div>

              <ScrollArea className="flex-1 min-h-0 max-h-[50vh] border rounded-md">
                <div className="p-2 space-y-1">
                  {bulkEntries.map((entry, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs py-1 px-2 rounded hover:bg-muted/50">
                      {entry.status === "pending" && <div className="h-4 w-4 rounded-full border border-muted-foreground/30" />}
                      {entry.status === "importing" && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                      {entry.status === "success" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                      {entry.status === "skipped" && <SkipForward className="h-4 w-4 text-yellow-500" />}
                      {entry.status === "error" && <XCircle className="h-4 w-4 text-red-500" />}
                      <span className="font-mono">{entry.heroName}</span>
                      {entry.message && <span className="text-muted-foreground ml-auto truncate max-w-[200px]">{entry.message}</span>}
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {bulkRunning ? (
                <Button variant="destructive" onClick={stopBulkImport} className="w-full">
                  Stop Import
                </Button>
              ) : (
                <Button variant="outline" onClick={() => setMode(null)} className="w-full">
                  Close
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Backfill Dialog */}
      <Dialog open={mode === "backfill"} onOpenChange={open => { if (!open && !backfillRunning) setMode(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Backfill All Heroes</DialogTitle>
          </DialogHeader>

          {backfillEntries.length === 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This will re-scrape all <strong>{allHeroes.length} heroes</strong> from godforge.gg and update them with new fields:
                leader bonus, divinity generator, ascension bonuses, awakening bonuses, and skill details.
              </p>
              <div className="flex items-center gap-2 p-3 rounded-md bg-yellow-500/10 border border-yellow-500/20">
                <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
                <p className="text-xs text-yellow-500">This will use Firecrawl credits and may take 30-60+ minutes.</p>
              </div>
              <Button className="w-full" onClick={startBackfill} disabled={allHeroes.length === 0}>
                <RefreshCw className="mr-2 h-4 w-4" /> Start Backfill ({allHeroes.length} heroes)
              </Button>
            </div>
          ) : (
            <div className="space-y-4 flex-1 min-h-0 flex flex-col">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>{bfCompletedCount} / {backfillEntries.length} processed</span>
                  <span className="flex gap-3">
                    <span className="text-green-500">✓ {bfSuccessCount}</span>
                    <span className="text-red-500">✗ {bfErrorCount}</span>
                  </span>
                </div>
                <Progress value={bfProgressPct} className="h-2" />
              </div>

              <ScrollArea className="flex-1 min-h-0 border rounded-md" style={{ maxHeight: "50vh" }}>
                <div className="p-2 space-y-1">
                  {backfillEntries.map((entry, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs py-1 px-2 rounded hover:bg-muted/50">
                      {entry.status === "pending" && <div className="h-4 w-4 rounded-full border border-muted-foreground/30" />}
                      {entry.status === "importing" && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                      {entry.status === "success" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                      {entry.status === "error" && <XCircle className="h-4 w-4 text-red-500" />}
                      <span className="font-mono">{entry.heroName}</span>
                      {entry.message && <span className="text-muted-foreground ml-auto truncate max-w-[200px]">{entry.message}</span>}
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {backfillRunning ? (
                <Button variant="destructive" onClick={stopBackfill} className="w-full">
                  Stop Backfill
                </Button>
              ) : (
                <div className="flex gap-2">
                  {bfErrorCount > 0 && (
                    <Button onClick={retryFailedBackfill} className="flex-1">
                      <RefreshCw className="mr-2 h-4 w-4" /> Retry Failed ({bfErrorCount})
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setMode(null)} className="flex-1">
                    Close
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Refresh Images Dialog */}
      <Dialog open={mode === "refresh-images"} onOpenChange={open => { if (!open && !refreshRunning) setMode(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Refresh Hero Images</DialogTitle>
          </DialogHeader>

          {refreshEntries.length === 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This will re-download all <strong>{allHeroes.length} hero images</strong> from godforge.gg as transparent PNG/WebP files,
                replacing the current JPG images with black backgrounds.
              </p>
              <div className="flex items-center gap-2 p-3 rounded-md bg-yellow-500/10 border border-yellow-500/20">
                <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
                <p className="text-xs text-yellow-500">This will use Firecrawl credits. Each hero takes ~5-10 seconds.</p>
              </div>
              <Button className="w-full" onClick={startRefreshImages} disabled={allHeroes.length === 0}>
                <RefreshCw className="mr-2 h-4 w-4" /> Start Image Refresh ({allHeroes.length} heroes)
              </Button>
            </div>
          ) : (
            <div className="space-y-4 flex-1 min-h-0 flex flex-col">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>{riCompletedCount} / {refreshEntries.length} processed</span>
                  <span className="flex gap-3">
                    <span className="text-green-500">✓ {riSuccessCount}</span>
                    <span className="text-red-500">✗ {riErrorCount}</span>
                  </span>
                </div>
                <Progress value={riProgressPct} className="h-2" />
              </div>

              <ScrollArea className="flex-1 min-h-0 max-h-[50vh] border rounded-md">
                <div className="p-2 space-y-1">
                  {refreshEntries.map((entry, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs py-1 px-2 rounded hover:bg-muted/50">
                      {entry.status === "pending" && <div className="h-4 w-4 rounded-full border border-muted-foreground/30" />}
                      {entry.status === "importing" && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                      {entry.status === "success" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                      {entry.status === "error" && <XCircle className="h-4 w-4 text-red-500" />}
                      <span className="font-mono">{entry.heroName}</span>
                      {entry.message && <span className="text-muted-foreground ml-auto truncate max-w-[200px]">{entry.message}</span>}
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {refreshRunning ? (
                <Button variant="destructive" onClick={stopRefreshImages} className="w-full">
                  Stop Refresh
                </Button>
              ) : (
                <Button variant="outline" onClick={() => setMode(null)} className="w-full">
                  Close
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
"use client";

import { toast } from "sonner";
import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useTools } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { v1 as uuidv1, v4 as uuidv4 } from "uuid";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Copy, RefreshCw, Download, Trash2, Heart, Fingerprint } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

function generateV4(): string {
  return uuidv4();
}

function generateV1(): string {
  return uuidv1();
}

// ─── FavoriteButton Helper ───────────────────────────────────────────────────

function FavoriteButton({ toolId }: { toolId: string }) {
  const { favorites, toggleFavorite } = useTools();
  const isFav = favorites.includes(toolId);
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9 rounded-full text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 active:scale-95 transition-all"
      onClick={() => toggleFavorite(toolId)}
      aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
    >
      <Heart className={cn("h-5 w-5 transition-all", isFav ? "fill-red-500 text-red-500 scale-110" : "scale-100")} />
    </Button>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function UuidGenerator() {
  const [version, setVersion] = useState<"v4" | "v1">("v4");
  const [count, setCount] = useState(1);
  const [uppercase, setUppercase] = useState(false);
  const [braces, setBraces] = useState(false);
  const [hyphens, setHyphens] = useState(true);
  const [uuids, setUuids] = useState<string[]>([]);

  const formatUuid = useCallback(
    (raw: string) => {
      let out = raw;
      if (!hyphens) out = out.replace(/-/g, "");
      if (braces) out = `{${out}}`;
      out = uppercase ? out.toUpperCase() : out.toLowerCase();
      return out;
    },
    [hyphens, braces, uppercase]
  );

  const isValidCount = Number.isInteger(count) && count >= 1 && count <= 50;

  const handleGenerate = useCallback(() => {
    if (!isValidCount) {
      toast.error("Count must be between 1 and 50");
      return;
    }
    const generator = version === "v4" ? generateV4 : generateV1;
    const set = new Set<string>();
    while (set.size < count) {
      set.add(formatUuid(generator()));
    }
    setUuids(Array.from(set));
    toast.success(`Generated ${count} UUID ${version}s successfully`);
  }, [version, count, formatUuid, isValidCount]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([uuids.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `uuids_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Download started");
  }, [uuids]);

  const handleCopyAll = useCallback(() => {
    const text = uuids.join("\n");
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success("Copied UUIDs list to clipboard"))
      .catch(() => toast.error("Failed to copy to clipboard"));
  }, [uuids]);

  const handleClear = useCallback(() => {
    setUuids([]);
    toast.success("Cleared output");
  }, []);

  return (
    <div className="card-premium p-6 md:p-8 space-y-8 animate-slide-up max-w-6xl mx-auto">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Fingerprint className="size-5 text-muted-foreground" />
            UUID Generator
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Generate RFC 4122 compliant UUIDs (v4 random and v1 timestamp-based) in bulk.
          </p>
        </div>
        <FavoriteButton toolId="uuid-generator" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Controls Option Card */}
        <div className="rounded-2xl border border-border/40 bg-muted/30 p-5 space-y-5">
          <h2 className="text-sm font-semibold text-foreground">Generation Options</h2>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              UUID Version
            </label>
            <Select value={version} onValueChange={(v) => setVersion(v as "v4" | "v1")}>
              <SelectTrigger className="w-full h-10 rounded-xl bg-card">
                <SelectValue placeholder="Select version" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="v4">UUID v4 (Randomly generated)</SelectItem>
                <SelectItem value="v1">UUID v1 (Timestamp & node id)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2 bg-card/65 p-4 rounded-xl border border-border/45">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Generate Count
              </label>
              <Badge
                variant="secondary"
                className="font-mono text-xs py-0 px-2 rounded-full border border-border bg-muted/20"
              >
                {count} items
              </Badge>
            </div>
            <Slider
              min={1}
              max={50}
              step={1}
              value={[count]}
              onValueChange={([v]) => setCount(v)}
              className="cursor-pointer py-2"
              aria-label="Select generation count from 1 to 50"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
              <span>1</span>
              <span>50</span>
            </div>
          </div>

          {/* Configuration checklists */}
          <div className="space-y-3 pt-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Output Styling Settings
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
                <Checkbox id="uppercase" checked={uppercase} onCheckedChange={(c) => setUppercase(!!c)} className="rounded" />
                <label htmlFor="uppercase" className="text-xs font-semibold text-muted-foreground cursor-pointer select-none">
                  Uppercase
                </label>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
                <Checkbox id="braces" checked={braces} onCheckedChange={(c) => setBraces(!!c)} className="rounded" />
                <label htmlFor="braces" className="text-xs font-semibold text-muted-foreground cursor-pointer select-none">
                  Add Braces
                </label>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
                <Checkbox id="hyphens" checked={hyphens} onCheckedChange={(c) => setHyphens(!!c)} className="rounded" />
                <label htmlFor="hyphens" className="text-xs font-semibold text-muted-foreground cursor-pointer select-none">
                  Hyphens
                </label>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2.5 pt-2">
            <Button
              onClick={handleGenerate}
              className="flex-1 h-10 rounded-full text-xs font-bold cursor-pointer active:scale-95 transition-all shadow-sm"
              aria-label="Generate UUIDs"
            >
              <RefreshCw className="h-4 w-4 mr-1.5" />
              Generate UUIDs
            </Button>
            {uuids.length > 0 && (
              <Button
                onClick={handleClear}
                variant="ghost"
                className="h-10 rounded-xl text-xs gap-1.5 text-muted-foreground hover:text-destructive hover:bg-card cursor-pointer active:scale-95 transition-all"
                aria-label="Clear UUIDs"
              >
                <Trash2 className="h-4 w-4" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Output List Scroll Area */}
        <div className="rounded-2xl border border-border/40 bg-muted/30 p-5 space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Generated Output</h2>
            {uuids.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyAll}
                  className="h-8 rounded-xl text-xs gap-1.5 hover:bg-card cursor-pointer active:scale-95 transition-all"
                  aria-label="Copy all UUIDs"
                >
                  <Copy className="size-3.5" />
                  Copy List
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDownload}
                  className="h-8 rounded-xl text-xs gap-1.5 hover:bg-card cursor-pointer active:scale-95 transition-all"
                  aria-label="Download UUIDs"
                >
                  <Download className="size-3.5" />
                  Download
                </Button>
              </div>
            )}
          </div>

          <div className="flex-1 min-h-75 flex flex-col">
            <ScrollArea className="flex-1 border border-border rounded-xl bg-card overflow-hidden">
              {uuids.length > 0 ? (
                <div className="p-4 font-mono text-xs text-foreground leading-relaxed whitespace-pre-wrap select-all">
                  {uuids.join("\n")}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-75 gap-3 text-center p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted border border-border/50">
                    <Fingerprint className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Empty Output
                  </p>
                  <p className="text-xs text-muted-foreground/60 max-w-50">
                    Configure options and click Generate UUIDs to create identifiers.
                  </p>
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
}

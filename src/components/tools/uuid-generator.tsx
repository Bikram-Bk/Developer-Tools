import { toast } from "sonner";
import { useState } from "react";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { v1 as uuidv1, v4 as uuidv4 } from "uuid";
import { Checkbox } from "@/components/ui/checkbox";
import { Copy, RefreshCw, Download, Trash2 } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";


function generateV4(): string {
  return uuidv4();
}

function generateV1(): string {
  return uuidv1();
}

export function UuidGenerator() {
  const [version, setVersion] = useState<"v4" | "v1">("v4");
  const [count, setCount] = useState(1);
  const [uppercase, setUppercase] = useState(false);
  const [braces, setBraces] = useState(false);
  const [hyphens, setHyphens] = useState(true);
  const [uuids, setUuids] = useState<string[]>([]);
  // Helper to format UUID according to UI options
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
      .then(() => toast.success("Copied to clipboard"))
      .catch(() => toast.error("Failed to copy to clipboard"));
  }, [uuids]);
  const handleClear = useCallback(() => {
    setUuids([]);
  }, []);


  return (
    <div className="flex flex-col gap-4 p-4 bg-card rounded-xl shadow-sm animate-in fade-in duration-300">
      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-muted-foreground">Version</label>
          <Select value={version} onValueChange={(v) => setVersion(v as "v4" | "v1")}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select version" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="v4">UUID v4 (random)</SelectItem>
              <SelectItem value="v1">UUID v1 (timestamp)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-muted-foreground">Count ({count})</label>
          <Slider
            value={[count]}
            min={1}
            max={50}
            step={1}
            onValueChange={([v]) => setCount(v)}
          />
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id="uppercase" checked={uppercase} onCheckedChange={(c) => setUppercase(!!c)} />
          <label htmlFor="uppercase" className="text-sm font-medium text-muted-foreground">Uppercase</label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id="braces" checked={braces} onCheckedChange={(c) => setBraces(!!c)} />
          <label htmlFor="braces" className="text-sm font-medium text-muted-foreground">Add braces</label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id="hyphens" checked={hyphens} onCheckedChange={(c) => setHyphens(!!c)} />
          <label htmlFor="hyphens" className="text-sm font-medium text-muted-foreground">Include hyphens</label>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button onClick={handleGenerate} variant="default" aria-label="Generate UUIDs">
          <RefreshCw className="h-4 w-4 mr-1" />
          Generate
        </Button>
        {uuids.length > 0 && (
          <>
            <Button onClick={handleCopyAll} variant="outline" aria-label="Copy all UUIDs">
              <Copy className="h-4 w-4 mr-1" />
              Copy All
            </Button>
            <Button onClick={handleDownload} variant="outline" aria-label="Download UUIDs">
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
            <Button
              onClick={handleClear}
              variant="destructive"
              aria-label="Clear UUIDs"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </>
        )}
      </div>

      {/* Output */}
      {uuids.length > 0 && (
        <pre className="p-4 bg-muted rounded-md overflow-auto text-sm font-mono whitespace-pre-wrap">
          {uuids.map((u) => u).join("\n")}
        </pre>
      )}
    </div>
  );
}

"use client";

import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTools } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useCallback, useEffect, useRef } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  Copy,
  Trash2,
  ArrowLeftRight,
  AlertCircle,
  CheckCircle2,
  Settings2,
  RefreshCw,
  Link,
  Heart
} from "lucide-react";

// ─── Encoding/Decoding Core Logic ─────────────────────────────────────────────

interface UrlSettings {
  encodeMode: "component" | "uri";
  spaceAsPlus: boolean;
  rfc3986: boolean;
  autoProcess: boolean;
}

function encodeText(text: string, settings: UrlSettings): string {
  if (!text) return "";

  let result = "";
  if (settings.encodeMode === "component") {
    result = encodeURIComponent(text);
  } else {
    result = encodeURI(text);
  }

  if (settings.rfc3986) {
    result = result.replace(/[!'()*]/g, (c) => {
      return "%" + c.charCodeAt(0).toString(16).toUpperCase();
    });
  }

  if (settings.spaceAsPlus) {
    result = result.replace(/%20/g, "+");
  }

  return result;
}

function decodeText(text: string, settings: UrlSettings): string {
  if (!text) return "";

  let temp = text;
  if (settings.spaceAsPlus) {
    temp = temp.replace(/\+/g, "%20");
  }

  if (settings.encodeMode === "component") {
    return decodeURIComponent(temp);
  } else {
    return decodeURI(temp);
  }
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

export function UrlTool() {
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const [input, setInput] = useState("");

  const [settings, setSettings] = useState<UrlSettings>({
    encodeMode: "component",
    spaceAsPlus: false,
    rfc3986: true,
    autoProcess: true,
  });

  const [manualState, setManualState] = useState<{
    input: string;
    mode: "encode" | "decode";
    settings: UrlSettings;
  } | null>(null);

  const activeInput = settings.autoProcess ? input : (manualState?.input ?? "");
  const activeMode = settings.autoProcess ? mode : (manualState?.mode ?? "encode");
  const activeSettings = settings.autoProcess ? settings : (manualState?.settings ?? settings);

  let output = "";
  let error: string | null = null;

  if (activeInput) {
    try {
      if (activeMode === "encode") {
        output = encodeText(activeInput, activeSettings);
      } else {
        output = decodeText(activeInput, activeSettings);
      }
    } catch (e) {
      error = e instanceof URIError
        ? "Malformed URI: Contains an invalid percent-encoded sequence (e.g. % followed by non-hex characters or unmatched surrogate halves)."
        : (e as Error).message || "An error occurred during processing.";
    }
  }

  const latestRef = useRef({ mode, input, output, settings, manualState });
  useEffect(() => {
    latestRef.current = { mode, input, output, settings, manualState };
  });

  const triggerManualProcess = () => {
    setManualState({ input, mode, settings });
  };

  const handleSwap = useCallback(() => {
    const { mode: currentMode, output: currentOutput, settings: currentSettings, manualState: currentManualState } = latestRef.current;
    const currentActiveMode = currentSettings.autoProcess ? currentMode : (currentManualState?.mode ?? "encode");
    const nextMode = currentActiveMode === "encode" ? "decode" : "encode";

    setInput(currentOutput);
    setMode(nextMode);

    if (!currentSettings.autoProcess) {
      setManualState({
        input: currentOutput,
        mode: nextMode,
        settings: currentSettings,
      });
    }
    toast.success(`Swapped text and switched to ${nextMode} mode`);
  }, []);

  const handleCopy = useCallback(() => {
    const { output: currentOutput } = latestRef.current;
    if (!currentOutput) {
      toast.error("Nothing to copy!");
      return;
    }
    navigator.clipboard
      .writeText(currentOutput)
      .then(() => toast.success("Copied output to clipboard"))
      .catch(() => toast.error("Failed to copy to clipboard"));
  }, []);

  const handleClear = useCallback(() => {
    setInput("");
    setManualState(null);
    toast.success("Cleared inputs");
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey) {
        const key = e.key.toLowerCase();
        if (key === "s") {
          e.preventDefault();
          handleSwap();
        } else if (key === "c") {
          e.preventDefault();
          handleCopy();
        } else if (key === "x") {
          e.preventDefault();
          handleClear();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSwap, handleCopy, handleClear]);

  const checkRoundTrip = (): { valid: boolean; type: "exact" | "semantic" | "none"; reason?: string } => {
    if (!input || !output || error) return { valid: false, type: "none" };

    try {
      if (mode === "encode") {
        const decodedBack = decodeText(output, settings);
        if (decodedBack === input) {
          return { valid: true, type: "exact" };
        }
      } else {
        const reEncoded = encodeText(output, settings);
        if (reEncoded === input) {
          return { valid: true, type: "exact" };
        }
        const decodeReEncoded = decodeText(reEncoded, settings);
        if (decodeReEncoded === output) {
          return {
            valid: true,
            type: "semantic",
            reason: "Valid semantic match. Encoding representations differ (e.g. case of hex letters or space encoding differences)."
          };
        }
      }
    } catch {
    }

    return { valid: false, type: "none" };
  };

  const roundTrip = checkRoundTrip();

  const inputLen = input.length;
  const outputLen = output.length;
  const sizeDiff = outputLen - inputLen;
  const sizePercent = inputLen > 0 ? Math.round((sizeDiff / inputLen) * 100) : 0;

  return (
    <div className="card-premium p-6 md:p-8 space-y-8 animate-slide-up max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Link className="h-5 w-5 text-muted-foreground" />
            URL Encoder / Decoder
          </h1>
          <p className="text-sm text-muted-foreground">
            Encode and decode URL parameters safely with configurable RFC 3986 compliance.
          </p>
        </div>
        <FavoriteButton toolId="url-tool" />
      </div>

      {/* Settings / Mode Switcher */}
      <div className="rounded-2xl border border-border/40 bg-muted/30 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Operation
            </span>
            <Tabs value={mode} onValueChange={(val) => setMode(val as "encode" | "decode")} className="w-auto">
              <TabsList className="bg-muted p-1 rounded-xl h-9">
                <TabsTrigger value="encode" className="text-xs rounded-lg px-4 h-7 cursor-pointer transition-all">
                  Encode URL
                </TabsTrigger>
                <TabsTrigger value="decode" className="text-xs rounded-lg px-4 h-7 cursor-pointer transition-all">
                  Decode URL
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {!settings.autoProcess && (
              <Button
                onClick={triggerManualProcess}
                className="h-9 rounded-full text-xs font-semibold cursor-pointer active:scale-95 transition-all shadow-sm"
                aria-label="Trigger manual URL conversion"
              >
                <RefreshCw className="h-4 w-4 mr-1.5" />
                Process URL
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSwap}
              disabled={!output && !input}
              className="h-9 rounded-xl text-xs gap-1.5 hover:bg-card cursor-pointer active:scale-95 transition-all"
              aria-label="Swap input and output values and switch mode"
            >
              <ArrowLeftRight className="h-4 w-4" />
              Swap Panels
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              disabled={!output || !!error}
              className="h-9 rounded-xl text-xs gap-1.5 hover:bg-card cursor-pointer active:scale-95 transition-all"
              aria-label="Copy output text to clipboard"
            >
              <Copy className="h-4 w-4" />
              Copy Output
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={!input && !output}
              className="h-9 rounded-xl text-xs gap-1.5 text-muted-foreground hover:text-destructive hover:bg-card cursor-pointer active:scale-95 transition-all"
              aria-label="Clear all inputs and outputs"
            >
              <Trash2 className="h-4 w-4" />
              Clear
            </Button>
          </div>
        </div>
      </div>

      {/* Workspace Split Textareas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center px-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Input URL Text
            </span>
            {inputLen > 0 && (
              <span className="text-xs text-muted-foreground font-mono">
                {inputLen} chars
              </span>
            )}
          </div>
          <div className="relative rounded-xl border border-border focus-within:border-primary/45 focus-within:ring-1 focus-within:ring-primary/20 transition-all overflow-hidden bg-card">
            <Textarea
              id="url-input"
              placeholder={
                mode === "encode"
                  ? "Enter text or URL query parameters to encode (e.g. key=value & spaces inside)"
                  : "Enter percent-encoded URL text to decode (e.g. key%3Dvalue%20%26%20spaces%20inside)"
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="min-h-55 resize-none border-0 font-mono text-sm leading-relaxed bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none p-4"
              aria-label={mode === "encode" ? "URL input text to encode" : "URL input text to decode"}
            />
          </div>
        </div>

        {/* Output Panel */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center px-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Converted Output
            </span>
            {outputLen > 0 && (
              <span className="text-xs text-muted-foreground font-mono animate-in fade-in">
                {outputLen} chars
                {sizeDiff !== 0 && (
                  <span className={cn("ml-1 font-semibold", sizeDiff > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400")}>
                    ({sizeDiff > 0 ? `+${sizeDiff}` : sizeDiff} chars, {sizePercent > 0 ? `+${sizePercent}` : sizePercent}%)
                  </span>
                )}
              </span>
            )}
          </div>
          <div className="relative rounded-xl border border-border overflow-hidden bg-muted/30 min-h-55.5 flex flex-col">
            <Textarea
              id="url-output"
              readOnly
              placeholder="Converted output will appear here..."
              value={output}
              className={cn(
                "flex-1 min-h-55 font-mono text-sm resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-4 leading-relaxed cursor-default",
                error && "text-red-700 dark:text-red-400 bg-red-50/10"
              )}
              aria-label={mode === "encode" ? "Encoded URL output text" : "Decoded URL output text"}
            />
            {error && (
              <div className="absolute inset-0 bg-red-50/90 dark:bg-red-950/90 backdrop-blur-[1px] flex flex-col justify-center items-center p-6 text-center border border-red-200 dark:border-red-900/50 rounded-xl animate-scale-in">
                <AlertCircle className="h-7 w-7 text-red-600 dark:text-red-400 mb-2 animate-bounce" />
                <h4 className="font-bold text-red-700 dark:text-red-400 text-sm">Decoding Failure</h4>
                <p className="text-xs text-red-700/80 dark:text-red-400/85 mt-1.5 max-w-sm font-medium">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Configuration Settings Panel */}
      <div className="rounded-2xl border border-border/40 bg-muted/30 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Encoding & Decoding Configurations</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 pt-1">
          {/* Target Encoding Mode */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="encode-mode-select" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              URI Scope Selection
            </label>
            <Select
              value={settings.encodeMode}
              onValueChange={(val: "component" | "uri") =>
                setSettings((prev) => ({ ...prev, encodeMode: val }))
              }
            >
              <SelectTrigger id="encode-mode-select" className="h-10 rounded-xl bg-card border border-border" aria-label="Select URL encoding scope">
                <SelectValue placeholder="Encoding Mode" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="component">Component (Query param value)</SelectItem>
                <SelectItem value="uri">Full URI (Skip protocol, ?, &)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Space encoding */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="space-encoding-select" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Space Character Code
            </label>
            <Select
              value={settings.spaceAsPlus ? "plus" : "percent"}
              onValueChange={(val: "plus" | "percent") =>
                setSettings((prev) => ({ ...prev, spaceAsPlus: val === "plus" }))
              }
            >
              <SelectTrigger id="space-encoding-select" className="h-10 rounded-xl bg-card border border-border" aria-label="Select space character encoding format">
                <SelectValue placeholder="Space Encoding" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="percent">Percent Encode (%20)</SelectItem>
                <SelectItem value="plus">Plus Sign (+)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Strict Checkbox */}
          <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card h-10 mt-auto">
            <Checkbox
              id="rfc3986-check"
              checked={settings.rfc3986}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({ ...prev, rfc3986: !!checked }))
              }
              className="rounded"
            />
            <div className="grid leading-none">
              <label
                htmlFor="rfc3986-check"
                className="text-xs font-bold text-muted-foreground uppercase cursor-pointer"
              >
                RFC 3986 Strict
              </label>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Encodes <code className="font-mono bg-muted px-1 rounded">! * &apos; ( )</code>
              </p>
            </div>
          </div>

          {/* Auto process */}
          <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card h-10 mt-auto">
            <Checkbox
              id="autoprocess-check"
              checked={settings.autoProcess}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({ ...prev, autoProcess: !!checked }))
              }
              className="rounded"
            />
            <div className="grid leading-none">
              <label
                htmlFor="autoprocess-check"
                className="text-xs font-bold text-muted-foreground uppercase cursor-pointer"
              >
                Auto Process
              </label>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Convert inputs dynamically
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions & Status Ribbon */}
      {input && (
        <div className="rounded-2xl border border-border/40 bg-muted/30 p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-scale-in">
          {/* Validation Status */}
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <span>Input Format Check:</span>
            {error ? (
              <Badge variant="outline" className="gap-1 bg-red-50 text-red-700 border-red-200 rounded-full px-2 py-0.5 text-[10px]">
                <AlertCircle className="h-3 w-3 text-red-600" />
                Invalid percent sequence
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="bg-emerald-50 text-emerald-700 border-emerald-200 rounded-full gap-1 px-2 py-0.5 text-[10px]"
              >
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                Valid percent format
              </Badge>
            )}
          </div>

          {/* Round-trip Status */}
          {output && !error && (
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <span>Conversion Round-trip:</span>
              {roundTrip.valid ? (
                <Badge
                  variant="outline"
                  className={cn(
                    "gap-1 border rounded-full px-2 py-0.5 text-[10px] font-bold shadow-sm",
                    roundTrip.type === "exact"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  )}
                  title={roundTrip.reason || "Decodes exactly back to original input text."}
                >
                  <CheckCircle2 className="h-3 w-3" />
                  {roundTrip.type === "exact" ? "Lossless (Exact)" : "Lossless (Semantic)"}
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="bg-red-50 text-red-700 border-red-200 rounded-full gap-1 px-2 py-0.5 text-[10px]"
                >
                  <AlertCircle className="h-3 w-3 text-red-600" />
                  Lossy conversion
                </Badge>
              )}
            </div>
          )}
        </div>
      )}

      {/* Keyboard Shortcuts Helper Panel */}
      <div className="text-[11px] font-semibold text-muted-foreground flex flex-wrap gap-x-6 gap-y-2 justify-center sm:justify-start border-t border-border/50 pt-5">
        <span className="text-foreground uppercase tracking-wider text-[10px] font-bold">
          Keyboard Shortcuts
        </span>
        <span className="flex items-center gap-2">
          <kbd className="bg-muted px-2 py-0.5 rounded-lg border border-border font-mono shadow-sm text-foreground text-[10px] font-bold">Alt + S</kbd>
          <span>Swap values and toggle mode</span>
        </span>
        <span className="flex items-center gap-2">
          <kbd className="bg-muted px-2 py-0.5 rounded-lg border border-border font-mono shadow-sm text-foreground text-[10px] font-bold">Alt + C</kbd>
          <span>Copy output text</span>
        </span>
        <span className="flex items-center gap-2">
          <kbd className="bg-muted px-2 py-0.5 rounded-lg border border-border font-mono shadow-sm text-foreground text-[10px] font-bold">Alt + X</kbd>
          <span>Reset inputs</span>
        </span>
      </div>
    </div>
  );
}

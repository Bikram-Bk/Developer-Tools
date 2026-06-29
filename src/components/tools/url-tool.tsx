"use client";

import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useCallback, useEffect, useRef } from "react";
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

  // RFC 3986 Strict Encoding
  // encodeURIComponent and encodeURI do not escape: ! ' ( ) *
  if (settings.rfc3986) {
    result = result.replace(/[!'()*]/g, (c) => {
      return "%" + c.charCodeAt(0).toString(16).toUpperCase();
    });
  }

  // Handle Space encoding
  if (settings.spaceAsPlus) {
    // Standard URL encoding converts spaces to %20.
    // If spaces should be encoded as +, we replace all %20 with +
    result = result.replace(/%20/g, "+");
  }

  return result;
}

function decodeText(text: string, settings: UrlSettings): string {
  if (!text) return "";

  let temp = text;
  if (settings.spaceAsPlus) {
    // If space as plus is active, plus signs decode to spaces.
    // We replace + with %20 before decoding.
    temp = temp.replace(/\+/g, "%20");
  }

  if (settings.encodeMode === "component") {
    return decodeURIComponent(temp);
  } else {
    return decodeURI(temp);
  }
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

  // We keep a state for manually triggered values
  const [manualState, setManualState] = useState<{
    input: string;
    mode: "encode" | "decode";
    settings: UrlSettings;
  } | null>(null);

  // Decide which source values to use for the actual encoding/decoding calculation
  const activeInput = settings.autoProcess ? input : (manualState?.input ?? "");
  const activeMode = settings.autoProcess ? mode : (manualState?.mode ?? "encode");
  const activeSettings = settings.autoProcess ? settings : (manualState?.settings ?? settings);

  // Compute output and error during render!
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

  // Store latest states in a ref to keep callbacks stable with empty dependencies
  const latestRef = useRef({ mode, input, output, settings, manualState });
  useEffect(() => {
    latestRef.current = { mode, input, output, settings, manualState };
  });

  const triggerManualProcess = () => {
    setManualState({ input, mode, settings });
  };

  // ─── Swap Action ────────────────────────────────────────────────────────────

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

  // ─── Copy Action ────────────────────────────────────────────────────────────

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

  // ─── Clear Action ───────────────────────────────────────────────────────────

  const handleClear = useCallback(() => {
    setInput("");
    setManualState(null);
    toast.success("Cleared inputs");
  }, []);

  // ─── Keyboard Shortcuts Listener ───────────────────────────────────────────

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

  // ─── Round-trip Validation Checker ──────────────────────────────────────────

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

  // Character statistics
  const inputLen = input.length;
  const outputLen = output.length;
  const sizeDiff = outputLen - inputLen;
  const sizePercent = inputLen > 0 ? Math.round((sizeDiff / inputLen) * 100) : 0;

  return (
    <div className="flex flex-col gap-6 p-6 bg-card rounded-xl border border-border shadow-sm max-w-6xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-border">
        <div>
          <h3 className="font-semibold text-xl tracking-tight flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Link className="h-5 w-5" />
            </span>
            URL Encoder / Decoder
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Encode and decode URL parameters safely with configurable RFC 3986 compliance.
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="flex rounded-lg bg-muted p-1 border border-border self-stretch md:self-auto">
          <button
            onClick={() => setMode("encode")}
            aria-label="Switch to Encode mode"
            className={cn(
              "px-4 py-1.5 text-sm font-medium rounded-md transition-all cursor-pointer",
              mode === "encode"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Encode
          </button>
          <button
            onClick={() => setMode("decode")}
            aria-label="Switch to Decode mode"
            className={cn(
              "px-4 py-1.5 text-sm font-medium rounded-md transition-all cursor-pointer",
              mode === "decode"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Decode
          </button>
        </div>
      </div>

      {/* Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <label htmlFor="url-input" className="text-sm font-semibold tracking-wide text-foreground uppercase">
              Input Text
            </label>
            {inputLen > 0 && (
              <span className="text-xs text-muted-foreground">
                {inputLen} character{inputLen !== 1 && "s"}
              </span>
            )}
          </div>
          <Textarea
            id="url-input"
            placeholder={
              mode === "encode"
                ? "Enter text or URL query parameters to encode (e.g., hello world! & welcome)"
                : "Enter percent-encoded URL text to decode (e.g., hello%20world%21%20%26%20welcome)"
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="min-h-55 font-mono text-sm resize-y"
            aria-label={mode === "encode" ? "URL input text to encode" : "URL input text to decode"}
          />
        </div>

        {/* Output Panel */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <label htmlFor="url-output" className="text-sm font-semibold tracking-wide text-foreground uppercase">
              Output Text
            </label>
            {outputLen > 0 && (
              <span className="text-xs text-muted-foreground animate-in fade-in">
                {outputLen} character{outputLen !== 1 && "s"}
                {sizeDiff !== 0 && (
                  <span className={cn("ml-1 font-medium", sizeDiff > 0 ? "text-amber-500" : "text-emerald-500")}>
                    ({sizeDiff > 0 ? `+${sizeDiff}` : sizeDiff} chars, {sizePercent > 0 ? `+${sizePercent}` : sizePercent}%)
                  </span>
                )}
              </span>
            )}
          </div>
          <div className="relative flex-1 min-h-55">
            <Textarea
              id="url-output"
              readOnly
              placeholder="Output will appear here..."
              value={output}
              className={cn(
                "w-full h-full min-h-55 font-mono text-sm resize-none bg-muted/30 focus-visible:ring-0 cursor-default",
                error && "border-destructive/30 bg-destructive/5 text-destructive/90"
              )}
              aria-label={mode === "encode" ? "Encoded URL output text" : "Decoded URL output text"}
            />
            {error && (
              <div className="absolute inset-0 bg-destructive/10 backdrop-blur-[1px] flex flex-col justify-center items-center p-6 text-center border border-destructive/20 rounded-lg animate-in fade-in duration-200">
                <AlertCircle className="h-8 w-8 text-destructive mb-2 animate-bounce" />
                <h4 className="font-semibold text-destructive text-sm">Decoding Failure</h4>
                <p className="text-xs text-destructive/80 mt-1 max-w-sm whitespace-pre-wrap">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Configuration Panel */}
      <div className="flex flex-col gap-4 p-4 bg-muted/30 rounded-lg border border-border shadow-inner">
        <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <Settings2 className="h-4 w-4 text-primary" />
          Settings
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* Target Encoding Mode */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="encode-mode-select" className="text-xs font-semibold text-muted-foreground uppercase">
              URI Scope Selection
            </label>
            <Select
              value={settings.encodeMode}
              onValueChange={(val: "component" | "uri") =>
                setSettings((prev) => ({ ...prev, encodeMode: val }))
              }
            >
              <SelectTrigger id="encode-mode-select" className="h-9 w-full bg-background" aria-label="Select URL encoding scope">
                <SelectValue placeholder="Encoding Mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="component">Component (Query value)</SelectItem>
                <SelectItem value="uri">Full URI (Keep protocol, ?, &)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Space encoding */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="space-encoding-select" className="text-xs font-semibold text-muted-foreground uppercase">
              Space Character
            </label>
            <Select
              value={settings.spaceAsPlus ? "plus" : "percent"}
              onValueChange={(val: "plus" | "percent") =>
                setSettings((prev) => ({ ...prev, spaceAsPlus: val === "plus" }))
              }
            >
              <SelectTrigger id="space-encoding-select" className="h-9 w-full bg-background" aria-label="Select space character encoding format">
                <SelectValue placeholder="Space Encoding" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percent">Percent Encode (%20)</SelectItem>
                <SelectItem value="plus">Plus Sign (+)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Strict Checkbox */}
          <div className="flex items-center space-x-2 pt-2 sm:pt-6">
            <Checkbox
              id="rfc3986-check"
              checked={settings.rfc3986}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({ ...prev, rfc3986: !!checked }))
              }
              aria-label="Enable strict RFC 3986 compliance"
            />
            <div className="grid gap-1 leading-none">
              <label
                htmlFor="rfc3986-check"
                className="text-sm font-medium text-foreground cursor-pointer"
              >
                RFC 3986 Strict
              </label>
              <p className="text-[11px] text-muted-foreground">
                Force encodes <code className="bg-muted px-1 rounded">! * &apos; ( )</code>
              </p>
            </div>
          </div>

          {/* Auto process */}
          <div className="flex items-center space-x-2 pt-2 sm:pt-6">
            <Checkbox
              id="autoprocess-check"
              checked={settings.autoProcess}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({ ...prev, autoProcess: !!checked }))
              }
              aria-label="Enable real-time automatic processing"
            />
            <div className="grid gap-1 leading-none">
              <label
                htmlFor="autoprocess-check"
                className="text-sm font-medium text-foreground cursor-pointer"
              >
                Auto Process
              </label>
              <p className="text-[11px] text-muted-foreground">
                Convert inputs in real-time
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions & Status Ribbon */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 pt-2">
        {/* Left Toolbar */}
        <div className="flex flex-wrap gap-2">
          {!settings.autoProcess && (
            <Button
              onClick={triggerManualProcess}
              className="h-9 px-4 cursor-pointer"
              aria-label="Trigger manual URL conversion"
            >
              <RefreshCw className="h-4 w-4 mr-1.5" />
              Process
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleSwap}
            disabled={!output && !input}
            className="h-9 px-4 cursor-pointer font-medium hover:text-primary transition-colors"
            aria-label="Swap input and output values and switch mode"
          >
            <ArrowLeftRight className="h-4 w-4 mr-1.5 text-muted-foreground" />
            Swap
          </Button>
          <Button
            variant="outline"
            onClick={handleCopy}
            disabled={!output || !!error}
            className="h-9 px-4 cursor-pointer font-medium hover:text-primary transition-colors"
            aria-label="Copy output text to clipboard"
          >
            <Copy className="h-4 w-4 mr-1.5 text-muted-foreground" />
            Copy Output
          </Button>
          <Button
            variant="destructive"
            onClick={handleClear}
            disabled={!input && !output}
            className="h-9 px-4 cursor-pointer font-medium"
            aria-label="Clear all inputs and outputs"
          >
            <Trash2 className="h-4 w-4 mr-1.5" />
            Clear
          </Button>
        </div>

        {/* Right Toolbar Status Badges */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Validation Status */}
          {input && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <span>Input Check:</span>
              {error ? (
                <Badge variant="destructive" className="gap-1 shadow-sm">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Invalid Encoding
                </Badge>
              ) : (
                <Badge
                  variant="secondary"
                  className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/10 gap-1 border border-emerald-500/20 shadow-sm"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Valid Format
                </Badge>
              )}
            </div>
          )}

          {/* Round-trip Status */}
          {input && output && !error && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <span>Round-trip:</span>
              {roundTrip.valid ? (
                <Badge
                  variant="secondary"
                  className={cn(
                    "gap-1 border cursor-help shadow-sm",
                    roundTrip.type === "exact"
                      ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/10 border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-500 hover:bg-amber-500/10 border-amber-500/20"
                  )}
                  title={roundTrip.reason || "Decodes exactly back to input text."}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {roundTrip.type === "exact" ? "Lossless (Exact)" : "Lossless (Semantic)"}
                </Badge>
              ) : (
                <Badge
                  variant="secondary"
                  className="bg-red-500/10 text-red-500 hover:bg-red-500/10 gap-1 border border-red-500/20 shadow-sm"
                >
                  <AlertCircle className="h-3.5 w-3.5" />
                  Lossy Match
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Keyboard Shortcuts Helper Panel */}
      <div className="text-[11px] text-muted-foreground flex flex-wrap gap-x-4 gap-y-1.5 justify-center sm:justify-start border-t border-border pt-4">
        <span className="font-semibold text-foreground">Keyboard Shortcuts:</span>
        <span className="flex items-center gap-1">
          <kbd className="bg-muted px-1.5 py-0.5 rounded border border-border font-mono shadow-sm">Alt + S</kbd> Swap Panels & Switch Mode
        </span>
        <span className="flex items-center gap-1">
          <kbd className="bg-muted px-1.5 py-0.5 rounded border border-border font-mono shadow-sm">Alt + C</kbd> Copy Output
        </span>
        <span className="flex items-center gap-1">
          <kbd className="bg-muted px-1.5 py-0.5 rounded border border-border font-mono shadow-sm">Alt + X</kbd> Clear View
        </span>
      </div>
    </div>
  );
}

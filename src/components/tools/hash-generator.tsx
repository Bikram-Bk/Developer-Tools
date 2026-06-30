"use client";

import * as React from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTools } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useState, useMemo, useCallback, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Copy,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileUp,
  FileText,
  Upload,
  Heart
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const SHA256_HEX_REGEX = /^[a-fA-F0-9]{64}$/;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function arrayBufferToHex(buffer: ArrayBuffer): string {
  const hashArray = Array.from(new Uint8Array(buffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
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

export function HashGenerator() {
  const [textInput, setTextInput] = useState("");
  const [hashResult, setHashResult] = useState("");
  const [isCalculating, setIsCalculating] = useState(false);
  const [compareHash, setCompareHash] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [activeTab, setActiveTab] = useState<"text" | "file">("text");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Browser Support Check ─────────────────────────────────────────────────
  const cryptoSupported = useMemo(() => {
    return (
      typeof window !== "undefined" &&
      window.crypto !== undefined &&
      window.crypto.subtle !== undefined
    );
  }, []);

  // ─── Hash Comparison Logic ──────────────────────────────────────────────────
  const comparisonResult = useMemo(() => {
    if (!hashResult || !compareHash.trim()) return "none";

    const trimmed = compareHash.trim();

    if (!SHA256_HEX_REGEX.test(trimmed)) return "invalid";

    if (hashResult.toLowerCase() === trimmed.toLowerCase()) return "match";

    return "mismatch";
  }, [hashResult, compareHash]);

  // ─── Text Hash Calculation ──────────────────────────────────────────────────
  const calculateTextHash = useCallback(async () => {
    if (!textInput.trim()) {
      toast.error("Please enter text to hash");
      return;
    }

    if (!cryptoSupported) {
      toast.error("Web Crypto API is not supported in your browser");
      return;
    }

    setIsCalculating(true);
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(textInput);
      const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
      const hashHex = arrayBufferToHex(hashBuffer);
      setHashResult(hashHex);
      toast.success("SHA-256 hash calculated successfully");
    } catch (err) {
      toast.error("Failed to calculate hash");
      console.error("Hash calculation error:", err);
    } finally {
      setIsCalculating(false);
    }
  }, [textInput, cryptoSupported]);

  // ─── File Hash Calculation ──────────────────────────────────────────────────
  const calculateFileHash = useCallback(
    async (file: File) => {
      if (!cryptoSupported) {
        toast.error("Web Crypto API is not supported in your browser");
        return;
      }

      setIsCalculating(true);
      setFileName(file.name);
      setFileSize(file.size);
      try {
        const arrayBuffer = await file.arrayBuffer();
        const hashBuffer = await window.crypto.subtle.digest(
          "SHA-256",
          arrayBuffer,
        );
        const hashHex = arrayBufferToHex(hashBuffer);
        setHashResult(hashHex);
        toast.success("File checksum calculated successfully");
      } catch (err) {
        toast.error("Failed to calculate file checksum");
        console.error("File hash error:", err);
      } finally {
        setIsCalculating(false);
      }
    },
    [cryptoSupported],
  );

  // ─── Copy Handler ───────────────────────────────────────────────────────────
  const handleCopyHash = useCallback(() => {
    if (!hashResult) {
      toast.error("Nothing to copy!");
      return;
    }
    navigator.clipboard
      .writeText(hashResult)
      .then(() => toast.success("Hash copied to clipboard"))
      .catch(() => toast.error("Failed to copy hash"));
  }, [hashResult]);

  // ─── Clear All ──────────────────────────────────────────────────────────────
  const handleClearAll = useCallback(() => {
    setTextInput("");
    setHashResult("");
    setCompareHash("");
    setFileName(null);
    setFileSize(null);
    toast.success("Cleared all inputs and results");
  }, []);

  // ─── Drag & Drop Handlers ───────────────────────────────────────────────────
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      const files = e.dataTransfer.files;
      if (files && files[0]) {
        calculateFileHash(files[0]);
      }
    },
    [calculateFileHash],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files[0]) {
        calculateFileHash(files[0]);
      }
    },
    [calculateFileHash],
  );

  return (
    <div className="card-premium p-6 md:p-8 space-y-8 animate-slide-up max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            SHA-256 Hash Generator
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Generate SHA-256 hashes from text or verify file checksums locally.
          </p>
        </div>
        <FavoriteButton toolId="hash-generator" />
      </div>

      {/* Browser Support Warning */}
      {!cryptoSupported && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl border text-sm transition-all bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/50 animate-scale-in">
          <AlertCircle className="size-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
          <div>
            <p className="font-semibold">Browser Not Supported</p>
            <p className="text-xs text-red-700/80 dark:text-red-400/85 mt-0.5">
              Your browser does not support the Web Crypto API. Please update to a modern browser.
            </p>
          </div>
        </div>
      )}

      {/* Mode Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "text" | "file")}
        className="space-y-4"
      >
        <TabsList className="bg-muted p-1 rounded-xl h-9">
          <TabsTrigger value="text" className="text-xs rounded-lg px-4 h-7 cursor-pointer transition-all" aria-label="Hash text input tab">
            Text Input
          </TabsTrigger>
          <TabsTrigger value="file" className="text-xs rounded-lg px-4 h-7 cursor-pointer transition-all" aria-label="Hash file input tab">
            File Input
          </TabsTrigger>
        </TabsList>

        {/* ─── Text Hash Tab ──────────────────────────────────────────────── */}
        <TabsContent value="text" className="mt-0">
          <div className="rounded-2xl border border-border/40 bg-muted/30 p-5 space-y-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Input Text
              </h2>
              <p className="text-xs text-muted-foreground">
                Enter text below to generate its cryptographic SHA-256 hash
              </p>
            </div>
            <div className="relative rounded-xl border border-border focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/20 transition-all overflow-hidden bg-card">
              <Textarea
                id="text-hash-input"
                placeholder="Enter text to generate SHA-256 hash..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                rows={6}
                className="font-mono text-sm resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none p-4 leading-relaxed"
                aria-label="Text input for SHA-256 hashing"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={calculateTextHash}
                disabled={isCalculating || !textInput.trim()}
                className="rounded-full text-xs font-semibold cursor-pointer active:scale-95 transition-all"
                aria-label="Generate SHA-256 hash from text"
              >
                <ShieldCheck className="size-3.5 mr-1" />
                Generate Hash
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAll}
                className="rounded-xl text-xs cursor-pointer hover:bg-card active:scale-95 transition-all"
                aria-label="Clear text input"
              >
                <Trash2 className="size-3.5 mr-1" />
                Clear
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* ─── File Hash Tab ──────────────────────────────────────────────── */}
        <TabsContent value="file" className="mt-0">
          <div className="rounded-2xl border border-border/40 bg-muted/30 p-5 space-y-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Upload File
              </h2>
              <p className="text-xs text-muted-foreground">
                Select or drag a file to calculate its SHA-256 checksum locally
              </p>
            </div>

            {/* Drag & Drop Zone */}
            <div
              className={cn(
                "relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 transition-all cursor-pointer",
                dragActive
                  ? "border-primary bg-primary/5 scale-[1.005]"
                  : "border-border hover:border-primary/45 hover:bg-muted/20",
              )}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              aria-label="Drag and drop file upload area or click to select"
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
            >
              <Upload className="mb-4 size-8 text-muted-foreground" />
              <p className="mb-1 text-sm font-semibold text-foreground">
                Drag & drop a file here, or click to browse
              </p>
              <p className="text-xs text-muted-foreground text-center">
                Calculations are done entirely client-side inside your browser
              </p>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                aria-label="Select file for checksum calculation"
              />
            </div>

            {/* File Info */}
            {fileName && (
              <div className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-card shadow-sm animate-scale-in">
                <FileText className="size-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate text-foreground">{fileName}</p>
                  {fileSize !== null && (
                    <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                      {formatFileSize(fileSize)}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-xl text-xs cursor-pointer hover:bg-card active:scale-95 transition-all"
                aria-label="Browse files"
              >
                <FileUp className="size-3.5 mr-1" />
                Browse Files
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAll}
                className="rounded-xl text-xs cursor-pointer hover:bg-card active:scale-95 transition-all"
                aria-label="Clear file selection"
              >
                <Trash2 className="size-3.5 mr-1" />
                Clear
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ─── Loading State ────────────────────────────────────────────────── */}
      {isCalculating && (
        <div className="rounded-2xl border border-border/40 bg-muted/30 p-5 animate-pulse">
          <div className="flex items-center gap-3">
            <Skeleton className="size-4 rounded-full bg-muted-foreground/30 animate-spin" />
            <Skeleton className="h-4 w-72 bg-muted-foreground/20 rounded-md" />
          </div>
        </div>
      )}

      {/* ─── Hash Result ──────────────────────────────────────────────────── */}
      {hashResult && !isCalculating && (
        <div className="rounded-2xl border border-border/40 bg-muted/30 p-5 space-y-4 animate-scale-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground">Hash Result</h2>
              <Badge
                variant="outline"
                className="text-[10px] uppercase font-bold tracking-wider py-0 px-2 border-border text-muted-foreground bg-muted/10 rounded-full"
              >
                SHA-256
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyHash}
              className="h-8 rounded-xl text-xs gap-1.5 hover:bg-card cursor-pointer active:scale-95 transition-all"
              aria-label="Copy hash to clipboard"
            >
              <Copy className="size-3.5" />
              Copy Hash
            </Button>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 font-mono text-sm leading-relaxed break-all dark:bg-card/40 text-foreground shadow-sm">
            {hashResult}
          </div>
        </div>
      )}

      <Separator className="bg-border/60" />

      {/* ─── Comparison Mode ──────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border/40 bg-muted/30 p-5 space-y-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <ShieldAlert className="size-4 text-muted-foreground" />
            Verify Checksum Integrity
          </h2>
          <p className="text-xs text-muted-foreground">
            Paste a reference SHA-256 hash to verify the integrity of the generated hash
          </p>
        </div>
        <div className="space-y-3">
          <Input
            id="compare-hash-input"
            type="text"
            placeholder="Paste reference SHA-256 hash (64 hex characters)..."
            value={compareHash}
            onChange={(e) => setCompareHash(e.target.value)}
            className={cn(
              "font-mono text-sm rounded-xl border-border focus:border-primary",
              comparisonResult === "invalid" && "border-red-500 focus-visible:ring-red-500",
            )}
            aria-label="Reference hash comparison input"
          />

          {/* Invalid Hash Format Warning */}
          {comparisonResult === "invalid" && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl border text-xs bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/50 animate-scale-in">
              <AlertCircle className="size-4 shrink-0 text-red-600 dark:text-red-400" />
              <div>
                <p className="font-semibold">Invalid Reference Hash</p>
                <p className="text-[11px] text-red-700/80 dark:text-red-400/85 mt-0.5">
                  The comparison hash must be exactly 64 hexadecimal characters.
                </p>
              </div>
            </div>
          )}

          {/* Match Result */}
          {comparisonResult === "match" && (
            <div className="flex items-center gap-3 p-4 rounded-xl border text-xs bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50 animate-scale-in">
              <CheckCircle className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="font-semibold text-sm">Checksum Matches!</p>
                <p className="text-xs text-emerald-700/80 dark:text-emerald-400/85 mt-0.5">
                  The generated hash matches the reference hash. Data integrity is confirmed.
                </p>
              </div>
            </div>
          )}

          {/* Mismatch Result */}
          {comparisonResult === "mismatch" && (
            <div className="flex items-center gap-3 p-4 rounded-xl border text-xs bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/50 animate-scale-in">
              <XCircle className="size-5 shrink-0 text-red-600 dark:text-red-400" />
              <div>
                <p className="font-semibold text-sm">Checksum Mismatch!</p>
                <p className="text-xs text-red-700/80 dark:text-red-400/85 mt-0.5">
                  The hashes do not match. The text or file may have been modified or corrupted.
                </p>
              </div>
            </div>
          )}

          {/* No Comparison Yet */}
          {comparisonResult === "none" && hashResult && !compareHash.trim() && (
            <div className="flex items-center gap-2.5 text-xs text-muted-foreground font-medium pl-1">
              <ShieldAlert className="size-3.5 text-muted-foreground/60" />
              <span>Input a comparison hash above to check verification.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

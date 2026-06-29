"use client";

import * as React from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useState, useMemo, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

// const SHA256_HEX_LENGTH = 64;
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

    // Validate reference hash format
    if (!SHA256_HEX_REGEX.test(trimmed)) return "invalid";

    // Case-insensitive comparison
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

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 p-6 bg-card rounded-xl border border-border shadow-sm max-w-6xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            SHA-256 Hash Generator
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Generate SHA-256 cryptographic hashes from text or files using the
            browser Web Crypto API
          </p>
        </div>
      </div>

      {/* Browser Support Warning */}
      {!cryptoSupported && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg flex items-start gap-2 animate-in fade-in">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Browser Not Supported</p>
            <p className="text-xs opacity-80">
              Your browser does not support the Web Crypto API. Please use a
              modern browser like Chrome, Firefox, Edge, or Safari.
            </p>
          </div>
        </div>
      )}

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "text" | "file")}
      >
        <TabsList>
          <TabsTrigger value="text" aria-label="Hash text input tab">
            Text Input
          </TabsTrigger>
          <TabsTrigger value="file" aria-label="Hash file input tab">
            File Input
          </TabsTrigger>
        </TabsList>

        {/* ─── Text Hash Tab ──────────────────────────────────────────────── */}
        <TabsContent value="text" className="mt-4">
          <Card className="shadow-inner">
            <CardHeader>
              <CardTitle>Input Text</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Enter text to generate its SHA-256 hash
              </p>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="text-hash-input"
                  className="text-xs font-semibold text-muted-foreground uppercase"
                >
                  Text Content
                </label>
                <Textarea
                  id="text-hash-input"
                  placeholder="Enter text to generate SHA-256 hash..."
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  rows={6}
                  className="font-mono text-sm resize-none"
                  aria-label="Text input for SHA-256 hashing"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={calculateTextHash}
                  disabled={isCalculating || !textInput.trim()}
                  className="cursor-pointer"
                  aria-label="Generate SHA-256 hash from text"
                >
                  <ShieldCheck className="size-3.5 mr-1" />
                  Generate Hash
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearAll}
                  className="cursor-pointer"
                  aria-label="Clear all inputs and results"
                >
                  <Trash2 className="size-3.5 mr-1" />
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── File Hash Tab ──────────────────────────────────────────────── */}
        <TabsContent value="file" className="mt-4">
          <Card className="shadow-inner">
            <CardHeader>
              <CardTitle>Upload File</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Select or drag a file to calculate its SHA-256 checksum
              </p>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {/* Drag & Drop Zone */}
              <div
                className={cn(
                  "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors cursor-pointer",
                  dragActive
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-muted-foreground/50",
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
                <Upload className="mb-4 size-10 text-muted-foreground" />
                <p className="mb-2 text-sm text-muted-foreground">
                  Drag & drop a file here, or click to browse
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Any file type supported — hash calculated entirely in browser
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
                <div className="flex items-center gap-2 p-3 rounded-lg border border-input bg-muted/30">
                  <FileText className="size-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{fileName}</p>
                    {fileSize !== null && (
                      <p className="text-[10px] text-muted-foreground">
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
                  className="cursor-pointer"
                  aria-label="Browse files"
                >
                  <FileUp className="size-3.5 mr-1" />
                  Browse Files
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearAll}
                  className="cursor-pointer"
                  aria-label="Clear file and result"
                >
                  <Trash2 className="size-3.5 mr-1" />
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── Loading State ────────────────────────────────────────────────── */}
      {isCalculating && (
        <Card>
          <CardContent className="py-6">
            <div className="flex items-center gap-3">
              <Skeleton className="size-4 rounded-full animate-spin" />
              <Skeleton className="h-4 w-75" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Hash Result ──────────────────────────────────────────────────── */}
      {hashResult && !isCalculating && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-2">
              <CardTitle>Hash Result</CardTitle>
              <Badge
                variant="secondary"
                className="text-[10px] py-0 px-1.5 font-mono"
              >
                SHA-256
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyHash}
              className="cursor-pointer"
              aria-label="Copy hash to clipboard"
            >
              <Copy className="size-3.5 mr-1" />
              Copy
            </Button>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-input bg-muted/30 p-4 font-mono text-sm break-all dark:bg-input/30">
              {hashResult}
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* ─── Comparison Mode ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="size-4" />
            Compare Hash
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Paste a reference SHA-256 hash to verify file or text integrity
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="compare-hash-input"
              className="text-xs font-semibold text-muted-foreground uppercase"
            >
              Reference Hash
            </label>
            <Input
              id="compare-hash-input"
              type="text"
              placeholder="Paste reference SHA-256 hash (64 hex characters)..."
              value={compareHash}
              onChange={(e) => setCompareHash(e.target.value)}
              className={cn(
                "font-mono text-sm",
                comparisonResult === "invalid" &&
                "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
              )}
              aria-label="Reference hash comparison input"
              aria-invalid={comparisonResult === "invalid"}
            />
          </div>

          {/* Invalid Hash Format Warning */}
          {comparisonResult === "invalid" && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-lg flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Invalid Hash Format</p>
                <p className="text-[11px] opacity-80">
                  SHA-256 hash must be exactly 64 hexadecimal characters (0-9,
                  a-f).
                </p>
              </div>
            </div>
          )}

          {/* Match Result */}
          {comparisonResult === "match" && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center gap-3 animate-in fade-in">
              <CheckCircle className="size-5 shrink-0" />
              <div>
                <p className="font-medium text-sm">Hash Matches!</p>
                <p className="text-xs opacity-80">
                  The generated hash matches the reference hash. File or text
                  integrity verified.
                </p>
              </div>
            </div>
          )}

          {/* Mismatch Result */}
          {comparisonResult === "mismatch" && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg flex items-center gap-3 animate-in fade-in">
              <XCircle className="size-5 shrink-0" />
              <div>
                <p className="font-medium text-sm">Hash Mismatch!</p>
                <p className="text-xs opacity-80">
                  The generated hash does NOT match the reference hash. The file
                  or text may be corrupted or tampered.
                </p>
              </div>
            </div>
          )}

          {/* No Comparison Yet */}
          {comparisonResult === "none" && hashResult && !compareHash.trim() && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <ShieldAlert className="size-4 shrink-0" />
              <span>Enter a reference hash above to compare.</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { cn } from "@/lib/utils";
import { useTools } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState, useCallback, useRef, type DragEvent } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Copy,
    Trash2,
    Upload,
    Download,
    ArrowLeftRight,
    FileUp,
    FileDown,
    Type,
    FileText,
    AlertCircle,
    CheckCircle2,
    Heart
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// ─── UTF‑8‑safe Base64 helpers ────────────────────────────────────────────────

function encodeBase64(text: string): string {
    const utf8 = new TextEncoder().encode(text);
    let binary = "";
    for (let i = 0; i < utf8.length; i++) {
        binary += String.fromCharCode(utf8[i]);
    }
    return btoa(binary);
}

function decodeBase64(b64: string): string {
    const binary = atob(b64); // throws on invalid input
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    const CHUNK = 8192;
    for (let offset = 0; offset < bytes.length; offset += CHUNK) {
        const slice = bytes.subarray(offset, offset + CHUNK);
        for (let i = 0; i < slice.length; i++) {
            binary += String.fromCharCode(slice[i]);
        }
    }
    return btoa(binary);
}

function base64ToBlob(b64: string, mime = "application/octet-stream"): Blob {
    const clean = b64.replace(/[\s\r\n]+/g, "");
    const binary = atob(clean);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: mime });
}

function copyToClipboard(text: string): Promise<void> {
    return navigator.clipboard.writeText(text);
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Mode = "encode-text" | "decode-text" | "encode-file" | "decode-file";

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

export function Base64Tool() {
    const [mode, setMode] = useState<Mode>("encode-text");
    const [input, setInput] = useState("");
    const [output, setOutput] = useState("");
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [fileName, setFileName] = useState<string | null>(null);
    const [fileSize, setFileSize] = useState<number>(0);
    const [fileB64, setFileB64] = useState<string>("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isTextMode = mode === "encode-text" || mode === "decode-text";
    const isEncoding = mode === "encode-text" || mode === "encode-file";

    const handleModeChange = useCallback((newMode: string) => {
        setMode(newMode as Mode);
        setInput("");
        setOutput("");
        setError(null);
        setFileName(null);
        setFileSize(0);
        setFileB64("");
        setCopied(false);
    }, []);

    const handleProcess = useCallback(() => {
        setError(null);
        setCopied(false);
        const trimmed = input.trim();
        if (!trimmed) {
            setError("Input is empty");
            return;
        }
        try {
            if (mode === "encode-text") {
                setOutput(encodeBase64(trimmed));
            } else if (mode === "decode-text") {
                setOutput(decodeBase64(trimmed));
            }
        } catch {
            setError(
                mode === "decode-text"
                    ? "Invalid Base64 string — cannot decode"
                    : "Encoding failed"
            );
            setOutput("");
        }
    }, [input, mode]);

    const handleSwap = useCallback(() => {
        setInput(output);
        setOutput(input);
        setError(null);
        setCopied(false);
    }, [input, output]);

    const handleCopy = useCallback(() => {
        const text = output || input;
        if (!text) return;
        copyToClipboard(text)
            .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
            })
            .catch(() => setError("Copy to clipboard failed"));
    }, [output, input]);

    const handleClear = useCallback(() => {
        setInput("");
        setOutput("");
        setError(null);
        setFileName(null);
        setFileSize(0);
        setFileB64("");
        setCopied(false);
    }, []);

    const processFile = useCallback(
        (file: File) => {
            if (file.size > MAX_FILE_SIZE) {
                setError(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max is 10 MB.`);
                return;
            }
            setFileName(file.name);
            setFileSize(file.size);
            setError(null);
            setCopied(false);

            const reader = new FileReader();
            reader.onerror = () => setError("Failed to read file");

            if (mode === "encode-file") {
                reader.onload = () => {
                    try {
                        const b64 = arrayBufferToBase64(reader.result as ArrayBuffer);
                        setOutput(b64);
                    } catch {
                        setError("Failed to encode file");
                    }
                };
                reader.readAsArrayBuffer(file);
            } else {
                reader.onload = () => {
                    try {
                        const raw = reader.result as string;
                        const clean = raw.replace(/[\s\r\n]+/g, "");
                        if (!/^[A-Za-z0-9+/]*={0,2}$/.test(clean)) {
                            throw new Error("Not valid Base64");
                        }
                        const binaryStr = atob(clean);
                        const bytes = new Uint8Array(binaryStr.length);
                        for (let i = 0; i < binaryStr.length; i++) {
                            bytes[i] = binaryStr.charCodeAt(i);
                        }
                        const decoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
                        setFileB64(clean);
                        setOutput(decoded);
                    } catch {
                        setError(
                            "File does not contain valid Base64 data. " +
                            "Make sure you are uploading a plain-text file containing a Base64 string."
                        );
                    }
                };
                reader.readAsText(file);
            }
        },
        [mode]
    );

    const handleFileSelect = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) processFile(file);
            e.target.value = "";
        },
        [processFile]
    );

    const handleDragEnter = useCallback((e: DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDragOver = useCallback((e: DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
    }, []);

    const handleDrop = useCallback(
        (e: DragEvent) => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) processFile(file);
        },
        [processFile]
    );

    const handleDownload = useCallback(() => {
        if (!output) return;
        const baseName = fileName?.replace(/\.[^/.]+$/, "") ?? "base64";

        if (mode === "decode-file" && fileB64) {
            const blob = base64ToBlob(fileB64);
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.style.display = "none";
            a.download = `${baseName}.decoded.bin`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            return;
        }

        const ext = mode === "encode-text" || mode === "encode-file" ? ".b64.txt" : ".decoded.txt";
        const blob = new Blob([output], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.style.display = "none";
        a.download = `${baseName}${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, [output, mode, fileName, fileB64]);

    const isEmpty = !input.trim() && !output;

    return (
        <div className="card-premium p-6 md:p-8 space-y-8 animate-slide-up max-w-6xl mx-auto">
            {/* Header Section */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Base64 Encoder / Decoder</h1>
                    <p className="text-sm text-muted-foreground mt-1">Encode and decode text or files to/from Base64 format safely.</p>
                </div>
                <FavoriteButton toolId="base64-tool" />
            </div>

            {/* Inner Wrapper / Controls */}
            <div className="rounded-2xl border border-border/40 bg-muted/30 p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Mode selector */}
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Mode
                        </span>
                        <Tabs value={mode} onValueChange={handleModeChange} className="w-auto">
                            <TabsList className="bg-muted p-1 rounded-xl h-9">
                                <TabsTrigger value="encode-text" className="text-xs rounded-lg px-3 h-7 cursor-pointer gap-1.5 transition-all">
                                    <Type className="h-3.5 w-3.5" />
                                    Encode Text
                                </TabsTrigger>
                                <TabsTrigger value="decode-text" className="text-xs rounded-lg px-3 h-7 cursor-pointer gap-1.5 transition-all">
                                    <Type className="h-3.5 w-3.5" />
                                    Decode Text
                                </TabsTrigger>
                                <TabsTrigger value="encode-file" className="text-xs rounded-lg px-3 h-7 cursor-pointer gap-1.5 transition-all">
                                    <FileUp className="h-3.5 w-3.5" />
                                    Encode File
                                </TabsTrigger>
                                <TabsTrigger value="decode-file" className="text-xs rounded-lg px-3 h-7 cursor-pointer gap-1.5 transition-all">
                                    <FileDown className="h-3.5 w-3.5" />
                                    Decode File
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {isTextMode && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-9 rounded-xl text-xs gap-1.5 cursor-pointer hover:bg-muted/80 active:scale-95 transition-all"
                                disabled={!input && !output}
                                onClick={handleSwap}
                                aria-label="Swap input and output"
                            >
                                <ArrowLeftRight className="h-3.5 w-3.5" />
                                Swap
                            </Button>
                        )}

                        {!isTextMode && (
                            <>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="*/*"
                                    className="hidden"
                                    onChange={handleFileSelect}
                                    id="base64-file-upload"
                                />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-9 rounded-xl text-xs gap-1.5 cursor-pointer hover:bg-muted/80 active:scale-95 transition-all"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Upload className="h-3.5 w-3.5" />
                                    Upload
                                </Button>
                            </>
                        )}

                        <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                                "h-9 rounded-xl text-xs gap-1.5 cursor-pointer transition-all active:scale-95",
                                copied && "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20"
                            )}
                            disabled={!output && !input}
                            onClick={handleCopy}
                        >
                            <Copy className="h-3.5 w-3.5" />
                            {copied ? "Copied!" : "Copy"}
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            className="h-9 rounded-xl text-xs gap-1.5 cursor-pointer hover:bg-muted/80 active:scale-95 transition-all"
                            disabled={!output}
                            onClick={handleDownload}
                        >
                            <Download className="h-3.5 w-3.5" />
                            Download
                        </Button>

                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 rounded-xl text-xs gap-1.5 cursor-pointer text-muted-foreground hover:text-destructive active:scale-95 transition-all"
                            disabled={isEmpty}
                            onClick={handleClear}
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            Clear
                        </Button>
                    </div>
                </div>
            </div>

            {/* Status / Error Banner */}
            {error && (
                <div className="flex items-start gap-3 px-4 py-3 rounded-xl border text-sm transition-all bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/50">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-red-600 dark:text-red-400" />
                    <span className="font-semibold">{error}</span>
                </div>
            )}

            {output && !error && (
                <div className="flex items-start gap-3 px-4 py-3 rounded-xl border text-sm transition-all bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span className="font-semibold">
                        {isEncoding ? "Successfully encoded" : "Successfully decoded"}
                        {fileName && (
                            <>
                                {" "}—{" "}
                                <span className="font-mono text-xs">
                                    {fileName} ({(fileSize / 1024).toFixed(1)} KB)
                                </span>
                            </>
                        )}
                    </span>
                </div>
            )}

            {/* Main Content Areas */}
            {isTextMode ? (
                /* Text mode: split editor */
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Input */}
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-2">
                                <Type className="h-4 w-4 text-muted-foreground" />
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    {isEncoding ? "Plain Text" : "Base64 Input"}
                                </span>
                            </div>
                            <span className="text-xs text-muted-foreground font-mono">
                                {input.length} chars
                            </span>
                        </div>
                        <div className="relative rounded-xl border border-border focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/20 transition-all overflow-hidden bg-card">
                            <Textarea
                                id="base64-input"
                                value={input}
                                onChange={(e) => {
                                    setInput(e.target.value);
                                    setError(null);
                                }}
                                placeholder={
                                    isEncoding
                                        ? "Paste text to encode…\n\nSupports Unicode & emoji 🎉"
                                        : "Paste Base64 string to decode…"
                                }
                                className="min-h-60 resize-none border-0 font-mono text-sm leading-relaxed bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none p-4"
                                spellCheck={false}
                            />
                        </div>
                        <Button
                            variant="default"
                            size="sm"
                            className="w-full sm:w-auto h-10 rounded-full text-xs font-semibold cursor-pointer active:scale-95 transition-all mt-1"
                            disabled={!input.trim()}
                            onClick={handleProcess}
                        >
                            {isEncoding ? "Encode Text" : "Decode Text"}
                        </Button>
                    </div>

                    {/* Output */}
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    {isEncoding ? "Base64 Output" : "Decoded Text"}
                                </span>
                            </div>
                            {output && (
                                <span className="text-xs text-muted-foreground font-mono">
                                    {output.length} chars
                                </span>
                            )}
                        </div>
                        <div className="relative rounded-xl border border-border bg-muted/30 overflow-hidden h-64">
                            {output ? (
                                <pre className="p-4 text-sm font-mono leading-relaxed overflow-auto h-full text-foreground whitespace-pre-wrap break-all">
                                    {output}
                                </pre>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-6">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted border border-border/50">
                                        <FileText className="h-6 w-6 text-muted-foreground" />
                                    </div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        No Output
                                    </p>
                                    <p className="text-xs text-muted-foreground/60 max-w-50">
                                        Type content and click {isEncoding ? "Encode Text" : "Decode Text"}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                /* File mode: drag‑and‑drop zone */
                <div className="flex flex-col gap-6">
                    <div
                        className={cn(
                            "relative rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer overflow-hidden",
                            isDragging
                                ? "border-primary bg-primary/5 scale-[1.005]"
                                : "border-border hover:border-primary/40 hover:bg-muted/20"
                        )}
                        onDragEnter={handleDragEnter}
                        onDragLeave={handleDragLeave}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                fileInputRef.current?.click();
                            }
                        }}
                        role="button"
                        tabIndex={0}
                        aria-label={
                            mode === "encode-file"
                                ? "Drop a file to encode as Base64"
                                : "Drop a Base64 file to decode"
                        }
                    >
                        <div className="flex flex-col items-center justify-center py-16 gap-4">
                            <div
                                className={cn(
                                    "flex h-16 w-16 items-center justify-center rounded-2xl transition-all duration-200 shadow-sm",
                                    isDragging
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted text-muted-foreground"
                                )}
                            >
                                <Upload className="h-6 w-6" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-semibold text-foreground">
                                    {isDragging ? "Drop it here!" : "Drag & drop a file here"}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    or click to browse local files · Max limit 10 MB
                                </p>
                            </div>
                            {fileName && (
                                <Badge className="gap-1.5 bg-primary/10 text-primary border-primary/20 font-mono text-xs px-2.5 py-0.5 rounded-full">
                                    {fileName} ({(fileSize / 1024).toFixed(1)} KB)
                                </Badge>
                            )}
                        </div>
                    </div>

                    {/* File output */}
                    {output && (
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between px-1">
                                <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        {isEncoding ? "Base64 Output" : "Decoded File Contents"}
                                    </span>
                                </div>
                                {isEncoding && (
                                    <span className="text-xs text-muted-foreground font-mono">
                                        {output.length} chars
                                    </span>
                                )}
                            </div>
                            <div className="relative rounded-xl border border-border bg-muted/30 overflow-hidden h-60">
                                <pre className="p-4 text-sm font-mono leading-relaxed overflow-auto h-full text-foreground whitespace-pre-wrap break-all">
                                    {output}
                                </pre>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Quick Stats Grid */}
            {(input || output) && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                    <div className="flex flex-col gap-0.5 p-4 rounded-xl border border-border/50 bg-card/60 text-center shadow-sm">
                        <span className="text-lg font-bold text-foreground font-mono tabular-nums">
                            {input.length}
                        </span>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Input Chars
                        </span>
                    </div>
                    <div className="flex flex-col gap-0.5 p-4 rounded-xl border border-border/50 bg-card/60 text-center shadow-sm">
                        <span className="text-lg font-bold text-foreground font-mono tabular-nums">
                            {output.length}
                        </span>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Output Chars
                        </span>
                    </div>
                    <div className="flex flex-col gap-0.5 p-4 rounded-xl border border-border/50 bg-card/60 text-center shadow-sm">
                        <span className="text-lg font-bold text-foreground font-mono tabular-nums">
                            {input ? (new TextEncoder().encode(input).length / 1024).toFixed(1) : "0.0"}
                        </span>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Input Size (KB)
                        </span>
                    </div>
                    <div className="flex flex-col gap-0.5 p-4 rounded-xl border border-border/50 bg-card/60 text-center shadow-sm">
                        <span className="text-lg font-bold text-foreground font-mono tabular-nums">
                            {output
                                ? isEncoding
                                    ? ((output.length / 4) * 3 / 1024).toFixed(1)
                                    : (new TextEncoder().encode(output).length / 1024).toFixed(1)
                                : "0.0"}
                        </span>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {isEncoding ? "Decoded Size (KB)" : "Output Size (KB)"}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}

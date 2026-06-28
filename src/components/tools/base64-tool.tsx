"use client";

import { cn } from "@/lib/utils";
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
    // Process in chunks to avoid call‑stack overflow on large files
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
    // Strip all whitespace (spaces, newlines, carriage returns) before decoding.
    // Many Base64 files wrap lines every 76 chars — atob() throws on any whitespace.
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
    // Stores the cleaned Base64 string when in decode-file mode so handleDownload
    // can reconstruct the binary blob even after the output panel shows decoded text.
    const [fileB64, setFileB64] = useState<string>("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isTextMode = mode === "encode-text" || mode === "decode-text";
    const isEncoding = mode === "encode-text" || mode === "encode-file";

    // ── Reset state on mode change ──────────────────────────────────────────

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

    // ── Text encode / decode ────────────────────────────────────────────────

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

    // ── Swap input ↔ output ─────────────────────────────────────────────────

    const handleSwap = useCallback(() => {
        setInput(output);
        setOutput(input);
        setError(null);
        setCopied(false);
    }, [input, output]);

    // ── Copy to clipboard ───────────────────────────────────────────────────

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

    // ── Clear ───────────────────────────────────────────────────────────────

    const handleClear = useCallback(() => {
        setInput("");
        setOutput("");
        setError(null);
        setFileName(null);
        setFileSize(0);
        setFileB64("");
        setCopied(false);
    }, []);

    // ── File helpers ────────────────────────────────────────────────────────

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
                // decode-file: read the file (a .txt containing Base64) as text,
                // strip whitespace, decode bytes, then display as UTF-8 text in the
                // output panel — exactly mirroring the encode-file output style.
                reader.onload = () => {
                    try {
                        const raw = reader.result as string;
                        // Strip all whitespace so atob() doesn't throw on wrapped lines
                        const clean = raw.replace(/[\s\r\n]+/g, "");
                        // Validate it's actual Base64
                        if (!/^[A-Za-z0-9+/]*={0,2}$/.test(clean)) {
                            throw new Error("Not valid Base64");
                        }
                        // Decode bytes
                        const binaryStr = atob(clean);
                        const bytes = new Uint8Array(binaryStr.length);
                        for (let i = 0; i < binaryStr.length; i++) {
                            bytes[i] = binaryStr.charCodeAt(i);
                        }
                        // Decode as UTF-8 text for display
                        const decoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
                        // Store clean Base64 so Download can reconstruct the binary blob
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
            e.target.value = ""; // reset so same file can be re-selected
        },
        [processFile]
    );

    // ── Drag & drop ─────────────────────────────────────────────────────────

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

    // ── Download output as file ─────────────────────────────────────────────

    const handleDownload = useCallback(() => {
        if (!output) return;
        const baseName = fileName?.replace(/\.[^/.]+$/, "") ?? "base64";

        if (mode === "decode-file" && fileB64) {
            // Reconstruct the binary blob from the stored Base64 and download it
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

        // encode-text / encode-file / decode-text — download as plain text
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


    // ── Render ────────────────────────────────────────────────────────────────

    const isEmpty = !input.trim() && !output;

    return (
        <div className="flex flex-col gap-5 animate-in fade-in duration-300">
            {/* ── Toolbar ─────────────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border bg-card shadow-sm">
                {/* Mode selector */}
                <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0">
                        Mode
                    </span>
                    <Tabs value={mode} onValueChange={handleModeChange}>
                        <TabsList className="h-8">
                            <TabsTrigger value="encode-text" className="text-xs px-2.5 h-7 cursor-pointer gap-1">
                                <Type className="h-3 w-3" />
                                Encode Text
                            </TabsTrigger>
                            <TabsTrigger value="decode-text" className="text-xs px-2.5 h-7 cursor-pointer gap-1">
                                <Type className="h-3 w-3" />
                                Decode Text
                            </TabsTrigger>
                            <TabsTrigger value="encode-file" className="text-xs px-2.5 h-7 cursor-pointer gap-1">
                                <FileUp className="h-3 w-3" />
                                Encode File
                            </TabsTrigger>
                            <TabsTrigger value="decode-file" className="text-xs px-2.5 h-7 cursor-pointer gap-1">
                                <FileDown className="h-3 w-3" />
                                Decode File
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Swap – text modes only */}
                    {isTextMode && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs gap-1.5 cursor-pointer"
                            disabled={!input && !output}
                            onClick={handleSwap}
                            aria-label="Swap input and output"
                        >
                            <ArrowLeftRight className="h-3.5 w-3.5" />
                            Swap
                        </Button>
                    )}

                    {/* File upload – file modes */}
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
                                className="h-8 text-xs gap-1.5 cursor-pointer"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Upload className="h-3.5 w-3.5" />
                                Upload
                            </Button>
                        </>
                    )}

                    {/* Copy */}
                    <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                            "h-8 text-xs gap-1.5 cursor-pointer transition-colors",
                            copied && "border-emerald-500 text-emerald-600"
                        )}
                        disabled={!output && !input}
                        onClick={handleCopy}
                    >
                        <Copy className="h-3.5 w-3.5" />
                        {copied ? "Copied!" : "Copy"}
                    </Button>

                    {/* Download */}
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1.5 cursor-pointer"
                        disabled={!output}
                        onClick={handleDownload}
                    >
                        <Download className="h-3.5 w-3.5" />
                        Download
                    </Button>

                    {/* Clear */}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs gap-1.5 cursor-pointer text-muted-foreground hover:text-destructive"
                        disabled={isEmpty}
                        onClick={handleClear}
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                        Clear
                    </Button>
                </div>
            </div>

            {/* ── Status / Error Banner ────────────────────────────────────────── */}
            {error && (
                <div className="flex items-start gap-3 px-4 py-3 rounded-lg border text-sm transition-all bg-destructive/8 border-destructive/25 text-destructive">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span className="font-medium">{error}</span>
                </div>
            )}

            {output && !error && (
                <div className="flex items-start gap-3 px-4 py-3 rounded-lg border text-sm transition-all bg-emerald-500/8 border-emerald-500/25 text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                    <span className="font-medium">
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

            {/* ── Main Content ─────────────────────────────────────────────────── */}
            {isTextMode ? (
                /* ── Text mode: split editor ───────────────────────────────────── */
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Input */}
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-2">
                                <Type className="h-4 w-4 text-muted-foreground" />
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    {isEncoding ? "Plain Text" : "Base64 Input"}
                                </span>
                            </div>
                            <span className="text-[10px] text-muted-foreground font-mono">
                                {input.length} chars
                            </span>
                        </div>
                        <div className="relative rounded-lg border border-border focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/20 transition-colors overflow-hidden">
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
                                className="min-h-52 resize-none border-0 font-mono text-sm leading-relaxed bg-card focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none p-4"
                                spellCheck={false}
                            />
                        </div>
                        <Button
                            variant="default"
                            size="sm"
                            className="w-full sm:w-auto h-9 text-xs gap-1.5 cursor-pointer"
                            disabled={!input.trim()}
                            onClick={handleProcess}
                        >
                            {isEncoding ? "Encode →" : "Decode →"}
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
                                <span className="text-[10px] text-muted-foreground font-mono">
                                    {output.length} chars
                                </span>
                            )}
                        </div>
                        <div className="relative rounded-lg border border-border overflow-hidden bg-muted/30 max-h-112">
                            {output ? (
                                <pre className="p-4 text-sm font-mono leading-relaxed overflow-auto h-full max-h-112 text-foreground whitespace-pre-wrap break-all">
                                    {output}
                                </pre>
                            ) : (
                                <div className="flex flex-col items-center justify-center min-h-52 gap-3 text-center p-8">
                                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted border border-border/50">
                                        <FileText className="h-7 w-7 text-muted-foreground" />
                                    </div>
                                    <p className="text-sm font-medium text-muted-foreground">
                                        {isEncoding
                                            ? "Encoded output will appear here"
                                            : "Decoded output will appear here"}
                                    </p>
                                    <p className="text-xs text-muted-foreground/60">
                                        Type or paste content and click {isEncoding ? "Encode" : "Decode"}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                /* ── File mode: drag‑and‑drop zone ─────────────────────────────── */
                <div className="flex flex-col gap-4">
                    <div
                        className={cn(
                            "relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer",
                            isDragging
                                ? "border-primary bg-primary/5 scale-[1.01]"
                                : "border-border hover:border-primary/40 hover:bg-muted/30"
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
                                    "flex h-16 w-16 items-center justify-center rounded-2xl transition-colors",
                                    isDragging
                                        ? "bg-primary/10 text-primary"
                                        : "bg-muted text-muted-foreground"
                                )}
                            >
                                <Upload className="h-8 w-8" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-medium text-foreground">
                                    {isDragging
                                        ? "Drop it here!"
                                        : "Drag & drop a file here"}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    or click to browse · Max 10 MB
                                </p>
                            </div>
                            {fileName && (
                                <Badge className="gap-1.5 bg-primary/10 text-primary border-primary/30 font-mono text-xs">
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
                                        {isEncoding ? "Base64 Output" : "Status"}
                                    </span>
                                </div>
                                {isEncoding && (
                                    <span className="text-[10px] text-muted-foreground font-mono">
                                        {output.length} chars
                                    </span>
                                )}
                            </div>
                            <div className="relative rounded-lg border border-border overflow-hidden bg-muted/30 max-h-80">
                                <pre className="p-4 text-sm font-mono leading-relaxed overflow-auto h-full max-h-80 text-foreground whitespace-pre-wrap break-all">
                                    {output}
                                </pre>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Quick Stats ──────────────────────────────────────────────────── */}
            {(input || output) && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="flex flex-col gap-0.5 px-4 py-3 rounded-lg border border-border bg-card text-center">
                        <span className="text-lg font-bold text-foreground font-mono">
                            {input.length}
                        </span>
                        <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">
                            Input Chars
                        </span>
                    </div>
                    <div className="flex flex-col gap-0.5 px-4 py-3 rounded-lg border border-border bg-card text-center">
                        <span className="text-lg font-bold text-foreground font-mono">
                            {output.length}
                        </span>
                        <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">
                            Output Chars
                        </span>
                    </div>
                    <div className="flex flex-col gap-0.5 px-4 py-3 rounded-lg border border-border bg-card text-center">
                        <span className="text-lg font-bold text-foreground font-mono">
                            {input ? (new TextEncoder().encode(input).length / 1024).toFixed(1) : "0"}
                        </span>
                        <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">
                            Input KB
                        </span>
                    </div>
                    <div className="flex flex-col gap-0.5 px-4 py-3 rounded-lg border border-border bg-card text-center">
                        <span className="text-lg font-bold text-foreground font-mono">
                            {output
                                ? isEncoding
                                    ? ((output.length / 4) * 3 / 1024).toFixed(1)
                                    : (new TextEncoder().encode(output).length / 1024).toFixed(1)
                                : "0"}
                        </span>
                        <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">
                            {isEncoding ? "Decoded KB" : "Output KB"}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}


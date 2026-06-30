"use client";

import { cn } from "@/lib/utils";
import { useTools } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { IndentMode } from "@/lib/json-engine.types";
import React, { useState, useCallback, useRef } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    CheckCircle2,
    XCircle,
    Copy,
    Trash2,
    Upload,
    Download,
    WrapText,
    Minimize2,
    ChevronRight,
    FileJson,
    AlertCircle,
    Wrench,
    Heart
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LintError {
    message: string;
    line: number | null;
    col: number | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseJson(raw: string): { value: unknown; error: LintError | null } {
    try {
        const value = JSON.parse(raw);
        return { value, error: null };
    } catch (e) {
        const msg = (e as SyntaxError).message;
        const posMatch = msg.match(/position (\d+)/);
        let line: number | null = null;
        let col: number | null = null;
        if (posMatch) {
            const pos = parseInt(posMatch[1], 10);
            const before = raw.slice(0, pos);
            const lines = before.split("\n");
            line = lines.length;
            col = (lines[lines.length - 1]?.length ?? 0) + 1;
        }
        return { value: undefined, error: { message: msg, line, col } };
    }
}

function formatJson(value: unknown, mode: IndentMode): string {
    if (mode === "minify") return JSON.stringify(value);
    const indent = mode === "tab" ? "\t" : parseInt(mode, 10);
    return JSON.stringify(value, null, indent);
}

function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).catch(() => { });
}

// ─── JSON Repair ─────────────────────────────────────────────────────────────

function repairJson(raw: string): { fixed: string; success: boolean } {
    let s = raw.trim();

    // Remove single-line JS comments
    s = s.replace(/\/\/[^\n\r]*/g, "");

    // Remove block JS comments
    s = s.replace(/\/\*[\s\S]*?\*\//g, "");

    // Replace JS-only literals
    s = s.replace(/\bundefined\b/g, "null");
    s = s.replace(/\bNaN\b/g, "null");
    s = s.replace(/-?Infinity\b/g, "null");

    // Remove trailing commas
    let prev = "";
    while (prev !== s) {
        prev = s;
        s = s.replace(/,(\s*[}\]])/g, "$1");
    }

    // Convert single-quoted strings
    s = s.replace(/'(?:[^'\\]|\\.)*'/g, (match) => {
        const inner = match
            .slice(1, -1)
            .replace(/\\'/g, "\u0001")
            .replace(/"/g, '\\"')
            .replace(/\u0001/g, "'");
        return `"${inner}"`;
    });

    // Quote unquoted object keys
    s = s.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)(\s*):/g, '$1"$2"$3:');

    // Quote unquoted string values
    s = s.replace(
        /:\s*([a-zA-Z][a-zA-Z0-9_\-]*)(\s*[,}\]\n])/g,
        (_match, val, end) => {
            const v = val.trim();
            if (/^(true|false|null)$/i.test(v)) return `: ${v.toLowerCase()}${end}`;
            if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(v)) return `: ${v}${end}`;
            return `: "${v}"${end}`;
        }
    );

    // Add missing commas
    s = s.replace(/([^\s\{\[\],])([\s]*\n[\s]*)(?=["\{\[]|[a-zA-Z_$])/g, "$1,$2");

    s = s.replace(/\bTrue\b/g, "true");
    s = s.replace(/\bFalse\b/g, "false");

    try {
        const parsed = JSON.parse(s);
        return { fixed: JSON.stringify(parsed, null, 2), success: true };
    } catch {
        return { fixed: s, success: false };
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

export function JsonFormatter() {
    const [input, setInput] = useState("");
    const [indentMode, setIndentMode] = useState<IndentMode>("2");
    const [copied, setCopied] = useState(false);
    const [fixFailed, setFixFailed] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const trimmed = input.trim();
    const isEmpty = trimmed === "";

    const { value: parsed, error: lintError } = isEmpty
        ? { value: undefined, error: null }
        : parseJson(trimmed);

    const isValid = !isEmpty && lintError === null;
    const output = isValid ? formatJson(parsed, indentMode) : "";

    const handleFormat = useCallback(() => {
        if (!isValid) return;
        setInput(formatJson(parsed, indentMode));
    }, [isValid, parsed, indentMode]);

    const handleCopy = useCallback(() => {
        const text = output || input;
        if (!text) return;
        copyToClipboard(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    }, [output, input]);

    const handleClear = useCallback(() => {
        setInput("");
        setFixFailed(false);
    }, []);

    const handleFix = useCallback(() => {
        const { fixed, success } = repairJson(input);
        setInput(fixed);
        setFixFailed(!success);
        if (!success) setTimeout(() => setFixFailed(false), 3000);
    }, [input]);

    const handleDownload = useCallback(() => {
        if (!isValid) return;
        const blob = new Blob([output], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "formatted.json";
        a.click();
        URL.revokeObjectURL(url);
    }, [isValid, output]);

    const handleUpload = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                setInput((ev.target?.result as string) ?? "");
            };
            reader.readAsText(file);
            e.target.value = "";
        },
        []
    );

    const statusBadge = () => {
        if (isEmpty) return null;
        if (isValid) {
            return (
                <Badge className="gap-1.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50 font-semibold rounded-full px-2.5 py-0.5 text-[10px]">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                    Valid JSON
                </Badge>
            );
        }
        return (
            <Badge className="gap-1.5 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-200 dark:border-red-900/50 font-semibold rounded-full px-2.5 py-0.5 text-[10px]">
                <XCircle className="h-3 w-3 text-red-600 dark:text-red-400" />
                Invalid JSON
            </Badge>
        );
    };

    return (
        <div className="card-premium p-6 md:p-8 space-y-8 animate-slide-up max-w-6xl mx-auto">
            {/* Header Section */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">JSON Formatter & Validator</h1>
                    <p className="text-sm text-muted-foreground mt-1">Format, validate, repair and minify JSON code details instantly.</p>
                </div>
                <FavoriteButton toolId="json-formatter" />
            </div>

            {/* Inner Wrapper / Controls */}
            <div className="rounded-2xl border border-border/40 bg-muted/30 p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Left: Indent selector */}
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Indent
                        </span>
                        <Tabs
                            value={indentMode}
                            onValueChange={(v) => setIndentMode(v as IndentMode)}
                            className="w-auto"
                        >
                            <TabsList className="bg-muted p-1 rounded-xl h-9">
                                <TabsTrigger value="2" className="text-xs rounded-lg px-3 h-7 cursor-pointer transition-all">
                                    2 Spaces
                                </TabsTrigger>
                                <TabsTrigger value="4" className="text-xs rounded-lg px-3 h-7 cursor-pointer transition-all">
                                    4 Spaces
                                </TabsTrigger>
                                <TabsTrigger value="tab" className="text-xs rounded-lg px-3 h-7 cursor-pointer transition-all">
                                    Tab
                                </TabsTrigger>
                                <TabsTrigger value="minify" className="text-xs rounded-lg px-3 h-7 cursor-pointer gap-1.5 transition-all">
                                    <Minimize2 className="h-3.5 w-3.5" />
                                    Minify
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>

                    {/* Right: Action buttons */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json,application/json,text/plain"
                            className="hidden"
                            onChange={handleUpload}
                            id="json-file-upload"
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

                        {!isEmpty && !isValid && (
                            <Button
                                variant="outline"
                                size="sm"
                                className={cn(
                                    "h-9 rounded-xl text-xs gap-1.5 cursor-pointer transition-all active:scale-95",
                                    fixFailed
                                        ? "border-red-500 text-red-600 bg-red-50 dark:bg-red-950/20"
                                        : "border-amber-500/60 text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-500/10"
                                )}
                                onClick={handleFix}
                            >
                                <Wrench className="h-3.5 w-3.5" />
                                {fixFailed ? "Can't Fix" : "Fix JSON"}
                            </Button>
                        )}

                        <Button
                            variant="outline"
                            size="sm"
                            className="h-9 rounded-xl text-xs gap-1.5 cursor-pointer hover:bg-muted/80 active:scale-95 transition-all"
                            disabled={!isValid}
                            onClick={handleFormat}
                        >
                            <WrapText className="h-3.5 w-3.5" />
                            Format
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                                "h-9 rounded-xl text-xs gap-1.5 cursor-pointer transition-all active:scale-95",
                                copied && "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20"
                            )}
                            disabled={isEmpty}
                            onClick={handleCopy}
                        >
                            <Copy className="h-3.5 w-3.5" />
                            {copied ? "Copied!" : "Copy"}
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            className="h-9 rounded-xl text-xs gap-1.5 cursor-pointer hover:bg-muted/80 active:scale-95 transition-all"
                            disabled={!isValid}
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
            {!isEmpty && (
                <div
                    className={cn(
                        "flex items-start justify-between gap-3 px-4 py-3 rounded-xl border text-sm transition-all",
                        isValid
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50"
                            : "bg-red-50 border-red-200 text-red-700 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/50"
                    )}
                >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                        {isValid ? (
                            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-red-600 dark:text-red-400" />
                        )}
                        <div className="flex-1 min-w-0">
                            {isValid ? (
                                <span className="font-semibold text-xs md:text-sm">
                                    JSON syntax is valid and successfully structured.
                                </span>
                            ) : (
                                <div className="space-y-1">
                                    <span className="font-bold text-xs md:text-sm">Syntax Error</span>
                                    <p className="text-xs font-mono break-all leading-relaxed opacity-95">
                                        {lintError?.message}
                                    </p>
                                    {lintError && lintError.line !== null && (
                                        <div className="flex items-center gap-2 mt-1.5">
                                            <Badge
                                                variant="outline"
                                                className="text-[10px] font-semibold px-2 py-0 border-red-300 text-red-700 bg-red-100/30 rounded-full font-mono"
                                            >
                                                Line {lintError.line}
                                            </Badge>
                                            {lintError.col !== null && (
                                                <Badge
                                                    variant="outline"
                                                    className="text-[10px] font-semibold px-2 py-0 border-red-300 text-red-700 bg-red-100/30 rounded-full font-mono"
                                                >
                                                    Col {lintError.col}
                                                </Badge>
                                            )}
                                        </div>
                                    )}
                                    {fixFailed ? (
                                        <p className="text-xs opacity-90 mt-1">
                                            Auto-repair could not resolve this parsing issue. Check bracket balancing and keys manually.
                                        </p>
                                    ) : (
                                        <p className="text-[11px] opacity-80 mt-1">
                                            Tip: Click <strong>Fix JSON</strong> to repair single quotes, trailing commas, unquoted keys, or comments.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="shrink-0">{statusBadge()}</div>
                </div>
            )}

            {/* Split Editor Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Input */}
                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                            <FileJson className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Input JSON
                            </span>
                        </div>
                        <span className="text-xs text-muted-foreground font-mono">
                            {input.length} chars
                        </span>
                    </div>
                    <div
                        className={cn(
                            "relative rounded-xl border transition-all overflow-hidden bg-card",
                            !isEmpty && lintError
                                ? "border-red-300 ring-1 ring-red-100 dark:border-red-900/50 dark:ring-red-950/20"
                                : "border-border focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/20"
                        )}
                    >
                        <Textarea
                            id="json-input"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={`Paste your JSON here...\n\nExample:\n{\n  "name": "DevToolbox",\n  "version": 1,\n  "active": true\n}`}
                            className="min-h-95 resize-none border-0 font-mono text-sm leading-relaxed bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none p-4"
                            spellCheck={false}
                        />
                    </div>
                </div>

                {/* Output */}
                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Formatted Output
                            </span>
                        </div>
                        {output && (
                            <span className="text-xs text-muted-foreground font-mono">
                                {output.split("\n").length} lines
                            </span>
                        )}
                    </div>
                    <div className="relative rounded-xl border border-border bg-muted/30 overflow-hidden h-95.5">
                        {output ? (
                            <pre className="p-4 text-sm font-mono leading-relaxed overflow-auto h-full text-foreground whitespace-pre-wrap break-all">
                                <SyntaxHighlight json={output} />
                            </pre>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-6">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted border border-border/50">
                                    <FileJson className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    No Formatted Output
                                </p>
                                <p className="text-xs text-muted-foreground/60 max-w-60">
                                    {isEmpty
                                        ? "Paste or upload JSON contents to visualize output"
                                        : "Fix the syntax errors above to display formatted data"}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            {isValid && parsed !== undefined && (
                <div className="space-y-4 pt-2">
                    <div className="border-t border-border/60 pt-4">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                            Structure Statistics
                        </h3>
                        <JsonStats value={parsed} />
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Syntax Highlighter ───────────────────────────────────────────────────────

function SyntaxHighlight({ json }: { json: string }) {
    const TOKEN_RE =
        /("(?:\\.|[^"\\])*")\s*(:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|(\btrue\b|\bfalse\b|\bnull\b)|([{}[\],])/g;

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    TOKEN_RE.lastIndex = 0;

    while ((match = TOKEN_RE.exec(json)) !== null) {
        if (match.index > lastIndex) {
            parts.push(json.slice(lastIndex, match.index));
        }

        const [full, str, colon, num, keyword, punctuation] = match;

        if (str !== undefined) {
            if (colon !== undefined) {
                parts.push(
                    <span key={match.index} className="text-sky-600 dark:text-sky-400 font-semibold">
                        {str}
                    </span>,
                    <span key={`${match.index}-colon`} className="text-muted-foreground font-medium">
                        :
                    </span>
                );
            } else {
                parts.push(
                    <span key={match.index} className="text-amber-600 dark:text-amber-400">
                        {str}
                    </span>
                );
            }
        } else if (num !== undefined) {
            parts.push(
                <span key={match.index} className="text-violet-600 dark:text-violet-400 font-mono">
                    {num}
                </span>
            );
        } else if (keyword !== undefined) {
            parts.push(
                <span key={match.index} className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    {keyword}
                </span>
            );
        } else if (punctuation !== undefined) {
            parts.push(
                <span key={match.index} className="text-muted-foreground/80 font-medium">
                    {punctuation}
                </span>
            );
        } else {
            parts.push(full);
        }

        lastIndex = match.index + full.length;
    }

    if (lastIndex < json.length) {
        parts.push(json.slice(lastIndex));
    }

    return <>{parts}</>;
}

// ─── Quick Stats Helpers ─────────────────────────────────────────────────────

function countKeys(val: unknown): number {
    if (val === null || typeof val !== "object") return 0;
    if (Array.isArray(val)) return val.reduce((s, v) => s + countKeys(v), 0);
    const obj = val as Record<string, unknown>;
    return (
        Object.keys(obj).length +
        Object.values(obj).reduce<number>((s, v) => s + countKeys(v), 0)
    );
}

// Fixed getDepth helper to prevent stack overflow on infinite loops, and handle numbers safely
function getDepth(val: unknown): number {
    if (val === null || typeof val !== "object") return 0;
    if (Array.isArray(val)) {
        return val.length === 0 ? 1 : 1 + Math.max(...val.map(getDepth));
    }
    const values = Object.values(val as Record<string, unknown>);
    return values.length === 0 ? 1 : 1 + Math.max(...values.map(getDepth));
}

function JsonStats({ value }: { value: unknown }) {
    const isArray = Array.isArray(value);
    const isObject = value !== null && typeof value === "object" && !isArray;

    const stats = [
        {
            label: "JSON Type",
            val: isArray ? "Array" : isObject ? "Object" : typeof value,
        },
        ...(isArray ? [{ label: "Items Count", val: String((value as unknown[]).length) }] : []),
        ...(isObject
            ? [{ label: "Root Keys", val: String(Object.keys(value as object).length) }]
            : []),
        { label: "Total Keys", val: String(countKeys(value)) },
        { label: "Max Depth", val: String(getDepth(value)) },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((s) => (
                <div
                    key={s.label}
                    className="flex flex-col gap-0.5 p-4 rounded-xl border border-border bg-card/50 text-center shadow-sm"
                >
                    <span className="text-base font-bold text-foreground font-mono tabular-nums">
                        {s.val}
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-1">
                        {s.label}
                    </span>
                </div>
            ))}
        </div>
    );
}

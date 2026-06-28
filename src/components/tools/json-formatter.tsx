"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { IndentMode } from "@/lib/json-engine.types";
import { useState, useCallback, useRef } from "react";
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
        // Try to extract line/col from the error message (V8 engines expose position)
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
// Attempts to fix the most common real-world JSON mistakes so users can recover
// from minor formatting errors without rewriting their input.

function repairJson(raw: string): { fixed: string; success: boolean } {
    let s = raw.trim();

    // ── Pass 1: strip non-JSON syntax ──────────────────────────────────────

    // Remove single-line JS comments  // ...
    s = s.replace(/\/\/[^\n\r]*/g, "");

    // Remove block JS comments  /* ... */
    s = s.replace(/\/\*[\s\S]*?\*\//g, "");

    // Replace JS-only literals that have no JSON equivalent
    s = s.replace(/\bundefined\b/g, "null");
    s = s.replace(/\bNaN\b/g, "null");
    s = s.replace(/-?Infinity\b/g, "null");

    // ── Pass 2: punctuation fixes ──────────────────────────────────────────

    // Remove trailing commas before } or ]
    // Loop to handle nested cases: [1, 2, [3,],]
    let prev = "";
    while (prev !== s) {
        prev = s;
        s = s.replace(/,(\s*[}\]])/g, "$1");
    }

    // ── Pass 3: string quoting ─────────────────────────────────────────────

    // Convert single-quoted strings → double-quoted
    // Handles escaped single-quotes inside: { 'it\'s': 'ok' }
    s = s.replace(/'(?:[^'\\]|\\.)*'/g, (match) => {
        const inner = match
            .slice(1, -1)
            .replace(/\\'/g, "\u0001")   // temp-escape \'  →  placeholder
            .replace(/"/g, '\\"')        // escape existing "  →  \"
            .replace(/\u0001/g, "'");    // restore placeholder  →  '
        return `"${inner}"`;
    });

    // Quote unquoted object keys:  { name: 1 }  →  { "name": 1 }
    // Only matches bare identifiers (not already-quoted keys)
    s = s.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)(\s*):/g, '$1"$2"$3:');

    // Quote unquoted string values:  "key": hello  →  "key": "hello"
    // Safe: skips true/false/null/numbers/objects/arrays
    s = s.replace(
        /:\s*([a-zA-Z][a-zA-Z0-9_\-]*)(\s*[,}\]\n])/g,
        (_match, val, end) => {
            const v = val.trim();
            if (/^(true|false|null)$/i.test(v)) return `: ${v.toLowerCase()}${end}`;
            if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(v)) return `: ${v}${end}`;
            return `: "${v}"${end}`;
        }
    );

    // ── Pass 4: structural fixes ────────────────────────────────────────────

    // Add missing commas between elements:  } {  →  }, {  and  1 2  is harder
    // Simple case: value then newline then key in an object
    s = s.replace(/([^\s\{\[\],])([\s]*\n[\s]*)(?=["\{\[]|[a-zA-Z_$])/g, "$1,$2");

    // ── Final: attempt parse ────────────────────────────────────────────────
    // Normalize capitalized booleans introduced by repair
    s = s.replace(/\bTrue\b/g, "true");
    s = s.replace(/\bFalse\b/g, "false");

    try {
        const parsed = JSON.parse(s);
        return { fixed: JSON.stringify(parsed, null, 2), success: true };
    } catch {
        // Still failed – return partially repaired text so user can see progress
        return { fixed: s, success: false };
    }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function JsonFormatter() {
    const [input, setInput] = useState("");
    const [indentMode, setIndentMode] = useState<IndentMode>("2");
    const [copied, setCopied] = useState(false);
    const [fixFailed, setFixFailed] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Derived state – computed on every render (no useEffect needed)
    const trimmed = input.trim();
    const isEmpty = trimmed === "";

    const { value: parsed, error: lintError } = isEmpty
        ? { value: undefined, error: null }
        : parseJson(trimmed);

    const isValid = !isEmpty && lintError === null;
    const output = isValid ? formatJson(parsed, indentMode) : "";

    // ── Handlers ──────────────────────────────────────────────────────────────

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
        // Clear the failure hint after 3 seconds
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
            // Reset the input so the same file can be re-uploaded
            e.target.value = "";
        },
        []
    );

    // ── Status badge ──────────────────────────────────────────────────────────

    const statusBadge = () => {
        if (isEmpty) return null;
        if (isValid) {
            return (
                <Badge className="gap-1.5 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-medium">
                    <CheckCircle2 className="h-3 w-3" />
                    Valid JSON
                </Badge>
            );
        }
        return (
            <Badge className="gap-1.5 bg-destructive/10 text-destructive border-destructive/30 font-medium">
                <XCircle className="h-3 w-3" />
                Invalid JSON
            </Badge>
        );
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="flex flex-col gap-5 animate-in fade-in duration-300">
            {/* ── Toolbar ─────────────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border bg-card shadow-sm">
                {/* Left: Indent selector */}
                <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0">
                        Indent
                    </span>
                    <Tabs
                        value={indentMode}
                        onValueChange={(v) => setIndentMode(v as IndentMode)}
                    >
                        <TabsList className="h-8">
                            <TabsTrigger value="2" className="text-xs px-2.5 h-7 cursor-pointer">
                                2 Spaces
                            </TabsTrigger>
                            <TabsTrigger value="4" className="text-xs px-2.5 h-7 cursor-pointer">
                                4 Spaces
                            </TabsTrigger>
                            <TabsTrigger value="tab" className="text-xs px-2.5 h-7 cursor-pointer">
                                Tab
                            </TabsTrigger>
                            <TabsTrigger value="minify" className="text-xs px-2.5 h-7 cursor-pointer">
                                <Minimize2 className="h-3 w-3 mr-1" />
                                Minify
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                {/* Right: Action buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Upload */}
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
                        className="h-8 text-xs gap-1.5 cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Upload className="h-3.5 w-3.5" />
                        Upload
                    </Button>

                    {/* Fix JSON – shown only when input is invalid */}
                    {!isEmpty && !isValid && (
                        <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                                "h-8 text-xs gap-1.5 cursor-pointer transition-colors",
                                fixFailed
                                    ? "border-destructive text-destructive"
                                    : "border-amber-500/60 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                            )}
                            onClick={handleFix}
                        >
                            <Wrench className="h-3.5 w-3.5" />
                            {fixFailed ? "Can't Fix" : "Fix JSON"}
                        </Button>
                    )}

                    {/* Format */}
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1.5 cursor-pointer"
                        disabled={!isValid}
                        onClick={handleFormat}
                    >
                        <WrapText className="h-3.5 w-3.5" />
                        Format
                    </Button>

                    {/* Copy */}
                    <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                            "h-8 text-xs gap-1.5 cursor-pointer transition-colors",
                            copied && "border-emerald-500 text-emerald-600"
                        )}
                        disabled={isEmpty}
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
                        disabled={!isValid}
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
            {!isEmpty && (
                <div
                    className={cn(
                        "flex items-start gap-3 px-4 py-3 rounded-lg border text-sm transition-all",
                        isValid
                            ? "bg-emerald-500/8 border-emerald-500/25 text-emerald-700 dark:text-emerald-400"
                            : "bg-destructive/8 border-destructive/25 text-destructive"
                    )}
                >
                    {isValid ? (
                        <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                    ) : (
                        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                        {isValid ? (
                            <span className="font-medium">
                                JSON is valid and ready to format.
                            </span>
                        ) : (
                            <div className="space-y-0.5">
                                <span className="font-semibold">Syntax Error</span>
                                <p className="text-xs opacity-90 font-mono break-all">
                                    {lintError?.message}
                                </p>
                                {lintError && lintError.line !== null && (
                                    <div className="flex items-center gap-2 mt-1">
                                        <Badge
                                            variant="outline"
                                            className="text-[10px] px-1.5 h-5 border-destructive/40 text-destructive font-mono"
                                        >
                                            Line {lintError.line}
                                        </Badge>
                                        {lintError.col !== null && (
                                            <Badge
                                                variant="outline"
                                                className="text-[10px] px-1.5 h-5 border-destructive/40 text-destructive font-mono"
                                            >
                                                Col {lintError.col}
                                            </Badge>
                                        )}
                                    </div>
                                )}
                                {fixFailed ? (
                                    <p className="text-xs opacity-75 mt-1.5">
                                        Auto-repair could not fix this error. Please check for{" "}
                                        <strong>missing brackets</strong>,{" "}
                                        <strong>unclosed strings</strong>, or{" "}
                                        <strong>duplicate keys</strong> manually.
                                    </p>
                                ) : (
                                    <p className="text-xs opacity-60 mt-1.5">
                                        Click <strong>Fix JSON</strong> to auto-repair trailing commas,
                                        single quotes, unquoted keys, and JS comments.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="shrink-0">{statusBadge()}</div>
                </div>
            )}

            {/* ── Split Editor Panel ───────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Input */}
                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                            <FileJson className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Input
                            </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono">
                            {input.length} chars
                        </span>
                    </div>
                    <div
                        className={cn(
                            "relative rounded-lg border transition-colors overflow-hidden",
                            !isEmpty && lintError
                                ? "border-destructive/50 ring-1 ring-destructive/20"
                                : "border-border focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/20"
                        )}
                    >
                        <Textarea
                            id="json-input"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={`Paste your JSON here...\n\nExample:\n{\n  "name": "DevToolbox",\n  "version": 1,\n  "active": true\n}`}
                            className="min-h-105 resize-none border-0 font-mono text-sm leading-relaxed bg-card focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none p-4"
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
                            <span className="text-[10px] text-muted-foreground font-mono">
                                {output.split("\n").length} lines
                            </span>
                        )}
                    </div>
                    <div className="relative rounded-lg border border-border overflow-hidden bg-muted/30 max-h-130">
                        {output ? (
                            <pre className="p-4 text-sm font-mono leading-relaxed overflow-auto h-full max-h-130 text-foreground whitespace-pre-wrap wrap-break-word">
                                <SyntaxHighlight json={output} />
                            </pre>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full min-h-105 gap-3 text-center p-8">
                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted border border-border/50">
                                    <FileJson className="h-7 w-7 text-muted-foreground" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">
                                        {isEmpty
                                            ? "Formatted output will appear here"
                                            : "Fix the JSON error to see output"}
                                    </p>
                                    <p className="text-xs text-muted-foreground/60 mt-1">
                                        {isEmpty ? "Paste or upload a JSON file to start" : ""}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Quick Stats ──────────────────────────────────────────────────── */}
            {isValid && parsed !== undefined && (
                <JsonStats value={parsed} />
            )}
        </div>
    );
}

// ─── Syntax Highlighter ───────────────────────────────────────────────────────
// A lightweight, dependency-free JSON syntax highlighter using React spans.

function SyntaxHighlight({ json }: { json: string }) {
    // Tokenize the JSON string with a single regex pass
    const TOKEN_RE =
        /("(?:\\.|[^"\\])*")\s*(:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|(\btrue\b|\bfalse\b|\bnull\b)|([{}[\],])/g;

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    TOKEN_RE.lastIndex = 0;

    while ((match = TOKEN_RE.exec(json)) !== null) {
        // Flush any unmatched whitespace/plain text
        if (match.index > lastIndex) {
            parts.push(json.slice(lastIndex, match.index));
        }

        const [full, str, colon, num, keyword, punctuation] = match;

        if (str !== undefined) {
            if (colon !== undefined) {
                // It's a key
                parts.push(
                    <span key={match.index} className="text-sky-500 dark:text-sky-400">
                        {str}
                    </span>,
                    <span key={`${match.index}-colon`} className="text-muted-foreground">
                        :
                    </span>
                );
            } else {
                // It's a string value
                parts.push(
                    <span key={match.index} className="text-amber-600 dark:text-amber-400">
                        {str}
                    </span>
                );
            }
        } else if (num !== undefined) {
            parts.push(
                <span key={match.index} className="text-violet-600 dark:text-violet-400">
                    {num}
                </span>
            );
        } else if (keyword !== undefined) {
            parts.push(
                <span key={match.index} className="text-emerald-600 dark:text-emerald-400 font-medium">
                    {keyword}
                </span>
            );
        } else if (punctuation !== undefined) {
            parts.push(
                <span key={match.index} className="text-muted-foreground">
                    {punctuation}
                </span>
            );
        } else {
            parts.push(full);
        }

        lastIndex = match.index + full.length;
    }

    // Flush remaining text
    if (lastIndex < json.length) {
        parts.push(json.slice(lastIndex));
    }

    return <>{parts}</>;
}

// ─── Quick Stats ─────────────────────────────────────────────────────────────

function countKeys(val: unknown): number {
    if (val === null || typeof val !== "object") return 0;
    if (Array.isArray(val)) return val.reduce((s, v) => s + countKeys(v), 0);
    const obj = val as Record<string, unknown>;
    return (
        Object.keys(obj).length +
        Object.values(obj).reduce<number>((s, v) => s + countKeys(v), 0)
    );
}

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
            label: "Type",
            val: isArray ? "Array" : isObject ? "Object" : typeof value,
        },
        ...(isArray ? [{ label: "Items", val: String((value as unknown[]).length) }] : []),
        ...(isObject
            ? [{ label: "Root Keys", val: String(Object.keys(value as object).length) }]
            : []),
        { label: "Total Keys", val: String(countKeys(value)) },
        { label: "Max Depth", val: String(getDepth(value)) },
    ];

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {stats.map((s) => (
                <div
                    key={s.label}
                    className="flex flex-col gap-0.5 px-4 py-3 rounded-lg border border-border bg-card text-center"
                >
                    <span className="text-lg font-bold text-foreground font-mono">
                        {s.val}
                    </span>
                    <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">
                        {s.label}
                    </span>
                </div>
            ))}
        </div>
    );
}

"use client";

import * as React from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTools } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useState, useMemo, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Copy,
  Trash2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Search,
  Layers,
  Heart
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MatchResult {
  match: string;
  index: number;
  length: number;
  groups: string[];
  namedGroups: Record<string, string>;
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

export function RegexTester() {
  const [pattern, setPattern] = useState("");
  const [testText, setTestText] = useState("");
  const [flags, setFlags] = useState({
    g: true,
    i: false,
    m: false,
    s: false,
    u: false,
  });

  const toggleFlag = useCallback((flag: keyof typeof flags) => {
    setFlags((prev) => ({ ...prev, [flag]: !prev[flag] }));
  }, []);

  const regexResult = useMemo(() => {
    if (!pattern) {
      return { regex: null, matches: [], isValid: false, error: null };
    }

    try {
      const flagString = Object.entries(flags)
        .filter(([, value]) => value)
        .map(([key]) => key)
        .join("");

      const regex = new RegExp(pattern, flagString);

      if (!testText) {
        return { regex, matches: [], isValid: true, error: null };
      }

      const matches: MatchResult[] = [];
      let match: RegExpExecArray | null;

      if (flags.g) {
        while ((match = regex.exec(testText)) !== null) {
          matches.push({
            match: match[0],
            index: match.index,
            length: match[0].length,
            groups: match.slice(1),
            namedGroups: match.groups || {},
          });
          if (match[0].length === 0) {
            regex.lastIndex++;
          }
        }
      } else {
        match = regex.exec(testText);
        if (match) {
          matches.push({
            match: match[0],
            index: match.index,
            length: match[0].length,
            groups: match.slice(1),
            namedGroups: match.groups || {},
          });
        }
      }

      return { regex, matches, isValid: true, error: null };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Invalid regular expression";
      return { regex: null, matches: [], isValid: false, error: errorMessage };
    }
  }, [pattern, testText, flags]);

  const error = regexResult.error;

  const highlightedText = useMemo(() => {
    if (!testText || regexResult.matches.length === 0) return null;

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    const sortedMatches = [...regexResult.matches].sort(
      (a, b) => a.index - b.index
    );

    sortedMatches.forEach((match, i) => {
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${i}`}>
            {testText.slice(lastIndex, match.index)}
          </span>
        );
      }

      parts.push(
        <mark
          key={`match-${i}`}
          className="rounded bg-yellow-200 px-0.5 text-yellow-900 dark:bg-yellow-800 dark:text-yellow-100"
          title={`Match ${i + 1}: ${match.match}`}
        >
          {match.match}
        </mark>
      );

      lastIndex = match.index + match.length;
    });

    if (lastIndex < testText.length) {
      parts.push(<span key="text-end">{testText.slice(lastIndex)}</span>);
    }

    return parts;
  }, [testText, regexResult.matches]);

  const handleCopyPattern = useCallback(() => {
    if (!pattern) {
      toast.error("Nothing to copy!");
      return;
    }
    navigator.clipboard
      .writeText(pattern)
      .then(() => toast.success("Regex pattern copied to clipboard"))
      .catch(() => toast.error("Failed to copy pattern"));
  }, [pattern]);

  const handleCopyMatches = useCallback(() => {
    if (regexResult.matches.length === 0) {
      toast.error("No matches to copy!");
      return;
    }
    const matchText = regexResult.matches
      .map((m, i) => `Match ${i + 1}: "${m.match}" at index ${m.index}`)
      .join("\n");
    navigator.clipboard
      .writeText(matchText)
      .then(() => toast.success("Match results copied to clipboard"))
      .catch(() => toast.error("Failed to copy results"));
  }, [regexResult.matches]);

  const handleClearAll = useCallback(() => {
    setPattern("");
    setTestText("");
    setFlags({ g: true, i: false, m: false, s: false, u: false });
    toast.success("Cleared all inputs");
  }, []);

  const flagOptions = [
    { key: "g" as const, label: "Global", description: "Find all matches" },
    { key: "i" as const, label: "Case-insensitive", description: "Ignore case" },
    { key: "m" as const, label: "Multiline", description: "^ and $ match per line" },
    { key: "s" as const, label: "DotAll", description: "Dot matches newlines" },
    { key: "u" as const, label: "Unicode", description: "Unicode support" },
  ];

  return (
    <div className="card-premium p-6 md:p-8 space-y-8 animate-slide-up max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Regex Tester</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Test, validate, and debug regular expressions in real-time.
          </p>
        </div>
        <FavoriteButton toolId="regex-tester" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column - Pattern Input */}
        <div className="rounded-2xl border border-border/40 bg-muted/30 p-5 space-y-5">
          <div className="flex items-center gap-2">
            <Search className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Expression</h2>
          </div>

          {/* Pattern Input with Visual Delimiters */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="regex-pattern-input"
              className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider"
            >
              Regular Expression
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-mono select-none">
                /
              </span>
              <Input
                id="regex-pattern-input"
                type="text"
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                placeholder="Enter regex pattern..."
                className={cn(
                  "font-mono pl-7 pr-20 h-10 rounded-xl bg-card border-border focus:border-primary",
                  error && "border-red-500 focus-visible:ring-red-500"
                )}
                aria-label="Regular expression pattern input"
                spellCheck={false}
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono select-none">
                /
                {Object.entries(flags)
                  .filter(([, v]) => v)
                  .map(([k]) => k)
                  .join("") || "g"}
              </span>
            </div>
          </div>

          {/* Flags */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Flags Config
            </span>
            <div className="flex flex-wrap gap-2">
              {flagOptions.map(({ key, label }) => (
                <label
                  key={key}
                  className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs hover:bg-muted/80 cursor-pointer transition-all duration-150 select-none"
                  aria-label={`Toggle ${label} flag`}
                >
                  <Checkbox
                    checked={flags[key]}
                    onCheckedChange={() => toggleFlag(key)}
                    id={`flag-${key}`}
                    className="rounded"
                  />
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-mono font-bold text-xs text-foreground">{key}</span>
                    <span className="text-[10px] text-muted-foreground">
                      ({label.toLowerCase()})
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl border text-xs bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/50 animate-scale-in">
              <AlertCircle className="size-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
              <div>
                <p className="font-semibold">Expression Error</p>
                <p className="text-[11px] text-red-700/80 dark:text-red-400/85 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Valid Pattern Indicator */}
          {pattern && !error && (
            <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 font-semibold pl-1">
              <CheckCircle className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Regex expression valid</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyPattern}
              disabled={!pattern}
              className="h-9 rounded-xl text-xs gap-1.5 hover:bg-card cursor-pointer active:scale-95 transition-all"
              aria-label="Copy regex pattern"
            >
              <Copy className="size-3.5" />
              Copy Pattern
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              className="h-9 rounded-xl text-xs gap-1.5 cursor-pointer hover:bg-card active:scale-95 transition-all text-muted-foreground hover:text-destructive"
              aria-label="Clear all inputs"
            >
              <Trash2 className="size-3.5" />
              Clear
            </Button>
          </div>
        </div>

        {/* Right Column - Test Text */}
        <div className="rounded-2xl border border-border/40 bg-muted/30 p-5 space-y-4 flex flex-col justify-between">
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Test Text</h2>
          </div>
          <div className="flex-1 min-h-55 flex flex-col">
            <label
              htmlFor="test-text-input"
              className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5"
            >
              Input Text
            </label>
            <Textarea
              id="test-text-input"
              placeholder="Paste or type sample text here to search for pattern matches..."
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              className="font-mono text-xs flex-1 resize-none bg-card border border-border focus-visible:ring-0 focus-visible:ring-offset-0 rounded-xl p-4 leading-relaxed"
              aria-label="Test text input"
            />
          </div>
        </div>
      </div>

      {/* Highlighted Text Preview */}
      {highlightedText && (
        <div className="rounded-2xl border border-border/40 bg-muted/30 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Highlighted Matches preview</h2>
          <div
            className="whitespace-pre-wrap rounded-xl border border-border bg-card p-4 font-mono text-sm leading-relaxed text-foreground shadow-sm max-h-60 overflow-auto"
            aria-label="Highlighted text with regex matches"
          >
            {highlightedText}
          </div>
        </div>
      )}

      {/* Zero Match State */}
      {pattern && !error && testText && regexResult.matches.length === 0 && (
        <div className="rounded-2xl border border-border/40 bg-muted/30 p-5">
          <div className="flex items-center gap-3 text-muted-foreground">
            <XCircle className="size-5 text-muted-foreground/60" />
            <div>
              <p className="font-semibold text-xs uppercase tracking-wider">No Matches Found</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                The regular expression did not match any text. Check inputs or disable case-sensitivity flag.
              </p>
            </div>
          </div>
        </div>
      )}

      <Separator className="bg-border/60" />

      {/* Match Results */}
      {regexResult.matches.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground">Match List</h2>
              <Badge className="font-mono rounded-full text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900/50 px-2 py-0.5">
                {regexResult.matches.length} {regexResult.matches.length === 1 ? "match" : "matches"}
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyMatches}
              className="h-9 rounded-xl text-xs gap-1.5 hover:bg-card cursor-pointer active:scale-95 transition-all"
              aria-label="Copy match results"
            >
              <Copy className="size-3.5" />
              Copy Results
            </Button>
          </div>

          <ScrollArea className="h-96 rounded-2xl border border-border bg-muted/20">
            <div className="space-y-3 p-3">
              {regexResult.matches.map((match, i) => (
                <div
                  key={`${match.index}-${i}`}
                  className="rounded-xl border border-border/60 bg-card p-4 shadow-sm space-y-3 hover:border-border transition-all animate-scale-in"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="font-mono text-[9px] font-bold px-2 py-0 border-border bg-muted/10 text-muted-foreground rounded-full"
                      >
                        Match {i + 1}
                      </Badge>
                      <span className="text-[10px] font-mono text-muted-foreground font-semibold">
                        Index: {match.index} | Len: {match.length}
                      </span>
                    </div>
                  </div>
                  <code className="block break-all text-xs font-mono bg-muted/40 text-foreground border border-border/40 rounded-lg p-3">
                    {match.match}
                  </code>

                  {/* Capture Groups */}
                  {match.groups.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                        Capture Groups:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {match.groups.map((group, gIndex) => (
                          <Badge
                            key={gIndex}
                            variant="secondary"
                            className="font-mono text-[10px] px-2 py-0 border border-border rounded-full"
                          >
                            ${gIndex + 1}:{" "}
                            {group || (
                              <span className="italic text-muted-foreground/60 font-medium">
                                empty
                              </span>
                            )}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Named Capture Groups */}
                  {Object.keys(match.namedGroups).length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                        Named Groups:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(match.namedGroups).map(
                          ([name, value]) => (
                            <Badge
                              key={name}
                              variant="secondary"
                              className="font-mono text-[10px] px-2 py-0 border border-border rounded-full"
                            >
                              {name}:{" "}
                              {value || (
                                <span className="italic text-muted-foreground/60 font-medium">
                                  empty
                                </span>
                              )}
                            </Badge>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
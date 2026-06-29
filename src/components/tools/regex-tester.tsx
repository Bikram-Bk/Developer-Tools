"use client";

import * as React from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useState, useMemo, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Copy,
  Trash2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Search,
  Layers,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MatchResult {
  match: string;
  index: number;
  length: number;
  groups: string[];
  namedGroups: Record<string, string>;
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

  // ─── Flag Toggle ───────────────────────────────────────────────────────────
  const toggleFlag = useCallback((flag: keyof typeof flags) => {
    setFlags((prev) => ({ ...prev, [flag]: !prev[flag] }));
  }, []);

  // ─── Regex Matching Logic (derived, no setState inside) ─────────────────────
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

  // Derived error from regexResult
  const error = regexResult.error;

  // ─── Highlighted Text Generation ───────────────────────────────────────────
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

  // ─── Copy Handlers ─────────────────────────────────────────────────────────
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

  // ─── Clear All ─────────────────────────────────────────────────────────────
  const handleClearAll = useCallback(() => {
    setPattern("");
    setTestText("");
    setFlags({ g: true, i: false, m: false, s: false, u: false });
    toast.success("Cleared all inputs");
  }, []);

  // ─── Flag Options ──────────────────────────────────────────────────────────
  const flagOptions = [
    { key: "g" as const, label: "Global", description: "Find all matches" },
    { key: "i" as const, label: "Case-insensitive", description: "Ignore case" },
    { key: "m" as const, label: "Multiline", description: "^ and $ match per line" },
    { key: "s" as const, label: "DotAll", description: "Dot matches newlines" },
    { key: "u" as const, label: "Unicode", description: "Unicode support" },
  ];

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 p-6 bg-card rounded-xl border border-border shadow-sm max-w-6xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Regex Tester</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Test and debug regular expressions in real-time
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column - Pattern Input */}
        <Card className="shadow-inner">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-primary/10 text-primary">
                <Search className="size-4" />
              </span>
              Pattern
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Enter a regular expression pattern and configure flags
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {/* Pattern Input with Visual Delimiters */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="regex-pattern-input"
                className="text-xs font-semibold text-muted-foreground uppercase"
              >
                Regular Expression
              </label>
              <div className="relative">
                <Input
                  id="regex-pattern-input"
                  type="text"
                  value={pattern}
                  onChange={(e) => setPattern(e.target.value)}
                  placeholder="Enter regex pattern..."
                  className={cn(
                    "font-mono pl-7 pr-16",
                    error &&
                    "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
                  )}
                  aria-label="Regular expression pattern input"
                  aria-invalid={!!error}
                  spellCheck={false}
                />
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-mono select-none">
                  /
                </span>
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono select-none">
                  /
                  {Object.entries(flags)
                    .filter(([, v]) => v)
                    .map(([k]) => k)
                    .join("") || "g"}
                </span>
              </div>
            </div>

            {/* Flags */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground uppercase">
                Flags
              </span>
              <div className="flex flex-wrap gap-2">
                {flagOptions.map(({ key, label, description }) => (
                  <label
                    key={key}
                    className="flex items-center gap-2 rounded-lg border border-input px-3 py-1.5 text-sm hover:bg-muted/50 cursor-pointer transition-colors"
                    aria-label={`Toggle ${label} flag`}
                  >
                    <Checkbox
                      checked={flags[key]}
                      onCheckedChange={() => toggleFlag(key)}
                      id={`flag-${key}`}
                    />
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-mono font-bold text-xs">{key}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {description}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-lg flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Invalid Pattern</p>
                  <p className="text-[11px] opacity-80">{error}</p>
                </div>
              </div>
            )}

            {/* Valid Pattern Indicator */}
            {pattern && !error && (
              <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="size-3.5" />
                <span>Valid pattern</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 mt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyPattern}
                disabled={!pattern}
                className="cursor-pointer"
                aria-label="Copy regex pattern"
              >
                <Copy className="size-3.5 mr-1" />
                Copy Pattern
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAll}
                className="cursor-pointer"
                aria-label="Clear all inputs"
              >
                <Trash2 className="size-3.5 mr-1" />
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Right Column - Test Text */}
        <Card className="shadow-inner">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-primary/10 text-primary">
                <Layers className="size-4" />
              </span>
              Test Text
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Enter text to test against your regex pattern
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-1.5 flex-1">
            <label
              htmlFor="test-text-input"
              className="text-xs font-semibold text-muted-foreground uppercase"
            >
              Input Text
            </label>
            <Textarea
              id="test-text-input"
              placeholder="Enter text to test against the regex pattern..."
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              rows={8}
              className="font-mono text-sm flex-1 resize-none"
              aria-label="Test text input"
            />
          </CardContent>
        </Card>
      </div>

      {/* Highlighted Text Preview */}
      {highlightedText && (
        <Card>
          <CardHeader>
            <CardTitle>Highlighted Matches</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="whitespace-pre-wrap rounded-lg border border-input bg-muted/30 p-4 font-mono text-sm leading-relaxed dark:bg-input/30"
              aria-label="Highlighted text with regex matches"
            >
              {highlightedText}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Zero Match State */}
      {pattern && !error && testText && regexResult.matches.length === 0 && (
        <Card>
          <CardContent className="py-6">
            <div className="flex items-center gap-3 text-muted-foreground">
              <XCircle className="size-5" />
              <div>
                <p className="font-medium text-sm">No Matches Found</p>
                <p className="text-xs">
                  The pattern did not match any text. Try adjusting your regex
                  or test text.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Match Results */}
      {regexResult.matches.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Match Results</h2>
              <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                {regexResult.matches.length}{" "}
                {regexResult.matches.length === 1 ? "match" : "matches"}
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyMatches}
              className="cursor-pointer"
              aria-label="Copy match results"
            >
              <Copy className="size-3.5 mr-1" />
              Copy Results
            </Button>
          </div>

          <ScrollArea className="h-100 rounded-xl border border-border">
            <div className="space-y-2 p-1">
              {regexResult.matches.map((match, i) => (
                <Card
                  key={`${match.index}-${i}`}
                  className="shadow-none border-border"
                >
                  <CardContent className="py-3 px-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Badge
                            variant="outline"
                            className="font-mono text-[10px] py-0 px-1.5"
                          >
                            Match {i + 1}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            Index: {match.index} | Length: {match.length}
                          </span>
                        </div>
                        <code className="block break-all text-sm font-mono bg-muted/30 rounded px-2 py-1">
                          {match.match}
                        </code>

                        {/* Capture Groups */}
                        {match.groups.length > 0 && (
                          <div className="mt-2.5">
                            <p className="mb-1.5 text-[10px] font-semibold text-muted-foreground uppercase">
                              Capture Groups:
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {match.groups.map((group, gIndex) => (
                                <Badge
                                  key={gIndex}
                                  variant="secondary"
                                  className="font-mono text-[10px] py-0 px-1.5"
                                >
                                  ${gIndex + 1}:{" "}
                                  {group || (
                                    <span className="italic text-muted-foreground">
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
                          <div className="mt-2.5">
                            <p className="mb-1.5 text-[10px] font-semibold text-muted-foreground uppercase">
                              Named Groups:
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(match.namedGroups).map(
                                ([name, value]) => (
                                  <Badge
                                    key={name}
                                    variant="secondary"
                                    className="font-mono text-[10px] py-0 px-1.5"
                                  >
                                    {name}:{" "}
                                    {value || (
                                      <span className="italic text-muted-foreground">
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
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
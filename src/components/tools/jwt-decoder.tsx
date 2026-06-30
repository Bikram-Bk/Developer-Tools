"use client";

import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTools } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState, useMemo, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Copy,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Clock,
  Key,
  FileCode,
  Braces,
  AlertCircle,
  CheckCircle,
  XCircle,
  Heart
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface JwtHeader {
  alg: string;
  typ?: string;
  kid?: string;
  [key: string]: unknown;
}

interface JwtPayload {
  iat?: number;
  exp?: number;
  nbf?: number;
  iss?: string;
  sub?: string;
  aud?: string | string[];
  jti?: string;
  [key: string]: unknown;
}

interface DecodedJwt {
  header: JwtHeader;
  payload: JwtPayload;
  signature: string;
  isValid: boolean;
  error: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function base64UrlDecode(str: string): string {
  try {
    str = str.replace(/-/g, "+").replace(/_/g, "/");
    while (str.length % 4) {
      str += "=";
    }
    const decoded = atob(str);
    return decodeURIComponent(
      decoded
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
  } catch {
    throw new Error("Invalid Base64URL encoding");
  }
}

function decodeJwt(token: string): DecodedJwt {
  const parts = token.split(".");

  if (parts.length !== 3) {
    return {
      header: {} as JwtHeader,
      payload: {} as JwtPayload,
      signature: "",
      isValid: false,
      error:
        "Invalid JWT format. Token must have 3 parts separated by dots.",
    };
  }

  const [headerB64, payloadB64, signature] = parts;

  try {
    const headerJson = base64UrlDecode(headerB64);
    const payloadJson = base64UrlDecode(payloadB64);

    const header: JwtHeader = JSON.parse(headerJson);
    const payload: JwtPayload = JSON.parse(payloadJson);

    return {
      header,
      payload,
      signature,
      isValid: true,
      error: null,
    };
  } catch (err) {
    return {
      header: {} as JwtHeader,
      payload: {} as JwtPayload,
      signature: "",
      isValid: false,
      error:
        err instanceof Error ? err.message : "Failed to decode JWT token",
    };
  }
}

function formatJson(obj: Record<string, unknown>): string {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return "{}";
  }
}

function isTokenExpired(payload: JwtPayload): boolean {
  if (!payload.exp) return false;
  const now = Math.floor(Date.now() / 1000);
  return payload.exp < now;
}

function isTokenNotBefore(payload: JwtPayload): boolean {
  if (!payload.nbf) return false;
  const now = Math.floor(Date.now() / 1000);
  return payload.nbf > now;
}

function formatTimestamp(unixTimestamp: number): string {
  return new Date(unixTimestamp * 1000).toLocaleString();
}

function getTimeRemaining(expTimestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = expTimestamp - now;

  if (diff <= 0) return "Expired";

  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  const seconds = diff % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);

  return parts.join(" ");
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

export function JwtDecoder() {
  const [token, setToken] = useState("");

  const decoded = useMemo<DecodedJwt | null>(() => {
    if (!token.trim()) return null;

    const parts = token.trim().split(".");
    if (parts.length !== 3) {
      return {
        header: {} as JwtHeader,
        payload: {} as JwtPayload,
        signature: "",
        isValid: false,
        error:
          "Invalid JWT format. Token must have 3 parts separated by dots.",
      };
    }

    return decodeJwt(token.trim());
  }, [token]);

  const expiryStatus = useMemo(() => {
    if (!decoded?.isValid || !decoded.payload.exp) return null;

    const expired = isTokenExpired(decoded.payload);
    const notBefore = isTokenNotBefore(decoded.payload);

    return {
      expired,
      notBefore,
      expDate: formatTimestamp(decoded.payload.exp),
      nbfDate: decoded.payload.nbf
        ? formatTimestamp(decoded.payload.nbf)
        : null,
      iatDate: decoded.payload.iat
        ? formatTimestamp(decoded.payload.iat)
        : null,
      remaining: expired ? null : getTimeRemaining(decoded.payload.exp),
      status: expired ? "expired" : notBefore ? "not-yet-valid" : "active",
    };
  }, [decoded]);

  const handleCopy = useCallback((text: string, label: string) => {
    if (!text) {
      toast.error("Nothing to copy!");
      return;
    }
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success(`${label} copied to clipboard`))
      .catch(() => toast.error(`Failed to copy ${label}`));
  }, []);

  const handleClear = useCallback(() => {
    setToken("");
    toast.success("Cleared all inputs");
  }, []);

  return (
    <div className="card-premium p-6 md:p-8 space-y-8 animate-slide-up max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">JWT Decoder</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Decode, inspect and verify JSON Web Tokens (JWT) payload timestamps client-side.
          </p>
        </div>
        <FavoriteButton toolId="jwt-decoder" />
      </div>

      {/* Token Input */}
      <div className="rounded-2xl border border-border/40 bg-muted/30 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <Key className="size-4 text-muted-foreground" />
            JWT Token Input
          </h2>
          {token && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-8 rounded-xl text-xs gap-1.5 text-muted-foreground hover:text-destructive hover:bg-card active:scale-95 transition-all"
              aria-label="Clear JWT token"
            >
              <Trash2 className="size-3.5" />
              Clear
            </Button>
          )}
        </div>
        <div className="relative rounded-xl border border-border focus-within:border-primary/45 focus-within:ring-1 focus-within:ring-primary/20 transition-all overflow-hidden bg-card">
          <Textarea
            id="jwt-token-input"
            placeholder="Paste your base64-encoded JWT token here..."
            value={token}
            onChange={(e) => setToken(e.target.value)}
            rows={4}
            className="font-mono text-xs resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none p-4 leading-relaxed"
            aria-label="JWT token input"
          />
        </div>
      </div>

      {/* Error Display */}
      {decoded && !decoded.isValid && decoded.error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl border text-sm transition-all bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/50 animate-scale-in">
          <AlertCircle className="size-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
          <div>
            <p className="font-semibold">Parse Error</p>
            <p className="text-xs text-red-700/80 dark:text-red-400/85 mt-0.5">{decoded.error}</p>
          </div>
        </div>
      )}

      {/* Token Status & Decoded View */}
      {decoded?.isValid && (
        <div className="space-y-6 animate-scale-in">
          {/* Status Metrics Cards Grid */}
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Signature Status */}
            <div className="rounded-2xl border border-border/50 bg-card p-4 flex items-center gap-3 shadow-sm hover:shadow-md transition-all duration-200">
              {decoded.signature ? (
                <div className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/50 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/40">
                  <ShieldAlert className="size-5" />
                </div>
              ) : (
                <div className="p-2 rounded-xl bg-red-50 text-red-700 border border-red-200/50 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/40">
                  <ShieldX className="size-5" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Signature
                </p>
                <p className="text-xs font-semibold text-foreground mt-0.5 truncate">
                  {decoded.signature ? "Unverified Signature" : "No Signature"}
                </p>
                <p className="text-[9px] text-muted-foreground truncate leading-none mt-0.5">
                  Needs signature secret verification
                </p>
              </div>
            </div>

            {/* Expiry Status */}
            <div className="rounded-2xl border border-border/50 bg-card p-4 flex items-center gap-3 shadow-sm hover:shadow-md transition-all duration-200">
              {expiryStatus ? (
                expiryStatus.status === "active" ? (
                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/50 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/40">
                    <CheckCircle className="size-5" />
                  </div>
                ) : (
                  <div className="p-2 rounded-xl bg-red-50 text-red-700 border border-red-200/50 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/40">
                    <XCircle className="size-5" />
                  </div>
                )
              ) : (
                <div className="p-2 rounded-xl bg-muted text-muted-foreground">
                  <Clock className="size-5" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Token Validity
                </p>
                {expiryStatus ? (
                  <div className="mt-1 flex flex-col gap-0.5">
                    <Badge
                      className={cn(
                        "text-[9px] py-0 px-2 rounded-full font-bold uppercase tracking-wider w-fit",
                        expiryStatus.status === "active"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50"
                          : "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/50"
                      )}
                    >
                      {expiryStatus.status === "active"
                        ? "Active"
                        : expiryStatus.status === "expired"
                          ? "Expired"
                          : "Not Valid Yet"}
                    </Badge>
                    {expiryStatus.remaining && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                        Expires: {expiryStatus.remaining}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs font-semibold text-muted-foreground mt-0.5">
                    No expiry date set
                  </p>
                )}
              </div>
            </div>

            {/* Algorithm */}
            <div className="rounded-2xl border border-border/50 bg-card p-4 flex items-center gap-3 shadow-sm hover:shadow-md transition-all duration-200">
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200/50 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900/40">
                <ShieldCheck className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Algorithm
                </p>
                <Badge
                  variant="secondary"
                  className="text-[10px] font-semibold py-0 px-2 font-mono mt-1 rounded-full border border-border text-foreground"
                >
                  {decoded.header.alg || "NONE"}
                </Badge>
              </div>
            </div>
          </div>

          {/* Decoded Content Split Tabs */}
          <Tabs defaultValue="payload" className="w-full space-y-4">
            <TabsList className="bg-muted p-1 rounded-lg h-8 w-auto">
              <TabsTrigger value="payload" className="text-xs rounded-md px-3 h-full cursor-pointer" aria-label="View payload tab">
                <Braces className="size-3.5 mr-1.5" />
                Payload Claims
              </TabsTrigger>
              <TabsTrigger value="header" className="text-xs rounded-md px-3 h-full cursor-pointer" aria-label="View header tab">
                <FileCode className="size-3.5 mr-1.5" />
                Header Claims
              </TabsTrigger>
            </TabsList>

            {/* Payload Tab */}
            <TabsContent value="payload" className="mt-0">
              <div className="rounded-2xl border border-border/40 bg-muted/30 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Payload claims data</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      handleCopy(
                        formatJson(decoded.payload as Record<string, unknown>),
                        "Payload"
                      )
                    }
                    className="h-8 rounded-xl text-xs gap-1.5 hover:bg-card cursor-pointer active:scale-95 transition-all"
                    aria-label="Copy payload JSON"
                  >
                    <Copy className="size-3.5" />
                    Copy Payload
                  </Button>
                </div>
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <ScrollArea className="h-72">
                    <pre className="p-4 font-mono text-xs leading-relaxed text-foreground whitespace-pre-wrap">
                      {formatJson(decoded.payload as Record<string, unknown>)}
                    </pre>
                  </ScrollArea>
                </div>

                {/* Timestamps */}
                {expiryStatus &&
                  (expiryStatus.iatDate ||
                    expiryStatus.expDate ||
                    expiryStatus.nbfDate) && (
                    <div className="p-4 rounded-xl border border-border bg-card/60 space-y-3">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border/50 pb-1.5">
                        Timestamp Information
                      </p>
                      <div className="grid gap-3 sm:grid-cols-3">
                        {expiryStatus.iatDate && (
                          <div className="flex items-center gap-2 text-xs">
                            <Badge variant="outline" className="text-[9px] font-mono font-bold px-1.5 py-0 rounded-full">
                              iat
                            </Badge>
                            <span className="text-muted-foreground truncate" title={expiryStatus.iatDate}>
                              Issued: {expiryStatus.iatDate}
                            </span>
                          </div>
                        )}
                        {expiryStatus.expDate && (
                          <div className="flex items-center gap-2 text-xs">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[9px] font-mono font-bold px-1.5 py-0 rounded-full",
                                expiryStatus.status === "expired"
                                  ? "border-red-300 text-red-700 bg-red-50 dark:bg-red-950/30"
                                  : "border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30"
                              )}
                            >
                              exp
                            </Badge>
                            <span
                              className={cn(
                                "text-muted-foreground truncate",
                                expiryStatus.status === "expired"
                                  ? "text-red-600 font-semibold"
                                  : "text-emerald-700 dark:text-emerald-400 font-semibold"
                              )}
                              title={expiryStatus.expDate}
                            >
                              Expires: {expiryStatus.expDate}
                            </span>
                          </div>
                        )}
                        {expiryStatus.nbfDate && (
                          <div className="flex items-center gap-2 text-xs">
                            <Badge variant="outline" className="text-[9px] font-mono font-bold px-1.5 py-0 rounded-full">
                              nbf
                            </Badge>
                            <span className="text-muted-foreground truncate" title={expiryStatus.nbfDate}>
                              Not Before: {expiryStatus.nbfDate}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
              </div>
            </TabsContent>

            {/* Header Tab */}
            <TabsContent value="header" className="mt-0">
              <div className="rounded-2xl border border-border/40 bg-muted/30 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Header metadata data</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      handleCopy(
                        formatJson(decoded.header as Record<string, unknown>),
                        "Header"
                      )
                    }
                    className="h-8 rounded-xl text-xs gap-1.5 hover:bg-card cursor-pointer active:scale-95 transition-all"
                    aria-label="Copy header JSON"
                  >
                    <Copy className="size-3.5" />
                    Copy Header
                  </Button>
                </div>
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <ScrollArea className="h-72">
                    <pre className="p-4 font-mono text-xs leading-relaxed text-foreground whitespace-pre-wrap">
                      {formatJson(decoded.header as Record<string, unknown>)}
                    </pre>
                  </ScrollArea>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Signature Verification Block */}
          <div className="rounded-2xl border border-border/40 bg-muted/30 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Signature Hash String</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(decoded.signature, "Signature")}
                className="h-8 rounded-xl text-xs gap-1.5 hover:bg-card cursor-pointer active:scale-95 transition-all"
                aria-label="Copy signature"
              >
                <Copy className="size-3.5" />
                Copy Signature
              </Button>
            </div>
            <code className="block break-all rounded-xl border border-border bg-card p-4 font-mono text-xs text-foreground shadow-sm">
              {decoded.signature}
            </code>
          </div>
        </div>
      )}
    </div>
  );
}
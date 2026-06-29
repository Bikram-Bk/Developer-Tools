"use client";

import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState, useMemo, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

// ─── Component ────────────────────────────────────────────────────────────────

export function JwtDecoder() {
  const [token, setToken] = useState("");

  // ─── Live Decode via useMemo (no setState in effect) ────────────────────────
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

  // ─── Expiry Status ──────────────────────────────────────────────────────────
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

  // ─── Copy ───────────────────────────────────────────────────────────────────
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

  // ─── Clear ──────────────────────────────────────────────────────────────────
  const handleClear = useCallback(() => {
    setToken("");
    toast.success("Cleared all inputs");
  }, []);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 p-6 bg-card rounded-xl border border-border shadow-sm max-w-6xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">JWT Decoder</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Decode and inspect JSON Web Tokens entirely in your browser
          </p>
        </div>
      </div>

      {/* ─── Token Input ──────────────────────────────────────────────────── */}
      <Card className="shadow-inner">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="size-4" />
            JWT Token
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Paste your JWT token to decode its header and payload
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="jwt-token-input"
              className="text-xs font-semibold text-muted-foreground uppercase"
            >
              Encoded JWT
            </label>
            <Textarea
              id="jwt-token-input"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              rows={4}
              className="font-mono text-xs resize-none"
              aria-label="JWT token input"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              className="cursor-pointer"
              aria-label="Clear JWT token"
            >
              <Trash2 className="size-3.5 mr-1" />
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ─── Error Display ────────────────────────────────────────────────── */}
      {decoded && !decoded.isValid && decoded.error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg flex items-start gap-3 animate-in fade-in">
          <AlertCircle className="size-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-sm">Invalid Token</p>
            <p className="text-xs opacity-80">{decoded.error}</p>
          </div>
        </div>
      )}

      {/* ─── Token Status ─────────────────────────────────────────────────── */}
      {decoded?.isValid && (
        <>
          {/* Signature & Expiry Status Bar */}
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Signature Status */}
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  {decoded.signature ? (
                    <div className="p-2 rounded-full bg-amber-500/10">
                      <ShieldAlert className="size-5 text-amber-500" />
                    </div>
                  ) : (
                    <div className="p-2 rounded-full bg-destructive/10">
                      <ShieldX className="size-5 text-destructive" />
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase">
                      Signature
                    </p>
                    <p className="text-sm font-medium">
                      {decoded.signature ? "Present (not verified)" : "Missing"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Verification requires secret key
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Expiry Status */}
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  {expiryStatus ? (
                    expiryStatus.status === "active" ? (
                      <div className="p-2 rounded-full bg-emerald-500/10">
                        <CheckCircle className="size-5 text-emerald-500" />
                      </div>
                    ) : (
                      <div className="p-2 rounded-full bg-destructive/10">
                        <XCircle className="size-5 text-destructive" />
                      </div>
                    )
                  ) : (
                    <div className="p-2 rounded-full bg-muted">
                      <Clock className="size-5 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase">
                      Expiration
                    </p>
                    {expiryStatus ? (
                      <>
                        <Badge
                          className={cn(
                            "text-[10px] py-0 px-1.5",
                            expiryStatus.status === "active"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-destructive/10 text-destructive"
                          )}
                        >
                          {expiryStatus.status === "active"
                            ? "Active"
                            : expiryStatus.status === "expired"
                              ? "Expired"
                              : "Not Yet Valid"}
                        </Badge>
                        {expiryStatus.remaining && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Expires in {expiryStatus.remaining}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No expiration set
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Algorithm */}
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <ShieldCheck className="size-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase">
                      Algorithm
                    </p>
                    <Badge
                      variant="secondary"
                      className="text-[10px] py-0 px-1.5 font-mono mt-0.5"
                    >
                      {decoded.header.alg || "Unknown"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ─── Decoded Content ──────────────────────────────────────────── */}
          <Tabs defaultValue="payload" className="w-full">
            <TabsList>
              <TabsTrigger value="payload" aria-label="View payload tab">
                <Braces className="size-3.5 mr-1" />
                Payload
              </TabsTrigger>
              <TabsTrigger value="header" aria-label="View header tab">
                <FileCode className="size-3.5 mr-1" />
                Header
              </TabsTrigger>
            </TabsList>

            {/* Payload Tab */}
            <TabsContent value="payload" className="mt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle>Payload Data</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      handleCopy(
                        formatJson(decoded.payload as Record<string, unknown>),
                        "Payload"
                      )
                    }
                    className="cursor-pointer"
                    aria-label="Copy payload JSON"
                  >
                    <Copy className="size-3.5 mr-1" />
                    Copy
                  </Button>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-75 rounded-lg border border-input bg-muted/30 dark:bg-input/30">
                    <pre className="p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap">
                      {formatJson(decoded.payload as Record<string, unknown>)}
                    </pre>
                  </ScrollArea>

                  {/* Timestamps */}
                  {expiryStatus &&
                    (expiryStatus.iatDate ||
                      expiryStatus.expDate ||
                      expiryStatus.nbfDate) && (
                      <div className="mt-3 space-y-1.5">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-2">
                          Timestamps
                        </p>
                        {expiryStatus.iatDate && (
                          <div className="flex items-center gap-2 text-xs">
                            <Badge
                              variant="outline"
                              className="text-[10px] py-0 px-1.5 font-mono"
                            >
                              iat
                            </Badge>
                            <span className="text-muted-foreground">
                              Issued: {expiryStatus.iatDate}
                            </span>
                          </div>
                        )}
                        {expiryStatus.expDate && (
                          <div className="flex items-center gap-2 text-xs">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] py-0 px-1.5 font-mono",
                                expiryStatus.status === "expired"
                                  ? "border-destructive text-destructive"
                                  : "border-emerald-500 text-emerald-600"
                              )}
                            >
                              exp
                            </Badge>
                            <span
                              className={cn(
                                "text-muted-foreground",
                                expiryStatus.status === "expired" &&
                                "text-destructive"
                              )}
                            >
                              Expires: {expiryStatus.expDate}
                            </span>
                          </div>
                        )}
                        {expiryStatus.nbfDate && (
                          <div className="flex items-center gap-2 text-xs">
                            <Badge
                              variant="outline"
                              className="text-[10px] py-0 px-1.5 font-mono"
                            >
                              nbf
                            </Badge>
                            <span className="text-muted-foreground">
                              Not Before: {expiryStatus.nbfDate}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Header Tab */}
            <TabsContent value="header" className="mt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle>Header Data</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      handleCopy(
                        formatJson(decoded.header as Record<string, unknown>),
                        "Header"
                      )
                    }
                    className="cursor-pointer"
                    aria-label="Copy header JSON"
                  >
                    <Copy className="size-3.5 mr-1" />
                    Copy
                  </Button>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-75 rounded-lg border border-input bg-muted/30 dark:bg-input/30">
                    <pre className="p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap">
                      {formatJson(decoded.header as Record<string, unknown>)}
                    </pre>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Signature Display */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle>Signature</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(decoded.signature, "Signature")}
                className="cursor-pointer"
                aria-label="Copy signature"
              >
                <Copy className="size-3.5 mr-1" />
                Copy
              </Button>
            </CardHeader>
            <CardContent>
              <code className="block break-all rounded-lg border border-input bg-muted/30 p-3 font-mono text-xs dark:bg-input/30">
                {decoded.signature}
              </code>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
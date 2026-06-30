"use client";

import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTools } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Copy,
  Clock,
  Calendar,
  Pause,
  Play,
  AlertCircle,
  RefreshCw,
  Heart
} from "lucide-react";

// ─── Constants & Date Helpers ─────────────────────────────────────────────────

const MIN_SAFE_MS = -8.64e15;
const MAX_SAFE_MS = 8.64e15;

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function detectUnit(val: number): "seconds" | "milliseconds" {
  return Math.abs(val) >= 3e10 ? "milliseconds" : "seconds";
}

function getRelativeTime(timestampMs: number): string {
  const now = Date.now();
  const diff = timestampMs - now;
  const absDiff = Math.abs(diff);

  const format = (value: number, unit: Intl.RelativeTimeFormatUnit) => {
    try {
      const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
      return rtf.format(value, unit);
    } catch {
      return `${value} ${unit}s ${value < 0 ? "ago" : "from now"}`;
    }
  };

  const msPerMinute = 60 * 1000;
  const msPerHour = 60 * msPerMinute;
  const msPerDay = 24 * msPerHour;
  const msPerMonth = 30 * msPerDay;
  const msPerYear = 365 * msPerDay;

  if (absDiff < 1000) {
    return "just now";
  } else if (absDiff < msPerMinute) {
    return format(Math.round(diff / 1000), "second");
  } else if (absDiff < msPerHour) {
    return format(Math.round(diff / msPerMinute), "minute");
  } else if (absDiff < msPerDay) {
    return format(Math.round(diff / msPerHour), "hour");
  } else if (absDiff < msPerMonth) {
    return format(Math.round(diff / msPerDay), "day");
  } else if (absDiff < msPerYear) {
    return format(Math.round(diff / msPerMonth), "month");
  } else {
    return format(Math.round(diff / msPerYear), "year");
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

export function TimestampTool() {
  const [isClockRunning, setIsClockRunning] = useState(true);
  const [liveTime, setLiveTime] = useState(() => Date.now());

  useEffect(() => {
    if (!isClockRunning) {
      return undefined;
    }

    const interval = setInterval(() => {
      setLiveTime(Date.now());
    }, 100);

    return () => clearInterval(interval);
  }, [isClockRunning]);

  // ─── Converter States ──────────────────────────────────────────────────────
  const [epochInput, setEpochInput] = useState("1767225600");
  const [epochUnit, setEpochUnit] = useState<
    "auto" | "seconds" | "milliseconds"
  >("auto");

  const [dateParts, setDateParts] = useState({
    year: 2026,
    month: 1,
    day: 1,
    hour: 0,
    minute: 0,
    second: 0,
    millisecond: 0,
  });
  const [targetTimezone, setTargetTimezone] = useState<"local" | "utc">(
    "local",
  );

  const epochDatum = useMemo(() => {
    let epochError: string | null = null;
    let epochUtcStr = "";
    let epochLocalStr = "";
    let epochIsoStr = "";
    let epochRelativeStr = "";
    let epochIsLeap: boolean | null = null;
    let activeUnitText = "";

    const trimmedEpoch = epochInput.trim();
    if (trimmedEpoch) {
      const isNumeric = /^-?\d+(\.\d+)?$/.test(trimmedEpoch);
      if (!isNumeric) {
        epochError =
          "Invalid input: Unix timestamp must be numeric.";
      } else {
        const numVal = parseFloat(trimmedEpoch);
        const unit = epochUnit === "auto" ? detectUnit(numVal) : epochUnit;
        activeUnitText =
          unit === "seconds" ? "Seconds (s)" : "Milliseconds (ms)";

        const msVal = unit === "seconds" ? numVal * 1000 : numVal;

        if (msVal < MIN_SAFE_MS || msVal > MAX_SAFE_MS) {
          epochError =
            "Out of range: Built-in Date limits exceeded (±100,000,000 days from epoch).";
        } else {
          const dateObj = new Date(msVal);
          if (isNaN(dateObj.getTime())) {
            epochError =
              "Parse error: Unable to create valid date from parts.";
          } else {
            epochUtcStr = dateObj.toUTCString();
            epochLocalStr = `${dateObj.toLocaleString()} (${Intl.DateTimeFormat().resolvedOptions().timeZone})`;
            epochIsoStr = dateObj.toISOString();
            epochRelativeStr = getRelativeTime(msVal);
            epochIsLeap = isLeapYear(dateObj.getUTCFullYear());
          }
        }
      }
    }

    return {
      epochError,
      epochUtcStr,
      epochLocalStr,
      epochIsoStr,
      epochRelativeStr,
      epochIsLeap,
      activeUnitText,
    };
  }, [epochInput, epochUnit]);

  const {
    epochError,
    epochUtcStr,
    epochLocalStr,
    epochIsoStr,
    epochRelativeStr,
    epochIsLeap,
    activeUnitText,
  } = epochDatum;

  const dateDatum = useMemo(() => {
    let dateError: string | null = null;
    let dateEpochSeconds = "";
    let dateEpochMilliseconds = "";
    let dateIsoStr = "";

    const dateIsLeap = isLeapYear(dateParts.year);
    const isValidMonth = dateParts.month >= 1 && dateParts.month <= 12;
    const daysInMonth = new Date(dateParts.year, dateParts.month, 0).getDate();
    const isValidDay =
      dateParts.day >= 1 && dateParts.day <= (isValidMonth ? daysInMonth : 31);
    const isValidHour = dateParts.hour >= 0 && dateParts.hour <= 23;
    const isValidMinute = dateParts.minute >= 0 && dateParts.minute <= 59;
    const isValidSecond = dateParts.second >= 0 && dateParts.second <= 59;
    const isValidMilli =
      dateParts.millisecond >= 0 && dateParts.millisecond <= 999;

    if (!isValidMonth) dateError = "Month must be between 1 and 12.";
    else if (!isValidDay)
      dateError = `Day must be between 1 and ${daysInMonth} for the selected year and month.`;
    else if (!isValidHour) dateError = "Hour must be between 0 and 23.";
    else if (!isValidMinute) dateError = "Minute must be between 0 and 59.";
    else if (!isValidSecond) dateError = "Second must be between 0 and 59.";
    else if (!isValidMilli)
      dateError = "Millisecond must be between 0 and 999.";

    if (!dateError) {
      try {
        const msVal =
          targetTimezone === "local"
            ? new Date(
                dateParts.year,
                dateParts.month - 1,
                dateParts.day,
                dateParts.hour,
                dateParts.minute,
                dateParts.second,
                dateParts.millisecond,
              ).getTime()
            : Date.UTC(
                dateParts.year,
                dateParts.month - 1,
                dateParts.day,
                dateParts.hour,
                dateParts.minute,
                dateParts.second,
                dateParts.millisecond,
              );

        if (isNaN(msVal) || msVal < MIN_SAFE_MS || msVal > MAX_SAFE_MS) {
          dateError =
            "Out of range: Built Date exceeds JavaScript boundary limit.";
        } else {
          dateEpochSeconds = String(Math.floor(msVal / 1000));
          dateEpochMilliseconds = String(msVal);
          dateIsoStr = new Date(msVal).toISOString();
        }
      } catch {
        dateError = "Parse error: Unable to create valid date from parts.";
      }
    }

    return {
      dateError,
      dateEpochSeconds,
      dateEpochMilliseconds,
      dateIsoStr,
      dateIsLeap,
      daysInMonth,
    };
  }, [dateParts, targetTimezone]);

  const {
    dateError,
    dateEpochSeconds,
    dateEpochMilliseconds,
    dateIsoStr,
    dateIsLeap,
  } = dateDatum;

  const pickerValue = useMemo(
    () =>
      `${String(dateParts.year).padStart(4, "0")}-${String(dateParts.month).padStart(2, "0")}-${String(dateParts.day).padStart(2, "0")}T${String(dateParts.hour).padStart(2, "0")}:${String(dateParts.minute).padStart(2, "0")}:${String(dateParts.second).padStart(2, "0")}`,
    [dateParts],
  );

  const handleUseCurrent = useCallback(() => {
    const isMs =
      epochUnit === "milliseconds" ||
      (epochUnit === "auto" && detectUnit(liveTime) === "milliseconds");
    const val = isMs ? String(liveTime) : String(Math.floor(liveTime / 1000));
    setEpochInput(val);
    toast.success("Loaded current system epoch timestamp");
  }, [epochUnit, liveTime]);

  const handleDatePickerChange = (val: string) => {
    if (!val) return;
    const parts = val.split("T");
    const dateSegment = parts[0].split("-");
    const timeSegment = (parts[1] || "00:00:00").split(":");

    setDateParts((prev) => ({
      ...prev,
      year: parseInt(dateSegment[0], 10) || prev.year,
      month: parseInt(dateSegment[1], 10) || prev.month,
      day: parseInt(dateSegment[2], 10) || prev.day,
      hour: parseInt(timeSegment[0], 10) || 0,
      minute: parseInt(timeSegment[1], 10) || 0,
      second: parseInt(timeSegment[2] || "0", 10) || 0,
    }));
  };

  const handlePartChange = (field: keyof typeof dateParts, valStr: string) => {
    const val = parseInt(valStr, 10);
    setDateParts((prev) => ({
      ...prev,
      [field]: isNaN(val) ? 0 : val,
    }));
  };

  const handleCopyText = (text: string, label: string) => {
    if (!text) {
      toast.error("Nothing to copy!");
      return;
    }
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success(`Copied ${label} to clipboard`))
      .catch(() => toast.error(`Failed to copy ${label}`));
  };

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey) {
        const key = e.key.toLowerCase();
        if (key === "u") {
          e.preventDefault();
          handleUseCurrent();
        } else if (key === "p") {
          e.preventDefault();
          setIsClockRunning((prev) => {
            const nextState = !prev;
            toast.info(nextState ? "Live Clock running" : "Live Clock paused");
            return nextState;
          });
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUseCurrent]);

  return (
    <div className="card-premium p-6 md:p-8 space-y-8 animate-slide-up max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Timestamp Converter</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Convert Unix epoch timestamps to human-readable dates, relative times, and vice versa.
          </p>
        </div>
        <FavoriteButton toolId="timestamp-tool" />
      </div>

      {/* Live Clock Card Dashboard */}
      <div className="relative overflow-hidden p-5 rounded-2xl bg-muted/40 border border-border/50 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
          <Clock className="size-44" />
        </div>

        <div className="flex flex-col gap-1 w-full md:w-auto relative">
          <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
            <span
              className={cn(
                "size-2 rounded-full",
                isClockRunning ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/30",
              )}
            />
            Live System Clock
          </h4>
          <div className="flex flex-col sm:flex-row items-baseline gap-x-4 gap-y-1 mt-1">
            <span className="text-2xl font-mono font-bold text-foreground tracking-tight tabular-nums">
              {Math.floor(liveTime / 1000)}
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              .{String(liveTime % 1000).padStart(3, "0")} seconds
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 font-semibold truncate max-w-xs md:max-w-md">
            GMT / UTC: {new Date(liveTime).toUTCString()}
          </p>
          <p className="text-[11px] text-muted-foreground font-semibold truncate max-w-xs md:max-w-md">
            Local time: {new Date(liveTime).toString().split(" (")[0]}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsClockRunning((p) => !p)}
            className="h-9 rounded-xl text-xs gap-1.5 hover:bg-card cursor-pointer active:scale-95 transition-all"
            aria-label={isClockRunning ? "Pause live clock" : "Resume live clock"}
          >
            {isClockRunning ? (
              <>
                <Pause className="size-3.5" />
                Pause Clock
              </>
            ) : (
              <>
                <Play className="size-3.5" />
                Resume Clock
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleCopyText(String(Math.floor(liveTime / 1000)), "Unix timestamp")}
            className="h-9 rounded-xl text-xs gap-1.5 hover:bg-card cursor-pointer active:scale-95 transition-all"
            aria-label="Copy live unix timestamp in seconds"
          >
            <Copy className="size-3.5" />
            Copy Sec
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleCopyText(String(liveTime), "Milliseconds timestamp")}
            className="h-9 rounded-xl text-xs gap-1.5 hover:bg-card cursor-pointer active:scale-95 transition-all"
            aria-label="Copy live unix timestamp in milliseconds"
          >
            <Copy className="size-3.5" />
            Copy MS
          </Button>
          <Button
            onClick={handleUseCurrent}
            size="sm"
            className="h-9 rounded-full text-xs font-semibold cursor-pointer active:scale-95 transition-all shadow-sm"
            aria-label="Load current timestamp into converter"
          >
            <RefreshCw className="size-3.5 mr-1" />
            Use Current
          </Button>
        </div>
      </div>

      {/* Main Conversion Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN: Epoch to Date */}
        <div className="rounded-2xl border border-border/40 bg-muted/30 p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-1">
            <h3 className="font-semibold text-sm flex items-center gap-2 text-foreground">
              <Clock className="size-4 text-muted-foreground" />
              Unix Epoch &rarr; Date
            </h3>
            <p className="text-xs text-muted-foreground">
              Translate unix timestamps into UTC, local dates, and relative scopes.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="epoch-val-input"
                className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider"
              >
                Unix Timestamp Input
              </label>
              <div className="flex gap-2.5">
                <Input
                  id="epoch-val-input"
                  placeholder="e.g. 1719662400"
                  value={epochInput}
                  onChange={(e) => setEpochInput(e.target.value)}
                  className="font-mono text-sm h-10 rounded-xl"
                />
                <Select
                  value={epochUnit}
                  onValueChange={(value) =>
                    setEpochUnit(value as "auto" | "seconds" | "milliseconds")
                  }
                >
                  <SelectTrigger className="w-36 h-10 rounded-xl bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="auto">Auto Detect</SelectItem>
                    <SelectItem value="seconds">Seconds (s)</SelectItem>
                    <SelectItem value="milliseconds">Milliseconds (ms)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {epochInput && !epochError && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1.5 pl-0.5">
                  <span>Unit detected:</span>
                  <Badge variant="outline" className="text-[9px] font-mono font-bold px-2 py-0 rounded-full border-border bg-card">
                    {activeUnitText}
                  </Badge>
                  {epochIsLeap !== null && (
                    <>
                      <span>•</span>
                      <span>Leap Year:</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[9px] font-bold px-2 py-0 rounded-full",
                          epochIsLeap
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-muted text-muted-foreground border-border",
                        )}
                      >
                        {epochIsLeap ? "Yes" : "No"}
                      </Badge>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Error Notification */}
            {epochError && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl border text-xs bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/50 animate-scale-in">
                <AlertCircle className="size-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                <span>{epochError}</span>
              </div>
            )}

            {/* Conversions Output fields */}
            <div className="space-y-3.5 pt-2 border-t border-border/40">
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center px-0.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    GMT / UTC Date
                  </span>
                  {epochUtcStr && (
                    <button
                      onClick={() => handleCopyText(epochUtcStr, "UTC Date")}
                      className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                      aria-label="Copy UTC string"
                    >
                      <Copy className="size-3" />
                      Copy
                    </button>
                  )}
                </div>
                <Input
                  readOnly
                  placeholder="GMT / UTC timezone output date"
                  value={epochUtcStr}
                  className="font-mono text-xs bg-card/65 cursor-default h-9 focus-visible:ring-0 rounded-xl"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center px-0.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Local Timezone Date
                  </span>
                  {epochLocalStr && (
                    <button
                      onClick={() => handleCopyText(epochLocalStr, "Local Date")}
                      className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                      aria-label="Copy Local Date string"
                    >
                      <Copy className="size-3" />
                      Copy
                    </button>
                  )}
                </div>
                <Input
                  readOnly
                  placeholder="Local timezone output date"
                  value={epochLocalStr}
                  className="font-mono text-xs bg-card/65 cursor-default h-9 focus-visible:ring-0 rounded-xl"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center px-0.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    ISO 8601 Format
                  </span>
                  {epochIsoStr && (
                    <button
                      onClick={() => handleCopyText(epochIsoStr, "ISO Date")}
                      className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                      aria-label="Copy ISO 8601 string"
                    >
                      <Copy className="size-3" />
                      Copy
                    </button>
                  )}
                </div>
                <Input
                  readOnly
                  placeholder="ISO 8601 formatting"
                  value={epochIsoStr}
                  className="font-mono text-xs bg-card/65 cursor-default h-9 focus-visible:ring-0 rounded-xl"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center px-0.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Relative Time Diff
                  </span>
                  {epochRelativeStr && (
                    <button
                      onClick={() => handleCopyText(epochRelativeStr, "Relative Date")}
                      className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                      aria-label="Copy Relative Time description"
                    >
                      <Copy className="size-3" />
                      Copy
                    </button>
                  )}
                </div>
                <Input
                  readOnly
                  placeholder="Relative distance description"
                  value={epochRelativeStr}
                  className="font-mono text-xs bg-card/65 cursor-default h-9 focus-visible:ring-0 rounded-xl"
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Date to Epoch */}
        <div className="rounded-2xl border border-border/40 bg-muted/30 p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-1">
            <h3 className="font-semibold text-sm flex items-center gap-2 text-foreground">
              <Calendar className="size-4 text-muted-foreground" />
              Date &rarr; Unix Epoch
            </h3>
            <p className="text-xs text-muted-foreground">
              Deconstruct dates into epochs and timestamps using local or UTC timezone.
            </p>
          </div>

          <div className="space-y-4">
            {/* Timezone and Picker */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="calendar-picker-input"
                  className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider"
                >
                  Calendar DateTime Picker
                </label>
                <Input
                  id="calendar-picker-input"
                  type="datetime-local"
                  value={pickerValue}
                  step="1"
                  onChange={(e) => handleDatePickerChange(e.target.value)}
                  className="text-xs h-10 bg-card rounded-xl border border-border"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="timezone-scope-select"
                  className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider"
                >
                  Timezone Scope
                </label>
                <Select
                  value={targetTimezone}
                  onValueChange={(value) =>
                    setTargetTimezone(value as "local" | "utc")
                  }
                >
                  <SelectTrigger
                    id="timezone-scope-select"
                    className="w-full h-10 rounded-xl bg-card border border-border"
                    aria-label="Select target timezone interpreter"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="local">
                      Local (
                      {Intl.DateTimeFormat().resolvedOptions().timeZone})
                    </SelectItem>
                    <SelectItem value="utc">UTC timezone</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Individual numeric inputs */}
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mt-1">
              {[
                { label: "Year", field: "year", min: -9999, max: 99999, placeholder: "YYYY" },
                { label: "Month", field: "month", min: 1, max: 12, placeholder: "MM" },
                { label: "Day", field: "day", min: 1, max: 31, placeholder: "DD" },
                { label: "Hour", field: "hour", min: 0, max: 23, placeholder: "Hr" },
                { label: "Min", field: "minute", min: 0, max: 59, placeholder: "Mn" },
                { label: "Sec", field: "second", min: 0, max: 59, placeholder: "Sc" },
                { label: "MS", field: "millisecond", min: 0, max: 999, placeholder: "Ms" },
              ].map((inp) => (
                <div key={inp.field} className="flex flex-col gap-1">
                  <label
                    htmlFor={`date-part-${inp.field}`}
                    className="text-[9px] font-bold text-muted-foreground text-center uppercase tracking-wider"
                  >
                    {inp.label}
                  </label>
                  <Input
                    id={`date-part-${inp.field}`}
                    type="number"
                    min={inp.min}
                    max={inp.max}
                    placeholder={inp.placeholder}
                    value={dateParts[inp.field as keyof typeof dateParts] || ""}
                    onChange={(e) =>
                      handlePartChange(
                        inp.field as keyof typeof dateParts,
                        e.target.value,
                      )
                    }
                    className="text-center font-mono text-xs p-1 h-8 rounded-xl bg-card border-border [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              ))}
            </div>

            {/* Leap year check details */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1.5 pl-0.5">
              <span>Selected Year Leap Status:</span>
              <Badge
                variant="outline"
                className={cn(
                  "text-[9px] font-bold px-2 py-0 rounded-full",
                  dateIsLeap
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-muted text-muted-foreground border-border",
                )}
              >
                {dateIsLeap ? "Leap Year" : "Normal Year"}
              </Badge>
            </div>

            {/* Validation Errors */}
            {dateError && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl border text-xs bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/50 animate-scale-in">
                <AlertCircle className="size-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                <span>{dateError}</span>
              </div>
            )}

            {/* Result Epochs outputs */}
            <div className="space-y-3.5 pt-2 border-t border-border/40">
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center px-0.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Epoch Seconds (s)
                  </span>
                  {dateEpochSeconds && (
                    <button
                      onClick={() => handleCopyText(dateEpochSeconds, "Epoch seconds")}
                      className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                      aria-label="Copy Epoch seconds"
                    >
                      <Copy className="size-3" />
                      Copy
                    </button>
                  )}
                </div>
                <Input
                  readOnly
                  placeholder="Epoch seconds output"
                  value={dateEpochSeconds}
                  className="font-mono text-xs bg-card/65 cursor-default h-9 focus-visible:ring-0 rounded-xl"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center px-0.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Epoch Milliseconds (ms)
                  </span>
                  {dateEpochMilliseconds && (
                    <button
                      onClick={() => handleCopyText(dateEpochMilliseconds, "Epoch milliseconds")}
                      className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                      aria-label="Copy Epoch milliseconds"
                    >
                      <Copy className="size-3" />
                      Copy
                    </button>
                  )}
                </div>
                <Input
                  readOnly
                  placeholder="Epoch milliseconds output"
                  value={dateEpochMilliseconds}
                  className="font-mono text-xs bg-card/65 cursor-default h-9 focus-visible:ring-0 rounded-xl"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center px-0.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    ISO 8601 Equivalent
                  </span>
                  {dateIsoStr && (
                    <button
                      onClick={() => handleCopyText(dateIsoStr, "ISO date")}
                      className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                      aria-label="Copy ISO 8601 date string"
                    >
                      <Copy className="size-3" />
                      Copy
                    </button>
                  )}
                </div>
                <Input
                  readOnly
                  placeholder="ISO 8601 formatting equivalent"
                  value={dateIsoStr}
                  className="font-mono text-xs bg-card/65 cursor-default h-9 focus-visible:ring-0 rounded-xl"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Helper Panel */}
      <div className="text-[11px] font-semibold text-muted-foreground flex flex-wrap gap-x-6 gap-y-2 justify-center sm:justify-start border-t border-border/50 pt-5">
        <span className="text-foreground uppercase tracking-wider text-[10px] font-bold">
          Keyboard Shortcuts
        </span>
        <span className="flex items-center gap-2">
          <kbd className="bg-muted px-2 py-0.5 rounded-lg border border-border font-mono shadow-sm text-foreground text-[10px] font-bold">
            Alt + U
          </kbd>
          <span>Use current system timestamp</span>
        </span>
        <span className="flex items-center gap-2">
          <kbd className="bg-muted px-2 py-0.5 rounded-lg border border-border font-mono shadow-sm text-foreground text-[10px] font-bold">
            Alt + P
          </kbd>
          <span>Toggle live system clock</span>
        </span>
      </div>
    </div>
  );
}

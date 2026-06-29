"use client";

import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState, useCallback, useEffect, useMemo } from "react";
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
} from "lucide-react";

// ─── Constants & Date Helpers ─────────────────────────────────────────────────

const MIN_SAFE_MS = -8.64e15;
const MAX_SAFE_MS = 8.64e15;

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function detectUnit(val: number): "seconds" | "milliseconds" {
  // Over 3e10 in seconds is Oct 13, 2920. In milliseconds, it's Dec 13, 1970.
  // So absolute value >= 3e10 is the industry standard for milliseconds threshold.
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
          "Invalid character: Epoch must be a numeric value (e.g. digits only, optionally starting with a minus sign).";
      } else {
        const numVal = parseFloat(trimmedEpoch);
        const unit = epochUnit === "auto" ? detectUnit(numVal) : epochUnit;
        activeUnitText =
          unit === "seconds" ? "Seconds (s)" : "Milliseconds (ms)";

        const msVal = unit === "seconds" ? numVal * 1000 : numVal;

        if (msVal < MIN_SAFE_MS || msVal > MAX_SAFE_MS) {
          epochError =
            "Out of range: Unix Epoch limits exceeded (Supported range: ±100,000,000 days from Jan 1, 1970).";
        } else {
          const dateObj = new Date(msVal);
          if (isNaN(dateObj.getTime())) {
            epochError =
              "Parse error: Internal JavaScript date validation failed.";
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

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleUseCurrent = useCallback(() => {
    const isMs =
      epochUnit === "milliseconds" ||
      (epochUnit === "auto" && detectUnit(liveTime) === "milliseconds");
    const val = isMs ? String(liveTime) : String(Math.floor(liveTime / 1000));
    setEpochInput(val);
    toast.success("Current time loaded into Epoch Converter");
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

  // ─── Keyboard Shortcuts Listener ───────────────────────────────────────────
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
    <div className="flex flex-col gap-6 p-6 bg-card rounded-xl border border-border shadow-sm max-w-6xl mx-auto animate-in fade-in duration-300">
      {/* Live Clock Card Dashboard */}
      <div className="relative overflow-hidden p-6 rounded-xl bg-muted/40 border border-border flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <Clock className="size-48" />
        </div>

        <div className="flex flex-col gap-1 w-full md:w-auto">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <span
              className={cn(
                "size-2 rounded-full",
                isClockRunning ? "bg-emerald-500 animate-pulse" : "bg-muted",
              )}
            />
            Live System Clock
          </h4>
          <div className="flex flex-col sm:flex-row items-baseline gap-x-4 gap-y-1 mt-1">
            <span className="text-2xl font-mono font-bold text-foreground">
              {Math.floor(liveTime / 1000)}
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              .{String(liveTime % 1000).padStart(3, "0")} seconds
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            UTC: {new Date(liveTime).toUTCString()}
          </p>
          <p className="text-xs text-muted-foreground">
            Local: {new Date(liveTime).toString().split(" (")[0]}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsClockRunning((p) => !p)}
            className="cursor-pointer"
            aria-label={
              isClockRunning ? "Pause live clock" : "Resume live clock"
            }
          >
            {isClockRunning ? (
              <>
                <Pause className="size-3.5 mr-1" />
                Pause
              </>
            ) : (
              <>
                <Play className="size-3.5 mr-1" />
                Resume
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              handleCopyText(
                String(Math.floor(liveTime / 1000)),
                "Unix timestamp",
              )
            }
            className="cursor-pointer"
            aria-label="Copy live unix timestamp in seconds"
          >
            <Copy className="size-3.5 mr-1" />
            Copy Sec
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              handleCopyText(String(liveTime), "Milliseconds timestamp")
            }
            className="cursor-pointer"
            aria-label="Copy live unix timestamp in milliseconds"
          >
            <Copy className="size-3.5 mr-1" />
            Copy MS
          </Button>
          <Button
            onClick={handleUseCurrent}
            size="sm"
            className="cursor-pointer"
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
        <div className="flex flex-col gap-4 p-5 rounded-xl border border-border bg-card shadow-inner">
          <div>
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <span className="p-1 rounded-md bg-primary/10 text-primary">
                <Clock className="size-4" />
              </span>
              Unix Epoch &rarr; Date
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Translate unix timestamp values to UTC, local time, and relative
              strings.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="epoch-val-input"
                className="text-xs font-semibold text-muted-foreground uppercase"
              >
                Unix Timestamp
              </label>
              <div className="flex gap-2">
                <Input
                  id="epoch-val-input"
                  placeholder="e.g. 1719662400"
                  value={epochInput}
                  onChange={(e) => setEpochInput(e.target.value)}
                  className="font-mono text-sm h-9 flex-1"
                />
                <Select
                  value={epochUnit}
                  onValueChange={(value) =>
                    setEpochUnit(value as "auto" | "seconds" | "milliseconds")
                  }
                >
                  <SelectTrigger className="w-35 h-9">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="auto">Auto Detect</SelectItem>
                    <SelectItem value="seconds">Seconds (s)</SelectItem>
                    <SelectItem value="milliseconds">
                      Milliseconds (ms)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {epochInput && !epochError && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                  <span>Detected Unit:</span>
                  <Badge
                    variant="secondary"
                    className="text-[10px] py-0 px-1.5 font-mono"
                  >
                    {activeUnitText}
                  </Badge>
                  {epochIsLeap !== null && (
                    <>
                      <span className="mx-1">•</span>
                      <span>Leap Year:</span>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px] py-0 px-1.5",
                          epochIsLeap
                            ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/10 border-emerald-500/20"
                            : "bg-muted text-muted-foreground",
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
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-lg flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span>{epochError}</span>
              </div>
            )}

            {/* Conversions Output fields */}
            <div className="flex flex-col gap-2.5 mt-2">
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase">
                    GMT / UTC Time
                  </span>
                  {epochUtcStr && (
                    <button
                      onClick={() => handleCopyText(epochUtcStr, "UTC Date")}
                      className="text-[10px] font-medium text-primary hover:underline flex items-center gap-1"
                      aria-label="Copy UTC string"
                    >
                      <Copy className="size-3" />
                      Copy
                    </button>
                  )}
                </div>
                <Input
                  readOnly
                  placeholder="GMT date output"
                  value={epochUtcStr}
                  className="font-mono text-xs bg-muted/20 cursor-default h-8 focus-visible:ring-0"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase">
                    Local timezone time
                  </span>
                  {epochLocalStr && (
                    <button
                      onClick={() =>
                        handleCopyText(epochLocalStr, "Local Date")
                      }
                      className="text-[10px] font-medium text-primary hover:underline flex items-center gap-1"
                      aria-label="Copy Local Date string"
                    >
                      <Copy className="size-3" />
                      Copy
                    </button>
                  )}
                </div>
                <Input
                  readOnly
                  placeholder="Local date output"
                  value={epochLocalStr}
                  className="font-mono text-xs bg-muted/20 cursor-default h-8 focus-visible:ring-0"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase">
                    ISO 8601
                  </span>
                  {epochIsoStr && (
                    <button
                      onClick={() => handleCopyText(epochIsoStr, "ISO Date")}
                      className="text-[10px] font-medium text-primary hover:underline flex items-center gap-1"
                      aria-label="Copy ISO 8601 string"
                    >
                      <Copy className="size-3" />
                      Copy
                    </button>
                  )}
                </div>
                <Input
                  readOnly
                  placeholder="ISO 8601 date string"
                  value={epochIsoStr}
                  className="font-mono text-xs bg-muted/20 cursor-default h-8 focus-visible:ring-0"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase">
                    Relative Time
                  </span>
                  {epochRelativeStr && (
                    <button
                      onClick={() =>
                        handleCopyText(epochRelativeStr, "Relative Date")
                      }
                      className="text-[10px] font-medium text-primary hover:underline flex items-center gap-1"
                      aria-label="Copy Relative Time description"
                    >
                      <Copy className="size-3" />
                      Copy
                    </button>
                  )}
                </div>
                <Input
                  readOnly
                  placeholder="Relative date description"
                  value={epochRelativeStr}
                  className="font-mono text-xs bg-muted/20 cursor-default h-8 focus-visible:ring-0"
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Date to Epoch */}
        <div className="flex flex-col gap-4 p-5 rounded-xl border border-border bg-card shadow-inner">
          <div>
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <span className="p-1 rounded-md bg-primary/10 text-primary">
                <Calendar className="size-4" />
              </span>
              Date &rarr; Unix Epoch
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Enter discrete date properties or select via picker to fetch
              timestamps.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {/* Timezone and Picker */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="calendar-picker-input"
                  className="text-xs font-semibold text-muted-foreground uppercase"
                >
                  Calendar Picker
                </label>
                <Input
                  id="calendar-picker-input"
                  type="datetime-local"
                  value={pickerValue}
                  step="1"
                  onChange={(e) => handleDatePickerChange(e.target.value)}
                  className="text-sm h-9 bg-background"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="timezone-scope-select"
                  className="text-xs font-semibold text-muted-foreground uppercase"
                >
                  Timezone interpretation
                </label>
                <Select
                  value={targetTimezone}
                  onValueChange={(value) =>
                    setTargetTimezone(value as "local" | "utc")
                  }
                >
                  <SelectTrigger
                    id="timezone-scope-select"
                    className="w-full h-9"
                    aria-label="Select target timezone interpreter"
                  >
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="local">
                      Local Time (
                      {Intl.DateTimeFormat().resolvedOptions().timeZone})
                    </SelectItem>

                    <SelectItem value="utc">
                      Coordinated Universal Time (UTC)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Individual numeric inputs */}
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mt-1">
              {[
                {
                  label: "Year",
                  field: "year",
                  min: -9999,
                  max: 99999,
                  placeholder: "YYYY",
                },
                {
                  label: "Month",
                  field: "month",
                  min: 1,
                  max: 12,
                  placeholder: "MM",
                },
                {
                  label: "Day",
                  field: "day",
                  min: 1,
                  max: 31,
                  placeholder: "DD",
                },
                {
                  label: "Hour",
                  field: "hour",
                  min: 0,
                  max: 23,
                  placeholder: "Hr",
                },
                {
                  label: "Min",
                  field: "minute",
                  min: 0,
                  max: 59,
                  placeholder: "Mn",
                },
                {
                  label: "Sec",
                  field: "second",
                  min: 0,
                  max: 59,
                  placeholder: "Sc",
                },
                {
                  label: "MS",
                  field: "millisecond",
                  min: 0,
                  max: 999,
                  placeholder: "Ms",
                },
              ].map((inp) => (
                <div key={inp.field} className="flex flex-col gap-1">
                  <label
                    htmlFor={`date-part-${inp.field}`}
                    className="text-[10px] font-bold text-muted-foreground text-center uppercase"
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
                    className="text-center font-mono text-xs p-1 h-7 rounded-md [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              ))}
            </div>

            {/* Leap year check details */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
              <span>Selected Year Leap Status:</span>
              <Badge
                variant="secondary"
                className={cn(
                  "text-[10px] py-0 px-1.5",
                  dateIsLeap
                    ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/10 border-emerald-500/20"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {dateIsLeap ? "Leap Year" : "Normal Year"}
              </Badge>
            </div>

            {/* Validation Errors */}
            {dateError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-lg flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span>{dateError}</span>
              </div>
            )}

            {/* Result Epochs outputs */}
            <div className="flex flex-col gap-2.5 mt-2">
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase">
                    Epoch seconds
                  </span>
                  {dateEpochSeconds && (
                    <button
                      onClick={() =>
                        handleCopyText(dateEpochSeconds, "Epoch seconds")
                      }
                      className="text-[10px] font-medium text-primary hover:underline flex items-center gap-1"
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
                  className="font-mono text-xs bg-muted/20 cursor-default h-8 focus-visible:ring-0"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase">
                    Epoch milliseconds
                  </span>
                  {dateEpochMilliseconds && (
                    <button
                      onClick={() =>
                        handleCopyText(
                          dateEpochMilliseconds,
                          "Epoch milliseconds",
                        )
                      }
                      className="text-[10px] font-medium text-primary hover:underline flex items-center gap-1"
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
                  className="font-mono text-xs bg-muted/20 cursor-default h-8 focus-visible:ring-0"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase">
                    Formatted ISO 8601
                  </span>
                  {dateIsoStr && (
                    <button
                      onClick={() => handleCopyText(dateIsoStr, "ISO date")}
                      className="text-[10px] font-medium text-primary hover:underline flex items-center gap-1"
                      aria-label="Copy ISO 8601 date string"
                    >
                      <Copy className="size-3" />
                      Copy
                    </button>
                  )}
                </div>
                <Input
                  readOnly
                  placeholder="ISO 8601 date output"
                  value={dateIsoStr}
                  className="font-mono text-xs bg-muted/20 cursor-default h-8 focus-visible:ring-0"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Helper Panel */}
      <div className="text-[11px] text-muted-foreground flex flex-wrap gap-x-4 gap-y-1.5 justify-center sm:justify-start border-t border-border pt-4">
        <span className="font-semibold text-foreground">
          Keyboard Shortcuts:
        </span>
        <span className="flex items-center gap-1">
          <kbd className="bg-muted px-1.5 py-0.5 rounded border border-border font-mono shadow-sm">
            Alt + U
          </kbd>{" "}
          Load current system time into converter
        </span>
        <span className="flex items-center gap-1">
          <kbd className="bg-muted px-1.5 py-0.5 rounded border border-border font-mono shadow-sm">
            Alt + P
          </kbd>{" "}
          Toggle Live System Clock Play/Pause
        </span>
      </div>
    </div>
  );
}

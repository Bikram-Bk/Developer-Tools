"use client";

import * as React from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useState, useMemo, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Copy,
  AlertCircle,
  CheckCircle,
  XCircle,
  Palette,
  Contrast,
  Pipette,
  RefreshCw,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RGB {
  r: number;
  g: number;
  b: number;
}

interface HSL {
  h: number;
  s: number;
  l: number;
}

interface PaletteColor {
  hex: string;
  rgb: RGB;
  hsl: HSL;
  name: string;
}

// ─── Color Conversion Helpers ─────────────────────────────────────────────────

function hexToRgb(hex: string): RGB | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1).toUpperCase()}`;
}

function rgbToHsl(r: number, g: number, b: number): HSL {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const delta = max - min;

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);

    switch (max) {
      case rNorm:
        h = ((gNorm - bNorm) / delta + (gNorm < bNorm ? 6 : 0)) / 6;
        break;
      case gNorm:
        h = ((bNorm - rNorm) / delta + 2) / 6;
        break;
      case bNorm:
        h = ((rNorm - gNorm) / delta + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

function hslToRgb(h: number, s: number, l: number): RGB {
  const sNorm = s / 100;
  const lNorm = l / 100;
  const hNorm = h / 360;

  let r: number, g: number, b: number;

  if (sNorm === 0) {
    r = g = b = lNorm;
  } else {
    const hue2rgb = (p: number, q: number, t: number): number => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = lNorm < 0.5 ? lNorm * (1 + sNorm) : lNorm + sNorm - lNorm * sNorm;
    const p = 2 * lNorm - q;

    r = hue2rgb(p, q, hNorm + 1 / 3);
    g = hue2rgb(p, q, hNorm);
    b = hue2rgb(p, q, hNorm - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

// ─── WCAG Contrast Calculation ────────────────────────────────────────────────

function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(rgb1: RGB, rgb2: RGB): number {
  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

// ─── Palette Generation ───────────────────────────────────────────────────────

function generatePalette(baseHex: string): PaletteColor[] {
  const rgb = hexToRgb(baseHex);
  if (!rgb) return [];

  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

  const paletteConfigs = [
    { name: "Base", h: hsl.h, s: hsl.s, l: hsl.l },
    { name: "Lighter", h: hsl.h, s: hsl.s, l: Math.min(hsl.l + 20, 95) },
    { name: "Light", h: hsl.h, s: hsl.s, l: Math.min(hsl.l + 10, 90) },
    { name: "Dark", h: hsl.h, s: hsl.s, l: Math.max(hsl.l - 10, 10) },
    { name: "Darker", h: hsl.h, s: hsl.s, l: Math.max(hsl.l - 20, 5) },
    { name: "Muted", h: hsl.h, s: Math.max(hsl.s - 30, 10), l: hsl.l },
    { name: "Vibrant", h: hsl.h, s: Math.min(hsl.s + 20, 100), l: hsl.l },
    { name: "Complement", h: (hsl.h + 180) % 360, s: hsl.s, l: hsl.l },
    { name: "Analogous 1", h: (hsl.h + 30) % 360, s: hsl.s, l: hsl.l },
    { name: "Analogous 2", h: (hsl.h - 30 + 360) % 360, s: hsl.s, l: hsl.l },
    { name: "Triadic 1", h: (hsl.h + 120) % 360, s: hsl.s, l: hsl.l },
    { name: "Triadic 2", h: (hsl.h + 240) % 360, s: hsl.s, l: hsl.l },
  ];

  return paletteConfigs.map((config) => {
    const newRgb = hslToRgb(config.h, config.s, config.l);
    return {
      hex: rgbToHex(newRgb.r, newRgb.g, newRgb.b),
      rgb: newRgb,
      hsl: { h: config.h, s: config.s, l: config.l },
      name: config.name,
    };
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ColorPicker() {
  const [color, setColor] = useState("#3B82F6");
  const [hexInput, setHexInput] = useState("#3B82F6");
  const [rgbInput, setRgbInput] = useState({ r: "59", g: "130", b: "246" });
  const [hslInput, setHslInput] = useState({ h: "217", s: "91", l: "60" });
  const [hexError, setHexError] = useState<string | null>(null);
  const [rgbError, setRgbError] = useState<string | null>(null);
  const [hslError, setHslError] = useState<string | null>(null);

  // Contrast Checker
  const [fgColor, setFgColor] = useState("#FFFFFF");
  const [bgColor, setBgColor] = useState("#3B82F6");
  const [fgHexInput, setFgHexInput] = useState("#FFFFFF");
  const [bgHexInput, setBgHexInput] = useState("#3B82F6");

  // ─── Derived Values ─────────────────────────────────────────────────────────
  const currentRgb = useMemo(() => hexToRgb(color), [color]);
  const currentHsl = useMemo(() => {
    if (!currentRgb) return null;
    return rgbToHsl(currentRgb.r, currentRgb.g, currentRgb.b);
  }, [currentRgb]);

  const fgRgb = useMemo(() => hexToRgb(fgColor), [fgColor]);
  const bgRgb = useMemo(() => hexToRgb(bgColor), [bgColor]);

  const contrastRatio = useMemo(() => {
    if (!fgRgb || !bgRgb) return null;
    return getContrastRatio(fgRgb, bgRgb);
  }, [fgRgb, bgRgb]);

  const wcagResults = useMemo(() => {
    if (contrastRatio === null) return null;
    return {
      AALarge: contrastRatio >= 3,
      AANormal: contrastRatio >= 4.5,
      AAALarge: contrastRatio >= 4.5,
      AAANormal: contrastRatio >= 7,
    };
  }, [contrastRatio]);

  const palette = useMemo(() => generatePalette(color), [color]);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleColorPickerChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newColor = e.target.value.toUpperCase();
      setColor(newColor);
      setHexInput(newColor);
      setHexError(null);

      const rgb = hexToRgb(newColor);
      if (rgb) {
        setRgbInput({ r: String(rgb.r), g: String(rgb.g), b: String(rgb.b) });
        const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
        setHslInput({ h: String(hsl.h), s: String(hsl.s), l: String(hsl.l) });
        setRgbError(null);
        setHslError(null);
      }
    },
    [],
  );

  const handleHexInputChange = useCallback((value: string) => {
    setHexInput(value);
    const cleanHex = value.startsWith("#") ? value : `#${value}`;
    const rgb = hexToRgb(cleanHex);

    if (rgb) {
      setHexError(null);
      setColor(cleanHex.toUpperCase());
      setRgbInput({ r: String(rgb.r), g: String(rgb.g), b: String(rgb.b) });
      const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
      setHslInput({ h: String(hsl.h), s: String(hsl.s), l: String(hsl.l) });
    } else if (value.length >= 6) {
      setHexError("Invalid HEX color format");
    } else {
      setHexError(null);
    }
  }, []);

  const handleRgbInputChange = useCallback(
    (channel: "r" | "g" | "b", value: string) => {
      const newRgb = { ...rgbInput, [channel]: value };
      setRgbInput(newRgb);

      const r = parseInt(newRgb.r);
      const g = parseInt(newRgb.g);
      const b = parseInt(newRgb.b);

      if (
        isNaN(r) ||
        isNaN(g) ||
        isNaN(b) ||
        r < 0 ||
        r > 255 ||
        g < 0 ||
        g > 255 ||
        b < 0 ||
        b > 255
      ) {
        setRgbError("RGB values must be between 0 and 255");
        return;
      }

      setRgbError(null);
      const hex = rgbToHex(r, g, b);
      setColor(hex);
      setHexInput(hex);
      const hsl = rgbToHsl(r, g, b);
      setHslInput({ h: String(hsl.h), s: String(hsl.s), l: String(hsl.l) });
    },
    [rgbInput],
  );

  const handleHslInputChange = useCallback(
    (channel: "h" | "s" | "l", value: string) => {
      const newHsl = { ...hslInput, [channel]: value };
      setHslInput(newHsl);

      const h = parseInt(newHsl.h);
      const s = parseInt(newHsl.s);
      const l = parseInt(newHsl.l);

      if (
        isNaN(h) ||
        isNaN(s) ||
        isNaN(l) ||
        h < 0 ||
        h > 360 ||
        s < 0 ||
        s > 100 ||
        l < 0 ||
        l > 100
      ) {
        setHslError(`HSL: H=0-360, S=0-100, L=0-100`);
        return;
      }

      setHslError(null);
      const rgb = hslToRgb(h, s, l);
      const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
      setColor(hex);
      setHexInput(hex);
      setRgbInput({ r: String(rgb.r), g: String(rgb.g), b: String(rgb.b) });
    },
    [hslInput],
  );

  const handleFgColorChange = useCallback((value: string) => {
    const cleanHex = value.startsWith("#") ? value : `#${value}`;
    setFgHexInput(value);
    const rgb = hexToRgb(cleanHex);
    if (rgb) {
      setFgColor(cleanHex.toUpperCase());
    }
  }, []);

  const handleBgColorChange = useCallback((value: string) => {
    const cleanHex = value.startsWith("#") ? value : `#${value}`;
    setBgHexInput(value);
    const rgb = hexToRgb(cleanHex);
    if (rgb) {
      setBgColor(cleanHex.toUpperCase());
    }
  }, []);

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
    setColor("#3B82F6");
    setHexInput("#3B82F6");
    setRgbInput({ r: "59", g: "130", b: "246" });
    setHslInput({ h: "217", s: "91", l: "60" });
    setHexError(null);
    setRgbError(null);
    setHslError(null);
    setFgColor("#FFFFFF");
    setBgColor("#3B82F6");
    setFgHexInput("#FFFFFF");
    setBgHexInput("#3B82F6");
    toast.success("Reset to default color");
  }, []);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 p-6 bg-card rounded-xl border border-border shadow-sm max-w-6xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Color Picker</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pick colors, convert between formats, check contrast, and generate
            palettes
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ─── Left Column - Color Picker & Inputs ────────────────────────── */}
        <div className="flex flex-col gap-4">
          {/* Color Preview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Pipette className="size-4" />
                Color Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="w-full h-32 rounded-lg border border-border shadow-inner transition-colors duration-200"
                style={{ backgroundColor: color }}
                aria-label={`Color preview: ${color}`}
                role="img"
              />
              <div className="mt-3">
                <label
                  htmlFor="native-color-picker"
                  className="text-xs font-semibold text-muted-foreground uppercase"
                >
                  Native Color Picker
                </label>
                <Input
                  id="native-color-picker"
                  type="color"
                  value={color}
                  onChange={handleColorPickerChange}
                  className="mt-1 h-10 w-full cursor-pointer p-1"
                  aria-label="HTML5 color picker"
                />
              </div>
            </CardContent>
          </Card>

          {/* HEX Input */}
          <Card className="shadow-inner">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle>HEX</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(color, "HEX")}
                  className="cursor-pointer"
                  aria-label="Copy HEX value"
                >
                  <Copy className="size-3.5 mr-1" />
                  Copy
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Input
                id="hex-input"
                type="text"
                value={hexInput}
                onChange={(e) => handleHexInputChange(e.target.value)}
                placeholder="#000000"
                className={cn(
                  "font-mono text-sm",
                  hexError &&
                    "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
                )}
                aria-label="HEX color value"
                aria-invalid={!!hexError}
              />
              {hexError && (
                <p className="text-[10px] text-destructive mt-1.5 flex items-center gap-1">
                  <AlertCircle className="size-3" />
                  {hexError}
                </p>
              )}
            </CardContent>
          </Card>

          {/* RGB Input */}
          <Card className="shadow-inner">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle>RGB</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    handleCopy(
                      `rgb(${currentRgb?.r}, ${currentRgb?.g}, ${currentRgb?.b})`,
                      "RGB",
                    )
                  }
                  className="cursor-pointer"
                  aria-label="Copy RGB value"
                >
                  <Copy className="size-3.5 mr-1" />
                  Copy
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label
                    htmlFor="rgb-r-input"
                    className="text-[10px] font-semibold text-muted-foreground uppercase"
                  >
                    R
                  </label>
                  <Input
                    id="rgb-r-input"
                    type="number"
                    min={0}
                    max={255}
                    value={rgbInput.r}
                    onChange={(e) => handleRgbInputChange("r", e.target.value)}
                    className="font-mono text-sm text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    aria-label="Red channel value"
                  />
                </div>
                <div className="flex-1">
                  <label
                    htmlFor="rgb-g-input"
                    className="text-[10px] font-semibold text-muted-foreground uppercase"
                  >
                    G
                  </label>
                  <Input
                    id="rgb-g-input"
                    type="number"
                    min={0}
                    max={255}
                    value={rgbInput.g}
                    onChange={(e) => handleRgbInputChange("g", e.target.value)}
                    className="font-mono text-sm text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    aria-label="Green channel value"
                  />
                </div>
                <div className="flex-1">
                  <label
                    htmlFor="rgb-b-input"
                    className="text-[10px] font-semibold text-muted-foreground uppercase"
                  >
                    B
                  </label>
                  <Input
                    id="rgb-b-input"
                    type="number"
                    min={0}
                    max={255}
                    value={rgbInput.b}
                    onChange={(e) => handleRgbInputChange("b", e.target.value)}
                    className="font-mono text-sm text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    aria-label="Blue channel value"
                  />
                </div>
              </div>
              {rgbError && (
                <p className="text-[10px] text-destructive mt-1.5 flex items-center gap-1">
                  <AlertCircle className="size-3" />
                  {rgbError}
                </p>
              )}
            </CardContent>
          </Card>

          {/* HSL Input */}
          <Card className="shadow-inner">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle>HSL</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    handleCopy(
                      `hsl(${currentHsl?.h}, ${currentHsl?.s}%, ${currentHsl?.l}%)`,
                      "HSL",
                    )
                  }
                  className="cursor-pointer"
                  aria-label="Copy HSL value"
                >
                  <Copy className="size-3.5 mr-1" />
                  Copy
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label
                    htmlFor="hsl-h-input"
                    className="text-[10px] font-semibold text-muted-foreground uppercase"
                  >
                    H°
                  </label>
                  <Input
                    id="hsl-h-input"
                    type="number"
                    min={0}
                    max={360}
                    value={hslInput.h}
                    onChange={(e) => handleHslInputChange("h", e.target.value)}
                    className="font-mono text-sm text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    aria-label="Hue degree value"
                  />
                </div>
                <div className="flex-1">
                  <label
                    htmlFor="hsl-s-input"
                    className="text-[10px] font-semibold text-muted-foreground uppercase"
                  >
                    S%
                  </label>
                  <Input
                    id="hsl-s-input"
                    type="number"
                    min={0}
                    max={100}
                    value={hslInput.s}
                    onChange={(e) => handleHslInputChange("s", e.target.value)}
                    className="font-mono text-sm text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    aria-label="Saturation percentage value"
                  />
                </div>
                <div className="flex-1">
                  <label
                    htmlFor="hsl-l-input"
                    className="text-[10px] font-semibold text-muted-foreground uppercase"
                  >
                    L%
                  </label>
                  <Input
                    id="hsl-l-input"
                    type="number"
                    min={0}
                    max={100}
                    value={hslInput.l}
                    onChange={(e) => handleHslInputChange("l", e.target.value)}
                    className="font-mono text-sm text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    aria-label="Lightness percentage value"
                  />
                </div>
              </div>
              {hslError && (
                <p className="text-[10px] text-destructive mt-1.5 flex items-center gap-1">
                  <AlertCircle className="size-3" />
                  {hslError}
                </p>
              )}
            </CardContent>
          </Card>

          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
            className="cursor-pointer w-fit"
            aria-label="Reset to default color"
          >
            <RefreshCw className="size-3.5 mr-1" />
            Reset Color
          </Button>
        </div>

        {/* ─── Right Column - Contrast Checker ────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Contrast className="size-4" />
                WCAG Contrast Checker
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Check contrast ratio between text and background colors
              </p>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {/* Contrast Preview */}
              <div
                className="w-full h-24 rounded-lg border border-border flex items-center justify-center transition-colors duration-200"
                style={{
                  backgroundColor: bgColor,
                  color: fgColor,
                }}
                aria-label={`Contrast preview: ${fgColor} text on ${bgColor} background`}
              >
                <span className="text-lg font-semibold">Sample Text Aa</span>
              </div>

              {/* Foreground */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="fg-color-input"
                  className="text-xs font-semibold text-muted-foreground uppercase"
                >
                  Text Color (Foreground)
                </label>
                <div className="flex gap-2">
                  <Input
                    id="fg-color-input"
                    type="color"
                    value={fgColor}
                    onChange={(e) => {
                      setFgColor(e.target.value.toUpperCase());
                      setFgHexInput(e.target.value.toUpperCase());
                    }}
                    className="h-9 w-12 cursor-pointer p-0.5"
                    aria-label="Foreground color picker"
                  />
                  <Input
                    type="text"
                    value={fgHexInput}
                    onChange={(e) => handleFgColorChange(e.target.value)}
                    placeholder="#FFFFFF"
                    className="font-mono text-sm flex-1"
                    aria-label="Foreground HEX value"
                  />
                </div>
              </div>

              {/* Background */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="bg-color-input"
                  className="text-xs font-semibold text-muted-foreground uppercase"
                >
                  Background Color
                </label>
                <div className="flex gap-2">
                  <Input
                    id="bg-color-input"
                    type="color"
                    value={bgColor}
                    onChange={(e) => {
                      setBgColor(e.target.value.toUpperCase());
                      setBgHexInput(e.target.value.toUpperCase());
                    }}
                    className="h-9 w-12 cursor-pointer p-0.5"
                    aria-label="Background color picker"
                  />
                  <Input
                    type="text"
                    value={bgHexInput}
                    onChange={(e) => handleBgColorChange(e.target.value)}
                    placeholder="#3B82F6"
                    className="font-mono text-sm flex-1"
                    aria-label="Background HEX value"
                  />
                </div>
              </div>

              {/* Contrast Results */}
              {contrastRatio !== null && (
                <div className="p-4 rounded-lg border border-border bg-muted/30">
                  <p className="text-sm font-semibold mb-3">
                    Contrast Ratio:{" "}
                    <span className="font-mono text-lg">
                      {contrastRatio.toFixed(2)}:1
                    </span>
                  </p>

                  <div className="space-y-2">
                    {/* AA Normal */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs">AA Normal Text</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground">
                          ≥ 4.5:1
                        </span>
                        {wcagResults?.AANormal ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] py-0 px-1.5">
                            <CheckCircle className="size-3 mr-0.5" />
                            Pass
                          </Badge>
                        ) : (
                          <Badge
                            variant="destructive"
                            className="text-[10px] py-0 px-1.5"
                          >
                            <XCircle className="size-3 mr-0.5" />
                            Fail
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* AA Large */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs">AA Large Text</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground">
                          ≥ 3:1
                        </span>
                        {wcagResults?.AALarge ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] py-0 px-1.5">
                            <CheckCircle className="size-3 mr-0.5" />
                            Pass
                          </Badge>
                        ) : (
                          <Badge
                            variant="destructive"
                            className="text-[10px] py-0 px-1.5"
                          >
                            <XCircle className="size-3 mr-0.5" />
                            Fail
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* AAA Normal */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs">AAA Normal Text</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground">
                          ≥ 7:1
                        </span>
                        {wcagResults?.AAANormal ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] py-0 px-1.5">
                            <CheckCircle className="size-3 mr-0.5" />
                            Pass
                          </Badge>
                        ) : (
                          <Badge
                            variant="destructive"
                            className="text-[10px] py-0 px-1.5"
                          >
                            <XCircle className="size-3 mr-0.5" />
                            Fail
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Separator />

      {/* ─── Color Palette Generator ──────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="size-4" />
            Color Palette
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Harmonious colors generated from your selected base color
          </p>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {palette.map((color) => (
                <button
                  key={color.name}
                  className="flex flex-col items-center gap-2 p-3 rounded-lg border border-border hover:border-primary transition-colors cursor-pointer group"
                  onClick={() => {
                    setColor(color.hex);
                    setHexInput(color.hex);
                    const rgb = hexToRgb(color.hex);
                    if (rgb) {
                      setRgbInput({
                        r: String(rgb.r),
                        g: String(rgb.g),
                        b: String(rgb.b),
                      });
                      const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
                      setHslInput({
                        h: String(hsl.h),
                        s: String(hsl.s),
                        l: String(hsl.l),
                      });
                    }
                    setHexError(null);
                    setRgbError(null);
                    setHslError(null);
                  }}
                  aria-label={`Select palette color: ${color.name} - ${color.hex}`}
                >
                  <div
                    className="w-12 h-12 rounded-lg border border-border shadow-sm group-hover:scale-110 transition-transform"
                    style={{ backgroundColor: color.hex }}
                  />
                  <div className="text-center">
                    <p className="text-[10px] font-medium">{color.name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      {color.hex}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

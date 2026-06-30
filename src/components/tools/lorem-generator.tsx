"use client";

import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTools } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useState, useMemo, useCallback } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Copy,
  Trash2,
  RefreshCw,
  FileText,
  List,
  AlignLeft,
  Type,
  Heart
} from "lucide-react";

// ─── Lorem Ipsum Word Bank ────────────────────────────────────────────────────

const LOREM_WORDS = [
  "lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing", "elit", "sed", "do",
  "eiusmod", "tempor", "incididunt", "ut", "labore", "et", "dolore", "magna", "aliqua", "enim",
  "ad", "minim", "veniam", "quis", "nostrud", "exercitation", "ullamco", "laboris", "nisi", "ut",
  "aliquip", "ex", "ea", "commodo", "consequat", "duis", "aute", "irure", "dolor", "in",
  "reprehenderit", "in", "voluptate", "velit", "esse", "cillum", "dolore", "eu", "fugiat", "nulla",
  "pariatur", "excepteur", "sint", "occaecat", "cupidatat", "non", "proident", "sunt", "in", "culpa",
  "qui", "officia", "deserunt", "mollit", "anim", "id", "est", "laborum", "praesent", "sapien",
  "massa", "convallis", "a", "pellentesque", "nec", "egestas", "non", "nisi", "cras", "ultricies",
  "ligula", "sed", "magna", "dictum", "porta", "vivamus", "suscipit", "tortor", "eget", "felis",
  "porttitor", "volutpat", "vestibulum", "ac", "diam", "quisque", "velit", "nisi", "pretium", "lacinia",
  "elementum", "id", "enim", "donec", "rutrum", "congue", "leo", "eget", "malesuada", "proin",
  "libero", "nunc", "consequat"
];

const LOREM_START = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. ";

// ─── Generator Functions ──────────────────────────────────────────────────────

function getRandomWord(): string {
  return LOREM_WORDS[Math.floor(Math.random() * LOREM_WORDS.length)];
}

function generateWords(count: number, startWithLorem: boolean): string {
  const words: string[] = [];

  if (startWithLorem && count >= 5) {
    words.push("lorem", "ipsum", "dolor", "sit", "amet");
    for (let i = 5; i < count; i++) {
      words.push(getRandomWord());
    }
  } else {
    for (let i = 0; i < count; i++) {
      words.push(getRandomWord());
    }
  }

  return words.join(" ");
}

function generateSentence(
  minWords = 8,
  maxWords = 20,
  startWithLorem: boolean,
): string {
  const length =
    Math.floor(Math.random() * (maxWords - minWords + 1)) + minWords;
  const sentence = generateWords(length, startWithLorem);
  return sentence.charAt(0).toUpperCase() + sentence.slice(1) + ".";
}

// Fixed generateSentences to use sequential logic correctly
function generateSentences(count: number, startWithLorem: boolean): string {
  const sentences: string[] = [];

  for (let i = 0; i < count; i++) {
    const isFirst = i === 0 && startWithLorem;
    sentences.push(generateSentence(8, 20, isFirst));
  }

  return sentences.join(" ");
}

function generateParagraph(
  sentencesCount = 5,
  startWithLorem: boolean,
): string {
  const sentences: string[] = [];

  for (let i = 0; i < sentencesCount; i++) {
    const isFirst = i === 0 && startWithLorem;
    sentences.push(generateSentence(8, 20, isFirst));
  }

  return sentences.join(" ");
}

function generateParagraphs(count: number, startWithLorem: boolean): string {
  const paragraphs: string[] = [];

  for (let i = 0; i < count; i++) {
    const isFirstParagraph = i === 0 && startWithLorem;
    const sentencesCount = Math.floor(Math.random() * 5) + 3;

    if (isFirstParagraph) {
      paragraphs.push(
        LOREM_START + generateParagraph(sentencesCount - 1, false),
      );
    } else {
      paragraphs.push(generateParagraph(sentencesCount, false));
    }
  }

  return paragraphs.join("\n\n");
}

function generateList(count: number, startWithLorem: boolean): string {
  const items: string[] = [];

  for (let i = 0; i < count; i++) {
    const isFirst = i === 0 && startWithLorem;
    const wordCount = Math.floor(Math.random() * 8) + 3;
    const text = generateWords(wordCount, isFirst);
    items.push(`${text.charAt(0).toUpperCase() + text.slice(1)}`);
  }

  return items.map((item) => `• ${item}`).join("\n");
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

export function LoremGenerator() {
  const [count, setCount] = useState(5);
  const [type, setType] = useState<
    "paragraphs" | "sentences" | "words" | "list"
  >("paragraphs");
  const [startWithLorem, setStartWithLorem] = useState(true);
  const [outputFormat, setOutputFormat] = useState<"plain" | "html">("plain");
  const [generatedText, setGeneratedText] = useState("");

  const handleGenerate = useCallback(() => {
    let result = "";

    switch (type) {
      case "paragraphs":
        result = generateParagraphs(count, startWithLorem);
        break;
      case "sentences":
        result = generateSentences(count, startWithLorem);
        break;
      case "words":
        result = generateWords(count, startWithLorem);
        break;
      case "list":
        result = generateList(count, startWithLorem);
        break;
    }

    if (outputFormat === "html") {
      if (type === "paragraphs") {
        result = result
          .split("\n\n")
          .map((p) => `<p>${p}</p>`)
          .join("\n");
      } else if (type === "list") {
        result = `<ul>\n${result
          .split("\n")
          .map((item) => `  <li>${item.replace("• ", "")}</li>`)
          .join("\n")}\n</ul>`;
      } else if (type === "sentences") {
        result = `<p>${result}</p>`;
      } else {
        result = `<span>${result}</span>`;
      }
    }

    setGeneratedText(result);
    toast.success(
      `Generated ${count} ${type}${outputFormat === "html" ? " (HTML)" : ""}`,
    );
  }, [count, type, startWithLorem, outputFormat]);

  const handleCopy = useCallback(() => {
    if (!generatedText) {
      toast.error("Nothing to copy!");
      return;
    }
    navigator.clipboard
      .writeText(generatedText)
      .then(() => toast.success("Copied to clipboard"))
      .catch(() => toast.error("Failed to copy"));
  }, [generatedText]);

  const handleClear = useCallback(() => {
    setGeneratedText("");
    toast.success("Cleared output");
  }, []);

  const stats = useMemo(() => {
    if (!generatedText) return { words: 0, chars: 0, lines: 0 };
    const plainText = generatedText.replace(/<[^>]*>/g, "");
    return {
      words: plainText.split(/\s+/).filter(Boolean).length,
      chars: plainText.length,
      lines: generatedText.split("\n").length,
    };
  }, [generatedText]);

  const typeIcon = useMemo(() => {
    switch (type) {
      case "paragraphs":
        return <AlignLeft className="size-4 text-muted-foreground" />;
      case "sentences":
        return <FileText className="size-4 text-muted-foreground" />;
      case "words":
        return <Type className="size-4 text-muted-foreground" />;
      case "list":
        return <List className="size-4 text-muted-foreground" />;
    }
  }, [type]);

  return (
    <div className="card-premium p-6 md:p-8 space-y-8 animate-slide-up max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Lorem Ipsum Generator
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Generate customized placeholders and mock dummy text blocks.
          </p>
        </div>
        <FavoriteButton toolId="lorem-generator" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ─── Left Column - Controls ─────────────────────────────────────── */}
        <div className="rounded-2xl border border-border/40 bg-muted/30 p-5 space-y-5">
          <div className="flex items-center gap-2">
            {typeIcon}
            <h2 className="text-sm font-semibold text-foreground">
              Generator Settings
            </h2>
          </div>

          {/* Type Selector */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="type-select"
              className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider"
            >
              Generation Type
            </label>
            <Select
              value={type}
              onValueChange={(v) =>
                setType(v as "paragraphs" | "sentences" | "words" | "list")
              }
            >
              <SelectTrigger id="type-select" className="w-full h-10 rounded-xl bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="paragraphs">Paragraphs</SelectItem>
                <SelectItem value="sentences">Sentences</SelectItem>
                <SelectItem value="words">Words</SelectItem>
                <SelectItem value="list">List Items</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Count Slider */}
          <div className="flex flex-col gap-2 bg-card/65 p-4 rounded-xl border border-border/45">
            <div className="flex items-center justify-between">
              <label
                htmlFor="count-slider"
                className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider"
              >
                Quantity count
              </label>
              <Badge
                variant="secondary"
                className="font-mono text-xs py-0 px-2 rounded-full border border-border bg-muted/20"
              >
                {count} {type}
              </Badge>
            </div>
            <Slider
              id="count-slider"
              min={1}
              max={50}
              step={1}
              value={[count]}
              onValueChange={([val]) => setCount(val)}
              className="cursor-pointer py-2"
              aria-label={`Select number of ${type} from 1 to 50`}
            />
            <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
              <span>1</span>
              <span>50</span>
            </div>
          </div>

          {/* Start with Lorem Ipsum Checkbox */}
          <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
            <Checkbox
              checked={startWithLorem}
              onCheckedChange={(checked) =>
                setStartWithLorem(checked === true)
              }
              id="start-lorem-checkbox"
              className="rounded"
            />
            <label
              htmlFor="start-lorem-checkbox"
              className="text-xs font-semibold text-muted-foreground cursor-pointer select-none leading-none"
            >
              Start text block with &ldquo;Lorem ipsum...&rdquo;
            </label>
          </div>

          {/* Output Format */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Output Format
            </span>
            <Tabs
              value={outputFormat}
              onValueChange={(v) => setOutputFormat(v as "plain" | "html")}
              className="w-full"
            >
              <TabsList className="bg-muted p-1 rounded-xl h-9 w-full flex">
                <TabsTrigger value="plain" className="text-xs rounded-lg flex-1 cursor-pointer transition-all">
                  Plain Text
                </TabsTrigger>
                <TabsTrigger value="html" className="text-xs rounded-lg flex-1 cursor-pointer transition-all">
                  HTML Tags
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            className="w-full h-10 rounded-full text-xs font-bold cursor-pointer active:scale-95 transition-all shadow-sm"
            aria-label="Generate placeholder text"
          >
            <RefreshCw className="size-3.5 mr-1" />
            Generate Placeholder
          </Button>
        </div>

        {/* ─── Right Column - Output ──────────────────────────────────────── */}
        <div className="rounded-2xl border border-border/40 bg-muted/30 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Generated Result</h2>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                disabled={!generatedText}
                className="h-8 rounded-xl text-xs gap-1.5 hover:bg-card cursor-pointer active:scale-95 transition-all"
                aria-label="Copy generated text"
              >
                <Copy className="size-3.5" />
                Copy
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                disabled={!generatedText}
                className="h-8 rounded-xl text-xs gap-1.5 text-muted-foreground hover:text-destructive hover:bg-card cursor-pointer active:scale-95 transition-all"
                aria-label="Clear generated text"
              >
                <Trash2 className="size-3.5" />
                Clear
              </Button>
            </div>
          </div>

          <Textarea
            readOnly
            value={generatedText}
            placeholder="Generated placeholder text will display here..."
            className="min-h-75 font-serif text-sm resize-none bg-card focus-visible:ring-0 focus-visible:ring-offset-0 border border-border rounded-xl p-4 leading-relaxed cursor-default"
            aria-label="Generated placeholder text output"
          />

          {/* Stats Bar */}
          {generatedText && (
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-mono font-semibold pl-1">
              <span>
                {stats.words.toLocaleString()}{" "}
                {stats.words === 1 ? "WORD" : "WORDS"}
              </span>
              <span>•</span>
              <span>
                {stats.chars.toLocaleString()}{" "}
                {stats.chars === 1 ? "CHARACTER" : "CHARACTERS"}
              </span>
              {type === "paragraphs" && (
                <>
                  <span>•</span>
                  <span>
                    {stats.lines}{" "}
                    {stats.lines === 1 ? "PARAGRAPH" : "PARAGRAPHS"}
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <Separator className="bg-border/60" />

      {/* ─── Quick Presets ────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border/40 bg-muted/30 p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Quick Presets</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Instant settings for common dummy placeholder scopes.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "1 Paragraph", type: "paragraphs" as const, count: 1 },
            { label: "3 Paragraphs", type: "paragraphs" as const, count: 3 },
            { label: "5 Sentences", type: "sentences" as const, count: 5 },
            { label: "10 Sentences", type: "sentences" as const, count: 10 },
            { label: "20 Words", type: "words" as const, count: 20 },
            { label: "50 Words", type: "words" as const, count: 50 },
            { label: "5 List Items", type: "list" as const, count: 5 },
            { label: "10 List Items", type: "list" as const, count: 10 },
          ].map((preset) => (
            <Button
              key={preset.label}
              variant="outline"
              size="sm"
              className="rounded-xl text-xs hover:bg-card active:scale-95 cursor-pointer transition-all"
              onClick={() => {
                setType(preset.type);
                setCount(preset.count);
              }}
              aria-label={`Preset: ${preset.label}`}
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

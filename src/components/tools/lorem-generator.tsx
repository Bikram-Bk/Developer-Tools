"use client";

import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useState, useMemo, useCallback } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";

// ─── Lorem Ipsum Word Bank ────────────────────────────────────────────────────

const LOREM_WORDS = [
  "lorem",
  "ipsum",
  "dolor",
  "sit",
  "amet",
  "consectetur",
  "adipiscing",
  "elit",
  "sed",
  "do",
  "eiusmod",
  "tempor",
  "incididunt",
  "ut",
  "labore",
  "et",
  "dolore",
  "magna",
  "aliqua",
  "enim",
  "ad",
  "minim",
  "veniam",
  "quis",
  "nostrud",
  "exercitation",
  "ullamco",
  "laboris",
  "nisi",
  "ut",
  "aliquip",
  "ex",
  "ea",
  "commodo",
  "consequat",
  "duis",
  "aute",
  "irure",
  "dolor",
  "in",
  "reprehenderit",
  "in",
  "voluptate",
  "velit",
  "esse",
  "cillum",
  "dolore",
  "eu",
  "fugiat",
  "nulla",
  "pariatur",
  "excepteur",
  "sint",
  "occaecat",
  "cupidatat",
  "non",
  "proident",
  "sunt",
  "in",
  "culpa",
  "qui",
  "officia",
  "deserunt",
  "mollit",
  "anim",
  "id",
  "est",
  "laborum",
  "praesent",
  "sapien",
  "massa",
  "convallis",
  "a",
  "pellentesque",
  "nec",
  "egestas",
  "non",
  "nisi",
  "cras",
  "ultricies",
  "ligula",
  "sed",
  "magna",
  "dictum",
  "porta",
  "vivamus",
  "suscipit",
  "tortor",
  "eget",
  "felis",
  "porttitor",
  "volutpat",
  "vestibulum",
  "ac",
  "diam",
  "quisque",
  "velit",
  "nisi",
  "pretium",
  "lacinia",
  "elementum",
  "id",
  "enim",
  "donec",
  "rutrum",
  "congue",
  "leo",
  "eget",
  "malesuada",
  "proin",
  "libero",
  "nunc",
  "consequat",
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

// ─── Component ────────────────────────────────────────────────────────────────

export function LoremGenerator() {
  const [count, setCount] = useState(5);
  const [type, setType] = useState<
    "paragraphs" | "sentences" | "words" | "list"
  >("paragraphs");
  const [startWithLorem, setStartWithLorem] = useState(true);
  const [outputFormat, setOutputFormat] = useState<"plain" | "html">("plain");
  const [generatedText, setGeneratedText] = useState("");

  // ─── Generate ───────────────────────────────────────────────────────────────
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

  // ─── Copy ───────────────────────────────────────────────────────────────────
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

  // ─── Clear ──────────────────────────────────────────────────────────────────
  const handleClear = useCallback(() => {
    setGeneratedText("");
    toast.success("Cleared output");
  }, []);

  // ─── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!generatedText) return { words: 0, chars: 0, lines: 0 };
    const plainText = generatedText.replace(/<[^>]*>/g, "");
    return {
      words: plainText.split(/\s+/).filter(Boolean).length,
      chars: plainText.length,
      lines: generatedText.split("\n").length,
    };
  }, [generatedText]);

  // ─── Type Icon ──────────────────────────────────────────────────────────────
  const typeIcon = useMemo(() => {
    switch (type) {
      case "paragraphs":
        return <AlignLeft className="size-4" />;
      case "sentences":
        return <FileText className="size-4" />;
      case "words":
        return <Type className="size-4" />;
      case "list":
        return <List className="size-4" />;
    }
  }, [type]);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 p-6 bg-card rounded-xl border border-border shadow-sm max-w-6xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Lorem Ipsum Generator
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Generate placeholder text for your designs and mockups
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ─── Left Column - Controls ─────────────────────────────────────── */}
        <Card className="shadow-inner">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {typeIcon}
              Generator Settings
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Configure your placeholder text generation
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {/* Type Selector */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="type-select"
                className="text-xs font-semibold text-muted-foreground uppercase"
              >
                Generation Type
              </label>
              <Select
                value={type}
                onValueChange={(v) =>
                  setType(v as "paragraphs" | "sentences" | "words" | "list")
                }
              >
                <SelectTrigger id="type-select" className="w-full h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paragraphs">Paragraphs</SelectItem>
                  <SelectItem value="sentences">Sentences</SelectItem>
                  <SelectItem value="words">Words</SelectItem>
                  <SelectItem value="list">List Items</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Count Slider */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="count-slider"
                  className="text-xs font-semibold text-muted-foreground uppercase"
                >
                  Number of {type}
                </label>
                <Badge
                  variant="secondary"
                  className="font-mono text-xs py-0 px-2"
                >
                  {count}
                </Badge>
              </div>
              <Slider
                id="count-slider"
                min={1}
                max={50}
                step={1}
                value={[count]}
                onValueChange={([val]) => setCount(val)}
                className="cursor-pointer"
                aria-label={`Select number of ${type} from 1 to 50`}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>1</span>
                <span>50</span>
              </div>
            </div>

            {/* Start with Lorem Ipsum */}
            <div className="flex items-center gap-3 p-3 rounded-lg border border-input">
              <Checkbox
                checked={startWithLorem}
                onCheckedChange={(checked) =>
                  setStartWithLorem(checked === true)
                }
                id="start-lorem-checkbox"
              />
              <label
                htmlFor="start-lorem-checkbox"
                className="text-sm cursor-pointer"
              >
                Start with &ldquo;Lorem ipsum dolor sit amet...&rdquo;
              </label>
            </div>

            {/* Output Format */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground uppercase">
                Output Format
              </span>
              <Tabs
                value={outputFormat}
                onValueChange={(v) => setOutputFormat(v as "plain" | "html")}
              >
                <TabsList className="w-full">
                  <TabsTrigger value="plain" className="flex-1">
                    Plain Text
                  </TabsTrigger>
                  <TabsTrigger value="html" className="flex-1">
                    HTML
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              className="cursor-pointer w-full"
              aria-label="Generate placeholder text"
            >
              <RefreshCw className="size-3.5 mr-1" />
              Generate
            </Button>
          </CardContent>
        </Card>

        {/* ─── Right Column - Output ──────────────────────────────────────── */}
        <Card className="shadow-inner">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Generated Text</CardTitle>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  disabled={!generatedText}
                  className="cursor-pointer"
                  aria-label="Copy generated text"
                >
                  <Copy className="size-3.5 mr-1" />
                  Copy
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  disabled={!generatedText}
                  className="cursor-pointer"
                  aria-label="Clear generated text"
                >
                  <Trash2 className="size-3.5 mr-1" />
                  Clear
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Textarea
              readOnly
              value={generatedText}
              placeholder="Your generated text will appear here..."
              rows={14}
              className="font-serif text-sm resize-none bg-muted/20 cursor-default focus-visible:ring-0"
              aria-label="Generated placeholder text output"
            />

            {/* Stats */}
            {generatedText && (
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span>
                  {stats.words.toLocaleString()}{" "}
                  {stats.words === 1 ? "word" : "words"}
                </span>
                <span>•</span>
                <span>
                  {stats.chars.toLocaleString()}{" "}
                  {stats.chars === 1 ? "character" : "characters"}
                </span>
                {type === "paragraphs" && (
                  <>
                    <span>•</span>
                    <span>
                      {stats.lines}{" "}
                      {stats.lines === 1 ? "paragraph" : "paragraphs"}
                    </span>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* ─── Quick Presets ────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Presets</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Common placeholder text configurations
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                className="cursor-pointer text-xs"
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
        </CardContent>
      </Card>
    </div>
  );
}

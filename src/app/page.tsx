"use client";

import { useTools } from "@/lib/store";
import { TOOLS, CATEGORIES, Tool } from "@/lib/tools-config";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Braces,
  Fingerprint,
  Binary,
  Link as LinkIcon,
  Clock,
  Code2,
  Hash,
  Palette,
  FileText,
  KeyRound,
  Search,
  Heart,
  ArrowRight,
  History,
  Terminal,
  Grid,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

// Import all tools components
import { JsonFormatter } from "@/components/tools/json-formatter";
import { UuidGenerator } from "@/components/tools/uuid-generator";
import { Base64Tool } from "@/components/tools/base64-tool";
import { UrlTool } from "@/components/tools/url-tool";
import { TimestampTool } from "@/components/tools/timestamp-tool";
import { RegexTester } from "@/components/tools/regex-tester";
import { HashGenerator } from "@/components/tools/hash-generator";
import { ColorPicker } from "@/components/tools/color-picker";
import { LoremGenerator } from "@/components/tools/lorem-generator";
import { JwtDecoder } from "@/components/tools/jwt-decoder";

// Icon mapping helper
function ToolIcon({ name, className }: { name: string; className?: string }) {
  const props = { className: cn("h-5 w-5", className) };
  switch (name) {
    case "Braces":
      return <Braces {...props} />;
    case "Fingerprint":
      return <Fingerprint {...props} />;
    case "Binary":
      return <Binary {...props} />;
    case "Link":
      return <LinkIcon {...props} />;
    case "Clock":
      return <Clock {...props} />;
    case "Code2":
      return <Code2 {...props} />;
    case "Hash":
      return <Hash {...props} />;
    case "Palette":
      return <Palette {...props} />;
    case "FileText":
      return <FileText {...props} />;
    case "KeyRound":
      return <KeyRound {...props} />;
    default:
      return <Terminal {...props} />;
  }
}

// Category icon helper
function CategoryIcon({ id, className }: { id: string; className?: string }) {
  const props = { className: cn("h-5 w-5", className) };
  switch (id) {
    case "formatters":
      return <Braces {...props} />;
    case "generators":
      return <Fingerprint {...props} />;
    case "encoders-decoders":
      return <Binary {...props} />;
    case "converters":
      return <Clock {...props} />;
    case "cryptography":
      return <Hash {...props} />;
    case "text-utils":
      return <Code2 {...props} />;
    default:
      return <Grid {...props} />;
  }
}

export default function Page() {
  const {
    activeToolId,
    setActiveToolId,
    favorites,
    toggleFavorite,
    recentTools,
    searchQuery,
    setSearchQuery
  } = useTools();

  // Switch rendering based on active selection (do not modify this logic)
  if (activeToolId === "json-formatter") return <JsonFormatter />;
  if (activeToolId === "uuid-generator") return <UuidGenerator />;
  if (activeToolId === "base64-tool") return <Base64Tool />;
  if (activeToolId === "url-tool") return <UrlTool />;
  if (activeToolId === "timestamp-tool") return <TimestampTool />;
  if (activeToolId === "regex-tester") return <RegexTester />;
  if (activeToolId === "hash-generator") return <HashGenerator />;
  if (activeToolId === "color-picker") return <ColorPicker />;
  if (activeToolId === "lorem-generator") return <LoremGenerator />;
  if (activeToolId === "jwt-decoder") return <JwtDecoder />;

  // Filter tools based on search query
  const filteredTools = TOOLS.filter((tool) => {
    const query = searchQuery.toLowerCase().trim();
    return (
      tool.name.toLowerCase().includes(query) ||
      tool.description.toLowerCase().includes(query) ||
      tool.category.toLowerCase().includes(query)
    );
  });

  const favoritesList = TOOLS.filter((t) => favorites.includes(t.id));
  const recentList = TOOLS.filter((t) => recentTools.includes(t.id));

  return (
    <div className="space-y-10 animate-fade-in">
      {/* Hero section */}
      <div className="relative overflow-hidden card-premium p-8 md:p-10 shadow-sm border border-border/60">
        <div className="absolute right-0 top-0 h-56 w-56 translate-x-12 -translate-y-12 rounded-full bg-primary/5 blur-3xl dark:bg-ring/5" />
        <div className="relative flex flex-col xl:flex-row xl:items-center justify-between gap-8">
          <div className="space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-accent-foreground/10 bg-accent text-accent-text text-xs font-semibold uppercase tracking-wider animate-scale-in">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Developer Suite</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground leading-none">
              Developer Toolbox
            </h1>
            <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
              A premium, offline-first collection of essential utilities for developers. Fast, client-side execution, fully validated, and tailored for absolute data privacy.
            </p>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-3 gap-6 shrink-0 bg-muted/40 p-5 rounded-2xl border border-border/50 min-w-70">
            <div className="text-center">
              <span className="block text-2xl md:text-3xl font-extrabold text-foreground tracking-tight tabular-nums">{TOOLS.length}</span>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mt-1 block">Total</span>
            </div>
            <div className="text-center border-x border-border/60 px-4">
              <span className="block text-2xl md:text-3xl font-extrabold text-foreground tracking-tight tabular-nums">{favorites.length}</span>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mt-1 block">Favs</span>
            </div>
            <div className="text-center">
              <span className="block text-2xl md:text-3xl font-extrabold text-foreground tracking-tight tabular-nums">{recentTools.length}</span>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mt-1 block">Recents</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      {searchQuery.trim() !== "" ? (
        // Search Results View
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <span>Search Results</span>
              <Badge variant="secondary" className="ml-2 font-mono rounded-full text-xs bg-muted border border-border text-foreground px-2 py-0.5">
                {filteredTools.length} found
              </Badge>
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setSearchQuery("")} className="cursor-pointer text-xs rounded-xl">
              Clear search
            </Button>
          </div>

          {filteredTools.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 bg-card rounded-3xl border border-border/60 border-dashed text-center animate-scale-in">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground mb-4">
                <Search className="h-6 w-6 stroke-[1.5]" />
              </div>
              <h3 className="font-semibold text-base text-foreground">No tools matched your search</h3>
              <p className="text-xs text-muted-foreground mt-1.5 max-w-sm leading-relaxed">
                {"We couldn't find any utilities matching your query. Check spelling or type standard tags like 'formatter', 'token', 'crypt' or 'decoder'."}
              </p>
              <Button variant="outline" size="sm" onClick={() => setSearchQuery("")} className="mt-5 cursor-pointer rounded-xl">
                Show All Tools
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} onSelect={setActiveToolId} onFavToggle={toggleFavorite} favorites={favorites} />
              ))}
            </div>
          )}
        </div>
      ) : (
        // Standard Dashboard View
        <div className="space-y-12 animate-slide-up">
          {/* Favorites */}
          {favoritesList.length > 0 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Heart className="h-4 w-4 text-red-500 fill-red-500 animate-scale-in" />
                <span>Favorites</span>
                <Badge className="font-mono rounded-full text-[10px] bg-red-50 text-red-600 border border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/50 px-2 py-0.5">
                  {favoritesList.length}
                </Badge>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {favoritesList.map((tool) => (
                  <ToolCard key={tool.id} tool={tool} onSelect={setActiveToolId} onFavToggle={toggleFavorite} favorites={favorites} />
                ))}
              </div>
            </div>
          )}

          {/* Recently Used */}
          {recentList.length > 0 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <History className="h-4 w-4 text-primary" />
                <span>Recently Used</span>
                <Badge className="font-mono rounded-full text-[10px] bg-muted border border-border text-foreground px-2 py-0.5">
                  {recentList.length}
                </Badge>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recentList.map((tool) => (
                  <ToolCard key={tool.id} tool={tool} onSelect={setActiveToolId} onFavToggle={toggleFavorite} favorites={favorites} />
                ))}
              </div>
            </div>
          )}

          {/* All Categorized Utilities */}
          <div className="space-y-8">
            <h2 className="text-lg font-semibold flex items-center gap-2 pb-2 border-b border-border/50">
              <Grid className="h-4 w-4 text-muted-foreground" />
              <span>All Utilities</span>
            </h2>

            <div className="space-y-12">
              {CATEGORIES.map((category) => {
                const categoryTools = TOOLS.filter((t) => t.category === category.id);
                if (categoryTools.length === 0) return null;

                return (
                  <div key={category.id} className="space-y-6">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted border border-border/50 text-muted-foreground shadow-sm">
                        <CategoryIcon id={category.id} className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-base leading-none text-foreground">{category.name}</h3>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{category.description}</p>
                      </div>
                    </div>

                    <div className="pl-0 md:pl-12">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {categoryTools.map((tool) => (
                          <ToolCard key={tool.id} tool={tool} onSelect={setActiveToolId} onFavToggle={toggleFavorite} favorites={favorites} />
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Upgraded ToolCard element for Dashboard
interface ToolCardProps {
  tool: Tool;
  onSelect: (id: string | null) => void;
  onFavToggle: (id: string) => void;
  favorites: string[];
}

function ToolCard({ tool, onSelect, onFavToggle, favorites }: ToolCardProps) {
  const isFav = favorites.includes(tool.id);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(tool.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onSelect(tool.id);
        }
      }}
      className="group relative flex flex-col justify-between overflow-hidden card-premium card-hover bg-card/40 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div className="flex flex-row items-start justify-between gap-4 p-5">
        <div className="flex items-center gap-3 min-w-0">
          {/* Icon Container */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted border border-border/50 text-muted-foreground transition-all duration-200 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-transparent shadow-sm">
            <ToolIcon name={tool.iconName} className="h-5 w-5" />
          </div>
          <div className="space-y-1 min-w-0">
            <h4 className="text-sm font-semibold group-hover:text-primary transition-colors truncate">
              {tool.name}
            </h4>
            <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0 border-border text-muted-foreground bg-muted/10 rounded-full">
              {tool.category.replace("-", " ")}
            </Badge>
          </div>
        </div>

        {/* Favorite Heart Button */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8 cursor-pointer rounded-full text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all duration-150 active:scale-95 shrink-0 z-10",
            isFav ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onFavToggle(tool.id);
          }}
          aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart className={cn("h-4 w-4 transition-all duration-150", isFav ? "fill-red-500 text-red-500 scale-110" : "scale-100")} />
        </Button>
      </div>

      <div className="px-5 pb-5 pt-0 flex-1 flex flex-col justify-between gap-4">
        <p className="text-xs leading-relaxed text-muted-foreground flex-1">
          {tool.description}
        </p>

        {/* Open Tool Bar */}
        <div className="flex items-center justify-between h-9 px-4 mt-1 bg-muted/50 group-hover:bg-accent group-hover:text-accent-text rounded-2xl border border-border/30 group-hover:border-accent-foreground/5 text-xs font-semibold text-muted-foreground transition-all duration-200">
          <span>Open Tool</span>
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
        </div>
      </div>
    </div>
  );
}

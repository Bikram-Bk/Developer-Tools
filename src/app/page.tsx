"use client";

import { useTools } from "@/lib/store";
import { TOOLS, CATEGORIES, Tool } from "@/lib/tools-config";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  ChevronRight,
  History,
  Terminal,
  Grid
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

  // Switch rendering based on active selection
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
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Welcome & Statistics Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm">
        <div className="absolute right-0 top-0 h-40 w-40 translate-x-12 -translate-y-12 rounded-full bg-primary/5 blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Developer Toolbox</h1>
            <p className="text-muted-foreground text-sm max-w-xl">
              A comprehensive suite of essential development utilities. Completely offline-first, highly secure, and optimized for daily coding workflows.
            </p>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-3 gap-4 shrink-0 bg-muted/30 p-4 rounded-xl border border-border/50">
            <div className="text-center px-2">
              <span className="block text-2xl font-bold text-foreground">{TOOLS.length}</span>
              <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Total</span>
            </div>
            <div className="text-center border-x border-border/60 px-4">
              <span className="block text-2xl font-bold text-foreground">{favorites.length}</span>
              <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Favorites</span>
            </div>
            <div className="text-center px-2">
              <span className="block text-2xl font-bold text-foreground">{recentTools.length}</span>
              <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Recents</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      {searchQuery.trim() !== "" ? (
        // Search Results View
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              Search Results
              <Badge variant="secondary" className="ml-2 font-mono">
                {filteredTools.length} found
              </Badge>
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setSearchQuery("")} className="cursor-pointer text-xs">
              Clear search
            </Button>
          </div>

          {filteredTools.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-card rounded-xl border border-border/55 border-dashed text-center">
              <Search className="h-10 w-10 text-muted-foreground mb-3 stroke-[1.5]" />
              <h3 className="font-semibold text-base">No tools matched your search</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                {"Try searching for names, descriptions, or categories like \"formatter\", \"hash\", or \"encode\"."}
              </p>
              <Button variant="outline" size="sm" onClick={() => setSearchQuery("")} className="mt-4 cursor-pointer">
                Show All Tools
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} onSelect={setActiveToolId} onFavToggle={toggleFavorite} favorites={favorites} />
              ))}
            </div>
          )}
        </div>
      ) : (
        // Standard Dashboard View
        <div className="space-y-10">
          {/* Favorites (Only shown if added) */}
          {favoritesList.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Heart className="h-4 w-4 text-destructive fill-destructive" />
                Favorites
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {favoritesList.map((tool) => (
                  <ToolCard key={tool.id} tool={tool} onSelect={setActiveToolId} onFavToggle={toggleFavorite} favorites={favorites} />
                ))}
              </div>
            </div>
          )}

          {/* Recent Tools (Only shown if visited) */}
          {recentList.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <History className="h-4 w-4 text-primary" />
                Recently Used
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentList.map((tool) => (
                  <ToolCard key={tool.id} tool={tool} onSelect={setActiveToolId} onFavToggle={toggleFavorite} favorites={favorites} />
                ))}
              </div>
            </div>
          )}

          {/* All Categorized Tools */}
          <div className="space-y-8">
            <h2 className="text-lg font-semibold flex items-center gap-2 pb-2 border-b border-border/50">
              <Grid className="h-4 w-4 text-muted-foreground" />
              All Utilities
            </h2>

            <div className="space-y-10">
              {CATEGORIES.map((category) => {
                const categoryTools = TOOLS.filter((t) => t.category === category.id);
                if (categoryTools.length === 0) return null;

                return (
                  <div key={category.id} className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted border border-border/50 text-muted-foreground">
                        <CategoryIcon id={category.id} className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-base leading-none text-foreground">{category.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{category.description}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {categoryTools.map((tool) => (
                        <ToolCard key={tool.id} tool={tool} onSelect={setActiveToolId} onFavToggle={toggleFavorite} favorites={favorites} />
                      ))}
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

// Reusable card element for tools on Dashboard
interface ToolCardProps {
  tool: Tool;
  onSelect: (id: string | null) => void;
  onFavToggle: (id: string) => void;
  favorites: string[];
}

function ToolCard({ tool, onSelect, onFavToggle, favorites }: ToolCardProps) {
  const isFav = favorites.includes(tool.id);

  return (
    <Card className="group relative flex flex-col justify-between overflow-hidden border border-border bg-card/40 transition-all hover:bg-card hover:-translate-y-0.5 hover:shadow-md hover:border-border/80">
      <CardHeader className="flex flex-row items-start justify-between gap-4 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted border border-border/50 text-muted-foreground transition-all group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-transparent">
            <ToolIcon name={tool.iconName} className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-sm font-semibold group-hover:text-primary transition-colors">
              {tool.name}
            </CardTitle>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize border-border text-muted-foreground bg-muted/10">
              {tool.category.replace("-", " ")}
            </Badge>
          </div>
        </div>

        {/* Favorite Heart Button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 cursor-pointer rounded-full hover:bg-muted text-muted-foreground hover:text-destructive active:scale-95 shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onFavToggle(tool.id);
          }}
        >
          <Heart className={cn("h-4 w-4 transition-all", isFav ? "fill-destructive text-destructive scale-110" : "scale-100")} />
        </Button>
      </CardHeader>

      <CardContent className="px-5 pb-5 pt-0 flex-1 flex flex-col justify-between gap-4">
        <CardDescription className="text-xs leading-relaxed text-muted-foreground flex-1">
          {tool.description}
        </CardDescription>

        <Button
          variant="ghost"
          className="w-full justify-between h-9 px-3 mt-2 border border-border/40 hover:bg-primary/5 hover:border-primary/20 text-xs font-medium cursor-pointer"
          onClick={() => onSelect(tool.id)}
        >
          <span>Open Tool</span>
          <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
        </Button>
      </CardContent>
    </Card>
  );
}

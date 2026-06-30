"use client";

import { cn } from "@/lib/utils";
import { useTools } from "@/lib/store";
import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CATEGORIES, TOOLS } from "@/lib/tools-config";
import { ThemeToggle } from "@/components/theme-toggle";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";

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
  LayoutDashboard,
  Menu,
  Search,
  X,
  Heart,
  Terminal,
  Sparkles,
  Command,
  ChevronRight,
} from "lucide-react";

// ─── Tool Icon Mapper ────────────────────────────────────────────────────────

function ToolIcon({ name, className }: { name: string; className?: string }) {
  const props = { className: cn("size-4", className) };
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

// ─── SidebarContent Component ─────────────────────────────────────────────────

interface SidebarContentProps {
  activeToolId: string | null;
  favorites: string[];
  handleSelectTool: (id: string | null) => void;
  showSheetClose?: boolean;
}

function SidebarContent({
  activeToolId,
  favorites,
  handleSelectTool,
  showSheetClose = false,
}: SidebarContentProps) {
  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      {/* Brand Header */}
      <div className="flex items-center justify-between gap-3 px-4 sm:px-5 h-14 border-b border-sidebar-border shrink-0">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex items-center justify-center size-9 rounded-2xl bg-primary text-primary-foreground shadow-sm shrink-0">
            <Sparkles className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-sm tracking-tight text-foreground truncate">
              DevToolbox
            </h1>
            <p className="text-[10px] text-muted-foreground leading-none truncate">
              Developer utilities
            </p>
          </div>
        </div>

        {showSheetClose && (
          <SheetClose asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-lg border border-border/60 bg-background/70 text-foreground hover:bg-muted/80 shrink-0"
            >
              <X className="size-4" />
              <span className="sr-only">Close navigation</span>
            </Button>
          </SheetClose>
        )}
      </div>

      {/* Navigation Links */}
      <ScrollArea className="flex-1 px-4 py-4">
        <div className="w-full space-y-6">
          {/* Dashboard Link */}
          <div>
            <Button
              variant={activeToolId === null ? "secondary" : "ghost"}
              className={cn(
                "w-full h-10 justify-start gap-3 rounded-xl text-sm transition-all duration-150 cursor-pointer active:scale-95",
                activeToolId === null
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50",
              )}
              onClick={() => handleSelectTool(null)}
            >
              <LayoutDashboard className="size-4 shrink-0" />
              <span className="truncate">Dashboard</span>
            </Button>
          </div>

          {/* Grouped Tools by Category */}
          {CATEGORIES.map((category) => {
            const categoryTools = TOOLS.filter(
              (t) => t.category === category.id,
            );
            if (categoryTools.length === 0) return null;

            return (
              <div key={category.id} className="space-y-1.5">
                <h3 className="px-4 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                  {category.name}
                </h3>
                <div className="space-y-0.5">
                  {categoryTools.map((tool) => {
                    const isSelected = activeToolId === tool.id;
                    const isFav = favorites.includes(tool.id);

                    return (
                      <Button
                        key={tool.id}
                        variant={isSelected ? "secondary" : "ghost"}
                        className={cn(
                          "w-full h-10 justify-start gap-3 rounded-xl text-sm font-normal py-1.5 px-4 cursor-pointer transition-all duration-150 active:scale-95 group",
                          isSelected
                            ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm font-medium"
                            : "text-sidebar-foreground hover:bg-sidebar-accent/50",
                        )}
                        onClick={() => handleSelectTool(tool.id)}
                        title={tool.name}
                      >
                        <ToolIcon
                          name={tool.iconName}
                          className={cn(
                            "shrink-0",
                            isSelected
                              ? "text-primary"
                              : "text-muted-foreground group-hover:text-foreground",
                          )}
                        />
                        <span className="truncate flex-1 text-left">
                          {tool.name}
                        </span>
                        {isFav && (
                          <Heart className="size-3 fill-red-500 text-red-500 shrink-0" />
                        )}
                      </Button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-sidebar-border flex items-center justify-between text-xs text-muted-foreground shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <Command className="size-3 shrink-0" />
          <span className="hidden xl:inline">Press</span>
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground shrink-0">
            Ctrl + K
          </kbd>
        </div>
        <span className="shrink-0">v1.0</span>
      </div>
    </div>
  );
}

// ─── ShellLayout Component ────────────────────────────────────────────────────

export function ShellLayout({ children }: { children: React.ReactNode }) {
  const {
    activeToolId,
    setActiveToolId,
    favorites,
    searchQuery,
    setSearchQuery,
  } = useTools();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const activeTool = TOOLS.find((t) => t.id === activeToolId);

  const handleSelectTool = (id: string | null) => {
    setActiveToolId(id);
    setIsMobileOpen(false);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (activeToolId !== null && e.target.value) {
      setActiveToolId(null);
    }
  };

  // Keyboard shortcut: Ctrl+K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        const searchInput = document.getElementById(
          "global-search-bar",
        ) as HTMLInputElement | null;
        searchInput?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar (lg and up) */}
      <aside className="hidden lg:flex w-64 xl:w-72 shrink-0 h-screen sticky top-0">
        <SidebarContent
          activeToolId={activeToolId}
          favorites={favorites}
          handleSelectTool={handleSelectTool}
        />
      </aside>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-border/50 bg-background/80 px-4 md:px-6 backdrop-blur-xl">
          <div className="flex flex-1 items-center gap-4 min-w-0">
            {/* Mobile Sidebar Trigger */}
            <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden shrink-0 cursor-pointer rounded-xl size-10 border border-border/60 bg-background/80 shadow-sm hover:bg-muted/80"
                >
                  <Menu className="size-5" />
                  <span className="sr-only">Toggle navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="p-0 w-64 md:w-72 border-r-0 bg-sidebar text-sidebar-foreground"
                showCloseButton={false}
              >
                <SidebarContent
                  activeToolId={activeToolId}
                  favorites={favorites}
                  handleSelectTool={handleSelectTool}
                  showSheetClose
                />
              </SheetContent>
            </Sheet>

            {/* Breadcrumbs */}
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground min-w-0">
              <span
                role="button"
                tabIndex={0}
                className="cursor-pointer hover:text-foreground font-medium transition-colors truncate"
                onClick={() => handleSelectTool(null)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    handleSelectTool(null);
                  }
                }}
              >
                Dashboard
              </span>
              {activeTool && (
                <>
                  <ChevronRight
                    className="size-3 text-muted-foreground/60 shrink-0"
                    aria-hidden="true"
                  />
                  <span className="font-semibold text-foreground truncate">
                    {activeTool.name}
                  </span>
                </>
              )}
            </div>

            {/* Global Search Bar */}
            <div className="relative flex-1 max-w-xs md:max-w-sm ml-auto">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                id="global-search-bar"
                type="search"
                placeholder="Search tools... (Ctrl + K)"
                className="w-full pl-9 pr-4 h-10 bg-muted/60 hover:bg-muted/80 focus:bg-background border-transparent focus:border-border rounded-2xl transition-all duration-150"
                value={searchQuery}
                onChange={handleSearchChange}
              />
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2 pl-4 shrink-0">
            {activeToolId !== null && (
              <Button
                variant="ghost"
                size="sm"
                className="cursor-pointer text-muted-foreground hover:text-foreground hidden md:flex rounded-xl"
                onClick={() => handleSelectTool(null)}
              >
                Back to Dashboard
              </Button>
            )}
            <ThemeToggle />
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto p-6 md:p-8 lg:p-10">
          <div className="mx-auto max-w-7xl animate-fade-in min-w-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

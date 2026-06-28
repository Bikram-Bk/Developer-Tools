"use client";

import { cn } from "@/lib/utils";
import { useTools } from "@/lib/store";
import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CATEGORIES, TOOLS } from "@/lib/tools-config";
import { ThemeToggle } from "@/components/theme-toggle";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

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
  Heart,
  Terminal,
  Sparkles,
  Command
} from "lucide-react";


function ToolIcon({ name, className }: { name: string; className?: string }) {
  const props = { className: cn("h-4 w-4", className) };
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

export function ShellLayout({ children }: { children: React.ReactNode }) {
  const { activeToolId, setActiveToolId, favorites, searchQuery, setSearchQuery } = useTools();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const activeTool = TOOLS.find((t) => t.id === activeToolId);

  const handleSelectTool = (id: string | null) => {
    setActiveToolId(id);
    setIsMobileOpen(false);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (activeToolId !== null && e.target.value) {
      // If user types search query while in a tool, switch to dashboard to show results
      setActiveToolId(null);
    }
  };

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      {/* Brand Header */}
      <div className="flex items-center gap-2 px-6 py-5 border-b border-sidebar-border">
        <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary text-primary-foreground shadow-sm">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-bold text-base tracking-tight text-foreground">DevToolbox</h1>
          <p className="text-xs text-muted-foreground">Essential developer utilities</p>
        </div>
      </div>

      {/* Navigation Links */}
      <ScrollArea className="flex-1 px-4 py-4">
        <div className="space-y-6">
          <div>
            <Button
              variant={activeToolId === null ? "secondary" : "ghost"}
              className="w-full justify-start gap-3 font-medium cursor-pointer"
              onClick={() => handleSelectTool(null)}
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Button>
          </div>

          {/* Grouped Tools */}
          {CATEGORIES.map((category) => {
            const categoryTools = TOOLS.filter((t) => t.category === category.id);
            if (categoryTools.length === 0) return null;

            return (
              <div key={category.id} className="space-y-1.5">
                <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
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
                          "w-full justify-start gap-3 text-sm font-normal py-1.5 px-3 cursor-pointer relative group",
                          isSelected && "font-medium"
                        )}
                        onClick={() => handleSelectTool(tool.id)}
                      >
                        <ToolIcon
                          name={tool.iconName}
                          className={isSelected ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}
                        />
                        <span className="truncate flex-1 text-left">{tool.name}</span>
                        {isFav && (
                          <Heart className="h-3 w-3 fill-destructive text-destructive shrink-0" />
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
      <div className="p-4 border-t border-sidebar-border flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Command className="h-3 w-3" />
          <span>Press</span>
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            Ctrl + K
          </kbd>
        </div>
        <span>v1.0.0</span>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar (visible on lg and up) */}
      <aside className="hidden lg:block w-64 xl:w-72 shrink-0 h-screen sticky top-0">
        {renderSidebarContent()}
      </aside>

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-background/95 px-4 md:px-6 backdrop-blur-xs">
          <div className="flex flex-1 items-center gap-4">
            {/* Mobile Sidebar Toggle Button */}
            <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden shrink-0 cursor-pointer">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64 md:w-72 border-r-0">
                {renderSidebarContent()}
              </SheetContent>
            </Sheet>

            {/* Selected Tool Title / Info */}
            <div className="hidden sm:block shrink-0">
              <h2 className="font-semibold text-lg leading-none tracking-tight">
                {activeTool ? activeTool.name : "Dashboard"}
              </h2>
              {activeTool && (
                <p className="text-xs text-muted-foreground mt-0.5 max-w-70 xl:max-w-md truncate">
                  {activeTool.description}
                </p>
              )}
            </div>

            {/* Global Search Bar */}
            <div className="relative flex-1 max-w-md ml-auto">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search tools... (Ctrl + K)"
                className="w-full pl-9 pr-4 h-9 bg-muted/40 hover:bg-muted/60 focus:bg-background border-border"
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
                className="cursor-pointer text-muted-foreground hover:text-foreground hidden md:flex"
                onClick={() => handleSelectTool(null)}
              >
                Back to Dashboard
              </Button>
            )}
            <ThemeToggle />
          </div>
        </header>

        {/* Scrollable Work Area */}
        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8 bg-zinc-50/50 dark:bg-zinc-950/20">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

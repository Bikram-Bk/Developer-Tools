"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface ToolsContextType {
  activeToolId: string | null;
  setActiveToolId: (id: string | null) => void;
  favorites: string[];
  toggleFavorite: (id: string) => void;
  recentTools: string[];
  addRecentTool: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  clearFavorites: () => void;
}

const ToolsContext = createContext<ToolsContextType | undefined>(undefined);

export function ToolsProvider({ children }: { children: React.ReactNode }) {
  const [activeToolId, setActiveToolIdState] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recentTools, setRecentTools] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Load favorites and recents from localStorage on mount
  useEffect(() => {
    try {
      const savedFavorites = localStorage.getItem("dev-toolbox-favorites");
      const savedRecents = localStorage.getItem("dev-toolbox-recents");

      // Defer state updates to the next tick to avoid synchronous cascading renders warning in React 19
      setTimeout(() => {
        if (savedFavorites) {
          setFavorites(JSON.parse(savedFavorites) as string[]);
        }
        if (savedRecents) {
          setRecentTools(JSON.parse(savedRecents) as string[]);
        }
      }, 0);
    } catch (e) {
      console.error("Failed to load local storage state", e);
    }
  }, []);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const updated = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      localStorage.setItem("dev-toolbox-favorites", JSON.stringify(updated));
      return updated;
    });
  };

  const addRecentTool = (id: string) => {
    if (!id) return;
    setRecentTools((prev) => {
      const filtered = prev.filter((x) => x !== id);
      const updated = [id, ...filtered].slice(0, 5); // Keep maximum of 5 recent tools
      localStorage.setItem("dev-toolbox-recents", JSON.stringify(updated));
      return updated;
    });
  };

  const setActiveToolId = (id: string | null) => {
    setActiveToolIdState(id);
    if (id) {
      addRecentTool(id);
    }
  };

  const clearFavorites = () => {
    setFavorites([]);
    localStorage.removeItem("dev-toolbox-favorites");
  };

  return (
    <ToolsContext.Provider
      value={{
        activeToolId,
        setActiveToolId,
        favorites,
        toggleFavorite,
        recentTools,
        addRecentTool,
        searchQuery,
        setSearchQuery,
        clearFavorites,
      }}
    >
      {children}
    </ToolsContext.Provider>
  );
}

export function useTools() {
  const context = useContext(ToolsContext);
  if (context === undefined) {
    throw new Error("useTools must be used within a ToolsProvider");
  }
  return context;
}

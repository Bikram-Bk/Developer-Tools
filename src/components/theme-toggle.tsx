"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

const emptySubscribe = () => () => { };

export function ThemeToggle() {
    const { setTheme, resolvedTheme } = useTheme();
    const mounted = useSyncExternalStore(
        emptySubscribe,
        () => true,
        () => false
    );

    if (!mounted) {
        return (
            <Button variant="outline" size="icon" disabled>
                <div className="h-4.5 w-4.5" />
            </Button>
        );
    }

    return (
        <Button
            variant="outline"
            size="icon"
            onClick={() =>
                setTheme(resolvedTheme === "dark" ? "light" : "dark")
            }
        >
            {resolvedTheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </Button>
    );
}
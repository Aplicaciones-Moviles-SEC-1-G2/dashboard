"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command as CommandIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { BQ_REGISTRY } from "@/lib/bq-registry";

export function CommandPalette(): React.JSX.Element {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const items = React.useMemo(
    () => [...BQ_REGISTRY].sort((a, b) => a.displayNumber - b.displayNumber),
    [],
  );

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((previous) => !previous);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const runCommand = React.useCallback(
    (route: string) => {
      setOpen(false);
      router.push(route);
    },
    [router],
  );

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-2 text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <CommandIcon className="h-4 w-4" />
        <span className="hidden sm:inline">Search BQs…</span>
        <kbd className="pointer-events-none ml-2 hidden rounded border bg-muted px-1.5 text-[10px] font-medium sm:inline">
          ⌘K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search by number or title…" />
        <CommandList>
          <CommandEmpty>No BQ matches that search.</CommandEmpty>
          <CommandGroup heading="Business questions">
            {items.map((bq) => (
              <CommandItem
                key={bq.id}
                value={`${bq.displayNumber} ${bq.shortTitle}`}
                onSelect={() => runCommand(bq.route)}
              >
                <span className="w-6 text-right font-mono text-xs text-muted-foreground">
                  {bq.displayNumber}.
                </span>
                <span className="ml-2 truncate">{bq.shortTitle}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}

"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MethodologySectionProps {
  /** Raw markdown of the BQ's plan file. Rendered as preformatted text for now. */
  planMarkdown: string;
  planFile: string;
}

export function MethodologySection({
  planMarkdown,
  planFile,
}: MethodologySectionProps): React.JSX.Element {
  const [open, setOpen] = React.useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Methodology</CardTitle>
          <CollapsibleTrigger
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            aria-label="Toggle methodology"
          >
            <span>{open ? "Hide" : "Show"}</span>
            <ChevronDown
              className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
            />
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-3 pt-0">
            <p className="text-xs text-muted-foreground">
              Source: <code className="font-mono">{planFile}</code>
            </p>
            <pre className="whitespace-pre-wrap rounded-md border bg-muted/40 p-4 font-mono text-xs leading-relaxed">
              {planMarkdown}
            </pre>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

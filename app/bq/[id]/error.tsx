"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function BqError({ error, reset }: ErrorProps): React.JSX.Element {
  React.useEffect(() => {
    // The Firebase Admin error message is never surfaced to the client.
    // Log the digest so backend logs can be correlated.
    console.error("[bq-error]", error.digest ?? "no-digest");
  }, [error]);

  return (
    <div className="mx-auto max-w-xl">
      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden />
          <CardTitle>Something went wrong loading this BQ.</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm text-muted-foreground">
          <p>
            The page failed to render. Details have been logged server-side — Firebase
            credentials are never included in the browser-visible error.
          </p>
          <Button onClick={reset} variant="outline" className="w-fit">
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

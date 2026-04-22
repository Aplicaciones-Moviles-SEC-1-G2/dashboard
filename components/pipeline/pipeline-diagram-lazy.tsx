"use client";

import dynamic from "next/dynamic";

/**
 * Client-side boundary for React Flow. Next 15 only allows `ssr: false` from
 * a Client Component, but pipeline-diagram.tsx needs to stay out of the SSR
 * bundle (React Flow touches the DOM). Server Components import this wrapper
 * instead of calling `dynamic(..., { ssr: false })` directly.
 */
export const PipelineDiagram = dynamic(
  () =>
    import("@/components/pipeline/pipeline-diagram").then((mod) => ({
      default: mod.PipelineDiagram,
    })),
  { ssr: false },
);

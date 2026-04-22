"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { findBq } from "@/lib/bq-registry";

export function Breadcrumbs(): React.JSX.Element {
  const pathname = usePathname();
  const crumbs = React.useMemo(() => buildCrumbs(pathname), [pathname]);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, idx) => {
          const isLast = idx === crumbs.length - 1;
          return (
            <React.Fragment key={`${crumb.label}-${idx}`}>
              <BreadcrumbItem>
                {isLast || !crumb.href ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={crumb.href}>{crumb.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast ? <BreadcrumbSeparator /> : null}
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

interface Crumb {
  label: string;
  href?: string;
}

function buildCrumbs(pathname: string | null): Crumb[] {
  const crumbs: Crumb[] = [{ label: "Overview", href: "/" }];
  if (!pathname || pathname === "/") return crumbs;

  const bqMatch = pathname.match(/^\/bq\/([^/]+)/);
  if (bqMatch) {
    const id = bqMatch[1] ?? "";
    const bq = findBq(id);
    if (bq) {
      crumbs.push({ label: `${bq.displayNumber}. ${bq.shortTitle}` });
      return crumbs;
    }
    crumbs.push({ label: id });
    return crumbs;
  }

  const segments = pathname.split("/").filter(Boolean);
  for (const segment of segments) {
    crumbs.push({ label: segment });
  }
  return crumbs;
}

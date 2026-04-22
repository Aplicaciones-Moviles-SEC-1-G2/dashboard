import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function BqNotFound(): React.JSX.Element {
  return (
    <div className="mx-auto max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle>This business question is not active.</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            The only routes that render are the 10 active BQs:{" "}
            <span className="font-mono">Q3, Q4, Q11, Q12, Q14, Q15, Q16, Q17, Q18, Q19</span>.
          </p>
          <p>
            Archived RED BQs (<span className="font-mono">Q1, Q2, Q5–Q10, Q13</span>) are not
            implementable against the current Firestore schema and have no dashboard page.
          </p>
          <p>
            <Link className="text-foreground underline underline-offset-4" href="/">
              Back to overview →
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

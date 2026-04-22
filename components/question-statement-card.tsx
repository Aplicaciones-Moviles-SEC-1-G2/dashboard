import { Card, CardContent } from "@/components/ui/card";

interface QuestionStatementCardProps {
  question: string;
}

export function QuestionStatementCard({
  question,
}: QuestionStatementCardProps): React.JSX.Element {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-lg leading-relaxed text-foreground">{question}</p>
      </CardContent>
    </Card>
  );
}

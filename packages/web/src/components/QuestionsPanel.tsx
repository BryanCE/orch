import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { CircleHelp } from "lucide-react";

import { useLiveQueryInvalidation } from "@/hooks/use-live-query-invalidation";
import { answerAgent, getQuestions } from "@/server/orch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

const QUESTIONS_QUERY_KEY = ["questions"] as const;

export function QuestionsPanel() {
  useLiveQueryInvalidation(QUESTIONS_QUERY_KEY);
  const questionsQuery = useQuery({
    queryKey: QUESTIONS_QUERY_KEY,
    queryFn: getQuestions,
    staleTime: Infinity,
  });
  const [actionError, setActionError] = useState<string | null>(null);

  if (questionsQuery.isPending) return null;
  if (questionsQuery.isError) return <p className="mb-6 text-sm text-destructive">Questions unavailable: {questionsQuery.error.message}</p>;
  if (questionsQuery.data.daemon === "down") {
    return <p className="mb-6 text-sm text-destructive">Questions unavailable: {questionsQuery.data.reason ?? "daemon unavailable"}</p>;
  }
  if (questionsQuery.data.questions.length === 0) return null;

  return (
    <section className="mb-6 space-y-3" aria-label="Agent questions">
      <div className="flex items-center gap-2">
        <CircleHelp className="size-4 text-chart-4" />
        <h2 className="text-sm font-semibold uppercase tracking-wider">Questions waiting for you</h2>
        <Badge variant="outline" className="font-mono text-[10px]">{questionsQuery.data.questions.length}</Badge>
      </div>
      {actionError && <p className="text-sm text-destructive">{actionError}</p>}
      {questionsQuery.data.questions.map((question) => (
        <QuestionCard key={question.key} question={question} onError={setActionError} />
      ))}
    </section>
  );
}

function QuestionCard({ question, onError }: { question: { key: string; name: string | null; text: string | null }; onError: (message: string) => void }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (text.trim().length === 0) return;
    setSending(true);
    onError("");
    const result = await answerAgent({ data: { key: question.key, text: text.trim() } });
    setSending(false);
    if ("daemon" in result) {
      onError(result.reason ?? "Unable to deliver answer");
      return;
    }
    setText("");
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{question.name ?? question.key}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm">{question.text ?? "This agent is waiting for an answer."}</p>
        <form className="space-y-2" onSubmit={submit}>
          <Textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="Type an answer" aria-label={`Answer ${question.name ?? question.key}`} disabled={sending} />
          <Button type="submit" disabled={sending || text.trim().length === 0}>{sending ? "Sending…" : "Answer"}</Button>
        </form>
      </CardContent>
    </Card>
  );
}

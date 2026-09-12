import { requireAdmin } from "@/lib/auth";
import { QuizMonitor } from "@/components/QuizMonitor";

export default async function AdminQuizMonitor({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  return <QuizMonitor quizId={id} backHref="/admin/quizzes" />;
}
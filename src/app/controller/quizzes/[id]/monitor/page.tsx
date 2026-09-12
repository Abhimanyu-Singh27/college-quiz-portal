import { requireController } from "@/lib/auth";
import { QuizMonitor } from "@/components/QuizMonitor";

export default async function ControllerQuizMonitor({ params }: { params: Promise<{ id: string }> }) {
  await requireController();
  const { id } = await params;
  return <QuizMonitor quizId={id} backHref="/controller/dashboard" />;
}
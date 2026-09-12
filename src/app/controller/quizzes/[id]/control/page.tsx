import { requireController } from "@/lib/auth";
import QuizControlPage from "../../../../admin/quizzes/[id]/control/page";

export default async function ControllerQuizControl({ params }: { params: Promise<{ id: string }> }) {
  await requireController();
  return <QuizControlPage params={params} />;
}
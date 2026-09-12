import { redirect } from "next/navigation";
export default async function AdminQuizResults({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/admin/quizzes/${id}/monitor`);
}

import Link from "next/link";
import { AlertCircle, Home } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-slate-50 flex items-center justify-center p-4">
      <div className="text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Access Denied</h1>
        <p className="text-slate-600 mb-6">
          You don't have permission to access this page. Please log in with the correct role.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition"
        >
          <Home className="w-5 h-5" />
          Go to Home
        </Link>
      </div>
    </div>
  );
}

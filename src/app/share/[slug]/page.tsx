import { notFound } from "next/navigation";
import { AuditReportPanel } from "@/components/audit/AuditReportPanel";
import { BookIcon } from "@/components/ui/icons";
import { isDatabaseConfigured } from "@/lib/db";
import { getAuditBySlug } from "@/lib/audits-db";

type ShareAuditPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ShareAuditPage({ params }: ShareAuditPageProps) {
  const { slug } = await params;

  if (!isDatabaseConfigured()) {
    notFound();
  }

  const report = await getAuditBySlug(slug);
  if (!report) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-8 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <BookIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-900">
              Dissertation Navigator
            </p>
            <p className="text-xs text-zinc-500">Shared audit report</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-8 py-8">
        <header className="mb-8">
          <p className="mb-2 inline-flex rounded-full bg-zinc-200/80 px-2.5 py-1 text-xs font-medium text-zinc-600">
            Read-only view
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Audit Report
          </h1>
          <p className="mt-1 text-sm text-zinc-500">{report.fileName}</p>
        </header>

        <AuditReportPanel report={report} />
      </main>
    </div>
  );
}

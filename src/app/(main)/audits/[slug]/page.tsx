import Link from "next/link";
import { notFound } from "next/navigation";
import { AuditReportPanel } from "@/components/audit/AuditReportPanel";
import { DeleteAuditButton } from "@/components/audit/DeleteAuditButton";
import { ShareAuditLink } from "@/components/audit/ShareAuditLink";
import { isDatabaseConfigured } from "@/lib/db";
import { getAuditBySlug } from "@/lib/audits-db";

type AuditPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function AuditPage({ params }: AuditPageProps) {
  const { slug } = await params;

  if (!isDatabaseConfigured()) {
    notFound();
  }

  const report = await getAuditBySlug(slug);
  if (!report) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <header className="mb-8">
        <div className="mb-4 flex items-center justify-between gap-4">
          <Link
            href={`/audits/projects/${report.projectId}`}
            className="inline-flex items-center text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
          >
            ← {report.projectName || "Back to project"}
          </Link>
          <DeleteAuditButton
            slug={report.slug}
            fileName={report.fileName}
            variant="button"
          />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Audit Report
        </h1>
        <p className="mt-1 text-sm text-zinc-500">{report.fileName}</p>
      </header>

      <div className="mb-8">
        <ShareAuditLink slug={report.slug} />
      </div>

      <AuditReportPanel report={report} editable />
    </div>
  );
}

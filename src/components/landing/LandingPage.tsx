import Link from "next/link";
import { LandingAuthActions } from "@/components/landing/LandingAuthActions";
import {
  AuditsIcon,
  BookIcon,
  SettingsIcon,
} from "@/components/ui/icons";
import {
  LANDING_EXAMPLE,
  LANDING_SEVERITY_STYLES,
} from "@/lib/landing-example-copy";

const FEATURES = [
  {
    title: "Your review criteria, built in",
    description:
      "Configure validation agents around what you actually look for — methodology rigor, literature gaps, APA formatting, IRB alignment, and chapter structure.",
    icon: SettingsIcon,
  },
  {
    title: "Findings you can share with students",
    description:
      "Each audit produces severity-ranked findings with coaching notes, so you can give students specific, actionable feedback instead of vague margin comments.",
    icon: AuditsIcon,
  },
  {
    title: "Every student, every draft, tracked",
    description:
      "Organize audits by candidate and see how a student's dissertation improves across revisions — from prospectus through final draft.",
    icon: BookIcon,
  },
];

const STEPS = [
  {
    step: "01",
    title: "Set up agents for how you review",
    description:
      "Define validation agents that mirror your expectations — what you flag in methodology, what you require in Chapter 1, how you check citations.",
  },
  {
    step: "02",
    title: "Upload a student's dissertation draft",
    description:
      "Submit a student's chapter or full manuscript. All active agents run in parallel and surface issues you might miss on a late-night read-through.",
  },
  {
    step: "03",
    title: "Share findings back with your student",
    description:
      "Review the audit report, edit or dismiss findings, then use the structured output to guide your student's next revision — or prep for committee.",
  },
];

const CHAIR_BENEFITS = [
  "Catch methodology and structure problems before your student sends drafts to the full committee",
  "Turn hours of line-by-line reading into a prioritized list of what actually needs fixing",
  "Give every advisee consistent feedback, even when you're chairing multiple dissertations",
  "Keep a record of what you flagged in each revision so progress is visible over time",
];

export function LandingPage() {
  return (
    <div className="min-h-full bg-zinc-50">
      <header className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <BookIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight text-zinc-900">
                Dissertation Navigator
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            <a
              href="#features"
              className="text-sm font-medium text-zinc-600 transition hover:text-zinc-900"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="text-sm font-medium text-zinc-600 transition hover:text-zinc-900"
            >
              How it works
            </a>
            <a
              href="#for-chairs"
              className="text-sm font-medium text-zinc-600 transition hover:text-zinc-900"
            >
              For chairs
            </a>
          </nav>

          <LandingAuthActions variant="header" />
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-zinc-200 bg-white">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-indigo-100/60 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-violet-100/50 blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-6xl px-6 pb-24 pt-20 md:pb-32 md:pt-28">
            <div className="mx-auto max-w-3xl text-center">
              <p className="mb-4 inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
                For dissertation chairs reviewing student work
              </p>
              <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 md:text-5xl md:leading-tight">
                Review student dissertations faster, with better feedback
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-zinc-600">
                Upload a student&apos;s draft and run AI validation agents against
                it. You get a structured audit report with prioritized findings
                and coaching notes—so you can focus on guiding your student,
                not reviewing every page line by line.
              </p>
              <LandingAuthActions variant="hero" />
            </div>

            {/* Hero visual — example findings preview */}
            <div className="mx-auto mt-16 max-w-3xl">
              <div className="rounded-2xl border border-zinc-200 bg-white shadow-xl shadow-zinc-200/50">
                <div className="border-b border-zinc-100 px-6 py-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                    Example findings
                  </p>
                  <p className="mt-1 text-sm font-semibold text-zinc-900">
                    {LANDING_EXAMPLE.fileName}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Reviewed by {LANDING_EXAMPLE.agentsCompleted} validation
                    agents
                  </p>
                </div>

                <div className="space-y-3 p-6">
                  {LANDING_EXAMPLE.findings.map((finding) => {
                    const style = LANDING_SEVERITY_STYLES[finding.severity];
                    return (
                      <div
                        key={finding.title}
                        className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4"
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${style.dot}`}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${style.badge}`}
                              >
                                {style.label}
                              </span>
                              <span className="text-xs text-zinc-400">
                                {finding.agent}
                              </span>
                            </div>
                            <p className="mt-2 text-sm font-medium text-zinc-900">
                              {finding.title}
                            </p>
                            <p className="mt-1 text-sm leading-relaxed text-zinc-600">
                              {finding.summary}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="border-b border-zinc-200 py-24">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-semibold tracking-tight text-zinc-900">
                The review toolkit chairs actually need
              </h2>
              <p className="mt-4 text-zinc-600">
                You know what good dissertation work looks like. Dissertation
                Navigator helps you check every student draft against those
                standards — consistently, across your whole advisee list.
              </p>
            </div>

            <div className="mt-16 grid gap-6 md:grid-cols-3">
              {FEATURES.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm"
                  >
                    <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-semibold text-zinc-900">
                      {feature.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                      {feature.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="border-b border-zinc-200 bg-white py-24">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-semibold tracking-tight text-zinc-900">
                From student upload to feedback they can use
              </h2>
              <p className="mt-4 text-zinc-600">
                Three steps. Upload your student&apos;s draft, review what the
                agents found, and send back structured feedback — you stay in
                control of every finding.
              </p>
            </div>

            <div className="mt-16 grid gap-8 md:grid-cols-3">
              {STEPS.map((item) => (
                <div key={item.step} className="relative">
                  <span className="text-5xl font-bold text-indigo-100">
                    {item.step}
                  </span>
                  <h3 className="mt-2 text-lg font-semibold text-zinc-900">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* For chairs */}
        <section id="for-chairs" className="py-24">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid items-center gap-12 md:grid-cols-2">
              <div>
                <h2 className="text-3xl font-semibold tracking-tight text-zinc-900">
                  Built for the chair who reads every draft
                </h2>
                <p className="mt-4 text-zinc-600">
                  You&apos;re the first line of defense before the committee sees
                  anything. Dissertation Navigator does the systematic checking
                  so you can spend your time on the mentoring — helping students
                  understand what to fix and why it matters.
                </p>
              </div>

              <ul className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
                {CHAIR_BENEFITS.map((benefit) => (
                  <li
                    key={benefit}
                    className="flex items-start gap-3 text-sm text-zinc-700"
                  >
                    <span className="mt-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    </span>
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-zinc-200 bg-indigo-600 py-20">
          <div className="mx-auto max-w-6xl px-6 text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-white">
              Ready to review your next student draft?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-indigo-100">
              Upload a dissertation chapter, run your validation agents, and
              get structured findings you can share with your student in minutes.
            </p>
            <LandingAuthActions variant="cta" />
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-200 bg-white py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 md:flex-row">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <BookIcon className="h-4 w-4" />
            </div>
            <p className="text-sm font-medium text-zinc-900">
              Dissertation Navigator
            </p>
          </div>
          <p className="text-sm text-zinc-500">
            AI-powered dissertation review for dissertation chairs.
          </p>
        </div>
      </footer>
    </div>
  );
}

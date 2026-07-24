import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";

export const metadata: Metadata = {
  title: "Dissertation Navigator — Review Student Dissertations with AI",
  description:
    "Dissertation chairs use Dissertation Navigator to audit student dissertation drafts, surface prioritized findings, and give actionable feedback.",
};

export default function Home() {
  return <LandingPage />;
}

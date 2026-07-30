import type { Metadata } from "next";
import { SignUp } from "@clerk/nextjs";

export const metadata: Metadata = {
  title: "Create account",
};

export default function SignUpPage() {
  return (
    <SignUp
      appearance={{
        elements: {
          rootBox: "mx-auto w-full max-w-md",
          card: "rounded-2xl border border-zinc-200 shadow-xl shadow-zinc-200/50",
        },
      }}
    />
  );
}

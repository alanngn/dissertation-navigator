import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function SignInPage() {
  return (
    <SignIn
      appearance={{
        elements: {
          rootBox: "mx-auto w-full max-w-md",
          card: "rounded-2xl border border-zinc-200 shadow-xl shadow-zinc-200/50",
        },
      }}
    />
  );
}

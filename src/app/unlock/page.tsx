import type { Metadata } from "next";
import Image from "next/image";
import { CubeMark } from "@/components/ui";
import { company } from "@/content/site";
import { safeNext } from "@/lib/gate";
import { PasswordField } from "./PasswordField";

export const metadata: Metadata = {
  title: "Private preview | JBOX iDsign LLC",
  robots: { index: false, follow: false },
};

const MESSAGES: Record<string, string> = {
  wrong: "That password isn't right. Please try again.",
  limit: "Too many attempts. Please wait a few minutes and try again.",
};

export default async function UnlockPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? MESSAGES[params.error] : undefined;
  const next = safeNext(params.next);

  return (
    <main className="gate">
      <div className="gate__panel">
        <div className="gate__brand">
          <CubeMark size={40} />
          <Image src="/images/wordmark.png" alt={company.name} width={1000} height={100} className="gate__word" unoptimized />
        </div>

        <p className="mono gate__eyebrow">Private preview</p>
        <h1 className="h-section gate__title">This website isn&apos;t public yet.</h1>
        <p className="gate__body">Enter the preview password to continue.</p>

        <form className="gate__form" method="post" action="/api/unlock">
          <input type="hidden" name="next" value={next} />
          <PasswordField error={error} />
          <button type="submit" className="btn btn--light">
            <span className="btn__label">
              <span className="btn__roll" data-text="Enter site">
                Enter site
              </span>
            </span>
          </button>
        </form>

        <p className="mono gate__foot">
          © {new Date().getFullYear()} {company.name} · {company.location}
        </p>
      </div>
    </main>
  );
}

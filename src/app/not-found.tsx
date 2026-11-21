import { CubeMark } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="not-found">
      <CubeMark size={48} />
      <p className="mono">404 / Page not found</p>
      <h1 className="h-section">This page doesn&apos;t exist.</h1>
      <a href="/" className="btn btn--light">
        <span className="btn__label">Back to home</span>
      </a>
    </main>
  );
}

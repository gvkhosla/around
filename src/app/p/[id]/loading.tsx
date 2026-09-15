import { SiteHeader } from "@/components/site-header";
import { StatusLine } from "@/components/status-line";

export default function LoadingPaper() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-6 pt-14">
          <StatusLine>Fetching the paper…</StatusLine>
        </div>
      </main>
    </div>
  );
}

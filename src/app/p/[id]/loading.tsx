import { SiteHeader } from "@/components/site-header";

export default function LoadingPaper() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-6 pt-14">
          <div className="h-10 max-w-md rounded-lg bg-neutral-50" />
          <div className="mt-4 h-24 max-w-xl rounded-lg bg-neutral-50" />
        </div>
      </main>
    </div>
  );
}

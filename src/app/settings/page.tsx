import { SiteHeader } from "@/components/site-header";
import { SettingsForm } from "@/components/settings-form";

export default function SettingsPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="pt-10 pb-20 sm:pt-14">
          <div className="mx-auto max-w-5xl px-6">
            <h1 className="max-w-[20ch] text-4xl font-semibold tracking-tight text-balance">
              Your model.
            </h1>
            <p className="mt-4 max-w-[48ch] text-base text-pretty text-neutral-600">
              Optional. Connect ChatGPT or paste a key if you want sharper
              writeups. Tokens stay in this browser.
            </p>
            <div className="mt-10 max-w-xl">
              <SettingsForm />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

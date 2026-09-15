export function StatusLine({ children }: { children: string }) {
  return (
    <p className="text-base text-pretty text-neutral-500 sm:text-sm">
      {children}
    </p>
  );
}

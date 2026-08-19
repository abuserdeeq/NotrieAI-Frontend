export function LogoMark() {
  return (
    <div
      className="relative flex h-10 w-10 items-center justify-center rounded-[13px] bg-[hsl(var(--accent))] text-[hsl(var(--primary))] shadow-[0_8px_22px_hsl(39_93%_62%_/_0.22)]"
      aria-hidden="true"
    >
      <span className="absolute h-5 w-5 rounded-full border-[1.5px] border-[hsl(var(--primary))]" />
      <span className="absolute h-2.5 w-2.5 rounded-full bg-[hsl(var(--primary))]" />
      <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[hsl(var(--primary))]" />
    </div>
  );
}

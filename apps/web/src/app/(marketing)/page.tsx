import { heroHeadline, heroSubheadline } from "@ui-tokens/copy/es-CL";

export default function MarketingPage() {
  return (
    <main className="min-h-screen bg-paper text-ink">
      <section
        aria-labelledby="hero-heading"
        className="mx-auto flex min-h-screen max-w-6xl items-center px-6 py-24 sm:px-10 lg:px-16"
      >
        <div className="max-w-3xl">
          <h1
            id="hero-heading"
            className="text-balance font-display text-[clamp(2.25rem,1.5rem+3vw,4.5rem)] font-medium leading-[1.02] tracking-[-0.03em]"
          >
            {heroHeadline}
          </h1>
          <p className="mt-6 max-w-[65ch] font-body text-lg leading-8 text-ink/80 sm:text-xl">
            {heroSubheadline}
          </p>
        </div>
      </section>
    </main>
  );
}

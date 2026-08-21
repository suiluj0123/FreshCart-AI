import Image from 'next/image'
import Link from 'next/link'
import Button from '@/components/ui/Button'

interface HeroSectionProps {
  user: { name: string; email: string; lastMealPlan?: string } | null
}

export default function HeroSection({ user }: HeroSectionProps) {
  const firstName = user?.name?.split(' ')[0] ?? null

  return (
    <section className="relative overflow-hidden bg-gray-900">

      {/* Full-width background image */}
      <div className="absolute inset-0">
        <Image
          src="/hero-ingredients.jpg"
          alt="Fresh Filipino ingredients on marble"
          fill
          className="object-cover object-center"
          priority
          sizes="100vw"
        />
        {/* Left-to-right dark gradient for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-gray-900/90 via-gray-900/55 to-transparent" />
        {/* Bottom fade into the search strip */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-gray-900/60 to-transparent" />
      </div>

      {/* Hero content */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
        <div className="max-w-lg">

          {user ? (
            <>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-500/20 border border-emerald-400/30 px-3 py-1 text-xs font-semibold text-emerald-300 backdrop-blur-sm uppercase tracking-wide">
                Welcome back, {firstName}!
              </div>
              <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
                Your fresh groceries,{' '}
                <span className="text-emerald-400">AI-planned</span> for you.
              </h1>
              {user.lastMealPlan && (
                <p className="mt-3 text-sm text-gray-300">
                  Last plan: <span className="font-semibold text-white">{user.lastMealPlan}</span>
                </p>
              )}
              <p className="mt-3 text-base text-gray-300 leading-relaxed">
                Pick up where you left off or start a new AI-powered meal plan.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/meal-plan">
                  <Button variant="primary" size="md">Continue Planning</Button>
                </Link>
                <Link href="/meal-plan?new=1">
                  <button className="rounded-lg border border-white/40 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/20 transition-colors">
                    New Meal Plan
                  </button>
                </Link>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
                Discover the Joy of Cooking with{' '}
                <span className="text-emerald-400">FreshCart AI</span>.
              </h1>
              <p className="mt-4 text-base text-gray-300 leading-relaxed">
                Fresh local ingredients, smart AI meal planning, and effortless delivery across the Philippines.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/meal-plan">
                  <Button variant="primary" size="md">Start Meal Planning</Button>
                </Link>
                <Link href="/products">
                  <button className="rounded-lg border border-white/40 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/20 transition-colors">
                    Browse Groceries
                  </button>
                </Link>
              </div>
            </>
          )}

          {/* Trust badges */}
          <div className="mt-8 flex flex-wrap items-center gap-5 text-xs text-gray-300">
            <span className="flex items-center gap-1"><span className="text-emerald-400 font-bold">✓</span> Fresh local produce</span>
            <span className="flex items-center gap-1"><span className="text-emerald-400 font-bold">✓</span> AI meal plans</span>
            <span className="flex items-center gap-1"><span className="text-emerald-400 font-bold">✓</span> Metro Manila delivery</span>
          </div>
        </div>
      </div>

      {/* AI Search strip */}
      <div className="relative z-10 border-t border-white/10 bg-black/40 backdrop-blur-md py-4">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <form action="/products" method="GET" className="flex gap-2">
            <input
              name="q"
              type="text"
              placeholder="What are you cooking or shopping for today?"
              className="flex-1 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white shadow-sm placeholder-gray-400 backdrop-blur-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
            />
            <Button type="submit" variant="primary" size="md" className="shrink-0 rounded-xl px-4 gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="hidden sm:inline">Search & Plan</span>
            </Button>
          </form>
        </div>
      </div>

    </section>
  )
}

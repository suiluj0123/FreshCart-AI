import Image from 'next/image'
import Link from 'next/link'

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
        <div className="absolute inset-0 bg-gradient-to-r from-gray-950/90 via-gray-900/60 to-transparent" />
        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-gray-900/70 to-transparent" />
      </div>

      {/* Hero content */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="max-w-2xl">
          {user ? (
            <>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-500/20 border border-emerald-400/30 px-3.5 py-1 text-xs font-bold text-emerald-300 backdrop-blur-sm uppercase tracking-wide">
                Welcome back, {firstName}! 🌿
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight tracking-tight text-white">
                Your fresh groceries,{' '}
                <span className="text-emerald-400">AI-planned</span> for you.
              </h1>
              <p className="mt-4 text-base sm:text-lg text-gray-300 leading-relaxed">
                Pick up where you left off or start a new AI-powered Filipino meal plan with 1-click cart checkout.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href="/meal-planner"
                  className="rounded-2xl bg-emerald-600 px-6 py-3.5 text-sm font-extrabold text-white shadow-lg hover:bg-emerald-500 active:bg-emerald-700 transition-all cursor-pointer inline-flex items-center gap-2"
                >
                  <span>Launch AI Meal Planner ✨</span>
                </Link>
                <Link
                  href="/account/orders"
                  className="rounded-2xl border border-white/30 bg-white/10 px-6 py-3.5 text-sm font-bold text-white backdrop-blur-sm hover:bg-white/20 transition-all inline-flex items-center gap-2"
                >
                  <span>View Order History 📜</span>
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-500/20 border border-emerald-400/30 px-3.5 py-1 text-xs font-bold text-emerald-300 backdrop-blur-sm uppercase tracking-wide">
                🇵🇭 Philippines&apos; First AI Grocery Store
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight tracking-tight text-white">
                Discover the Joy of Cooking with{' '}
                <span className="text-emerald-400">FreshCart AI</span>.
              </h1>
              <p className="mt-4 text-base sm:text-lg text-gray-300 leading-relaxed">
                Fresh local ingredients, smart AI meal planning, and effortless door-to-door delivery across Metro Manila.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href="/meal-planner"
                  className="rounded-2xl bg-emerald-600 px-6 py-3.5 text-sm font-extrabold text-white shadow-lg hover:bg-emerald-500 active:bg-emerald-700 transition-all cursor-pointer inline-flex items-center gap-2"
                >
                  <span>Start AI Meal Planning ✨</span>
                </Link>
                <Link
                  href="/products"
                  className="rounded-2xl border border-white/30 bg-white/10 px-6 py-3.5 text-sm font-bold text-white backdrop-blur-sm hover:bg-white/20 transition-all inline-flex items-center gap-2"
                >
                  <span>Browse Groceries 🛒</span>
                </Link>
              </div>
            </>
          )}

          {/* Trust badges */}
          <div className="mt-10 flex flex-wrap items-center gap-6 text-xs font-semibold text-gray-300">
            <span className="flex items-center gap-1.5">
              <span className="text-emerald-400 font-bold text-sm">✓</span> 100% Farm-Fresh Local Produce
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-emerald-400 font-bold text-sm">✓</span> 1-Click AI Recipe Carts
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-emerald-400 font-bold text-sm">✓</span> Fast Metro Manila Delivery
            </span>
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
              placeholder="What are you cooking or shopping for today? (e.g., Sinigang, Pork Belly, Kangkong)"
              className="flex-1 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white shadow-sm placeholder-gray-400 backdrop-blur-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
            />
            <button
              type="submit"
              className="shrink-0 rounded-2xl bg-emerald-600 px-6 py-3 text-xs font-bold text-white shadow-md hover:bg-emerald-500 transition-all inline-flex items-center gap-2 cursor-pointer"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>Search & Plan</span>
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}
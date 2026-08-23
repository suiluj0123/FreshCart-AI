import { createClient } from '@/lib/auth/server'
import HeroSection from '@/components/storefront/HeroSection'
import MealKitCard from '@/components/storefront/MealKitCard'
import Link from 'next/link'
import { MEAL_KITS_DATA } from '@/lib/data/mealKits'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  let userProfile: { name: string; email: string } | null = null
  if (authUser) {
    const { data: profile } = await supabase
      .from('User')
      .select('name, email')
      .eq('clerkId', authUser.id)
      .maybeSingle()

    userProfile = profile
      ? { name: profile.name ?? '', email: profile.email }
      : { name: authUser.email?.split('@')[0] ?? '', email: authUser.email ?? '' }
  }

  return (
    <div className="space-y-0">
      {/* Hero */}
      <HeroSection user={userProfile} />

      {/* AI Meal Kits Showcase Section */}
      <section id="meal-kits" className="py-16 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600 mb-1">
                Curated Recipe Bundles
              </p>
              <h2 className="text-3xl font-extrabold text-gray-900">Featured Meal Kits</h2>
              <p className="mt-2 text-gray-500 max-w-xl">
                Pre-configured grocery bundles built around authentic Filipino recipes. Add to cart with pre-measured fresh ingredients.
              </p>
            </div>
            <Link
              href="/meal-kits"
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-4 py-2 text-xs font-extrabold text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
            >
              Explore All Meal Kits
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {MEAL_KITS_DATA.slice(0, 6).map((kit) => (
              <MealKitCard key={kit.id} kit={kit} />
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-16 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">How FreshCart AI Works</h2>
            <p className="mt-3 text-gray-500 max-w-xl mx-auto">
              From craving to cart in seconds, powered by AI that knows local cuisine and grocery inventory.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            <div className="rounded-2xl bg-white p-8 border border-gray-100 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 text-2xl font-bold mb-4">
                1
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Select Meal Kits or Groceries</h3>
              <p className="text-sm text-gray-500">
                Browse our curated meal kits or individual produce, meats, and pantry staples.
              </p>
            </div>

            <div className="rounded-2xl bg-white p-8 border border-gray-100 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 text-2xl font-bold mb-4">
                2
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Choose Delivery or Pickup</h3>
              <p className="text-sm text-gray-500">
                Select fast door-to-door delivery or free store pickup at your convenience.
              </p>
            </div>

            <div className="rounded-2xl bg-white p-8 border border-gray-100 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 text-2xl font-bold mb-4">
                3
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Real-Time Order Tracking</h3>
              <p className="text-sm text-gray-500">
                Track your order status step-by-step from packing to delivery right on your phone.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
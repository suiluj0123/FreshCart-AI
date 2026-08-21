import { createClient } from '@/lib/auth/server'
import HeroSection from '@/components/storefront/HeroSection'
import MealKitCard, { MealKit } from '@/components/storefront/MealKitCard'
import Link from 'next/link'

const SHOWCASE_KITS: MealKit[] = [
  {
    id: 'kit-sinigang-baboy',
    name: 'Sinigang na Baboy Kit',
    description: 'Everything you need for a classic sour pork soup: liempo, kangkong, labanos, sitaw, and tamarind mix.',
    price: 849,
    serves: 4,
    emoji: '🍲',
    imageUrl: '/sinigang-kit.jpg',
    tags: ['Filipino Classic', 'Serves 4'],
  },
  {
    id: 'kit-chicken-adobo',
    name: 'Chicken Adobo Kit',
    description: 'Tender chicken thighs marinated in soy, vinegar, garlic, bay leaf, and whole peppercorns.',
    price: 799,
    serves: 4,
    emoji: '🍗',
    imageUrl: '/adobo-kit.jpg',
    tags: ['Best Seller', 'Serves 4'],
  },
  {
    id: 'kit-tropical-basket',
    name: 'Tropical Fruit Basket',
    description: 'Ripe Carabao mangoes, pineapple, papaya, and bananas — locally sourced and hand-selected.',
    price: 999,
    serves: 6,
    emoji: '🥭',
    imageUrl: '/tropical-basket.jpg',
    tags: ['Healthy', 'Seasonal'],
  },
  {
    id: 'kit-pinakbet',
    name: 'Pinakbet Kit',
    description: 'Ampalaya, talong, okra, kalabasa, and bagoong — a nutritious Ilocano vegetable medley.',
    price: 649,
    serves: 4,
    emoji: '🥦',
    imageUrl: '/pinakbet-kit.jpg',
    tags: ['Vegetable', 'Low-calorie'],
  },
  {
    id: 'kit-kare-kare',
    name: 'Kare-Kare Kit',
    description: 'Oxtail and tripe in creamy peanut sauce with banana blossom, eggplant, and fermented shrimp paste.',
    price: 1299,
    serves: 5,
    emoji: '🥜',
    imageUrl: '/kare-kare-kit.jpg',
    tags: ['Premium', 'Festive'],
  },
  {
    id: 'kit-lumpiang-shanghai',
    name: 'Lumpiang Shanghai Kit',
    description: 'Ground pork spring roll filling with carrots, onions, and spices — ready to wrap and fry.',
    price: 549,
    serves: 30,
    emoji: '🥢',
    imageUrl: '/lumpiang-shanghai-kit.jpg',
    tags: ['Party Favorite', 'Quick'],
  },
]

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  let userProfile: { name: string; email: string; lastMealPlan?: string } | null = null

  if (authUser) {
    const { data: profile } = await supabase
      .from('User')
      .select('name, email, id')
      .eq('authId', authUser.id)
      .single()

    const { data: lastPlan } = await supabase
      .from('MealPlan')
      .select('prompt')
      .eq('userId', profile?.id ?? '')
      .order('createdAt', { ascending: false })
      .limit(1)
      .maybeSingle()

    userProfile = {
      name: profile?.name ?? authUser.email?.split('@')[0] ?? '',
      email: profile?.email ?? authUser.email ?? '',
      lastMealPlan: lastPlan?.prompt ?? undefined,
    }
  }

  return (
    <>
      <HeroSection user={userProfile} />

      {/* AI Meal Kits Section */}
      <section id="meal-kits" className="py-16 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600 mb-1">
                Powered by AI
              </p>
              <h2 className="text-3xl font-extrabold text-gray-900">AI Meal Planning</h2>
              <p className="mt-2 text-gray-500 max-w-xl">
                Pre-configured grocery bundles built around beloved Filipino recipes. Add to cart and we handle the ingredient list.
              </p>
            </div>
            <Link
              href="/products"
              className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
            >
              View all groceries
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {SHOWCASE_KITS.map((kit) => (
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
              From craving to cart in seconds — powered by AI that knows Filipino cuisine.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {[
              {
                step: '1',
                title: 'Tell us what you want to cook',
                desc: 'Type a dish, dietary goal, or budget. Sinigang for 5, budget 1000 pesos works perfectly.',
              },
              {
                step: '2',
                title: 'AI builds your recipe and cart',
                desc: 'Our AI generates a recipe and maps each ingredient to real in-stock products, with smart substitutions.',
              },
              {
                step: '3',
                title: 'We deliver fresh to your door',
                desc: 'Review your cart, checkout, and receive everything you need fresh and on time.',
              },
            ].map(({ step, title, desc }) => (
              <div key={step} className="relative rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                    {step}
                  </span>
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

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
    ingredients: [
      { name: 'Liempo (Pork Belly)', quantity: '500g', price: 320 },
      { name: 'Kangkong', quantity: '1 bundle', price: 45 },
      { name: 'Labanos (Radish)', quantity: '1 pc', price: 40 },
      { name: 'Sitaw (String Beans)', quantity: '100g', price: 35 },
      { name: 'Kamatis (Tomatoes)', quantity: '3 pcs', price: 30 },
      { name: 'Sibuyas (Onion)', quantity: '1 pc', price: 20 },
      { name: 'Tamarind Mix (Sinigang sa Sampaloc)', quantity: '1 pack', price: 25 },
      { name: 'Gabi (Taro)', quantity: '2 pcs', price: 55 },
      { name: 'Patis (Fish Sauce)', quantity: '50ml', price: 20 },
      { name: 'Salt & Pepper', quantity: 'to taste', price: 15 },
      { name: 'Water', quantity: '1L', price: 0 },
      { name: 'Siling Haba (Long Chili)', quantity: '2 pcs', price: 15 },
      { name: 'Siling Labuyo (Bird\'s Eye Chili)', quantity: '2 pcs', price: 10 },
      { name: 'Eggplant (Talong)', quantity: '2 pcs', price: 40 },
      { name: 'Okra', quantity: '100g', price: 30 },
      { name: 'Cooking Oil', quantity: '2 tbsp', price: 20 },
      { name: 'MSG (optional)', quantity: 'pinch', price: 5 },
      { name: 'Sugar (optional)', quantity: 'pinch', price: 5 },
      { name: 'Bay Leaves', quantity: '2 pcs', price: 10 },
      { name: 'Garlic', quantity: '4 cloves', price: 15 },
    ],
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
    ingredients: [
      { name: 'Chicken Thighs', quantity: '800g', price: 350 },
      { name: 'Toyo (Soy Sauce)', quantity: '100ml', price: 45 },
      { name: 'Suka (Vinegar)', quantity: '100ml', price: 30 },
      { name: 'Bawang (Garlic)', quantity: '1 head', price: 25 },
      { name: 'Dahon ng Laurel (Bay Leaves)', quantity: '4 pcs', price: 15 },
      { name: 'Paminta (Black Pepper)', quantity: '1 tsp', price: 20 },
      { name: 'Cooking Oil', quantity: '3 tbsp', price: 25 },
      { name: 'Brown Sugar', quantity: '1 tsp', price: 10 },
      { name: 'Water', quantity: '250ml', price: 0 },
      { name: 'Salt', quantity: 'to taste', price: 10 },
      { name: 'Onion', quantity: '1 pc', price: 20 },
      { name: 'Potatoes (optional)', quantity: '2 pcs', price: 50 },
      { name: 'Dried Chili (optional)', quantity: '2 pcs', price: 15 },
    ],
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
    ingredients: [
      { name: 'Carabao Mangoes', quantity: '4 pcs (ripe)', price: 280 },
      { name: 'Pineapple', quantity: '1 pc', price: 180 },
      { name: 'Papaya', quantity: '1 pc (medium)', price: 150 },
      { name: 'Lakatan Bananas', quantity: '1 kilo', price: 120 },
      { name: 'Watermelon (mini)', quantity: '1 pc', price: 180 },
      { name: 'Lanzones', quantity: '250g', price: 89 },
    ],
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
    ingredients: [
      { name: 'Ampalaya (Bitter Melon)', quantity: '2 pcs', price: 60 },
      { name: 'Talong (Eggplant)', quantity: '3 pcs', price: 55 },
      { name: 'Okra', quantity: '150g', price: 40 },
      { name: 'Kalabasa (Squash)', quantity: '300g', price: 50 },
      { name: 'Sitaw (String Beans)', quantity: '100g', price: 35 },
      { name: 'Bagoong Alamang (Shrimp Paste)', quantity: '3 tbsp', price: 55 },
      { name: 'Pork Belly (small cut)', quantity: '200g', price: 140 },
      { name: 'Garlic', quantity: '4 cloves', price: 20 },
      { name: 'Onion', quantity: '1 pc', price: 20 },
      { name: 'Tomatoes', quantity: '2 pcs', price: 30 },
      { name: 'Ginger', quantity: '1 thumb', price: 15 },
      { name: 'Cooking Oil', quantity: '2 tbsp', price: 20 },
      { name: 'Pechay (Bok Choy)', quantity: '1 bundle', price: 35 },
    ],
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
    ingredients: [
      { name: 'Oxtail', quantity: '700g', price: 480 },
      { name: 'Tripe (Tuwalya)', quantity: '200g', price: 120 },
      { name: 'Puso ng Saging (Banana Blossom)', quantity: '1 pc', price: 60 },
      { name: 'Talong (Eggplant)', quantity: '2 pcs', price: 50 },
      { name: 'Sitaw (String Beans)', quantity: '100g', price: 35 },
      { name: 'Pechay (Bok Choy)', quantity: '1 bundle', price: 40 },
      { name: 'Peanut Butter (creamy)', quantity: '150g', price: 90 },
      { name: 'Toasted Ground Rice', quantity: '3 tbsp', price: 20 },
      { name: 'Atsuete (Annatto Powder)', quantity: '1 tsp', price: 15 },
      { name: 'Garlic', quantity: '1 head', price: 25 },
      { name: 'Onion', quantity: '1 pc', price: 20 },
      { name: 'Bagoong Alamang', quantity: '4 tbsp', price: 65 },
      { name: 'Salt & Pepper', quantity: 'to taste', price: 15 },
      { name: 'Cooking Oil', quantity: '3 tbsp', price: 25 },
      { name: 'Water', quantity: '1.5L', price: 0 },
      { name: 'Sugar', quantity: 'pinch', price: 5 },
      { name: 'MSG (optional)', quantity: 'pinch', price: 5 },
      { name: 'Okra', quantity: '100g', price: 35 },
      { name: 'Pork Broth Cubes', quantity: '2 pcs', price: 20 },
      { name: 'Annatto Seeds', quantity: '2 tbsp', price: 15 },
      { name: 'Banana Leaves (optional)', quantity: '2 pcs', price: 15 },
    ],
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
    ingredients: [
      { name: 'Ground Pork', quantity: '500g', price: 200 },
      { name: 'Lumpia Wrappers', quantity: '1 pack (50 pcs)', price: 85 },
      { name: 'Carrots', quantity: '2 pcs (grated)', price: 30 },
      { name: 'Onion', quantity: '1 pc (minced)', price: 20 },
      { name: 'Garlic', quantity: '4 cloves (minced)', price: 20 },
      { name: 'Egg', quantity: '1 pc', price: 12 },
      { name: 'Toyo (Soy Sauce)', quantity: '2 tbsp', price: 15 },
      { name: 'Salt & Pepper', quantity: 'to taste', price: 10 },
      { name: 'Sesame Oil', quantity: '1 tsp', price: 25 },
      { name: 'Cornstarch', quantity: '2 tbsp', price: 15 },
      { name: 'Cooking Oil (for frying)', quantity: '500ml', price: 75 },
      { name: 'Sweet Chili Sauce', quantity: '1 bottle', price: 42 },
    ],
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

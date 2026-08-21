import { CartProvider } from '@/components/storefront/CartProvider'
import Navbar from '@/components/storefront/Navbar'

export default function StorefrontLayout({ children }: LayoutProps<'/'>) {
  return (
    <CartProvider>
      <Navbar />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-gray-100 bg-gray-50 py-8 mt-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-700">FreshCart AI</span>
            </div>
            <p className="text-sm text-gray-500">
              {new Date().getFullYear()} FreshCart AI. Made with love in the Philippines.
            </p>
            <div className="flex gap-4 text-sm text-gray-500">
              <a href="/privacy" className="hover:text-emerald-700 transition-colors">Privacy</a>
              <a href="/terms" className="hover:text-emerald-700 transition-colors">Terms</a>
              <a href="/contact" className="hover:text-emerald-700 transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </CartProvider>
  )
}

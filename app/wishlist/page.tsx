"use client"

import Link from "next/link"
import { Heart } from "lucide-react"
import { useShopWishlist } from "@/hooks/useShopWishlist"
import { ProductCard } from "@/components/product/product-card"
import { ProductGridSkeleton } from "@/components/ui/skeleton"

export default function WishlistPage() {
  const { products, count, isLoading, isAuthenticated } = useShopWishlist()
  const waitingForAccount = !isLoading && !isAuthenticated && count > 0

  return (
    <main className="store-container py-8 md:py-12">
      <h1 className="text-[28px] font-bold md:text-[32px]">My Wishlist</h1>
      <p className="mt-1 text-[15px] text-[#666]">
        {isLoading
          ? "Loading…"
          : waitingForAccount
            ? count === 1
              ? "1 item waiting — sign in to see it"
              : `${count} items waiting — sign in to see them`
            : count === 1
              ? "1 item saved"
              : `${count} items saved`}
      </p>

      {waitingForAccount ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Heart className="h-10 w-10 text-black/20" />
          <h2 className="mt-6 text-[22px] font-bold">Sign in to see your saved items</h2>
          <p className="mx-auto mt-2 max-w-sm text-[15px] text-[#666]">
            Saved items stay with your account. Sign in or create one and they will show up here.
          </p>
          <Link
            href={`/account?mode=login&redirect=${encodeURIComponent("/wishlist")}`}
            className="mt-8 flex h-12 items-center rounded-[10px] bg-brand px-8 text-[14px] font-semibold uppercase text-white"
          >
            Sign in
          </Link>
          <Link
            href={`/account?mode=register&redirect=${encodeURIComponent("/wishlist")}`}
            className="mt-3 text-[14px] font-semibold text-brand underline"
          >
            Create an account
          </Link>
        </div>
      ) : isLoading && products.length === 0 ? (
        <ProductGridSkeleton count={8} className="mt-8" />
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Heart className="h-10 w-10 text-black/20" />
          <h2 className="mt-6 text-[22px] font-bold">Your wishlist is empty</h2>
          <p className="mx-auto mt-2 max-w-sm text-[15px] text-[#666]">
            Save items you love here and add them to your bag anytime.
          </p>
          <Link
            href="/shop"
            className="mt-8 flex h-12 items-center rounded-[10px] bg-brand px-8 text-[14px] font-semibold uppercase text-white"
          >
            Continue shopping
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </main>
  )
}

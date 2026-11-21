import type { NavigationCategory } from "@/types/ecommerce"

export const NAVIGATION: NavigationCategory[] = [
  {
    id: "women",
    label: "Women",
    href: "/shop?category=Women",
    sections: [
      {
        title: "Clothing",
        items: [
          { label: "T-Shirts", href: "/shop?category=Women&subCategory=T-Shirts" },
          { label: "Shirts & Blouses", href: "/shop?category=Women&subCategory=Shirts" },
          { label: "Hoodies & Sweatshirts", href: "/shop?category=Women&subCategory=Hoodies" },
          { label: "Jackets & Coats", href: "/shop?category=Women&subCategory=Jackets" },
          { label: "Dresses", href: "/shop?category=Women&subCategory=Dresses" },
        ],
      },
      {
        title: "Bottoms & Shoes",
        items: [
          { label: "Jeans & Denim", href: "/shop?category=Women&subCategory=Jeans" },
          { label: "Trousers & Pants", href: "/shop?category=Women&subCategory=Trousers" },
          { label: "Sneakers & Shoes", href: "/shop?category=Women&subCategory=Shoes" },
          { label: "Bags & Totes", href: "/shop?category=Women&subCategory=Bags" },
          { label: "Accessories", href: "/shop?category=Women&subCategory=Accessories" },
        ],
      },
      {
        title: "Top Brands",
        items: [
          { label: "Nike", href: "/shop?category=Women&brand=Nike" },
          { label: "Adidas", href: "/shop?category=Women&brand=Adidas" },
          { label: "Reebok", href: "/shop?category=Women&brand=Reebok" },
          { label: "Vans", href: "/shop?category=Women&brand=Vans" },
          { label: "Puma", href: "/shop?category=Women&brand=Puma" },
        ],
      },
      {
        title: "Featured Edits",
        items: [
          { label: "New Season Drops", href: "/shop?category=Women&badge=New" },
          { label: "Best Sellers", href: "/shop?category=Women&badge=Bestseller" },
          { label: "Special Offers", href: "/shop?category=Women&discounted=true" },
          { label: "View All Women", href: "/shop?category=Women" },
        ],
      },
    ],
  },
  {
    id: "men",
    label: "Men",
    href: "/shop?category=Men",
    sections: [
      {
        title: "Tops & Outerwear",
        items: [
          { label: "T-Shirts & Polos", href: "/shop?category=Men&subCategory=T-Shirts" },
          { label: "Button-Down Shirts", href: "/shop?category=Men&subCategory=Shirts" },
          { label: "Hoodies & Fleeces", href: "/shop?category=Men&subCategory=Hoodies" },
          { label: "Jackets & Parkas", href: "/shop?category=Men&subCategory=Jackets" },
        ],
      },
      {
        title: "Pants & Footwear",
        items: [
          { label: "Denim Jeans", href: "/shop?category=Men&subCategory=Jeans" },
          { label: "Tailored Trousers", href: "/shop?category=Men&subCategory=Trousers" },
          { label: "Casual Shorts", href: "/shop?category=Men&subCategory=Shorts" },
          { label: "Sneakers & Boots", href: "/shop?category=Men&subCategory=Shoes" },
          { label: "Bags & Wallets", href: "/shop?category=Men&subCategory=Bags" },
        ],
      },
      {
        title: "Top Brands",
        items: [
          { label: "Nike", href: "/shop?category=Men&brand=Nike" },
          { label: "Adidas Originals", href: "/shop?category=Men&brand=Adidas" },
          { label: "New Balance", href: "/shop?category=Men&brand=New Balance" },
          { label: "Under Armour", href: "/shop?category=Men&brand=Under Armour" },
        ],
      },
      {
        title: "Curated Edits",
        items: [
          { label: "New In Men", href: "/shop?category=Men&badge=New" },
          { label: "Trending Now", href: "/shop?category=Men&badge=Bestseller" },
          { label: "Outlet & Sale", href: "/shop?category=Men&discounted=true" },
          { label: "View All Men", href: "/shop?category=Men" },
        ],
      },
    ],
  },
  {
    id: "kids",
    label: "Kids",
    href: "/shop?category=Kids",
    sections: [
      {
        title: "Boys & Girls",
        items: [
          { label: "T-Shirts & Tops", href: "/shop?category=Kids&subCategory=T-Shirts" },
          { label: "Hoodies & Sweatshirts", href: "/shop?category=Kids&subCategory=Hoodies" },
          { label: "Jackets & Outerwear", href: "/shop?category=Kids&subCategory=Jackets" },
          { label: "Jeans & Joggers", href: "/shop?category=Kids&subCategory=Jeans" },
        ],
      },
      {
        title: "Shoes & More",
        items: [
          { label: "Kids Sneakers", href: "/shop?category=Kids&subCategory=Shoes" },
          { label: "Backpacks & Bags", href: "/shop?category=Kids&subCategory=Bags" },
          { label: "Caps & Hats", href: "/shop?category=Kids&subCategory=Accessories" },
          { label: "View All Kids", href: "/shop?category=Kids" },
        ],
      },
    ],
  },
]

export const TOP_CATEGORIES = [
  { name: "All Clothes", href: "/shop", image: "/assets/c-1.jpg" },
  { name: "Women's Collection", href: "/shop?category=Women", image: "/assets/products/dress-black.jpg" },
  { name: "Men's Collection", href: "/shop?category=Men", image: "/assets/products/jacket-black.jpg" },
  { name: "Kids' Wear", href: "/shop?category=Kids", image: "/assets/products/kids-tee-navy.jpg" },
  { name: "Jackets & Outerwear", href: "/shop?subCategory=Jackets", image: "/assets/products/coat-black.jpg" },
  { name: "Hoodies & Sweats", href: "/shop?subCategory=Hoodies", image: "/assets/products/hoodie-black.jpg" },
  { name: "Denim & Jeans", href: "/shop?subCategory=Jeans", image: "/assets/products/jeans-black.jpg" },
  { name: "Footwear & Shoes", href: "/shop?subCategory=Shoes", image: "/assets/products/shoes-black.jpg" },
]

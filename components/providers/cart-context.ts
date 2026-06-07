"use client";

import { createContext, useContext } from "react";

export type CartItem = {
  cartItemId: string;
  productId: string;
  variantId: string;
  slug: string;
  name: string;
  variantTitle: string;
  image: string | null;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
  maxQty: number;
};

export type CartData = {
  cartId: string | null;
  items: CartItem[];
  count: number;
  subtotalCents: number;
};

export type CartContextValue = {
  cart: CartData;
  count: number;
  subtotalCents: number;
  loading: boolean;
  open: boolean;
  setOpen: (open: boolean) => void;
  addItem: (variantId: string, quantity?: number) => Promise<void>;
  updateQty: (cartItemId: string, quantity: number) => Promise<void>;
  removeItem: (cartItemId: string) => Promise<void>;
};

export const EMPTY_CART: CartData = {
  cartId: null,
  items: [],
  count: 0,
  subtotalCents: 0,
};

export const CartContext = createContext<CartContextValue | null>(null);

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within <CartProvider>");
  return ctx;
}

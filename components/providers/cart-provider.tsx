"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAnonId } from "@/lib/use-anon-id";
import { CartDrawer } from "@/components/cart/cart-drawer";
import {
  CartContext,
  EMPTY_CART,
  type CartContextValue,
} from "@/components/providers/cart-context";

export function CartProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const { anonId, ensureAnonId } = useAnonId();
  const [open, setOpen] = useState(false);

  const addItemMut = useMutation(api.cart.addItem);
  const updateQtyMut = useMutation(api.cart.updateItemQty);
  const removeItemMut = useMutation(api.cart.removeItem);
  const mergeMut = useMutation(api.cart.mergeAnonCartIntoUser);

  // Reactive cart query: identity-keyed when signed in, anon-keyed otherwise.
  const cartArgs = authLoading
    ? "skip"
    : isAuthenticated
      ? {}
      : anonId
        ? { anonId }
        : "skip";
  const cartResult = useQuery(api.cart.getCart, cartArgs);
  const cart = cartResult ?? EMPTY_CART;

  // Merge the guest cart into the account once, after login.
  const mergedRef = useRef(false);
  useEffect(() => {
    if (isAuthenticated && anonId && !mergedRef.current) {
      mergedRef.current = true;
      void mergeMut({ anonId }).catch(() => {
        mergedRef.current = false;
      });
    }
    if (!isAuthenticated) mergedRef.current = false;
  }, [isAuthenticated, anonId, mergeMut]);

  const addItem = useCallback(
    async (variantId: string, quantity = 1) => {
      const id = isAuthenticated ? undefined : ensureAnonId();
      await addItemMut({ variantId: variantId as never, quantity, anonId: id });
      // Intentionally do NOT open the drawer on add — only the navbar count
      // updates (and its badge animates). The drawer opens on cart-icon click.
    },
    [isAuthenticated, ensureAnonId, addItemMut],
  );

  const updateQty = useCallback(
    async (cartItemId: string, quantity: number) => {
      await updateQtyMut({
        cartItemId: cartItemId as never,
        quantity,
        anonId: isAuthenticated ? undefined : (anonId ?? undefined),
      });
    },
    [updateQtyMut, isAuthenticated, anonId],
  );

  const removeItem = useCallback(
    async (cartItemId: string) => {
      await removeItemMut({
        cartItemId: cartItemId as never,
        anonId: isAuthenticated ? undefined : (anonId ?? undefined),
      });
    },
    [removeItemMut, isAuthenticated, anonId],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      count: cart.count,
      subtotalCents: cart.subtotalCents,
      loading: cartResult === undefined && cartArgs !== "skip",
      open,
      setOpen,
      addItem,
      updateQty,
      removeItem,
    }),
    [cart, cartResult, cartArgs, open, addItem, updateQty, removeItem],
  );

  return (
    <CartContext.Provider value={value}>
      {children}
      <CartDrawer />
    </CartContext.Provider>
  );
}

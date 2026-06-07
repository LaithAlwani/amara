"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Handbag } from "@phosphor-icons/react";
import { useCart } from "@/components/providers/cart-context";
import { Button } from "@/components/ui/button";

export function CartButton() {
  const { count, setOpen } = useCart();
  const [bump, setBump] = useState(false);
  const prev = useRef(count);

  useEffect(() => {
    if (count > prev.current) {
      setBump(true);
      const t = setTimeout(() => setBump(false), 400);
      prev.current = count;
      return () => clearTimeout(t);
    }
    prev.current = count;
  }, [count]);

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}
      onClick={() => setOpen(true)}
      className="relative"
    >
      <motion.span
        animate={bump ? { scale: [1, 1.3, 0.95, 1] } : { scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex"
      >
        <Handbag weight="regular" className="size-5" />
      </motion.span>

      <AnimatePresence>
        {count > 0 ? (
          <motion.span
            key="badge"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 22 }}
            className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-clay px-1 text-[10px] font-semibold text-clay-foreground"
          >
            {count}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </Button>
  );
}

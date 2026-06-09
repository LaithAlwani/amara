/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as adminAnalytics from "../adminAnalytics.js";
import type * as adminCatalog from "../adminCatalog.js";
import type * as adminCollections from "../adminCollections.js";
import type * as cart from "../cart.js";
import type * as catalog from "../catalog.js";
import type * as checkout from "../checkout.js";
import type * as collections from "../collections.js";
import type * as content from "../content.js";
import type * as discounts from "../discounts.js";
import type * as emails from "../emails.js";
import type * as giftCards from "../giftCards.js";
import type * as http from "../http.js";
import type * as orders from "../orders.js";
import type * as payments from "../payments.js";
import type * as products from "../products.js";
import type * as rewards from "../rewards.js";
import type * as seed from "../seed.js";
import type * as subscriptions from "../subscriptions.js";
import type * as users from "../users.js";
import type * as wishlist from "../wishlist.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  adminAnalytics: typeof adminAnalytics;
  adminCatalog: typeof adminCatalog;
  adminCollections: typeof adminCollections;
  cart: typeof cart;
  catalog: typeof catalog;
  checkout: typeof checkout;
  collections: typeof collections;
  content: typeof content;
  discounts: typeof discounts;
  emails: typeof emails;
  giftCards: typeof giftCards;
  http: typeof http;
  orders: typeof orders;
  payments: typeof payments;
  products: typeof products;
  rewards: typeof rewards;
  seed: typeof seed;
  subscriptions: typeof subscriptions;
  users: typeof users;
  wishlist: typeof wishlist;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};

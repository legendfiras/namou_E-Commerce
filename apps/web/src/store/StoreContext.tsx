import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  addCartItem,
  changeCartVariant,
  removeCartItem,
  updateCartQuantity,
} from '../domain/cart.ts';
import { seedInventory, type InventoryMap } from '../domain/checkout.ts';
import {
  fetchCurrentUser,
  logout,
  signInWithGoogle as requestGoogleSignIn,
} from '../services/authService.ts';
import {
  invalidateStorefrontCatalog,
  loadStorefrontCatalog,
} from '../services/catalogService.ts';
import { mockWait } from '../services/mockRuntime.ts';
import { placeDemoOrder } from '../services/orderService.ts';
import type {
  ActionResult,
  CartItem,
  Order,
  Session,
  WishlistItem,
} from '../types/store.ts';
import {
  loadUserRecord,
  resetPersistedDemo,
  saveUserRecord,
  GUEST_ACCOUNT,
  STORAGE_VERSION,
} from './persistence.ts';

type StoreContextValue = {
  session: Session | null;
  cart: CartItem[];
  wishlist: WishlistItem[];
  orders: Order[];
  inventory: InventoryMap;
  signInWithGoogle: (credential: string) => Promise<ActionResult>;
  signOut: () => Promise<void>;
  addToCart: (
    productId: string,
    variantId: string,
    quantity: number,
  ) => Promise<ActionResult>;
  updateQuantity: (
    variantId: string,
    quantity: number,
  ) => Promise<ActionResult>;
  removeFromCart: (variantId: string) => Promise<void>;
  changeVariant: (
    fromVariantId: string,
    toVariantId: string,
    toProductId: string,
  ) => Promise<ActionResult>;
  toggleWishlist: (productId: string) => Promise<{ added: boolean }>;
  removeFromWishlist: (productId: string) => Promise<void>;
  isWishlisted: (productId: string) => boolean;
  checkout: () => Promise<
    { ok: true; order: Order } | { ok: false; message: string }
  >;
  catalogVersion: number;
  stockFor: (variantId: string) => number;
  resetDemo: () => void;
};

const StoreContext = createContext<StoreContextValue | null>(null);

function accountId(session: Session | null): string {
  return session?.email ?? GUEST_ACCOUNT;
}

function persistUser(
  session: Session | null,
  cart: CartItem[],
  wishlist: WishlistItem[],
  orders: Order[],
) {
  saveUserRecord(accountId(session), {
    version: STORAGE_VERSION,
    cart,
    wishlist,
    orders,
  });
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [stockReady, setStockReady] = useState(false);
  const [catalogVersion, setCatalogVersion] = useState(0);
  const [inventory, setInventory] = useState<InventoryMap>({});
  const checkoutAttempt = useRef<{ signature: string; key: string } | null>(
    null,
  );
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  const loadUser = useCallback((nextSession: Session | null) => {
    const record = loadUserRecord(accountId(nextSession));
    setCart(record.cart);
    setWishlist(record.wishlist);
    setOrders(record.orders);
  }, []);

  useEffect(() => {
    let active = true;

    void loadStorefrontCatalog()
      .then((products) => {
        if (active) {
          setInventory(seedInventory(products));
        }
      })
      .catch(() => {
        if (active) {
          setInventory({});
        }
      })
      .finally(() => {
        if (active) {
          setStockReady(true);
        }
      });

    return () => {
      active = false;
    };
  }, [catalogVersion]);

  useEffect(() => {
    let active = true;

    void fetchCurrentUser()
      .then((user) => {
        if (!active) {
          return;
        }
        if (user) {
          setSession(user);
          const record = loadUserRecord(user.email);
          setCart(record.cart);
          setWishlist(record.wishlist);
          setOrders(record.orders);
        } else {
          const record = loadUserRecord(GUEST_ACCOUNT);
          setCart(record.cart);
          setWishlist(record.wishlist);
          setOrders(record.orders);
        }
      })
      .catch(() => {
        if (!active) {
          return;
        }
        const record = loadUserRecord(GUEST_ACCOUNT);
        setCart(record.cart);
        setWishlist(record.wishlist);
        setOrders(record.orders);
      })
      .finally(() => {
        if (active) {
          setAuthReady(true);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const signInWithGoogle = useCallback(
    async (credential: string): Promise<ActionResult> => {
      const result = await requestGoogleSignIn(credential);
      if (!result.ok) {
        return result;
      }
      const guest = loadUserRecord(GUEST_ACCOUNT);
      const signedIn = loadUserRecord(result.session.email);
      saveUserRecord(result.session.email, {
        version: STORAGE_VERSION,
        cart: signedIn.cart.length ? signedIn.cart : guest.cart,
        wishlist: signedIn.wishlist.length ? signedIn.wishlist : guest.wishlist,
        orders: signedIn.orders.length ? signedIn.orders : guest.orders,
      });
      setSession(result.session);
      loadUser(result.session);
      return { ok: true };
    },
    [loadUser],
  );

  const signOut = useCallback(async () => {
    await logout();
    setSession(null);
    loadUser(null);
  }, [loadUser]);

  const addToCart = useCallback(
    async (
      productId: string,
      variantId: string,
      quantity: number,
    ): Promise<ActionResult> => {
      await mockWait();
      const result = addCartItem(
        cart,
        productId,
        variantId,
        quantity,
        (id) => inventory[id],
      );
      if (!result.ok) {
        return result;
      }
      setCart(result.items);
      persistUser(session, result.items, wishlist, orders);
      return { ok: true };
    },
    [cart, inventory, orders, session, wishlist],
  );

  const updateQuantity = useCallback(
    async (variantId: string, quantity: number): Promise<ActionResult> => {
      await mockWait();
      const result = updateCartQuantity(
        cart,
        variantId,
        quantity,
        (id) => inventory[id],
      );
      if (!result.ok) {
        return result;
      }
      setCart(result.items);
      persistUser(session, result.items, wishlist, orders);
      return { ok: true };
    },
    [cart, inventory, orders, session, wishlist],
  );

  const removeFromCart = useCallback(
    async (variantId: string) => {
      await mockWait();
      const next = removeCartItem(cart, variantId);
      setCart(next);
      persistUser(session, next, wishlist, orders);
    },
    [cart, orders, session, wishlist],
  );

  const changeVariant = useCallback(
    async (
      fromVariantId: string,
      toVariantId: string,
      toProductId: string,
    ): Promise<ActionResult> => {
      await mockWait();
      const result = changeCartVariant(
        cart,
        fromVariantId,
        toVariantId,
        toProductId,
        (id) => inventory[id],
      );
      if (!result.ok) {
        return result;
      }
      setCart(result.items);
      persistUser(session, result.items, wishlist, orders);
      return { ok: true };
    },
    [cart, inventory, orders, session, wishlist],
  );

  const toggleWishlist = useCallback(
    async (productId: string) => {
      await mockWait();
      const exists = wishlist.some((item) => item.productId === productId);
      const next = exists
        ? wishlist.filter((item) => item.productId !== productId)
        : [...wishlist, { productId }];
      setWishlist(next);
      persistUser(session, cart, next, orders);
      return { added: !exists };
    },
    [cart, orders, session, wishlist],
  );

  const removeFromWishlist = useCallback(
    async (productId: string) => {
      await mockWait();
      const next = wishlist.filter((item) => item.productId !== productId);
      setWishlist(next);
      persistUser(session, cart, next, orders);
    },
    [cart, orders, session, wishlist],
  );

  const isWishlisted = useCallback(
    (productId: string) =>
      wishlist.some((item) => item.productId === productId),
    [wishlist],
  );

  const refreshCatalogStock = useCallback(() => {
    invalidateStorefrontCatalog();
    setCatalogVersion((version) => version + 1);
  }, []);

  const checkout = useCallback(async () => {
    if (!session) {
      return {
        ok: false as const,
        message: 'Sign in with Google to place a demo order.',
      };
    }

    if (cart.length === 0) {
      return { ok: false as const, message: 'Your cart is empty.' };
    }

    const signature = JSON.stringify(
      cart.map((item) => [item.productId, item.variantId, item.quantity]),
    );
    if (checkoutAttempt.current?.signature !== signature) {
      checkoutAttempt.current = {
        signature,
        key: crypto.randomUUID(),
      };
    }

    const result = await placeDemoOrder(cart, checkoutAttempt.current.key);
    if (!result.ok) {
      refreshCatalogStock();
      return { ok: false as const, message: result.message };
    }

    checkoutAttempt.current = null;
    setCart([]);
    persistUser(session, [], wishlist, orders);
    refreshCatalogStock();
    return { ok: true as const, order: result.order };
  }, [cart, orders, refreshCatalogStock, session, wishlist]);

  const stockFor = useCallback(
    (variantId: string) => inventory[variantId] ?? 0,
    [inventory],
  );

  const resetDemo = useCallback(() => {
    void logout();
    resetPersistedDemo();
    setSession(null);
    setCart([]);
    setWishlist([]);
    setOrders([]);
    checkoutAttempt.current = null;
    refreshCatalogStock();
  }, [refreshCatalogStock]);

  const value = useMemo(
    () => ({
      session,
      cart,
      wishlist,
      orders,
      inventory,
      signInWithGoogle,
      signOut,
      addToCart,
      updateQuantity,
      removeFromCart,
      changeVariant,
      toggleWishlist,
      removeFromWishlist,
      isWishlisted,
      checkout,
      catalogVersion,
      stockFor,
      resetDemo,
    }),
    [
      addToCart,
      cart,
      changeVariant,
      catalogVersion,
      checkout,
      inventory,
      isWishlisted,
      orders,
      removeFromCart,
      removeFromWishlist,
      resetDemo,
      session,
      signInWithGoogle,
      signOut,
      stockFor,
      toggleWishlist,
      updateQuantity,
      wishlist,
    ],
  );

  if (!authReady || !stockReady) {
    return (
      <p role="status" aria-live="polite">
        Loading…
      </p>
    );
  }

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

export function useStore() {
  const value = useContext(StoreContext);
  if (!value) {
    throw new Error('useStore must be used within StoreProvider');
  }
  return value;
}

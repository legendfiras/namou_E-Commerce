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
  accountRecordForSignIn,
  loadUserRecord,
  resetPersistedDemo,
  saveUserRecord,
  GUEST_ACCOUNT,
  STORAGE_VERSION,
} from './persistence.ts';
import { takePendingAction } from './pendingAction.ts';

export type StoreConnectionStatus = 'loading' | 'ready' | 'error';

type StoreContextValue = {
  session: Session | null;
  authStatus: StoreConnectionStatus;
  stockStatus: StoreConnectionStatus;
  retryStorefront: () => void;
  cart: CartItem[];
  wishlist: WishlistItem[];
  orders: Order[];
  inventory: InventoryMap;
  signInWithGoogle: (
    credential: string,
  ) => Promise<{ ok: true; email: string } | { ok: false; message: string }>;
  fulfillPendingAction: (email: string) => Promise<string | null>;
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

function persistUser(
  session: Session | null,
  cart: CartItem[],
  wishlist: WishlistItem[],
  orders: Order[],
) {
  if (!session) {
    return;
  }
  saveUserRecord(session.email, {
    version: STORAGE_VERSION,
    cart,
    wishlist,
    orders,
  });
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authStatus, setAuthStatus] =
    useState<StoreConnectionStatus>('loading');
  const [authAttempt, setAuthAttempt] = useState(0);
  const [stockStatus, setStockStatus] =
    useState<StoreConnectionStatus>('loading');
  const [catalogVersion, setCatalogVersion] = useState(0);
  const [inventory, setInventory] = useState<InventoryMap>({});
  const checkoutAttempt = useRef<{ signature: string; key: string } | null>(
    null,
  );
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    let active = true;

    setStockStatus((current) => (current === 'ready' ? current : 'loading'));
    void loadStorefrontCatalog()
      .then((products) => {
        if (!active) {
          return;
        }
        setInventory(seedInventory(products));
        setStockStatus('ready');
      })
      .catch(() => {
        if (active) {
          setStockStatus('error');
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
          const record = accountRecordForSignIn(
            loadUserRecord(user.email),
            loadUserRecord(GUEST_ACCOUNT),
          );
          setCart(record.cart);
          setWishlist(record.wishlist);
          setOrders(record.orders);
        } else {
          setSession(null);
          setCart([]);
          setWishlist([]);
          setOrders([]);
        }
        setAuthStatus('ready');
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setSession(null);
        setCart([]);
        setWishlist([]);
        setOrders([]);
        setAuthStatus('error');
      });

    return () => {
      active = false;
    };
  }, [authAttempt]);

  const signInWithGoogle = useCallback(
    async (
      credential: string,
    ): Promise<{ ok: true; email: string } | { ok: false; message: string }> => {
      const result = await requestGoogleSignIn(credential);
      if (!result.ok) {
        return result;
      }
      const record = accountRecordForSignIn(
        loadUserRecord(result.session.email),
        loadUserRecord(GUEST_ACCOUNT),
      );
      setSession(result.session);
      setCart(record.cart);
      setWishlist(record.wishlist);
      setOrders(record.orders);
      setAuthStatus('ready');
      return { ok: true, email: result.session.email };
    },
    [],
  );

  const fulfillPendingAction = useCallback(
    async (email: string): Promise<string | null> => {
      const action = takePendingAction();
      if (!action) {
        return null;
      }
      const record = accountRecordForSignIn(
        loadUserRecord(email),
        loadUserRecord(GUEST_ACCOUNT),
      );
      if (action.type === 'add-to-wishlist') {
        const already = record.wishlist.some(
          (item) => item.productId === action.productId,
        );
        const wishlist = already
          ? record.wishlist
          : [...record.wishlist, { productId: action.productId }];
        if (!already) {
          saveUserRecord(email, { ...record, wishlist });
        }
        setCart(record.cart);
        setWishlist(wishlist);
        setOrders(record.orders);
        return already
          ? `${action.productName} is already on your wishlist.`
          : `${action.productName} saved to your wishlist.`;
      }
      if (stockStatus !== 'ready') {
        setCart(record.cart);
        setWishlist(record.wishlist);
        setOrders(record.orders);
        return 'Availability is still being checked, so the item was not added.';
      }
      const result = addCartItem(
        record.cart,
        action.productId,
        action.variantId,
        action.quantity,
        (variantId) => inventory[variantId],
      );
      if (!result.ok) {
        setCart(record.cart);
        setWishlist(record.wishlist);
        setOrders(record.orders);
        return result.message;
      }
      saveUserRecord(email, { ...record, cart: result.items });
      setCart(result.items);
      setWishlist(record.wishlist);
      setOrders(record.orders);
      return `Added ${action.quantity} ${action.productName} in ${action.color} to cart.`;
    },
    [inventory, stockStatus],
  );

  const signOut = useCallback(async () => {
    await logout();
    setSession(null);
    setCart([]);
    setWishlist([]);
    setOrders([]);
  }, []);

  const addToCart = useCallback(
    async (
      productId: string,
      variantId: string,
      quantity: number,
    ): Promise<ActionResult> => {
      if (authStatus !== 'ready') {
        return { ok: false, message: 'Your account is still loading.' };
      }
      if (!session) {
        return { ok: false, message: 'Sign in to add this item to your cart.' };
      }
      if (stockStatus !== 'ready') {
        return {
          ok: false,
          message: 'Availability is still being checked.',
        };
      }
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
    [authStatus, cart, inventory, orders, session, stockStatus, wishlist],
  );

  const updateQuantity = useCallback(
    async (variantId: string, quantity: number): Promise<ActionResult> => {
      if (authStatus !== 'ready' || !session || stockStatus !== 'ready') {
        return {
          ok: false,
          message: 'Availability is still being checked.',
        };
      }
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
    [authStatus, cart, inventory, orders, session, stockStatus, wishlist],
  );

  const removeFromCart = useCallback(
    async (variantId: string) => {
      if (authStatus !== 'ready' || !session) {
        return;
      }
      await mockWait();
      const next = removeCartItem(cart, variantId);
      setCart(next);
      persistUser(session, next, wishlist, orders);
    },
    [authStatus, cart, orders, session, wishlist],
  );

  const changeVariant = useCallback(
    async (
      fromVariantId: string,
      toVariantId: string,
      toProductId: string,
    ): Promise<ActionResult> => {
      if (authStatus !== 'ready' || !session || stockStatus !== 'ready') {
        return {
          ok: false,
          message: 'Availability is still being checked.',
        };
      }
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
    [authStatus, cart, inventory, orders, session, stockStatus, wishlist],
  );

  const toggleWishlist = useCallback(
    async (productId: string) => {
      if (authStatus !== 'ready' || !session) {
        return { added: false };
      }
      await mockWait();
      const exists = wishlist.some((item) => item.productId === productId);
      const next = exists
        ? wishlist.filter((item) => item.productId !== productId)
        : [...wishlist, { productId }];
      setWishlist(next);
      persistUser(session, cart, next, orders);
      return { added: !exists };
    },
    [authStatus, cart, orders, session, wishlist],
  );

  const removeFromWishlist = useCallback(
    async (productId: string) => {
      if (authStatus !== 'ready' || !session) {
        return;
      }
      await mockWait();
      const next = wishlist.filter((item) => item.productId !== productId);
      setWishlist(next);
      persistUser(session, cart, next, orders);
    },
    [authStatus, cart, orders, session, wishlist],
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

  const retryStorefront = useCallback(() => {
    if (stockStatus !== 'ready') {
      refreshCatalogStock();
    }
    if (authStatus !== 'ready') {
      setAuthStatus('loading');
      setCart([]);
      setWishlist([]);
      setOrders([]);
      setSession(null);
      setAuthAttempt((attempt) => attempt + 1);
    }
  }, [authStatus, refreshCatalogStock, stockStatus]);

  const checkout = useCallback(async () => {
    if (authStatus !== 'ready' || !session) {
      return {
        ok: false as const,
        message: 'Sign in with Google to place a demo order.',
      };
    }
    if (stockStatus !== 'ready') {
      return {
        ok: false as const,
        message: 'Availability is still being checked.',
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
  }, [authStatus, cart, orders, refreshCatalogStock, session, stockStatus, wishlist]);

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
      authStatus,
      stockStatus,
      retryStorefront,
      cart,
      wishlist,
      orders,
      inventory,
      signInWithGoogle,
      fulfillPendingAction,
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
      authStatus,
      cart,
      changeVariant,
      catalogVersion,
      checkout,
      fulfillPendingAction,
      inventory,
      isWishlisted,
      orders,
      removeFromCart,
      removeFromWishlist,
      resetDemo,
      retryStorefront,
      session,
      signInWithGoogle,
      signOut,
      stockFor,
      stockStatus,
      toggleWishlist,
      updateQuantity,
      wishlist,
    ],
  );

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

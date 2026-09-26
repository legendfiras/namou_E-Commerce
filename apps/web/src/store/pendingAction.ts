const PENDING_ACTION_KEY = 'namou.pending-action.v1';

export type PendingAction =
  | {
      type: 'add-to-cart';
      productId: string;
      variantId: string;
      productName: string;
      color: string;
      quantity: number;
    }
  | {
      type: 'add-to-wishlist';
      productId: string;
      productName: string;
    };

function isPendingAction(value: unknown): value is PendingAction {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const action = value as PendingAction;
  if (action.type === 'add-to-cart') {
    return (
      typeof action.productId === 'string' &&
      action.productId.length > 0 &&
      typeof action.variantId === 'string' &&
      action.variantId.length > 0 &&
      typeof action.productName === 'string' &&
      typeof action.color === 'string' &&
      typeof action.quantity === 'number' &&
      Number.isInteger(action.quantity) &&
      action.quantity > 0
    );
  }
  if (action.type === 'add-to-wishlist') {
    return (
      typeof action.productId === 'string' &&
      action.productId.length > 0 &&
      typeof action.productName === 'string'
    );
  }
  return false;
}

export function savePendingAction(action: PendingAction): void {
  sessionStorage.setItem(PENDING_ACTION_KEY, JSON.stringify(action));
}

export function peekPendingAction(): PendingAction | null {
  try {
    const raw = sessionStorage.getItem(PENDING_ACTION_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as unknown;
    return isPendingAction(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Removes the saved action before returning it, so a second callback cannot run it. */
export function takePendingAction(): PendingAction | null {
  const action = peekPendingAction();
  sessionStorage.removeItem(PENDING_ACTION_KEY);
  return action;
}

export function clearPendingAction(): void {
  sessionStorage.removeItem(PENDING_ACTION_KEY);
}

export function safeReturnPath(value: string | null | undefined): string {
  if (
    !value ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.startsWith('/login')
  ) {
    return '/products';
  }
  return value;
}

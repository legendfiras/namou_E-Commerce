export function formatUsd(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

export function parseQuantity(value: unknown): ActionQuantity {
  if (typeof value === 'string' && value.trim() !== '') {
    return parseQuantity(Number(value));
  }

  if (typeof value !== 'number' || !Number.isInteger(value)) {
    return {
      ok: false,
      message: 'Quantity must be a whole number.',
    };
  }

  if (value < 1) {
    return {
      ok: false,
      message: 'Quantity must be at least 1.',
    };
  }

  return { ok: true, quantity: value };
}

type ActionQuantity =
  { ok: true; quantity: number } | { ok: false; message: string };

import { useEffect, useId, useMemo, useState } from 'react';
import { Drawer } from '../ui/Drawer.tsx';
import {
  formatStorageLabel,
  uniqueColors,
} from '../../domain/catalogQuery.ts';
import { formatUsd } from '../../domain/money.ts';
import { useMediaQuery } from '../../hooks/useMediaQuery.ts';
import { useStore } from '../../store/StoreContext.tsx';
import type { Product, ProductVariant } from '../../types/store.ts';
import { ColorPicker } from './ColorPicker.tsx';
import { ProductImage } from './ProductImage.tsx';

type VariantPurchaseProps = {
  product: Product;
  onFeedback: (message: string) => void;
  onPreview?: (variantId: string | null) => void;
};

function storagesFor(product: Product, colorSlug: string): string[] {
  const variants = colorSlug
    ? product.variants.filter((variant) => variant.colorSlug === colorSlug)
    : product.variants;
  return [...new Set(variants.map((variant) => variant.storage))];
}

export function VariantPurchase({
  product,
  onFeedback,
  onPreview,
}: VariantPurchaseProps) {
  const store = useStore();
  const isPhone = useMediaQuery('(max-width: 767px)');
  const [open, setOpen] = useState(false);
  const colors = uniqueColors(product);
  const needsColor = colors.length > 1;
  const allStorages = useMemo(
    () => [...new Set(product.variants.map((variant) => variant.storage))],
    [product.variants],
  );
  const needsStorage = allStorages.length > 1;
  const [color, setColor] = useState('');
  const [storage, setStorage] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const qtyId = useId();

  const variant = useMemo(() => {
    return product.variants.find((item) => {
      if (needsColor && item.colorSlug !== color) {
        return false;
      }
      if (needsStorage && item.storage !== storage) {
        return false;
      }
      return true;
    });
  }, [color, needsColor, needsStorage, product.variants, storage]);

  const stockKnown = store.stockStatus === 'ready';
  const stock = stockKnown && variant ? store.stockFor(variant.id) : 0;
  const everyVariantOut =
    stockKnown &&
    product.variants.every((item) => store.stockFor(item.id) <= 0);
  const availabilityLabel =
    store.stockStatus === 'error'
      ? 'Unavailable'
      : 'Checking availability';
  const storageChoices = storagesFor(product, needsColor ? color : '');

  useEffect(() => {
    if (!needsColor && !needsStorage) {
      onPreview?.(product.variants[0]?.id ?? null);
    }
  }, [needsColor, needsStorage, onPreview, product.variants]);

  useEffect(() => {
    if (stock > 0 && quantity > stock) {
      setQuantity(stock);
    }
  }, [quantity, stock]);

  const chooseColor = (colorSlug: string) => {
    setColor(colorSlug);
    const nextStorages = storagesFor(product, colorSlug);
    const nextStorage = nextStorages.length === 1 ? nextStorages[0] : '';
    setStorage(nextStorage ?? '');
    const next = product.variants.find((item) => {
      if (item.colorSlug !== colorSlug) {
        return false;
      }
      if (needsStorage && nextStorages.length !== 1) {
        return false;
      }
      if (nextStorage && item.storage !== nextStorage) {
        return false;
      }
      return true;
    });
    onPreview?.(next?.id ?? null);
    setQuantity(1);
  };

  const chooseStorage = (nextStorage: string) => {
    setStorage(nextStorage);
    const next = product.variants.find((item) => {
      if (needsColor && item.colorSlug !== color) {
        return false;
      }
      return item.storage === nextStorage;
    });
    onPreview?.(next?.id ?? null);
    setQuantity(1);
  };

  const addToCart = () => {
    if (!variant || stock <= 0 || quantity > stock) {
      onFeedback(
        variant
          ? `${product.name} in ${variant.color} is out of stock.`
          : `Choose a finish for ${product.name} before adding it to the cart.`,
      );
      return;
    }

    setBusy(true);
    void store
      .addToCart(product.id, variant.id, quantity)
      .then((result) => {
        setBusy(false);
        if (!result.ok) {
          onFeedback(result.message);
          return;
        }
        onFeedback(
          `Added ${quantity} ${product.name} in ${variant.color} to cart.`,
        );
        setOpen(false);
      });
  };

  const fields = (
    <VariantFields
      product={product}
      variant={variant ?? null}
      stock={stock}
      stockKnown={stockKnown}
      availabilityLabel={availabilityLabel}
      colors={colors}
      color={color}
      needsColor={needsColor}
      needsStorage={needsStorage}
      storageChoices={storageChoices}
      storage={storage}
      quantity={quantity}
      qtyId={qtyId}
      busy={busy}
      everyVariantOut={everyVariantOut}
      onColor={chooseColor}
      onStorage={chooseStorage}
      onQuantity={setQuantity}
      onAdd={addToCart}
      stockFor={(variantId) =>
        stockKnown ? store.stockFor(variantId) : 1
      }
    />
  );

  if (isPhone) {
    return (
      <>
        <button
          type="button"
          className="primary-button card-add-button"
          disabled={!stockKnown || everyVariantOut}
          onClick={() => setOpen(true)}
        >
          {!stockKnown
            ? availabilityLabel
            : everyVariantOut
              ? 'Out of stock'
              : 'Add to cart'}
        </button>
        <Drawer
          open={open}
          title={`Add ${product.name}`}
          placement="bottom"
          onClose={() => setOpen(false)}
        >
          <p className="muted sheet-intro" id={`${qtyId}-intro`}>
            {!stockKnown
              ? 'Availability is still being checked.'
              : needsColor
                ? 'Choose a finish and quantity. Out-of-stock finishes stay disabled.'
                : 'Choose a quantity. The price and stock shown are for this finish.'}
          </p>
          {fields}
        </Drawer>
      </>
    );
  }

  return <div className="variant-purchase">{fields}</div>;
}

function VariantFields({
  product,
  variant,
  stock,
  stockKnown,
  availabilityLabel,
  colors,
  color,
  needsColor,
  needsStorage,
  storageChoices,
  storage,
  quantity,
  qtyId,
  busy,
  everyVariantOut,
  onColor,
  onStorage,
  onQuantity,
  onAdd,
  stockFor,
}: {
  product: Product;
  variant: ProductVariant | null;
  stock: number;
  stockKnown: boolean;
  availabilityLabel: string;
  colors: ProductVariant[];
  color: string;
  needsColor: boolean;
  needsStorage: boolean;
  storageChoices: string[];
  storage: string;
  quantity: number;
  qtyId: string;
  busy: boolean;
  everyVariantOut: boolean;
  onColor: (colorSlug: string) => void;
  onStorage: (storage: string) => void;
  onQuantity: (quantity: number) => void;
  onAdd: () => void;
  stockFor: (variantId: string) => number;
}) {
  const image = variant?.images[0] ?? product.variants[0]?.images[0] ?? '/images/products/fallback.svg';
  const fallbacks = variant?.images.slice(1) ?? product.variants[0]?.images.slice(1) ?? [];
  const canAdd =
    stockKnown &&
    Boolean(variant) &&
    stock > 0 &&
    quantity >= 1 &&
    quantity <= stock &&
    !busy;

  return (
    <div className="variant-fields">
      <div className="variant-preview">
        <ProductImage
          src={image}
          fallbacks={fallbacks}
          alt={
            variant
              ? `${product.name} in ${variant.color}`
              : product.name
          }
        />
        <div>
          <p className="variant-preview-name">
            {variant ? variant.color : 'Choose a finish'}
          </p>
          <p className="variant-preview-price">
            {variant ? formatUsd(variant.priceCents) : 'Price appears after you choose'}
          </p>
          <p className={stockKnown && variant && stock <= 3 ? 'status-warn' : 'muted'}>
            {!stockKnown
              ? availabilityLabel === 'Unavailable'
                ? 'Availability unavailable'
                : 'Checking availability'
              : !variant
                ? 'Stock appears after you choose'
                : stock === 0
                  ? 'Out of stock'
                  : `${stock} in stock`}
          </p>
        </div>
      </div>
      {needsColor ? (
        <ColorPicker
          options={colors}
          value={color}
          onChange={onColor}
          unavailable={(colorSlug) =>
            !product.variants.some(
              (item) =>
                item.colorSlug === colorSlug && stockFor(item.id) > 0,
            )
          }
        />
      ) : variant ? (
        <p className="muted">
          Finish {variant.color}
          {variant.storage ? ` · ${formatStorageLabel(variant.storage)}` : ''}
        </p>
      ) : null}
      {needsStorage ? (
        <div className="option-grid" role="group" aria-label="Storage">
          {storageChoices.map((option) => {
            const soldOut = !product.variants.some(
              (item) =>
                item.storage === option &&
                (!needsColor || item.colorSlug === color) &&
                stockFor(item.id) > 0,
            );
            return (
              <button
                key={option}
                type="button"
                className="option"
                aria-pressed={storage === option}
                disabled={soldOut || (needsColor && !color)}
                onClick={() => onStorage(option)}
              >
                {formatStorageLabel(option)}
                {soldOut ? ', out of stock' : ''}
              </button>
            );
          })}
        </div>
      ) : null}
      <div className="qty-row">
        <label htmlFor={qtyId}>Quantity</label>
        <input
          id={qtyId}
          type="number"
          min={1}
          max={Math.max(stock, 1)}
          step={1}
          value={quantity}
          disabled={!stockKnown || !variant || stock === 0}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (!Number.isInteger(next) || next < 1) {
              onQuantity(1);
              return;
            }
            onQuantity(stock > 0 ? Math.min(next, stock) : 1);
          }}
        />
      </div>
      <button
        type="button"
        className="primary-button"
        disabled={!canAdd || everyVariantOut}
        onClick={onAdd}
      >
        {busy
          ? 'Adding…'
          : !stockKnown
            ? availabilityLabel
            : !variant
              ? 'Choose a finish'
              : everyVariantOut || stock === 0
                ? 'Out of stock'
                : 'Add to cart'}
      </button>
    </div>
  );
}

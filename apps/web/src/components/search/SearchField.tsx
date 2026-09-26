import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import {
  suggestProducts,
  type SearchSuggestion,
} from '../../domain/catalogQuery.ts';
import { formatUsd } from '../../domain/money.ts';
import { getTemporaryCatalog } from '../../data/catalog.ts';
import {
  getCatalogSnapshot,
  loadStorefrontCatalog,
} from '../../services/catalogService.ts';
import type { Product } from '../../types/store.ts';

type SearchFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onPick: (product: Product) => void;
  onSearch: (query: string) => void;
  placeholder?: string;
  showLabel?: boolean;
};

export function SearchField({
  id,
  label,
  value,
  onChange,
  onPick,
  onSearch,
  placeholder = 'Search products',
  showLabel = false,
}: SearchFieldProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [catalog, setCatalog] = useState<Product[]>(() => {
    const live = getCatalogSnapshot();
    return live.length > 0 ? live : getTemporaryCatalog();
  });
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    let active = true;
    void loadStorefrontCatalog()
      .then((products) => {
        if (active) {
          setCatalog(products);
        }
      })
      .catch(() => {
        if (active) {
          setCatalog((current) =>
            current.length > 0 ? current : getTemporaryCatalog(),
          );
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const suggestions = useMemo(
    () => suggestProducts(catalog, value),
    [catalog, value],
  );
  const query = value.trim();
  const showList = open && query.length > 0;
  const optionCount = suggestions.length + (query ? 1 : 0);

  useEffect(() => {
    setActiveIndex(-1);
  }, [value]);

  useEffect(() => {
    if (!showList) {
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [showList]);

  const chooseProduct = (suggestion: SearchSuggestion) => {
    setOpen(false);
    onPick(suggestion.product);
  };

  const chooseSearch = () => {
    setOpen(false);
    onSearch(query);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' && optionCount > 0) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => (index + 1) % optionCount);
      return;
    }

    if (event.key === 'ArrowUp' && optionCount > 0) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => (index <= 0 ? optionCount - 1 : index - 1));
      return;
    }

    if (event.key === 'Escape') {
      if (showList) {
        event.preventDefault();
        setOpen(false);
      }
      return;
    }

    if (event.key === 'Enter' && showList && activeIndex >= 0) {
      event.preventDefault();
      if (activeIndex < suggestions.length) {
        const suggestion = suggestions[activeIndex];
        if (suggestion) {
          chooseProduct(suggestion);
        }
      } else {
        chooseSearch();
      }
    }
  };

  return (
    <div className="search-field" ref={rootRef}>
      <label
        className={showLabel ? undefined : 'visually-hidden'}
        htmlFor={id}
      >
        {label}
      </label>
      <input
        id={id}
        type="search"
        role="combobox"
        name="q"
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={
          showList && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined
        }
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (query) {
            setOpen(true);
          }
        }}
        onBlur={(event) => {
          if (!rootRef.current?.contains(event.relatedTarget as Node | null)) {
            setOpen(false);
          }
        }}
        onKeyDown={onKeyDown}
      />
      {showList ? (
        <ul className="search-suggest" id={listId} role="listbox">
          {suggestions.map((suggestion, index) => (
            <li key={suggestion.product.id} role="presentation">
              <button
                type="button"
                role="option"
                id={`${listId}-${index}`}
                aria-selected={index === activeIndex}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => chooseProduct(suggestion)}
              >
                <img
                  src={suggestion.image || '/images/products/fallback.svg'}
                  alt=""
                  width={64}
                  height={64}
                  onError={(event) => {
                    event.currentTarget.src = '/images/products/fallback.svg';
                  }}
                />
                <span>
                  <span className="search-suggest-name">
                    {suggestion.product.name}
                  </span>
                  <span className="search-suggest-detail">
                    {suggestion.detail} ·{' '}
                    {suggestion.pricedFrom ? 'From ' : ''}
                    {formatUsd(suggestion.priceCents)}
                  </span>
                </span>
              </button>
            </li>
          ))}
          <li role="presentation">
            <button
              type="button"
              role="option"
              id={`${listId}-${suggestions.length}`}
              className="search-suggest-all"
              aria-selected={activeIndex === suggestions.length}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(suggestions.length)}
              onClick={chooseSearch}
            >
              {suggestions.length === 0
                ? `No products match “${query}”. Search anyway`
                : `See all results for “${query}”`}
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  );
}

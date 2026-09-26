import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { SearchField } from '../search/SearchField.tsx';
import { useStore } from '../../store/StoreContext.tsx';
import type { Product } from '../../types/store.ts';
import { BrandLockup } from './BrandLockup.tsx';
import { Drawer } from '../ui/Drawer.tsx';

export function StoreLayout({
  toast,
  setToast,
}: {
  toast: string | null;
  setToast: (message: string | null) => void;
}) {
  const { session, cart, signOut, authStatus } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [headerQuery, setHeaderQuery] = useState('');
  const [mobileQuery, setMobileQuery] = useState('');
  const navigate = useNavigate();
  const accountReady = authStatus === 'ready';
  const cartCount =
    accountReady && session
      ? cart.reduce((sum, item) => sum + item.quantity, 0)
      : 0;

  const openSearch = (query: string) => {
    const q = query.trim();
    setSearchOpen(false);
    navigate(q ? `/products?q=${encodeURIComponent(q)}` : '/products');
  };

  const openProduct = (product: Product) => {
    setSearchOpen(false);
    navigate(`/products/${product.slug}`);
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <div className="header-inner">
          <button
            type="button"
            className="icon-button menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen(true)}
          >
            Menu
          </button>
          <BrandLockup />
          <nav className="header-nav" aria-label="Primary">
            <NavLink to="/products">Shop</NavLink>
            <NavLink to="/products?category=iphone">iPhone</NavLink>
            <NavLink to="/products?category=airpods">AirPods</NavLink>
            <NavLink to="/products?category=mac">Mac</NavLink>
            <NavLink to="/products?category=ipad">iPad</NavLink>
          </nav>
          <form
            className="header-search"
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              openSearch(headerQuery);
            }}
          >
            <SearchField
              id="header-search"
              label="Search products"
              value={headerQuery}
              onChange={setHeaderQuery}
              onPick={openProduct}
              onSearch={openSearch}
            />
          </form>
          <div className="header-actions">
            <button
              type="button"
              className="text-button search-toggle"
              onClick={() => setSearchOpen(true)}
            >
              Search
            </button>
            <NavLink className="text-button header-wishlist" to="/wishlist">
              Wishlist
            </NavLink>
            <NavLink
              className="icon-button"
              to="/cart"
              aria-label={`Cart, ${cartCount} items`}
            >
              Cart
              {cartCount > 0 ? (
                <span className="cart-count">{cartCount}</span>
              ) : null}
            </NavLink>
            {authStatus === 'loading' ? (
              <span className="text-button header-account-status" role="status">
                Checking account
              </span>
            ) : session ? (
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  void signOut().then(() => {
                    navigate('/');
                    setToast('Signed out.');
                  });
                }}
              >
                Log out
              </button>
            ) : (
              <NavLink className="text-button" to="/login">
                Log in
              </NavLink>
            )}
          </div>
        </div>
      </header>

      <Drawer open={menuOpen} title="Menu" onClose={() => setMenuOpen(false)}>
        <nav id="mobile-menu" aria-label="Mobile">
          <p>
            <Link to="/products" onClick={() => setMenuOpen(false)}>
              Shop
            </Link>
          </p>
          <p>
            <Link
              to="/products?category=iphone"
              onClick={() => setMenuOpen(false)}
            >
              iPhone
            </Link>
          </p>
          <p>
            <Link
              to="/products?category=airpods"
              onClick={() => setMenuOpen(false)}
            >
              AirPods
            </Link>
          </p>
          <p>
            <Link
              to="/products?category=mac"
              onClick={() => setMenuOpen(false)}
            >
              Mac
            </Link>
          </p>
          <p>
            <Link
              to="/products?category=ipad"
              onClick={() => setMenuOpen(false)}
            >
              iPad
            </Link>
          </p>
          <p>
            <Link to="/wishlist" onClick={() => setMenuOpen(false)}>
              Wishlist
            </Link>
          </p>
          <p>
            <Link to="/cart" onClick={() => setMenuOpen(false)}>
              Cart
            </Link>
          </p>
          <p>
            {authStatus === 'loading' ? (
              <span role="status">Checking account</span>
            ) : session ? (
              <button
                type="button"
                className="ghost-button"
                onClick={() => {
                  setMenuOpen(false);
                  void signOut().then(() => {
                    navigate('/');
                  });
                }}
              >
                Log out
              </button>
            ) : (
              <Link to="/login" onClick={() => setMenuOpen(false)}>
                Log in
              </Link>
            )}
          </p>
        </nav>
      </Drawer>

      <Drawer
        open={searchOpen}
        title="Search"
        onClose={() => setSearchOpen(false)}
      >
        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            openSearch(mobileQuery);
          }}
        >
          <div className="field">
            <SearchField
              id="mobile-search"
              label="Search products"
              showLabel
              value={mobileQuery}
              onChange={setMobileQuery}
              onPick={openProduct}
              onSearch={openSearch}
            />
          </div>
          <button type="submit" className="primary-button">
            Search
          </button>
        </form>
      </Drawer>

      <div className="page-wrap page-main">
        <Outlet />
      </div>

      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <BrandLockup size="md" />
            <p>An Apple store for iPhone, AirPods, Mac, and iPad.</p>
          </div>
          <nav className="footer-nav" aria-label="Footer">
            <div className="footer-col">
              <h2>Shop</h2>
              <Link to="/products">All products</Link>
              <Link to="/products?category=iphone">iPhone</Link>
              <Link to="/products?category=airpods">AirPods</Link>
              <Link to="/products?category=mac">Mac</Link>
              <Link to="/products?category=ipad">iPad</Link>
            </div>
            <div className="footer-col">
              <h2>Account</h2>
              <Link to="/cart">Cart</Link>
              <Link to="/wishlist">Wishlist</Link>
              {accountReady && !session ? (
                <Link to="/login">Sign in</Link>
              ) : null}
            </div>
          </nav>
        </div>
        <div className="footer-base">
          <p>© 2026 Firas Cell</p>
        </div>
      </footer>

      {toast ? (
        <div className="toast-region" role="status" aria-live="polite">
          <div className="toast">{toast}</div>
        </div>
      ) : null}
    </div>
  );
}

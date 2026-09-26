import { useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { RequireAuth } from './components/layout/RequireAuth.tsx';
import { StoreLayout } from './components/layout/StoreLayout.tsx';
import { CartPage } from './pages/CartPage.tsx';
import { CheckoutPage } from './pages/CheckoutPage.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { NotFoundPage } from './pages/NotFoundPage.tsx';
import { OrderConfirmationPage } from './pages/OrderConfirmationPage.tsx';
import { ProductDetailPage } from './pages/ProductDetailPage.tsx';
import { ProductListPage } from './pages/ProductListPage.tsx';
import { WishlistPage } from './pages/WishlistPage.tsx';
import { StoreProvider } from './store/StoreContext.tsx';

export default function App() {
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  return (
    <StoreProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<StoreLayout toast={toast} setToast={setToast} />}>
            <Route path="/" element={<HomePage onFeedback={setToast} />} />
            <Route
              path="/products"
              element={<ProductListPage onFeedback={setToast} />}
            />
            <Route
              path="/products/:slug"
              element={<ProductDetailPage onFeedback={setToast} />}
            />
            <Route
              path="/login"
              element={<LoginPage onFeedback={setToast} />}
            />
            <Route path="/cart" element={<CartPage onFeedback={setToast} />} />
            <Route
              path="/wishlist"
              element={<WishlistPage onFeedback={setToast} />}
            />
            <Route element={<RequireAuth />}>
              <Route
                path="/checkout"
                element={<CheckoutPage onFeedback={setToast} />}
              />
              <Route
                path="/orders/:orderId"
                element={<OrderConfirmationPage />}
              />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  );
}

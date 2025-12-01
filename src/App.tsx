import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { useAuthStore } from '@/store/useAuthStore';
import RootLayout from '@/layouts/RootLayout';
import LoginPage from '@/pages/auth/LoginPage';
import SignupPage from '@/pages/auth/SignupPage';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AdminLayout from '@/layouts/AdminLayout';
import AdminDashboardPage from '@/pages/admin/DashboardPage';
import ProductsPage from '@/pages/admin/products/ProductsPage';
import ProductFormPage from '@/pages/admin/products/ProductFormPage';
import CategoriesPage from '@/pages/admin/categories/CategoriesPage';
import CategoryFormPage from '@/pages/admin/categories/CategoryFormPage';
import AdminOrdersPage from '@/pages/admin/orders/AdminOrdersPage';
import AdminOrderDetailPage from '@/pages/admin/orders/AdminOrderDetailPage';
import CustomersPage from '@/pages/admin/customers/CustomersPage';
import SettingsPage from '@/pages/admin/settings/SettingsPage';
import HomePage from '@/pages/HomePage';
import ShopCategoriesPage from '@/pages/shop/CategoriesPage';
import ShopProductsPage from '@/pages/shop/ProductsPage';
import ProductDetailPage from '@/pages/shop/ProductDetailPage';
import CheckoutPage from '@/pages/shop/CheckoutPage';
import OrderDetailPage from '@/pages/shop/OrderDetailPage';
import OrdersPage from '@/pages/shop/OrdersPage';
import ProfilePage from '@/pages/shop/ProfilePage';
import CounterSalesPage from '@/pages/admin/sales/CounterSalesPage';

import { useCartStore } from '@/store/useCartStore';

function App() {
  const { initialize, user } = useAuthStore();
  const { fetchCart, clearCart } = useCartStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (user) {
      fetchCart();
    } else {
      clearCart();
    }
  }, [user, fetchCart, clearCart]);

  return (
    <Router>
      <Routes>
        <Route element={<RootLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/products" element={<ShopProductsPage />} />
          <Route path="/categories" element={<ShopCategoriesPage />} />
          <Route path="/products/:slug" element={<ProductDetailPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/orders/:id" element={<OrderDetailPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
        </Route>

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="products/new" element={<ProductFormPage />} />
          <Route path="products/:id/edit" element={<ProductFormPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="categories/new" element={<CategoryFormPage />} />
          <Route path="categories/:id/edit" element={<CategoryFormPage />} />
          <Route path="orders" element={<AdminOrdersPage />} />
          <Route path="orders/:id" element={<AdminOrderDetailPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="counter-sales" element={<CounterSalesPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
      <Toaster />
    </Router>
  );
}

export default App;

import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { LoginPage } from '@/features/login/LoginPage';
import { bootstrapAdminSession } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

const DashboardPage = lazy(() =>
  import('@/features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const ProductsPage = lazy(() =>
  import('@/features/products/ProductsPage').then((m) => ({ default: m.ProductsPage })),
);
const ProductFormPage = lazy(() =>
  import('@/features/products/ProductFormPage').then((m) => ({ default: m.ProductFormPage })),
);
const SizeChartsPage = lazy(() =>
  import('@/features/size-charts/SizeChartsPage').then((m) => ({ default: m.SizeChartsPage })),
);
const SizeChartFormPage = lazy(() =>
  import('@/features/size-charts/SizeChartFormPage').then((m) => ({ default: m.SizeChartFormPage })),
);
const CategoriesPage = lazy(() =>
  import('@/features/categories/CategoriesPage').then((m) => ({ default: m.CategoriesPage })),
);
const BrandsPage = lazy(() =>
  import('@/features/brands/BrandsPage').then((m) => ({ default: m.BrandsPage })),
);
const CollectionsPage = lazy(() =>
  import('@/features/collections/CollectionsPage').then((m) => ({ default: m.CollectionsPage })),
);
const OrdersPage = lazy(() =>
  import('@/features/orders/OrdersPage').then((m) => ({ default: m.OrdersPage })),
);
const OrderDetailPage = lazy(() =>
  import('@/features/orders/OrderDetailPage').then((m) => ({ default: m.OrderDetailPage })),
);
const CustomersPage = lazy(() =>
  import('@/features/customers/CustomersPage').then((m) => ({ default: m.CustomersPage })),
);
const CustomerDetailPage = lazy(() =>
  import('@/features/customers/CustomerDetailPage').then((m) => ({ default: m.CustomerDetailPage })),
);
const VipCustomersPage = lazy(() =>
  import('@/features/vip/VipCustomersPage').then((m) => ({ default: m.VipCustomersPage })),
);
const ReviewsPage = lazy(() =>
  import('@/features/reviews/ReviewsPage').then((m) => ({ default: m.ReviewsPage })),
);
const CouponsPage = lazy(() =>
  import('@/features/coupons/CouponsPage').then((m) => ({ default: m.CouponsPage })),
);
const InventoryPage = lazy(() =>
  import('@/features/inventory/InventoryPage').then((m) => ({ default: m.InventoryPage })),
);
const MediaPage = lazy(() =>
  import('@/features/media/MediaPage').then((m) => ({ default: m.MediaPage })),
);
const HomepagePage = lazy(() =>
  import('@/features/homepage/HomepagePage').then((m) => ({ default: m.HomepagePage })),
);
const PagesPage = lazy(() =>
  import('@/features/pages/PagesPage').then((m) => ({ default: m.PagesPage })),
);
const PageFormPage = lazy(() =>
  import('@/features/pages/PageFormPage').then((m) => ({ default: m.PageFormPage })),
);
const BlogsPage = lazy(() =>
  import('@/features/blogs/BlogsPage').then((m) => ({ default: m.BlogsPage })),
);
const BlogFormPage = lazy(() =>
  import('@/features/blogs/BlogFormPage').then((m) => ({ default: m.BlogFormPage })),
);
const FaqsPage = lazy(() =>
  import('@/features/faqs/FaqsPage').then((m) => ({ default: m.FaqsPage })),
);
const ContactPage = lazy(() =>
  import('@/features/contact/ContactPage').then((m) => ({ default: m.ContactPage })),
);
const NewsletterPage = lazy(() =>
  import('@/features/newsletter/NewsletterPage').then((m) => ({ default: m.NewsletterPage })),
);
const ReportsPage = lazy(() =>
  import('@/features/reports/ReportsPage').then((m) => ({ default: m.ReportsPage })),
);
const SettingsPage = lazy(() =>
  import('@/features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);
const RolesPage = lazy(() =>
  import('@/features/roles/RolesPage').then((m) => ({ default: m.RolesPage })),
);
const AdminsPage = lazy(() =>
  import('@/features/admins/AdminsPage').then((m) => ({ default: m.AdminsPage })),
);
const NotificationsPage = lazy(() =>
  import('@/features/notifications/NotificationsPage').then((m) => ({
    default: m.NotificationsPage,
  })),
);
const ProfilePage = lazy(() =>
  import('@/features/profile/ProfilePage').then((m) => ({ default: m.ProfilePage })),
);

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500">
      Loading…
    </div>
  );
}

function UsersAliasRedirect() {
  const { id } = useParams();
  return <Navigate to={id ? `/customers/${id}` : '/customers'} replace />;
}

function PublicOnly({ children }: { children: React.ReactNode }) {
  const ready = useAuthStore((s) => s.ready);
  const authed = useAuthStore((s) => s.isAuthenticated());
  if (!ready) return <RouteFallback />;
  if (authed) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<RouteFallback />}>{children}</Suspense>;
}

export function AppRouter() {
  useEffect(() => {
    void bootstrapAdminSession();
  }, []);

  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnly>
            <LoginPage />
          </PublicOnly>
        }
      />
      <Route element={<AdminLayout />}>
        <Route
          index
          element={
            <Lazy>
              <DashboardPage />
            </Lazy>
          }
        />
        <Route
          path="products"
          element={
            <Lazy>
              <ProductsPage />
            </Lazy>
          }
        />
        <Route
          path="products/new"
          element={
            <Lazy>
              <ProductFormPage />
            </Lazy>
          }
        />
        <Route
          path="products/:id"
          element={
            <Lazy>
              <ProductFormPage />
            </Lazy>
          }
        />
        <Route
          path="size-charts"
          element={
            <Lazy>
              <SizeChartsPage />
            </Lazy>
          }
        />
        <Route
          path="size-charts/create"
          element={
            <Lazy>
              <SizeChartFormPage />
            </Lazy>
          }
        />
        <Route
          path="size-charts/:id/edit"
          element={
            <Lazy>
              <SizeChartFormPage />
            </Lazy>
          }
        />
        <Route
          path="categories"
          element={
            <Lazy>
              <CategoriesPage />
            </Lazy>
          }
        />
        <Route
          path="brands"
          element={
            <Lazy>
              <BrandsPage />
            </Lazy>
          }
        />
        <Route
          path="collections"
          element={
            <Lazy>
              <CollectionsPage />
            </Lazy>
          }
        />
        <Route
          path="orders"
          element={
            <Lazy>
              <OrdersPage />
            </Lazy>
          }
        />
        <Route
          path="orders/:id"
          element={
            <Lazy>
              <OrderDetailPage />
            </Lazy>
          }
        />
        <Route
          path="customers"
          element={
            <Lazy>
              <CustomersPage />
            </Lazy>
          }
        />
        <Route
          path="customers/:id"
          element={
            <Lazy>
              <CustomerDetailPage />
            </Lazy>
          }
        />
        <Route
          path="vip-customers"
          element={
            <Lazy>
              <VipCustomersPage />
            </Lazy>
          }
        />
        <Route
          path="reviews"
          element={
            <Lazy>
              <ReviewsPage />
            </Lazy>
          }
        />
        <Route
          path="coupons"
          element={
            <Lazy>
              <CouponsPage />
            </Lazy>
          }
        />
        <Route
          path="inventory"
          element={
            <Lazy>
              <InventoryPage />
            </Lazy>
          }
        />
        <Route
          path="media"
          element={
            <Lazy>
              <MediaPage />
            </Lazy>
          }
        />
        <Route
          path="homepage"
          element={
            <Lazy>
              <HomepagePage />
            </Lazy>
          }
        />
        <Route
          path="pages"
          element={
            <Lazy>
              <PagesPage />
            </Lazy>
          }
        />
        <Route
          path="pages/new"
          element={
            <Lazy>
              <PageFormPage />
            </Lazy>
          }
        />
        <Route
          path="pages/:id"
          element={
            <Lazy>
              <PageFormPage />
            </Lazy>
          }
        />
        <Route
          path="blogs"
          element={
            <Lazy>
              <BlogsPage />
            </Lazy>
          }
        />
        <Route
          path="blogs/new"
          element={
            <Lazy>
              <BlogFormPage />
            </Lazy>
          }
        />
        <Route
          path="blogs/:id"
          element={
            <Lazy>
              <BlogFormPage />
            </Lazy>
          }
        />
        <Route
          path="faqs"
          element={
            <Lazy>
              <FaqsPage />
            </Lazy>
          }
        />
        <Route
          path="contact"
          element={
            <Lazy>
              <ContactPage />
            </Lazy>
          }
        />
        <Route
          path="newsletter"
          element={
            <Lazy>
              <NewsletterPage />
            </Lazy>
          }
        />
        <Route
          path="reports"
          element={
            <Lazy>
              <ReportsPage />
            </Lazy>
          }
        />
        <Route
          path="settings"
          element={
            <Lazy>
              <SettingsPage />
            </Lazy>
          }
        />
        <Route
          path="roles"
          element={
            <Lazy>
              <RolesPage />
            </Lazy>
          }
        />
        <Route
          path="admins"
          element={
            <Lazy>
              <AdminsPage />
            </Lazy>
          }
        />
        <Route
          path="notifications"
          element={
            <Lazy>
              <NotificationsPage />
            </Lazy>
          }
        />
        <Route
          path="profile"
          element={
            <Lazy>
              <ProfilePage />
            </Lazy>
          }
        />
        <Route path="users" element={<UsersAliasRedirect />} />
        <Route path="users/:id" element={<UsersAliasRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

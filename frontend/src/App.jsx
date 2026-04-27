import '@fontsource/outfit/400.css';
import '@fontsource/outfit/500.css';
import '@fontsource/outfit/600.css';
import '@fontsource/outfit/700.css';
import '@fontsource/outfit/800.css';
import '@fontsource/outfit/900.css';
import '@fontsource/manrope/400.css';
import '@fontsource/manrope/500.css';
import '@fontsource/manrope/600.css';
import '@fontsource/manrope/700.css';
import '@fontsource/manrope/800.css';

import "@/App.css";
import "@/index.css";
import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Toaster } from "./components/ui/sonner";
import { AnalyticsProvider } from "./lib/analytics";
import Header from "./components/Header";
import BottomNav from "./components/BottomNav";
import Footer from "./components/Footer";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import CategoryPage from "./pages/CategoryPage";
import CategoriesPage from "./pages/CategoriesPage";
import TrendingPage from "./pages/TrendingPage";
import SearchPage from "./pages/SearchPage";
import SeoPage from "./pages/SeoPage";
import ProfilePage from "./pages/ProfilePage";
import AdminPage from "./pages/AdminPage";
import CouponsPage from "./pages/CouponsPage";
import BlogPage from "./pages/BlogPage";
import BlogPostPage from "./pages/BlogPostPage";
import StaticPage from "./pages/StaticPage";
import DealsPage from "./pages/DealsPage";
import RedirectPage from "./pages/RedirectPage";
import LimitedDealsPage from "./pages/LimitedDealsPage";
import WishlistPage from "./pages/WishlistPage";
import StoresPage from "./pages/StoresPage";
import StoreDetailPage from "./pages/StoreDetailPage";
import ScrollToTop from "./components/ScrollToTop";
import IntroAnimation from "./components/IntroAnimation";
import PopupManager from "./components/PopupManager";
import AIChatWidget from "./components/AIChatWidget";

function AdminRoute() {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return null;
  if (!user || !isAdmin) return <Navigate to="/" replace />;
  return <AdminPage />;
}

function App() {
  const [introComplete, setIntroComplete] = useState(false);

  return (
    <AuthProvider>
      <BrowserRouter>
        <AnalyticsProvider>
          <IntroAnimation onComplete={() => setIntroComplete(true)} />
          <div className="App min-h-screen bg-[#FAFAFA]">
            <Header />
            <main>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/categories" element={<CategoriesPage />} />
                <Route path="/category/:slug" element={<CategoryPage />} />
                <Route path="/trending" element={<TrendingPage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/deals" element={<DealsPage />} />
                <Route path="/deals/limited-time" element={<LimitedDealsPage />} />
                <Route path="/stores" element={<StoresPage />} />
                <Route path="/stores/:slug" element={<StoreDetailPage />} />
                <Route path="/wishlist" element={<WishlistPage />} />
                <Route path="/deals/:pageType" element={<SeoPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/admin" element={<AdminRoute />} />
                <Route path="/coupons" element={<CouponsPage />} />
                <Route path="/blog" element={<BlogPage />} />
                <Route path="/blog/:slug" element={<BlogPostPage />} />
                <Route path="/page/:slug" element={<StaticPage />} />
                <Route path="/go/:slug" element={<RedirectPage />} />
              </Routes>
            </main>
            <Footer />
            <BottomNav />
            <ScrollToTop />
            <PopupManager />
            <AIChatWidget />
            <Toaster position="top-center" richColors />
          </div>
        </AnalyticsProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

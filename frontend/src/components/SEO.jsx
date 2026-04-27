import { Helmet } from 'react-helmet-async';

const SITE_URL = 'https://disccart.in';
const DEFAULT_IMAGE = 'https://customer-assets.emergentagent.com/job_4782f2ef-8614-4604-843b-cc10ee1e98da/artifacts/a891hwo3_IMG_2239.png';

export default function SEO({ 
  title = 'DISCCART - Best Deals, Coupons & Promo Codes India',
  description = 'Find verified coupons, promo codes & exclusive deals from Amazon, Flipkart, Myntra & 500+ brands. Save up to 90% on your online shopping!',
  keywords = 'coupons, promo codes, deals, discounts, offers, amazon coupons, flipkart offers, myntra sale',
  image = DEFAULT_IMAGE,
  url = '',
  type = 'website',
  noindex = false
}) {
  const fullUrl = url ? `${SITE_URL}${url}` : SITE_URL;
  const fullTitle = title.includes('DISCCART') ? title : `${title} | DISCCART`;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <link rel="canonical" href={fullUrl} />
      
      {/* Robots */}
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      )}
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content="DISCCART" />
      <meta property="og:locale" content="en_IN" />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={fullUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:site" content="@disccart" />
      
      {/* Additional SEO */}
      <meta name="author" content="DISCCART" />
      <meta name="publisher" content="DISCCART" />
      <meta name="copyright" content="DISCCART" />
      <meta name="language" content="English" />
      <meta name="revisit-after" content="1 days" />
      <meta name="distribution" content="global" />
      <meta name="rating" content="general" />
      
      {/* Mobile */}
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content="DISCCART" />
      
      {/* Theme */}
      <meta name="theme-color" content="#ee922c" />
      <meta name="msapplication-TileColor" content="#ee922c" />
    </Helmet>
  );
}

// Pre-configured SEO components for common pages
export function HomeSEO() {
  return (
    <SEO 
      title="DISCCART - Best Deals, Coupons & Promo Codes India 2026"
      description="Find verified coupons, promo codes & exclusive deals from Amazon, Flipkart, Myntra & 500+ brands. Save up to 90% on your online shopping!"
      keywords="coupons, promo codes, deals, discounts, offers, amazon coupons, flipkart offers, myntra sale, online shopping deals india"
      url="/"
    />
  );
}

export function CategoriesSEO() {
  return (
    <SEO 
      title="All Categories - Coupons & Deals"
      description="Browse deals by category - Electronics, Fashion, Food, Travel, Beauty & more. Find the best coupons for every shopping need."
      keywords="shopping categories, electronics deals, fashion coupons, food delivery offers, travel discounts"
      url="/categories"
    />
  );
}

export function TrendingSEO() {
  return (
    <SEO 
      title="Trending Deals & Hot Offers Today"
      description="Discover today's hottest deals and trending offers. Limited time discounts on top brands updated every hour."
      keywords="trending deals, hot offers, today deals, limited time offers, flash sale"
      url="/trending"
    />
  );
}

export function CategoryPageSEO({ category, dealCount = 0 }) {
  const categoryName = category.charAt(0).toUpperCase() + category.slice(1).replace(/-/g, ' ');
  return (
    <SEO 
      title={`${categoryName} Deals & Coupons - Best Offers`}
      description={`Find ${dealCount}+ ${categoryName.toLowerCase()} deals, coupons & discounts. Save big on ${categoryName.toLowerCase()} shopping with verified promo codes.`}
      keywords={`${categoryName.toLowerCase()} deals, ${categoryName.toLowerCase()} coupons, ${categoryName.toLowerCase()} offers, ${categoryName.toLowerCase()} discounts`}
      url={`/category/${category}`}
    />
  );
}

export function BrandPageSEO({ brand, dealCount = 0 }) {
  const brandName = brand.charAt(0).toUpperCase() + brand.slice(1).replace(/-/g, ' ');
  return (
    <SEO 
      title={`${brandName} Coupons, Promo Codes & Offers - January 2026`}
      description={`Get ${dealCount}+ ${brandName} coupons, promo codes & exclusive deals. Save up to 80% with verified ${brandName} offers.`}
      keywords={`${brandName.toLowerCase()} coupons, ${brandName.toLowerCase()} promo codes, ${brandName.toLowerCase()} offers, ${brandName.toLowerCase()} deals`}
      url={`/deals/${brand}-coupons`}
    />
  );
}

export function SearchSEO({ query }) {
  return (
    <SEO 
      title={`Search Results for "${query}" - Deals & Coupons`}
      description={`Find the best deals and coupons matching "${query}". Browse verified offers and save money on your purchase.`}
      keywords={`${query} deals, ${query} coupons, ${query} offers, ${query} discounts`}
      url={`/search?q=${encodeURIComponent(query)}`}
      noindex={true}
    />
  );
}

export function AdminSEO() {
  return (
    <SEO 
      title="Admin Panel"
      description="DISCCART Admin Dashboard"
      noindex={true}
      url="/admin"
    />
  );
}

export function LoginSEO() {
  return (
    <SEO 
      title="Login"
      description="Sign in to your DISCCART account to access saved deals and personalized offers."
      noindex={true}
      url="/login"
    />
  );
}

export function RegisterSEO() {
  return (
    <SEO 
      title="Create Account"
      description="Join DISCCART to save your favorite deals and get personalized coupon recommendations."
      noindex={true}
      url="/register"
    />
  );
}

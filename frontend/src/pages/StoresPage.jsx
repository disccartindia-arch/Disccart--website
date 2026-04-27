import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, ExternalLink, Store as StoreIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { getStores, getFeaturedStores } from '../lib/api';
import SEO from '../components/SEO';

import { StoreCardSkeleton } from '../components/Skeletons';

export default function StoresPage() {
  const [stores, setStores] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [storeOfMonth, setStoreOfMonth] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [allStores, featuredData] = await Promise.all([
          getStores(),
          getFeaturedStores().catch(() => ({ featured: [], store_of_month: null }))
        ]);
        setStores(allStores.filter(s => s.is_active !== false));
        setFeatured(featuredData.featured || []);
        setStoreOfMonth(featuredData.store_of_month);
      } catch { setStores([]); }
      finally { setLoading(false); }
    })();
  }, []);

  const filtered = stores.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen" data-testid="stores-page">
      <SEO title="All Stores | DISCCART" description="Browse all stores and find the best deals" />

      {/* Hero */}
      <section className="bg-gradient-to-br from-green-50 to-orange-50 py-8 md:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl tracking-tighter text-gray-900 mb-3">
            All <span className="text-[#ee922c]">Stores</span>
          </h1>
          <p className="text-gray-600 mb-6 text-base">Browse your favorite stores and grab exclusive deals</p>
          <div className="max-w-md mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search stores..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#ee922c]/50 text-sm"
              data-testid="store-search"
            />
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {/* Store of the Month */}
        {storeOfMonth && (
          <section data-testid="store-of-month">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center text-yellow-600 text-sm font-black">★</span>
              Store of the Month
            </h2>
            <Link to={`/stores/${storeOfMonth.slug}`} className="block">
              <div className="bg-gradient-to-r from-[#ee922c]/10 to-green-50 border border-[#ee922c]/20 rounded-2xl p-6 flex items-center gap-6 hover:shadow-lg transition-shadow">
                <div className="w-20 h-20 rounded-2xl bg-white border flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {storeOfMonth.logo_url ? <img src={storeOfMonth.logo_url} alt={storeOfMonth.name} className="w-full h-full object-contain p-2" /> : <StoreIcon className="w-8 h-8 text-gray-300" />}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-black text-gray-900">{storeOfMonth.name}</h3>
                  {storeOfMonth.description && <p className="text-sm text-gray-500 mt-1">{storeOfMonth.description}</p>}
                </div>
                <span className="text-[#ee922c] font-bold text-sm hidden sm:block">View Deals →</span>
              </div>
            </Link>
          </section>
        )}

        {/* Featured Stores */}
        {featured.length > 0 && !search && (
          <section data-testid="featured-stores">
            <h2 className="text-xl font-bold mb-4">Featured Stores</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {featured.map(s => (
                <StoreCard key={s.id} store={s} />
              ))}
            </div>
          </section>
        )}

        {/* All Stores Grid */}
        <section data-testid="all-stores">
          <h2 className="text-xl font-bold mb-4">{search ? `Results for "${search}"` : 'All Stores'} <span className="text-sm font-normal text-gray-400">({filtered.length})</span></h2>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[...Array(12)].map((_, i) => <StoreCardSkeleton key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-gray-400 text-center py-12">No stores found.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {filtered.map((s, i) => (
                <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <StoreCard store={s} />
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function StoreCard({ store }) {
  return (
    <Link to={`/stores/${store.slug || store.id}`} className="group block" data-testid={`store-card-${store.id}`}>
      <div className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col items-center text-center hover:shadow-md hover:border-[#ee922c]/30 transition-all h-full">
        <div className="w-16 h-16 rounded-xl bg-gray-50 border flex items-center justify-center mb-3 overflow-hidden flex-shrink-0">
          {store.logo_url ? (
            <img src={store.logo_url} alt={store.name} className="w-full h-full object-contain p-1.5" loading="lazy" />
          ) : (
            <StoreIcon className="w-6 h-6 text-gray-300" />
          )}
        </div>
        <p className="font-bold text-sm text-gray-900 group-hover:text-[#ee922c] transition-colors line-clamp-2">{store.name}</p>
        <span className="text-xs text-[#ee922c] font-semibold mt-1 opacity-0 group-hover:opacity-100 transition-opacity">View Deals</span>
      </div>
    </Link>
  );
}

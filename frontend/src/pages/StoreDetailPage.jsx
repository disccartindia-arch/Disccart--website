import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ExternalLink, Store as StoreIcon, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { getStoreBySlug } from '../lib/api';
import DealCard from '../components/DealCard';
import SEO from '../components/SEO';

export default function StoreDetailPage() {
  const { slug } = useParams();
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await getStoreBySlug(slug);
        setStore(data);
      } catch { setStore(null); }
      finally { setLoading(false); }
    })();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#ee922c] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-xl font-bold text-gray-400">Store not found</p>
        <Link to="/stores" className="text-[#ee922c] font-bold hover:underline">← Back to Stores</Link>
      </div>
    );
  }

  const deals = Array.isArray(store.deals) ? store.deals : [];

  return (
    <div className="min-h-screen" data-testid="store-detail-page">
      <SEO title={`${store.name} Deals & Coupons | DISCCART`} description={store.description || `Best deals from ${store.name}`} />

      {/* Store Header */}
      <section className="bg-gradient-to-br from-green-50 to-orange-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link to="/stores" className="text-sm text-gray-500 hover:text-[#ee922c] flex items-center gap-1 mb-4">
            <ArrowLeft className="w-4 h-4" /> All Stores
          </Link>
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white border-2 border-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
              {store.logo_url ? (
                <img src={store.logo_url} alt={store.name} className="w-full h-full object-contain p-3" />
              ) : (
                <StoreIcon className="w-10 h-10 text-gray-300" />
              )}
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900">{store.name}</h1>
              {store.description && <p className="text-gray-500 mt-1 text-sm sm:text-base">{store.description}</p>}
              <div className="flex items-center gap-4 mt-2">
                <span className="text-sm font-bold text-[#ee922c]">{deals.length} deals available</span>
                {store.website_url && (
                  <a href={store.website_url} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-500 hover:text-[#ee922c] flex items-center gap-1">
                    Visit Store <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Deals Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-xl font-bold mb-6">All Deals from {store.name}</h2>
        {deals.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <StoreIcon className="w-12 h-12 mx-auto mb-3 text-gray-200" />
            <p className="font-bold">No active deals right now</p>
            <p className="text-sm">Check back later for new offers!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {deals.map((deal, i) => (
              <motion.div key={deal.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <DealCard deal={deal} />
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

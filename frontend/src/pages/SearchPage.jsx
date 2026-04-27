import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, SlidersHorizontal, Sparkles, Package } from 'lucide-react';
import { motion } from 'framer-motion';
import { enhancedSearch } from '../lib/api';
import DealCard from '../components/DealCard';
import { DealCardSkeleton } from '../components/Skeletons';
import SmartSearchBar from '../components/SmartSearchBar';
import SEO from '../components/SEO';

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Most Relevant' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
  { value: 'newest', label: 'Newest First' },
  { value: 'discount', label: 'Biggest Discount' },
];

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [suggestions, setSuggestions] = useState([]);
  const [sort, setSort] = useState('relevance');
  const [keywords, setKeywords] = useState([]);

  useEffect(() => {
    if (!query) { setDeals([]); setLoading(false); return; }
    setLoading(true);
    enhancedSearch({ q: query, sort, limit: 30 })
      .then(data => {
        setDeals(data.results || []);
        setTotal(data.total || 0);
        setSuggestions(data.suggestions || []);
        setKeywords(data.keywords || []);
      })
      .catch(() => { setDeals([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [query, sort]);

  return (
    <div className="pb-20 md:pb-8" data-testid="search-page">
      <SEO title={`Search: ${query} - DISCCART`} description={`Search results for ${query}`} url={`/search?q=${query}`} />

      {/* Search Header */}
      <section className="bg-gradient-to-br from-orange-50 to-green-50 py-8">
        <div className="max-w-3xl mx-auto px-4">
          <SmartSearchBar className="w-full" />
        </div>
      </section>

      <section className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Results header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="font-display font-bold text-2xl text-gray-900">
                {query ? `Results for "${query}"` : 'Search Deals'}
              </h1>
              {!loading && <p className="text-gray-500 text-sm mt-1">{total} deal{total !== 1 ? 's' : ''} found</p>}
            </div>
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              className="bg-white border rounded-xl px-4 py-2 text-sm font-medium self-start"
              data-testid="search-sort"
            >
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Matched keywords */}
          {keywords.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {keywords.map((kw, i) => (
                <span key={i} className="px-3 py-1 bg-orange-50 text-[#ee922c] text-xs font-semibold rounded-full border border-orange-100">
                  {kw}
                </span>
              ))}
            </div>
          )}

          {/* Results */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => <DealCardSkeleton key={i} />)}
            </div>
          ) : deals.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {deals.map((deal, i) => (
                <motion.div key={deal.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <DealCard deal={deal} />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg font-semibold">No deals found for "{query}"</p>
              <p className="text-gray-400 text-sm mt-1">Try a different search term or ask our AI assistant</p>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('open-ai-chat', { detail: { query } }))}
                className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-[#ee922c] text-white rounded-xl font-bold text-sm hover:bg-[#d9811f] transition-colors"
                data-testid="ask-ai-btn"
              >
                <Sparkles className="w-4 h-4" /> Ask DealBot instead
              </button>

              {/* Alternative suggestions */}
              {suggestions.length > 0 && (
                <div className="mt-8">
                  <p className="text-sm text-gray-400 mb-3">Try searching for:</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {suggestions.map((s, i) => (
                      <Link
                        key={i}
                        to={`/search?q=${encodeURIComponent(s)}`}
                        className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-600 hover:border-[#ee922c] hover:text-[#ee922c] transition-colors"
                      >
                        {s}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

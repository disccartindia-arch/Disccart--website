import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getSeoPageData } from '../lib/api';
import DealCard from '../components/DealCard';
import { motion } from 'framer-motion';
import { Tag, HelpCircle } from 'lucide-react';
import { BrandPageSEO } from '../components/SEO';

export default function SeoPage() {
  const { pageType } = useParams();
  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await getSeoPageData(pageType);
        setPageData(data);
      } catch (error) {
        console.error('Failed to fetch SEO page data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [pageType]);

  if (loading) {
    return (
      <div className="pb-20 md:pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="h-16 bg-gray-200 rounded-lg animate-pulse mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-2xl h-80 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!pageData) {
    return (
      <div className="pb-20 md:pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <p className="text-gray-500 text-lg">Page not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20 md:pb-8" data-testid="seo-page">
      <BrandPageSEO brand={pageType} dealCount={pageData?.coupons?.length || 0} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-2">
            <Tag className="w-8 h-8 text-[#ee922c]" />
            <h1 className="font-display font-bold text-3xl text-gray-900">{pageData.title}</h1>
          </div>
          <p className="text-gray-500">{pageData.description}</p>
        </motion.div>

        {/* Deals Grid */}
        {pageData.coupons && pageData.coupons.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
            {pageData.coupons.map((deal) => (
              <DealCard key={deal.id} deal={deal} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 mb-12">
            <p className="text-gray-500 text-lg">No deals available for this category yet.</p>
          </div>
        )}

        {/* FAQ Section */}
        {pageData.faq && pageData.faq.length > 0 && (
          <section className="bg-gray-50 rounded-2xl p-8" data-testid="faq-section">
            <div className="flex items-center gap-2 mb-6">
              <HelpCircle className="w-6 h-6 text-[#3c7b48]" />
              <h2 className="font-display font-bold text-2xl text-gray-900">Frequently Asked Questions</h2>
            </div>
            <div className="space-y-6">
              {pageData.faq.map((item, index) => (
                <div key={index} className="bg-white rounded-xl p-6">
                  <h3 className="font-semibold text-gray-900 mb-2">{item.q}</h3>
                  <p className="text-gray-600">{item.a}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

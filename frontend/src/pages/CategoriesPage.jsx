import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getCategories } from '../lib/api';
import { Tag, ArrowRight, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { CategoriesSEO } from '../components/SEO';

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const data = await getCategories();
        // Ensure data is an array before setting state
        setCategories(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to fetch categories:', err);
        setError('Could not load categories. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  const categoryImages = {
    'Electronics': 'https://images.unsplash.com/photo-1595284842888-519573d8fb7b?w=600',
    'Fashion': 'https://images.pexels.com/photos/7679655/pexels-photo-7679655.jpeg?w=600',
    'Food & Dining': 'https://images.pexels.com/photos/4440858/pexels-photo-4440858.jpeg?w=600',
    'Travel': 'https://images.pexels.com/photos/8216324/pexels-photo-8216324.jpeg?w=600',
    'Beauty': 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600',
    'Home & Living': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600'
  };

  const defaultImage = 'https://images.unsplash.com/photo-1506784919140-5870942913a6?w=600';

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-gray-900">{error}</h2>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-6 py-2 bg-[#ee922c] text-white rounded-lg"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="pb-20 md:pb-8" data-testid="categories-page">
      <CategoriesSEO />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-2">
            <Tag className="w-8 h-8 text-[#ee922c]" />
            <h1 className="font-display font-bold text-3xl text-gray-900">All Categories</h1>
          </div>
          <p className="text-gray-500">Browse deals by category</p>
        </motion.div>

        {/* Categories Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-2xl h-64 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {categories.length === 0 ? (
              <div className="text-center py-20 text-gray-500">
                No categories found.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categories.map((category, index) => (
                  <motion.div
                    key={category.id || index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Link
                      to={`/category/${category.slug}`}
                      className="block relative h-64 rounded-2xl overflow-hidden group"
                      data-testid={`category-${category.slug}`}
                    >
                      <img
                        src={categoryImages[category.name] || category.image_url || defaultImage}
                        alt={category.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        onError={(e) => { e.target.src = defaultImage; }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                        <h2 className="font-display font-bold text-2xl mb-1">{category.name}</h2>
                        <p className="text-white/70 text-sm mb-3 line-clamp-2">{category.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                            {category.deal_count || 0} deals
                          </span>
                          <span className="flex items-center gap-1 text-sm font-medium group-hover:gap-2 transition-all">
                            View All <ArrowRight className="w-4 h-4" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

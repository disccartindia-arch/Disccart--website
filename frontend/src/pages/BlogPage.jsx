import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Calendar, Eye, ArrowRight, Tag } from 'lucide-react';
import { motion } from 'framer-motion';
import { getBlogPosts } from '../lib/api';
import SEO from '../components/SEO';

export default function BlogPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const data = await getBlogPosts(true, 20);
        setPosts(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to fetch blog posts:', error);
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="pb-20 md:pb-8" data-testid="blog-page">
      <SEO 
        title="Blog - Saving Tips, Coupon Guides & Deal Strategies"
        description="Read our latest articles on saving money, using coupons effectively, and finding the best deals online."
        keywords="saving tips, coupon guides, deal strategies, online shopping tips, discount guides"
        url="/blog"
      />

      {/* Hero */}
      <section className="bg-gradient-to-br from-orange-50 to-green-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full mb-4">
              <BookOpen className="w-5 h-5 text-[#ee922c]" />
              <span className="font-medium text-gray-700">DISCCART Blog</span>
            </div>
            <h1 className="font-display font-black text-4xl md:text-5xl text-gray-900 mb-4">
              Smart Saving Tips & Guides
            </h1>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Learn how to save money, find the best deals, and make the most of your online shopping experience.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Blog Posts */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-gray-200 rounded-2xl h-96 animate-pulse" />
              ))}
            </div>
          ) : posts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {posts.map((post, index) => (
                <motion.article
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-lg transition-shadow group"
                >
                  <Link to={`/blog/${post.slug}`}>
                    {post.featured_image && (
                      <div className="aspect-video overflow-hidden">
                        <img
                          src={post.featured_image}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <div className="p-6">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="bg-orange-100 text-[#ee922c] text-xs font-bold px-2 py-1 rounded-full">
                          {post.category}
                        </span>
                      </div>
                      <h2 className="font-display font-bold text-xl text-gray-900 mb-2 group-hover:text-[#ee922c] transition-colors line-clamp-2">
                        {post.title}
                      </h2>
                      <p className="text-gray-500 text-sm line-clamp-3 mb-4">
                        {post.excerpt}
                      </p>
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(post.created_at)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          <span>{post.views} views</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.article>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No blog posts yet. Check back soon!</p>
            </div>
          )}
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-8 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display font-bold text-xl text-gray-900 mb-4">Browse by Topic</h2>
          <div className="flex flex-wrap gap-3">
            {['Saving Tips', 'Coupon Guides', 'Deal Strategies', 'Electronics', 'Fashion', 'Food'].map((topic) => (
              <span
                key={topic}
                className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-600 hover:border-[#ee922c] hover:text-[#ee922c] transition-colors cursor-pointer"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

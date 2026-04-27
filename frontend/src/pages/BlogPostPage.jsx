import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, Eye, ArrowLeft, Tag, Share2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { getBlogPost } from '../lib/api';
import SEO from '../components/SEO';
import { ShareButtonsFull } from '../components/ShareButtons';
import ReactMarkdown from 'react-markdown';

export default function BlogPostPage() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const data = await getBlogPost(slug);
        setPost(data);
      } catch (err) {
        setError('Post not found');
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [slug]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#ee922c] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center">
        <p className="text-gray-500 text-lg mb-4">Post not found</p>
        <Link to="/blog" className="text-[#ee922c] font-medium hover:underline">
          ← Back to Blog
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-20 md:pb-8" data-testid="blog-post-page">
      <SEO 
        title={post.title}
        description={post.meta_description || post.excerpt}
        url={`/blog/${slug}`}
        image={post.featured_image}
        type="article"
      />

      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Link */}
        <Link 
          to="/blog" 
          className="inline-flex items-center gap-2 text-gray-500 hover:text-[#ee922c] mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Blog
        </Link>

        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-4">
            <span className="bg-orange-100 text-[#ee922c] text-sm font-bold px-3 py-1 rounded-full">
              {post.category}
            </span>
            <div className="flex items-center gap-1 text-sm text-gray-400">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(post.created_at)}</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-gray-400">
              <Eye className="w-4 h-4" />
              <span>{post.views} views</span>
            </div>
          </div>
          
          <h1 className="font-display font-black text-3xl md:text-4xl text-gray-900 mb-4 leading-tight">
            {post.title}
          </h1>
          
          <p className="text-xl text-gray-600">
            {post.excerpt}
          </p>
        </motion.header>

        {/* Featured Image */}
        {post.featured_image && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-8 rounded-2xl overflow-hidden"
          >
            <img
              src={post.featured_image}
              alt={post.title}
              className="w-full h-auto"
            />
          </motion.div>
        )}

        {/* Content */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="prose prose-lg max-w-none prose-headings:font-display prose-headings:text-gray-900 prose-a:text-[#ee922c] prose-a:no-underline hover:prose-a:underline"
        >
          <ReactMarkdown>{post.content}</ReactMarkdown>
        </motion.div>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="mt-8 pt-8 border-t border-gray-100">
            <div className="flex items-center gap-2 flex-wrap">
              <Tag className="w-4 h-4 text-gray-400" />
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Share */}
        <div className="mt-8 pt-8 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Share2 className="w-5 h-5" />
              Share this article
            </h3>
            <ShareButtonsFull deal={{ id: post.id, title: post.title, brand_name: 'DISCCART Blog', discount_value: 0 }} />
          </div>
        </div>
      </article>
    </div>
  );
}

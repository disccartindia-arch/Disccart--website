import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Mail, Phone } from 'lucide-react';
import { motion } from 'framer-motion';
import { getPage } from '../lib/api';
import SEO from '../components/SEO';
import ReactMarkdown from 'react-markdown';

export default function StaticPage() {
  const { slug } = useParams();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPage = async () => {
      setLoading(true);
      try {
        const data = await getPage(slug);
        setPage(data);
      } catch (err) {
        setError('Page not found');
      } finally {
        setLoading(false);
      }
    };
    fetchPage();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#ee922c] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center">
        <p className="text-gray-500 text-lg mb-4">Page not found</p>
        <Link to="/" className="text-[#ee922c] font-medium hover:underline">
          ← Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-20 md:pb-8" data-testid={`page-${slug}`}>
      <SEO 
        title={page.title}
        description={page.meta_description || `${page.title} - DISCCART`}
        keywords={page.meta_keywords}
        url={`/page/${slug}`}
      />

      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <h1 className="font-display font-black text-3xl md:text-4xl text-gray-900 mb-4">
            {page.title}
          </h1>
          <div className="w-24 h-1 bg-gradient-to-r from-[#ee922c] to-[#3c7b48] mx-auto rounded-full" />
        </motion.header>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="prose prose-lg max-w-none prose-headings:font-display prose-headings:text-gray-900 prose-a:text-[#ee922c] prose-a:no-underline hover:prose-a:underline prose-strong:text-gray-900"
        >
          <ReactMarkdown>{page.content}</ReactMarkdown>
        </motion.div>

        {/* Contact Info for Contact Page */}
        {slug === 'contact-us' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            <a
              href="mailto:disccartindia@gmail.com"
              className="flex items-center gap-4 p-6 bg-orange-50 rounded-2xl hover:bg-orange-100 transition-colors"
            >
              <div className="w-12 h-12 bg-[#ee922c] rounded-full flex items-center justify-center">
                <Mail className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Email Us</p>
                <p className="font-semibold text-gray-900">disccartindia@gmail.com</p>
              </div>
            </a>
            <a
              href="tel:+919111036751"
              className="flex items-center gap-4 p-6 bg-green-50 rounded-2xl hover:bg-green-100 transition-colors"
            >
              <div className="w-12 h-12 bg-[#3c7b48] rounded-full flex items-center justify-center">
                <Phone className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Call Us</p>
                <p className="font-semibold text-gray-900">+91 9111036751</p>
              </div>
            </a>
          </motion.div>
        )}
      </article>
    </div>
  );
}

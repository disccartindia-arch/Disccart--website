import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Tag, Store, ShoppingBag, X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { searchSuggestions } from '../lib/api';

export default function SmartSearchBar({ className = '' }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);
  const debounceRef = useRef(null);

  // Click outside to close
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchSuggestions = useCallback(async (q) => {
    if (q.length < 2) { setSuggestions([]); return; }
    setLoading(true);
    try {
      const data = await searchSuggestions(q);
      setSuggestions(data);
      setShowSuggestions(true);
      setSelectedIdx(-1);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setShowSuggestions(false);
    navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const handleSelect = (suggestion) => {
    setQuery(suggestion.text);
    setShowSuggestions(false);
    navigate(`/search?q=${encodeURIComponent(suggestion.text)}`);
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || !suggestions.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(prev => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && selectedIdx >= 0) {
      e.preventDefault();
      handleSelect(suggestions[selectedIdx]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const typeIcon = (type) => {
    if (type === 'brand') return <Store className="w-4 h-4 text-[#3c7b48]" />;
    if (type === 'category') return <Tag className="w-4 h-4 text-[#ee922c]" />;
    return <ShoppingBag className="w-4 h-4 text-gray-400" />;
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`} data-testid="smart-search-bar">
      <form onSubmit={handleSubmit} className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search deals, brands, categories..."
          className="w-full bg-gray-100 hover:bg-gray-50 focus:bg-white rounded-xl pl-10 pr-10 py-2.5 text-sm border border-transparent focus:border-[#ee922c] focus:ring-2 focus:ring-[#ee922c]/20 outline-none transition-all"
          data-testid="smart-search-input"
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(''); setSuggestions([]); setShowSuggestions(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </form>

      {/* Autocomplete dropdown */}
      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute top-full mt-2 w-full bg-white rounded-xl border border-gray-200 shadow-xl z-50 overflow-hidden"
            data-testid="search-suggestions"
          >
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => handleSelect(s)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                  selectedIdx === i ? 'bg-orange-50' : ''
                }`}
                data-testid={`suggestion-${i}`}
              >
                {typeIcon(s.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{s.text}</p>
                  <p className="text-xs text-gray-400 capitalize">{s.type}</p>
                </div>
                <Search className="w-3.5 h-3.5 text-gray-300" />
              </button>
            ))}

            {/* AI suggestion */}
            <button
              onClick={() => {
                setShowSuggestions(false);
                // Trigger AI chat widget open — dispatch custom event
                window.dispatchEvent(new CustomEvent('open-ai-chat', { detail: { query } }));
              }}
              className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-orange-50 to-amber-50 border-t border-orange-100 hover:from-orange-100 hover:to-amber-100 transition-colors"
              data-testid="ask-ai-suggestion"
            >
              <Sparkles className="w-4 h-4 text-[#ee922c]" />
              <span className="text-sm font-semibold text-[#ee922c]">Ask DealBot AI for "{query}"</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

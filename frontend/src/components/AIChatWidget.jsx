import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Loader2, Bot, User, ShoppingBag, Sparkles, ExternalLink, Tag } from 'lucide-react';
import { aiChat } from '../lib/api';

function ProductCard({ product }) {
  const hasCode = product.code && product.code !== 'N/A';
  return (
    <a
      href={product.affiliate_url?.startsWith('http') ? product.affiliate_url : `https://${product.affiliate_url}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex gap-3 p-3 bg-white rounded-xl border border-gray-100 hover:border-[#ee922c]/40 hover:shadow-sm transition-all group"
      data-testid={`ai-product-${product.id}`}
    >
      {product.image_url && (
        <img src={product.image_url} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-[#ee922c] uppercase">{product.brand}</p>
        <p className="text-sm font-semibold text-gray-900 truncate">{product.title}</p>
        <div className="flex items-center gap-2 mt-1">
          {product.price && <span className="text-sm font-bold text-[#3c7b48]">₹{product.price}</span>}
          {product.original_price && product.original_price > product.price && (
            <span className="text-xs text-gray-400 line-through">₹{product.original_price}</span>
          )}
          {hasCode && (
            <span className="text-xs bg-orange-100 text-[#ee922c] px-1.5 py-0.5 rounded font-mono font-bold">{product.code}</span>
          )}
        </div>
      </div>
      <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-[#ee922c] flex-shrink-0 mt-1 transition-colors" />
    </a>
  );
}

function ChatMessage({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}
      data-testid={`chat-msg-${msg.role}`}
    >
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#ee922c] to-[#d9811f] flex items-center justify-center flex-shrink-0 mt-1">
          <Bot className="w-4 h-4 text-white" />
        </div>
      )}
      <div className={`max-w-[85%] space-y-2 ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? 'bg-[#ee922c] text-white rounded-br-md'
            : 'bg-gray-100 text-gray-800 rounded-bl-md'
        }`}>
          <p className="whitespace-pre-wrap">{msg.text}</p>
        </div>
        {msg.products?.length > 0 && (
          <div className="space-y-2 mt-1">
            {msg.products.map((p, i) => <ProductCard key={p.id || i} product={p} />)}
          </div>
        )}
      </div>
      {isUser && (
        <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 mt-1">
          <User className="w-4 h-4 text-gray-500" />
        </div>
      )}
    </motion.div>
  );
}

export default function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'bot',
      text: "Hey! I'm DealBot 🛒\nAsk me for the best deals, coupon codes, or product recommendations!",
      products: []
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => 'chat_' + Math.random().toString(36).slice(2));
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSend = async (e) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', text, products: [] }]);
    setLoading(true);

    try {
      const res = await aiChat(text, sessionId);
      setMessages(prev => [...prev, {
        role: 'bot',
        text: res.reply || "I found some deals for you!",
        products: res.products || []
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'bot',
        text: "Sorry, I'm having trouble right now. Try browsing our deals page or searching above!",
        products: []
      }]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    "Best deals today",
    "Electronics under ₹1000",
    "Fashion coupons",
    "Food delivery offers"
  ];

  return (
    <>
      {/* FAB Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-24 sm:bottom-6 left-4 z-[60] flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-[#ee922c] to-[#d9811f] text-white rounded-full shadow-lg shadow-orange-400/30 hover:shadow-xl hover:scale-105 active:scale-95 transition-all"
            data-testid="ai-chat-fab"
          >
            <Sparkles className="w-5 h-5" />
            <span className="font-bold text-sm hidden sm:inline">Ask DealBot</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 sm:bottom-6 sm:left-4 sm:right-auto z-[60] w-full sm:w-[400px] h-[85vh] sm:h-[560px] bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
            data-testid="ai-chat-panel"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-[#ee922c] to-[#d9811f] text-white flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">DealBot AI</h3>
                  <p className="text-xs text-white/70">Your smart shopping assistant</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors" data-testid="ai-chat-close">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {messages.map((msg, i) => <ChatMessage key={i} msg={msg} />)}
              {loading && (
                <div className="flex gap-2 items-start">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#ee922c] to-[#d9811f] flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick prompts — only show at start */}
            {messages.length <= 1 && !loading && (
              <div className="px-4 pb-2 flex flex-wrap gap-2">
                {quickPrompts.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => { setInput(prompt); }}
                    className="px-3 py-1.5 bg-orange-50 text-[#ee922c] text-xs font-semibold rounded-full border border-orange-100 hover:bg-orange-100 transition-colors"
                    data-testid={`quick-prompt-${i}`}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <form onSubmit={handleSend} className="flex gap-2 px-4 py-3 border-t bg-gray-50 flex-shrink-0 pb-6 sm:pb-3">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask for deals, coupons..."
                className="flex-1 bg-white rounded-xl px-4 py-2.5 text-sm border border-gray-200 outline-none focus:ring-2 focus:ring-[#ee922c] focus:border-transparent"
                disabled={loading}
                data-testid="ai-chat-input"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="px-4 py-2.5 bg-[#ee922c] text-white rounded-xl disabled:opacity-40 hover:bg-[#d9811f] transition-colors flex-shrink-0"
                data-testid="ai-chat-send"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

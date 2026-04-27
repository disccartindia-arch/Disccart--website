import { useState, useEffect, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SlidersHorizontal, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getFilterConfig } from '../lib/api';
import { Button } from './ui/button';

const FilterChip = memo(function FilterChip({ label, isSelected, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={`px-3 py-2 rounded-xl border text-sm font-semibold transition-all ${isSelected ? 'bg-[#ee922c]/10 border-[#ee922c] text-[#ee922c]' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}
    >
      {label}
    </button>
  );
});

const CheckChip = memo(function CheckChip({ label, isSelected, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={`px-3 py-2 rounded-xl border text-sm font-semibold transition-all ${isSelected ? 'bg-[#3c7b48]/10 border-[#3c7b48] text-[#3c7b48]' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}
    >
      {label}
    </button>
  );
});

export default function FilterDrawer({ onApply }) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState(null);
  const [loaded, setLoaded] = useState(false);

  const [selectedPrice, setSelectedPrice] = useState(null);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedStores, setSelectedStores] = useState([]);
  const [selectedDiscount, setSelectedDiscount] = useState(null);
  const [selectedDealType, setSelectedDealType] = useState(null);

  useEffect(() => {
    if (loaded) return;
    (async () => {
      try {
        const data = await getFilterConfig();
        setConfig(data);
        setLoaded(true);
      } catch {
        setConfig({ price_brackets: [], categories: [], stores: [], discount_filters: [], deal_type_filters: [] });
        setLoaded(true);
      }
    })();
  }, [loaded]);

  const toggleCategory = useCallback((name) => {
    setSelectedCategories(prev => prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name]);
  }, []);

  const toggleStore = useCallback((name) => {
    setSelectedStores(prev => prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]);
  }, []);

  const handleApply = () => {
    const filters = {};
    if (selectedPrice) { filters.min_price = selectedPrice.min; filters.max_price = selectedPrice.max; }
    if (selectedCategories.length) filters.category = selectedCategories[0];
    if (selectedStores.length) filters.store = selectedStores[0];
    if (selectedDiscount) { filters.min_discount = selectedDiscount.min; filters.max_discount = selectedDiscount.max; }
    if (selectedDealType) filters.deal_type = selectedDealType.value;
    onApply?.(filters);
    setIsOpen(false);
    // Navigate to deals page so filters are applied there
    if (Object.keys(filters).length > 0) {
      navigate('/deals');
    }
  };

  const handleClear = () => {
    setSelectedPrice(null);
    setSelectedCategories([]);
    setSelectedStores([]);
    setSelectedDiscount(null);
    setSelectedDealType(null);
    onApply?.({});
    setIsOpen(false);
  };

  const activeCount = (selectedPrice ? 1 : 0) + selectedCategories.length + selectedStores.length + (selectedDiscount ? 1 : 0) + (selectedDealType ? 1 : 0);
  const visibleCategories = config?.categories?.filter(c => c.show_in_filter !== false) || [];
  const visibleStores = config?.stores?.filter(s => s.show_in_filter !== false) || [];
  const priceBrackets = (config?.price_brackets || []).filter(b => b.is_active !== false).sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
  const discountFilters = (config?.discount_filters || []).filter(d => d.is_active !== false).sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
  const dealTypeFilters = (config?.deal_type_filters || []).filter(t => t.is_active !== false).sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

  const hasFilters = priceBrackets.length > 0 || visibleCategories.length > 0 || visibleStores.length > 0 || discountFilters.length > 0 || dealTypeFilters.length > 0;
  if (!hasFilters && loaded) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full bg-[#ee922c] text-white shadow-lg shadow-orange-500/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
        data-testid="filter-fab"
      >
        <SlidersHorizontal className="w-6 h-6" />
        {activeCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">{activeCount}</span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 z-50" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-white z-50 shadow-2xl flex flex-col"
              data-testid="filter-drawer"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 pb-3 flex-shrink-0">
                <h2 className="text-xl font-black text-gray-900">Filters</h2>
                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-gray-100 rounded-full" data-testid="filter-close"><X className="w-5 h-5" /></button>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-6">
                {/* Deal Type */}
                {dealTypeFilters.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Deal Type</h3>
                    <div className="flex flex-wrap gap-2">
                      {dealTypeFilters.map((t, i) => (
                        <FilterChip key={i} label={t.label} isSelected={selectedDealType?.label === t.label} onToggle={() => setSelectedDealType(selectedDealType?.label === t.label ? null : t)} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Price */}
                {priceBrackets.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Price Range</h3>
                    <div className="flex flex-wrap gap-2">
                      {priceBrackets.map((b, i) => (
                        <FilterChip key={i} label={b.label} isSelected={selectedPrice?.label === b.label} onToggle={() => setSelectedPrice(selectedPrice?.label === b.label ? null : b)} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Discount */}
                {discountFilters.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Discount</h3>
                    <div className="flex flex-wrap gap-2">
                      {discountFilters.map((d, i) => (
                        <FilterChip key={i} label={d.label} isSelected={selectedDiscount?.label === d.label} onToggle={() => setSelectedDiscount(selectedDiscount?.label === d.label ? null : d)} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Categories */}
                {visibleCategories.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Categories</h3>
                    <div className="flex flex-wrap gap-2">
                      {visibleCategories.map(c => (
                        <CheckChip key={c.id} label={c.name} isSelected={selectedCategories.includes(c.name)} onToggle={() => toggleCategory(c.name)} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Stores */}
                {visibleStores.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Stores</h3>
                    <div className="flex flex-wrap gap-2">
                      {visibleStores.map(s => (
                        <CheckChip key={s.id} label={s.name} isSelected={selectedStores.includes(s.name)} onToggle={() => toggleStore(s.name)} />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sticky bottom buttons - always visible above bottom nav */}
              <div className="flex gap-3 p-4 pb-24 sm:pb-4 border-t bg-white flex-shrink-0">
                <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={handleClear} data-testid="filter-clear">Clear All</Button>
                <Button className="flex-1 h-12 rounded-xl bg-[#ee922c] hover:bg-[#d9811f] text-white font-bold" onClick={handleApply} data-testid="filter-apply">
                  Apply Filters {activeCount > 0 && `(${activeCount})`}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

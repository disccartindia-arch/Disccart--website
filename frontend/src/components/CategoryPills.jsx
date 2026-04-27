import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Laptop, Shirt, UtensilsCrossed, Plane, Sparkles, 
  Home, Tag, ShoppingBag, Heart, Zap, Smartphone 
} from 'lucide-react';
import { getCategories } from '../lib/api';

// Expanded map to support more category types from admin
const iconMap = {
  'Laptop': Laptop,
  'Electronics': Laptop,
  'Shirt': Shirt,
  'Fashion': Shirt,
  'UtensilsCrossed': UtensilsCrossed,
  'Food': UtensilsCrossed,
  'Plane': Plane,
  'Travel': Plane,
  'Sparkles': Sparkles,
  'Beauty': Sparkles,
  'Home': Home,
  'ShoppingBag': ShoppingBag,
  'Health': Heart,
  'Trending': Zap,
  'Mobile': Smartphone
};

export default function CategoryPills({ activeCategory = null }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await getCategories();
        // Ensure data is an array before setting state
        setCategories(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  if (loading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-4 hide-scrollbar">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex-shrink-0 w-28 h-10 bg-gray-100 rounded-full animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 hide-scrollbar">
      {/* All Deals pill */}
      <Link
        to="/"
        className={`flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm transition-all ${
          !activeCategory 
            ? 'bg-[#ee922c] text-white shadow-md shadow-orange-200' 
            : 'bg-white border border-gray-200 text-gray-600 hover:border-[#ee922c]'
        }`}
      >
        <Tag className="w-4 h-4" />
        <span>All Deals</span>
      </Link>

      {categories.map((category) => {
        const Icon = iconMap[category.icon] || iconMap[category.name] || Tag;
        const isActive = activeCategory === category.slug;
        
        return (
          <Link
            key={category.id || category._id}
            to={`/category/${category.slug}`}
            className={`flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm transition-all ${
              isActive 
                ? 'bg-[#ee922c] text-white shadow-md shadow-orange-200' 
                : 'bg-white border border-gray-200 text-gray-600 hover:border-[#ee922c]'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{category.name}</span>
          </Link>
        );
      })}
    </div>
  );
}

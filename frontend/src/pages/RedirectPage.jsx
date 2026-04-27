import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_BACKEND_URL;

export default function RedirectPage() {
  const { slug } = useParams();
  const [error, setError] = useState(null);

  useEffect(() => {
    const redirect = async () => {
      try {
        const res = await fetch(`${API_URL}/api/go/${slug}`, { redirect: 'manual' });
        if (res.type === 'opaqueredirect' || res.status === 302 || res.status === 301) {
          const location = res.headers.get('Location');
          if (location) {
            window.location.href = location;
            return;
          }
        }
        // If fetch didn't get redirect header (CORS), use the API directly
        const data = await fetch(`${API_URL}/api/go/${slug}`);
        if (data.redirected) {
          window.location.href = data.url;
          return;
        }
        // Fallback: open in same window
        window.location.href = `${API_URL}/api/go/${slug}`;
      } catch (err) {
        setError('Link not found or expired');
      }
    };
    redirect();
  }, [slug]);

  if (error) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center" data-testid="redirect-error">
        <p className="text-gray-500 text-lg mb-4">{error}</p>
        <a href="/" className="text-[#ee922c] font-medium hover:underline">Go to Home</a>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center" data-testid="redirect-page">
      <Loader2 className="w-8 h-8 text-[#ee922c] animate-spin mb-4" />
      <p className="text-gray-500">Redirecting you to the deal...</p>
    </div>
  );
}

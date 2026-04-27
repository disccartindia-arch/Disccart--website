import axios from 'axios';

const API_URL = import.meta.env.VITE_BACKEND_URL;

// Resolve image URLs: /uploads/file.jpg → BACKEND_URL/uploads/file.jpg
export const resolveImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads/') || url.startsWith('uploads/')) {
    const cleanPath = url.startsWith('/') ? url : `/${url}`;
    return `${API_URL}${cleanPath}`;
  }
  return url;
};

const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach auth token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        await axios.post(`${API_URL}/api/auth/refresh`, {}, { withCredentials: true });
        return api(originalRequest);
      } catch {
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

// ===================== IMAGE UPLOAD =====================
export const uploadImage = async (file) => {
  const formData = new FormData();
  formData.append('image', file);
  const { data } = await api.post('/upload-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data.url;
};

// ===================== COUPONS =====================
export const getCoupons = async (params = {}) => {
  const { data } = await api.get('/coupons', { params });
  return data;
};

export const getCoupon = async (id) => {
  const { data } = await api.get(`/coupons/${id}`);
  return data;
};

export const createCoupon = async (couponData) => {
  const { data } = await api.post('/coupons', couponData);
  return data;
};

export const updateCoupon = async (id, couponData) => {
  const { data } = await api.put(`/coupons/${id}`, couponData);
  return data;
};

export const deleteCoupon = async (id) => {
  const { data } = await api.delete(`/coupons/${id}`);
  return data;
};

export const bulkDeleteCoupons = async (ids) => {
  const { data } = await api.post('/coupons/bulk-delete', { ids });
  return data;
};

export const bulkUploadCoupons = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post('/coupons/bulk-upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
};

// ===================== CATEGORIES =====================
export const getCategories = async () => {
  const { data } = await api.get('/categories');
  return Array.isArray(data) ? data : [];
};

export const getCategory = async (id) => {
  const { data } = await api.get(`/categories/${id}`);
  return data;
};

export const createCategory = async (categoryData) => {
  const { data } = await api.post('/categories', categoryData);
  return data;
};

export const updateCategory = async (id, categoryData) => {
  const { data } = await api.put(`/categories/${id}`, categoryData);
  return data;
};

export const deleteCategory = async (id) => {
  const { data } = await api.delete(`/categories/${id}`);
  return data;
};

// ===================== BRANDS =====================
export const getBrands = async () => {
  const { data } = await api.get('/brands');
  return data;
};

export const createBrand = async (brandData) => {
  const { data } = await api.post('/brands', brandData);
  return data;
};

// ===================== TRACKING & ANALYTICS =====================
export const trackClick = async (couponId, source = 'web') => {
  const { data } = await api.post('/clicks', { coupon_id: couponId, source });
  return data;
};

export const getAnalyticsOverview = async () => {
  const { data } = await api.get('/analytics/overview');
  return data;
};

export const getClickAnalytics = async (days = 7) => {
  const { data } = await api.get('/analytics/clicks', { params: { days } });
  return data;
};

// ===================== SEO & AI =====================
export const getSeoPageData = async (pageType) => {
  const { data } = await api.get(`/seo/${pageType}`);
  return data;
};

export const generateAIContent = async (contentData) => {
  const { data } = await api.post('/ai/generate-content', contentData);
  return data;
};

// ===================== ADDITIONAL FEATURES =====================

export const getPrettyLinks = async () => {
  const { data } = await api.get('/pretty-links');
  return Array.isArray(data) ? data : [];
};

export const createPrettyLink = async (linkData) => {
  const { data } = await api.post('/pretty-links', linkData);
  return data;
};

export const updatePrettyLink = async (id, linkData) => {
  const { data } = await api.put(`/pretty-links/${id}`, linkData);
  return data;
};

export const deletePrettyLink = async (id) => {
  const { data } = await api.delete(`/pretty-links/${id}`);
  return data;
};

// ===================== CMS & BLOG =====================
export const getPages = async (publishedOnly = false) => {
  const { data } = await api.get('/pages', { params: { published_only: publishedOnly } });
  return Array.isArray(data) ? data : [];
};

export const getPage = async (slug) => {
  const { data } = await api.get(`/pages/${slug}`);
  return data;
};

export const createPage = async (pageData) => {
  const { data } = await api.post('/pages', pageData);
  return data;
};

export const updatePage = async (id, pageData) => {
  const { data } = await api.put(`/pages/${id}`, pageData);
  return data;
};

export const deletePage = async (id) => {
  const { data } = await api.delete(`/pages/${id}`);
  return data;
};

export const getBlogPosts = async (publishedOnly = true, limit = 20, skip = 0) => {
  const { data } = await api.get('/blog', { params: { published_only: publishedOnly, limit, skip } });
  return Array.isArray(data) ? data : [];
};

export const getBlogPost = async (slug) => {
  const { data } = await api.get(`/blog/${slug}`);
  return data;
};

export const createBlogPost = async (postData) => {
  const { data } = await api.post('/blog', postData);
  return data;
};

export const updateBlogPost = async (id, postData) => {
  const { data } = await api.put(`/blog/${id}`, postData);
  return data;
};

export const deleteBlogPost = async (id) => {
  const { data } = await api.delete(`/blog/${id}`);
  return data;
};

// ===================== WISHLIST =====================
export const getWishlist = async (userId) => {
  const { data } = await api.get(`/wishlist/${userId}`);
  return data;
};

export const getWishlistIds = async (userId) => {
  const { data } = await api.get(`/wishlist/${userId}/ids`);
  return data;
};

export const addToWishlist = async (userId, couponId) => {
  const { data } = await api.post('/wishlist', { user_id: userId, coupon_id: couponId });
  return data;
};

export const removeFromWishlist = async (userId, couponId) => {
  const { data } = await api.delete(`/wishlist/${userId}/${couponId}`);
  return data;
};

// ===================== STORES =====================
export const getStores = async (params = {}) => {
  const { data } = await api.get('/stores', { params });
  return Array.isArray(data) ? data : [];
};

export const getStoreBySlug = async (slug) => {
  const { data } = await api.get(`/stores/slug/${slug}`);
  return data;
};

export const getFeaturedStores = async () => {
  const { data } = await api.get('/stores/featured');
  return data;
};

export const createStore = async (storeData) => {
  const { data } = await api.post('/stores', storeData);
  return data;
};

export const updateStore = async (id, storeData) => {
  const { data } = await api.put(`/stores/${id}`, storeData);
  return data;
};

export const deleteStore = async (id) => {
  const { data } = await api.delete(`/stores/${id}`);
  return data;
};

// ===================== FILTERS =====================
export const getFilterConfig = async () => {
  const { data } = await api.get('/admin/filters');
  return data;
};

export const updateFilterConfig = async (filterData) => {
  const { data } = await api.patch('/admin/filters', filterData);
  return data;
};

export const getFilteredDeals = async (params = {}) => {
  const { data } = await api.get('/deals/filtered', { params });
  return data;
};

// ===================== TRENDING =====================
export const getTrendingDeals = async (params = {}) => {
  const { data } = await api.get('/deals/trending', { params });
  return data;
};

export const getTrendingConfig = async () => {
  const { data } = await api.get('/admin/trending-config');
  return data;
};

export const updateTrendingConfig = async (configData) => {
  const { data } = await api.patch('/admin/trending-config', configData);
  return data;
};

// ===================== SLIDES =====================
export const getSlides = async () => {
  const { data } = await api.get('/slides');
  return Array.isArray(data) ? data : [];
};

export const getAdminSlides = async () => {
  const { data } = await api.get('/admin/slides');
  return Array.isArray(data) ? data : [];
};

export const createSlide = async (slideData) => {
  const { data } = await api.post('/admin/slides', slideData);
  return data;
};

export const updateSlide = async (id, slideData) => {
  const { data } = await api.patch(`/admin/slides/${id}`, slideData);
  return data;
};

export const deleteSlide = async (id) => {
  const { data } = await api.delete(`/admin/slides/${id}`);
  return data;
};

// ===================== HERO CONFIG =====================
export const getHeroConfig = async () => {
  const { data } = await api.get('/hero-config');
  return data;
};

export const updateHeroConfig = async (configData) => {
  const { data } = await api.patch('/admin/hero-config', configData);
  return data;
};

// ===================== POPUPS =====================
export const getActivePopups = async () => {
  const { data } = await api.get('/popups/active');
  return Array.isArray(data) ? data : [];
};

export const getAllPopups = async () => {
  const { data } = await api.get('/popups');
  return Array.isArray(data) ? data : [];
};

export const createPopup = async (popupData) => {
  const { data } = await api.post('/admin/popups', popupData);
  return data;
};

export const updatePopup = async (id, popupData) => {
  const { data } = await api.put(`/admin/popups/${id}`, popupData);
  return data;
};

export const deletePopup = async (id) => {
  const { data } = await api.delete(`/admin/popups/${id}`);
  return data;
};

export const trackPopupView = async (id) => {
  try { await api.post(`/popups/${id}/view`); } catch {}
};

export const trackPopupClick = async (id) => {
  try { await api.post(`/popups/${id}/click`); } catch {}
};

// ===================== LIKES & COMMENTS =====================
export const toggleLike = async (dealId, userId) => {
  const { data } = await api.post(`/deals/${dealId}/like`, { user_id: userId });
  return data;
};

export const getLikes = async (dealId, userId) => {
  const { data } = await api.get(`/deals/${dealId}/likes`, { params: { user_id: userId } });
  return data;
};

export const addComment = async (dealId, userId, userName, text) => {
  const { data } = await api.post(`/deals/${dealId}/comments`, { user_id: userId, user_name: userName, text });
  return data;
};

export const getComments = async (dealId) => {
  const { data } = await api.get(`/deals/${dealId}/comments`);
  return Array.isArray(data) ? data : [];
};

// ===================== AI ASSISTANT =====================
export const aiChat = async (message, sessionId) => {
  const { data } = await api.post('/ai/chat', { message, session_id: sessionId });
  return data;
};

// ===================== ENHANCED SEARCH =====================
export const enhancedSearch = async (params = {}) => {
  const { data } = await api.get('/search', { params });
  return data;
};

export const searchSuggestions = async (q) => {
  const { data } = await api.get('/search/suggest', { params: { q } });
  return data?.suggestions || [];
};

export const getCouponsOnly = async (params = {}) => {
  const { data } = await api.get('/coupons-only', { params });
  return Array.isArray(data) ? data : [];
};

export default api;

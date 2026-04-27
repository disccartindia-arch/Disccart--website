import { useState, useEffect } from 'react';
import {
  Plus, Pencil, Trash2, X, Loader2, Eye, EyeOff,
  Megaphone, Calendar, BarChart3, Smartphone, Monitor, Tablet,
  MousePointerClick, Clock, ArrowDown, LogOut, Scroll
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '../components/ui/dialog';
import {
  getAllPopups, createPopup, updatePopup, deletePopup, uploadImage
} from '../lib/api';

const POPUP_TYPES = [
  { value: 'entry', label: 'Entry Popup' },
  { value: 'exit_intent', label: 'Exit Intent' },
  { value: 'scroll', label: 'Scroll-Based' },
  { value: 'timed', label: 'Timed Popup' },
  { value: 'offer', label: 'Offer / Coupon' },
  { value: 'newsletter', label: 'Newsletter' },
];

const TRIGGERS = [
  { value: 'on_load', label: 'On Page Load', icon: Eye },
  { value: 'on_scroll', label: 'On Scroll %', icon: Scroll },
  { value: 'exit_intent', label: 'Exit Intent', icon: LogOut },
  { value: 'time_delay', label: 'Time Delay', icon: Clock },
];

const ANIMATION_STYLES = [
  { value: 'slide_up', label: 'Slide Up' },
  { value: 'slide_down', label: 'Slide Down' },
  { value: 'fade', label: 'Fade In' },
  { value: 'scale', label: 'Scale' },
  { value: 'bounce', label: 'Bounce' },
];

const PAGES = [
  { value: 'home', label: 'Homepage' },
  { value: 'deals', label: 'Deals Page' },
  { value: 'coupons', label: 'Coupons Page' },
  { value: 'blog', label: 'Blog Page' },
  { value: 'stores', label: 'Stores Page' },
  { value: 'categories', label: 'Categories' },
];

const DEVICES = [
  { value: 'mobile', label: 'Mobile', icon: Smartphone },
  { value: 'tablet', label: 'Tablet', icon: Tablet },
  { value: 'desktop', label: 'Desktop', icon: Monitor },
];

const FREQUENCIES = [
  { value: 'once_per_session', label: 'Once per session' },
  { value: 'once_per_day', label: 'Once per day' },
  { value: 'always', label: 'Every visit' },
];

const emptyForm = {
  title: '', description: '', cta_text: '', cta_link: '',
  image_url: '', video_url: '',
  popup_type: 'entry', trigger: 'on_load',
  scroll_percent: 50, delay_seconds: 5,
  target_pages: [], target_devices: [],
  animation_style: 'scale', is_active: true,
  frequency: 'once_per_session',
  start_date: '', end_date: '', priority: 0,
};

export default function AdminPopups() {
  const [popups, setPopups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [editingPopup, setEditingPopup] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [uploading, setUploading] = useState(false);
  const [previewPopup, setPreviewPopup] = useState(null);

  const fetchPopups = async () => {
    setLoading(true);
    try {
      const data = await getAllPopups();
      setPopups(data);
    } catch { toast.error('Failed to load popups'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPopups(); }, []);

  const openCreate = () => {
    setEditingPopup(null);
    setForm({ ...emptyForm });
    setShowDialog(true);
  };

  const openEdit = (popup) => {
    setEditingPopup(popup);
    setForm({
      ...emptyForm,
      ...popup,
      start_date: popup.start_date ? popup.start_date.slice(0, 16) : '',
      end_date: popup.end_date ? popup.end_date.slice(0, 16) : '',
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        start_date: form.start_date ? new Date(form.start_date).toISOString() : null,
        end_date: form.end_date ? new Date(form.end_date).toISOString() : null,
        priority: parseInt(form.priority) || 0,
        scroll_percent: parseInt(form.scroll_percent) || 50,
        delay_seconds: parseInt(form.delay_seconds) || 5,
      };
      delete payload.id;
      delete payload.views;
      delete payload.clicks;
      delete payload.created_at;

      if (editingPopup) {
        await updatePopup(editingPopup.id, payload);
        toast.success('Popup updated');
      } else {
        await createPopup(payload);
        toast.success('Popup created');
      }
      setShowDialog(false);
      fetchPopups();
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (popup) => {
    if (!window.confirm(`Delete "${popup.title}"?`)) return;
    try {
      await deletePopup(popup.id);
      toast.success('Popup deleted');
      fetchPopups();
    } catch { toast.error('Delete failed'); }
  };

  const toggleActive = async (popup) => {
    try {
      await updatePopup(popup.id, { is_active: !popup.is_active });
      toast.success(popup.is_active ? 'Popup disabled' : 'Popup enabled');
      fetchPopups();
    } catch { toast.error('Update failed'); }
  };

  const handleImageUpload = async (e, field) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadImage(file);
      setForm(f => ({ ...f, [field]: res.url || res.secure_url }));
      toast.success('Uploaded');
    } catch { toast.error('Upload failed'); }
    finally { setUploading(false); }
  };

  const toggleArrayField = (field, value) => {
    setForm(f => ({
      ...f,
      [field]: f[field].includes(value)
        ? f[field].filter(v => v !== value)
        : [...f[field], value]
    }));
  };

  const triggerIcon = (trigger) => {
    const found = TRIGGERS.find(t => t.value === trigger);
    return found ? found.icon : Eye;
  };

  return (
    <motion.div key="popups" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 sm:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Popup Manager</h2>
          <p className="text-gray-500 text-sm mt-1">{popups.length} popup{popups.length !== 1 ? 's' : ''} configured</p>
        </div>
        <Button onClick={openCreate} className="bg-[#ee922c] hover:bg-[#d9811f] rounded-xl" data-testid="create-popup-btn">
          <Plus className="w-4 h-4 mr-2" /> New Popup
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[#ee922c]" /></div>
      ) : popups.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Megaphone className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="font-semibold text-lg">No popups yet</p>
          <p className="text-sm mt-1">Create your first popup to engage visitors</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {popups.map((popup) => {
            const TrigIcon = triggerIcon(popup.trigger);
            const ctr = popup.views > 0 ? ((popup.clicks / popup.views) * 100).toFixed(1) : '0.0';
            return (
              <div key={popup.id} className={`bg-gray-50 rounded-2xl p-5 border transition-all ${popup.is_active ? 'border-green-200' : 'border-gray-200 opacity-60'}`} data-testid={`popup-item-${popup.id}`}>
                <div className="flex items-start gap-4">
                  {/* Preview thumbnail */}
                  {popup.image_url ? (
                    <img src={popup.image_url} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-orange-100 to-green-100 flex items-center justify-center flex-shrink-0">
                      <Megaphone className="w-6 h-6 text-[#ee922c]" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-gray-900 truncate">{popup.title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${popup.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                        {popup.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                        {POPUP_TYPES.find(t => t.value === popup.popup_type)?.label || popup.popup_type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 truncate mt-0.5">{popup.description || 'No description'}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><TrigIcon className="w-3.5 h-3.5" /> {TRIGGERS.find(t => t.value === popup.trigger)?.label}</span>
                      <span className="flex items-center gap-1"><BarChart3 className="w-3.5 h-3.5" /> {popup.views || 0} views</span>
                      <span className="flex items-center gap-1"><MousePointerClick className="w-3.5 h-3.5" /> {popup.clicks || 0} clicks ({ctr}%)</span>
                      {popup.target_pages?.length > 0 && (
                        <span className="text-gray-400">{popup.target_pages.join(', ')}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => setPreviewPopup(popup)} title="Preview" data-testid={`preview-popup-${popup.id}`}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => toggleActive(popup)} title={popup.is_active ? 'Disable' : 'Enable'}>
                      {popup.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(popup)} data-testid={`edit-popup-${popup.id}`}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(popup)} className="text-red-500 hover:text-red-700">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPopup ? 'Edit Popup' : 'Create Popup'}</DialogTitle>
            <DialogDescription>Configure your popup settings, targeting, and content.</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Content */}
            <div className="space-y-4">
              <h4 className="font-bold text-sm text-gray-700 uppercase tracking-wider">Content</h4>
              <div className="grid gap-3">
                <div>
                  <Label>Title *</Label>
                  <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Get 20% OFF!" data-testid="popup-title-input" />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Don't miss this exclusive deal..." rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>CTA Button Text</Label>
                    <Input value={form.cta_text} onChange={e => setForm(f => ({ ...f, cta_text: e.target.value }))} placeholder="Grab Deal" />
                  </div>
                  <div>
                    <Label>CTA Link</Label>
                    <Input value={form.cta_link} onChange={e => setForm(f => ({ ...f, cta_link: e.target.value }))} placeholder="https://..." />
                  </div>
                </div>
              </div>
            </div>

            {/* Media */}
            <div className="space-y-4">
              <h4 className="font-bold text-sm text-gray-700 uppercase tracking-wider">Media</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Image</Label>
                  <div className="flex gap-2">
                    <Input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="Image URL or upload" className="flex-1" />
                    <label className="px-3 py-2 bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200 text-sm font-medium flex-shrink-0 flex items-center">
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Upload'}
                      <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, 'image_url')} />
                    </label>
                  </div>
                  {form.image_url && <img src={form.image_url} alt="Preview" className="mt-2 h-20 rounded-lg object-cover" />}
                </div>
                <div>
                  <Label>Video URL</Label>
                  <Input value={form.video_url} onChange={e => setForm(f => ({ ...f, video_url: e.target.value }))} placeholder="Video URL (optional)" />
                </div>
              </div>
            </div>

            {/* Trigger & Type */}
            <div className="space-y-4">
              <h4 className="font-bold text-sm text-gray-700 uppercase tracking-wider">Trigger & Type</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Popup Type</Label>
                  <select value={form.popup_type} onChange={e => setForm(f => ({ ...f, popup_type: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm bg-white">
                    {POPUP_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Trigger</Label>
                  <select value={form.trigger} onChange={e => setForm(f => ({ ...f, trigger: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm bg-white" data-testid="popup-trigger-select">
                    {TRIGGERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {(form.trigger === 'on_scroll') && (
                  <div>
                    <Label>Scroll % Threshold</Label>
                    <Input type="number" min={5} max={100} value={form.scroll_percent} onChange={e => setForm(f => ({ ...f, scroll_percent: e.target.value }))} />
                  </div>
                )}
                {(form.trigger === 'on_load' || form.trigger === 'time_delay') && (
                  <div>
                    <Label>Delay (seconds)</Label>
                    <Input type="number" min={0} max={120} value={form.delay_seconds} onChange={e => setForm(f => ({ ...f, delay_seconds: e.target.value }))} />
                  </div>
                )}
                <div>
                  <Label>Animation</Label>
                  <select value={form.animation_style} onChange={e => setForm(f => ({ ...f, animation_style: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm bg-white">
                    {ANIMATION_STYLES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Frequency</Label>
                  <select value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm bg-white">
                    {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Targeting */}
            <div className="space-y-4">
              <h4 className="font-bold text-sm text-gray-700 uppercase tracking-wider">Targeting</h4>
              <div>
                <Label className="mb-2 block">Target Pages (empty = all pages)</Label>
                <div className="flex flex-wrap gap-2">
                  {PAGES.map(page => (
                    <button
                      key={page.value}
                      type="button"
                      onClick={() => toggleArrayField('target_pages', page.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        form.target_pages.includes(page.value)
                          ? 'bg-[#ee922c] text-white border-[#ee922c]'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-[#ee922c]'
                      }`}
                    >
                      {page.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="mb-2 block">Target Devices (empty = all devices)</Label>
                <div className="flex gap-2">
                  {DEVICES.map(device => (
                    <button
                      key={device.value}
                      type="button"
                      onClick={() => toggleArrayField('target_devices', device.value)}
                      className={`px-4 py-2 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all ${
                        form.target_devices.includes(device.value)
                          ? 'bg-[#ee922c] text-white border-[#ee922c]'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-[#ee922c]'
                      }`}
                    >
                      <device.icon className="w-4 h-4" /> {device.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Scheduling */}
            <div className="space-y-4">
              <h4 className="font-bold text-sm text-gray-700 uppercase tracking-wider">Scheduling</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Start Date</Label>
                  <Input type="datetime-local" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input type="datetime-local" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Priority (higher = shown first)</Label>
                  <Input type="number" min={0} max={100} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" />
                    <span className="text-sm font-medium">Active</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-[#ee922c] hover:bg-[#d9811f]" data-testid="save-popup-btn">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {editingPopup ? 'Update Popup' : 'Create Popup'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewPopup && (
          <motion.div
            className="fixed inset-0 z-[9000] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setPreviewPopup(null)} />
            <motion.div
              className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden"
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.7, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
              <button onClick={() => setPreviewPopup(null)} className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
              {previewPopup.video_url ? (
                <div className="w-full aspect-video bg-gray-100">
                  <video src={previewPopup.video_url} autoPlay muted loop playsInline className="w-full h-full object-cover" />
                </div>
              ) : previewPopup.image_url ? (
                <div className="w-full aspect-[16/10] bg-gray-100">
                  <img src={previewPopup.image_url} alt="" className="w-full h-full object-cover" />
                </div>
              ) : null}
              <div className="p-6">
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium mb-2 inline-block">Preview</span>
                {previewPopup.title && <h3 className="font-display font-black text-xl text-gray-900 mb-2">{previewPopup.title}</h3>}
                {previewPopup.description && <p className="text-gray-500 text-sm mb-4">{previewPopup.description}</p>}
                {previewPopup.cta_text && (
                  <button className="w-full py-3 px-6 bg-[#ee922c] text-white font-bold rounded-xl text-sm">
                    {previewPopup.cta_text}
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

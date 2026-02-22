import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getGig, updateGig, type Gig } from '../api/gigs';

const CATEGORIES = ['Design', 'Development', 'Writing', 'Marketing', 'Other'];

export default function EditGig() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [gig, setGig] = useState<Gig | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [payRate, setPayRate] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    getGig(id).then((res) => {
      if (res.success && res.data) {
        setGig(res.data);
        setTitle(res.data.title);
        setDescription(res.data.description);
        setCategory(res.data.category);
        setPayRate(String(res.data.payRate));
        setCurrency(res.data.currency || 'USD');
      }
    });
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setError('');
    const rate = Number(payRate);
    if (!title.trim() || !description.trim() || !category || Number.isNaN(rate) || rate < 0) {
      setError('Please fill all fields and use a valid pay rate.');
      return;
    }
    setLoading(true);
    const res = await updateGig(id, { title: title.trim(), description: description.trim(), category, payRate: rate, currency: currency || undefined });
    setLoading(false);
    if (res.success) {
      navigate(`/gigs/${id}`);
      return;
    }
    setError((res as { error: string }).error || 'Failed to update gig');
  };

  if (!gig) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        <p className="mt-4 text-sm text-slate-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Edit gig</h1>
      <div className="card mt-6 p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Title</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="input-field" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} required rows={5} className="input-field resize-none" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} required className="input-field">
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_5rem]">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Pay rate</label>
            <input type="number" min={0} step={0.01} value={payRate} onChange={(e) => setPayRate(e.target.value)} required className="input-field" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Currency</label>
            <input type="text" value={currency} onChange={(e) => setCurrency(e.target.value)} className="input-field" />
          </div>
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full sm:w-auto">
          {loading ? 'Saving...' : 'Save changes'}
        </button>
      </form>
      </div>
    </div>
  );
}

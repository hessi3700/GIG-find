import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createGig } from '../api/gigs';

const CATEGORIES = ['Design', 'Development', 'Writing', 'Marketing', 'Other'];

export default function CreateGig() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [payRate, setPayRate] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const rate = Number(payRate);
    if (!title.trim() || !description.trim() || !category || Number.isNaN(rate) || rate < 0) {
      setError('Please fill all fields and use a valid pay rate.');
      return;
    }
    setLoading(true);
    const res = await createGig({
      title: title.trim(),
      description: description.trim(),
      category,
      payRate: rate,
      currency: currency || undefined,
    });
    setLoading(false);
    if (res.success && res.data) {
      navigate(`/gigs/${res.data._id}`);
      return;
    }
    setError((res as { error: string }).error || 'Failed to create gig');
  };

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Post a gig</h1>
      <p className="mt-1 text-sm text-slate-600">Describe your project and budget so freelancers can apply.</p>
      <div className="card mt-6 p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="input-field" placeholder="e.g. Logo design for startup" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} required rows={5} className="input-field resize-none" placeholder="What do you need? Include scope and timeline if you can." />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} required className="input-field">
              <option value="">Select category...</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_5rem]">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Pay rate</label>
              <input type="number" min={0} step={0.01} value={payRate} onChange={(e) => setPayRate(e.target.value)} required className="input-field" placeholder="0" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Currency</label>
              <input type="text" value={currency} onChange={(e) => setCurrency(e.target.value)} className="input-field" />
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full sm:w-auto">
            {loading ? 'Creating...' : 'Create gig'}
          </button>
        </form>
      </div>
    </div>
  );
}

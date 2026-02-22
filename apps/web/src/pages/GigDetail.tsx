import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getGig, type Gig } from '../api/gigs';
import { applyToGig } from '../api/applications';
import { useAuth } from '../context/AuthContext';

export default function GigDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [gig, setGig] = useState<Gig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [applyMessage, setApplyMessage] = useState('');
  const [applyLoading, setApplyLoading] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);

  useEffect(() => {
    if (!id) return;
    getGig(id).then((res) => {
      if (res.success && res.data) {
        setGig(res.data);
      } else {
        setError((res as { error: string }).error || 'Gig not found');
      }
      setLoading(false);
    });
  }, [id]);

  const createdById = gig && typeof gig.createdBy === 'object' && gig.createdBy !== null ? (gig.createdBy as { _id?: string })._id : null;
  const isOwnerByCompare = createdById && user && createdById === user.id;

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !applyMessage.trim()) return;
    setApplyLoading(true);
    const res = await applyToGig(id, applyMessage.trim());
    setApplyLoading(false);
    if (res.success) {
      setApplySuccess(true);
      setApplyMessage('');
    } else {
      setError((res as { error: string }).error);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        <p className="mt-4 text-sm text-slate-500">Loading...</p>
      </div>
    );
  }
  if (error && !gig) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
        {error}
      </div>
    );
  }
  if (!gig) return null;

  const owner = gig.createdBy as { _id?: string; name?: string; email?: string };
  const ownerId = owner?._id;

  return (
    <div className="max-w-2xl">
      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
          <span className="inline-block rounded-md bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700">
            {gig.category}
          </span>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{gig.title}</h1>
          <p className="mt-1 text-lg font-semibold text-primary-600">
            {gig.payRate} {gig.currency || 'USD'}
          </p>
        </div>
        <div className="p-6">
          <p className="whitespace-pre-wrap text-slate-700 leading-relaxed">{gig.description}</p>
          <p className="mt-6 text-sm text-slate-500">
            Posted by <span className="font-medium text-slate-700">{owner?.name ?? 'Unknown'}</span>
            {user?.id === ownerId && (
              <>
                {' · '}
                <Link to={`/gigs/${gig._id}/edit`} className="font-medium text-primary-600 hover:text-primary-700 hover:underline">
                  Edit gig
                </Link>
              </>
            )}
          </p>
        </div>
      </div>

      {user && user.id !== ownerId && gig.status === 'open' && (
        <div className="card mt-6 p-6">
          <h2 className="text-lg font-semibold text-slate-900">Apply for this gig</h2>
          {applySuccess ? (
            <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
              Application sent. The poster will get in touch if they&apos;re interested.
            </div>
          ) : (
            <form onSubmit={handleApply} className="mt-4 space-y-4">
              <div>
                <label htmlFor="apply-msg" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Your message
                </label>
                <textarea
                  id="apply-msg"
                  value={applyMessage}
                  onChange={(e) => setApplyMessage(e.target.value)}
                  placeholder="Introduce yourself and why you're a good fit..."
                  rows={4}
                  required
                  className="input-field resize-none"
                />
              </div>
              <button type="submit" disabled={applyLoading} className="btn-primary">
                {applyLoading ? 'Sending...' : 'Send application'}
              </button>
            </form>
          )}
        </div>
      )}

      {!user && gig.status === 'open' && (
        <div className="card mt-6 p-6 text-center">
          <p className="text-slate-600">
            <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700 hover:underline">
              Log in
            </Link>{' '}
            to apply for this gig.
          </p>
        </div>
      )}

      {isOwnerByCompare && (
        <div className="mt-6">
          <Link
            to="/dashboard"
            className="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-700 hover:underline"
          >
            View applications in Dashboard →
          </Link>
        </div>
      )}
    </div>
  );
}

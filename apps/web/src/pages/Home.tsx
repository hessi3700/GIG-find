import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listGigs, type Gig, type ListGigsParams } from '../api/gigs';

const CATEGORIES = ['Design', 'Development', 'Writing', 'Marketing', 'Other'];

export default function Home() {
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<ListGigsParams>({
    search: '',
    category: '',
    minPay: undefined,
    maxPay: undefined,
    page: 1,
    limit: 12,
  });

  useEffect(() => {
    setLoading(true);
    listGigs({ ...filters, page }).then((res) => {
      if (res.success && res.data) {
        setGigs(res.data.gigs);
        setTotal(res.data.total);
        setTotalPages(res.data.totalPages);
      } else {
        setError((res as { error: string }).error || 'Failed to load gigs');
      }
      setLoading(false);
    });
  }, [page, filters.search, filters.category, filters.minPay, filters.maxPay]);

  const applyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setFilters((f) => ({ ...f, page: 1 }));
  };

  return (
    <div>
      <section className="mb-10 text-center sm:mb-14">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Find your next gig
        </h1>
        <p className="mt-2 text-lg text-slate-600">
          Browse opportunities. Post projects. Get work done.
        </p>
      </section>

      <div className="card mb-8 p-5 sm:p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
          Search & filter
        </h2>
        <form onSubmit={applyFilters} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="search" className="mb-1.5 block text-sm font-medium text-slate-700">
                Search
              </label>
              <input
                id="search"
                type="text"
                placeholder="Title or description"
                value={filters.search ?? ''}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value || undefined }))}
                className="input-field"
              />
            </div>
            <div>
              <label htmlFor="category" className="mb-1.5 block text-sm font-medium text-slate-700">
                Category
              </label>
              <select
                id="category"
                value={filters.category ?? ''}
                onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value || undefined }))}
                className="input-field"
              >
                <option value="">All categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="minPay" className="mb-1.5 block text-sm font-medium text-slate-700">
                Min pay
              </label>
              <input
                id="minPay"
                type="number"
                min={0}
                placeholder="0"
                value={filters.minPay ?? ''}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, minPay: e.target.value ? Number(e.target.value) : undefined }))
                }
                className="input-field"
              />
            </div>
            <div>
              <label htmlFor="maxPay" className="mb-1.5 block text-sm font-medium text-slate-700">
                Max pay
              </label>
              <input
                id="maxPay"
                type="number"
                min={0}
                placeholder="Any"
                value={filters.maxPay ?? ''}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, maxPay: e.target.value ? Number(e.target.value) : undefined }))
                }
                className="input-field"
              />
            </div>
          </div>
          <button type="submit" className="btn-primary">
            Apply filters
          </button>
        </form>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          <p className="mt-4 text-sm text-slate-500">Loading gigs...</p>
        </div>
      ) : gigs.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white py-16 text-center shadow-card">
          <p className="text-slate-500">No gigs found. Try adjusting filters or check back later.</p>
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm font-medium text-slate-600">
            {total} gig{total !== 1 ? 's' : ''} found
          </p>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {gigs.map((gig) => (
              <Link
                key={gig._id}
                to={`/gigs/${gig._id}`}
                className="card-hover group block overflow-hidden rounded-xl p-5"
              >
                <span className="inline-block rounded-md bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700">
                  {gig.category}
                </span>
                <h2 className="mt-2 font-semibold text-slate-900 line-clamp-2 group-hover:text-primary-600">
                  {gig.title}
                </h2>
                <p className="mt-1 text-sm font-medium text-primary-600">
                  {gig.payRate} {gig.currency || 'USD'}
                </p>
                <p className="mt-2 text-sm text-slate-600 line-clamp-2">{gig.description}</p>
                <p className="mt-3 text-xs text-slate-400">
                  by {(gig.createdBy as { name?: string })?.name ?? 'Unknown'}
                </p>
              </Link>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="btn-secondary disabled:opacity-50"
              >
                Previous
              </button>
              <span className="min-w-[6rem] text-center text-sm font-medium text-slate-600">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="btn-secondary disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

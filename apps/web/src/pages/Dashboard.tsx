import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMyGigs, type Gig } from '../api/gigs';
import { getMyApplications, getGigApplications, updateApplicationStatus, type Application } from '../api/applications';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  useAuth();
  const [myGigs, setMyGigs] = useState<Gig[]>([]);
  const [myApplications, setMyApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGigId, setSelectedGigId] = useState<string | null>(null);
  const [applicationsForGig, setApplicationsForGig] = useState<Application[]>([]);

  useEffect(() => {
    getMyGigs().then((res) => {
      if (res.success && res.data) setMyGigs(res.data);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    getMyApplications().then((res) => {
      if (res.success && res.data) setMyApplications(res.data);
    });
  }, []);

  useEffect(() => {
    if (!selectedGigId) {
      setApplicationsForGig([]);
      return;
    }
    getGigApplications(selectedGigId).then((res) => {
      if (res.success && res.data) setApplicationsForGig(res.data);
    });
  }, [selectedGigId]);

  const handleStatusChange = async (appId: string, status: 'accepted' | 'rejected') => {
    const res = await updateApplicationStatus(appId, status);
    if (res.success && selectedGigId) {
      getGigApplications(selectedGigId).then((r) => {
        if (r.success && r.data) setApplicationsForGig(r.data);
      });
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
        <Link to="/gigs/new" className="btn-primary w-fit">
          Post a gig
        </Link>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          <p className="mt-4 text-sm text-slate-500">Loading...</p>
        </div>
      ) : (
        <div className="mt-8 space-y-10">
          <section className="card p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">My gigs</h2>
            {myGigs.length === 0 ? (
              <p className="text-slate-500">You haven&apos;t posted any gigs yet.</p>
            ) : (
              <ul className="space-y-3">
                {myGigs.map((gig) => (
                  <li key={gig._id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/50 p-4">
                    <div>
                      <Link to={`/gigs/${gig._id}`} className="font-medium text-primary-600 hover:text-primary-700 hover:underline">
                        {gig.title}
                      </Link>
                      <span className="ml-2 text-xs font-medium text-slate-500">{gig.status}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedGigId(selectedGigId === gig._id ? null : gig._id)}
                        className="text-sm font-medium text-primary-600 hover:underline"
                      >
                        {selectedGigId === gig._id ? 'Hide applications' : 'View applications'}
                      </button>
                      <Link to={`/gigs/${gig._id}/edit`} className="text-sm font-medium text-slate-600 hover:underline">
                        Edit
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {selectedGigId && (
              <div className="mt-6 border-t border-slate-100 pt-6">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Applications</h3>
                {applicationsForGig.length === 0 ? (
                  <p className="text-sm text-slate-500">No applications yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {applicationsForGig.map((app) => (
                      <li key={app._id} className="rounded-lg border border-slate-100 bg-white p-4 text-sm">
                        <p className="font-medium text-slate-900">
                          {(app.applicant as { name?: string })?.name ?? 'Applicant'}
                        </p>
                        <p className="mt-1 text-slate-600">{app.message}</p>
                        <p className="mt-1 text-xs text-slate-400">Status: {app.status}</p>
                        {app.status === 'pending' && (
                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleStatusChange(app._id, 'accepted')}
                              className="rounded-md bg-green-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-700"
                            >
                              Accept
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStatusChange(app._id, 'rejected')}
                              className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>

          <section className="card p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">My applications</h2>
            {myApplications.length === 0 ? (
              <p className="text-slate-500">You haven&apos;t applied to any gigs yet.</p>
            ) : (
              <ul className="space-y-3">
                {myApplications.map((app) => {
                  const gig = app.gig as { _id?: string; title?: string };
                  return (
                    <li key={app._id} className="flex items-center justify-between gap-4 rounded-lg border border-slate-100 bg-slate-50/50 p-4">
                      <Link to={gig?._id ? `/gigs/${gig._id}` : '#'} className="font-medium text-primary-600 hover:text-primary-700 hover:underline">
                        {gig?.title ?? 'Gig'}
                      </Link>
                      <span className="text-sm font-medium text-slate-500">{app.status}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

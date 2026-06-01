import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeft, Pencil, Trash2, MapPin, User, CalendarDays } from "lucide-react";
import Footer from "@/components/ui/Footer";

const ManageTrips = () => {
  const { toast } = useToast();
  const [trips, setTrips] = useState<any[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const API_BASE = import.meta.env.VITE_API_URL;

  useEffect(() => {
    setLoadingTrips(true);
    fetch(`${API_BASE}/trips`)
      .then((res) => res.json())
      .then((data) => {
        setTrips(data.map((trip: any) => ({ ...trip, created_by: trip.created_by || "N/A" })));
      })
      .catch((err) => console.error("Failed to load trips:", err))
      .finally(() => setLoadingTrips(false));
  }, [location.key]);

  const deleteTrip = async (tripId: string) => {
    const confirmed = window.confirm("Delete this trip template?");
    if (!confirmed) return;
    try {
      const res = await fetch(`${API_BASE}/trips/${tripId}`, { method: "DELETE" });
      if (res.ok) {
        setTrips(trips.filter((t) => t.trip_id !== tripId));
        toast({ title: "Deleted", description: "Trip removed.", className: "bg-green-500 text-white" });
      } else {
        toast({ title: "Error", description: "Failed to delete.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    }
  };

  const canEdit = (trip: any) =>
    trip.created_by === user?.displayName || trip.created_by === user?.email;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <header style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-full transition-all"
            style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--amber)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div className="h-5 w-px" style={{ background: 'var(--border)' }} />
          <h1 className="font-display text-xl font-semibold" style={{ color: 'var(--cream)' }}>
            Manage Trip Templates
          </h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 flex-1 w-full">
        {loadingTrips ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-24 rounded-2xl loading-skeleton" />
            ))}
          </div>
        ) : trips.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-24 fade-up">
            <MapPin className="h-12 w-12" style={{ color: 'var(--text-muted)' }} />
            <p className="font-display text-2xl" style={{ color: 'var(--cream)' }}>No trips yet</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Create your first trip template to get started.</p>
            <button
              onClick={() => navigate("/create-trip")}
              className="mt-2 px-5 py-2.5 rounded-full text-sm font-semibold"
              style={{ background: 'var(--amber)', color: '#111' }}
            >
              + Create Trip
            </button>
          </div>
        ) : (
          <div className="space-y-3 fade-up">
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {trips.length} trip template{trips.length !== 1 ? 's' : ''}
              </p>
              <button
                onClick={() => navigate("/create-trip")}
                className="px-4 py-2 rounded-full text-xs font-semibold"
                style={{ background: 'var(--amber)', color: '#111' }}
              >
                + New Trip
              </button>
            </div>

            {trips.map((trip, i) => (
              <div
                key={trip.trip_id}
                className="rounded-2xl p-5 transition-all duration-200 fade-up"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  animationDelay: `${i * 0.05}s`,
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--bg-elevated)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono-custom text-xs" style={{ color: 'var(--amber)' }}>
                        {trip.trip_id}
                      </span>
                    </div>
                    <h3 className="font-display text-lg font-semibold truncate" style={{ color: 'var(--cream)' }}>
                      {trip.trip_name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                      {trip.location && (
                        <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                          <MapPin className="h-3 w-3" /> {trip.location}
                        </span>
                      )}
                      {trip.start_date && (
                        <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                          <CalendarDays className="h-3 w-3" />
                          {new Date(trip.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                        <User className="h-3 w-3" /> {trip.created_by}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {canEdit(trip) ? (
                      <>
                        <button
                          onClick={() => navigate(`/edit-trip/${trip.trip_id}`)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                          style={{ background: 'var(--bg-elevated)', color: 'var(--amber)', border: '1px solid var(--border)' }}
                          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--amber)')}
                          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                        >
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </button>
                        <button
                          onClick={() => deleteTrip(trip.trip_id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                          style={{ background: 'var(--bg-elevated)', color: 'var(--red-soft)', border: '1px solid var(--border)' }}
                          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--red-soft)')}
                          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                      </>
                    ) : (
                      <span className="text-xs italic px-3" style={{ color: 'var(--text-muted)' }}>Read-only</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default ManageTrips;

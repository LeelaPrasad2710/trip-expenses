import { Button } from "@/components/ui/button";
import { PlusCircle, DollarSign, Map, LogIn, LogOut, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { signInWithPopup, signOut } from "firebase/auth";
import { auth, provider } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import Footer from "@/components/ui/Footer";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleLogin = async () => {
    try { await signInWithPopup(auth, provider); }
    catch (err) { console.error("Login failed:", err); }
  };

  const handleLogout = async () => {
    try { await signOut(auth); }
    catch (err) { console.error("Logout failed:", err); }
  };

  const cards = [
    {
      icon: <PlusCircle className="h-6 w-6" />,
      label: "CREATE",
      title: "Create Blueprint",
      desc: "Set up a trip with budget, members, locations & expense categories.",
      action: () => navigate("/create-trip"),
      cta: "Start Planning",
      accent: "var(--amber)",
      num: "01",
    },
    {
      icon: <DollarSign className="h-6 w-6" />,
      label: "TRACK",
      title: "View/Track Trip Itinerary",
      desc: "Log spend, split bills, settle up, export reports — all in one place.",
      action: () => navigate("/track-expenses"),
      cta: "Open Tracker",
      accent: "var(--sage)",
      num: "02",
    },
    {
      icon: <Map className="h-6 w-6" />,
      label: "MANAGE",
      title: "View/Edit Blueprint",
      desc: "View, edit or delete your saved trip configurations.",
      action: () => navigate("/manage-trips"),
      cta: "Manage Trips",
      accent: "var(--terracotta)",
      num: "03",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      {/* Top nav */}
      <header style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--amber)', color: '#111' }}>
              <span className="font-display font-bold text-sm">T</span>
            </div>
            <span className="font-display font-semibold tracking-wide" style={{ color: 'var(--cream)' }}>
              Trip Expenses
            </span>
          </div>

          {user ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                <User className="h-3.5 w-3.5" style={{ color: 'var(--amber)' }} />
                <span>{user.displayName || user.email}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full transition-all"
                style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--red-soft)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                <LogOut className="h-3.5 w-3.5" /> Sign out
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogin}
              className="flex items-center gap-2 text-sm px-4 py-2 rounded-full font-medium transition-all"
              style={{ background: 'var(--amber)', color: '#111' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--amber-light)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--amber)')}
            >
              <LogIn className="h-4 w-4" /> Sign in with Google
            </button>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-10 fade-up">
        <div className="mb-2 flex items-center gap-2">
          <div className="h-px w-8" style={{ background: 'var(--amber)' }} />
          <span className="text-xs uppercase tracking-widest font-mono-custom" style={{ color: 'var(--amber)' }}>
            Travel Finance Manager
          </span>
        </div>
        <h1 className="font-display text-5xl md:text-6xl font-bold leading-tight mb-4"
          style={{ color: 'var(--cream)' }}>
          Every journey,<br />
          <span style={{ color: 'var(--amber)' }}>tracked beautifully.</span>
        </h1>
        <p className="text-lg max-w-xl leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Plan trips, split expenses, settle debts — without the spreadsheet chaos.
        </p>
      </section>

      {/* Cards */}
      <main className="max-w-6xl mx-auto px-6 pb-16 flex-1">
        {user ? (
          <div className="grid md:grid-cols-3 gap-5 mt-4">
            {cards.map((card, i) => (
              <div
                key={card.num}
                className="group relative rounded-2xl p-6 cursor-pointer transition-all duration-300 fade-up"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  animationDelay: `${i * 0.08}s`,
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = card.accent;
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                }}
              >
                {/* Number */}
                <div className="absolute top-5 right-6 font-mono-custom text-5xl font-bold select-none"
                  style={{ color: 'var(--bg-elevated)', lineHeight: 1 }}>
                  {card.num}
                </div>

                {/* Icon */}
                <div className="h-11 w-11 rounded-xl flex items-center justify-center mb-5"
                  style={{ background: `${card.accent}20`, color: card.accent }}>
                  {card.icon}
                </div>

                {/* Label */}
                <div className="chip chip-muted mb-3">{card.label}</div>

                {/* Title */}
                <h2 className="font-display text-xl font-semibold mb-2" style={{ color: 'var(--cream)' }}>
                  {card.title}
                </h2>
                <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>
                  {card.desc}
                </p>

                {/* CTA */}
                <button
                  onClick={card.action}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold tracking-wide transition-all"
                  style={{ background: card.accent, color: '#111' }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                >
                  {card.cta} →
                </button>
              </div>
            ))}
          </div>
        ) : (
          /* Logged out state */
          <div className="mt-16 flex flex-col items-center gap-6 fade-up">
            <div className="h-20 w-20 rounded-full flex items-center justify-center"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <LogIn className="h-8 w-8" style={{ color: 'var(--amber)' }} />
            </div>
            <div className="text-center">
              <p className="font-display text-2xl mb-2" style={{ color: 'var(--cream)' }}>Sign in to continue</p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Your trip data is waiting for you.
              </p>
            </div>
            <button
              onClick={handleLogin}
              className="flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm transition-all pulse-amber"
              style={{ background: 'var(--amber)', color: '#111' }}
            >
              <LogIn className="h-4 w-4" /> Sign in with Google
            </button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Index;

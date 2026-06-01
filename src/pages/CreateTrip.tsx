import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, X, ArrowLeft, Save } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";

const Field = ({ label, required = false, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
  <div>
    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
      {label} {required && <span style={{ color: 'var(--amber)' }}>*</span>}
    </label>
    {children}
  </div>
);

const StyledInput = ({ ...props }) => (
  <input
    {...props}
    className={`w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all focus:ring-1 ${props.className || ''}`}
    style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      color: 'var(--text-primary)',
      // @ts-ignore
      '--tw-ring-color': 'var(--amber)',
    }}
    onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--amber)'; }}
    onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
  />
);

const CreateTrip = () => {
  const { tripId: paramTripId } = useParams();
  const isEditMode = !!paramTripId;
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const API_BASE = import.meta.env.VITE_API_URL;

  const [tripId, setTripId] = useState("");
  const [tripName, setTripName] = useState("");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [budget, setBudget] = useState("");
  const [moneyHandler, setMoneyHandler] = useState("");
  const [location, setLocation] = useState("");
  const [expenseTypes, setExpenseTypes] = useState<string[]>([""]);
  const [expenseTypeOptions, setExpenseTypeOptions] = useState<Record<string, string[]>>({});
  const [members, setMembers] = useState<string[]>([""]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchTrip = async () => {
      if (isEditMode && paramTripId) {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/trips/${paramTripId}`);
        const data = await res.json();
        setTripId(data.trip_id); setTripName(data.trip_name);
        setStartDate(new Date(data.start_date)); setEndDate(new Date(data.end_date));
        setBudget(data.budget.toString()); setMoneyHandler(data.money_handler);
        setLocation(data.location); setExpenseTypes(data.expense_types || [""]);
        setExpenseTypeOptions(data.expense_type_options || {}); setMembers(data.members || [""]);
      } else {
        const res = await fetch(`${API_BASE}/trips`);
        const trips = await res.json();
        const lastId = trips.map((t: any) => t.trip_id).filter((id: string) => /^TRIP-\d{3}$/.test(id))
          .map((id: string) => parseInt(id.split("-")[1], 10)).sort((a: number, b: number) => b - a)[0] || 0;
        setTripId(`TRIP-${String(lastId + 1).padStart(3, "0")}`);
      }
    };
    fetchTrip();
  }, [isEditMode, paramTripId]);

  const addExpenseType = () => setExpenseTypes([...expenseTypes, ""]);
  const removeExpenseType = (i: number) => {
    if (expenseTypes.length > 1) {
      const removed = expenseTypes[i];
      setExpenseTypes(expenseTypes.filter((_, idx) => idx !== i));
      if (removed) { const n = { ...expenseTypeOptions }; delete n[removed]; setExpenseTypeOptions(n); }
    }
  };
  const updateExpenseType = (i: number, v: string) => {
    const old = expenseTypes[i]; const updated = [...expenseTypes]; updated[i] = v; setExpenseTypes(updated);
    if (old && old !== v && expenseTypeOptions[old]) {
      const n = { ...expenseTypeOptions }; n[v] = n[old]; delete n[old]; setExpenseTypeOptions(n);
    }
  };
  const addExpenseTypeOption = (t: string) => setExpenseTypeOptions(p => ({ ...p, [t]: [...(p[t] || []), ""] }));
  const removeExpenseTypeOption = (t: string, i: number) => setExpenseTypeOptions(p => ({ ...p, [t]: p[t]?.filter((_, idx) => idx !== i) || [] }));
  const updateExpenseTypeOption = (t: string, i: number, v: string) => setExpenseTypeOptions(p => ({ ...p, [t]: p[t]?.map((o, idx) => idx === i ? v : o) || [] }));
  const addMember = () => setMembers([...members, ""]);
  const removeMember = (i: number) => { if (members.length > 1) setMembers(members.filter((_, idx) => idx !== i)); };
  const updateMember = (i: number, v: string) => { const u = [...members]; u[i] = v; setMembers(u); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tripName || !startDate || !endDate || !budget || !moneyHandler || !location) {
      return toast({ title: "Required fields missing", description: "Please fill all fields marked *", variant: "destructive" });
    }
    setIsSubmitting(true);
    const payload = {
      trip_id: tripId, trip_name: tripName,
      start_date: startDate.toISOString().split("T")[0], end_date: endDate.toISOString().split("T")[0],
      budget: parseFloat(budget), money_handler: moneyHandler, location,
      expense_types: expenseTypes.filter(t => t.trim()),
      expense_type_options: Object.fromEntries(Object.entries(expenseTypeOptions).map(([k, v]) => [k, v.filter(x => x.trim())])),
      members: members.filter(m => m.trim()),
      created_by: user?.displayName || user?.email || "unknown",
    };
    try {
      const res = await fetch(`${API_BASE}/trips${isEditMode ? `/${tripId}` : ""}`, {
        method: isEditMode ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast({ title: isEditMode ? "Trip updated ✓" : "Trip created ✓", className: "bg-green-600 text-white" });
        navigate("/", { state: { forceReload: true } });
      } else throw new Error("Failed");
    } catch {
      toast({ title: "Error", description: "Failed to save trip.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const SectionHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div className="mb-4">
      <h3 className="font-display text-base font-semibold" style={{ color: 'var(--cream)' }}>{title}</h3>
      {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
    </div>
  );

  const DateBtn = ({ date, placeholder }: { date?: Date; placeholder: string }) => (
    <button type="button" className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-left transition-all"
      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: date ? 'var(--text-primary)' : 'var(--text-muted)' }}>
      <CalendarIcon className="h-4 w-4 shrink-0" style={{ color: 'var(--amber)' }} />
      {date ? format(date, "PPP") : placeholder}
    </button>
  );

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <header style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center gap-4">
          <button onClick={() => navigate("/")}
            className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-full"
            style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div className="h-5 w-px" style={{ background: 'var(--border)' }} />
          <h1 className="font-display text-xl font-semibold" style={{ color: 'var(--cream)' }}>
            {isEditMode ? "Edit Trip Template" : "Create Trip Template"}
          </h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <form onSubmit={handleSubmit} className="space-y-8 fade-up">

          {/* Section 1: Basic Info */}
          <div className="rounded-2xl p-6 space-y-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <SectionHeader title="Basic Details" subtitle="Trip identity and key info" />

            <Field label="Trip ID">
              <StyledInput value={tripId} readOnly className="font-mono-custom opacity-60 cursor-not-allowed" />
            </Field>

            <Field label="Trip Name" required>
              <StyledInput value={tripName} onChange={(e: any) => setTripName(e.target.value)} placeholder="e.g. Goa Monsoon Trip 2025" required />
            </Field>

            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Start Date" required>
                <Popover>
                  <PopoverTrigger asChild><div><DateBtn date={startDate} placeholder="Pick start date" /></div></PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus className="pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </Field>
              <Field label="End Date" required>
                <Popover>
                  <PopoverTrigger asChild><div><DateBtn date={endDate} placeholder="Pick end date" /></div></PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus className="pointer-events-auto"
                      disabled={(d) => startDate ? d < startDate : false} />
                  </PopoverContent>
                </Popover>
              </Field>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Budget (₹)" required>
                <StyledInput type="number" value={budget} onChange={(e: any) => setBudget(e.target.value)} placeholder="e.g. 25000" required />
              </Field>
              <Field label="Trip Planner" required>
                <StyledInput value={moneyHandler} onChange={(e: any) => setMoneyHandler(e.target.value)} placeholder="Who manages money?" required />
              </Field>
            </div>

            <Field label="Location" required>
              <StyledInput value={location} onChange={(e: any) => setLocation(e.target.value)} placeholder="e.g. Malshej Ghat, Maharashtra" required />
            </Field>
          </div>

          {/* Section 2: Expense Types */}
          <div className="rounded-2xl p-6 space-y-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <SectionHeader title="Expense Categories" subtitle="Define what types of expenses this trip will have" />
            {expenseTypes.map((type, i) => (
              <div key={i} className="space-y-3">
                <div className="flex gap-2">
                  <StyledInput value={type} onChange={(e: any) => updateExpenseType(i, e.target.value)} placeholder={`Category ${i + 1} (e.g. Food, Stay)`} className="flex-1" />
                  {expenseTypes.length > 1 && (
                    <button type="button" onClick={() => removeExpenseType(i)}
                      className="h-10 w-10 rounded-xl flex items-center justify-center transition-all shrink-0"
                      style={{ background: 'rgba(196,82,82,0.1)', color: 'var(--red-soft)', border: '1px solid rgba(196,82,82,0.2)' }}>
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {type.trim() && (
                  <div className="ml-4 pl-4 border-l space-y-2" style={{ borderColor: 'var(--border)' }}>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Sub-options for "{type}":</p>
                    {(expenseTypeOptions[type] || []).map((opt, oi) => (
                      <div key={oi} className="flex gap-2">
                        <StyledInput value={opt} onChange={(e: any) => updateExpenseTypeOption(type, oi, e.target.value)}
                          placeholder={`${type} option ${oi + 1}`} className="flex-1" />
                        <button type="button" onClick={() => removeExpenseTypeOption(type, oi)}
                          className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    <button type="button" onClick={() => addExpenseTypeOption(type)}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
                      style={{ color: 'var(--amber)', background: 'rgba(232,164,74,0.08)', border: '1px solid rgba(232,164,74,0.2)' }}>
                      <Plus className="h-3.5 w-3.5" /> Add option
                    </button>
                  </div>
                )}
              </div>
            ))}
            <button type="button" onClick={addExpenseType}
              className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl"
              style={{ color: 'var(--amber)', background: 'rgba(232,164,74,0.08)', border: '1px solid rgba(232,164,74,0.2)' }}>
              <Plus className="h-4 w-4" /> Add Category
            </button>
          </div>

          {/* Section 3: Members */}
          <div className="rounded-2xl p-6 space-y-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <SectionHeader title="Trip Members" subtitle="Who's coming on this trip?" />
            {members.map((m, i) => (
              <div key={i} className="flex gap-2">
                <StyledInput value={m} onChange={(e: any) => updateMember(i, e.target.value)} placeholder={`Member ${i + 1} name`} className="flex-1" />
                {members.length > 1 && (
                  <button type="button" onClick={() => removeMember(i)}
                    className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(196,82,82,0.1)', color: 'var(--red-soft)', border: '1px solid rgba(196,82,82,0.2)' }}>
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={addMember}
              className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl"
              style={{ color: 'var(--sage)', background: 'rgba(122,158,126,0.08)', border: '1px solid rgba(122,158,126,0.2)' }}>
              <Plus className="h-4 w-4" /> Add Member
            </button>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
            style={{ background: isSubmitting ? 'var(--text-muted)' : 'var(--amber)', color: '#111', cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
          >
            {isSubmitting ? (
              <><Save className="h-4 w-4 animate-spin" /> Saving…</>
            ) : (
              <><Save className="h-4 w-4" /> {isEditMode ? "Update Trip Template" : "Create Trip Template"}</>
            )}
          </button>
        </form>
      </main>
    </div>
  );
};

export default CreateTrip;

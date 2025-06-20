import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CalendarIcon, ArrowLeft,
  Plus, Trash2, Users, UserCheck
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useAuth } from "@/context/AuthContext";
import Footer from "@/components/ui/Footer";
import { useLocation as usePageLocation } from "react-router-dom";

interface TripTemplate {
  tripId: string;
  tripName: string;
  startDate: string;
  endDate: string;
  budget: number;
  moneyHandler: string;
  location: string;
  expenseTypes: string[];
  expenseTypeOptions: Record<string, string[]>;
  members: string[];
  createdAt: string;
}

interface Expense {
  id: string;
  tripId: string;
  tripName: string;
  date: string;
  expenseType: string;
  expenseOption: string;
  description: string;
  location: string;
  amount: number;
  memberAmounts: Record<string, number>;
  createdAt: string;
  createdBy: string;
}

interface TripLog {
  id: string;
  action: string;
  message: string;
  created_by: string;
  timestamp: string;
  split_details: Record<string, number> | null;
}

const TrackExpenses = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const API_BASE = import.meta.env.VITE_API_URL;
  const pageLocation = usePageLocation();
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [showActivityDrawer, setShowActivityDrawer] = useState(false);
  const [activityLogs, setActivityLogs] = useState<TripLog[]>([]);
  const [tripTemplates, setTripTemplates] = useState<TripTemplate[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedTripId, setSelectedTripId] = useState("");
  const [selectedTrip, setSelectedTrip] = useState<TripTemplate | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expenseDate, setExpenseDate] = useState<Date>(new Date());
  const [expenseType, setExpenseType] = useState("");
  const [expenseOption, setExpenseOption] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [amount, setAmount] = useState("");
  const [memberAmounts, setMemberAmounts] = useState<Record<string, number>>({});
  const [selectedMembersForSplit, setSelectedMembersForSplit] = useState<string[]>([]);
  const [showMemberSelection, setShowMemberSelection] = useState(false);
  const [editExpenseId, setEditExpenseId] = useState<string | null>(null);


  const toCamelTrip = (t: any): TripTemplate => ({
    tripId: t.trip_id,
    tripName: t.trip_name,
    startDate: t.start_date,
    endDate: t.end_date,
    budget: parseFloat(t.budget),
    moneyHandler: t.money_handler,
    location: t.location,
    expenseTypes: t.expense_types,
    expenseTypeOptions: t.expense_type_options,
    members: t.members,
    createdAt: t.created_at,
  });

  const getTripStatus = (trip) => {
    const now = new Date();
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    const settled = trip.settled;

    if (settled) return "✅ Settled";
    if (now < start) return "🟡 Planned";
    if (now >= start && now <= end) return "🟢 Active";
    if (now > end) return "🔵 Finished";
  };

  const exportToExcel = () => {
    const flattened = expenses.map((e) => {
      const flattenedEntry: any = {
        id: e.id,
        tripId: e.tripId,
        tripName: e.tripName,
        date: e.date,
        expenseType: e.expenseType,
        expenseOption: e.expenseOption,
        description: e.description,
        location: e.location,
        amount: e.amount,
        createdAt: e.createdAt,
        createdBy: e.createdBy,
      };

      for (const member in e.memberAmounts) {
        flattenedEntry[`${member}`] = e.memberAmounts[member];
      }

      return flattenedEntry;
    });

    const sheet = XLSX.utils.json_to_sheet(flattened);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, "Expenses");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([wbout], { type: "application/octet-stream" }), "trip_expenses.xlsx");
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Trip Expenses", 14, 20);
    doc.autoTable({
      startY: 30,
      head: [["Date", "Type", "Description", "Amount"]],
      body: expenses.map(e => [e.date, e.expenseType, e.description, e.amount])
    });
    doc.save("trip_expenses.pdf");
  };

  const toCamelExpense = (e: any): Expense => ({
    id: e.id,
    tripId: e.trip_id,
    tripName: e.trip_name,
    date: e.date,
    expenseType: e.expense_type,
    expenseOption: e.expense_option,
    description: e.description,
    location: e.location,
    amount: parseFloat(e.amount),
    memberAmounts: e.member_amounts,
    createdAt: e.created_at,
    createdBy: e.created_by,
  });

  useEffect(() => {
    setLoadingTrips(true);
    fetch(`${import.meta.env.VITE_API_URL}/trips`)
      .then((res) => res.json())
      .then((data) => {
        console.log("Fetched Trips from DB:", data);
        setTripTemplates(data.map(toCamelTrip));
      })
      .catch((err) => {
        console.error("Error fetching trips:", err);
      })
      .finally(() => {
        setLoadingTrips(false);
      });
  }, [pageLocation.key]);

  useEffect(() => {
    const trip = tripTemplates.find(t => t.tripId === selectedTripId);
    console.log("Selected Trip ID:", selectedTripId);
    console.log("Resolved Selected Trip:", trip);
    setSelectedTrip(trip || null);

    if (trip) {
      const initial: Record<string, number> = {};
      trip.members.forEach(m => { initial[m] = 0; });
      setMemberAmounts(initial);
    } else {
      setMemberAmounts({});
    }
  }, [selectedTripId, tripTemplates]);

  useEffect(() => {
    if (!selectedTripId) return;
    fetch(`${API_BASE}/logs?tripId=${selectedTripId}`)
      .then(res => res.json())
      .then(setActivityLogs)
      .catch(err => {
        console.error("Failed to load logs:", err);
        setActivityLogs([]);
      });
  }, [selectedTripId]);

  useEffect(() => {
    if (selectedTripId) {
      fetch(`${API_BASE}/expenses?tripId=${selectedTripId}`)
        .then(res => res.json())
        .then(data => {
          console.log("Fetched expenses for trip:", data);
          setExpenses(data.map(toCamelExpense));
        })
        .catch((err) => {
          console.error("Error loading expenses:", err);
          setExpenses([]);
        });
    } else {
      setExpenses([]);
    }
  }, [selectedTripId]);

  const splitAmountEqually = () => {
    if (!selectedTrip) return;
    const total = parseFloat(amount);
    const members = selectedTrip.members;
    const base = Math.floor((total / members.length) * 100) / 100;

    const obj: Record<string, number> = {};
    members.forEach((m) => (obj[m] = base));

    let remaining = +(total - base * members.length).toFixed(2);
    for (let i = 0; i < members.length && remaining > 0; i++) {
      obj[members[i]] += 0.01;
      remaining = +(remaining - 0.01).toFixed(2);
    }

    setMemberAmounts(obj);
    toast({ title: "Amount Split", description: `₹${total} split equally` });
  };

  const splitAmongSelectedMembers = () => {
    if (!selectedTrip || !selectedMembersForSplit.length) return;
    const total = parseFloat(amount);
    const selected = selectedMembersForSplit;
    const base = Math.floor((total / selected.length) * 100) / 100;

    const obj: Record<string, number> = {};
    selectedTrip.members.forEach((m) => (obj[m] = 0));
    selected.forEach((m) => (obj[m] = base));

    let remaining = +(total - base * selected.length).toFixed(2);
    for (let i = 0; i < selected.length && remaining > 0; i++) {
      obj[selected[i]] += 0.01;
      remaining = +(remaining - 0.01).toFixed(2);
    }

    setMemberAmounts(obj);
    setShowMemberSelection(false);
    setMemberAmounts(obj);
    setShowMemberSelection(false);
    toast({ title: "Amount Split", description: `₹${total} split among selected` });
  };

  const handleMemberAmountChange = (m: string, v: string) => {
    setMemberAmounts(prev => ({ ...prev, [m]: parseFloat(v) || 0 }));
  };

  const getExpenseOptions = () => selectedTrip?.expenseTypeOptions[expenseType] || [];

  const filteredExpenses = expenses;
  const totalAmount = filteredExpenses.reduce((s, e) => s + e.amount, 0);
  const budgetRemaining = (selectedTrip?.budget || 0) - totalAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const option = expenseOption || "N/A";

    if (!selectedTrip || !expenseDate || !expenseType || !amount) {
      return toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
    }

    setIsSubmitting(true); // start spinner
    toast({
      title: "Submitting...",
      description: "Saving your expense entry. Please wait...",
      variant: "default",
    });

    const total = parseFloat(amount);
    const sumAssigned = Object.values(memberAmounts).reduce((s, v) => s + v, 0);

    if (Math.abs(sumAssigned - total) > 0.01) {
      setIsSubmitting(false);
      return toast({
        title: "Error",
        description: "Assign amounts to all members correctly",
        variant: "destructive",
      });
    }

    const newExp = {
      id: `EXP-${Date.now()}`,
      trip_id: selectedTrip.tripId,
      trip_name: selectedTrip.tripName,
      date: expenseDate.toISOString(),
      expense_type: expenseType,
      expense_option: option,
      description,
      location,
      amount: total,
      member_amounts: memberAmounts,
      created_at: new Date().toISOString(),
      created_by: user?.displayName || user?.email || "anonymous",
    };

    fetch(`${API_BASE}/expenses${editExpenseId ? `/${editExpenseId}` : ""}`, {
      method: editExpenseId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newExp),
    })
      .then(res => {
        if (!res.ok) {
          throw new Error(`Failed to save: ${res.status}`);
        }
        return res.json();
      })
      .then(inserted => {
        toast({
          title: "Success!",
          description: "Expense saved",
          variant: "default",
          className: "bg-green-500 text-white",
        });

        const expense = toCamelExpense(inserted);
        setExpenses(prev => {
          return editExpenseId
            ? prev.map(e => (e.id === expense.id ? expense : e))
            : [...prev, expense];
        });

        const action = editExpenseId ? "edit" : "add";
        const isSplitCustom = selectedMembersForSplit.length > 0;
        const logEntry = `${editExpenseId ? "✏️" : "🟢"} ${user?.displayName || "Someone"} ${action} expense\n` +
          `Type: ${expenseType}, Total: ₹${total}\n` +
          `Split for all: ${!isSplitCustom}, Split for custom: ${isSplitCustom
            ? selectedMembersForSplit.map(m => `${m}: ₹${memberAmounts[m]}`).join(", ")
            : "false"
          }`;

        fetch(`${API_BASE}/logs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: `LOG-${Date.now()}`,
            trip_id: selectedTrip.tripId,
            expense_id: expense.id,
            action,
            message: logEntry,
            created_by: user?.displayName || user?.email || "Unknown",
            split_details: memberAmounts,
          }),
        });


        setEditExpenseId(null);

        setExpenseDate(undefined);
        setExpenseType("");
        setExpenseOption("");
        setDescription("");
        setLocation("");
        setAmount("");

        const resetAmounts: Record<string, number> = {};
        selectedTrip.members.forEach(member => {
          resetAmounts[member] = 0;
        });
        setMemberAmounts(resetAmounts);
        setSelectedMembersForSplit([]);
      })
      .catch(err => {
        console.error("Failed to submit expense:", err);
        toast({
          title: "Error",
          description: "Failed to save expense",
          variant: "destructive",
        });
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const deleteExpense = (id: string) => {
    const exp = expenses.find(e => e.id === id);
    fetch(`${API_BASE}/expenses/${id}`, { method: "DELETE" })
      .then(() => {
        toast({ title: "Deleted", description: "Expense deleted" });
        setExpenses(prev => prev.filter(e => e.id !== id));

        const logEntry = `🔴 ${user?.displayName || "Someone"} deleted expense\n` +
          `Type: ${exp?.expenseType || "?"}, Amount: ₹${exp?.amount?.toFixed(2) || "?"}`;

        fetch(`${API_BASE}/logs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: `LOG-${Date.now()}`,
            trip_id: selectedTrip?.tripId,
            expense_id: exp?.id,
            action: "delete",
            message: logEntry,
            created_by: user?.displayName || user?.email || "Unknown",
            timestamp: new Date().toISOString(),
            split_details: exp?.memberAmounts || null
          })
        });

      });
  };

  const handleEditExpense = (expense: Expense) => {
    setEditExpenseId(expense.id);
    setExpenseDate(new Date(expense.date));
    setExpenseType(expense.expenseType);
    setExpenseOption(expense.expenseOption || "");
    setDescription(expense.description || "");
    setLocation(expense.location || "");
    setAmount(expense.amount.toString());
    setMemberAmounts({ ...expense.memberAmounts });
  };


  const expenseBreakdown = selectedTrip ? selectedTrip.expenseTypes.map(type => {
    const typeExpenses = expenses.filter(exp =>
      exp.tripId === selectedTripId && exp.expenseType === type
    );
    const typeTotal = typeExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const percentage = totalAmount > 0 ? Math.round((typeTotal / totalAmount) * 100) : 0;
    return {
      type,
      amount: typeTotal,
      percentage,
      count: typeExpenses.length
    };
  }) : [];

  const toggleMemberSelection = (member: string) => {
    setSelectedMembersForSplit(prev =>
      prev.includes(member)
        ? prev.filter((m) => m !== member)
        : [...prev, member]
    );
  };


  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto p-4 flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <h1 className="text-2xl font-bold text-blue-600 flex items-center">
            Travel Budget Tracker
          </h1>
        </div>
      </header>
      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {loadingTrips ? (
          <p className="text-center text-gray-500 text-lg">Loading trip data... please wait.</p>
        ) : !selectedTrip ? (
          <Card>
            <CardContent>
              <Label>Select Trip to Track:</Label>
              <Select value={selectedTripId} onValueChange={setSelectedTripId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a trip" />
                </SelectTrigger>
                <SelectContent>
                  {tripTemplates.map((t) => (
                    <SelectItem key={t.tripId} value={t.tripId}>
                      {t.tripName} - {getTripStatus(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        ) : (
          <>
            {selectedTrip && (
              <>
                <div className="grid md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader className="bg-blue-600 text-white">
                      <CardTitle>My Budget & Expenses</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                      <div>
                        <Label className="text-sm text-gray-600">Total Budget</Label>
                        <div className="bg-blue-50 border border-blue-200 p-3 rounded text-center">
                          <span className="text-xl font-bold">₹{selectedTrip.budget.toFixed(2)}</span>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-600">Total Expenses</Label>
                        <div className="bg-blue-100 border border-blue-300 p-3 rounded text-center">
                          <span className="text-xl font-bold">₹{totalAmount.toFixed(2)}</span>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-600">Remaining Budget</Label>
                        <div className={`border p-3 rounded text-center ${budgetRemaining >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                          <span className={`text-xl font-bold ${budgetRemaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ₹{budgetRemaining.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

{/*                   <Card>
                    <CardHeader className="bg-blue-600 text-white">
                      <CardTitle>Where are my total expenses going?</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="space-y-3">
                        {expenseBreakdown.map((item, index) => (
                          <div key={item.type} className="flex justify-between items-center">
                            <span className="text-sm">{item.type}</span>
                            <div className="flex items-center space-x-2">
                              <div className={`px-2 py-1 rounded text-white text-xs font-medium ${index === 0 ? 'bg-blue-500' :
                                index === 1 ? 'bg-green-500' :
                                  index === 2 ? 'bg-red-500' :
                                    index === 3 ? 'bg-orange-500' : 'bg-gray-500'
                                }`}>
                                {item.percentage}%
                              </div>
                              <span className="text-sm font-medium">₹{item.amount.toFixed(2)}</span>
                              <span className="text-sm font-medium">{item.count}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      {totalAmount > 0 && (
                        <div className="mt-4 text-center">
                          <div className="text-2xl font-bold text-gray-700">
                            ₹{totalAmount.toFixed(0)}
                          </div>
                          <div className="text-sm text-gray-500">Total Expenses</div>
                        </div>
                      )}
                    </CardContent>
                  </Card> */}

                  <Card>
  <CardHeader className="bg-blue-600 text-white">
    <CardTitle>Where are my total expenses going?</CardTitle>
  </CardHeader>
  <CardContent className="p-6">
    <div className="divide-y divide-gray-200">
      {expenseBreakdown.map((item, index) => (
        <div
          key={item.type}
          className="flex justify-between items-center py-2"
        >
          <span className="font-semibold text-sm text-gray-700">
            {item.type}
          </span>
          <div className="flex items-center space-x-4">
            <div
              className={`px-2 py-1 rounded text-white text-xs font-semibold ${
                index === 0
                  ? 'bg-blue-500'
                  : index === 1
                  ? 'bg-green-500'
                  : index === 2
                  ? 'bg-red-500'
                  : index === 3
                  ? 'bg-orange-500'
                  : 'bg-gray-500'
              }`}
            >
              {item.percentage}%
            </div>
            <span className="text-sm font-semibold text-right text-gray-800 w-[80px]">
              ₹{item.amount.toFixed(2)}
            </span>
            <span className="text-sm font-medium text-right text-gray-500 w-[40px]">
              {item.count}
            </span>
          </div>
        </div>
      ))}
    </div>

    {totalAmount > 0 && (
      <div className="mt-4 text-center">
        <div className="text-2xl font-bold text-gray-700">
          ₹{totalAmount.toFixed(0)}
        </div>
        <div className="text-sm text-gray-500">Total Expenses</div>
      </div>
    )}
  </CardContent>
</Card>
                </div>

                <Card className="mb-6">
                  <CardContent className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid md:grid-cols-3 gap-4">
                        <div>
                          <Label className="text-sm font-semibold">Expense Date *</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full mt-2 justify-start text-left font-normal",
                                  !expenseDate && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {expenseDate ? format(expenseDate, "PPP") : "Pick date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={expenseDate}
                                onSelect={setExpenseDate}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>

                        <div>
                          <Label className="text-sm font-semibold">Expense Type *</Label>
                          <Select value={expenseType} onValueChange={setExpenseType}>
                            <SelectTrigger className="mt-2">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              {selectedTrip.expenseTypes.map((type, index) => (
                                <SelectItem key={index} value={type}>
                                  {type}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {expenseType && getExpenseOptions().length > 0 && (
                          <div>
                            <Label className="text-sm font-semibold">Expense Option</Label>
                            <Select value={expenseOption} onValueChange={setExpenseOption}>
                              <SelectTrigger className="mt-2">
                                <SelectValue placeholder="Select option" />
                              </SelectTrigger>
                              <SelectContent>
                                {getExpenseOptions().map((option, index) => (
                                  <SelectItem key={index} value={option}>
                                    {option}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>

                      <div className="grid md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="description" className="text-sm font-semibold">Description</Label>
                          <Input
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Add description..."
                            className="mt-2"
                          />
                        </div>

                        <div>
                          <Label htmlFor="location" className="text-sm font-semibold">Location</Label>
                          <Input
                            id="location"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="Enter location"
                            className="mt-2"
                          />
                        </div>

                        <div>
                          <Label htmlFor="amount" className="text-sm font-semibold">Total Amount *</Label>
                          <div className="flex gap-2 mt-2">
                            <Input
                              id="amount"
                              type="number"
                              step="0.01"
                              value={amount}
                              onChange={(e) => setAmount(e.target.value)}
                              placeholder="Enter amount"
                              className="flex-1"
                              required
                            />
                            <div className="flex gap-1">
                              <Button
                                type="button"
                                onClick={splitAmountEqually}
                                variant="outline"
                                className="px-3"
                                disabled={!amount}
                                title="Split for all members"
                              >
                                <Users className="h-4 w-4" />
                              </Button>
                              <Popover open={showMemberSelection} onOpenChange={setShowMemberSelection}>
                                <PopoverTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="px-3"
                                    disabled={!amount}
                                    title="Split for custom members"
                                  >
                                    <UserCheck className="h-4 w-4" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-64 p-4" align="end">
                                  <div className="space-y-3">
                                    <Label className="text-sm font-semibold">Select Members for Split</Label>
                                    <div className="space-y-2">
                                      {selectedTrip.members.map((member) => (
                                        <div key={member} className="flex items-center space-x-2">
                                          <Checkbox
                                            id={member}
                                            checked={selectedMembersForSplit.includes(member)}
                                            onCheckedChange={() => toggleMemberSelection(member)}
                                          />
                                          <Label htmlFor={member} className="text-sm">{member}</Label>
                                        </div>
                                      ))}
                                    </div>
                                    <Button
                                      onClick={splitAmongSelectedMembers}
                                      className="w-full"
                                      disabled={selectedMembersForSplit.length === 0}
                                    >
                                      Split Amount
                                    </Button>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            <Users className="inline h-3 w-3 mr-1" />Split for all |
                            <UserCheck className="inline h-3 w-3 mx-1" />Split for custom members
                          </div>
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-semibold">Amount per Member</Label>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-2">
                          {selectedTrip.members.map((member, index) => (
                            <div key={index}>
                              <Label htmlFor={`member-${index}`} className="text-xs text-gray-600">
                                {member}
                              </Label>
                              <Input
                                id={`member-${index}`}
                                type="number"
                                step="0.01"
                                value={memberAmounts[member] || 0}
                                onChange={(e) => handleMemberAmountChange(member, e.target.value)}
                                placeholder="0.00"
                                className="mt-1"
                              />
                            </div>
                          ))}
                        </div>
                        <div className="text-sm text-gray-600 mt-2">
                          Total assigned: ₹{Object.values(memberAmounts).reduce((sum, amt) => sum + amt, 0).toFixed(2)}
                        </div>
                      </div>
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className={`w-full font-semibold py-3 text-lg flex justify-center items-center ${isSubmitting
                          ? "bg-gray-400 cursor-not-allowed"
                          : "bg-blue-600 hover:bg-blue-700 text-white"
                          }`}
                      >
                        {isSubmitting ? (
                          <>
                            <Plus className="mr-2 h-4 w-4 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Expense
                          </>
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="bg-blue-600 text-white">
                    <CardTitle>What are my expenses?</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {filteredExpenses.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">No expenses recorded yet</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gray-50">
                              <TableHead className="font-semibold">Date</TableHead>
                              <TableHead className="font-semibold">Type</TableHead>
                              <TableHead className="font-semibold">Description</TableHead>
                              <TableHead className="font-semibold">Total Amount</TableHead>
                              {selectedTrip.members.map((member) => (
                                <TableHead key={member} className="font-semibold text-center">
                                  {member}
                                </TableHead>
                              ))}
                              <TableHead className="font-semibold">Add By</TableHead>
                              <TableHead className="font-semibold">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredExpenses.map((expense) => (
                              <TableRow key={expense.id}>
                                <TableCell>{format(new Date(expense.date), "MMM dd, yyyy")}</TableCell>
                                <TableCell>{expense.expenseType}</TableCell>
                                <TableCell>
                                  <div>
                                    <div className="font-medium">{expense.expenseOption || "N/A"}</div>
                                    {expense.description && expense.expenseOption && (
                                      <div className="text-xs text-gray-500">{expense.description}</div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="font-bold">₹{expense.amount.toFixed(2)}</TableCell>
                                {selectedTrip.members.map((member) => (
                                  <TableCell key={member} className="text-center">
                                    ₹{(expense.memberAmounts[member] || 0).toFixed(2)}
                                  </TableCell>
                                ))}
                                <TableCell>{expense.createdBy || "N/A"}</TableCell>
                                <TableCell>
                                  {expense.createdBy === user?.displayName || expense.createdBy === user?.email ? (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEditExpense(expense)}
                                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                      >
                                        Edit
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => deleteExpense(expense.id)}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </>
                                  ) : (
                                    <span className="text-xs text-gray-400 italic">No access</span>
                                  )}
                                </TableCell>

                              </TableRow>
                            ))}
                            <TableRow className="bg-blue-50 font-bold">
                              <TableCell colSpan={3} className="text-right">Total Expenses</TableCell>
                              <TableCell>₹{totalAmount.toFixed(2)}</TableCell>
                              {selectedTrip.members.map((member) => {
                                const memberTotal = filteredExpenses.reduce((sum, expense) =>
                                  sum + (expense.memberAmounts[member] || 0), 0
                                );
                                return (
                                  <TableCell key={member} className="text-center font-bold">
                                    ₹{memberTotal.toFixed(2)}
                                  </TableCell>
                                );
                              })}
                              <TableCell></TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
                  <Button 
                  onClick={exportToExcel}
                  className="bg-blue-600 text-white hover:bg-blue-700"
                  >
                  Export Excel
                </Button>

{/*                 <Button 
                  onClick={exportToPDF}
                  className="bg-blue-600 text-white hover:bg-blue-700"
                  >
                  Export PDF
                </Button> */}
                  <Button 
                  onClick={() => setShowActivityDrawer(true)}
                  className="bg-blue-600 text-white hover:bg-blue-700"
                  >
                  View Activities
                </Button>

              </>
            )}
          </>
        )}
      </main>
      <Footer />
      {showActivityDrawer && (
        <div className="fixed right-0 top-0 h-full w-[400px] bg-white shadow-xl z-50 border-l border-gray-300 p-6 overflow-y-auto font-[Arial-ItalicMT]">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Activity Logs</h2>
            <Button variant="ghost" onClick={() => setShowActivityDrawer(false)}>Close</Button>
          </div>
          <ol className="list-decimal pl-5 space-y-4 text-sm whitespace-pre-line text-gray-700">
            {activityLogs.length === 0 ? (
              <p className="italic text-gray-400">No activity yet.</p>
            ) : (
              activityLogs.map((log) => (
                <li key={log.id}>
                  {log.message}
                  <div className="text-xs text-gray-500 mt-1">
                    {log.created_by || "Unknown"} • {new Date(log.timestamp).toLocaleString()}
                    {log.split_details && (
                      <div className="mt-1">
                        {Object.entries(log.split_details).map(([name, amt]) => (
                          <div key={name} className="text-xs ml-2">🔹 {name}: ₹{amt}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              ))
            )}
          </ol>
        </div>
      )}
    </div>
  );
};

export default TrackExpenses;

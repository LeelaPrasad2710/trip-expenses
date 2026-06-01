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

const LoadingSpinner = () => {
  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-4">
      <div className="h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-blue-600 text-sm font-medium">Loading trip data from server...</p>
    </div>
  );
};


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
  const [showExpenseDrawer, setShowExpenseDrawer] = useState(false);
  const [showSettlement, setShowSettlement] = useState(false);
  const [tripDetailsLoading, setTripDetailsLoading] = useState(false);
  const [showChatToAdd, setShowChatToAdd] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [showSpendPerDate, setShowSpendPerDate] = useState(false);
  const [showMemberDNA, setShowMemberDNA] = useState(false);


  const filteredExpenses = expenses;

  const spendByDate = filteredExpenses.reduce((acc, exp) => {
    const dateStr = format(new Date(exp.date), "MMM dd, yyyy");
    acc[dateStr] = (acc[dateStr] || 0) + exp.amount;
    return acc;
  }, {} as Record<string, number>);

  const memberDNA = selectedTrip
    ? selectedTrip.members.reduce((acc, member) => {
      acc[member] = {};
      selectedTrip.expenseTypes.forEach(type => {
        const total = filteredExpenses.reduce((sum, exp) => {
          if (exp.expenseType === type) {
            return sum + (exp.memberAmounts[member] || 0);
          }
          return sum;
        }, 0);
        acc[member][type] = total;
      });
      return acc;
    }, {} as Record<string, Record<string, number>>)
    : {};



  const handleChatExpenseSubmit = () => {
    console.log("Raw Input:", chatInput);
    console.log("Trip selected:", selectedTrip?.tripId);
    console.log("Members available:", selectedTrip?.members);

    if (!chatInput.trim() || !selectedTrip) {
      return toast({ title: "Please enter a full expense line." });
    }

    const input = chatInput.toLowerCase();

    const amtMatch = input.match(/spent\s*₹?(\d+(\.\d{1,2})?)/i);
    const typeMatch = input.match(/on\s+(\w+)/i);
    const desc1Match = input.match(/as\s+(.+?)\s+(at|for|on\s)/i);
    const desc2Match = input.match(/at\s+(.+?)\s+(for|on\s)/i);
    const forMatch = input.match(/for\s+(everyone|.+?)\s*(on|$)/i);
    const dateMatch = chatInput.match(/\s+on\s+(\w+\s+\d{1,2}(?:,\s*\d{4})?)$/i);

    const amount = amtMatch ? parseFloat(amtMatch[1]) : null;
    const rawType = typeMatch?.[1] || "";
    const rawDesc1 = desc1Match?.[1]?.trim() || "";
    const desc2 = desc2Match?.[1]?.trim() || "";
    const peopleRaw = forMatch?.[1]?.trim() || "everyone";
    const dateText = dateMatch?.[1] || "";

    console.log("Parsed amount:", amount);
    console.log("Parsed type:", rawType);
    console.log("Parsed desc1:", rawDesc1);
    console.log("Parsed desc2:", desc2);
    console.log("Parsed peopleRaw:", peopleRaw);
    console.log("Parsed dateText:", dateText);

    if (!amount || !rawType) {
      return toast({
        title: "Parsing failed",
        description: "Amount or type missing.",
        variant: "destructive",
      });
    }

    const capitalize = (s: string) =>
      s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "";

    const expense_type = capitalize(rawType);
    const expense_option = capitalize(rawDesc1);
    const description = capitalize(desc2);
    const location = desc2;
    const date = dateText ? new Date(dateText) : new Date();

    const members =
      peopleRaw === "everyone"
        ? [...selectedTrip.members]
        : peopleRaw
          .split(" and ")
          .map((m) => m.trim())
          .filter((m) =>
            selectedTrip.members.some(
              (mem) => mem.toLowerCase() === m.toLowerCase()
            )
          );

    if (members.length === 0) {
      return toast({ title: "No valid members found", variant: "destructive" });
    }

    const base = Math.floor((amount / members.length) * 100) / 100;
    const memberMap: Record<string, number> = {};
    members.forEach((m) => (memberMap[m] = base));
    let rem = +(amount - base * members.length).toFixed(2);
    for (let i = 0; i < members.length && rem > 0; i++) {
      memberMap[members[i]] += 0.01;
      rem = +(rem - 0.01).toFixed(2);
    }

    const newExp = {
      id: `EXP-${Date.now()}`,
      trip_id: selectedTrip.tripId,
      trip_name: selectedTrip.tripName,
      date: date.toISOString(),
      expense_type,
      expense_option,
      description,
      location,
      amount,
      member_amounts: memberMap,
      created_at: new Date().toISOString(),
      created_by: user?.displayName || user?.email || "chat-entry",
    };

    console.log("Final expense object:", newExp);

    fetch(`${API_BASE}/expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newExp),
    })
      .then((res) => res.json())
      .then((inserted) => {
        setExpenses((prev) => [...prev, toCamelExpense(inserted)]);
        toast({
          title: "✅ Expense Added",
          description: `₹${amount} on ${expense_type}`,
        });
        setChatInput("");
        setShowChatToAdd(false);
      })
      .catch((err) => {
        console.error("Error:", err);
        toast({ title: "Error saving", variant: "destructive" });
      });
  };


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
    if (!selectedTrip || expenses.length === 0) {
      toast({
        title: "Nothing to export",
        description: "Please select a trip with expenses.",
        variant: "destructive",
      });
      return;
    }

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    doc.setFontSize(14);
    doc.text("Trip Expenses", 14, 15);

    doc.setFontSize(10);
    doc.text(`Trip Name: ${selectedTrip.tripName}`, 14, 22);
    doc.text(`Budget: Rs. ${selectedTrip.budget.toFixed(2)}`, 14, 28);
    doc.text(`Total Expenses: Rs. ${totalAmount.toFixed(2)}`, 14, 34);
    doc.text(`Remaining Budget: Rs. ${(selectedTrip.budget - totalAmount).toFixed(2)}`, 14, 40);

    const expenseBreakdown = selectedTrip.expenseTypes.map(type => {
      const typeExpenses = expenses.filter(exp => exp.expenseType === type);
      const typeTotal = typeExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      const percentage = totalAmount > 0 ? Math.round((typeTotal / totalAmount) * 100) : 0;
      return {
        type,
        amount: typeTotal,
        percentage,
        count: typeExpenses.length
      };
    });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Overview", 14, 46);

    autoTable(doc, {
      startY: 50,
      head: [["Type", "Percentage", "Amount", "Count"]],
      body: expenseBreakdown.map(b => [
        b.type,
        `${b.percentage}%`,
        `Rs. ${b.amount.toFixed(2)}`,
        b.count.toString()
      ]),
      styles: {
        fontSize: 9,
      },
      headStyles: {
        fillColor: [52, 152, 219],
        textColor: 255,
        fontSize: 9,
      },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 30 },
        2: { cellWidth: 35 },
        3: { cellWidth: 25 },
      },
    });

    const columnStyles: Record<number, any> = {
      0: { cellWidth: 20 }, // Date
      1: { cellWidth: 15 }, // Type
      2: { cellWidth: 20 }, // Description
      3: { cellWidth: 19 }, // Amount
    };

    selectedTrip.members.forEach((_, index) => {
      columnStyles[4 + index] = { cellWidth: 17 }; // Members columns
    });

    columnStyles[4 + selectedTrip.members.length] = { cellWidth: 20 }; // "Added By"

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [[
        "Date",
        "Type",
        "Description",
        "Amount",
        ...selectedTrip.members,
        "Added By"
      ]],
      body: [
        ...expenses.map(e => [
          format(new Date(e.date), "MMM dd, yyyy"),
          e.expenseType || "N/A",
          e.description || "N/A",
          `Rs. ${e.amount.toFixed(2)}`,
          ...selectedTrip.members.map(m => `Rs. ${(e.memberAmounts[m] || 0).toFixed(2)}`),
          e.createdBy || "N/A"
        ]),
        [
          "", "", "Total Expenses", `Rs. ${totalAmount.toFixed(2)}`,
          ...selectedTrip.members.map(m => {
            const total = expenses.reduce((sum, e) => sum + (e.memberAmounts[m] || 0), 0);
            return `Rs. ${total.toFixed(2)}`;
          }),
          ""
        ],
        [
          "", "", "Settlement", `Rs. ${(selectedTrip.budget - totalAmount).toFixed(2)}`,
          ...selectedTrip.members.map(m => {
            const paid = expenses.reduce((sum, e) => sum + (e.memberAmounts[m] || 0), 0);
            const share = selectedTrip.budget / selectedTrip.members.length;
            const delta = +(share - paid).toFixed(2);
            return delta >= 0
              ? `+ Rs.   ${delta.toFixed(2)}`
              : `- Rs.   ${Math.abs(delta).toFixed(2)}`;
          }),
          ""
        ]
      ],
      styles: {
        fontSize: 9,
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontSize: 8,
      },
      columnStyles
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

    const trip = tripTemplates.find(t => t.tripId === selectedTripId);
    setSelectedTrip(null);
    setTripDetailsLoading(true);

    if (!trip) {
      setTripDetailsLoading(false);
      return;
    }

    setSelectedTrip(trip);
    const initial: Record<string, number> = {};
    trip.members.forEach((m) => (initial[m] = 0));
    setMemberAmounts(initial);

    Promise.all([
      fetch(`${API_BASE}/expenses?tripId=${selectedTripId}`).then((res) => res.json()),
      fetch(`${API_BASE}/logs?tripId=${selectedTripId}`).then((res) => res.json())
    ])
      .then(([expensesData, logsData]) => {
        setExpenses(expensesData.map(toCamelExpense));
        setActivityLogs(logsData);
      })
      .catch((err) => {
        console.error("Error fetching trip data:", err);
        setExpenses([]);
        setActivityLogs([]);
      })
      .finally(() => {
        setTripDetailsLoading(false);
      });

  }, [selectedTripId, tripTemplates]);

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

  // const filteredExpenses = expenses;
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
          title: `✅ ₹${total.toFixed(2)} added to ${expenseType}`,
          description: "Expense saved",
          variant: "default",
          className: "bg-green-500 text-white",
        });

        setShowExpenseDrawer(false);

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
    setShowExpenseDrawer(true);
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



  // ─── REDESIGNED UI ────────────────────────────────────────────────────────
  const statCard = (label: string, value: string, accent: string, sub?: string) => (
    <div className="rounded-2xl p-5 flex flex-col gap-1"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <span className="text-xs uppercase tracking-widest font-mono-custom" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="font-display text-2xl font-bold" style={{ color: accent }}>{value}</span>
      {sub && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{sub}</span>}
    </div>
  );

  const budgetPct = selectedTrip ? Math.min((totalAmount / selectedTrip.budget) * 100, 100) : 0;
  const isOver = selectedTrip ? totalAmount > selectedTrip.budget : false;

  const ActionBtn = ({ onClick, icon, label, color = 'var(--amber)' }: { onClick: () => void; icon: string; label: string; color?: string }) => (
    <button onClick={onClick} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
      style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
      onMouseEnter={e => (e.currentTarget.style.background = `${color}28`)}
      onMouseLeave={e => (e.currentTarget.style.background = `${color}18`)}>
      <span>{icon}</span> {label}
    </button>
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>

      {/* Header */}
      <header style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center gap-4">
          <button onClick={() => navigate("/")}
            className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-full"
            style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div className="h-5 w-px" style={{ background: 'var(--border)' }} />
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-xl font-semibold truncate" style={{ color: 'var(--cream)' }}>
              {selectedTrip ? selectedTrip.tripName : "Travel Budget Tracker"}
            </h1>
            {selectedTrip && (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {format(new Date(selectedTrip.startDate), "MMM d")} – {format(new Date(selectedTrip.endDate), "MMM d, yyyy")}
                &nbsp;·&nbsp;{selectedTrip.members.length} members
              </p>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full space-y-6">

        {/* Trip selector or loading */}
        {loadingTrips ? (
          <div className="space-y-3">
            {[1,2,3].map(n => <div key={n} className="h-16 rounded-2xl loading-skeleton" />)}
          </div>
        ) : !selectedTrip ? (
          <div className="max-w-md mx-auto mt-16 fade-up">
            <div className="rounded-2xl p-8 space-y-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div>
                <p className="font-display text-2xl font-semibold mb-1" style={{ color: 'var(--cream)' }}>Select a Trip</p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Choose a trip to start tracking expenses</p>
              </div>
              <div>
                <label className="block text-xs mb-2 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Trip</label>
                <select
                  value={selectedTripId}
                  onChange={(e) => setSelectedTripId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm appearance-none cursor-pointer"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: selectedTripId ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                  <option value="">— Choose a trip —</option>
                  {tripTemplates.map((t) => (
                    <option key={t.tripId} value={t.tripId}>{t.tripName} · {getTripStatus(t)}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ) : tripDetailsLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(n => <div key={n} className="h-20 rounded-2xl loading-skeleton" />)}
          </div>
        ) : (
          <div className="fade-up space-y-6">

            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {statCard("Total Budget", `₹${selectedTrip.budget.toLocaleString('en-IN')}`, 'var(--text-secondary)')}
              {statCard("Total Spent", `₹${totalAmount.toLocaleString('en-IN', {minimumFractionDigits:2})}`, 'var(--amber)')}
              {statCard("Remaining", `₹${Math.abs(budgetRemaining).toLocaleString('en-IN', {minimumFractionDigits:2})}`, isOver ? 'var(--red-soft)' : 'var(--sage)', isOver ? 'Over budget!' : undefined)}
              {statCard("Expenses", `${filteredExpenses.length}`, 'var(--text-secondary)', `across ${selectedTrip.expenseTypes.length} categories`)}
            </div>

            {/* Budget progress */}
            <div className="rounded-2xl px-5 py-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Budget used</span>
                <span className="text-xs font-mono-custom" style={{ color: isOver ? 'var(--red-soft)' : 'var(--amber)' }}>
                  {Math.round((totalAmount / (selectedTrip.budget || 1)) * 100)}%
                </span>
              </div>
              <div className="budget-bar">
                <div className={`budget-bar-fill ${isOver ? 'over' : ''}`} style={{ width: `${budgetPct}%` }} />
              </div>
            </div>

            {/* Overview breakdown */}
            <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <h3 className="font-display text-sm font-semibold mb-4 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                Spend by Category
              </h3>
              <div className="space-y-3">
                {expenseBreakdown.map((item) => (
                  <div key={item.type}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item.type}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-mono-custom text-xs" style={{ color: 'var(--text-muted)' }}>{item.count} entries</span>
                        <span className="font-mono-custom text-sm font-medium" style={{ color: 'var(--amber)' }}>
                          ₹{item.amount.toLocaleString('en-IN', {minimumFractionDigits:2})}
                        </span>
                        <span className="chip chip-amber">{item.percentage}%</span>
                      </div>
                    </div>
                    <div className="budget-bar">
                      <div className="budget-bar-fill" style={{ width: `${item.percentage}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              <ActionBtn onClick={() => setShowExpenseDrawer(true)} icon="+" label="Add Expense" color="var(--amber)" />
              <ActionBtn onClick={() => setShowChatToAdd(true)} icon="💬" label="Chat to Add" color="var(--amber)" />
              <ActionBtn onClick={() => setShowActivityDrawer(true)} icon="🕘" label="Logs" color="var(--text-secondary)" />
              <ActionBtn onClick={() => setShowSettlement(!showSettlement)} icon="💸" label={showSettlement ? "Hide Settlement" : "Settle"} color="var(--sage)" />
              <ActionBtn onClick={exportToExcel} icon="📄" label="Excel" color="var(--text-secondary)" />
              <ActionBtn onClick={exportToPDF} icon="📄" label="PDF" color="var(--text-secondary)" />
              <ActionBtn onClick={() => setShowSpendPerDate(!showSpendPerDate)} icon="📅" label="Spend by Date" color="var(--amber-dim)" />
              <ActionBtn onClick={() => setShowMemberDNA(!showMemberDNA)} icon="🧬" label="Member DNA" color="var(--terracotta)" />
            </div>

            {/* Expenses Table */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
                <h3 className="font-display text-base font-semibold" style={{ color: 'var(--cream)' }}>Expense Ledger</h3>
                <span className="chip chip-muted">{filteredExpenses.length} entries</span>
              </div>
              {filteredExpenses.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="font-display text-lg mb-1" style={{ color: 'var(--text-secondary)' }}>No expenses yet</p>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Add your first expense using the button above</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
                        {["Date","Type","Description","Amount", ...selectedTrip.members, "By",""].map((h, i) => (
                          <th key={i} className="px-4 py-3 text-left text-xs uppercase tracking-widest font-medium"
                            style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredExpenses.map((exp, ri) => (
                        <tr key={exp.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          <td className="px-4 py-3 font-mono-custom text-xs whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                            {format(new Date(exp.date), "MMM dd")}
                          </td>
                          <td className="px-4 py-3">
                            <span className="chip chip-amber">{exp.expenseType}</span>
                          </td>
                          <td className="px-4 py-3 max-w-[180px]">
                            <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{exp.expenseOption || "—"}</div>
                            {exp.description && <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{exp.description}</div>}
                          </td>
                          <td className="px-4 py-3 font-mono-custom font-semibold whitespace-nowrap" style={{ color: 'var(--amber)' }}>
                            ₹{exp.amount.toFixed(2)}
                          </td>
                          {selectedTrip.members.map((m) => (
                            <td key={m} className="px-4 py-3 font-mono-custom text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                              ₹{(exp.memberAmounts[m] || 0).toFixed(2)}
                            </td>
                          ))}
                          <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{exp.createdBy}</td>
                          <td className="px-4 py-3">
                            {(exp.createdBy === user?.displayName || exp.createdBy === user?.email) ? (
                              <div className="flex items-center gap-1">
                                <button onClick={() => handleEditExpense(exp)}
                                  className="text-xs px-2 py-1 rounded-lg transition-all"
                                  style={{ color: 'var(--amber)', background: 'rgba(232,164,74,0.1)' }}>Edit</button>
                                <button onClick={() => deleteExpense(exp.id)}
                                  className="text-xs px-2 py-1 rounded-lg transition-all"
                                  style={{ color: 'var(--red-soft)', background: 'rgba(196,82,82,0.1)' }}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ) : null}
                          </td>
                        </tr>
                      ))}

                      {/* Totals row */}
                      <tr style={{ background: 'var(--bg-elevated)', borderTop: '1px solid var(--border)' }}>
                        <td colSpan={3} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-right"
                          style={{ color: 'var(--text-muted)' }}>Total Expenses</td>
                        <td className="px-4 py-3 font-mono-custom font-bold" style={{ color: 'var(--amber)' }}>₹{totalAmount.toFixed(2)}</td>
                        {selectedTrip.members.map((m) => {
                          const mt = filteredExpenses.reduce((s, e) => s + (e.memberAmounts[m] || 0), 0);
                          return <td key={m} className="px-4 py-3 font-mono-custom text-xs text-center font-bold" style={{ color: 'var(--text-secondary)' }}>₹{mt.toFixed(2)}</td>;
                        })}
                        <td colSpan={2} />
                      </tr>

                      {showSettlement && (
                        <tr style={{ background: 'rgba(122,158,126,0.06)', borderTop: '1px solid var(--border)' }}>
                          <td colSpan={3} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-right"
                            style={{ color: 'var(--sage)' }}>Settlement</td>
                          <td className="px-4 py-3 font-mono-custom font-bold" style={{ color: budgetRemaining >= 0 ? 'var(--sage)' : 'var(--red-soft)' }}>
                            {budgetRemaining >= 0 ? '+' : '-'}₹{Math.abs(budgetRemaining).toFixed(2)}
                          </td>
                          {selectedTrip.members.map((m) => {
                            const mt = filteredExpenses.reduce((s, e) => s + (e.memberAmounts[m] || 0), 0);
                            const share = selectedTrip.budget / selectedTrip.members.length;
                            const delta = +(share - mt).toFixed(2);
                            return (
                              <td key={m} className="px-4 py-3 font-mono-custom text-xs text-center font-bold"
                                style={{ color: delta >= 0 ? 'var(--sage)' : 'var(--red-soft)' }}>
                                {delta >= 0 ? '+' : '-'}₹{Math.abs(delta).toFixed(2)}
                              </td>
                            );
                          })}
                          <td colSpan={2} />
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Spend by Date */}
            {showSpendPerDate && (
              <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <h3 className="font-display text-base font-semibold mb-4" style={{ color: 'var(--cream)' }}>📅 Spend by Date</h3>
                <div className="space-y-2">
                  {Object.entries(spendByDate).map(([date, total]) => (
                    <div key={date} className="flex justify-between items-center py-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{date}</span>
                      <span className="font-mono-custom text-sm font-semibold" style={{ color: 'var(--amber)' }}>₹{total.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Member DNA */}
            {showMemberDNA && (
              <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                  <h3 className="font-display text-base font-semibold" style={{ color: 'var(--cream)' }}>🧬 Member Spend DNA</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
                        <th className="px-4 py-3 text-left text-xs uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Member</th>
                        {selectedTrip.expenseTypes.map(t => (
                          <th key={t} className="px-4 py-3 text-right text-xs uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{t}</th>
                        ))}
                        <th className="px-4 py-3 text-right text-xs uppercase tracking-widest" style={{ color: 'var(--terracotta)' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(memberDNA).map(([member, breakdown]) => {
                        const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
                        return (
                          <tr key={member} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>{member}</td>
                            {selectedTrip.expenseTypes.map(t => (
                              <td key={t} className="px-4 py-3 font-mono-custom text-xs text-right" style={{ color: 'var(--text-secondary)' }}>
                                ₹{(breakdown[t] || 0).toFixed(2)}
                              </td>
                            ))}
                            <td className="px-4 py-3 font-mono-custom text-sm text-right font-bold" style={{ color: 'var(--terracotta)' }}>
                              ₹{total.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />

      {/* Chat to Add Modal */}
      {showChatToAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="rounded-2xl w-full max-w-lg p-6 space-y-4 fade-up"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="flex justify-between items-center">
              <h2 className="font-display text-xl font-semibold" style={{ color: 'var(--cream)' }}>💬 Chat to Add</h2>
              <button onClick={() => setShowChatToAdd(false)} className="text-xs px-3 py-1.5 rounded-lg"
                style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}>Close</button>
            </div>
            <textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl text-sm resize-none outline-none"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              placeholder='e.g. "Spent ₹1200 on Stay as Taj for everyone"'
            />
            <button onClick={() => setChatInput("Spent ₹1200 on Stay as advance at Taj for everyone")}
              className="w-full py-2.5 rounded-xl text-sm"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
              Use Template Text
            </button>
            <button onClick={() => handleChatExpenseSubmit()}
              className="w-full py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: 'var(--amber)', color: '#111' }}>
              Parse &amp; Add →
            </button>
          </div>
        </div>
      )}

      {/* Add/Edit Expense Drawer */}
      {showExpenseDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowExpenseDrawer(false)} />
          <div className="relative w-full sm:w-[420px] h-full overflow-y-auto slide-in"
            style={{ background: 'var(--bg-card)', borderLeft: '1px solid var(--border)' }}>
            <div className="sticky top-0 flex items-center justify-between px-6 py-4 z-10"
              style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
              <h2 className="font-display text-lg font-semibold" style={{ color: 'var(--cream)' }}>
                {editExpenseId ? "Edit Expense" : "New Expense"}
              </h2>
              <button onClick={() => setShowExpenseDrawer(false)} className="text-xs px-3 py-1.5 rounded-lg"
                style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}>Close</button>
            </div>

            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Date */}
                <div>
                  <label className="block text-xs mb-1.5 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Date *</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button type="button" className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-left"
                        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: expenseDate ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        <CalendarIcon className="h-4 w-4" style={{ color: 'var(--amber)' }} />
                        {expenseDate ? format(expenseDate, "PPP") : "Pick date"}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                      <Calendar mode="single" selected={expenseDate} onSelect={setExpenseDate} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Type */}
                <div>
                  <label className="block text-xs mb-1.5 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Type *</label>
                  <Select value={expenseType} onValueChange={setExpenseType}>
                    <SelectTrigger className="w-full" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                      {selectedTrip?.expenseTypes.map((t, i) => (
                        <SelectItem key={i} value={t} style={{ color: 'var(--text-primary)' }}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Option */}
                {expenseType && getExpenseOptions().length > 0 && (
                  <div>
                    <label className="block text-xs mb-1.5 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Option</label>
                    <Select value={expenseOption} onValueChange={setExpenseOption}>
                      <SelectTrigger style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                        <SelectValue placeholder="Select option" />
                      </SelectTrigger>
                      <SelectContent style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                        {getExpenseOptions().map((o, i) => (
                          <SelectItem key={i} value={o} style={{ color: 'var(--text-primary)' }}>{o}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Description */}
                <div>
                  <label className="block text-xs mb-1.5 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Description</label>
                  <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Notes..."
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
                </div>

                {/* Location */}
                <div>
                  <label className="block text-xs mb-1.5 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Location</label>
                  <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Where?"
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-xs mb-1.5 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Total Amount *</label>
                  <div className="flex gap-2">
                    <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="₹0.00" required
                      className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none font-mono-custom"
                      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--amber)' }} />
                    <button type="button" onClick={splitAmountEqually} disabled={!amount}
                      className="px-3 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all"
                      style={{ background: 'rgba(232,164,74,0.12)', color: 'var(--amber)', border: '1px solid rgba(232,164,74,0.25)' }}
                      title="Split equally">
                      <Users className="h-4 w-4" />
                    </button>
                    <Popover open={showMemberSelection} onOpenChange={setShowMemberSelection}>
                      <PopoverTrigger asChild>
                        <button type="button" disabled={!amount}
                          className="px-3 rounded-xl text-xs font-semibold flex items-center gap-1"
                          style={{ background: 'rgba(122,158,126,0.12)', color: 'var(--sage)', border: '1px solid rgba(122,158,126,0.25)' }}
                          title="Split for selected">
                          <UserCheck className="h-4 w-4" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-60 p-4" align="end" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                        <div className="space-y-3">
                          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Select members</p>
                          <div className="space-y-2">
                            {selectedTrip?.members.map((m) => (
                              <div key={m} className="flex items-center gap-2">
                                <Checkbox id={`split-${m}`} checked={selectedMembersForSplit.includes(m)} onCheckedChange={() => toggleMemberSelection(m)} />
                                <label htmlFor={`split-${m}`} className="text-sm cursor-pointer" style={{ color: 'var(--text-primary)' }}>{m}</label>
                              </div>
                            ))}
                          </div>
                          <button onClick={splitAmongSelectedMembers} disabled={!selectedMembersForSplit.length}
                            className="w-full py-2 rounded-xl text-xs font-semibold"
                            style={{ background: 'var(--amber)', color: '#111' }}>
                            Split →
                          </button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    <Users className="inline h-3 w-3" /> = equal split &nbsp;·&nbsp; <UserCheck className="inline h-3 w-3" /> = custom split
                  </p>
                </div>

                {/* Per-member */}
                <div>
                  <label className="block text-xs mb-2 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Amount per Member</label>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedTrip?.members.map((m, i) => (
                      <div key={i}>
                        <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>{m}</label>
                        <input type="number" step="0.01" value={memberAmounts[m] || 0}
                          onChange={(e) => handleMemberAmountChange(m, e.target.value)} placeholder="0.00"
                          className="w-full px-3 py-2 rounded-xl text-xs font-mono-custom outline-none"
                          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs mt-2 font-mono-custom" style={{ color: 'var(--text-secondary)' }}>
                    Assigned: ₹{Object.values(memberAmounts).reduce((s, v) => s + v, 0).toFixed(2)}
                  </p>
                </div>

                <button type="submit" disabled={isSubmitting}
                  className="w-full py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                  style={{ background: isSubmitting ? 'var(--text-muted)' : 'var(--amber)', color: '#111', cursor: isSubmitting ? 'not-allowed' : 'pointer' }}>
                  {isSubmitting ? (
                    <><Plus className="h-4 w-4 animate-spin" /> Saving…</>
                  ) : (
                    editExpenseId ? "Update Expense" : "Add Expense"
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Activity Logs Drawer */}
      {showActivityDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowActivityDrawer(false)} />
          <div className="relative w-full sm:w-[400px] h-full overflow-y-auto slide-in"
            style={{ background: 'var(--bg-card)', borderLeft: '1px solid var(--border)' }}>
            <div className="sticky top-0 flex items-center justify-between px-6 py-4"
              style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
              <h2 className="font-display text-lg font-semibold" style={{ color: 'var(--cream)' }}>Activity Logs</h2>
              <button onClick={() => setShowActivityDrawer(false)} className="text-xs px-3 py-1.5 rounded-lg"
                style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}>Close</button>
            </div>
            <div className="p-6">
              {activityLogs.length === 0 ? (
                <p className="text-sm italic text-center py-12" style={{ color: 'var(--text-muted)' }}>No activity yet.</p>
              ) : (
                <ol className="space-y-4">
                  {activityLogs.map((log) => (
                    <li key={log.id} className="relative pl-4" style={{ borderLeft: '2px solid var(--border)' }}>
                      <p className="text-sm whitespace-pre-line leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{log.message}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs font-medium" style={{ color: 'var(--amber)' }}>{log.created_by}</span>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                      {log.split_details && (
                        <div className="mt-2 space-y-0.5">
                          {Object.entries(log.split_details).map(([name, amt]) => (
                            <div key={name} className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                              <span style={{ color: 'var(--amber)' }}>·</span> {name}: ₹{amt}
                            </div>
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrackExpenses;

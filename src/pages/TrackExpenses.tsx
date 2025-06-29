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


  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto p-4 flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full">
            <h1 className="text-2xl font-bold text-blue-600">
              {selectedTrip ? selectedTrip.tripName : "Travel Budget Tracker"}
            </h1>
            {selectedTrip && (
              <span className="text-sm text-gray-500 font-medium mt-1 sm:mt-0 sm:ml-4">
                {format(new Date(selectedTrip.startDate), "MMM d")} – {format(new Date(selectedTrip.endDate), "MMM d, yyyy")}
              </span>
            )}
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {loadingTrips ? (
          <>
            <LoadingSpinner />
            <p className="text-center text-gray-500 text-lg">Loading trip data... please wait.</p>
          </>
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
            {selectedTripId && tripDetailsLoading ? (
              <LoadingSpinner />
            ) : selectedTrip ? (
              <>
                <div className="grid md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader className="bg-blue-600 text-white">
                      <CardTitle>Budget vs Spend</CardTitle>
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

                  <Card>
                    <CardHeader className="bg-blue-600 text-white">
                      <CardTitle>Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="divide-y divide-gray-200">
                        {expenseBreakdown.map((item, index) => (
                          <div key={item.type} className="flex justify-between items-center py-2">
                            <span className="font-semibold text-sm text-gray-700">{item.type}</span>
                            <div className="flex items-center space-x-4">
                              <div className={`px-2 py-1 rounded text-white text-xs font-semibold ${index === 0 ? 'bg-blue-500' :
                                index === 1 ? 'bg-green-500' :
                                  index === 2 ? 'bg-red-500' :
                                    index === 3 ? 'bg-orange-500' : 'bg-gray-500'
                                }`}>
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

                <div className="grid grid-cols-2 gap-4 sm:flex sm:space-x-4 sm:space-y-0">
                  <Button onClick={() => setShowExpenseDrawer(true)} className="bg-blue-600 text-white hover:bg-blue-700">
                    + Add Expense
                  </Button>

                  <Button
                    onClick={() => setShowChatToAdd(true)}
                    className="bg-blue-600 text-white hover:bg-blue-700"
                  >
                    💬 Chat to Add
                  </Button>

                  <Button onClick={() => setShowActivityDrawer(true)} className="bg-blue-600 text-white hover:bg-blue-700">
                    🕘 Logs
                  </Button>

                  <Button onClick={() => setShowSettlement(!showSettlement)} className="bg-blue-600 text-white hover:bg-blue-700">
                    {showSettlement ? "💸 Hide Settlement" : "💸 Settle"}
                  </Button>

                  <Button onClick={exportToExcel} className="bg-blue-600 text-white hover:bg-blue-700">
                    📄 Excel
                  </Button>

                  <Button onClick={exportToPDF} className="bg-blue-600 text-white hover:bg-blue-700">
                    📄 PDF
                  </Button>

                  <Button
                    onClick={() => setShowSpendPerDate(!showSpendPerDate)}
                    className="bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    📅 View Spend by Date
                  </Button>

                  <Button
                    onClick={() => setShowMemberDNA(!showMemberDNA)}
                    className="bg-pink-600 text-white hover:bg-pink-700"
                  >
                    🧬 Member Spend DNA
                  </Button>

                </div>

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
                              <TableHead>Date</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead>Total Amount</TableHead>
                              {selectedTrip.members.map((member) => (
                                <TableHead key={member} className="text-center">{member}</TableHead>
                              ))}
                              <TableHead>Added By</TableHead>
                              <TableHead>Actions</TableHead>
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
                                    {expense.description && <div className="text-xs text-gray-500">{expense.description}</div>}
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
                              <TableCell />
                            </TableRow>
                            {showSettlement && (
                              <TableRow className="bg-yellow-50 font-semibold">
                                <TableCell colSpan={3} className="text-right">Settlement</TableCell>
                                <TableCell>₹{budgetRemaining.toFixed(2)}</TableCell>
                                {selectedTrip.members.map((member, index) => {
                                  const memberTotal = filteredExpenses.reduce(
                                    (sum, exp) => sum + (exp.memberAmounts[member] || 0), 0
                                  );
                                  const share = selectedTrip.budget / selectedTrip.members.length;
                                  const delta = +(share - memberTotal).toFixed(2);
                                  return (
                                    <TableCell key={index} className={`text-center ${delta > 0 ? "text-green-600" : "text-red-600"}`}>
                                      {delta >= 0 ? `+₹${delta.toFixed(2)}` : `-₹${Math.abs(delta).toFixed(2)}`}
                                    </TableCell>
                                  );
                                })}
                                <TableCell />
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : null}
          </>
        )}
        <div className="space-y-6 mt-6">
          {showSpendPerDate && (
            <Card className="border border-indigo-200 shadow-sm">
              <CardHeader>
                <CardTitle>📅 Total Spent Per Date</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <ul className="space-y-2">
                  {Object.entries(spendByDate).map(([date, total]) => (
                    <li key={date} className="flex justify-between border-b pb-1 text-sm">
                      <span className="text-gray-700">{date}</span>
                      <span className="font-bold text-indigo-600">₹{total.toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {showMemberDNA && (
            <Card className="border border-pink-200 shadow-sm">
              <CardHeader>
                <CardTitle>🧬 Member Spend DNA</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        {selectedTrip.expenseTypes.map((type) => (
                          <TableHead key={type} className="text-right">{type}</TableHead>
                        ))}
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(memberDNA).map(([member, breakdown]) => {
                        const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
                        return (
                          <TableRow key={member}>
                            <TableCell className="font-semibold">{member}</TableCell>
                            {selectedTrip.expenseTypes.map((type) => (
                              <TableCell key={type} className="text-right">
                                ₹{(breakdown[type] || 0).toFixed(2)}
                              </TableCell>
                            ))}
                            <TableCell className="text-right font-bold text-pink-600">₹{total.toFixed(2)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <Footer />

      {showChatToAdd && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Chat to Add Expense</h2>
              <Button variant="ghost" onClick={() => setShowChatToAdd(false)}>Close</Button>
            </div>

            <Textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              rows={3}
              className="w-full"
              placeholder="Type or modify below"
            />

            <Button
              className="mt-4 w-full bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => {
                setChatInput("Spent ₹1200 on Stay as advance at Taj for everyone");
                setShowChatToAdd(true);
              }}
            >
              Template Text
            </Button>

            <Button
              className="mt-4 w-full bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => handleChatExpenseSubmit()}
            >
              Parse & Add
            </Button>
          </div>
        </div>
      )}

      {showExpenseDrawer && (
        <div className="fixed right-0 top-0 w-full sm:w-[410px] h-full bg-white shadow-lg z-50 overflow-y-auto transition-all duration-300 border-l border-gray-300">
          <div className="flex justify-between items-center px-6 py-4 border-b">
            <h2 className="text-xl font-semibold">Add New Expense</h2>
            <Button
              variant="ghost"
              onClick={() => setShowExpenseDrawer(false)}
            >
              Close
            </Button>
          </div>

          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
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

              <div className="space-y-4">
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
                    {editExpenseId ? "Update Expense" : "Add Expense"}
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      )}

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

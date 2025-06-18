import { useState , useEffect} from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, X, ArrowLeft, Save } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useParams } from "react-router-dom";

const CreateTrip = () => {
  const { tripId: paramTripId } = useParams();
  const isEditMode = !!paramTripId;
  const navigate = useNavigate();
  const { toast } = useToast();
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

  useEffect(() => {
    const fetchTrip = async () => {
      if (isEditMode && paramTripId) {
        // const res = await fetch(`http://localhost:4000/trips/${paramTripId}`);
        const res = await fetch(`${import.meta.env.VITE_API_URL}/trips/${paramTripId}`);

        const data = await res.json();
  
        setTripId(data.trip_id);
        setTripName(data.trip_name);
        setStartDate(new Date(data.start_date));
        setEndDate(new Date(data.end_date));
        setBudget(data.budget.toString());
        setMoneyHandler(data.money_handler);
        setLocation(data.location);
        setExpenseTypes(data.expense_types || [""]);
        setExpenseTypeOptions(data.expense_type_options || {});
        setMembers(data.members || [""]);
      } else {
        const res = await fetch(`${API_BASE}/trips`);
        const trips = await res.json();
        const lastId = trips
          .map((trip: any) => trip.trip_id)
          .filter((id: string) => /^TRIP-\d{3}$/.test(id))
          .map((id: string) => parseInt(id.split("-")[1], 10))
          .sort((a, b) => b - a)[0] || 0;
  
        const nextId = String(lastId + 1).padStart(3, "0");
        setTripId(`TRIP-${nextId}`);
      }
    };
  
    fetchTrip();
  }, [isEditMode, paramTripId]);


  const addExpenseType = () => {
    setExpenseTypes([...expenseTypes, ""]);
  };

  const removeExpenseType = (index: number) => {
    if (expenseTypes.length > 1) {
      const removedType = expenseTypes[index];
      setExpenseTypes(expenseTypes.filter((_, i) => i !== index));
      // Remove options for the deleted expense type
      if (removedType) {
        const newOptions = { ...expenseTypeOptions };
        delete newOptions[removedType];
        setExpenseTypeOptions(newOptions);
      }
    }
  };

  const updateExpenseType = (index: number, value: string) => {
    const oldValue = expenseTypes[index];
    const updated = [...expenseTypes];
    updated[index] = value;
    setExpenseTypes(updated);

    // Update the options key if the expense type name changed
    if (oldValue && oldValue !== value && expenseTypeOptions[oldValue]) {
      const newOptions = { ...expenseTypeOptions };
      newOptions[value] = newOptions[oldValue];
      delete newOptions[oldValue];
      setExpenseTypeOptions(newOptions);
    }
  };

  

  const addExpenseTypeOption = (expenseType: string) => {
    setExpenseTypeOptions(prev => ({
      ...prev,
      [expenseType]: [...(prev[expenseType] || []), ""]
    }));
  };

  const removeExpenseTypeOption = (expenseType: string, optionIndex: number) => {
    setExpenseTypeOptions(prev => ({
      ...prev,
      [expenseType]: prev[expenseType]?.filter((_, i) => i !== optionIndex) || []
    }));
  };

  const updateExpenseTypeOption = (expenseType: string, optionIndex: number, value: string) => {
    setExpenseTypeOptions(prev => ({
      ...prev,
      [expenseType]: prev[expenseType]?.map((option, i) => i === optionIndex ? value : option) || []
    }));
  };

  const addMember = () => {
    setMembers([...members, ""]);
  };

  const removeMember = (index: number) => {
    if (members.length > 1) {
      setMembers(members.filter((_, i) => i !== index));
    }
  };

  const updateMember = (index: number, value: string) => {
    const updated = [...members];
    updated[index] = value;
    setMembers(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
  
    if (!tripName || !startDate || !endDate || !budget || !moneyHandler || !location) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
  
    const payload = {
      trip_id: tripId,
      trip_name: tripName,
      start_date: startDate.toISOString().split("T")[0], // YYYY-MM-DD
      end_date: endDate.toISOString().split("T")[0],
      budget: parseFloat(budget),
      money_handler: moneyHandler,
      location,
      expense_types: expenseTypes.filter((t) => t.trim() !== ""),
      expense_type_options: Object.fromEntries(
        Object.entries(expenseTypeOptions).map(([key, value]) => [
          key,
          value.filter((v) => v.trim() !== "")
        ])
      ),
      members: members.filter((m) => m.trim() !== "")
    };
  
    try {
    const response = await fetch(
      `${API_BASE}/trips${isEditMode ? `/${tripId}` : ""}`,
        {
          method: isEditMode ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );
  
      if (response.ok) {
        toast({
          title: isEditMode ? "Updated!" : "Success!",
          description: isEditMode
            ? "Trip template updated successfully"
            : "Trip template created successfully",
        });
        navigate("/");
      } else {
        throw new Error("Failed to save trip");
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to save trip template.",
        variant: "destructive",
      });
    }
  };
  

  // const handleSubmit = (e: React.FormEvent) => {
  //   e.preventDefault();
  
  //   if (!tripName || !startDate || !endDate || !budget || !moneyHandler || !location) {
  //     toast({
  //       title: "Error",
  //       description: "Please fill in all required fields",
  //       variant: "destructive",
  //     });
  //     return;
  //   }
  
  //   const tripData = {
  //     tripId,
  //     tripName,
  //     startDate: startDate.toISOString(),
  //     endDate: endDate.toISOString(),
  //     budget: parseFloat(budget),
  //     moneyHandler,
  //     location,
  //     expenseTypes: expenseTypes.filter(type => type.trim() !== ""),
  //     expenseTypeOptions: Object.fromEntries(
  //       Object.entries(expenseTypeOptions).map(([key, options]) => [
  //         key, options.filter(option => option.trim() !== "")
  //       ])
  //     ),
  //     members: members.filter(member => member.trim() !== ""),
  //     createdAt: new Date().toISOString()
  //   };
  
  //   const existingTrips = JSON.parse(localStorage.getItem("tripTemplates") || "[]");
  //   const updatedTrips = isEditMode
  //     ? existingTrips.map((t: any) => (t.tripId === tripId ? tripData : t))
  //     : [...existingTrips, tripData];
  
  //   localStorage.setItem("tripTemplates", JSON.stringify(updatedTrips));
  
  //   toast({
  //     title: isEditMode ? "Updated!" : "Success!",
  //     description: isEditMode
  //       ? "Trip template updated successfully"
  //       : "Trip template created successfully",
  //   });
  
  //   navigate("/");
  // };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate("/")}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Home</span>
            </Button>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {isEditMode ? "Update Trip Template" : "Create Trip Template"}
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <Card className="shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
            <CardTitle className="text-2xl">Trip Template Details</CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Trip ID - Read Only */}
              <div>
                <Label htmlFor="tripId" className="text-base font-semibold">Trip ID</Label>
                <Input
                  id="tripId"
                  value={tripId}
                  readOnly
                  className="mt-2 bg-gray-50 font-mono text-sm"
                />
              </div>

              {/* Trip Name */}
              <div>
                <Label htmlFor="tripName" className="text-base font-semibold">Trip Name *</Label>
                <Input
                  id="tripName"
                  value={tripName}
                  onChange={(e) => setTripName(e.target.value)}
                  placeholder="Enter trip name"
                  className="mt-2"
                  required
                />
              </div>

              {/* Date Range */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-base font-semibold">Start Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full mt-2 justify-start text-left font-normal",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "PPP") : "Pick start date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label className="text-base font-semibold">End Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full mt-2 justify-start text-left font-normal",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "PPP") : "Pick end date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                        className="pointer-events-auto"
                        disabled={(date) => startDate ? date < startDate : false}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Budget and Money Handler */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="budget" className="text-base font-semibold">Trip Budget *</Label>
                  <Input
                    id="budget"
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="Enter budget amount"
                    className="mt-2"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="moneyHandler" className="text-base font-semibold">Money Handler *</Label>
                  <Input
                    id="moneyHandler"
                    value={moneyHandler}
                    onChange={(e) => setMoneyHandler(e.target.value)}
                    placeholder="Who handles the money?"
                    className="mt-2"
                    required
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <Label htmlFor="location" className="text-base font-semibold">Trip Location *</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Enter trip location"
                  className="mt-2"
                  required
                />
              </div>

              {/* Expense Types */}
              <div>
                <Label className="text-base font-semibold">Trip Expense Types</Label>
                <div className="mt-2 space-y-3">
                  {expenseTypes.map((type, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Input
                        value={type}
                        onChange={(e) => updateExpenseType(index, e.target.value)}
                        placeholder={`Expense type ${index + 1}`}
                        className="flex-1"
                      />
                      {expenseTypes.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeExpenseType(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addExpenseType}
                    className="flex items-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Expense Type</span>
                  </Button>
                </div>
              </div>

              {/* Expense Type Options */}
              {expenseTypes.filter(type => type.trim() !== "").map((expenseType) => (
                <div key={expenseType} className="bg-gray-50 p-4 rounded-lg">
                  <Label className="text-base font-semibold">Options for "{expenseType}"</Label>
                  <div className="mt-2 space-y-3">
                    {(expenseTypeOptions[expenseType] || []).map((option, optionIndex) => (
                      <div key={optionIndex} className="flex items-center space-x-2">
                        <Input
                          value={option}
                          onChange={(e) => updateExpenseTypeOption(expenseType, optionIndex, e.target.value)}
                          placeholder={`${expenseType} option ${optionIndex + 1}`}
                          className="flex-1"
                        />
                        {(expenseTypeOptions[expenseType]?.length || 0) > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeExpenseTypeOption(expenseType, optionIndex)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addExpenseTypeOption(expenseType)}
                      className="flex items-center space-x-2"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add {expenseType} Option</span>
                    </Button>
                  </div>
                </div>
              ))}

              {/* Trip Members */}
              <div>
                <Label className="text-base font-semibold">Trip Members</Label>
                <div className="mt-2 space-y-3">
                  {members.map((member, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Input
                        value={member}
                        onChange={(e) => updateMember(index, e.target.value)}
                        placeholder={`Member ${index + 1} name`}
                        className="flex-1"
                      />
                      {members.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeMember(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addMember}
                    className="flex items-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Member</span>
                  </Button>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-6">
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 text-lg"
                >
                  <Save className="mr-2 h-5 w-5" />
                  Create Trip Template
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default CreateTrip;

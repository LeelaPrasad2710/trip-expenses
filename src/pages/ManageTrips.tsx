import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeft } from "lucide-react";

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
        const formatted = data.map((trip: any) => ({
          ...trip,
          created_by: trip.created_by || "N/A"
        }));
        setTrips(formatted);
      })
      .catch((err) => console.error("Failed to load trips:", err))
      .finally(() => setLoadingTrips(false));
  }, [location.key]);

  const deleteTrip = async (tripId: string) => {
    const confirmed = window.confirm("Are you sure you want to delete this trip?");
    if (!confirmed) return;
  
    try {
      const res = await fetch(`${API_BASE}/trips/${tripId}`, {
        method: "DELETE",
      });
  
      if (res.ok) {
        setTrips(trips.filter((t) => t.trip_id !== tripId));
        toast({
          title: "Deleted",
          description: "Trip has been deleted successfully.",
          variant: "default",
          className: "bg-green-500 text-white", // ✅ green success
        });
      } else {
        console.error("Failed to delete");
        toast({
          title: "Error",
          description: "Failed to delete the trip.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "Error",
        description: "Something went wrong while deleting the trip.",
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Manage Trips</h2>
      <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
      {loadingTrips ? (
        <p className="text-gray-500 text-center text-lg">Loading trip templates data... please wait.</p>
      ) : trips.length === 0 ? (
        <p className="text-gray-600">No trips found.</p>
      ) : (
        <div className="space-y-4">
          {trips.map((trip) => (
            <Card key={trip.trip_id} className="p-4">
              <CardContent className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold">{trip.trip_name}</h3>
                  <p className="text-sm text-gray-500">{trip.trip_id}</p>
                  <p className="text-sm text-gray-500">Created by: {trip.created_by}</p>
                </div>
                <div className="space-x-2">
                  {trip.created_by === user?.displayName || trip.created_by === user?.email ? (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => navigate(`/edit-trip/${trip.trip_id}`)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => deleteTrip(trip.trip_id)}
                      >
                        Delete
                      </Button>
                    </>
                  ) : (
                    <p className="text-xs text-gray-400 italic">You can't edit/delete this</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ManageTrips;

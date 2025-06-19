import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const ManageTrips = () => {
  const { toast } = useToast();
  const [trips, setTrips] = useState<any[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const API_BASE = import.meta.env.VITE_API_URL;

  useEffect(() => {
    setLoadingTrips(true);
    fetch(`${API_BASE}/trips`)
      .then((res) => res.json())
      .then(setTrips)
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
                </div>
                <div className="space-x-2">
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

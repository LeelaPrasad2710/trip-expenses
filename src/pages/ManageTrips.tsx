import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const ManageTrips = () => {
  const [trips, setTrips] = useState<any[]>([]);
  const navigate = useNavigate();

  // Load trips from backend
  useEffect(() => {
    fetch("http://localhost:4000/trips")
      .then((res) => res.json())
      .then(setTrips)
      .catch((err) => console.error("Failed to load trips:", err));
  }, []);

  // Delete a trip
  const deleteTrip = async (tripId: string) => {
    const confirmed = window.confirm("Are you sure you want to delete this trip?");
    if (!confirmed) return;

    try {
      const res = await fetch(`http://localhost:4000/trips/${tripId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setTrips(trips.filter((t) => t.trip_id !== tripId));
      } else {
        console.error("Failed to delete");
      }
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Manage Trips</h2>
      {trips.length === 0 ? (
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

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const ManageTrips = () => {
  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState<any[]>([]);
  const navigate = useNavigate();
  const API_BASE = import.meta.env.VITE_API_URL;

  // Load trips from backend
  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/trips`)
      .then((res) => res.json())
      .then(setTrips)
      .catch((err) => console.error("Failed to load trips:", err));
  }, []);

  // Delete a trip
  const deleteTrip = async (tripId: string) => {
    const confirmed = window.confirm("Are you sure you want to delete this trip?");
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_BASE}/trips/${tripId}`, {
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

//   return (
//     <div className="p-6 max-w-4xl mx-auto">
//       <h2 className="text-2xl font-bold mb-6">Manage Trips</h2>
//       {trips.length === 0 ? (
//         <p className="text-gray-600">No trips found.</p>
//       ) : (
//         <div className="space-y-4">
//           {trips.map((trip) => (
//             <Card key={trip.trip_id} className="p-4">
//               <CardContent className="flex justify-between items-center">
//                 <div>
//                   <h3 className="text-lg font-semibold">{trip.trip_name}</h3>
//                   <p className="text-sm text-gray-500">{trip.trip_id}</p>
//                 </div>
//                 <div className="space-x-2">
//                   <Button
//                     variant="outline"
//                     onClick={() => navigate(`/edit-trip/${trip.trip_id}`)}
//                   >
//                     Edit
//                   </Button>
//                   <Button
//                     variant="destructive"
//                     onClick={() => deleteTrip(trip.trip_id)}
//                   >
//                     Delete
//                   </Button>
//                 </div>
//               </CardContent>
//             </Card>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// };

return (
  <div className="p-6 max-w-4xl mx-auto">
    <h2 className="text-2xl font-bold mb-6">Manage Trips</h2>

    {loading ? (
      // Skeleton loader for 3 cards
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3].map((_, i) => (
          <div key={i} className="p-4 bg-gray-100 rounded-lg shadow-sm">
            <div className="h-4 bg-gray-300 rounded w-1/3 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/4"></div>
          </div>
        ))}
      </div>
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

export default ManageTrips;

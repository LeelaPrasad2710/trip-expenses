
// import { Toaster } from "@/components/ui/toaster";
// import { Toaster as Sonner } from "@/components/ui/sonner";
// import { TooltipProvider } from "@/components/ui/tooltip";
// import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// import { BrowserRouter, Routes, Route } from "react-router-dom";
// import Index from "./pages/Index";
// import CreateTrip from "./pages/CreateTrip";
// import TrackExpenses from "./pages/TrackExpenses";
// import NotFound from "./pages/NotFound";
// import ManageTrips from "./pages/ManageTrips";
// import { AuthProvider } from "./context/AuthContext";

// const queryClient = new QueryClient();

// const App = () => (
//   <AuthProvider>
//   <QueryClientProvider client={queryClient}>
//     <TooltipProvider>
//       <Toaster />
//       <Sonner />
//       <BrowserRouter>
//         <Routes>
//           <Route path="/" element={<Index />} />
//           <Route path="/create-trip" element={<CreateTrip />} />
//           <Route path="/track-expenses" element={<TrackExpenses />} />
//           <Route path="/manage-trips" element={<ManageTrips />} />
//           <Route path="/edit-trip/:tripId" element={<CreateTrip />} />
//           {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
//           <Route path="*" element={<NotFound />} />
//         </Routes>
//       </BrowserRouter>
//     </TooltipProvider>
//   </QueryClientProvider>
//   </AuthProvider>
// );

// export default App;
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import CreateTrip from "./pages/CreateTrip";
import TrackExpenses from "./pages/TrackExpenses";
import NotFound from "./pages/NotFound";
import ManageTrips from "./pages/ManageTrips";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "@/components/ui/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <AuthProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public Route */}
            <Route path="/" element={<Index />} />

            {/* Protected Routes */}
            <Route
              path="/create-trip"
              element={
                <ProtectedRoute>
                  <CreateTrip />
                </ProtectedRoute>
              }
            />
            <Route
              path="/track-expenses"
              element={
                <ProtectedRoute>
                  <TrackExpenses />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manage-trips"
              element={
                <ProtectedRoute>
                  <ManageTrips />
                </ProtectedRoute>
              }
            />
            <Route
              path="/edit-trip/:tripId"
              element={
                <ProtectedRoute>
                  <CreateTrip />
                </ProtectedRoute>
              }
            />

            {/* Catch-All */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </AuthProvider>
);

export default App;

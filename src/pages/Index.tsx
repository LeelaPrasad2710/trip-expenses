import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PlusCircle, DollarSign, MapPin, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { signInWithPopup, signOut } from "firebase/auth";
import { auth, provider } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import Footer from "@/components/ui/Footer";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Login failed:", err);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-6 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <MapPin className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Trip Expenses Manager
            </h1>
          </div>

          {/* Auth Button */}
          {user ? (
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700">
                Hello, {user.displayName}
              </span>
              <Button variant="outline" onClick={handleLogout}>
                Sign Out
              </Button>
            </div>
          ) : (
            <Button variant="outline" onClick={handleLogin}>
              Sign in with Google
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Manage Your Travel Adventures
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Create trip templates and track expenses with ease. Plan better, spend smarter, and make unforgettable memories.
          </p>
        </div>

        {user ? (
          // Logged-in view with cards
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Create Trip Template Card */}
            <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardContent className="p-8 relative z-10">
                <div className="flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-6 mx-auto group-hover:scale-110 transition-transform duration-300">
                  <PlusCircle className="h-8 w-8" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-center">Create Trip Template</h3>
                <p className="text-blue-100 text-center mb-6">
                  Set up a new trip with budget, locations, members, and expense categories
                </p>
                <Button
                  onClick={() => navigate('/create-trip')}
                  className="w-full bg-white text-blue-600 hover:bg-blue-50 font-semibold py-3 text-lg group-hover:scale-105 transition-transform duration-200"
                >
                  Start Planning
                </Button>
              </CardContent>
            </Card>

            {/* Track Expenses Card */}
            <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-purple-500 to-purple-600 text-white overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardContent className="p-8 relative z-10">
                <div className="flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-6 mx-auto group-hover:scale-110 transition-transform duration-300">
                  <DollarSign className="h-8 w-8" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-center">Track Expenses</h3>
                <p className="text-purple-100 text-center mb-6">
                  Log and monitor your trip expenses with detailed tracking and categorization
                </p>
                <Button
                  onClick={() => navigate('/track-expenses')}
                  className="w-full bg-white text-purple-600 hover:bg-purple-50 font-semibold py-3 text-lg group-hover:scale-105 transition-transform duration-200"
                >
                  Track Spending
                </Button>
              </CardContent>
            </Card>

            {/* Manage Trips Card */}
            <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-red-500 to-red-600 text-white overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-red-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardContent className="p-8 relative z-10">
                <div className="flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-6 mx-auto group-hover:scale-110 transition-transform duration-300">
                  <Calendar className="h-8 w-8" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-center">Manage Trip Templates</h3>
                <p className="text-red-100 text-center mb-6">
                  View, edit, or delete your existing trip templates
                </p>
                <Button
                  onClick={() => navigate('/manage-trips')}
                  className="w-full bg-white text-red-600 hover:bg-red-50 font-semibold py-3 text-lg group-hover:scale-105 transition-transform duration-200"
                >
                  Manage Trips
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          // Not logged in view
          <div className="text-center text-lg text-gray-500 mt-10">
            Please sign in to access trip planning features.
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Index;

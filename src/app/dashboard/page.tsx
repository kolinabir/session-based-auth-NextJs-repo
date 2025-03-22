"use client";

import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/lib/redux/store";
import { logoutUser, manualLogout } from "@/lib/redux/features/auth/authSlice";
import { useRouter } from "next/navigation";
import withAuth from "@/components/auth/withAuth";
import { useState } from "react";

function Dashboard() {
  const { user, isAuthenticated, status } = useSelector(
    (state: RootState) => state.auth
  );
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Modified logout handler for immediate redirection
  const handleLogout = () => {
    try {
      setIsLoggingOut(true);
      console.log("Starting logout process...");

      // Clear any stored authentication data
      localStorage.removeItem("auth_last_checked");

      // Immediately redirect to login page
      router.push("/auth/login");

      // Dispatch logout action after redirect is initiated
      // This ensures the UI transition happens immediately without waiting for API
      dispatch(logoutUser()).catch((error) => {
        console.error("Logout API call failed:", error);
        dispatch(manualLogout());
      });
    } catch (error) {
      console.error("Logout failed:", error);
      dispatch(manualLogout());
      router.push("/auth/login");
    }
  };

  // Add console log to check component rendering
  console.log("Dashboard rendering:", { user, isAuthenticated, status });

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <header className="bg-white dark:bg-gray-800 shadow p-4 mb-6 rounded-lg">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <div className="flex items-center">
            <span className="mr-4 text-gray-700 dark:text-gray-300">
              Welcome, {user?.name || "User"}
            </span>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className={`${
                isLoggingOut ? "bg-gray-500" : "bg-red-600 hover:bg-red-700"
              } text-white py-2 px-4 rounded-md text-sm transition-colors`}
            >
              {isLoggingOut ? "Logging out..." : "Logout"}
            </button>
          </div>
        </div>
      </header>

      <main className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
          Dashboard Content
        </h2>

        <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-6 flex flex-col gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
            <h3 className="font-medium mb-2 text-blue-800 dark:text-blue-300">
              Authentication Details
            </h3>
            <p>
              Status: <span className="font-mono">{status}</span>
            </p>
            <p>
              Authenticated:{" "}
              <span className="font-mono">
                {isAuthenticated ? "Yes" : "No"}
              </span>
            </p>
            <p>
              User ID:{" "}
              <span className="font-mono">{user?._id || "Not available"}</span>
            </p>
          </div>

          <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg">
            <h3 className="font-medium mb-2 text-green-800 dark:text-green-300">
              User Information
            </h3>
            <p>
              Name:{" "}
              <span className="font-mono">{user?.name || "Not available"}</span>
            </p>
            <p>
              Email:{" "}
              <span className="font-mono">
                {user?.email || "Not available"}
              </span>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default withAuth(Dashboard);

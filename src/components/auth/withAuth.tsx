"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/redux/store";

export default function withAuth<P extends object>(
  Component: React.ComponentType<P>
) {
  return function AuthGuard(props: P) {
    const router = useRouter();
    const { isAuthenticated, status } = useSelector(
      (state: RootState) => state.auth
    );
    const [isChecking, setIsChecking] = useState(true);

    // Log component rendering for debugging
    console.log("withAuth rendering:", { isAuthenticated, status, isChecking });

    useEffect(() => {
      // Wait for authentication to finish loading
      if (status !== "loading") {
        setIsChecking(false);

        // If auth check completed and user is not authenticated, redirect
        if (status === "succeeded" && !isAuthenticated) {
          console.log("Redirecting to login - not authenticated");
          router.replace("/auth/login");
        }
      }
    }, [isAuthenticated, status, router]);

    // During initial check or loading
    if (status === "loading" || isChecking) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg text-center">
            <div className="mb-4 w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-gray-700 dark:text-gray-300">
              Checking authentication...
            </p>
          </div>
        </div>
      );
    }

    // If authenticated, render the protected component
    if (isAuthenticated) {
      console.log("Rendering authenticated component");
      return <Component {...props} />;
    }

    // If authentication check is complete but not authenticated
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg text-center">
          <p className="text-gray-700 dark:text-gray-300">
            Please log in to access this page
          </p>
          <button
            onClick={() => router.push("/auth/login")}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
          >
            Go to login
          </button>
        </div>
      </div>
    );
  };
}

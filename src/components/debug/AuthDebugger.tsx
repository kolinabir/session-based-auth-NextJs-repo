"use client";

import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/lib/redux/store";
import {
  checkAuthStatus,
  setAuthenticated,
} from "@/lib/redux/features/auth/authSlice";
import { useState } from "react";

export default function AuthDebugger() {
  const { isAuthenticated, user, status, error } = useSelector(
    (state: RootState) => state.auth
  );
  const dispatch = useDispatch<AppDispatch>();
  const [isOpen, setIsOpen] = useState(false);

  if (!process.env.NODE_ENV || process.env.NODE_ENV === "development") {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-gray-800 text-white p-2 rounded-full shadow-lg"
        >
          {isOpen ? "Close" : "Debug"}
        </button>

        {isOpen && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 mt-2 w-80">
            <h3 className="font-bold mb-2 text-gray-900 dark:text-white">
              Auth State Debugger
            </h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-semibold">Status:</span> {status}
              </div>
              <div>
                <span className="font-semibold">Authenticated:</span>{" "}
                {isAuthenticated ? "Yes" : "No"}
              </div>
              <div>
                <span className="font-semibold">User:</span>{" "}
                {user ? user.name : "None"}
              </div>
              {error && (
                <div className="text-red-500">
                  <span className="font-semibold">Error:</span> {error}
                </div>
              )}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => dispatch(checkAuthStatus())}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs"
                >
                  Check Auth
                </button>
                <button
                  onClick={() => dispatch(setAuthenticated(!isAuthenticated))}
                  className="bg-purple-500 hover:bg-purple-600 text-white px-2 py-1 rounded text-xs"
                >
                  Toggle Auth
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null; // Don't render in production
}

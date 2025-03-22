"use client";

import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/lib/redux/store";
import { checkAuthStatus } from "@/lib/redux/features/auth/authSlice";

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const dispatch = useDispatch<AppDispatch>();
  const [initialized, setInitialized] = useState(false);

  // Check auth status once on initial load
  useEffect(() => {
    if (!initialized) {
      console.log("AuthProvider: Initializing auth check");

      dispatch(checkAuthStatus()).finally(() => {
        console.log("AuthProvider: Auth check complete");
        setInitialized(true);
      });
    }
  }, [dispatch, initialized]);

  return <>{children}</>;
}

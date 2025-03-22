import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// Configure axios to include credentials for cross-origin requests
axios.defaults.withCredentials = true;

// Types
interface User {
  id: string;
  email: string;
  name: string;
  skillLevel?: string;
  preferredLanguages?: string[];
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  status: "idle",
  error: null,
};

// Optimized auth check thunk with debouncing mechanism
let authCheckPromise: Promise<any> | null = null;

export const checkAuthStatus = createAsyncThunk(
  "auth/checkStatus",
  async (_, { rejectWithValue }) => {
    try {
      // Return existing promise if one is in progress to prevent multiple simultaneous calls
      if (authCheckPromise) {
        return await authCheckPromise;
      }

      console.log("Checking auth status...");

      // Create new promise and store it
      authCheckPromise = axios.get(`${API_BASE_URL}/auth/me`);
      const response = await authCheckPromise;

      console.log("Auth check response data:", response.data);

      // Reset promise after completion
      authCheckPromise = null;

      return response.data;
    } catch (error: any) {
      console.error("Auth check error:", error.response?.data || error.message);
      authCheckPromise = null;
      return rejectWithValue(
        error.response?.data || { message: error.message }
      );
    }
  }
);

export const loginUser = createAsyncThunk(
  "auth/login",
  async (
    credentials: { email: string; password: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/login`,
        credentials
      );
      console.log("Login response:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("Login error:", error.response?.data || error.message);
      return rejectWithValue(
        error.response?.data || { message: error.message }
      );
    }
  }
);

export const registerUser = createAsyncThunk(
  "auth/register",
  async (userData: { email: string; password: string; name: string }) => {
    const response = await axios.post(
      `${API_BASE_URL}/auth/register`,
      userData
    );
    return response.data;
  }
);

// Updated logout thunk with better error handling
export const logoutUser = createAsyncThunk(
  "auth/logout",
  async (_, { rejectWithValue }) => {
    try {
      console.log("Logging out user...");
      const response = await axios.get(`${API_BASE_URL}/auth/logoutExtension`);
      console.log("Logout response:", response);

      // Clear any auth related data in localStorage
      localStorage.removeItem("auth_last_checked");

      return null;
    } catch (error: any) {
      console.error("Logout error:", error.response?.data || error.message);
      // Even if the server request fails, we should clear the local auth state
      return null;
    }
  }
);

// Auth slice
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    // Add method to manually set authentication state (useful for debugging)
    setAuthenticated: (state, action) => {
      state.isAuthenticated = action.payload;
      if (!action.payload) {
        state.user = null;
      }
    },
    // Manual logout for cases where the API fails
    manualLogout: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.status = "idle";
    },
  },
  extraReducers: (builder) => {
    builder
      // Check auth status cases
      .addCase(checkAuthStatus.pending, (state) => {
        state.status = "loading";
      })
      .addCase(checkAuthStatus.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.isAuthenticated =
          action.payload.authenticated || !!action.payload.user;
        state.user = action.payload.user || null;
      })
      .addCase(checkAuthStatus.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload
          ? (action.payload as any).message
          : "Authentication check failed";
        state.isAuthenticated = false;
        state.user = null;
      })

      // Login cases with improved handling
      .addCase(loginUser.pending, (state) => {
        state.status = "loading";
        state.error = null; // Clear previous errors when starting a new login attempt
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message || "Login failed";
      })

      // Register cases
      .addCase(registerUser.pending, (state) => {
        state.status = "loading";
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.isAuthenticated = true;
        state.user = action.payload.user;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message || "Registration failed";
      })

      // Updated logout cases with immediate state clearing
      .addCase(logoutUser.pending, (state) => {
        // Immediately clear auth state on logout attempt
        state.isAuthenticated = false;
        state.user = null;
        state.status = "loading";
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.isAuthenticated = false;
        state.user = null;
        state.status = "idle";
        state.error = null;
      })
      .addCase(logoutUser.rejected, (state) => {
        // Even if the server request fails, clear the auth state on the client
        state.isAuthenticated = false;
        state.user = null;
        state.status = "idle";
      });
  },
});

export const { clearError, setAuthenticated, manualLogout } = authSlice.actions;
export default authSlice.reducer;

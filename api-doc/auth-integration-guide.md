# Authentication Integration Guide for Next.js and Redux

This document outlines how to integrate the GeekForGeeks backend authentication system with a Next.js frontend application using Redux for state management.

## Table of Contents

1. [Authentication API Endpoints](#authentication-api-endpoints)
2. [Session-Based Authentication Flow](#session-based-authentication-flow)
3. [Redux Integration](#redux-integration)
4. [Next.js Implementation](#nextjs-implementation)
5. [Protected Routes](#protected-routes)
6. [Google OAuth Integration](#google-oauth-integration)
7. [Handling User Profile and Progress](#handling-user-profile-and-progress)

## Authentication API Endpoints

The authentication system exposes the following endpoints:

| Endpoint                   | Method | Description                                | Request Body                   | Response                                   |
| -------------------------- | ------ | ------------------------------------------ | ------------------------------ | ------------------------------------------ |
| `/auth/register`           | POST   | Register a new user                        | `{ email, password, name }`    | `{ success: true, user: {...} }`           |
| `/auth/login`              | POST   | Login with email and password              | `{ email, password }`          | `{ success: true, user: {...} }`           |
| `/auth/logout`             | GET    | Logout the current user                    | -                              | Redirects to frontend                      |
| `/auth/logoutExtension`    | GET    | Logout without redirect                    | -                              | Clears session cookie                      |
| `/auth/me`                 | GET    | Get current authenticated user             | -                              | `{ authenticated: boolean, user?: {...} }` |
| `/auth/forgot-password`    | POST   | Request password reset                     | `{ email }`                    | `{ message: string }`                      |
| `/auth/reset-password`     | POST   | Reset password with token                  | `{ newPassword, resetToken }`  | `{ message: string }`                      |
| `/auth/change-password`    | PUT    | Change password (authenticated)            | `{ oldPassword, newPassword }` | `{ message: string }`                      |
| `/auth/google-login`       | GET    | Initiate Google OAuth                      | -                              | Redirects to Google                        |
| `/auth/google/redirect`    | GET    | Google OAuth callback                      | -                              | Redirects to frontend                      |
| `/auth/profile`            | GET    | Get user profile (authenticated)           | -                              | User profile object                        |
| `/auth/profile`            | PUT    | Update user profile (authenticated)        | Profile fields to update       | Updated user object                        |
| `/auth/progress`           | PUT    | Update learning progress (authenticated)   | `{ courseId, progressData }`   | Updated progress object                    |
| `/auth/progress/:courseId` | GET    | Get course progress (authenticated)        | -                              | Course progress object                     |
| `/auth/progress`           | GET    | Get all progress (authenticated)           | -                              | All progress object                        |
| `/auth/languages`          | PUT    | Update preferred languages (authenticated) | `{ languages: string[] }`      | Updated languages array                    |

## Session-Based Authentication Flow

This system uses HTTP-only cookies for session management:

1. **Session Creation**: When a user logs in or registers, the server creates a session and sets an HTTP-only cookie (`connect.sid`).
2. **Authentication State**: The `/auth/me` endpoint can be used to check if a user is authenticated.
3. **Session Termination**: The `/auth/logout` endpoint destroys the session.

## Redux Integration

### Auth Slice Setup

```javascript
// authSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// Configure axios to include credentials for cross-origin requests
axios.defaults.withCredentials = true;

// Async thunks
export const checkAuthStatus = createAsyncThunk(
  "auth/checkStatus",
  async () => {
    const response = await axios.get(`${API_BASE_URL}/auth/me`);
    return response.data;
  }
);

export const loginUser = createAsyncThunk("auth/login", async (credentials) => {
  const response = await axios.post(`${API_BASE_URL}/auth/login`, credentials);
  return response.data;
});

export const registerUser = createAsyncThunk(
  "auth/register",
  async (userData) => {
    const response = await axios.post(
      `${API_BASE_URL}/auth/register`,
      userData
    );
    return response.data;
  }
);

export const logoutUser = createAsyncThunk("auth/logout", async () => {
  await axios.get(`${API_BASE_URL}/auth/logoutExtension`);
  return null;
});

export const updateUserProfile = createAsyncThunk(
  "auth/updateProfile",
  async (profileData) => {
    const response = await axios.put(
      `${API_BASE_URL}/auth/profile`,
      profileData
    );
    return response.data;
  }
);

// Auth slice
const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: null,
    isAuthenticated: false,
    status: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Check auth status
      .addCase(checkAuthStatus.pending, (state) => {
        state.status = "loading";
      })
      .addCase(checkAuthStatus.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.isAuthenticated = action.payload.authenticated;
        state.user = action.payload.user || null;
      })
      .addCase(checkAuthStatus.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
        state.isAuthenticated = false;
        state.user = null;
      })
      // Login
      .addCase(loginUser.pending, (state) => {
        state.status = "loading";
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.isAuthenticated = true;
        state.user = action.payload.user;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      })
      // Register
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
        state.error = action.error.message;
      })
      // Logout
      .addCase(logoutUser.fulfilled, (state) => {
        state.isAuthenticated = false;
        state.user = null;
      })
      // Update profile
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.user = action.payload;
      });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;
```

### Progress Slice Setup

```javascript
// progressSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export const fetchCourseProgress = createAsyncThunk(
  "progress/fetchCourseProgress",
  async (courseId) => {
    const response = await axios.get(
      `${API_BASE_URL}/auth/progress/${courseId}`
    );
    return { courseId, data: response.data };
  }
);

export const fetchAllProgress = createAsyncThunk(
  "progress/fetchAllProgress",
  async () => {
    const response = await axios.get(`${API_BASE_URL}/auth/progress`);
    return response.data;
  }
);

export const updateCourseProgress = createAsyncThunk(
  "progress/updateCourseProgress",
  async ({ courseId, progressData }) => {
    const response = await axios.put(`${API_BASE_URL}/auth/progress`, {
      courseId,
      progressData,
    });
    return response.data;
  }
);

const progressSlice = createSlice({
  name: "progress",
  initialState: {
    courses: {},
    status: "idle",
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCourseProgress.fulfilled, (state, action) => {
        const { courseId, data } = action.payload;
        state.courses[courseId] = data;
        state.status = "succeeded";
      })
      .addCase(fetchAllProgress.fulfilled, (state, action) => {
        state.courses = action.payload;
        state.status = "succeeded";
      })
      .addCase(updateCourseProgress.fulfilled, (state, action) => {
        state.courses = action.payload;
        state.status = "succeeded";
      });
  },
});

export default progressSlice.reducer;
```

### Store Configuration

```javascript
// store.js
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import progressReducer from "./progressSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    progress: progressReducer,
  },
});

export default store;
```

## Next.js Implementation

### Authentication Provider

```jsx
// components/AuthProvider.js
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { checkAuthStatus } from "../store/authSlice";

const AuthProvider = ({ children }) => {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(checkAuthStatus());
  }, [dispatch]);

  return <>{children}</>;
};

export default AuthProvider;
```

### Configure in \_app.js

```jsx
// pages/_app.js
import { Provider } from "react-redux";
import { store } from "../store";
import AuthProvider from "../components/AuthProvider";
import "../styles/globals.css";

function MyApp({ Component, pageProps }) {
  return (
    <Provider store={store}>
      <AuthProvider>
        <Component {...pageProps} />
      </AuthProvider>
    </Provider>
  );
}

export default MyApp;
```

### Login Form Component

```jsx
// components/LoginForm.js
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/router";
import { loginUser, clearError } from "../store/authSlice";

const LoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const dispatch = useDispatch();
  const router = useRouter();

  const { status, error } = useSelector((state) => state.auth);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await dispatch(loginUser({ email, password })).unwrap();
      router.push("/dashboard");
    } catch (err) {
      console.error("Failed to login:", err);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}
      <div>
        <label htmlFor="email">Email:</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <label htmlFor="password">Password:</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <button type="submit" disabled={status === "loading"}>
        {status === "loading" ? "Loading..." : "Login"}
      </button>
      <div>
        <a href="/auth/forgot-password">Forgot password?</a>
      </div>
      <div>
        <a href="/api/auth/google-login">Login with Google</a>
      </div>
    </form>
  );
};

export default LoginForm;
```

## Protected Routes

### Auth Guard HOC

```jsx
// components/withAuth.js
import { useEffect } from "react";
import { useRouter } from "next/router";
import { useSelector } from "react-redux";

const withAuth = (WrappedComponent) => {
  const AuthGuard = (props) => {
    const router = useRouter();
    const { isAuthenticated, status } = useSelector((state) => state.auth);

    useEffect(() => {
      // Wait until auth check is complete
      if (status !== "loading" && !isAuthenticated) {
        router.replace("/login");
      }
    }, [isAuthenticated, status, router]);

    // Show loading or null while checking auth status
    if (status === "loading" || !isAuthenticated) {
      return <div>Loading...</div>;
    }

    return <WrappedComponent {...props} />;
  };

  return AuthGuard;
};

export default withAuth;
```

### Example Protected Page

```jsx
// pages/dashboard.js
import withAuth from "../components/withAuth";
import { useSelector } from "react-redux";

const Dashboard = () => {
  const { user } = useSelector((state) => state.auth);

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome, {user?.name || "User"}</p>
      {/* Dashboard content */}
    </div>
  );
};

export default withAuth(Dashboard);
```

## Google OAuth Integration

To integrate Google OAuth authentication with your Next.js frontend:

### 1. Create API Route for Google Login

```jsx
// pages/api/auth/google-login.js
import { NextApiRequest, NextApiResponse } from "next";

export default function handler(req, res) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  res.redirect(`${apiUrl}/auth/google-login`);
}
```

### 2. Configure Environment Variables

```
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### 3. Add Google Login Button

```jsx
// components/GoogleLoginButton.js
import { useRouter } from "next/router";

const GoogleLoginButton = () => {
  const router = useRouter();

  const handleGoogleLogin = () => {
    router.push("/api/auth/google-login");
  };

  return (
    <button onClick={handleGoogleLogin} className="google-btn">
      Login with Google
    </button>
  );
};

export default GoogleLoginButton;
```

## Handling User Profile and Progress

### Profile Management Component

```jsx
// components/ProfileSettings.js
import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { updateUserProfile } from "../store/authSlice";

const ProfileSettings = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const [name, setName] = useState(user?.name || "");
  const [skillLevel, setSkillLevel] = useState(user?.skillLevel || "beginner");
  const [preferredLanguages, setPreferredLanguages] = useState(
    user?.preferredLanguages || ["bangla"]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    await dispatch(
      updateUserProfile({
        name,
        skillLevel,
        preferredLanguages,
      })
    );
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Profile Settings</h2>
      <div>
        <label htmlFor="name">Name:</label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="skillLevel">Skill Level:</label>
        <select
          id="skillLevel"
          value={skillLevel}
          onChange={(e) => setSkillLevel(e.target.value)}
        >
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>
      <div>
        <label>Preferred Languages:</label>
        <div>
          <label>
            <input
              type="checkbox"
              value="bangla"
              checked={preferredLanguages.includes("bangla")}
              onChange={(e) => {
                if (e.target.checked) {
                  setPreferredLanguages([...preferredLanguages, "bangla"]);
                } else {
                  setPreferredLanguages(
                    preferredLanguages.filter((lang) => lang !== "bangla")
                  );
                }
              }}
            />
            Bangla
          </label>
          <label>
            <input
              type="checkbox"
              value="english"
              checked={preferredLanguages.includes("english")}
              onChange={(e) => {
                if (e.target.checked) {
                  setPreferredLanguages([...preferredLanguages, "english"]);
                } else {
                  setPreferredLanguages(
                    preferredLanguages.filter((lang) => lang !== "english")
                  );
                }
              }}
            />
            English
          </label>
        </div>
      </div>
      <button type="submit">Save Changes</button>
    </form>
  );
};

export default ProfileSettings;
```

### Course Progress Component

```jsx
// components/CourseProgress.js
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchCourseProgress,
  updateCourseProgress,
} from "../store/progressSlice";

const CourseProgress = ({ courseId }) => {
  const dispatch = useDispatch();
  const progress = useSelector((state) => state.progress.courses[courseId]);

  useEffect(() => {
    dispatch(fetchCourseProgress(courseId));
  }, [dispatch, courseId]);

  const handleComplete = (lessonId) => {
    dispatch(
      updateCourseProgress({
        courseId,
        progressData: {
          completedLessons: [...(progress?.completedLessons || []), lessonId],
          lastLessonId: lessonId,
        },
      })
    );
  };

  if (!progress) return <div>Loading progress...</div>;

  return (
    <div>
      <h3>Your Progress</h3>
      <div>
        <p>Completed: {progress.completedLessons?.length || 0} lessons</p>
        <p>Last visited: Lesson {progress.lastLessonId}</p>
      </div>
      {/* Render course content with progress markers */}
    </div>
  );
};

export default CourseProgress;
```

## Conclusion

By following this guide, you can successfully integrate the GeekForGeeks authentication system with your Next.js application using Redux for state management. This integration provides a robust foundation for building authenticated web applications with features like:

1. Session-based authentication
2. Google OAuth integration
3. User profile management
4. Progress tracking
5. Protected routes

Remember to properly handle error states, loading indicators, and edge cases in your production application.


"use client";

import { useEffect, useState } from "react";
import {
    getAuth,
    signInWithPopup,
    GoogleAuthProvider,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    onAuthStateChanged
} from "firebase/auth";
import { auth } from "@/lib/firebase"; // Using configured auth instance

export default function AuthWrapper({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleGoogleLogin = async () => {
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
            setError("");
        } catch (err) {
            setError("Google Sign-In failed: " + err.message);
        }
    };

    const handleEmailLogin = async (e) => {
        e.preventDefault();
        if (!email || !password) {
            setError("Please enter email and password.");
            return;
        }
        try {
            await signInWithEmailAndPassword(auth, email, password);
            setError("");
        } catch (err) {
            if (err.code === 'auth/invalid-credential') {
                setError("Invalid email or password.");
            } else {
                setError(err.message);
            }
        }
    };

    const handleEmailSignUp = async (e) => {
        e.preventDefault();
        if (!email || !password) {
            setError("Please enter email and password.");
            return;
        }
        try {
            await createUserWithEmailAndPassword(auth, email, password);
            setError("");
            alert("Account created successfully!");
        } catch (err) {
            if (err.code === 'auth/email-already-in-use') {
                setError("Email already in use. Try signing in.");
            } else if (err.code === 'auth/weak-password') {
                setError("Password should be at least 6 characters.");
            } else {
                setError(err.message);
            }
        }
    };


    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-[#1a1d23] text-[#e8e6e3]">
                <div className="text-xl font-medium">Loading Planner...</div>
            </div>
        );
    }

    if (!user) {
        return (
            <div id="loginPage" className="login-container">
                <div className="login-card">
                    <div className="login-header">
                        <h1>Meal Planner</h1>
                        <p>Your weekly nutritional command center</p>
                    </div>

                    <div className="login-form">
                        <div className="input-group">
                            <label htmlFor="emailInput">Email</label>
                            <input
                                type="email"
                                id="emailInput"
                                placeholder="name@example.com"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="input-group">
                            <label htmlFor="passwordInput">Password</label>
                            <input
                                type="password"
                                id="passwordInput"
                                placeholder="••••••••"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        {error && <div id="loginError" className="error-msg">{error}</div>}

                        <button
                            id="emailLoginBtn"
                            className="btn btn-primary full-width"
                            onClick={handleEmailLogin}
                            style={{ marginBottom: '0.5rem' }}
                        >
                            Sign In
                        </button>
                        <button
                            id="emailSignUpBtn"
                            className="btn btn-outline full-width"
                            onClick={handleEmailSignUp}
                        >
                            Create Account
                        </button>
                    </div>

                    <div className="divider">
                        <span>or</span>
                    </div>

                    <button
                        id="googleLoginBtn"
                        className="btn btn-google full-width"
                        onClick={handleGoogleLogin}
                    >
                        <svg className="google-icon" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                            <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                                <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" />
                                <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" />
                                <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.734 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" />
                                <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.424 44.599 -10.174 45.799 L -6.744 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" />
                            </g>
                        </svg>
                        Sign In with Google
                    </button>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}

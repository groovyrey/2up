"use client";

import { useState } from "react";
import Image from "next/image";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "../lib/firebase"; // Keep auth for Google Sign-In
import { Container, Box, Typography, TextField, Button, Alert, Divider, InputAdornment, Paper } from "@mui/material";
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import GoogleIcon from '@mui/icons-material/Google';

import Link from "next/link";
import { useRouter } from "next/navigation"; // Import useRouter
import { useAuth } from "@/context/AuthContext"; // Import useAuth

const FIREBASE_ERROR_MESSAGES = {
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/user-not-found': 'No user found with this email.',
  'auth/wrong-password': 'Incorrect password.',
  'auth/email-already-in-use': 'This email is already in use.',
  'auth/operation-not-allowed': 'Email/password sign-in is not enabled.',
  'auth/weak-password': 'Password should be at least 6 characters.',
  'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
  'auth/cancelled-popup-request': 'Google sign-in was cancelled.',
  'auth/network-request-failed': 'Network error. Please try again.',
  // Add more as needed
};

const getFriendlyErrorMessage = (errorCode) => {
  return FIREBASE_ERROR_MESSAGES[errorCode] || `An unexpected error occurred. Please try again.`;
};

export default function LoggedOutPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const router = useRouter();
  const { refreshSession } = useAuth(); // Destructure refreshSession

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      // Use client-side Firebase to get ID token
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await userCredential.user.getIdToken();

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken }),
      });

      const data = await response.json();

      if (response.ok) {
        refreshSession(); // Refresh session after successful login
        router.push('/'); // Redirect to home page after successful login
      } else {
        setError(data.message || 'Failed to sign in.');
      }
    } catch (error) {
      setError(getFriendlyErrorMessage(error.code) || 'Network error. Please try again.');
      console.error("Sign in error:", error);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken }),
      });

      const data = await response.json();

      if (response.ok) {
        refreshSession(); // Refresh session after successful Google login
        router.push('/'); // Redirect to home page after successful login
      } else {
        setError(data.message || 'Failed to sign in with Google.');
      }
    } catch (error) {
      setError(getFriendlyErrorMessage(error.code) || 'Network error. Please try again.');
      console.error("Google sign in error:", error);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Paper elevation={3} sx={{ p: 4, mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Image
          src="/2up-logo.png"
          alt="2up logo"
          width={100}
          height={100}
        />
        <Typography component="h1" variant="h5" sx={{ mt: 2 }}>
          Welcome Back!
        </Typography>
        <Box component="form" sx={{ mt: 1 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EmailIcon />
                </InputAdornment>
              ),
            }}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockIcon />
                </InputAdornment>
              ),
            }}
          />
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 1 }}
            onClick={handleSignIn}
          >
            Sign In
          </Button>
          <Link href="/signup" passHref>
            <Button
              fullWidth
              variant="outlined"
              sx={{ mb: 2 }}
            >
              Don't have an account? Sign Up
            </Button>
          </Link>
          <Divider>OR</Divider>
          <Button
            fullWidth
            variant="contained"
            color="secondary"
            sx={{ mt: 2 }}
            onClick={handleGoogleSignIn}
            startIcon={<GoogleIcon />}
          >
            Sign In with Google
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}

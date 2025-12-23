"use client";

import { useState } from "react";
import { auth } from "../lib/firebase";
import {
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { Container, Box, Typography, TextField, Button, Alert, InputAdornment } from "@mui/material";
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import ThemeSwitcher from "./ThemeSwitcher";
import Link from "next/link";

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

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      setError(getFriendlyErrorMessage(error.code));
      console.error("Sign up error:", error);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <ThemeSwitcher />
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography component="h1" variant="h5">
          Sign Up
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
            autoComplete="new-password"
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
            onClick={handleSignUp}
          >
            Sign Up
          </Button>
          <Link href="/" passHref>
            <Button
              fullWidth
              variant="outlined"
              sx={{ mb: 2 }}
            >
              Back to Sign In
            </Button>
          </Link>
        </Box>
      </Box>
    </Container>
  );
}

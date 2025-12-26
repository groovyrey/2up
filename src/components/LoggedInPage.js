"use client";

import { useAuth } from "../context/AuthContext";
import {
  Container,
  Box,
  Typography,
  Button,
  Paper,
  Avatar,
  CircularProgress,
  Alert
} from "@mui/material";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoggedInPage() {
  const { user, profile } = useAuth();
  const router = useRouter();

  if (!user) {
    return null; // Or a redirect, though page.js should handle this
  }

  return (
    <Container component="main" maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: { xs: 2, sm: 4 }, mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar 
          sx={{ width: 64, height: 64 }} 
          src={profile?.photoURL || user?.photoURL || ''}
        >
          {profile?.displayName?.[0].toUpperCase() || user?.email?.[0].toUpperCase()}
        </Avatar>
        <Box>
          <Typography component="h1" variant="h4">
            Welcome, {profile?.displayName || user?.email}!
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Ready to play?
          </Typography>
        </Box>
        <Box sx={{ flexGrow: 1 }} />
        <Button
          variant="outlined"
          onClick={() => router.push(`/profile/${user?.uid}`)}
        >
          View Profile
        </Button>
      </Paper>
    </Container>
  );
}

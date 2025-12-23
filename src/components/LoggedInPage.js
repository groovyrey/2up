"use client";

import { useAuth } from "../context/AuthContext";
import { auth } from "../lib/firebase";
import { signOut } from "firebase/auth";
import { Container, Box, Typography, Button } from "@mui/material";
import ThemeSwitcher from "./ThemeSwitcher";

export default function LoggedInPage() {
  const { user } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Sign out error:", error);
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
          Welcome!
        </Typography>
        {user && <Typography sx={{ mt: 2 }}>You are signed in as {user.email}</Typography>}
        <Button
          fullWidth
          variant="contained"
          sx={{ mt: 3, mb: 2 }}
          onClick={handleSignOut}
        >
          Sign Out
        </Button>
      </Box>
    </Container>
  );
}

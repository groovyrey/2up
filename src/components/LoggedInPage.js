"use client";

import { useAuth } from "../context/AuthContext";
import { Container, Box, Typography, Button, Paper, Avatar } from "@mui/material";
import Link from "next/link";
import { useRouter } from "next/navigation"; // Import useRouter

export default function LoggedInPage() {
  const { user, profile } = useAuth();
  const router = useRouter();

  return (
    <Container component="main" maxWidth="sm">
      <Paper elevation={3} sx={{ p: 4, mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
          {profile?.displayName?.[0].toUpperCase() || user?.email?.[0].toUpperCase()}
        </Avatar>
        <Typography component="h1" variant="h5">
          Welcome, {profile?.displayName || user?.email}!
        </Typography>
        {user && <Typography sx={{ mt: 2 }}>You are signed in as {profile?.displayName || user?.email}</Typography>}
        <Link href={`/profile/${user?.uid}`} passHref>
          <Button
            fullWidth
            variant="outlined"
            sx={{ mt: 3, mb: 1 }}
          >
            View Profile
          </Button>
        </Link>
      </Paper>
    </Container>
  );
}

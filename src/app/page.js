"use client";

import { useAuth } from "../context/AuthContext";
import LoggedInPage from "../components/LoggedInPage";
import LoggedOutPage from "../components/LoggedOutPage";
import LoadingAnimation from "../components/LoadingAnimation";
import { Box } from "@mui/material";
import MainLayout from "@/components/MainLayout";

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          minHeight: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <LoadingAnimation />
      </Box>
    );
  }

  return (
    <>
      {user ? <MainLayout><LoggedInPage /></MainLayout> : <LoggedOutPage />}
    </>
  );
}

"use client";

import Image from "next/image";
import { Box, Typography, Button, Container } from "@mui/material";
import Link from "next/link";

export default function LoggedOutPage() {
  return (
    <Container
      component="main"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 64px)', // Adjust for AppBar height if present
        textAlign: 'center',
        p: 3,
      }}
    >
      <Image
        src="/2up-logo.png"
        alt="2up logo"
        width={120}
        height={120}
        priority
      />
      <Typography component="h1" variant="h4" sx={{ mt: 3, mb: 1 }}>
        Welcome to 2UP
      </Typography>
      <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
        The ultimate platform for head-to-head gaming.
      </Typography>
      <Button
        variant="contained"
        size="large"
        component={Link}
        href="/login"
        sx={{ mb: 2 }}
      >
        Sign In
      </Button>
      <Button
        variant="outlined"
        size="large"
        component={Link}
        href="/signup"
      >
        Sign Up
      </Button>
    </Container>
  );
}
"use client";

import * as React from 'react';
import { AppBar, Toolbar, Typography, Box, Button } from '@mui/material';
import ThemeSwitcher from './ThemeSwitcher';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';

export default function AppAppBar() {
  const { user, logout } = useAuth();

  return (
    <AppBar position="static">
      <Toolbar>
        <Link href="/" passHref>
          <Box sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
            <Image src="/2up-logo.png" alt="2up logo" width={40} height={40} />
          </Box>
        </Link>
        <Box sx={{ flexGrow: 1 }} />
        {user && (
          <Button color="inherit" onClick={logout}>
            Sign Out
          </Button>
        )}
        <ThemeSwitcher />
      </Toolbar>
    </AppBar>
  );
}

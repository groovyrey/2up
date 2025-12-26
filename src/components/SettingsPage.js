"use client";

import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Container, Paper, TextField, Button, Alert, CircularProgress,
  Card, CardContent, CardHeader, List, ListItem, ListItemIcon, ListItemText, Divider,
  Switch, FormControlLabel
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import EditIcon from '@mui/icons-material/Edit';
import PersonIcon from '@mui/icons-material/Person'; // For display name icon
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import ThemeSwitcher from './ThemeSwitcher';

export default function SettingsPage() {
  const { user, profile, refreshSession } = useAuth();
  const [newDisplayName, setNewDisplayName] = useState('');
  const [isEditingDisplayName, setIsEditingDisplayName] = useState(false);
  const [displayNameError, setDisplayNameError] = useState('');
  const [displayNameSuccess, setDisplayNameSuccess] = useState('');
  const [isUpdatingDisplayName, setIsUpdatingDisplayName] = useState(false);

  const [hideEmail, setHideEmail] = useState(false);
  const [isUpdatingHideEmail, setIsUpdatingHideEmail] = useState(false);
  const [hideEmailError, setHideEmailError] = useState('');
  const [hideEmailSuccess, setHideEmailSuccess] = useState('');

  useEffect(() => {
    if (profile?.displayName) {
      setNewDisplayName(profile.displayName);
    }
    if (profile?.hideEmail !== undefined) {
      setHideEmail(profile.hideEmail);
    }
  }, [profile?.displayName, profile?.hideEmail]);

  const validateDisplayName = (name) => {
    if (!name) {
      return 'Display name cannot be empty.';
    }
    if (name.length < 3) {
      return 'Display name must be at least 3 characters long.';
    }
    if (name.length > 20) {
      return 'Display name cannot exceed 20 characters.';
    }
    if (!/^[a-zA-Z0-9\s]+$/.test(name)) {
      return 'Display name can only contain letters, numbers, and spaces.';
    }
    return '';
  };

  const handleUpdateDisplayName = async () => {
    setDisplayNameError('');
    setDisplayNameSuccess('');
    const validationMessage = validateDisplayName(newDisplayName);
    if (validationMessage) {
      setDisplayNameError(validationMessage);
      return;
    }

    if (newDisplayName === profile?.displayName) {
      setDisplayNameError('Display name is the same as current.');
      setIsEditingDisplayName(false);
      return;
    }

    setIsUpdatingDisplayName(true);
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ displayName: newDisplayName }),
      });

      const data = await response.json();

      if (response.ok) {
        setDisplayNameSuccess('Display name updated successfully!');
        setIsEditingDisplayName(false);
        refreshSession(); // Refresh session to update context
      } else {
        setDisplayNameError(data.error || 'Failed to update display name.');
      }
    } catch (error) {
      console.error('Error updating display name:', error);
      setDisplayNameError('An unexpected error occurred.');
    } finally {
      setIsUpdatingDisplayName(false);
    }
  };

  const handleUpdateHideEmail = async (event) => {
    const newHideEmailValue = event.target.checked;
    setHideEmail(newHideEmailValue);
    setHideEmailError('');
    setHideEmailSuccess('');
    setIsUpdatingHideEmail(true);

    try {
      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ hideEmail: newHideEmailValue }),
      });

      const data = await response.json();

      if (response.ok) {
        setHideEmailSuccess('Email visibility updated successfully!');
        refreshSession(); // Refresh session to update context
      } else {
        setHideEmailError(data.error || 'Failed to update email visibility.');
        setHideEmail(!newHideEmailValue); // Revert UI on error
      }
    } catch (error) {
      console.error('Error updating email visibility:', error);
      setHideEmailError('An unexpected error occurred.');
      setHideEmail(!newHideEmailValue); // Revert UI on error
    } finally {
      setIsUpdatingHideEmail(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom color="text.primary">
        Settings
      </Typography>

      <Card sx={{ mt: 4 }}>
        <CardHeader title="Profile Settings" />
        <CardContent>
          <List>
            <ListItem sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', p: 0 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', pr: 2 }}>
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <PersonIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Display Name"
                  secondary={profile?.displayName || 'Not set'}
                  sx={{ flexGrow: 1 }}
                />
                {!isEditingDisplayName ? (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      setIsEditingDisplayName(true);
                      setDisplayNameError('');
                      setDisplayNameSuccess('');
                    }}
                    disabled={isUpdatingDisplayName}
                    startIcon={<EditIcon />}
                  >
                    Edit
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleUpdateDisplayName}
                    disabled={isUpdatingDisplayName}
                    startIcon={isUpdatingDisplayName ? <CircularProgress size={20} color="inherit" /> : null}
                  >
                    {isUpdatingDisplayName ? 'Saving...' : 'Save'}
                  </Button>
                )}
              </Box>
              {isEditingDisplayName && (
                <Box sx={{ width: '100%', mt: 2, pl: '40px' }}> {/* Adjust padding to align with ListItemText */}
                  <TextField
                    label="New Display Name"
                    variant="outlined"
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    fullWidth
                    disabled={isUpdatingDisplayName}
                    error={!!displayNameError}
                    helperText={displayNameError}
                    size="small"
                  />
                  <Button
                    variant="text"
                    color="secondary"
                    onClick={() => {
                      setIsEditingDisplayName(false);
                      setNewDisplayName(profile?.displayName || '');
                      setDisplayNameError('');
                      setDisplayNameSuccess('');
                    }}
                    sx={{ mt: 1 }}
                  >
                    Cancel
                  </Button>
                </Box>
              )}
              {displayNameSuccess && (
                <Alert icon={<CheckCircleOutlineIcon fontSize="inherit" />} severity="success" sx={{ mt: 2, width: '100%' }}>
                  {displayNameSuccess}
                </Alert>
              )}
              {displayNameError && !isEditingDisplayName && (
                <Alert icon={<ErrorOutlineIcon fontSize="inherit" />} severity="error" sx={{ mt: 2, width: '100%' }}>
                  {displayNameError}
                </Alert>
              )}
            </ListItem>
            <Divider component="li" sx={{ my: 2 }} />
            {/* Other profile settings can go here */}
          </List>
        </CardContent>
      </Card>

      <Card sx={{ mt: 4 }}>
        <CardHeader title="Privacy & Security" />
        <CardContent>
          <List>
            <ListItem>
              <ListItemIcon>
                {hideEmail ? <VisibilityOffIcon /> : <VisibilityIcon />}
              </ListItemIcon>
              <ListItemText id="switch-list-label-hide-email" primary="Hide Email on Profile" />
              <FormControlLabel
                control={
                  <Switch
                    edge="end"
                    onChange={handleUpdateHideEmail}
                    checked={hideEmail}
                    disabled={isUpdatingHideEmail}
                    inputProps={{
                      'aria-labelledby': 'switch-list-label-hide-email',
                    }}
                  />
                }
                label=""
                labelPlacement="start"
              />
              {isUpdatingHideEmail && <CircularProgress size={20} sx={{ ml: 1 }} />}
            </ListItem>
            {hideEmailSuccess && (
              <Alert icon={<CheckCircleOutlineIcon fontSize="inherit" />} severity="success" sx={{ mt: 2, width: '100%' }}>
                {hideEmailSuccess}
              </Alert>
            )}
            {hideEmailError && (
              <Alert icon={<ErrorOutlineIcon fontSize="inherit" />} severity="error" sx={{ mt: 2, width: '100%' }}>
                {hideEmailError}
              </Alert>
            )}
            {/* Future privacy and security settings options will go here */}
          </List>
        </CardContent>
      </Card>

      <Card sx={{ mt: 4 }}>
        <CardHeader title="Appearance Settings" />
        <CardContent>
          <List>
            <ListItem>
              <ListItemText id="theme-switcher-label" primary="Dark Mode" />
              <ThemeSwitcher />
            </ListItem>
          </List>
        </CardContent>
      </Card>
    </Container>
  );
}

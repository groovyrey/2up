import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Box
} from '@mui/material';

export default function PasswordModal({ isOpen, onClose, onSubmit, error, isLoading }) {
  const [password, setPassword] = useState('');
  const [internalError, setInternalError] = useState('');

  useEffect(() => {
    if (error) {
      setInternalError(error);
    } else {
      setInternalError('');
    }
  }, [error]);

  const handleSubmit = () => {
    if (!password) {
      setInternalError('Password cannot be empty.');
      return;
    }
    setInternalError('');
    onSubmit(password);
  };

  const handleClose = () => {
    setPassword('');
    setInternalError('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>Enter Lobby Password</DialogTitle>
      <DialogContent>
        {internalError && <Alert severity="error" sx={{ mb: 2 }}>{internalError}</Alert>}
        <TextField
          autoFocus
          margin="dense"
          label="Password"
          type="password"
          fullWidth
          variant="outlined"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleSubmit();
            }
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="secondary" disabled={isLoading}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} color="primary" variant="contained" disabled={isLoading}>
          {isLoading ? <CircularProgress size={24} /> : 'Join'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

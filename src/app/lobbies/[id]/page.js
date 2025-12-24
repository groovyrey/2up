'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import LobbyRoomPage from '@/components/LobbyRoomPage';
import { CircularProgress, Box, Typography } from '@mui/material';

export default function LobbyRoom() {
  const params = useParams();
  const router = useRouter();
  const { id: lobbyId } = params;

  const [lobby, setLobby] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!lobbyId) {
      setLoading(false);
      return;
    }

    const lobbyRef = ref(db, `lobbies/${lobbyId}`);
    const unsubscribe = onValue(lobbyRef, (snapshot) => {
      if (snapshot.exists()) {
        const lobbyData = { id: snapshot.key, ...snapshot.val() };
        if (lobbyData.gameId) {
          // If gameId exists, redirect to the game page
          router.replace(`/games/${lobbyData.gameId}`);
        } else {
          setLobby(lobbyData);
        }
      } else {
        // Lobby might have been deleted (e.g., game started and lobby removed)
        // Check if a game with this lobbyId exists or just redirect to lobbies list
        // For now, redirect to lobbies list if lobby doesn't exist
        router.replace('/lobbies');
      }
      setLoading(false);
    }, (err) => {
      console.error(err);
      setError('Failed to load lobby data.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [lobbyId, router]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  if (!lobby) {
    return null; // Should be handled by redirection or error
  }

  return <LobbyRoomPage lobbyId={lobbyId} />;
}

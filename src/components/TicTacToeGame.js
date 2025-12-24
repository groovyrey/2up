'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { db, auth } from '@/lib/firebase'; // Import auth
import { ref, update, get } from 'firebase/database';
import { Container, Box, Button, Typography, Paper, Grid, CircularProgress } from '@mui/material';
import * as Ably from 'ably';

export default function TicTacToeGame({ gameId, initialGameState }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [gameState, setGameState] = useState(initialGameState);
  const channelRef = useRef(null);
  const ablyRef = useRef(null); // Ref to store the Ably client instance

  // Determine current player's mark ('X' or 'O')
  const playerIndex = gameState.players.indexOf(user?.uid);
  const currentPlayerMark = playerIndex === 0 ? 'X' : 'O';
  const opponentPlayerMark = playerIndex === 0 ? 'O' : 'X';

  useEffect(() => {
    if (!user || authLoading) return;

    const channelName = `game-${gameId}`; // Define channelName here

    const initializeAbly = async () => {
      try {
        const idToken = await auth.currentUser.getIdToken(); // Get Firebase ID token

        ablyRef.current = new Ably.Realtime({
          authUrl: '/api/create-ably-token',
          authHeaders: {
            'Authorization': `Bearer ${idToken}`
          },
          clientId: user.uid, // Set Ably clientId to Firebase UID
        });

        channelRef.current = ablyRef.current.channels.get(channelName);

        channelRef.current.subscribe('game-update', (message) => {
          setGameState(message.data);
        });

        // Fetch the latest game state from Firebase when component mounts
        // This ensures consistency if a player joins late or refreshes
        const gameRef = ref(db, `games/${gameId}`);
        get(gameRef).then((snapshot) => {
          if (snapshot.exists()) {
            setGameState(snapshot.val());
          }
        }).catch(console.error);

      } catch (error) {
        console.error("Error initializing Ably:", error);
      }
    };

    initializeAbly();

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe('game-update');
        ablyRef.current.channels.release(channelName); // channelName is now accessible
      }
      if (ablyRef.current) {
        ablyRef.current.close();
      }
    };
  }, [gameId, user, authLoading]);

  const checkWinner = (board) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
      [0, 4, 8], [2, 4, 6],           // Diagonals
    ];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a];
      }
    }
    return null;
  };

  const handleCellClick = async (index) => {
    if (!user || authLoading || gameState.winner || gameState.status !== 'playing') return;
    if (gameState.board[index] !== null) return; // Cell already taken
    if (gameState.currentPlayer !== user.uid) return; // Not current player's turn

    const newBoard = [...gameState.board];
    newBoard[index] = currentPlayerMark; // 'X' or 'O'

    const winner = checkWinner(newBoard);
    const moves = gameState.moves + 1;
    const isDraw = !winner && moves === 9;

    const nextPlayerIndex = (gameState.players.indexOf(user.uid) + 1) % gameState.players.length;
    const nextPlayerUid = gameState.players[nextPlayerIndex];

    const updatedGameState = {
      ...gameState,
      board: newBoard,
      moves: moves,
      currentPlayer: winner || isDraw ? null : nextPlayerUid,
      winner: winner,
      status: winner || isDraw ? 'finished' : 'playing',
    };

    // Update Firebase
    const gameRef = ref(db, `games/${gameId}`);
    await update(gameRef, updatedGameState);

    // Publish update to Ably
    if (channelRef.current) {
      channelRef.current.publish('game-update', updatedGameState);
    }
  };

  const renderSquare = (index) => (
    <Button
      variant="outlined"
      sx={{
        width: '80px',
        height: '80px',
        fontSize: '2.5rem',
        fontWeight: 'bold',
        color: (theme) => gameState.board[index] === 'X' ? theme.palette.primary.main : theme.palette.secondary.main,
      }}
      onClick={() => handleCellClick(index)}
      disabled={!user || authLoading || gameState.winner || gameState.status !== 'playing' || gameState.board[index] !== null || gameState.currentPlayer !== user?.uid}
    >
      {gameState.board[index]}
    </Button>
  );

  const getStatusMessage = () => {
    const playerXUid = gameState.players[0];
    const playerOUid = gameState.players[1];

    if (gameState.winner) {
      const winnerUid = gameState.winner === 'X' ? playerXUid : playerOUid;
      const winnerDisplayName = winnerUid === user?.uid ? user.displayName : 'Opponent';
      return `Winner: ${winnerDisplayName} (${gameState.winner})`;
    } else if (gameState.status === 'finished' && gameState.moves === 9) {
      return 'Draw!';
    } else if (gameState.status === 'playing') {
      const currentPlayerDisplayName = gameState.currentPlayer === user?.uid ? user.displayName : (gameState.currentPlayer === playerXUid ? 'Player X' : 'Player O');
      const currentPlayerSymbol = gameState.currentPlayer === user?.uid ? currentPlayerMark : (gameState.currentPlayer === playerXUid ? 'X' : 'O');
      return `Current Player: ${currentPlayerDisplayName} (${currentPlayerSymbol})`;
    }
    return 'Waiting for game to start...';
  };

  if (authLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return (
      <Container>
        <Typography variant="h5" align="center" sx={{ mt: 4 }}>
          Please log in to play.
        </Typography>
      </Container>
    );
  }

  if (!gameState || !gameState.board) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>
          Tic-Tac-Toe
        </Typography>
        <Typography variant="h6" gutterBottom>
          {getStatusMessage()}
        </Typography>
        <Box sx={{ display: 'inline-grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '5px', mt: 2 }}>
          {Array(9).fill(null).map((_, i) => renderSquare(i))}
        </Box>
        <Box sx={{ mt: 3 }}>
          <Button variant="contained" onClick={() => router.push('/lobbies')}>
            Back to Lobbies
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}

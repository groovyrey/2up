'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { db, auth } from '@/lib/firebase';
import { ref, update, get, onDisconnect, remove } from 'firebase/database';
import { Container, Box, Button, Typography, Paper, Grid, CircularProgress } from '@mui/material';
import SportsKabaddiIcon from '@mui/icons-material/SportsKabaddi';
import HardwareIcon from '@mui/icons-material/Hardware';
import DescriptionIcon from '@mui/icons-material/Description';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import * as Ably from 'ably';

export default function RockPaperScissorsGame({ gameId, initialGameState }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [gameState, setGameState] = useState(initialGameState);
  const channelRef = useRef(null);
  const ablyRef = useRef(null);

  useEffect(() => {
    if (gameState.lobbyId && gameState.players) {
      const players = Object.values(gameState.players);
      const allPlayersJoined = players.length > 0 && players.every(p => p.hasLeft === false);

      if (allPlayersJoined) {
        const lobbyRef = ref(db, `lobbies/${gameState.lobbyId}`);
        remove(lobbyRef).then(() => {
          const gameRef = ref(db, `games/${gameId}`);
          update(gameRef, { lobbyId: null });
        });
      }
    }
  }, [gameState.lobbyId, gameState.players, gameId]);

  useEffect(() => {
    if (!user || authLoading) return;

    const channelName = `game-${gameId}`;

    const initializeAbly = async () => {
      try {
        const idToken = await auth.currentUser.getIdToken();
        const ablyClient = new Ably.Realtime({
          authUrl: '/api/create-ably-token',
          authHeaders: { 'Authorization': `Bearer ${idToken}` },
          clientId: user.uid,
        });
        ablyRef.current = ablyClient;

        const channel = ablyClient.channels.get(channelName);
        channelRef.current = channel;

        channel.subscribe('game-update', (message) => {
          setGameState(message.data);
        });

        const gameRef = ref(db, `games/${gameId}`);
        const playerRef = ref(db, `games/${gameId}/players/${user.uid}`);

        onDisconnect(playerRef).update({ hasLeft: true });
        update(playerRef, { hasLeft: false });

        get(gameRef).then((snapshot) => {
          if (snapshot.exists()) {
            setGameState(snapshot.val());
          }
        });
      } catch (error) {
        console.error("Error initializing Ably:", error);
      }
    };

    initializeAbly();

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
      if (ablyRef.current) {
        ablyRef.current.close();
      }
    };
  }, [gameId, user, authLoading]);

  const handleMove = async (move) => {
    if (!user || authLoading || (gameState.moves && gameState.moves[user.uid])) return;

    const newMoves = { ...(gameState.moves || {}), [user.uid]: move };
    let updatedGameState = { ...gameState, moves: newMoves };

    const playerUids = Object.keys(gameState.players);
    const otherPlayerUid = playerUids.find(uid => uid !== user.uid);

    if (newMoves[otherPlayerUid]) {
      const myMove = newMoves[user.uid];
      const otherMove = newMoves[otherPlayerUid];
      let roundWinner = null;
      let newScores = { ...gameState.scores };

      if (myMove === otherMove) {
        roundWinner = 'draw';
      } else if (
        (myMove === 'rock' && otherMove === 'scissors') ||
        (myMove === 'scissors' && otherMove === 'paper') ||
        (myMove === 'paper' && otherMove === 'rock')
      ) {
        roundWinner = user.uid;
        newScores[user.uid]++;
      } else {
        roundWinner = otherPlayerUid;
        newScores[otherPlayerUid]++;
      }
      updatedGameState = { ...updatedGameState, roundWinner, scores: newScores };
    }

    const gameRef = ref(db, `games/${gameId}`);
    await update(gameRef, updatedGameState);
    if (channelRef.current) {
      channelRef.current.publish('game-update', updatedGameState);
    }

    if (updatedGameState.roundWinner) {
      setTimeout(async () => {
        const gameRef = ref(db, `games/${gameId}`);
        const snapshot = await get(gameRef);
        if (snapshot.exists()) {
            const latestGameState = snapshot.val();
            const playerUids = Object.keys(latestGameState.players);
            const resetState = {
                ...latestGameState,
                moves: playerUids.reduce((acc, uid) => ({ ...acc, [uid]: null }), {}),
                roundWinner: null
            };
            update(gameRef, resetState);
            if (channelRef.current) {
              channelRef.current.publish('game-update', resetState);
            }
        }
      }, 3000);
    }
  };

  const handleReturnToLobbies = async () => {
    if (!user || !gameId) return;
    const gameRef = ref(db, `games/${gameId}`);
    try {
      const snapshot = await get(gameRef);
      if (snapshot.exists()) {
        const currentGame = snapshot.val();
        const otherPlayer = Object.values(currentGame.players).find(p => p.uid !== user.uid);
        if (!otherPlayer || otherPlayer.hasLeft) {
          await remove(gameRef);
        } else {
          const playerRef = ref(db, `games/${gameId}/players/${user.uid}`);
          await update(playerRef, { hasLeft: true });
          await update(gameRef, { status: 'abandoned' });
        }
      }
      router.push('/lobbies');
    } catch (error) {
      console.error("Error handling leaving game:", error);
      router.push('/lobbies');
    }
  };

  if (authLoading || !gameState || !gameState.players) {
    return <CircularProgress />;
  }
  
  const playerUids = Object.keys(gameState.players);
  const otherPlayerUid = playerUids.find(uid => uid !== user.uid);
  const myMove = gameState.moves ? gameState.moves[user.uid] : null;
  const otherPlayerMove = otherPlayerUid && gameState.moves ? gameState.moves[otherPlayerUid] : null;

  const getMoveIcon = (move) => {
    switch (move) {
      case 'rock':
        return <HardwareIcon sx={{ mr: 1 }} />;
      case 'paper':
        return <DescriptionIcon sx={{ mr: 1 }} />;
      case 'scissors':
        return <ContentCutIcon sx={{ mr: 1 }} />;
      default:
        return null;
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 }, textAlign: 'center', backgroundColor: '#f7f9fc' }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <SportsKabaddiIcon sx={{ mr: 1, fontSize: '2rem' }} />
          Rock, Paper, Scissors
        </Typography>

        <Grid container spacing={2} justifyContent="center" alignItems="stretch" sx={{ my: 2 }}>
          {/* Player 1 Card */}
          <Grid item xs={12} sm={5}>
            <Paper elevation={2} sx={{ p: 2, height: '100%', backgroundColor: gameState.roundWinner === user.uid ? 'success.light' : 'background.paper', transition: 'background-color 0.3s' }}>
              <Typography variant="h6">{gameState.players[user.uid]?.displayName}</Typography>
              <Typography variant="h5">Score: {gameState.scores ? gameState.scores[user.uid] : 0}</Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={2} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="h4">VS</Typography>
          </Grid>

          {/* Player 2 Card */}
          <Grid item xs={12} sm={5}>
            {otherPlayerUid && (
              <Paper elevation={2} sx={{ p: 2, height: '100%', backgroundColor: gameState.roundWinner === otherPlayerUid ? 'success.light' : 'background.paper', transition: 'background-color 0.3s' }}>
                <Typography variant="h6">{gameState.players[otherPlayerUid]?.displayName}</Typography>
                <Typography variant="h5">Score: {gameState.scores ? gameState.scores[otherPlayerUid] : 0}</Typography>
              </Paper>
            )}
          </Grid>
        </Grid>

        {/* Moves Display */}
        <Box sx={{ my: 4, display: 'flex', justifyContent: 'space-around', alignItems: 'center', minHeight: '100px' }}>
          <Box>
            {myMove && getMoveIcon(myMove)}
          </Box>
          <Box>
            {otherPlayerMove && gameState.roundWinner && getMoveIcon(otherPlayerMove)}
            {otherPlayerMove && !gameState.roundWinner && <Typography variant="h5">?</Typography>}
          </Box>
        </Box>

        <Typography variant="h5" gutterBottom color="text.secondary" sx={{ my: 3, minHeight: '3rem' }}>
          {!myMove && "Choose your move!"}
          {myMove && !otherPlayerMove && "Waiting for opponent..."}
          {gameState.roundWinner && (gameState.roundWinner === 'draw' ? "It's a draw!" : `${gameState.players[gameState.roundWinner]?.displayName} wins the round!`)}
        </Typography>

        {/* Action Buttons */}
        <Box>
          {['rock', 'paper', 'scissors'].map(move => (
            <Button key={move} variant="contained" size="large" sx={{ m: 1 }} onClick={() => handleMove(move)} disabled={!!myMove}>
              {getMoveIcon(move)}
              {move}
            </Button>
          ))}
        </Box>

        <Box sx={{ mt: 4 }}>
          <Button variant="contained" color="error" onClick={handleReturnToLobbies}>
            Leave Game
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}

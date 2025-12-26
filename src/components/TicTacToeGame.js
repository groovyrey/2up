'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { db, auth } from '@/lib/firebase'; // Import auth
import { ref, update, get, onDisconnect, remove } from 'firebase/database';
import { Container, Box, Button, Typography, Paper, Grid, CircularProgress } from '@mui/material';
import GridOnIcon from '@mui/icons-material/GridOn';
import * as Ably from 'ably';

export default function TicTacToeGame({ gameId, initialGameState }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [gameState, setGameState] = useState(initialGameState);
  const channelRef = useRef(null);
  const ablyRef = useRef(null); // Ref to store the Ably client instance

  // Delete lobby once all players have joined the game
  useEffect(() => {
    if (gameState.lobbyId && gameState.players) {
      const players = Object.values(gameState.players);
      const allPlayersJoined = players.length > 0 && players.every(p => p.hasLeft === false);

      if (allPlayersJoined) {
        const lobbyRef = ref(db, `lobbies/${gameState.lobbyId}`);
        remove(lobbyRef).then(() => {
          // Remove lobbyId from game state to prevent re-deletion
          const gameRef = ref(db, `games/${gameId}`);
          update(gameRef, { lobbyId: null });
        });
      }
    }
  }, [gameState.lobbyId, gameState.players, gameId]);

  let currentPlayerMark = null;
  let opponentPlayerMark = null;

  if (user && gameState && gameState.players) {
    currentPlayerMark = gameState.players[user.uid]?.mark;
    opponentPlayerMark = currentPlayerMark === 'X' ? 'O' : 'X';
  }

  useEffect(() => {
    if (!user || authLoading) return;

    const channelName = `game-${gameId}`; // Define channelName here

    const initializeAbly = async () => {
      try {
        const idToken = await auth.currentUser.getIdToken();

        const ablyClient = new Ably.Realtime({ // Use a local variable for Ably client
          authUrl: '/api/create-ably-token',
          authHeaders: {
            'Authorization': `Bearer ${idToken}`
          },
          clientId: user.uid,
        });
        ablyRef.current = ablyClient; // Assign to ref

        const channel = ablyClient.channels.get(channelName); // Use local variable for channel
        channelRef.current = channel; // Assign to ref

        channel.subscribe('game-update', (message) => {
          setGameState(message.data);
        });

        // This ensures consistency if a player joins late or refreshes
        const gameRef = ref(db, `games/${gameId}`);
        const playerRef = ref(db, `games/${gameId}/players/${user.uid}`);

        // Set up onDisconnect to mark the player as having left
        onDisconnect(playerRef).update({ hasLeft: true });

        // Mark player as not having left when they connect
        update(playerRef, { hasLeft: false });
        get(gameRef).then((snapshot) => {
          if (snapshot.exists()) {
            const fetchedGameState = snapshot.val();
            // Ensure players have 'mark' and 'score' properties
            const updatedPlayers = {};
            Object.keys(fetchedGameState.players).forEach((uid, index) => {
              updatedPlayers[uid] = {
                ...fetchedGameState.players[uid],
                mark: fetchedGameState.players[uid].mark || (index === 0 ? 'X' : 'O'), // Assign 'X' to first player, 'O' to second if not already set
                score: fetchedGameState.players[uid].score || 0,
              };
            });
            setGameState({ ...fetchedGameState, players: updatedPlayers });
          }
        }).catch(console.error);

      } catch (error) {
        console.error("Error initializing Ably:", error);
      }
    };

    initializeAbly();

    return () => {
      const currentChannel = channelRef.current;
      const currentAbly = ablyRef.current;

      // Ably cleanup (immediate)
      if (currentChannel) {
        currentChannel.unsubscribe('game-update');
        if (currentChannel.state === 'attached' || currentChannel.state === 'attaching') {
          currentChannel.detach((err) => {
            if (err) {
              console.error(`Error detaching Ably channel ${channelName}:`, err);
            } else {
              if (currentAbly) { // Ensure currentAbly exists before releasing
                currentAbly.channels.release(channelName);
              }
            }
          });
        } else {
          if (currentAbly) { // Ensure currentAbly exists before releasing
            currentAbly.channels.release(channelName);
          }
        }
      }
      if (currentAbly) {
        currentAbly.close();
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
        return { winner: board[a], line: [a, b, c] };
      }
    }
    return null;
  };

  const handleCellClick = async (index) => {
    console.log("handleCellClick called for index:", index);
    console.log("Debug - user:", user);
    console.log("Debug - authLoading:", authLoading);
    console.log("Debug - gameState.winner:", gameState.winner);
    console.log("Debug - gameState.status:", gameState.status);
    console.log("Debug - gameState.board[index]:", gameState.board[index]);
    console.log("Debug - gameState.currentPlayer:", gameState.currentPlayer);
    console.log("Debug - user.uid:", user?.uid);

    if (!user || authLoading || gameState.winner || gameState.status !== 'playing' || gameState.overallMatchWinner) return;
    if (gameState.board[index] !== '') return; // Cell already taken (changed from null to '' due to previous fix)
    if (gameState.currentPlayer !== user.uid) return;

    const newBoard = [...gameState.board];
    newBoard[index] = currentPlayerMark; // 'X' or 'O'

    const winnerResult = checkWinner(newBoard);
    const winner = winnerResult ? winnerResult.winner : null;
    const winningLine = winnerResult ? winnerResult.line : null;
    const moves = gameState.moves + 1;
    const isDraw = !winner && moves === 9;

    const playerUids = Object.keys(gameState.players);
    const nextPlayerIndex = (playerUids.indexOf(user.uid) + 1) % playerUids.length;
    const nextPlayerUid = playerUids[nextPlayerIndex];

    let updatedPlayers = { ...gameState.players };
    let overallMatchWinner = null;

    if (winner) {
      const winnerUid = Object.keys(gameState.players).find(uid => gameState.players[uid].mark === winner);
      if (winnerUid) {
        updatedPlayers[winnerUid] = {
          ...updatedPlayers[winnerUid],
          score: (updatedPlayers[winnerUid].score || 0) + 1,
        };
        if (updatedPlayers[winnerUid].score >= 10) {
          overallMatchWinner = winnerUid;
        }
      }
    }

    const updatedGameState = {
      ...gameState,
      board: newBoard,
      moves: moves,
      currentPlayer: winner || isDraw ? null : nextPlayerUid,
      winner: winner, // This is the round winner
      winningLine: winningLine, // New property for winning line
      status: winner || isDraw ? 'finished' : 'playing',
      players: updatedPlayers, // Update players with new scores
      overallMatchWinner: overallMatchWinner, // New property for overall match winner
    };

    // Update Firebase
    const gameRef = ref(db, `games/${gameId}`);
    await update(gameRef, updatedGameState);

    // Publish update to Ably
    if (channelRef.current) {
      channelRef.current.publish('game-update', updatedGameState);
    }
  };

  const resetBoard = async () => {
    const newBoard = Array(9).fill('');
    const playerUids = Object.keys(gameState.players);
    const startingPlayerUid = playerUids[Math.floor(Math.random() * playerUids.length)]; // Randomly choose starting player

    const updatedGameState = {
      ...gameState,
      board: newBoard,
      moves: 0,
      winner: null, // Reset round winner
      winningLine: null, // Reset winning line
      status: 'playing',
      currentPlayer: startingPlayerUid,
      // Scores and overallMatchWinner persist
    };

    // If starting a new match after an overall winner, reset scores
    if (gameState.overallMatchWinner) {
      Object.keys(updatedGameState.players).forEach(uid => {
        updatedGameState.players[uid].score = 0;
      });
      updatedGameState.overallMatchWinner = null;
    }

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
      key={index}
      variant="text"
      sx={{
        width: '100px',
        height: '100px',
        fontSize: '3.5rem',
        fontWeight: 'bold',
        color: gameState.board[index] === 'X' ? 'primary.main' : 'secondary.main',
        border: '2px solid',
        borderColor: 'divider',
        borderRadius: 0,
        // Remove borders to form a grid
        borderTop: (index < 3) ? 'none' : '',
        borderBottom: (index > 5) ? 'none' : '',
        borderLeft: (index % 3 === 0) ? 'none' : '',
        borderRight: (index % 3 === 2) ? 'none' : '',
        backgroundColor: gameState.winningLine?.includes(index) ? 'success.light' : 'background.paper',
        transition: 'background-color 0.3s',
        '&:hover': {
          backgroundColor: gameState.winningLine?.includes(index) ? 'success.light' : 'action.hover',
        },
      }}
      onClick={() => handleCellClick(index)}
      disabled={!user || authLoading || !!gameState.winner || gameState.status !== 'playing' || gameState.board[index] !== '' || gameState.currentPlayer !== user?.uid || !!gameState.overallMatchWinner || gameState.status === 'abandoned'}
    >
      {gameState.board[index]}
    </Button>
  );

  const getStatusMessage = () => {
    const opponentUid = Object.keys(gameState.players).find(uid => uid !== user?.uid);
    const opponentPlayer = opponentUid ? gameState.players[opponentUid] : null;

    if (gameState.status === 'abandoned') {
      if (opponentPlayer && opponentPlayer.hasLeft) {
        return `${opponentPlayer.displayName || 'Opponent'} has left the game. You win!`;
      }
      return 'Game abandoned.';
    } else if (gameState.overallMatchWinner) {
      const winnerPlayer = gameState.players[gameState.overallMatchWinner];
      const winnerDisplayName = winnerPlayer.uid === user?.uid ? 'You' : winnerPlayer.displayName;
      return `Match Winner: ${winnerDisplayName} with ${winnerPlayer.score} wins!`;
    } else if (gameState.winner) {
      const winnerPlayer = Object.values(gameState.players).find(p => p.mark === gameState.winner);
      const winnerDisplayName = winnerPlayer.uid === user?.uid ? 'You' : winnerPlayer.displayName;
      return `Round Winner: ${winnerDisplayName} (${gameState.winner})!`;
    } else if (gameState.status === 'finished' && gameState.moves === 9) {
      return `Draw!`;
    } else if (gameState.status === 'playing') {
      const currentPlayerObject = gameState.players[gameState.currentPlayer];
      const currentPlayerDisplayName = currentPlayerObject.uid === user?.uid ? 'You' : (currentPlayerObject ? currentPlayerObject.displayName : 'Unknown Player');
      const currentPlayerSymbol = currentPlayerObject ? currentPlayerObject.mark : '';

      return `Turn: ${currentPlayerDisplayName} (${currentPlayerSymbol})`;
    }
    return 'Waiting for game to start...';
  };

  // Automatically reset the board after a round is finished
  useEffect(() => {
    if (gameState.status === 'finished' && !gameState.overallMatchWinner) {
      const timer = setTimeout(() => {
        // Ensure only one player (e.g., the host or player 'X') resets the board
        // to avoid both players trying to do it simultaneously.
        const playerX = Object.values(gameState.players).find(p => p.mark === 'X');
        if (user?.uid === playerX?.uid) {
          resetBoard();
        }
      }, 3000); // 3-second delay

      return () => clearTimeout(timer);
    }
  }, [gameState.status, gameState.overallMatchWinner, user, gameState.players]);

  // Automatically delete the game after a match is won
  useEffect(() => {
    if (gameState.overallMatchWinner) {
      const timer = setTimeout(() => {
        const gameRef = ref(db, `games/${gameId}`);
        remove(gameRef);
        router.push('/lobbies');
      }, 10000); // 10-second delay

      return () => clearTimeout(timer);
    }
  }, [gameState.overallMatchWinner, gameId, router]);

  // Automatically delete the game if all players have left
  useEffect(() => {
    if (gameState.players) {
      const players = Object.values(gameState.players);
      if (players.length > 0 && players.every(p => p.hasLeft)) {
        const gameRef = ref(db, `games/${gameId}`);
        remove(gameRef);
        router.push('/lobbies');
      }
    }
  }, [gameState.players, gameId, router]);

  // Redirect if game is abandoned and current user is the winner
  useEffect(() => {
    if (gameState.status === 'abandoned' && gameState.overallMatchWinner === user?.uid) {
      const timer = setTimeout(() => {
        router.push('/lobbies');
      }, 3000); // Redirect after 3 seconds
      return () => clearTimeout(timer);
    }
  }, [gameState.status, gameState.overallMatchWinner, user?.uid, router]);

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

  if (!gameState || !gameState.board || !gameState.players) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Define playerX and playerO here for use in JSX
  const playerX = Object.values(gameState.players).find(p => p.mark === 'X');
  const playerO = Object.values(gameState.players).find(p => p.mark === 'O');

  const handleReturnToLobbies = async () => {
    if (!user || !gameId) return;

    const gameRef = ref(db, `games/${gameId}`);
    try {
      // Get the current game state to check if the other player has left
      const snapshot = await get(gameRef);
      if (snapshot.exists()) {
        const currentGame = snapshot.val();
        const otherPlayer = Object.values(currentGame.players).find(p => p.uid !== user.uid);

        // If the other player has already left, or if there's no other player, delete the game
        if (!otherPlayer || otherPlayer.hasLeft) {
          await remove(gameRef);
        } else {
          // Otherwise, just mark this player as having left
          const playerRef = ref(db, `games/${gameId}/players/${user.uid}`);
          await update(playerRef, { hasLeft: true });
          // Also update the game status to abandoned
          await update(gameRef, { status: 'abandoned' });
        }
      }
      router.push('/lobbies');
    } catch (error) {
      console.error("Error handling leaving game:", error);
      // Even if there's an error, try to navigate to lobbies
      router.push('/lobbies');
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 }, textAlign: 'center', backgroundColor: '#f7f9fc' }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <GridOnIcon sx={{ mr: 1, fontSize: '2rem' }} />
          Tic-Tac-Toe
        </Typography>

        <Grid container spacing={2} justifyContent="center" alignItems="center" sx={{ my: 2 }}>
          <Grid item xs={5}>
            <Paper elevation={2} sx={{ p: 2, backgroundColor: gameState.currentPlayer === playerX?.uid ? 'primary.light' : 'background.paper', transition: 'background-color 0.3s' }}>
              <Typography variant="h6" sx={{ fontWeight: gameState.currentPlayer === playerX?.uid ? 'bold' : 'normal', color: gameState.currentPlayer === playerX?.uid ? 'primary.contrastText' : 'text.primary' }}>
                {playerX?.uid === user?.uid ? 'You' : playerX?.displayName} (X)
              </Typography>
              <Typography variant="h5" sx={{ color: gameState.currentPlayer === playerX?.uid ? 'primary.contrastText' : 'text.primary' }}>Score: {playerX?.score || 0}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={2}><Typography variant="h4">VS</Typography></Grid>
          <Grid item xs={5}>
            <Paper elevation={2} sx={{ p: 2, backgroundColor: gameState.currentPlayer === playerO?.uid ? 'secondary.light' : 'background.paper', transition: 'background-color 0.3s' }}>
              <Typography variant="h6" sx={{ fontWeight: gameState.currentPlayer === playerO?.uid ? 'bold' : 'normal', color: gameState.currentPlayer === playerO?.uid ? 'secondary.contrastText' : 'text.primary' }}>
                {playerO?.uid === user?.uid ? 'You' : playerO?.displayName} (O)
              </Typography>
              <Typography variant="h5" sx={{ color: gameState.currentPlayer === playerO?.uid ? 'secondary.contrastText' : 'text.primary' }}>Score: {playerO?.score || 0}</Typography>
            </Paper>
          </Grid>
        </Grid>

        <Typography variant="h5" gutterBottom color="text.secondary" sx={{ my: 3, minHeight: '3rem' }}>
          {getStatusMessage()}
        </Typography>

        <Box sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          maxWidth: '300px',
          mx: 'auto',
          border: '3px solid',
          borderColor: 'primary.main',
          borderRadius: '8px',
          overflow: 'hidden',
        }}>
          {gameState.board.map((_, i) => renderSquare(i))}
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

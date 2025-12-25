"use client";

import { useAuth } from "../context/AuthContext";
import {
  Container,
  Box,
  Typography,
  Button,
  Paper,
  Avatar,
  Grid,
  Card,
  CardContent,
  CardActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Alert
} from "@mui/material";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { ref, query, orderByChild, equalTo, get, limitToLast } from "firebase/database";
import CasinoIcon from '@mui/icons-material/Casino';
import HistoryIcon from '@mui/icons-material/History';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

export default function LoggedInPage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [lobbies, setLobbies] = useState([]);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        // Fetch lobbies
        const lobbiesRef = ref(db, 'lobbies');
        const userLobbiesQuery = query(lobbiesRef, orderByChild(`players/${user.uid}`), equalTo(null, user.uid));
        const lobbySnapshot = await get(userLobbiesQuery);
        const lobbiesData = [];
        if (lobbySnapshot.exists()) {
          lobbySnapshot.forEach(child => {
            lobbiesData.push({ id: child.key, ...child.val() });
          });
        }
        
        // A bit of a hack since we can't query for "child exists"
        const allLobbiesSnapshot = await get(lobbiesRef);
        if (allLobbiesSnapshot.exists()) {
          allLobbiesSnapshot.forEach(child => {
            const lobby = { id: child.key, ...child.val() };
            if (lobby.players && lobby.players[user.uid] && !lobbiesData.find(l => l.id === lobby.id)) {
              lobbiesData.push(lobby);
            }
          });
        }
        setLobbies(lobbiesData.slice(0, 5)); // Limit to 5

        // Fetch recent games
        const gamesRef = ref(db, 'games');
        const userGamesQuery = query(gamesRef, orderByChild(`players/${user.uid}`), limitToLast(5));
        const gameSnapshot = await get(userGamesQuery);
        const gamesData = [];
        if (gameSnapshot.exists()) {
          gameSnapshot.forEach(child => {
            gamesData.push({ id: child.key, ...child.val() });
          });
        }
        setGames(gamesData.reverse());

      } catch (err) {
        console.error(err);
        setError("Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (!user) {
    return null; // Or a redirect, though page.js should handle this
  }

  return (
    <Container component="main" maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: { xs: 2, sm: 4 }, mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar 
          sx={{ width: 64, height: 64 }} 
          src={profile?.photoURL || user?.photoURL || ''}
        >
          {profile?.displayName?.[0].toUpperCase() || user?.email?.[0].toUpperCase()}
        </Avatar>
        <Box>
          <Typography component="h1" variant="h4">
            Welcome, {profile?.displayName || user?.email}!
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Ready to play?
          </Typography>
        </Box>
        <Box sx={{ flexGrow: 1 }} />
        <Button
          variant="outlined"
          onClick={() => router.push(`/profile/${user?.uid}`)}
        >
          View Profile
        </Button>
      </Paper>

      {loading && <Box sx={{ display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>}
      {error && <Alert severity="error">{error}</Alert>}

      <Grid container spacing={3}>
        {/* Quick Actions */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Quick Actions</Typography>
              <Button
                fullWidth
                variant="contained"
                startIcon={<AddCircleOutlineIcon />}
                sx={{ mb: 2 }}
                onClick={() => router.push('/lobbies/create')}
              >
                Create Lobby
              </Button>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<CasinoIcon />}
                onClick={() => router.push('/lobbies')}
              >
                Browse Lobbies
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* My Lobbies */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>My Active Lobbies</Typography>
              {lobbies.length > 0 ? (
                <List dense>
                  {lobbies.map(lobby => (
                    <ListItem key={lobby.id} secondaryAction={
                      <Button size="small" onClick={() => router.push(`/lobbies/${lobby.id}`)}>Enter</Button>
                    }>
                      <ListItemIcon><CasinoIcon /></ListItemIcon>
                      <ListItemText primary={lobby.name} secondary={`${Object.keys(lobby.players || {}).length}/${lobby.maxPlayers} players`} />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">You are not in any active lobbies.</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Games */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Recent Games</Typography>
              {games.length > 0 ? (
                <List dense>
                  {games.map(game => (
                    <ListItem key={game.id} secondaryAction={
                      <Button size="small" onClick={() => router.push(`/games/${game.id}`)}>View</Button>
                    }>
                      <ListItemIcon>
                        {game.winner === user.uid ? <EmojiEventsIcon color="warning" /> : <HistoryIcon />}
                      </ListItemIcon>
                      <ListItemText 
                        primary={`${game.gameType} vs ${Object.values(game.players).find(p => p.uid !== user.uid)?.displayName || 'Opponent'}`}
                        secondary={`Finished on ${new Date(game.createdAt).toLocaleDateString()}`} 
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">No recent games found.</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}

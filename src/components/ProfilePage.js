"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { firestore } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Container, Box, Typography, Button, Paper, Avatar, Card, CardContent, CardHeader, List, ListItem, ListItemIcon, ListItemText } from "@mui/material";
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import CircularProgress from "@mui/material/CircularProgress"; // Keep CircularProgress for now, as it's used in the original code
import LoadingAnimation from "../components/LoadingAnimation";
import { useRouter } from "next/navigation"; // Import useRouter

export default function ProfilePage({ userId }) {
  const { user: currentUser, profile: currentUserProfile } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const fetchProfileData = async () => {
      setLoading(true);
      setError(null);

      const isCurrentUserProfile = currentUser && currentUser.uid === userId;

      if (isCurrentUserProfile && currentUserProfile) {
        setProfileData(currentUserProfile);
        setLoading(false);
        return;
      }

      try {
        const docRef = doc(firestore, "users", userId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setProfileData(docSnap.data());
        } else {
          setError("User profile not found.");
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
        setError("Failed to load profile data.");
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchProfileData();
    }
  }, [userId, currentUser, currentUserProfile]);

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          minHeight: '80vh',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <LoadingAnimation />
      </Box>
    );
  }

  if (error) {
    return (
      <Container component="main" maxWidth="sm">
        <Paper elevation={3} sx={{ p: 4, mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Typography color="error">{error}</Typography>
        </Paper>
      </Container>
    );
  }

  if (!profileData) {
    return (
      <Container component="main" maxWidth="sm">
        <Paper elevation={3} sx={{ p: 4, mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Typography>No profile data available.</Typography>
        </Paper>
      </Container>
    );
  }

  const isCurrentUserProfile = currentUser && currentUser.uid === userId;

  return (
    <Container component="main" maxWidth="sm" sx={{ mt: 4 }}>
      <Card elevation={3} sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <CardHeader
          avatar={
            <Avatar sx={{ bgcolor: 'secondary.main', width: 80, height: 80, fontSize: '2.5rem' }}>
              {profileData.displayName?.[0].toUpperCase() || profileData.email?.[0].toUpperCase()}
            </Avatar>
          }
          title={
            <Typography component="h1" variant="h5" sx={{ mt: 1 }}>
              {profileData.displayName || profileData.email}
            </Typography>
          }
          subheader={
            isCurrentUserProfile ? (
              <Typography variant="body2" color="text.secondary">
                Manage your personal information.
              </Typography>
            ) : null
          }
          sx={{ textAlign: 'center', pb: 2 }}
        />
        <CardContent sx={{ width: '100%', textAlign: 'center' }}>
          <List>
            {profileData.displayName && (
              <ListItem>
                <ListItemIcon>
                  <PersonOutlineOutlinedIcon />
                </ListItemIcon>
                <ListItemText primary="User ID" secondary={userId} />
              </ListItem>
            )}
            <ListItem>
              <ListItemIcon>
                <EmailOutlinedIcon />
              </ListItemIcon>
              <ListItemText primary="Email" secondary={profileData.email} />
            </ListItem>
            {/* Add more profile fields here as ListItems */}
          </List>
        </CardContent>
      </Card>
    </Container>
  );
}

import { NextResponse } from 'next/server';
import admin from '../../../../lib/firebaseAdmin';

export async function POST(req) {
  try {
    const { idToken } = await req.json();

    if (!idToken) {
      return NextResponse.json({ message: 'ID token is required' }, { status: 400 });
    }

    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;

    // Check if user profile exists in Firestore
    const userProfileRef = admin.firestore().collection('users').doc(uid);
    const userProfileSnap = await userProfileRef.get();

    if (!userProfileSnap.exists) {
      // Create a default profile if it doesn't exist
      // Auto-generate display name
      const defaultDisplayName = decodedToken.name || decodedToken.email.split('@')[0];

      await userProfileRef.set({
        email: decodedToken.email,
        displayName: defaultDisplayName,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // Set session expiration to 5 days. The maximum duration for a session cookie is 2 weeks.
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days

    const sessionCookie = await admin.auth().createSessionCookie(idToken, { expiresIn });

    const response = NextResponse.json({ message: 'Logged in successfully' }, { status: 200 });
    response.cookies.set('session', sessionCookie, {
      maxAge: expiresIn,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax',
    });

    return response;
  } catch (error) {
    console.error('Error logging in:', error);
    return NextResponse.json({ message: error.message || 'Something went wrong' }, { status: 500 });
  }
}

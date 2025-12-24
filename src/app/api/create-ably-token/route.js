import * as Ably from 'ably';
import { NextResponse } from 'next/server';
import admin from '@/lib/firebaseAdmin'; // Corrected import

// Initialize Ably with your API key
const ABLY_API_KEY = process.env.ABLY_API_KEY;
console.log('ABLY_API_KEY from environment:', ABLY_API_KEY ? 'Set' : 'Not Set'); // Debug log
if (!ABLY_API_KEY) {
  throw new Error('ABLY_API_KEY environment variable not set.');
}
const ably = new Ably.Rest(ABLY_API_KEY);

export async function GET(request) {
  try {
    const idToken = request.headers.get('Authorization')?.split('Bearer ')[1];

    if (!idToken) {
      return NextResponse.json({ error: 'Authorization token not provided.' }, { status: 401 });
    }

    // Verify the Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken); // Corrected usage
    const uid = decodedToken.uid;

    // Create an Ably token request
    const tokenParams = { clientId: uid };
    const tokenRequest = await ably.auth.createTokenRequest(tokenParams);

    return NextResponse.json(tokenRequest);
  } catch (error) {
    console.error('Error creating Ably token:', error);
    return NextResponse.json({ error: 'Failed to create Ably token.' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import admin from '../../../../lib/firebaseAdmin';

export async function GET(req) {
  try {
    const sessionCookie = req.cookies.get('session')?.value || '';

    if (!sessionCookie) {
      return NextResponse.json({ message: 'Unauthorized: No session cookie' }, { status: 401 });
    }

    const decodedClaims = await admin.auth().verifySessionCookie(sessionCookie, true); // Check for revoked tokens

    const userRecord = await admin.auth().getUser(decodedClaims.uid);

    // Fetch user profile from Firestore
    const userProfileSnap = await admin.firestore().collection('users').doc(userRecord.uid).get();
    const userProfile = userProfileSnap.exists ? userProfileSnap.data() : null;

    return NextResponse.json({ user: { uid: userRecord.uid, email: userRecord.email }, profile: userProfile }, { status: 200 });
  } catch (error) {
    console.error('Error verifying session cookie:', error);
    return NextResponse.json({ message: 'Unauthorized: Invalid session' }, { status: 401 });
  }
}

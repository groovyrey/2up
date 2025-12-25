import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import admin from '@/lib/firebaseAdmin';

export async function PUT(request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value || '';
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized: No session cookie' }, { status: 401 });
    }

    const decodedClaims = await admin.auth().verifySessionCookie(sessionCookie, true);
    const uid = decodedClaims.uid;

    const { displayName } = await request.json();

    // Validate displayName
    if (!displayName || displayName.length < 3 || displayName.length > 20 || !/^[a-zA-Z0-9\s]+$/.test(displayName)) {
      return NextResponse.json({ error: 'Invalid display name. Must be 3-20 alphanumeric characters and spaces.' }, { status: 400 });
    }

    // Update Firebase Auth user
    await admin.auth().updateUser(uid, { displayName });

    // Update Firestore user profile
    await admin.firestore().collection('users').doc(uid).update({ displayName });

    return NextResponse.json({ message: 'Display name updated successfully', displayName });
  } catch (error) {
    console.error('Error updating display name:', error);
    if (error.code === 'auth/session-cookie-expired') {
      return NextResponse.json({ error: 'Unauthorized: Session expired' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

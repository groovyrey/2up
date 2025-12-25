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

    const { hideEmail } = await request.json();

    if (typeof hideEmail !== 'boolean') {
      return NextResponse.json({ error: 'Invalid value for hideEmail. Must be a boolean.' }, { status: 400 });
    }

    // Update Firestore user profile
    await admin.firestore().collection('users').doc(uid).update({ hideEmail });

    return NextResponse.json({ message: 'Email visibility setting updated successfully', hideEmail });
  } catch (error) {
    console.error('Error updating email visibility setting:', error);
    if (error.code === 'auth/session-cookie-expired') {
      return NextResponse.json({ error: 'Unauthorized: Session expired' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

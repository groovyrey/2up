import { NextResponse } from 'next/server';
import admin from '../../../../lib/firebaseAdmin';

export async function POST(req) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });
    }

    const userRecord = await admin.auth().createUser({
      email,
      password,
    });

    // Auto-generate display name
    const defaultDisplayName = email.split('@')[0];

    // Store user profile in Firestore
    await admin.firestore().collection('users').doc(userRecord.uid).set({
      email: userRecord.email,
      displayName: defaultDisplayName,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ message: 'User created successfully', uid: userRecord.uid }, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ message: error.message || 'Something went wrong' }, { status: 500 });
  }
}

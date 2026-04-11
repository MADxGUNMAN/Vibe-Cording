import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
    try {
        const { email, newPassword } = await request.json() as {
            email: string;
            newPassword: string;
        };

        if (!email || !newPassword) {
            return NextResponse.json(
                { error: 'Email and new password are required' },
                { status: 400 }
            );
        }

        if (newPassword.length < 6) {
            return NextResponse.json(
                { error: 'Password must be at least 6 characters' },
                { status: 400 }
            );
        }

        // Verify that this email had a recently verified OTP (within last 10 minutes)
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        const snapshot = await getAdminDb()
            .collection('otps')
            .where('email', '==', email.toLowerCase())
            .where('type', '==', 'reset')
            .where('used', '==', true)
            .get();

        const hasRecentVerification = snapshot.docs.some(doc => {
            const data = doc.data();
            const createdAt = data.createdAt?.toDate?.() || new Date(data.createdAt);
            return createdAt >= tenMinutesAgo;
        });

        if (!hasRecentVerification) {
            return NextResponse.json(
                { error: 'OTP verification required before resetting password.' },
                { status: 403 }
            );
        }

        // Get user by email
        const userRecord = await getAdminAuth().getUserByEmail(email);

        // Update password using Firebase Admin
        await getAdminAuth().updateUser(userRecord.uid, {
            password: newPassword,
        });

        // Clean up all OTPs for this email
        const allOtps = await getAdminDb()
            .collection('otps')
            .where('email', '==', email.toLowerCase())
            .get();

        const batch = getAdminDb().batch();
        for (const doc of allOtps.docs) {
            batch.delete(doc.ref);
        }
        await batch.commit();

        return NextResponse.json({
            success: true,
            message: 'Password updated successfully',
        });
    } catch (error: unknown) {
        console.error('Reset Password Error:', error);

        const err = error as { code?: string };
        if (err.code === 'auth/user-not-found') {
            return NextResponse.json(
                { error: 'No account found with this email.' },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to reset password. Please try again.' },
            { status: 500 }
        );
    }
}

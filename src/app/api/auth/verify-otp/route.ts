import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
    try {
        const { email, otp, type } = await request.json() as {
            email: string;
            otp: string;
            type: 'signup' | 'reset';
        };

        if (!email || !otp || !type) {
            return NextResponse.json(
                { error: 'Email, OTP, and type are required' },
                { status: 400 }
            );
        }

        const now = new Date();

        // Query Firestore for valid OTPs
        const snapshot = await getAdminDb()
            .collection('otps')
            .where('email', '==', email.toLowerCase())
            .where('otp', '==', otp)
            .where('type', '==', type)
            .where('used', '==', false)
            .get();

        if (snapshot.empty) {
            return NextResponse.json(
                { error: 'Invalid verification code. Please check and try again.' },
                { status: 400 }
            );
        }

        // Find a valid (non-expired) OTP
        let validDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;

        for (const doc of snapshot.docs) {
            const data = doc.data();
            const expiresAt = data.expiresAt?.toDate?.() || new Date(data.expiresAt);

            if (expiresAt > now) {
                validDoc = doc;
                break;
            }
        }

        if (!validDoc) {
            return NextResponse.json(
                { error: 'Verification code has expired. Please request a new one.' },
                { status: 410 }
            );
        }

        // Mark OTP as used (single-use)
        await validDoc.ref.update({ used: true });

        // Clean up old OTPs for this email
        const allOtps = await getAdminDb()
            .collection('otps')
            .where('email', '==', email.toLowerCase())
            .get();

        const batch = getAdminDb().batch();
        for (const doc of allOtps.docs) {
            const data = doc.data();
            const expiresAt = data.expiresAt?.toDate?.() || new Date(data.expiresAt);
            
            // Only clean up expired OTPs or older ones. We must keep 'used: true' 
            // OTPs because the next step (like reset-password) relies on finding them
            // to authorize the action.
            if (expiresAt < now && doc.id !== validDoc?.id) {
                batch.delete(doc.ref);
            }
        }
        await batch.commit();

        return NextResponse.json({
            success: true,
            verified: true,
            message: 'Email verified successfully',
        });
    } catch (error) {
        console.error('Verify OTP Error:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred. Please try again.' },
            { status: 500 }
        );
    }
}

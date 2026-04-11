import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import resend from '@/lib/resend';

// Generate a random 6-digit OTP
function generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Rate limiting: max 3 OTPs per email per 10 minutes
async function checkRateLimit(email: string): Promise<boolean> {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const snapshot = await getAdminDb()
        .collection('otps')
        .where('email', '==', email)
        .where('createdAt', '>=', tenMinutesAgo)
        .get();

    return snapshot.size < 3;
}

// Beautiful HTML email template with Vibe Coder branding
function getOTPEmailHTML(otp: string, type: 'signup' | 'reset'): string {
    const title = type === 'signup' ? 'Verify Your Email' : 'Reset Your Password';
    const subtitle = type === 'signup'
        ? 'Welcome to Vibe Coder. Please use the verification code below to complete your registration.'
        : 'We received a request to reset your password. Use the code below to securely access your account.';

    // Vibe Coder app icon (exact same SVG as src/app/icon.svg, white stroke for gradient bg)
    const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"><path d="m21.64 3.64l-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72"/><path d="M14 7l3 3M5 6v4m14 4v4M10 2v2M7 8H3m18 8h-4M11 3H9"/></svg>`;
    const logoDataUri = `data:image/svg+xml;base64,${Buffer.from(logoSvg).toString('base64')}`;

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        </style>
    </head>
    <body style="margin:0;padding:0;background-color:#F5F5F7;font-family:'Inter',-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#F5F5F7;padding:40px 20px;">
            <tr>
                <td align="center">
                    <table width="100%" max-width="500" border="0" cellspacing="0" cellpadding="0" style="max-width:500px;background-color:#ffffff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.04);overflow:hidden;">
                        <!-- Header / Logo -->
                        <tr>
                            <td align="center" style="padding:40px 40px 24px 40px;">
                                <div style="display:inline-block;width:48px;height:48px;background:linear-gradient(135deg,#8b5cf6,#3b82f6);border-radius:12px;text-align:center;line-height:48px;margin-bottom:16px;">
                                    <img src="${logoDataUri}" alt="Vibe Coder" width="28" height="28" style="display:inline-block;vertical-align:middle;margin-top:10px;" />
                                </div>
                                <h1 style="margin:0;color:#111111;font-size:22px;font-weight:600;letter-spacing:-0.5px;">
                                    ${title}
                                </h1>
                            </td>
                        </tr>

                        <!-- Body -->
                        <tr>
                            <td align="center" style="padding:0 40px 32px 40px;">
                                <p style="margin:0 0 24px 0;color:#555555;font-size:15px;line-height:1.6;">
                                    ${subtitle}
                                </p>

                                <!-- OTP Box -->
                                <div style="background-color:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;padding:24px;margin:8px 0;text-align:center;">
                                    <span style="display:block;font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#6B7280;margin-bottom:8px;font-weight:600;">Verification Code</span>
                                    <span style="font-size:36px;font-weight:700;letter-spacing:6px;color:#111827;font-family:'Courier New',Courier,monospace;">
                                        ${otp}
                                    </span>
                                </div>

                                <p style="margin:24px 0 0 0;color:#6B7280;font-size:13px;line-height:1.5;">
                                    This code will expire in <strong style="color:#374151;font-weight:600;">5 minutes</strong>.<br>
                                    If you didn't request this code, you can safely ignore this email.
                                </p>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td align="center" style="padding:24px 40px;background-color:#FAFAFA;border-top:1px solid #F3F4F6;">
                                <p style="margin:0;color:#9CA3AF;font-size:12px;line-height:1.5;">
                                    © ${new Date().getFullYear()} Vibe Coder. All rights reserved.<br>
                                    Turn thoughts into websites instantly, with AI.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;
}

export async function POST(request: NextRequest) {
    try {
        const { email, type } = await request.json() as {
            email: string;
            type: 'signup' | 'reset';
        };

        console.log('[send-otp] Step 1: Received request', { email, type });

        if (!email || !type) {
            return NextResponse.json(
                { error: 'Email and type are required' },
                { status: 400 }
            );
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { error: 'Invalid email address' },
                { status: 400 }
            );
        }

        console.log('[send-otp] Step 2: Initializing Firebase Admin...');

        // Check rate limit
        let withinLimit = true;
        try {
            withinLimit = await checkRateLimit(email);
            console.log('[send-otp] Step 3: Rate limit check passed:', withinLimit);
        } catch (rateLimitErr) {
            console.error('[send-otp] Rate limit check failed:', rateLimitErr);
            // Skip rate limiting if Firestore index isn't set up yet
            withinLimit = true;
        }

        if (!withinLimit) {
            return NextResponse.json(
                { error: 'Too many OTP requests. Try again in a few minutes.' },
                { status: 429 }
            );
        }

        // For signup: check if email is already registered
        if (type === 'signup') {
            try {
                console.log('[send-otp] Step 4: Checking if user exists...');
                await getAdminAuth().getUserByEmail(email);
                // If we get here, the user exists
                return NextResponse.json(
                    { error: 'An account with this email already exists.' },
                    { status: 409 }
                );
            } catch (err: unknown) {
                const error = err as { code?: string };
                console.log('[send-otp] Step 4 result: user lookup error code =', error.code);
                // User not found — that's what we want for signup
                if (error.code !== 'auth/user-not-found') {
                    throw err;
                }
            }
        }

        // For reset: check if email exists
        if (type === 'reset') {
            try {
                await getAdminAuth().getUserByEmail(email);
            } catch (err: unknown) {
                const error = err as { code?: string };
                if (error.code === 'auth/user-not-found') {
                    return NextResponse.json(
                        { error: 'No account found with this email.' },
                        { status: 404 }
                    );
                }
                throw err;
            }
        }

        // Generate OTP
        const otp = generateOTP();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes

        console.log('[send-otp] Step 5: Storing OTP in Firestore...');

        // Store OTP in Firestore
        await getAdminDb().collection('otps').add({
            email: email.toLowerCase(),
            otp,
            type,
            createdAt: now,
            expiresAt,
            used: false,
        });

        console.log('[send-otp] Step 6: Sending email via Resend...');

        // Send OTP email via Resend
        const { error: sendError } = await resend.emails.send({
            from: 'Vibe Coder <noreply@gunbot.tech>',
            to: [email],
            subject: type === 'signup'
                ? `${otp} is your Vibe Coder verification code`
                : `${otp} is your password reset code`,
            html: getOTPEmailHTML(otp, type),
        });

        if (sendError) {
            console.error('[send-otp] Resend error:', sendError);
            return NextResponse.json(
                { error: 'Failed to send verification email. Please try again.' },
                { status: 500 }
            );
        }

        console.log('[send-otp] Step 7: SUCCESS! OTP sent to', email);

        return NextResponse.json({
            success: true,
            message: `Verification code sent to ${email}`,
        });
    } catch (error) {
        console.error('[send-otp] FATAL ERROR:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred. Please try again.' },
            { status: 500 }
        );
    }
}

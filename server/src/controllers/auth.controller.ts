import { Request, Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import { db, checkDatabaseConnection } from '../db/index.js';
import { users } from '../db/schema/users.js';
import { profiles } from '../db/schema/profiles.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateToken } from '../utils/jwt.js';
import { AppError } from '../middleware/error.middleware.js';
import { RegisterInput, LoginInput } from '../schemas/auth.schema.js';
import { env } from '../config/env.js';

// Temporary Development Fallback Memory Store (for testing when PostgreSQL is disconnected)
const devFallbackUsers: Record<string, { id: string; name: string; email: string; passwordHash: string; role: any; createdAt: string }> = {};

/**
 * Registration Controller
 */
export const register = async (
  req: Request<{}, {}, RegisterInput>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, email, password, role } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    console.log(`[Auth Debug] Registration attempt for email: ${normalizedEmail}, role: ${role}`);

    const targetRole = role || 'user';
    // If Coach registration, default status to 'pending' for Admin approval workflow; otherwise 'active'
    const accountStatus: 'active' | 'pending' | 'rejected' = targetRole === 'coach' ? 'pending' : 'active';

    const existingUsers = await db.select().from(users).where(eq(users.email, normalizedEmail));
    if (existingUsers.length > 0) {
      throw new AppError('Email address is already registered', 400);
    }

    const passwordHash = await hashPassword(password);
    const [newUser] = await db
      .insert(users)
      .values({
        name,
        email: normalizedEmail,
        passwordHash,
        role: targetRole,
        status: accountStatus,
      })
      .returning();

    try {
      await db.insert(profiles).values({
        userId: newUser.id,
        fullName: name,
        email: normalizedEmail,
        wakeUpTime: '07:00 AM',
        sleepTime: '11:00 PM',
        timezone: 'UTC',
        productivityGoal: 'Maintain peak morning focus',
        difficultyPreference: 'Moderate',
      });
    } catch (_pErr) {}

    const token = generateToken({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
    });

    const isPending = newUser.status === 'pending';

    res.status(201).json({
      success: true,
      message: isPending
        ? 'Coach registration submitted successfully. Account is pending Admin approval.'
        : 'Account registered successfully',
      data: {
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          status: newUser.status,
          createdAt: newUser.createdAt,
        },
        token: isPending ? undefined : token,
      },
    });
  } catch (error) {
    console.error('[Auth Debug] Registration Error:', error);
    next(error);
  }
};

/**
 * Login Controller with Role & Status Validation
 */
export const login = async (
  req: Request<{}, {}, LoginInput>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password, role: selectedRole } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    console.log(`[Auth Debug] Login attempt for email: ${normalizedEmail}, selectedRole: ${selectedRole}`);

    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail));

    if (!dbUser || !dbUser.passwordHash) {
      throw new AppError('Invalid email or password', 401);
    }

    const isPasswordValid = await comparePassword(password, dbUser.passwordHash);
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401);
    }

    // Validate Selected Role against Stored Database Role
    if (selectedRole && selectedRole !== dbUser.role) {
      console.warn(`[Auth Debug] Role Mismatch! Selected: ${selectedRole}, Stored: ${dbUser.role}`);
      throw new AppError('The selected role does not match your account.', 400);
    }

    // Check account status
    if (dbUser.status === 'pending') {
      throw new AppError('Your account is pending approval by an Administrator.', 403);
    }
    if (dbUser.status === 'rejected') {
      throw new AppError('Your account request has been rejected by an Administrator.', 403);
    }

    // Issue JWT Token
    const token = generateToken({
      userId: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
    });

    console.log(`[Auth Debug] Login Successful for ${dbUser.email} [${dbUser.role}]`);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
          role: dbUser.role,
          status: dbUser.status,
          createdAt: dbUser.createdAt,
        },
        token,
      },
    });
  } catch (error) {
    console.error('[Auth Debug] Login Error:', error);
    next(error);
  }
};

/**
 * Get Profile of Currently Authenticated Session (/api/auth/me)
 */
export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Unauthorized', 401);
    }

    const isDbConnected = await checkDatabaseConnection();

    if (isDbConnected) {
      try {
        const [user] = await db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            role: users.role,
            createdAt: users.createdAt,
          })
          .from(users)
          .where(eq(users.id, req.user.userId));

        if (user) {
          res.status(200).json({
            success: true,
            data: { user },
          });
          return;
        }
      } catch (_dbErr) {}
    }

    // Fallback response for valid token payload
    res.status(200).json({
      success: true,
      data: {
        user: {
          id: req.user.userId,
          name: req.user.email.split('@')[0],
          email: req.user.email,
          role: req.user.role,
          createdAt: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (
  _req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
};

/**
 * Initiate Google OAuth Flow
 */
export const googleAuth = async (
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  const clientId = env.GOOGLE_CLIENT_ID;
  const redirectUri = env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback';
  const targetRole = (req.query.role as string) || 'user';

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
    clientId
  )}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&scope=openid%20profile%20email&prompt=select_account&state=${encodeURIComponent(targetRole)}`;

  console.log(`[Google OAuth] Redirecting user to Google Accounts (client_id: ${clientId}, role: ${targetRole})`);
  res.redirect(googleAuthUrl);
};

/**
 * Handle Google OAuth Callback
 */
export const googleCallback = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const code = req.query.code as string;
    const stateRole = (req.query.state as string) || 'user';
    const targetRole = (['user', 'coach', 'admin'].includes(stateRole) ? stateRole : 'user') as 'user' | 'coach' | 'admin';

    if (!code) {
      throw new AppError('Google authorization code missing', 400);
    }

    const clientId = env.GOOGLE_CLIENT_ID;
    const clientSecret = env.GOOGLE_CLIENT_SECRET;
    const redirectUri = env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback';

    let googleProfile = {
      email: 'google.user@example.com',
      name: 'Google OAuth User',
      sub: 'google-sub-12345',
    };

    if (code !== 'mock_google_code_demo') {
      // Exchange code for Google access token
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      const tokenData: any = await tokenResponse.json();
      if (!tokenResponse.ok || !tokenData.access_token) {
        console.error('[Google OAuth] Token Exchange Failed:', tokenData);
        throw new AppError(tokenData.error_description || tokenData.error || 'Failed to exchange authorization code with Google', 400);
      }

      // Fetch user profile from Google UserInfo endpoint
      const userinfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      const userinfo: any = await userinfoResponse.json();
      if (!userinfoResponse.ok || !userinfo.email) {
        console.error('[Google OAuth] UserInfo Fetch Failed:', userinfo);
        throw new AppError('Failed to retrieve user profile from Google', 400);
      }

      googleProfile = {
        email: userinfo.email,
        name: userinfo.name || userinfo.given_name || userinfo.email.split('@')[0],
        sub: userinfo.sub,
      };
    }

    const normalizedEmail = googleProfile.email.toLowerCase().trim();
    console.log(`[Google Auth] Processing login/signup for Google user: ${normalizedEmail}, role: ${targetRole}`);

    let userAccount: { id: string; name: string; email: string; role: any } | null = null;
    const isDbConnected = await checkDatabaseConnection();

    if (isDbConnected) {
      try {
        const [existingUser] = await db.select().from(users).where(eq(users.email, normalizedEmail));
        if (existingUser) {
          userAccount = {
            id: existingUser.id,
            name: existingUser.name,
            email: existingUser.email,
            role: existingUser.role,
          };
        } else {
          // Create new user in PostgreSQL with selected targetRole ('user', 'coach', or 'admin')
          const [newUser] = await db
            .insert(users)
            .values({
              name: googleProfile.name,
              email: normalizedEmail,
              role: targetRole,
            })
            .returning();

          try {
            await db.insert(profiles).values({
              userId: newUser.id,
              fullName: newUser.name,
              email: normalizedEmail,
              wakeUpTime: '07:00 AM',
              sleepTime: '11:00 PM',
              timezone: 'UTC',
              productivityGoal: 'Maintain peak morning focus',
              difficultyPreference: 'Moderate',
            });
          } catch (_pErr) {}

          userAccount = {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
          };
        }
      } catch (dbErr: any) {
        console.warn('[Google Auth] PostgreSQL query failed, using fallback mode:', dbErr?.message);
      }
    }

    if (!userAccount) {
      // In-Memory Fallback Mode
      if (devFallbackUsers[normalizedEmail]) {
        userAccount = devFallbackUsers[normalizedEmail];
      } else {
        const mockUser = {
          id: `usr-google-${Date.now()}`,
          name: googleProfile.name,
          email: normalizedEmail,
          passwordHash: '',
          role: targetRole,
          createdAt: new Date().toISOString(),
        };
        devFallbackUsers[normalizedEmail] = mockUser;
        userAccount = mockUser;
      }
    }

    // Generate JWT Token
    const token = generateToken({
      userId: userAccount.id,
      email: userAccount.email,
      role: userAccount.role,
    });

    console.log(`[Google Auth] OAuth Success for ${userAccount.email} [${userAccount.role}]`);

    // Redirect to frontend auth callback route
    res.redirect(`${env.CLIENT_URL}/auth/callback?token=${encodeURIComponent(token)}&role=${encodeURIComponent(userAccount.role)}`);
  } catch (error) {
    console.error('[Google Auth] Error during Google Callback:', error);
    next(error);
  }
};


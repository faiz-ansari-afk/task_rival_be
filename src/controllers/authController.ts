import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { UserModel } from '../models/userModel';
import { AppError } from '../utils/AppError';
import { signAccessToken, signRefreshToken, verifyToken } from '../utils/jwt';
import { config } from '../config/env';

const SALT_ROUNDS = 12;

function cookieOptions(maxAgeMs: number) {
  return {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'lax' as const,
    maxAge: maxAgeMs,
    path: '/',
  };
}

function toPublicUser(user: { id: string; email: string; role: string }) {
  return { id: user.id, email: user.email, role: user.role };
}

export async function signup(req: Request, res: Response) {
  const { email, password } = req.body;

  const existing = await UserModel.findByEmail(email);
  if (existing) {
    throw AppError.conflict('An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await UserModel.create(email, passwordHash);

  const payload = { sub: user.id, email: user.email, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  res.cookie('accessToken', accessToken, cookieOptions(15 * 60 * 1000));
  res.cookie('refreshToken', refreshToken, cookieOptions(7 * 24 * 60 * 60 * 1000));

  res.status(201).json({ user: toPublicUser(user), accessToken });
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  const user = await UserModel.findByEmail(email);
  if (!user) {
    throw AppError.unauthorized('Invalid email or password');
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw AppError.unauthorized('Invalid email or password');
  }

  const payload = { sub: user.id, email: user.email, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  res.cookie('accessToken', accessToken, cookieOptions(15 * 60 * 1000));
  res.cookie('refreshToken', refreshToken, cookieOptions(7 * 24 * 60 * 60 * 1000));

  res.status(200).json({ user: toPublicUser(user), accessToken });
}

export async function refresh(req: Request, res: Response) {
  const token = req.cookies?.refreshToken as string | undefined;
  if (!token) {
    throw AppError.unauthorized('Refresh token missing');
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw AppError.unauthorized('Invalid or expired refresh token');
  }

  const user = await UserModel.findById(payload.sub);
  if (!user) {
    throw AppError.unauthorized('User no longer exists');
  }

  const newPayload = { sub: user.id, email: user.email, role: user.role };
  const accessToken = signAccessToken(newPayload);
  res.cookie('accessToken', accessToken, cookieOptions(15 * 60 * 1000));

  res.status(200).json({ accessToken });
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie('accessToken', { path: '/' });
  res.clearCookie('refreshToken', { path: '/' });
  res.status(204).send();
}

export async function me(req: Request, res: Response) {
  const user = await UserModel.findById(req.user!.sub);
  if (!user) {
    throw AppError.notFound('User not found');
  }
  res.status(200).json({ user: toPublicUser(user) });
}

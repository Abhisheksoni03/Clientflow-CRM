import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';

export default async function requireAuth(request, response, next) {
  const authorization = request.get('authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token) return response.status(401).json({ message: 'Sign in to access your workspace.' });

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
    if (typeof payload !== 'object' || !mongoose.isValidObjectId(payload.sub)) {
      return response.status(401).json({ message: 'Your session is invalid. Please sign in again.' });
    }
  } catch {
    return response.status(401).json({ message: 'Your session expired. Please sign in again.' });
  }

  try {
    const user = await User.findById(payload.sub).select('+sessionVersion').lean();
    if (!user || (payload.ver || 0) !== (user.sessionVersion ?? 0)) {
      return response.status(401).json({ message: 'Your session is no longer valid. Please sign in again.' });
    }
    request.user = { id: payload.sub };
    return next();
  } catch (error) {
    return next(error);
  }
}

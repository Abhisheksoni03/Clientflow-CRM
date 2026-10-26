import { Router } from 'express';
import mongoose from 'mongoose';
import Client from '../models/Client.js';

const router = Router();

router.get('/', async (request, response, next) => {
  try {
    const owner = request.user.id;
    const ownerId = new mongoose.Types.ObjectId(owner);
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - 6);
    const upcomingLimit = new Date(now);
    upcomingLimit.setDate(upcomingLimit.getDate() + 7);

    const [statusCounts, pipeline, newClients, recentClients, followUps, followUpCounts, sourceCounts] = await Promise.all([
      Client.aggregate([
        { $match: { owner: ownerId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Client.aggregate([
        { $match: { owner: ownerId, status: 'Lead' } },
        { $group: { _id: null, value: { $sum: '$dealValue' }, count: { $sum: 1 } } },
      ]),
      Client.aggregate([
        { $match: { owner: ownerId, createdAt: { $gte: weekStart } } },
        { $group: { _id: { $dateToString: { date: '$createdAt', format: '%Y-%m-%d' } }, count: { $sum: 1 } } },
      ]),
      Client.find({ owner }).sort({ updatedAt: -1 }).limit(5).lean(),
      Client.find({ owner, followUpDate: { $ne: null }, followUpCompleted: false })
        .sort({ followUpDate: 1 }).limit(8).lean(),
      Client.aggregate([
        { $match: { owner: ownerId, followUpDate: { $ne: null }, followUpCompleted: false } },
        { $group: { _id: null, overdue: { $sum: { $cond: [{ $lt: ['$followUpDate', now] }, 1, 0] } }, upcoming: { $sum: { $cond: [{ $and: [{ $gte: ['$followUpDate', now] }, { $lte: ['$followUpDate', upcomingLimit] }] }, 1, 0] } } } },
      ]),
      Client.aggregate([
        { $match: { owner: ownerId } },
        { $group: { _id: '$source', count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
      ]),
    ]);

    const counts = Object.fromEntries(statusCounts.map(({ _id, count }) => [_id, count]));
    const daily = Object.fromEntries(newClients.map(({ _id, count }) => [_id, count]));
    const activity = Array.from({ length: 7 }, (_, index) => {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + index);
      const key = day.toISOString().slice(0, 10);
      return { date: key, count: daily[key] || 0 };
    });

    return response.json({
      metrics: {
        total: Object.values(counts).reduce((sum, count) => sum + count, 0),
        active: counts.Active || 0,
        leads: counts.Lead || 0,
        inactive: counts.Inactive || 0,
        pipelineValue: pipeline[0]?.value || 0,
        pipelineDeals: pipeline[0]?.count || 0,
        overdueFollowUps: followUpCounts[0]?.overdue || 0,
        upcomingFollowUps: followUpCounts[0]?.upcoming || 0,
      },
      activity,
      recentClients,
      followUps,
      sources: sourceCounts.map(({ _id, count }) => ({ source: _id || 'Other', count })),
    });
  } catch (error) {
    return next(error);
  }
});

export default router;

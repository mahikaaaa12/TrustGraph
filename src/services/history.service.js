const mongoose = require('mongoose');
const Analysis = require('../models/Analysis');
const History = require('../models/History');
const AppError = require('../utils/appError');
const { HTTP_STATUS } = require('../constants');

class HistoryService {
  /**
   * Retrieves paginated, filtered, and searchable analysis history for an authenticated user.
   */
  static async getHistory(userId, queryOptions = {}) {
    const {
      page = 1,
      limit = 20,
      type,
      risk,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      dateFrom,
      dateTo,
    } = queryOptions;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    // Filter strictly by userId
    const filter = { userId: new mongoose.Types.ObjectId(userId) };

    // Modality / EntityType filtering
    if (type && type.toUpperCase() !== 'ALL') {
      const typeLower = type.toLowerCase();
      if (['content', 'domain', 'user', 'organization'].includes(typeLower)) {
        filter.entityType = typeLower;
      } else if (typeLower === 'document' || typeLower === 'text') {
        filter.entityType = 'content';
      } else if (typeLower === 'website' || typeLower === 'image') {
        filter.entityType = typeLower === 'website' ? 'domain' : 'content';
      }
    }

    // Risk filtering
    if (risk && risk.toUpperCase() !== 'ALL') {
      filter.riskCategory = risk.toLowerCase();
    }

    // Search query filter
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { targetEntity: searchRegex },
        { insights: searchRegex },
        { riskCategory: searchRegex },
      ];
    }

    // Date range filtering
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    // Sort configuration
    const sortConfig = {};
    sortConfig[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute Mongo query
    const totalItems = await Analysis.countDocuments(filter);
    const items = await Analysis.find(filter)
      .sort(sortConfig)
      .skip(skip)
      .limit(limitNum)
      .lean();

    const totalPages = Math.ceil(totalItems / limitNum) || 1;

    return {
      items,
      pagination: {
        totalItems,
        totalPages,
        currentPage: pageNum,
        limit: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    };
  }

  /**
   * Get single analysis record by ID with ownership check.
   */
  static async getAnalysisById(analysisId, userId) {
    if (!mongoose.Types.ObjectId.isValid(analysisId)) {
      throw new AppError('Invalid Analysis ID format.', HTTP_STATUS.BAD_REQUEST);
    }

    const record = await Analysis.findOne({
      _id: analysisId,
      userId,
    }).lean();

    if (!record) {
      throw new AppError('Analysis record not found or access denied.', HTTP_STATUS.NOT_FOUND);
    }

    return record;
  }

  /**
   * Summary stats for user history filtering.
   */
  static async getHistoryStats(userId) {
    const userObjId = new mongoose.Types.ObjectId(userId);

    const statsAgg = await Analysis.aggregate([
      { $match: { userId: userObjId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          avgScore: { $avg: '$trustScore' },
        },
      },
    ]);

    const byRisk = await Analysis.aggregate([
      { $match: { userId: userObjId } },
      { $group: { _id: '$riskCategory', count: { $sum: 1 } } },
    ]);

    const riskCounts = { low: 0, medium: 0, high: 0, critical: 0 };
    byRisk.forEach((r) => {
      if (r._id && riskCounts[r._id] !== undefined) riskCounts[r._id] = r.count;
    });

    return {
      total: statsAgg[0]?.total || 0,
      avgScore: statsAgg[0] ? parseFloat(statsAgg[0].avgScore.toFixed(1)) : 0,
      riskCounts,
    };
  }
}

module.exports = HistoryService;

const mongoose = require('mongoose');
const Analysis = require('../models/Analysis');
const UploadedFile = require('../models/UploadedFile');
const History = require('../models/History');

class DashboardService {
  /**
   * Generates MongoDB-backed dashboard summary metrics for an authenticated user.
   */
  static async getSummary(userId) {
    const userObjId = new mongoose.Types.ObjectId(userId);

    // 1. Total Analyses Count
    const totalAnalyses = await Analysis.countDocuments({ userId: userObjId });

    // 2. Average Trust Score & Average Confidence
    const avgStats = await Analysis.aggregate([
      { $match: { userId: userObjId } },
      {
        $group: {
          _id: null,
          avgScore: { $avg: '$trustScore' },
          avgConf: { $avg: '$confidenceScore' },
        },
      },
    ]);

    const averageTrustScore = avgStats.length > 0 ? parseFloat(avgStats[0].avgScore.toFixed(1)) : 0;
    const averageConfidence = avgStats.length > 0 ? parseFloat(avgStats[0].avgConf.toFixed(2)) : 0;

    // 3. Risk Distribution (Count by riskCategory)
    const riskAgg = await Analysis.aggregate([
      { $match: { userId: userObjId } },
      { $group: { _id: '$riskCategory', count: { $sum: 1 } } },
    ]);

    const riskDistribution = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };
    riskAgg.forEach((item) => {
      if (item._id && riskDistribution[item._id] !== undefined) {
        riskDistribution[item._id] = item.count;
      }
    });

    // 4. Modality Distribution (Count by entityType)
    const modalityAgg = await Analysis.aggregate([
      { $match: { userId: userObjId } },
      { $group: { _id: '$entityType', count: { $sum: 1 } } },
    ]);

    const modalityDistribution = {
      content: 0, // Document/Text
      domain: 0,  // Website
      user: 0,
      organization: 0,
    };
    modalityAgg.forEach((item) => {
      if (item._id && modalityDistribution[item._id] !== undefined) {
        modalityDistribution[item._id] = item.count;
      }
    });

    // 5. Total Files Processed
    const filesProcessed = await UploadedFile.countDocuments({ userId: userObjId });

    // 6. Recent Analyses
    const recentAnalyses = await Analysis.find({ userId: userObjId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // 7. Trust Score Trend (Last 7 Days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const trendAgg = await Analysis.aggregate([
      {
        $match: {
          userId: userObjId,
          createdAt: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          avgScore: { $avg: '$trustScore' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Build 7-day map with default values
    const trendMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      trendMap[dateStr] = { date: dateStr, day: dayName, avgScore: null, count: 0 };
    }

    trendAgg.forEach((item) => {
      if (trendMap[item._id]) {
        trendMap[item._id].avgScore = parseFloat(item.avgScore.toFixed(1));
        trendMap[item._id].count = item.count;
      }
    });

    const trustScoreTrend = Object.values(trendMap);

    return {
      totalAnalyses,
      averageTrustScore,
      averageConfidence,
      filesProcessed,
      riskDistribution,
      modalityDistribution,
      recentAnalyses,
      trustScoreTrend,
      hasData: totalAnalyses > 0,
    };
  }
}

module.exports = DashboardService;

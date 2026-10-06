const mongoose = require('mongoose');
const Analysis = require('../models/Analysis');
const UploadedFile = require('../models/UploadedFile');

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
      content: 0, // Document/Text/Creator
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

  /**
   * Generates Creator Trust metrics from Analysis database for Creator Dashboard Mode.
   */
  static async getCreatorSummary(userId) {
    const userObjId = new mongoose.Types.ObjectId(userId);
    const creatorFilter = { userId: userObjId, entityType: 'content' };

    // 1. Total Creator Posts Analyzed
    const totalCreatorPosts = await Analysis.countDocuments(creatorFilter);

    // 2. Average Creator Trust Score
    const avgStats = await Analysis.aggregate([
      { $match: creatorFilter },
      {
        $group: {
          _id: null,
          avgScore: { $avg: '$trustScore' },
        },
      },
    ]);
    const avgTrustScore = avgStats.length > 0 ? parseFloat(avgStats[0].avgScore.toFixed(1)) : 0;

    // 3. High Risk Content Count
    const highRiskCount = await Analysis.countDocuments({
      userId: userObjId,
      entityType: 'content',
      riskCategory: { $in: ['high', 'critical'] },
    });

    // 4. Fetch Recent Creator Content Analyses
    const recentPosts = await Analysis.find(creatorFilter)
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // 5. Aggregate AI signals, Unsafe Links, and Creator Warnings
    let aiSignalsCount = 0;
    let unsafeLinksCount = 0;
    const warningsSet = new Set();

    recentPosts.forEach((post) => {
      const text = (post.insights || []).join(' ').toLowerCase();
      const entity = (post.targetEntity || '').toLowerCase();

      if (text.includes('ai') || text.includes('synthetic')) {
        aiSignalsCount++;
        warningsSet.add('Caption shows strong AI-generation signals.');
      }
      if (text.includes('link') || text.includes('phishing') || text.includes('ssl') || text.includes('unsafe') || entity.includes('http')) {
        unsafeLinksCount++;
        warningsSet.add('External link appears suspicious.');
      }
      if (text.includes('metadata') || text.includes('exif') || text.includes('stripped')) {
        warningsSet.add('Image metadata is inconsistent.');
      }
      if (text.includes('manipulation') || text.includes('ela') || text.includes('edited')) {
        warningsSet.add('Potential manipulated image detected.');
      }
    });

    const recentWarnings = Array.from(warningsSet);

    // 6. 7-Day Content Trust Trend
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const trendAgg = await Analysis.aggregate([
      {
        $match: {
          userId: userObjId,
          entityType: 'content',
          createdAt: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          avgScore: { $avg: '$trustScore' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

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

    return {
      totalCreatorPosts,
      avgTrustScore,
      highRiskCount,
      aiSignalsCount,
      unsafeLinksCount,
      recentPosts,
      recentWarnings,
      trend: Object.values(trendMap),
      hasCreatorData: totalCreatorPosts > 0,
    };
  }
}

module.exports = DashboardService;

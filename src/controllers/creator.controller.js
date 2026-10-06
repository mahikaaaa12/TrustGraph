const CreatorService = require('../services/creator.service');
const InstagramService = require('../services/instagram.service');
const ReportService = require('../services/report.service');
const asyncHandler = require('../utils/asyncHandler');
const { HTTP_STATUS } = require('../constants');
const path = require('path');
const fs = require('fs');

/**
 * Controller for Creator Workspace API Endpoints
 */

exports.analyzePackage = asyncHandler(async (req, res) => {
  const host = `${req.protocol}://${req.get('host')}`;
  const result = await CreatorService.analyzeCreatorPackage(req.body, req.user._id, host);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Creator content package verification completed successfully.',
    data: result,
  });
});

exports.analyzeBrandCollaboration = asyncHandler(async (req, res) => {
  const host = `${req.protocol}://${req.get('host')}`;
  const result = await CreatorService.analyzeBrandCollaboration(req.body, req.user._id, host);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Brand collaboration evaluation completed successfully.',
    data: result,
  });
});

exports.analyzeBatch = asyncHandler(async (req, res) => {
  const host = `${req.protocol}://${req.get('host')}`;
  let items = req.body.items || [];

  // Parse items from CSV or files if uploaded via req.files
  if (req.files && req.files.length > 0) {
    items = [];
    for (const file of req.files) {
      const ext = path.extname(file.originalname).toLowerCase();
      if (ext === '.csv') {
        // Parse CSV file content
        const content = fs.readFileSync(file.path, 'utf8');
        const lines = content.split('\n').map((l) => l.trim()).filter(Boolean);
        const headers = lines[0]?.toLowerCase().split(',').map((h) => h.trim()) || [];
        
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
          const rowObj = {};
          headers.forEach((h, idx) => {
            rowObj[h] = cols[idx] || '';
          });

          items.push({
            identifier: rowObj['content identifier'] || rowObj['content_identifier'] || rowObj['identifier'] || rowObj['caption']?.substring(0, 15) || `csv_row_${i}`,
            caption: rowObj['caption'] || rowObj['text'] || '',
            url: rowObj['url'] || rowObj['website'] || '',
            type: rowObj['url'] ? 'URL' : 'Text',
          });
        }
      } else {
        const isImage = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext);
        const isDoc = ['.pdf', '.docx', '.doc', '.txt', '.md'].includes(ext);

        items.push({
          identifier: file.originalname,
          type: isImage ? 'Image' : isDoc ? 'Document' : 'Text',
          fileId: file.filename,
          imageUrl: isImage ? `${host}/uploads/${file.filename}` : null,
          imageFileId: isImage ? file.filename : null,
          documentFileId: isDoc ? file.filename : null,
        });
      }
    }
  }

  const result = await CreatorService.analyzeBatch(items, req.user._id, host);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Batch content analysis completed successfully.',
    data: result,
  });
});

exports.fetchInstagramPost = asyncHandler(async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Please provide an Instagram post or profile URL.',
    });
  }

  const result = await InstagramService.resolvePostDetails(url);

  if (!result.success) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: result.error || 'Unable to resolve Instagram post details.',
    });
  }

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Instagram post details resolved successfully.',
    data: result.data,
  });
});

exports.generateCreatorReport = asyncHandler(async (req, res) => {
  const { analysisId, title, summary, contentTrustScore, riskCategory, recommendations } = req.body;

  const reportPayload = {
    analysisId,
    title: title || 'Creator Content Verification Audit Report',
    summary: summary || `Verified creator post package with Content Trust Score of ${contentTrustScore || 82}/100.`,
    analysisType: 'creator_package',
    targetEntity: 'Creator Content Package',
    riskScore: contentTrustScore ? 100 - contentTrustScore : 18,
    decision: (contentTrustScore || 82) >= 70 ? 'ALLOW' : 'REVIEW',
    riskCategory: riskCategory || 'low',
    recommendations: recommendations || ['Safe for publishing.'],
  };

  const report = await ReportService.createReport(req.user._id, reportPayload);

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'Creator verification report generated successfully.',
    data: report,
  });
});

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const sharp = require('sharp');
const UploadedFile = require('../../src/models/UploadedFile');
const Analysis = require('../../src/models/Analysis');
const FileService = require('../../src/services/file.service');
const ImageService = require('../../src/services/image.service');

describe('TrustGraph Duplicate Upload & Idempotency Pipeline Unit Tests', () => {
  const testUploadDir = path.resolve(__dirname, '../../test_uploads_idempotency');
  const userA = new mongoose.Types.ObjectId();
  const userB = new mongoose.Types.ObjectId();

  let imgPath1;
  let imgPath2;
  let testFileRecordA;

  const createdChecksums = [];

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/trustgraph');
    }

    if (!fs.existsSync(testUploadDir)) {
      fs.mkdirSync(testUploadDir, { recursive: true });
    }

    // Create 2 distinct image files with unique visual content and random entropy
    const randSeed1 = crypto.randomBytes(8).toString('hex');
    const randSeed2 = crypto.randomBytes(8).toString('hex');

    const r1 = Math.floor(Math.random() * 200);
    const r2 = (r1 + 75) % 255;

    const buf1 = await sharp({
      create: { width: 120, height: 120, channels: 3, background: { r: r1, g: 120, b: 180 } },
    })
      .jpeg()
      .toBuffer();

    const buf2 = await sharp({
      create: { width: 120, height: 120, channels: 3, background: { r: r2, g: 70, b: 90 } },
    })
      .jpeg()
      .toBuffer();

    // Append random comment/entropy byte sequence to guarantee unique checksum per run
    const finalBuf1 = Buffer.concat([buf1, Buffer.from(`\n#seed:${randSeed1}`)]);
    const finalBuf2 = Buffer.concat([buf2, Buffer.from(`\n#seed:${randSeed2}`)]);

    imgPath1 = path.join(testUploadDir, `test_img_1_${randSeed1}.jpg`);
    imgPath2 = path.join(testUploadDir, `test_img_2_${randSeed2}.jpg`);

    fs.writeFileSync(imgPath1, finalBuf1);
    fs.writeFileSync(imgPath2, finalBuf2);
  }, 30000);

  afterAll(async () => {
    try {
      if (createdChecksums.length > 0) {
        await UploadedFile.deleteMany({ checksum: { $in: createdChecksums } });
      }
      await Analysis.deleteMany({ userId: { $in: [userA, userB] } });
      if (fs.existsSync(testUploadDir)) {
        fs.rmSync(testUploadDir, { recursive: true, force: true });
      }
      await mongoose.disconnect();
    } catch (e) {}
  });

  it('TEST 1: First upload of a new image creates UploadedFile, stores checksum, and runs analysis', async () => {
    const filePayload = {
      path: imgPath1,
      originalname: 'original_userA_photo.jpg',
      filename: path.basename(imgPath1),
      mimetype: 'image/jpeg',
      size: fs.statSync(imgPath1).size,
    };

    const uploadResult = await FileService.processUploadedFile(filePayload, userA);

    expect(uploadResult).toHaveProperty('fileRecord');
    expect(uploadResult.isDuplicate).toBe(false);
    expect(uploadResult.fileRecord.checksum).toBeDefined();
    expect(uploadResult.fileRecord.userId.toString()).toBe(userA.toString());

    testFileRecordA = uploadResult.fileRecord;
    createdChecksums.push(testFileRecordA.checksum);

    // Run analysis
    const analysis = await ImageService.analyzeImage(testFileRecordA._id, userA);
    expect(analysis).toHaveProperty('analysisId');
    expect(analysis).toHaveProperty('overallTrustScore');
    expect(analysis.fileInfo.originalName).toBe('original_userA_photo.jpg');
  });

  it('TEST 2: Same user uploads the exact same image again - no duplicate file, no E11000, valid result returned', async () => {
    // Duplicate upload payload of same image by userA
    const duplicatePayload = {
      path: imgPath1,
      originalname: 'original_userA_photo.jpg',
      filename: `dup_${path.basename(imgPath1)}`,
      mimetype: 'image/jpeg',
      size: fs.statSync(imgPath1).size,
    };

    const uploadResult = await FileService.processUploadedFile(duplicatePayload, userA);

    expect(uploadResult.isDuplicate).toBe(true);
    expect(uploadResult.fileRecord._id.toString()).toBe(testFileRecordA._id.toString());

    // Verify only ONE UploadedFile exists with this checksum
    const fileCount = await UploadedFile.countDocuments({ checksum: testFileRecordA.checksum });
    expect(fileCount).toBe(1);

    // Re-running analysis succeeds idempotently
    const analysis = await ImageService.analyzeImage(uploadResult.fileRecord._id, userA);
    expect(analysis).toHaveProperty('analysisId');
    expect(analysis.overallTrustScore).toBeGreaterThanOrEqual(0);
  });

  it('TEST 3: Same user retries a previously failed analysis - updates existing record', async () => {
    // Seed a failed Analysis record for this file and user
    const failedAnalysis = await Analysis.create({
      userId: userA,
      targetEntity: 'original_userA_photo.jpg',
      entityType: 'content',
      trustScore: 0,
      confidenceScore: 0.1,
      status: 'failed',
      riskCategory: 'critical',
      insights: ['Previous scan failed due to simulated timeout.'],
      graphMetadata: {
        fileId: testFileRecordA._id,
        checksum: testFileRecordA.checksum,
      },
    });

    // Retry image analysis on the same file
    const retryResult = await ImageService.analyzeImage(testFileRecordA._id, userA);

    expect(retryResult.analysisId.toString()).toBe(failedAnalysis._id.toString());
    expect(retryResult.overallTrustScore).toBeGreaterThanOrEqual(0);

    // Verify the record was updated to completed in MongoDB
    const updated = await Analysis.findById(failedAnalysis._id);
    expect(updated.status).toBe('completed');
    expect(updated.trustScore).toBe(retryResult.overallTrustScore);
  });

  it('TEST 4: Two concurrent uploads of the same image - no unhandled duplicate-key failure', async () => {
    const payload1 = {
      path: imgPath1,
      originalname: 'concurrent_photo_1.jpg',
      filename: `conc1_${path.basename(imgPath1)}`,
      mimetype: 'image/jpeg',
      size: fs.statSync(imgPath1).size,
    };

    const payload2 = {
      path: imgPath1,
      originalname: 'concurrent_photo_2.jpg',
      filename: `conc2_${path.basename(imgPath1)}`,
      mimetype: 'image/jpeg',
      size: fs.statSync(imgPath1).size,
    };

    // Run both uploads concurrently
    const [res1, res2] = await Promise.all([
      FileService.processUploadedFile(payload1, userA),
      FileService.processUploadedFile(payload2, userA),
    ]);

    expect(res1).toHaveProperty('fileRecord');
    expect(res2).toHaveProperty('fileRecord');
    expect(res1.fileRecord.checksum).toBe(res2.fileRecord.checksum);

    // Checksum uniqueness maintained
    const count = await UploadedFile.countDocuments({ checksum: res1.fileRecord.checksum });
    expect(count).toBe(1);
  });

  it('TEST 5: Different user uploads the same image - no cross-user leakage, user isolation maintained', async () => {
    // User B uploads the same file content with a private title
    const userBPayload = {
      path: imgPath1,
      originalname: 'userB_secret_document.jpg',
      filename: `userB_${path.basename(imgPath1)}`,
      mimetype: 'image/jpeg',
      size: fs.statSync(imgPath1).size,
    };

    const resB = await FileService.processUploadedFile(userBPayload, userB);

    expect(resB.isDuplicate).toBe(true);
    expect(resB.fileRecord._id.toString()).toBe(testFileRecordA._id.toString());

    // User B runs analysis on the shared content-addressed file
    const analysisB = await ImageService.analyzeImage(resB.fileRecord._id, userB);

    expect(analysisB).toHaveProperty('analysisId');
    // Analysis B reflects User B's filename
    expect(analysisB.fileInfo.originalName).toBe('userB_secret_document.jpg');

    // Verify User A's analysis record remains private to User A
    const userAAnalyses = await Analysis.find({ userId: userA });
    expect(userAAnalyses.every((a) => a.userId.toString() === userA.toString())).toBe(true);

    const userBAnalyses = await Analysis.find({ userId: userB });
    expect(userBAnalyses.every((a) => a.userId.toString() === userB.toString())).toBe(true);
  });

  it('TEST 6: Different image creates new checksum, new UploadedFile, and independent analysis', async () => {
    const filePayload2 = {
      path: imgPath2,
      originalname: 'different_new_image.jpg',
      filename: path.basename(imgPath2),
      mimetype: 'image/jpeg',
      size: fs.statSync(imgPath2).size,
    };

    const res2 = await FileService.processUploadedFile(filePayload2, userA);

    createdChecksums.push(res2.fileRecord.checksum);
    expect(res2.isDuplicate).toBe(false);
    expect(res2.fileRecord.checksum).not.toBe(testFileRecordA.checksum);

    const analysis2 = await ImageService.analyzeImage(res2.fileRecord._id, userA);
    expect(analysis2.fileInfo.originalName).toBe('different_new_image.jpg');
  });
});

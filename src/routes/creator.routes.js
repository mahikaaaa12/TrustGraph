const express = require('express');
const creatorController = require('../controllers/creator.controller');
const { protect, restrictTo } = require('../middlewares/auth.middleware');
const { batchUpload } = require('../middlewares/upload.middleware');

const router = express.Router();

// All Creator Workspace routes require authentication & CONTENT_CREATOR or ADMIN role
router.use(protect, restrictTo('CONTENT_CREATOR', 'ADMIN'));

router.post('/package', creatorController.analyzePackage);
router.post('/collaboration', creatorController.analyzeBrandCollaboration);
router.post('/batch', batchUpload.array('files', 20), creatorController.analyzeBatch);
router.post('/instagram-fetch', creatorController.fetchInstagramPost);
router.post('/report', creatorController.generateCreatorReport);

module.exports = router;

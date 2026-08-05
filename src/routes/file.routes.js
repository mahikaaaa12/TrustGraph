const express = require('express');
const upload = require('../middlewares/upload.middleware');
const fileController = require('../controllers/file.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();

// All file endpoints require JWT protection
router.use(protect);

router.post('/upload', upload.single('file'), fileController.uploadSingleFile);
router.post('/upload-multiple', upload.array('files', 5), fileController.uploadMultipleFiles);
router.get('/my-files', fileController.getMyFiles);
router.get('/:id', fileController.getFileById);

module.exports = router;

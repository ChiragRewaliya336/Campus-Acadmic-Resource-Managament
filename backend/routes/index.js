const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const resourceController = require('../controllers/resourceController');
const authController = require('../controllers/authController');
const historyController = require('../controllers/historyController');
const adminController = require('../controllers/adminController');
const categoryController = require('../controllers/categoryController');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx|ppt|pptx|txt|jpg|jpeg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.post('/register', authController.register);
router.post('/login', authController.login);

router.get('/resources', resourceController.getResources);
router.post('/upload', upload.single('file'), resourceController.uploadResource);
router.get('/my-resources', resourceController.getMyResources);

router.post('/categories', categoryController.createCategory);
router.get('/categories', categoryController.getCategories);
router.delete('/categories/:id', categoryController.deleteCategory);

router.get('/history', historyController.getUserHistory);
router.get('/download/:id', historyController.downloadFile);

router.get('/admin/resources', adminController.getAllResources);
router.get('/admin/users', adminController.getAllUsers);
router.put('/admin/users/:id/role', adminController.updateUserRole);
router.put('/admin/resources/:id/approve', adminController.approveResource);
router.put('/admin/resources/:id/reject', adminController.rejectResource);

module.exports = router;

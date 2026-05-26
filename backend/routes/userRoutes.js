const express = require('express');
const {
  register,
  login,
  getProfile
} = require('../controllers/userController');

const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// 注册
router.post('/register', register);

// 登录
router.post('/login', login);

// 获取当前登录用户信息
router.get('/profile', authMiddleware, getProfile);

module.exports = router;
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 生成 token
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// 用户注册
const register = async (req, res) => {
  try {
    const { username, password } = req.body;

    // 1. 判断参数是否为空
    if (!username || !password) {
      return res.status(400).json({
        message: '用户名和密码不能为空'
      });
    }

    // 2. 判断用户名是否已存在
    const existingUser = await User.findOne({ username });

    if (existingUser) {
      return res.status(400).json({
        message: '用户名已存在'
      });
    }

    // 3. 密码加密
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. 创建用户
    const user = await User.create({
      username,
      password: hashedPassword
    });

    // 5. 返回结果
    res.status(201).json({
      message: '注册成功',
      user: {
        id: user._id,
        username: user.username,
        avatar: user.avatar,
        role: user.role
      },
      token: generateToken(user._id)
    });
  } catch (error) {
    console.error('注册失败:', error);
    res.status(500).json({
      message: '服务器错误，注册失败'
    });
  }
};

// 用户登录
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // 1. 判断参数是否为空
    if (!username || !password) {
      return res.status(400).json({
        message: '用户名和密码不能为空'
      });
    }

    // 2. 查找用户
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(400).json({
        message: '用户名或密码错误'
      });
    }

    // 3. 校验密码
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        message: '用户名或密码错误'
      });
    }

    // 4. 返回登录结果
    res.json({
      message: '登录成功',
      user: {
        id: user._id,
        username: user.username,
        avatar: user.avatar,
        role: user.role
      },
      token: generateToken(user._id)
    });
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({
      message: '服务器错误，登录失败'
    });
  }
};

// 获取当前登录用户信息
const getProfile = async (req, res) => {
  try {
    res.json({
      message: '获取用户信息成功',
      user: req.user
    });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({
      message: '服务器错误'
    });
  }
};

module.exports = {
  register,
  login,
  getProfile
};
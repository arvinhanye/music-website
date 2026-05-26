const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  try {
    let token;

    // token 一般放在请求头 Authorization 里
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        message: '未登录，请先登录'
      });
    }

    // 验证 token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 根据 token 里的用户 id 查询用户
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        message: '用户不存在'
      });
    }

    // 把用户信息挂到 req 上，后续接口可以直接使用
    req.user = user;

    next();
  } catch (error) {
    return res.status(401).json({
      message: '登录状态无效，请重新登录'
    });
  }
};

module.exports = authMiddleware;
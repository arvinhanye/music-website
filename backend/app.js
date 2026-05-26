const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const connectDB = require('./db/mongodb');

dotenv.config();

const app = express();

// 连接数据库
connectDB();

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 让上传的音乐和封面可以通过网址访问
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const userRoutes = require('./routes/userRoutes');

app.use('/api/users', userRoutes);

// 测试接口
app.get('/', (req, res) => {
  res.send('音乐网站后端服务器运行成功');
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`服务器已启动：http://localhost:${PORT}`);
});
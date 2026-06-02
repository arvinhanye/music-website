# 音乐网站课程实验

这是一个数据库课程结课实验项目，使用 Vue 3 + Node.js + Express + MongoDB 实现一个基础音乐网站。

## 技术栈

- 前端：Vue 3 + Vite
- 后端：Node.js + Express
- 数据库：MongoDB + Mongoose
- 文件上传：Multer
- 音乐播放：HTML5 Audio
- 登录验证：JWT

## 当前 MVP 功能

- 用户注册、登录、退出
- 登录状态本地保存
- 上传歌曲和封面
- 类 Apple Music 风格资料库界面
- 首页精选歌曲卡片和封面速览
- 首页歌曲列表
- 歌曲搜索和分类快捷筛选
- 歌曲详情弹窗
- 音乐播放、上一首、下一首、自动播放下一首
- 播放次数统计
- 收藏 / 取消收藏
- 我的收藏
- 我的上传
- 上传者或管理员删除歌曲

## 项目结构

```text
backend/              后端项目
backend/controllers   控制器
backend/models        Mongoose 数据模型
backend/routes        后端路由
backend/middleware    中间件
backend/uploads       音乐和封面上传目录
frontend/             前端项目
frontend/src          Vue 源码
docs/                 检查文档
```

## 运行方式

后端：

```bash
cd backend
npm install
npm run dev
```

前端：

```bash
cd frontend
npm install
npm run dev
```

浏览器访问：

```text
http://localhost:5173/
```

## 环境变量

后端需要 `backend/.env`，示例：

```env
MONGO_URI=mongodb://127.0.0.1:27017/music_website
JWT_SECRET=your_jwt_secret
PORT=3000
```

不要提交真实 `.env`。

## 数据保存说明

MongoDB 只保存音乐和封面的访问路径，例如：

```text
/uploads/music/xxx.mp3
/uploads/covers/xxx.jpg
```

真实文件保存在 `backend/uploads` 目录，不直接写入 MongoDB。

## 常用接口

```text
POST   /api/users/register
POST   /api/users/login
GET    /api/users/profile

GET    /api/songs
POST   /api/songs
GET    /api/songs/:id
POST   /api/songs/:id/play
DELETE /api/songs/:id

GET    /api/favorites
GET    /api/favorites/:songId/status
POST   /api/favorites/:songId
DELETE /api/favorites/:songId
```

## 管理员账号

项目没有预设管理员账号。注册用户默认是普通用户，如果需要管理员，可以在 MongoDB 中修改：

```js
db.users.updateOne(
  { username: "你的用户名" },
  { $set: { role: "admin" } }
)
```

修改后重新登录即可。

## 检查文档

前端检查流程见：

```text
docs/frontend-checklist.md
```

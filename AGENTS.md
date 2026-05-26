# 项目说明

这是一个数据库课程结课实验项目：基于 Vue 3 + Node.js + Express + MongoDB 的音乐网站。

## 技术栈

- 前端：Vue 3
- 后端：Node.js + Express
- 数据库：MongoDB + Mongoose
- 文件上传：Multer
- 音乐播放：HTML5 Audio
- 登录验证：JWT

## 项目结构

- frontend：前端项目
- backend：后端项目
- backend/models：Mongoose 数据模型
- backend/routes：后端路由
- backend/controllers：控制器
- backend/middleware：中间件
- backend/uploads：音乐和封面上传目录

## 开发要求

- 不要一次性重构整个项目。
- 每次只完成一个小功能。
- 代码适合数据库课程结课实验展示。
- 优先保证功能能运行，再考虑美化。
- MongoDB 只保存音乐文件路径，不直接保存 mp3 文件。
- 不要删除或泄露 backend/.env。
- 不要提交 node_modules、.env、真实音乐文件。
- 接口返回中文 message，方便课堂演示。

## 后端运行方式

```bash
cd backend
npm install
npm run dev

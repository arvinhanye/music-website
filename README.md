# Music Lab 音乐网站课程实验

基于 Vue 3、Node.js、Express 和 MongoDB 实现的音乐资料库网站，用于数据库课程结课实验展示。

项目支持用户登录、歌曲上传、在线播放、分类搜索、收藏管理和个人上传管理。MongoDB 只保存音乐与封面的访问路径，真实文件由后端上传目录保存。

## 技术栈

- 前端：Vue 3 + Vite
- 后端：Node.js + Express
- 数据库：MongoDB + Mongoose
- 文件上传：Multer
- 音乐播放：HTML5 Audio
- 登录验证：JWT

## 当前功能

### 账户

- 用户注册、登录和退出
- JWT 登录验证
- 登录状态本地保存
- 普通用户与管理员角色展示

### 音乐资料库

- 精选歌曲与最近加入展示
- 歌曲名称、歌手、专辑关键词搜索
- 流行、民谣、摇滚、电子等分类筛选
- 歌曲详情弹窗
- 播放次数统计

### 播放器

- 自定义底部播放器
- 播放、暂停、上一首和下一首
- 播放进度拖动与时间显示
- 桌面端音量调节
- 未播放时使用紧凑播放器，播放后自动展开
- 当前歌曲信息和封面展示
- 播放结束后自动播放下一首

### 上传与管理

- 三步式歌曲上传工作台
- 音频和封面文件选择
- 上传信息实时预览
- 必填项、完成度和文件大小提示
- 我的上传与删除管理
- 上传者或管理员删除权限

### 收藏

- 收藏和取消收藏
- 我的收藏列表
- 收藏状态一次请求同步，避免逐首查询

### 界面体验

- 深色响应式音乐网站界面
- 桌面侧边栏与手机四栏导航
- 桌面、手机自适应播放器
- SVG 图标系统
- 首屏骨架加载
- Toast 消息、页面切换与弹窗动画
- 键盘焦点、`Esc` 关闭弹窗和减少动态效果支持

## 项目结构

```text
backend/
├── controllers/       控制器
├── db/                MongoDB 连接
├── middleware/        JWT 与文件上传中间件
├── models/            Mongoose 数据模型
├── routes/            Express 路由
├── scripts/           Demo 数据生成脚本
└── uploads/           音乐与封面文件目录

frontend/
├── public/            静态资源
└── src/
    ├── components/    通用前端组件
    ├── api.js         API 请求封装
    ├── App.vue        页面与业务交互
    └── styles.css     全局界面样式

docs/
├── frontend-checklist.md
└── optimization-log.md
```

## 本地运行

### 1. 启动 MongoDB

确保本机 MongoDB 服务已经运行。

### 2. 配置后端环境变量

在 `backend/.env` 中配置：

```env
MONGO_URI=mongodb://127.0.0.1:27017/music_website
JWT_SECRET=your_jwt_secret
PORT=3000
```

不要提交真实 `.env`。

### 3. 启动后端

```bash
cd backend
npm install
npm run dev
```

后端默认地址：

```text
http://localhost:3000
```

### 4. 生成 Demo 数据（可选）

```bash
cd backend
npm run seed
```

脚本会生成合成 WAV 测试音频和 SVG 封面，并写入测试歌曲。Demo 账号：

```text
用户名：demo
密码：123456
```

### 5. 启动前端

```bash
cd frontend
npm install
npm run dev
```

浏览器访问：

```text
http://localhost:5173
```

## 数据保存方式

MongoDB 只保存文件访问路径：

```text
/uploads/music/xxx.mp3
/uploads/covers/xxx.jpg
```

音乐和封面文件保存在 `backend/uploads`，不直接写入 MongoDB。真实音乐文件、`.env`、`node_modules` 和前端构建目录均已在 `.gitignore` 中排除。

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

接口返回中文 `message`，便于课堂演示。

## 管理员账号

注册用户默认为普通用户。如需演示管理员权限，可在 MongoDB 中修改：

```js
db.users.updateOne(
  { username: "你的用户名" },
  { $set: { role: "admin" } }
)
```

修改后重新登录。

## 构建检查

```bash
cd frontend
npm run build
```

更完整的检查步骤见 [前端检查清单](docs/frontend-checklist.md)。

界面与性能优化记录见 [优化日志](docs/optimization-log.md)。

## 前端组件

前端核心界面已按职责拆分：

```text
AppSidebar.vue   侧边栏、手机导航和账户入口
SongList.vue     通用歌曲列表与局部操作状态
MusicPlayer.vue  音频播放、进度、音量与切歌
UploadForm.vue   上传表单、文件预览与校验
SongModal.vue    歌曲详情弹窗
AppIcon.vue      本地 SVG 图标系统
```

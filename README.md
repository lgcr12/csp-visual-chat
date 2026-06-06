# CSP Visual Chat

一个基于 CSP 角色技能蒸馏流程的本地二次元角色聊天与桌宠平台。它可以创建角色卡、自动抓取角色头像/立绘候选图，并在聊天界面右侧显示普通立绘、Q版或 Live2D 桌宠。

## 功能

- 使用角色名和作品名创建角色卡。
- 自动调用 CSP 检索角色资料，生成角色聊天提示词。
- 创建角色时自动抓取候选图片，可分别设置头像、角色卡图和桌宠图。
- 支持三种桌宠模式：
  - 普通立绘
  - Q版
  - Live2D
- 上传或远程下载图片后自动处理抠图。
- 桌宠支持点击、键盘触发、拖拽和动作反馈。
- 支持本地预览模型，也可配置 OpenAI-compatible API。

## 技术栈

- Runtime: Node.js 20+
- Backend: Node.js 原生 `http` 服务
- Frontend: 原生 HTML / CSS / JavaScript
- Data: 本地 JSON 文件
- Image processing: Python, Pillow, rembg, OpenCV
- Live2D runtime:
  - Live2D Cubism Core
  - PixiJS
  - pixi-live2d-display

项目没有引入前端构建链，启动后直接由 Node 服务静态页面和 API。

## 基于的 Skill

核心角色资料与提示词生成基于：

- [qian-gugugaga/Character_Skill_Producer](https://github.com/qian-gugugaga/Character_Skill_Producer)

本项目以这个 CSP Skill 仓库为核心能力来源，用它完成角色资料检索、证据整理和角色提示词生成。

本地 Codex Skill 名称：

- `csp` / `character-skill-producer`: 二次元角色技能蒸馏器，用于检索萌娘百科等资料并生成角色行为提示词。

UI 和交互打磨参考：

- `ui-ux-pro-max`: 用于桌宠模式选择、候选图选择器、交互状态和界面可用性优化。

## 下载方法

```bash
git clone <your-repo-url>
cd csp-visual-chat
```

如果你是从 GitHub 页面下载，也可以点击 `Code` -> `Download ZIP`，解压后进入项目目录。

## 安装

安装 Node.js 依赖。当前项目没有 npm 第三方依赖，但建议执行一次以保持 npm 工作流一致。

```bash
npm install
```

安装可选 Python 抠图依赖。没有这些依赖时项目仍可运行，但复杂背景抠图质量会下降。

```bash
python -m pip install -r requirements.txt
```

首次使用 `rembg` 的动漫抠图模型时，会自动下载模型到本机缓存目录，例如 Windows 上的：

```text
C:\Users\<YourName>\.u2net
```

## 使用方法

启动服务：

```bash
npm start
```

默认访问：

```text
http://localhost:4173
```

如果需要指定端口：

```bash
# PowerShell
$env:PORT=4175; npm start
```

打开页面后：

1. 点击角色选择。
2. 点击新建角色。
3. 填写角色名和作品名。
4. 系统会自动抓取候选图，也可以点击“抓取候选图”手动刷新。
5. 在候选图里选择头像、角色卡图、桌宠图。
6. 选择桌宠模式：普通立绘、Q版或 Live2D。
7. 提交生成角色卡。

## 桌宠模式

### 普通立绘

适合全身角色图。系统会优先使用候选图里的全身立绘，并自动下载高清原图和抠图。

### Q版

适合 SD、chibi、二头身、三头身图片。若没有找到 Q 版图，会回退使用普通立绘，避免桌宠为空。

### Live2D

选择 `Live2D` 后，需要填写模型的 `model3.json` URL。模型资源需要能被浏览器访问，且相关贴图、动作、物理文件路径需要相对 `model3.json` 正确。

当前支持基础展示、点击、拖拽和动作反馈。更细的表情和动作组绑定可以继续扩展。

## 图片处理

桌宠图会经过自动处理：

1. 优先使用 `rembg` 的 `isnet-anime` 动漫主体分割模型。
2. 失败时回退到 `u2net` 通用模型。
3. 再失败时使用 OpenCV GrabCut。
4. 最后回退到白底边缘 flood fill 抠图。

高品质桌宠最适合使用透明 PNG 或背景简单的全身立绘。半身头像、复杂街景背景、人物贴边过多的图片，自动抠图仍可能残留背景。

## 目录结构

```text
.
├─ data/                  # 本地角色和会话 JSON
├─ public/                # 前端页面、样式、脚本和上传资源
├─ tools/                 # 图片处理脚本
├─ server.js              # Node 后端服务
├─ package.json
├─ requirements.txt
└─ README.md
```

## 注意

- `data/*.json` 是本地运行数据。
- `public/assets/uploads/` 是本地上传和生成图片。
- 如果要发布公开仓库，建议不要提交私人聊天记录、API Key 或不希望公开的图片素材。
- OpenAI-compatible API Key 只保存在浏览器本地存储，不会写入仓库。

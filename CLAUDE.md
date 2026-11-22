# CLAUDE.md

FinGlobe：宏观经济与地缘政治事件的 3D 可视化看板（React + Vite，Vercel Serverless API，Supabase）。见 README.md。

## 小红书视频合规（强制，适用于所有视频）

本项目的视频及配套文字（口播稿、字幕、标题、封面文字、正文、话题标签、评论回复、账号简介）都会发布到小红书，**必须遵守 `docs/xiaohongshu-rules.md`**。

做任何视频相关的内容时：

1. 动笔前先读 `docs/xiaohongshu-rules.md`，尤其是第 0 节自查表、第 2 节金融红线和第 8 节本项目专属提醒。
2. 写完把所有文字放进文件，运行 `npm run xhs-check -- <文件...>`。**红线命中必须改到 0**；“注意”项逐条判断，事实陈述可以保留，营销或诱导语境必须改。
3. 交付时附上第 0 节自查表的逐项结果，扫描不到的画面、AI 标识、地图、来源也要写明。
4. 默认写法：不荐股、不报股票代码、不承诺收益；每条事实标来源（机构/媒体 + 日期）；结尾加风险提示；用了 AI 就标注。
5. 规则或词库要更新时，同步修改 `docs/xiaohongshu-rules.md` 和 `docs/xiaohongshu-banned-words.json`，并更新“整理日期”。

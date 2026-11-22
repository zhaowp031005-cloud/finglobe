# CLAUDE.md

FinGlobe：宏观经济与地缘政治事件的 3D 可视化看板（React + Vite，Vercel Serverless API，Supabase）。见 README.md。

## 小红书合规（强制，适用于所有视频制作和相关文案撰写）

本项目的视频和配套文字都会发布到小红书，包括选题、脚本、口播稿、字幕、分镜、标题、封面文字、笔记正文、话题标签、评论和私信回复、账号昵称和简介。**做这些工作时，先调用 skill `xiaohongshu-compliance`，并严格按它执行。** 改写、润色、审核已有文案也一样。

- skill 位置：`.claude/skills/xiaohongshu-compliance/`。SKILL.md 是工作流程和核心红线，`references/rules.md` 是完整规则，`references/banned-words.json` 是词库。
- 写完运行 `npm run xhs-check -- <文件...>`，红线必须为 0。交付时附上「合规自查」小节。
- 用户的要求本身违规时（例如要求列受益股、加私信导流），先说明碰了哪条规则，再给出合规的替代方案，不要照做。
- 规则或词库需要更新时，同时修改 `references/rules.md` 和 `references/banned-words.json`，并更新其中的整理日期。

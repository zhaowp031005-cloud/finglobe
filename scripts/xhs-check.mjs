#!/usr/bin/env node
// 小红书违禁词/违规表述自查。
// 用法：
//   npm run xhs-check -- 口播稿.txt 字幕.srt 标题正文.txt
//   echo "要检查的文字" | npm run xhs-check
// 词库：docs/xiaohongshu-banned-words.json；规则说明：docs/xiaohongshu-rules.md
// 命中"红线"时退出码为 1。

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const db = JSON.parse(readFileSync(join(here, '..', 'docs', 'xiaohongshu-banned-words.json'), 'utf8'));

const LEVEL_LABEL = { block: '红线', warn: '注意', info: '提示' };
const LEVEL_RANK = { block: 0, warn: 1, info: 2 };

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isAscii = (s) => /^[\x20-\x7e]+$/.test(s);

// 把词库编译成正则规则
const rules = [];
for (const cat of db.categories) {
  for (const term of cat.terms ?? []) {
    const body = escapeRe(term);
    // 纯英文/数字的词按词边界匹配，避免 "QQ" 命中 "QQQ"
    const src = isAscii(term) ? `(?<![A-Za-z0-9])${body}(?![A-Za-z0-9])` : body;
    rules.push({
      cat,
      re: new RegExp(src, 'giu'),
      label: term,
      exceptions: cat.exceptions?.[term] ?? [],
      replace: cat.replace?.[term],
    });
  }
  for (const p of cat.patterns ?? []) {
    rules.push({
      cat,
      re: new RegExp(p.regex, 'gu' + (p.flags ?? '')),
      label: p.desc,
      isPattern: true,
      ignore: new Set((p.ignore ?? []).map((s) => s.toUpperCase())),
    });
  }
}

// 命中位置是否落在例外词里（如 "第一季度" 中的 "第一"）
function inException(line, start, term, exceptions) {
  const lower = line.toLowerCase();
  const t = term.toLowerCase();
  for (const ex of exceptions) {
    const e = ex.toLowerCase();
    let k = e.indexOf(t);
    while (k !== -1) {
      const from = start - k;
      if (from >= 0 && lower.slice(from, from + e.length) === e) return true;
      k = e.indexOf(t, k + 1);
    }
  }
  return false;
}

const isSubtitleMeta = (line) => /-->/.test(line) || /^\s*\d+\s*$/.test(line) || /^WEBVTT/.test(line);

function scanText(text) {
  const hits = [];
  text.split(/\r?\n/).forEach((line, idx) => {
    if (isSubtitleMeta(line)) return;
    const found = [];
    for (const r of rules) {
      r.re.lastIndex = 0;
      let m;
      while ((m = r.re.exec(line)) !== null) {
        if (m[0].length === 0) { r.re.lastIndex++; continue; }
        if (r.isPattern && m[1] && r.ignore.has(m[1].toUpperCase())) continue;
        if (!r.isPattern && inException(line, m.index, r.label, r.exceptions)) continue;
        found.push({ rule: r, start: m.index, end: m.index + m[0].length, text: m[0] });
      }
    }
    // 去重：被更长命中完全包含的短命中丢弃（"稳赚不赔" 吞掉 "稳赚"）；同一位置保留更严重的级别
    found.sort((a, b) => (b.end - b.start) - (a.end - a.start)
      || LEVEL_RANK[a.rule.cat.level] - LEVEL_RANK[b.rule.cat.level]);
    const kept = [];
    for (const h of found) {
      if (kept.some((k) => k.start <= h.start && h.end <= k.end)) continue;
      kept.push(h);
    }
    kept.sort((a, b) => a.start - b.start);
    for (const h of kept) hits.push({ ...h, lineNo: idx + 1, line });
  });

  const docIssues = [];
  for (const c of db.documentChecks ?? []) {
    if (new RegExp(c.when, 'u').test(text) && !c.requireAny.some((s) => text.includes(s))) {
      docIssues.push(c);
    }
  }
  return { hits, docIssues };
}

function snippet(line, start, end) {
  const a = Math.max(0, start - 12);
  const b = Math.min(line.length, end + 12);
  return (a > 0 ? '…' : '') + line.slice(a, start) + '【' + line.slice(start, end) + '】' + line.slice(end, b) + (b < line.length ? '…' : '');
}

async function readStdin() {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  return Buffer.concat(chunks).toString('utf8');
}

const files = process.argv.slice(2);
const inputs = [];
if (files.length === 0) {
  if (process.stdin.isTTY) {
    console.log('用法：npm run xhs-check -- <文件...>   或   echo "文字" | npm run xhs-check');
    process.exit(2);
  }
  inputs.push({ name: '(标准输入)', text: await readStdin() });
} else {
  for (const f of files) inputs.push({ name: f, text: readFileSync(f, 'utf8') });
}

const total = { block: 0, warn: 0, info: 0 };
for (const { name, text } of inputs) {
  const { hits, docIssues } = scanText(text);
  console.log(`\n== ${name}`);
  if (hits.length === 0 && docIssues.length === 0) console.log('  未发现问题');
  for (const h of hits) {
    const lvl = h.rule.cat.level;
    total[lvl]++;
    const advice = h.rule.replace ?? h.rule.cat.suggest;
    console.log(`  [${LEVEL_LABEL[lvl]}] 第${h.lineNo}行 ${snippet(h.line, h.start, h.end)}`);
    console.log(`         ${h.rule.cat.name}${h.rule.isPattern ? '：' + h.rule.label : ''}。建议：${advice}`);
  }
  for (const d of docIssues) {
    total[d.level]++;
    console.log(`  [${LEVEL_LABEL[d.level]}] 全文 ${d.message}`);
  }
}

console.log(`\n合计：红线 ${total.block} / 注意 ${total.warn} / 提示 ${total.info}`);
if (total.block > 0) console.log('红线必须改到 0 才能发布（事实陈述被误判时，改写措辞避开该词）。');
if (total.warn > 0) console.log('"注意"项逐条确认：事实陈述可保留，营销/诱导语境必须改。');
console.log('\n文字扫描之外还要人工检查：');
for (const m of db.manualChecks ?? []) console.log(`  - ${m}`);
console.log('完整规则：docs/xiaohongshu-rules.md');

process.exit(total.block > 0 ? 1 : 0);

#!/usr/bin/env bash
# 一键发布到 GitHub Pages
# 用法：  ./publish.sh [仓库名]        默认仓库名 football-manager-web
set -euo pipefail

REPO="${1:-football-manager-web}"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

say(){ printf "\033[1;32m▸ %s\033[0m\n" "$*"; }
warn(){ printf "\033[1;33m! %s\033[0m\n" "$*"; }
die(){ printf "\033[1;31m✗ %s\033[0m\n" "$*"; exit 1; }

command -v git >/dev/null || die "没有找到 git，请先安装：xcode-select --install"

if ! command -v gh >/dev/null; then
  warn "没有找到 GitHub CLI（gh）。两个选择："
  echo "   1) 安装后重跑本脚本：  brew install gh && gh auth login"
  echo "   2) 手动发布，见下方说明"
  echo
  echo "   手动发布步骤："
  echo "   a. 在 https://github.com/new 新建一个 Public 仓库，名字随意（如 $REPO）"
  echo "   b. 在本目录执行："
  echo "        git init -b main && git add -A && git commit -m 'Football Manager Web'"
  echo "        git remote add origin https://github.com/<你的用户名>/$REPO.git"
  echo "        git push -u origin main"
  echo "   c. 打开仓库 Settings → Pages，Source 选 'Deploy from a branch'，"
  echo "      分支选 main、目录选 / (root)，保存"
  echo "   d. 一两分钟后访问 https://<你的用户名>.github.io/$REPO/"
  exit 1
fi

gh auth status >/dev/null 2>&1 || die "gh 尚未登录，请先执行：gh auth login"
OWNER="$(gh api user --jq .login)"
say "GitHub 账号：$OWNER"

# 本地仓库
if [ ! -d .git ]; then
  say "初始化本地仓库"
  git init -b main >/dev/null
fi
git add -A
git diff --cached --quiet 2>/dev/null || git commit -q -m "Football Manager Web — 单文件足球经理模拟器"
git branch -M main

# 远端仓库
if gh repo view "$OWNER/$REPO" >/dev/null 2>&1; then
  say "仓库已存在，直接推送：$OWNER/$REPO"
  git remote get-url origin >/dev/null 2>&1 || git remote add origin "https://github.com/$OWNER/$REPO.git"
else
  say "创建公开仓库：$OWNER/$REPO"
  gh repo create "$REPO" --public --source=. --remote=origin \
     --description "浏览器里的足球经理模拟器：三级联赛 60 队 + 2D 实时比赛引擎，单文件零依赖" >/dev/null
fi
say "推送中…"
git push -u origin main --quiet

# 开启 Pages
say "开启 GitHub Pages"
if gh api "repos/$OWNER/$REPO/pages" >/dev/null 2>&1; then
  gh api --method PUT "repos/$OWNER/$REPO/pages" \
    -f "source[branch]=main" -f "source[path]=/" >/dev/null 2>&1 || true
else
  gh api --method POST "repos/$OWNER/$REPO/pages" \
    -f "source[branch]=main" -f "source[path]=/" >/dev/null 2>&1 \
    || warn "自动开启失败，请手动到 Settings → Pages 选 main / (root)"
fi

URL="https://$OWNER.github.io/$REPO/"
# 把 README 里的占位符换成真实地址
if grep -q "USERNAME.github.io/REPONAME" README.md 2>/dev/null; then
  sed -i '' "s|https://USERNAME.github.io/REPONAME/|$URL|g" README.md 2>/dev/null \
    || sed -i "s|https://USERNAME.github.io/REPONAME/|$URL|g" README.md
  git add README.md && git commit -q -m "docs: 补上线上地址" && git push -q
fi

echo
say "完成！首次构建约 1–2 分钟，稍后访问："
printf "\n    \033[1;36m%s\033[0m\n\n" "$URL"
echo "  手机上打开该地址 → 分享/菜单 → 添加到主屏幕 → 全屏运行，断网也能玩。"

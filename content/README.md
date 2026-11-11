# 서재 콘텐츠

이 폴더의 마크다운 파일이 그대로 서재에 실립니다. GitHub 웹에서 파일을 추가·수정하고 커밋하면
`main` 에 반영되는 순간 자동으로 다시 배포됩니다.

## 책 (`books/<책-아이디>/book.md`)

```markdown
---
title: 책 제목
subtitle: 부제 (선택)
author: 글·그림 누구
publisher: 라이크북
cover: cover.jpg        # 같은 폴더의 표지 이미지
endpaper: endpaper.jpg  # 면지 (선택)
color: "#8fb9c4"        # 표지 대신 쓰일 색 (선택)
order: 1                # 책장에 놓이는 순서
---

# 1장 제목

문단은 빈 줄로 구분합니다.

![그림 설명](그림파일.jpg)   ← 그림은 한 쪽 전체에 실립니다

> 인용문

---   ← 여기서 다음 쪽으로 넘깁니다
```

쪽 나누기는 화면 크기에 맞춰 자동으로 됩니다. 이미지 파일은 `book.md` 와 같은 폴더에 두세요.

## 서재지기의 책상 (`journal/*.md`)

```markdown
---
title: 글 제목
date: 2026-11-11
category: 서재지기의 일기   # 서재지기의 일기 / 책 이야기 / 서재 소식 등 자유롭게
---

본문
```

파일 이름은 `날짜-영문이름.md` 처럼 지으면 정리하기 좋아요. 최신 글이 위에 보입니다.

문단은 빈 줄로 나누고, 문단 안에서 줄을 바꾸면 그대로 줄이 바뀌어 보여요 (시처럼 짧은 줄에 좋아요).

## 네이버 블로그 글 가져오기

블로그(https://blog.naver.com/lik3book)에 쓴 글 중 정해 둔 카테고리의 글을 가져올 수 있어요. 원할 때만 실행됩니다.

1. GitHub 저장소 → **Actions** → **Import Naver Blog** → **Run workflow**
2. `categories` 에 가져올 카테고리 이름을 넣고 실행 (여러 개는 쉼표로)
   - 매번 같은 카테고리라면 Settings → Secrets and variables → Actions → Variables 에 `NAVER_CATEGORIES` 로 저장해 두면 빈칸으로 실행해도 돼요.
   - 비워 두고 실행하면 블로그의 카테고리 목록만 로그에 보여 줘요.
3. 새 글이 있으면 `journal/날짜-naver-글번호.md` 로 저장되고(사진 포함), 사이트가 자동으로 다시 배포돼요.

- 블로그에서 글을 고쳤다면 `overwrite` 를 체크하고 다시 실행하세요.
- RSS 에 없는 오래된 글은 `post_urls` 에 글 주소를 넣으면 가져와요.
- 가져온 글의 마지막 쪽에는 '블로그에서 보기' 링크가 붙어요.

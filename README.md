# Olive - 家族共有 献立アプリ

iOS・Web 対応の家族共有献立管理アプリです。

## 機能

| 機能 | 説明 |
|---|---|
| カレンダー献立登録 | 日付×朝/昼/夜ごとに献立を登録 |
| 料理| 料理名・レシピURL・材料一覧を管理 |
| 材料管理 | 材料名・数量・単位を料理に紐付け |
| 買い物自動生成 | 週単位で食材を合算、チェックボックス付き |
| レシピURL保存 | 料理にレシピURLを保存、タップで開く |

## アーキテクチャ

```
Olive/
├── backend/          # Node.js + Express + SQLite REST API
│   └── src/
│       ├── index.ts
│       ├── db/database.ts
│       └── routes/
│           ├── dishes.ts      # 料理 CRUD
│           ├── mealPlans.ts   # 献立 CRUD
│           └── shopping.ts   # 買い物
└── app/              # Expo (React Native) - iOS & Web
    ├── app/
    │   ├── _layout.tsx
    │   └── (tabs)/
    │       ├── index.tsx      # カレンダー画面
    │       ├── dishes.tsx     # 料理画面
    │       └── shopping.tsx   # 買い物画面
    └── src/
        ├── api/client.ts
        ├── hooks/
        ├── types/
        └── components/
```

## セットアップ

### 1. 依存関係インストール

```bash
npm run install:all
```

### 2. バックエンド起動

```bash
npm run backend
# → http://localhost:3000
```

### 3. アプリ起動

```bash
# iOS シミュレータ
npm run app

# Web ブラウザ
npm run app:web
```

### 環境変数

`app/.env.local` を作成して API URL を指定:

```
EXPO_PUBLIC_API_URL=http://localhost:3000
```

本番環境では適切なサーバー URL に変更してください。

## API エンドポイント

### 料理
| メソッド | パス | 説明 |
|---|---|---|
| GET | `/dishes` | 一覧取得 |
| POST | `/dishes` | 新規作成 |
| PUT | `/dishes/:id` | 更新 |
| DELETE | `/dishes/:id` | 削除 |

### 献立
| メソッド | パス | 説明 |
|---|---|---|
| GET | `/meal-plans?from=&to=` | 期間取得 |
| POST | `/meal-plans` | 追加 |
| DELETE | `/meal-plans/:id` | 削除 |

### 買い物
| メソッド | パス | 説明 |
|---|---|---|
| GET | `/shopping?week_start=` | 週の一覧取得 |
| POST | `/shopping/generate` | 献立から自動生成 |
| POST | `/shopping` | カスタム追加 |
| PATCH | `/shopping/:id/check` | チェック切り替え |
| DELETE | `/shopping/:id` | 削除 |

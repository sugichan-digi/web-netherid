# CLAUDE.md 

## プロジェクト概要


```
frontend/   # 静的フロントエンド（HTML / CSS / jQuery）
backend/    # Laravel バックエンド（PHP 8.4 / MySQL）
mock/       # PHP モック API（開発・仕様確認用）
docs/       # 設計書（openapi.yaml / db_design.md 等）
```

---

## フロントエンド コーディングルール

**詳細設計書: [`.claude/frontend.md`](.claude/frontend.md)**

フロントエンドを実装・修正する際は以下のルールを**必ず**守ること（詳細は上記ファイルを参照）。

1. **FW/ビルドツール不使用**: 静的 HTML / Vanilla CSS / jQuery (v4.0.0) のみを使用。
2. **ディレクトリ分割**: 画面・機能ごとにディレクトリを分け、原則として `index.html`, `style.css`, `script.js` を配置する。
3. **パス指定**: リソース読み込みは必ずルート相対パス（絶対パス: `/` から始まるパス）を使用する。
4. **CSS**: Vanilla CSSを用い、`design-system/style.css` のCSS変数や共通クラスを活用する。
5. **API通信の共通化**: 直接 `$.ajax` を叩かず、必ず `common.js` 等の `api()` 関数を利用して通信を行う。
6. **スコープ保護**: `script.js` は全体を `$(function () { ... });` で囲む。
7. **絵文字の使用禁止**: デザインやUIの装飾に絵文字は絶対に使用せず、SVG等のアイコンを適宜作成・使用すること。

---

## デザインシステム（コンポーネント）設計ルール

**詳細設計書: [`.claude/design-system.md`](.claude/design-system.md)**

フロントエンドにおける共通CSS（`design-system/style.css`）の構築や、各画面のUIコンポーネントの実装については、必ず上記の設計書に定義された「見た目・装飾・振る舞い」の要件に従うこと。
（※見出しの装飾、ボタンのホバーアクション、入力フォームのフォーカスリング、アイコンのSVG化など、細部のデザイン指示が記載されています）

---

## Kratos 認証フロー実装ルール

**詳細設計書: [`docs/kratos_auth_flow.md`](docs/kratos_auth_flow.md)**

Ory Kratosを利用したフロントエンドの「新規登録」「認証コード検証」「ログイン」画面の構築とAPI通信（CORSやセッションCookieの扱い、エラーハンドリング）については、必ず上記の手順書に従うこと。

---

## バックエンド コーディングルール

**詳細設計書: [`.claude/backend.md`](.claude/backend.md)**

バックエンドを実装する際は以下のルールを**必ず**守ること。

### ディレクトリ構成

```
backend/app/
├── Http/Controllers/  # リクエスト受付・レスポンス返却のみ
├── Models/            # DB クエリメソッド定義のみ
├── Data/            # データ、readonlyオブジェクト
└── Services/          # ビジネスロジック
```

依存方向: **Controller → Service → Model（一方向のみ）**

### 絶対に守るルール

1. **Eloquent ORM は使用禁止** — `User::find()` `$model->save()` など一切 NG
2. **DB アクセスは DB ファサード + メソッドチェーンのみ** — 生 SQL 文字列の直接記述禁止
   - `use Illuminate\Support\Facades\DB;`
   - `DB::table('lunches')->where(...)->get()` の形式で書く
3. **DB 操作は必ず `DB::transaction()` 内に書く**（INSERT / UPDATE / DELETE すべて）
4. **トランザクション失敗時は `try/catch` で捕捉し `Log::channel('error')->error()` でログ記録**
5. **ログは access.log と error.log を分けて出力**（`config/logging.php` にチャンネル設定）
6. **値オブジェクト（`readonly class`）を活用して構造化**（配列の生渡し禁止）
7. **PHPDoc コメントは日本語・体言止めで全クラス・全メソッドに付ける**
8. **URI 先頭に `/api` や `/v1` は付けない**（サブドメイン `api.lunchmap.jp` で分離）
9. **画像は `storage/app/public/images/` に保存**（`Storage::disk('public')` 使用）
10. **セッション・キャッシュはファイル保存**（`.env`: `SESSION_DRIVER=file` `CACHE_DRIVER=file`）

### .env 必須設定

```dotenv
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=lunchmap
DB_USERNAME=root
DB_PASSWORD=

SESSION_DRIVER=file
CACHE_DRIVER=file
QUEUE_CONNECTION=sync
```

### トランザクションテンプレート

```php
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

try {
    DB::transaction(function () use ($input) {
        DB::table('lunches')->insertGetId([...]);
    });
} catch (\Throwable $e) {
    Log::channel('error')->error('処理名失敗', [
        'message' => $e->getMessage(),
        'trace'   => $e->getTraceAsString(),
    ]);
    throw $e;
}
```

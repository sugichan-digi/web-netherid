# NetherID 詳細API設計書

本ドキュメントは、NetherIDの独自バックエンド（Laravel）が提供するAPIの仕様を定義します。
※パスワード変更や新規登録といった認証フロー自体は、すべてOry KratosのPublic APIをフロントエンドから直接呼び出すため、本設計書には含みません。

## 1. 共通仕様・前提条件

### 1.1. ベースURLとルーティング
* **エンドポイント方針**: URIの先頭に `/api` や `/v1` は付与しません。本番環境では `api.netherid.com` のような専用サブドメインで運用される前提です。
* **通信フォーマット**: リクエスト・レスポンスともに `application/json` を使用します。

### 1.2. 認証・認可 (Authentication & Authorization)
* **セッション管理**: Ory Kratosで発行されたCookie（例: `ory_kratos_session`）を利用します。
* **バックエンド側での認証**: Laravelのミドルウェア層で、リクエストに付与されたCookieを用いてKratosの `GET /sessions/whoami` に検証リクエストを送り、有効なセッションか判定します。
* **ユーザーの自動同期**: Kratosでの検証が成功した際、Laravelの `users` テーブルに該当の `kratos_identity_id` が存在しない場合は、ミドルウェア内で自動的にレコード（ユーザー）を作成（JITプロビジョニング）します。
* **認証任意エンドポイント** (`kratos.optional`): セッションがあればユーザー情報を付与するが、未ログインでも正常にレスポンスを返します。
* **認証必須エンドポイント** (`kratos.auth`): 有効なセッションCookieがない場合は `401` を返します。

### 1.3. エラーレスポンス共通フォーマット
```json
{
  "message": "エラーの概要",
  "errors": {
    "field_name": ["詳細なエラーメッセージ"]
  }
}
```
* **401 Unauthorized**: セッションが無効、または未ログインの場合。
* **403 Forbidden**: アクセス権限がない場合。
* **404 Not Found**: リソースが存在しない場合。
* **422 Unprocessable Entity**: バリデーションエラーの場合。
* **500 Internal Server Error**: サーバー内部エラー。

---

## 2. APIエンドポイント定義

### 2.1. お知らせ一覧取得

公開済みのお知らせ情報を一覧で取得します。

* **エンドポイント**: `GET /notifications`
* **認証要件**: 任意（未ログインでも取得可）
* **リクエストパラメータ**: なし

* **レスポンス (200 OK)**:
```json
{
  "notifications": [
    {
      "id": 1,
      "title": "NetherIDをリリースしました",
      "content": "共通ID管理プラットフォーム「NetherID」のベータ版提供を開始しました...",
      "url": null,
      "published_at": "2026-05-08T12:00:00Z"
    }
  ]
}
```

| フィールド | 型 | 説明 |
|---|---|---|
| `id` | integer | お知らせID |
| `title` | string | タイトル |
| `content` | string | 本文 |
| `url` | string\|null | 関連URL（任意） |
| `published_at` | string (ISO 8601) | 公開日時 |

---

### 2.2. サービス一覧取得

提供中のサービス一覧を取得します。ログイン済みの場合、各サービスへの連携状況（`is_linked` / `linked_at`）が付与されます。

* **エンドポイント**: `GET /services`
* **認証要件**: 任意（未ログインでも取得可。連携状態は `is_linked: false` / `linked_at: null` として返る）
* **リクエストパラメータ**: なし

* **レスポンス (200 OK)**:
```json
{
  "services": [
    {
      "id": "subscr_optimizer",
      "name": "サブスク管理人",
      "description": "サブスクリプションを一元管理し、無駄な支出を最適化するツール。",
      "sso_url": "https://subscr-optimizer.example.com/auth/sso",
      "icon_url": "/assets/icons/subscr_optimizer.svg",
      "is_active": true,
      "is_linked": true,
      "linked_at": "2026-05-09T10:00:00Z"
    },
    {
      "id": "lunchmap",
      "name": "ランチマップ",
      "description": "現在リリース待ちです。",
      "sso_url": "https://lunchmap.example.com/auth/sso",
      "icon_url": "/assets/icons/lunchmap.svg",
      "is_active": false,
      "is_linked": false,
      "linked_at": null
    }
  ]
}
```

| フィールド | 型 | 説明 |
|---|---|---|
| `id` | string | サービス識別子 |
| `name` | string | サービス名 |
| `description` | string | サービス説明 |
| `sso_url` | string (URI) | SSO認証エントリポイント |
| `icon_url` | string | アイコン画像パス |
| `is_active` | boolean | サービス公開状態 |
| `is_linked` | boolean | 当該ユーザーの連携有無（未ログイン時は常に `false`） |
| `linked_at` | string\|null (ISO 8601) | 連携日時（未連携または未ログイン時は `null`） |

**※仕様メモ**: `is_linked` と `linked_at` は、アクセスしたユーザーの `user_linked_services` テーブルのレコード有無をバックエンド側で動的に判定・結合して返却します。

---

### 2.3. お問い合わせAPI

#### 2.3.1. お問い合わせ送信

お問い合わせ内容を送信します。

* **エンドポイント**: `POST /inquiries`
* **認証要件**: 必須（Kratos Session Cookie）
* **リクエスト**:
```json
{
  "email": "user@example.com",
  "type": "account",
  "subject": "パスワードを忘れました",
  "body": "リカバリコードも紛失してしまったため、リセットをお願いします。"
}
```

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `email` | string (email) | Yes | 連絡先メールアドレス |
| `type` | string | Yes | 種別（例: `account`, `payment`, `other`）最大50文字 |
| `subject` | string | Yes | 件名（最大255文字） |
| `body` | string | Yes | 本文 |

* **レスポンス (201 Created)**:
```json
{
  "message": "お問い合わせを受け付けました。ご入力のメールアドレス宛に控えを送信しました。",
  "inquiry_id": 1
}
```

* **エラーレスポンス (422 Unprocessable Entity)**: 必須項目不足（`email` / `type` / `subject` / `body`）。
* **エラーレスポンス (401 Unauthorized)**: 未ログインの場合。

---

#### 2.3.2. お問い合わせ履歴取得

ログインユーザー自身のお問い合わせ履歴を取得します。

* **エンドポイント**: `GET /inquiries`
* **認証要件**: 必須（Kratos Session Cookie）
* **リクエストパラメータ**: なし

* **レスポンス (200 OK)**:
```json
{
  "inquiries": [
    {
      "id": 1,
      "user_id": 1,
      "email": "user@example.com",
      "type": "account",
      "subject": "パスワードを忘れました",
      "body": "リカバリコードも紛失してしまったため、リセットをお願いします。",
      "status": "open",
      "created_at": "2026-05-08T12:00:00Z",
      "updated_at": "2026-05-08T12:00:00Z"
    }
  ]
}
```

| フィールド | 型 | 説明 |
|---|---|---|
| `id` | integer | お問い合わせID |
| `user_id` | integer | ユーザーID |
| `email` | string | 連絡先メールアドレス |
| `type` | string | 種別 |
| `subject` | string | 件名 |
| `body` | string | 本文 |
| `status` | string | ステータス（`open` / `closed`） |
| `created_at` | string (ISO 8601) | 作成日時 |
| `updated_at` | string (ISO 8601) | 更新日時 |

* **エラーレスポンス (401 Unauthorized)**: 未ログインの場合。

---

### 2.4. アカウント退会

ログインユーザーのアカウントを無効化します。Kratosのidentityの `state` を `inactive` に設定し、`metadata_admin.deactivated_at` に退会日時を記録します。

* **エンドポイント**: `DELETE /account/deactivate`
* **認証要件**: 必須（Kratos Session Cookie）
* **リクエストパラメータ**: なし

* **レスポンス (200 OK)**:
```json
{
  "message": "退会処理が完了しました。"
}
```

* **エラーレスポンス (401 Unauthorized)**: 未ログインの場合。
* **エラーレスポンス (500 Internal Server Error)**: Kratos Identityの取得・更新に失敗した場合。

---

## 3. 将来拡張API（フェーズ2以降・未実装）

フェーズ1では画面上でグレーアウト（準備中）となっている機能のAPIです。

### 3.1. KYC（本人確認）関連
* `GET /kyc/status`: 現在の審査状況を取得
* `POST /kyc/apply`: 身分証画像等を送信し申請

### 3.2. 決済・お支払い情報関連
* `GET /payments/methods`: 登録済みクレジットカード一覧取得
* `POST /payments/methods`: 新規クレジットカード（Stripe Token等）の登録
* `DELETE /payments/methods/{id}`: クレジットカードの削除

### 3.3. ポイント管理関連
* `GET /points/balance`: 現在の保有ポイント取得
* `GET /points/transactions`: ポイント増減履歴一覧取得

### 3.4. アフィリエイト・ご利用明細関連
* `GET /invoices`: ご利用明細（決済履歴）とPDFのダウンロードURL一覧取得
* `GET /affiliate/rewards`: 紹介報酬の発生状況一覧取得

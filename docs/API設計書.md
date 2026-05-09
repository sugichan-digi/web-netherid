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

## 2. APIエンドポイント定義（フェーズ1）

### 2.1. ダッシュボード初期情報取得
マイページ（ダッシュボード）表示に必要な「お知らせ」と「サービス連携状況」を一括取得します。

* **エンドポイント**: `GET /dashboard/init`
* **認証要件**: 必須（Kratos Session Cookie）
* **リクエストパラメータ**: なし

* **レスポンス (200 OK)**:
```json
{
  "user": {
    "id": 1,
    "kratos_identity_id": "123e4567-e89b-12d3-a456-426614174000"
  },
  "notifications": [
    {
      "id": 1,
      "title": "NetherIDをリリースしました",
      "content": "共通ID管理プラットフォーム「NetherID」のベータ版提供を開始しました...",
      "url": null,
      "published_at": "2026-05-08T12:00:00Z"
    }
  ],
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
**※仕様メモ**: `services` 配列内の `is_linked` と `linked_at` は、アクセスしたユーザーの `user_linked_services` テーブルのレコード有無によってバックエンド側で動的に判定・結合して返却します。

---



---

### 2.2. お問い合わせAPI
ダッシュボード（マイページ）やパブリックページからの問い合わせ内容を送信します。未ログインの場合は `user_id` なしとして登録されます。

* **エンドポイント**: `POST /inquiries`
* **認証要件**: 任意（セッションがあれば `user_id` を自動付与）
* **リクエスト**:
```json
{
  "email": "user@example.com",
  "type": "account",
  "subject": "パスワードを忘れました",
  "body": "リカバリコードも紛失してしまったため、リセットをお願いします。"
}
```

* **レスポンス (201 Created)**:
```json
{
  "message": "お問い合わせを受け付けました。ご入力のメールアドレス宛に控えを送信しました。",
  "inquiry_id": 1
}
```

* **エラーレスポンス (422 Unprocessable Entity)**: 必須項目不足（例: `email` や `body` の不足）。


## 3. 将来拡張API（フェーズ2以降・現段階ではモックのみ・または未実装）

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

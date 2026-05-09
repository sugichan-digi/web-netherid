# NetherID データベース設計書

本ドキュメントは、NetherIDの「独自バックエンド（MySQL等）」で管理するデータベース構造を定義するものです。

## 1. データ管理の境界（Kratosとの切り分け）
本システムは認証・アイデンティティ管理基盤として **Ory Kratos** を利用します。
そのため、以下のデータは**Kratos専用のデータベース（データベース名: `db_user`）で一元管理される前提**とし、独自バックエンドのDBには保持しません。
* メールアドレス、パスワードハッシュ
* 名前、住所などの基本プロフィール（Kratosの `traits` として保存）
* 認証セッション、ログイン履歴
* MFA（二要素認証）設定、リカバリコード

**独自バックエンドDBが担当する領域:**
* KratosのIdentity ID（UUID）とシステム内データの紐付け
* ダッシュボードに表示する全体向けデータ（お知らせ、サービスマスタ）
* 将来的な拡張機能（ポイント、決済、明細など）のデータ

---

## 2. テーブル定義（フェーズ1: 初期実装対象）

### 2.1. `users` (ユーザーマッピング)
KratosのIdentity IDと、バックエンドの各データを紐付けるための中間・マッピングテーブルです。

| カラム名 | データ型 | 制約 | 説明 |
| :--- | :--- | :--- | :--- |
| `id` | BIGINT | PK, AUTO_INCREMENT | 内部管理用ID |
| `kratos_identity_id` | CHAR(36) | UNIQUE, NOT NULL | Kratosで発行されたIdentityのUUID |
| `created_at` | DATETIME | NOT NULL | レコード作成日時 |
| `updated_at` | DATETIME | NOT NULL | レコード更新日時 |

### 2.2. `notifications` (お知らせ)
ダッシュボード（マイページトップ）に表示するシステムからのお知らせデータです。

| カラム名 | データ型 | 制約 | 説明 |
| :--- | :--- | :--- | :--- |
| `id` | BIGINT | PK, AUTO_INCREMENT | お知らせID |
| `title` | VARCHAR(255) | NOT NULL | お知らせタイトル |
| `content` | TEXT | | お知らせ詳細・本文 |
| `url` | VARCHAR(255) | | 外部リンクや詳細ページへのURL |
| `published_at` | DATETIME | NOT NULL | 掲載開始日時 |
| `created_at` | DATETIME | NOT NULL | 作成日時 |
| `updated_at` | DATETIME | NOT NULL | 更新日時 |

### 2.3. `services` (連携サービスマスタ)
NetherIDを利用してSSOログインが可能な関連サービス（NetherBlog等）のマスタデータです。

| カラム名 | データ型 | 制約 | 説明 |
| :--- | :--- | :--- | :--- |
| `id` | VARCHAR(50) | PK | サービスの一意な識別子 (例: `nether_blog`) |
| `name` | VARCHAR(100) | NOT NULL | サービス表示名 |
| `description` | VARCHAR(255) | | サービスの簡単な説明 |
| `sso_url` | VARCHAR(255) | NOT NULL | SSOログイン開始用エンドポイントURL |
| `icon_url` | VARCHAR(255) | | アイコン画像のパス |
| `is_active` | BOOLEAN | DEFAULT TRUE | サービスが有効かどうかのフラグ |
| `created_at` | DATETIME | NOT NULL | 作成日時 |
| `updated_at` | DATETIME | NOT NULL | 更新日時 |

### 2.4. `user_linked_services` (ユーザー連携状態)
どのユーザーが、どの関連サービスをすでに利用（連携）しているかを管理します。ダッシュボードで「連携済み」などのステータス表示に利用します。

| カラム名 | データ型 | 制約 | 説明 |
| :--- | :--- | :--- | :--- |
| `id` | BIGINT | PK, AUTO_INCREMENT | レコードID |
| `user_id` | BIGINT | FK(`users.id`), NOT NULL| 連携したユーザーの内部ID |
| `service_id` | VARCHAR(50) | FK(`services.id`), NOT NULL| 連携先サービスID |
| `linked_at` | DATETIME | NOT NULL | 連携を実施した日時 |
| `created_at` | DATETIME | NOT NULL | 作成日時 |
| `updated_at` | DATETIME | NOT NULL | 更新日時 |

*(制約: `user_id` と `service_id` の組み合わせはUNIQUE)*

### 2.5. `inquiries` (お問い合わせ履歴)
ユーザーからのお問い合わせ内容と対応ステータスを管理します。パブリックページからの未ログイン状態での問い合わせも想定し、`user_id` はNULL許可とします。

| カラム名 | データ型 | 制約 | 説明 |
| :--- | :--- | :--- | :--- |
| `id` | BIGINT | PK, AUTO_INCREMENT | レコードID |
| `user_id` | BIGINT | FK(`users.id`), NULLABLE| ログインユーザーの場合の内部ID |
| `email` | VARCHAR(255) | NOT NULL | 返信用メールアドレス |
| `type` | VARCHAR(50) | NOT NULL | 問い合わせ種別（例: `account`, `other`） |
| `subject` | VARCHAR(255) | NOT NULL | 件名 |
| `body` | TEXT | NOT NULL | お問い合わせ本文 |
| `status` | VARCHAR(20) | DEFAULT 'open' | 対応ステータス（`open`, `in_progress`, `closed`） |
| `created_at` | DATETIME | NOT NULL | 作成日時 |
| `updated_at` | DATETIME | NOT NULL | 更新日時 |

---

## 3. 将来拡張テーブル（フェーズ2以降・現段階では未実装）

企画書・画面設計書にて「グレーアウト（準備中）」として定義されている機能向けのテーブル群です。初期フェーズでの実装は行いません。

* **`kyc_applications` (本人確認申請)**
  * 身分証画像のS3パス、審査ステータス（未申請、審査中、承認済、却下）、申請日時など。
* **`user_payment_methods` (お支払い情報)**
  * Stripe等の決済プロバイダの `customer_id`、カードブランド、下4桁、有効期限など。（カード番号の生データは持たない）
* **`user_points` & `point_transactions` (ポイント管理)**
  * ユーザーごとの現在の保有ポイント残高、およびポイントの購入・消費・付与の増減履歴。
* **`invoices` (ご利用明細・請求書)**
  * 決済日時、決済金額、消費税額、PDFのパス等。
* **`affiliate_links` & `affiliate_rewards` (アフィリエイト管理)**
  * ユーザーごとの固有紹介コード、発生した報酬履歴、振込先口座情報など。

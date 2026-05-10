/* =====================================================
   グローバル設定
   ===================================================== */

/** 動作環境フラグ。'develop' のときコンソールログを出力する */
var ENV = 'develop';

var PROTOCOL   = window.location.protocol;
/** Ory Kratos の接続先ベースURL */
var KRATOS_BASE = PROTOCOL + '//kratos.netherid-frontend.test:4433';
/** バックエンド API の接続先ベースURL */
var API_BASE    = PROTOCOL + '//netherid-frontend.test:8000';

/**
 * お知らせデータ（API 実装前の仮データ）
 * 各ページで共通参照する。API 実装後はこの配列を削除して差し替える。
 * - filterKey: タブフィルター用のサービスキー
 * - badgeClass: バッジの CSS クラス名
 */
var NOTIFICATIONS = [
  { date: '2026-05-09', filterKey: 'nether-id',      badgeClass: 'mp-notif-badge-id', badge: 'ネザーID',      title: '【重要】メンテナンスのお知らせ（5/15 2:00〜5:00）',                  body: 'いつもネザーIDをご利用いただきありがとうございます。システムメンテナンスのため、2026年5月15日（金）午前2:00〜5:00の間サービスを一時停止します。' },
  { date: '2026-05-01', filterKey: 'nether-ma',      badgeClass: 'mp-notif-badge-ma', badge: 'ネザーM&A',     title: 'ネザーM&A — 売買契約書テンプレートをリニューアルしました',              body: '売買契約書のひな型を全面リニューアルしました。新テンプレートはマイページのM&Aセクションからダウンロードいただけます。' },
  { date: '2026-04-25', filterKey: 'nether-keyword', badgeClass: 'mp-notif-badge-kw', badge: 'ネザーキーワード', title: 'ネザーキーワード — サジェスト件数が最大500件に拡張されました',        body: 'キーワードリサーチの精度向上のため、サジェスト最大件数を200件から500件に拡張しました。' },
  { date: '2026-04-20', filterKey: 'nether-server',  badgeClass: 'mp-notif-badge-sv', badge: 'ネザーサーバー', title: 'ネザーサーバー — PHP 8.4 対応完了のお知らせ',                        body: 'ネザーサーバー全プランにてPHP 8.4が利用可能になりました。コントロールパネルよりPHPバージョンを変更できます。' },
  { date: '2026-04-15', filterKey: 'nether-domain',  badgeClass: 'mp-notif-badge-dm', badge: 'ネザードメイン', title: 'ネザードメイン — .shop ドメインが特価キャンペーン中！',               body: '.shopドメインが通常価格より70%オフの特価でご提供中です。キャンペーンは2026年4月30日まで。' },
  { date: '2026-04-10', filterKey: 'nether-id',      badgeClass: 'mp-notif-badge-id', badge: 'ネザーID',      title: 'ネザーID — パスキー（Passkey）ログインに対応しました',               body: 'パスキーを使ったパスワードレスログインが利用可能になりました。セキュリティ設定ページよりご登録いただけます。' },
  { date: '2026-04-01', filterKey: 'cd-domain',      badgeClass: 'mp-notif-badge-cd', badge: '中古ドメイン',   title: '中古ドメイン販売屋さん — 新着高品質ドメイン200件を追加しました',        body: 'DA 40以上の高品質オールドドメインを200件追加しました。ぜひドメイン一覧よりご確認ください。' },
  { date: '2026-03-28', filterKey: 'nether-ma',      badgeClass: 'mp-notif-badge-ma', badge: 'ネザーM&A',     title: 'ネザーM&A — 無料弁護士相談サービスの提供開始',                         body: '売買成立後のトラブルに備え、弁護士への無料相談サービスの提供を開始しました。' },
  { date: '2026-03-20', filterKey: 'nether-id',      badgeClass: 'mp-notif-badge-id', badge: 'ネザーID',      title: 'ネザーID — プライバシーポリシーを改定しました（2026/4/1 施行）',        body: '2026年4月1日よりプライバシーポリシーを改定します。主な変更点は本文をご確認ください。' },
  { date: '2026-03-10', filterKey: 'nether-server',  badgeClass: 'mp-notif-badge-sv', badge: 'ネザーサーバー', title: 'ネザーサーバー — 無料 SSL 証明書の自動更新に対応しました',              body: 'Let\'s Encrypt による SSL 証明書の自動更新機能を全プランに追加しました。手動更新は不要になります。' },
];

/* =====================================================
   ユーティリティ（汎用）
   ===================================================== */

/**
 * HTML特殊文字のエスケープ
 * XSS対策として、動的に生成する全HTML文字列に適用すること
 * @param {*} str - エスケープ対象の値
 * @returns {string} エスケープ済み文字列
 */
function escapeHtml(str) {
  return $('<div>').text(String(str)).html();
}

/**
 * メールアドレス形式の簡易バリデーション
 * @param {string} email - 検証するメールアドレス
 * @returns {boolean} 有効な形式であれば true
 */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/* =====================================================
   ユーティリティ（Kratos 専用）
   ===================================================== */

/**
 * Kratos フローレスポンスから csrf_token を抽出する
 * ui.nodes 配列の中から name === 'csrf_token' のノードを探す
 * @param {Object} flowData - kratosApi() が返したフローオブジェクト
 * @returns {string} CSRFトークン文字列。見つからなければ空文字
 */
function extractCsrfToken(flowData) {
  var token = '';
  if (flowData && flowData.ui && flowData.ui.nodes) {
    $.each(flowData.ui.nodes, function (_, node) {
      if (node.attributes && node.attributes.name === 'csrf_token') {
        token = node.attributes.value;
      }
    });
  }
  return token;
}

/* =====================================================
   ユーティリティ（UI コンポーネント）
   ===================================================== */

/**
 * パスワード強度を数値で返す
 * 以下の5項目を各1点で採点し、1〜4のスコアに正規化する
 *   - 8文字以上
 *   - 12文字以上
 *   - 大文字・小文字の両方を含む
 *   - 数字を含む
 *   - 記号を含む
 * 戻り値の目安: 1=弱い / 2=普通 / 3=強い / 4=とても強い
 * @param {string} pw - 検査するパスワード
 * @returns {number} 強度スコア（0: 空文字, 1〜4: 段階評価）
 */
function calcPasswordStrength(pw) {
  if (!pw) return 0;
  var score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.max(1, Math.min(4, Math.ceil(score / 1.25)));
}

/**
 * 6桁コード入力UIを初期化する
 * 数字制限・入力時の自動フォーカス移動・Backspace/矢印キー操作・ペーストに対応する。
 * 6桁が揃った時点で formSel のフォームを自動送信する。
 * @param {string} containerSel - コード入力欄をまとめる親要素のセレクター
 * @param {string} formSel      - 6桁入力完了時に submit を発火させるフォームのセレクター
 * @returns {{ getCode: function, clearCode: function }}
 *   getCode()   - 現在の入力値を結合した6文字の文字列を返す
 *   clearCode() - 全入力欄をクリアして先頭にフォーカスを戻す
 */
function initCodeInputs(containerSel, formSel) {
  function getCode() {
    var digits = [];
    $(containerSel + ' .code-input').each(function () {
      digits.push($(this).val());
    });
    return digits.join('');
  }

  function clearCode() {
    $(containerSel + ' .code-input').val('');
    $(containerSel + ' .code-input').first().trigger('focus');
  }

  /* 1文字入力: 数字以外を除去し、次のマスへ自動フォーカス */
  $(containerSel).on('input', '.code-input', function () {
    var $current = $(this);
    var val = $current.val().replace(/[^0-9]/g, '');
    $current.val(val.slice(-1));
    if (val && $current.next('.code-input').length) {
      $current.next('.code-input').trigger('focus');
    }
    if (getCode().length === 6) {
      $(formSel).trigger('submit');
    }
  });

  /* Backspace: 空マスから前のマスへ戻る。矢印キー: マス間を移動する */
  $(containerSel).on('keydown', '.code-input', function (e) {
    var $current = $(this);
    if (e.key === 'Backspace' && !$current.val() && $current.prev('.code-input').length) {
      $current.prev('.code-input').trigger('focus').val('');
    }
    if (e.key === 'ArrowLeft' && $current.prev('.code-input').length) {
      $current.prev('.code-input').trigger('focus');
    }
    if (e.key === 'ArrowRight' && $current.next('.code-input').length) {
      $current.next('.code-input').trigger('focus');
    }
  });

  /* ペースト: 数字のみ抽出して各マスに配置し、6桁揃えば自動送信 */
  $(containerSel).on('paste', '.code-input', function (e) {
    e.preventDefault();
    var pasted = (e.originalEvent.clipboardData || window.clipboardData).getData('text').replace(/[^0-9]/g, '');
    var $inputs = $(containerSel + ' .code-input');
    pasted.split('').forEach(function (char, i) {
      if (i < 6) $inputs.eq(i).val(char);
    });
    if (pasted.length >= 6) {
      $inputs.last().trigger('focus');
      $(formSel).trigger('submit');
    } else {
      $inputs.eq(pasted.length).trigger('focus');
    }
  });

  return { getCode: getCode, clearCode: clearCode };
}

/**
 * マイページ共通のタブ切り替えを初期化する
 * `.mp-tab[data-tab]` をクリックすると対応する `.mp-tab-panel[data-panel]` を表示する。
 * @param {function} [onSwitch] - タブ切り替え後に呼ばれるコールバック。引数は tab 名（文字列）
 */
function initMpTabs(onSwitch) {
  $(document).on('click', '.mp-tab', function () {
    var tab = $(this).data('tab');
    $('.mp-tab').removeClass('mp-tab--active').attr('aria-selected', 'false');
    $(this).addClass('mp-tab--active').attr('aria-selected', 'true');
    $('.mp-tab-panel').removeClass('mp-tab-panel--active');
    $('.mp-tab-panel[data-panel="' + tab + '"]').addClass('mp-tab-panel--active');
    if (onSwitch) onSwitch(tab);
  });
}

/* =====================================================
   API 通信
   ===================================================== */

/**
 * バックエンド API へリクエストを送信する
 * withCredentials を常に有効にし、クッキーを送受信する。
 * @param {Object}  options
 * @param {string}  options.path     - API_BASE からのパス（例: '/inquiries'）
 * @param {string}  [options.method] - HTTPメソッド（デフォルト: 'GET'）
 * @param {Object}  [options.params] - URLクエリパラメーター
 * @param {Object}  [options.data]   - リクエストボディ（JSON シリアライズされる）
 * @param {boolean} [options.withAuth] - true のとき Authorization: Bearer ヘッダーを付与する
 * @returns {jQuery.Promise}
 */
function api(options) {
  var deferred = $.Deferred();
  var url = API_BASE + options.path;

  var ajaxOptions = {
    method: options.method || 'GET',
    url: url,
    contentType: 'application/json',
    dataType: 'json',
    xhrFields: { withCredentials: true }
  };

  if (options.params) {
    ajaxOptions.url += '?' + $.param(options.params);
  }

  if (options.data) {
    ajaxOptions.data = JSON.stringify(options.data);
  }

  if (options.withAuth) {
    var token = sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token');
    if (token) {
      ajaxOptions.headers = { 'Authorization': 'Bearer ' + token };
    }
  }

  if (ENV === 'develop') {
    console.log('[api] ' + ajaxOptions.method + ' ' + ajaxOptions.url, options.data || '');
  }

  $.ajax(ajaxOptions)
    .done(function (data, status, xhr) {
      if (ENV === 'develop') {
        console.log('[api] response', data);
      }
      deferred.resolve(data, status, xhr);
    })
    .fail(function (xhr, status, error) {
      if (ENV === 'develop') {
        console.error('[api] error', xhr.status, xhr.responseJSON || error);
      }
      deferred.reject(xhr, status, error);
    });

  return deferred.promise();
}

/**
 * Ory Kratos へリクエストを送信する
 * セッション Cookie を送受信するため withCredentials を常に有効にする。
 * @param {Object}  options
 * @param {string}  options.path     - KRATOS_BASE からのパス（例: '/self-service/login/browser'）
 * @param {string}  [options.method] - HTTPメソッド（デフォルト: 'GET'）
 * @param {Object}  [options.params] - URLクエリパラメーター
 * @param {Object}  [options.data]   - リクエストボディ（JSON シリアライズされる）
 * @returns {jQuery.Promise}
 */
function kratosApi(options) {
  var deferred = $.Deferred();
  var url = KRATOS_BASE + options.path;

  var ajaxOptions = {
    method: options.method || 'GET',
    url: url,
    contentType: 'application/json',
    dataType: 'json',
    xhrFields: { withCredentials: true }
  };

  if (options.params) {
    ajaxOptions.url += '?' + $.param(options.params);
  }

  if (options.data) {
    ajaxOptions.data = JSON.stringify(options.data);
  }

  if (ENV === 'develop') {
    console.log('[kratosApi] ' + ajaxOptions.method + ' ' + ajaxOptions.url, options.data || '');
  }

  $.ajax(ajaxOptions)
    .done(function (data, status, xhr) {
      if (ENV === 'develop') {
        console.log('[kratosApi] response', data);
      }
      deferred.resolve(data, status, xhr);
    })
    .fail(function (xhr, status, error) {
      if (ENV === 'develop') {
        console.error('[kratosApi] error', xhr.status, xhr.responseJSON || error);
      }
      deferred.reject(xhr, status, error);
    });

  return deferred.promise();
}

/* =====================================================
   セッション管理
   ===================================================== */

/**
 * セッション情報を取得する（認証必須ページ用）
 * 401 が返った場合はログインページへ自動リダイレクトする。
 * @returns {jQuery.Promise} resolve 時に Kratos セッションオブジェクトを返す
 */
function getSession() {
  return kratosApi({ method: 'GET', path: '/sessions/whoami' })
    .fail(function (xhr) {
      if (xhr.status === 401) {
        window.location.href = '/auth/login/';
      }
    });
}

/**
 * セッション情報を取得する（ログイン状態の確認のみ行うページ用）
 * 未ログインでもリダイレクトしない。fail ハンドラで状態に応じた分岐を行うこと。
 * @returns {jQuery.Promise} resolve 時に Kratos セッションオブジェクトを返す
 */
function getSessionSilent() {
  return kratosApi({ method: 'GET', path: '/sessions/whoami' });
}

/**
 * ログアウト処理を実行する
 * Kratos からログアウトトークンを取得してフローを完了させ、ログインページへ遷移する。
 * ログアウトURLの取得に失敗した場合もログインページへ強制遷移する。
 */
function performLogout() {
  kratosApi({ method: 'GET', path: '/self-service/logout/browser' })
    .done(function (data) {
      if (!data.logout_url) {
        window.location.href = '/auth/login/';
        return;
      }
      /* logout_url はフルURLで返るが、CORS対応のためホスト部分を KRATOS_BASE に差し替える */
      var urlObj    = new URL(data.logout_url);
      var logoutUrl = KRATOS_BASE + urlObj.pathname + urlObj.search;
      $.ajax({
        method: 'GET',
        url: logoutUrl,
        xhrFields: { withCredentials: true }
      }).always(function () {
        window.location.href = '/auth/login/';
      });
    })
    .fail(function () {
      window.location.href = '/auth/login/';
    });
}

/* =====================================================
   UI 通知
   ===================================================== */

/**
 * 画面右下にトースト通知を表示する
 * 3秒後に自動でフェードアウトする。複数同時表示に対応。
 * @param {string} message - 表示するメッセージ
 * @param {string} [type]  - 'info' | 'success' | 'error' | 'warning'（デフォルト: 'info'）
 */
function showToast(message, type) {
  var typeClass = 'toast-' + (type || 'info');

  var $wrap = $('.toast-wrap');
  if ($wrap.length === 0) {
    $wrap = $('<div class="toast-wrap"></div>');
    $('body').append($wrap);
  }

  var $toast = $('<div class="toast ' + typeClass + '"></div>').text(message);
  $wrap.append($toast);

  setTimeout(function () {
    $toast.fadeOut(200, function () { $(this).remove(); });
  }, 3000);
}

/* =====================================================
   ヘッダー（マイページ共通ヘッダー）
   ===================================================== */

/**
 * マイページ共通ヘッダーのポップアップ（お知らせ・アカウントメニュー）を初期化する
 * `.mp-header-actions` 要素が存在するページで自動呼び出しされる。
 * - セッション取得後にUID・メールアドレスをメニューに反映する
 * - 通知ポップアップとユーザーメニューは排他制御（同時に開かない）
 * - ドキュメントクリックおよび Escape キーで閉じる
 */
function initHeaderPopups() {
  var $actions = $('.mp-header-actions');
  if (!$actions.length) return;

  $actions.html(
    '<div class="popup-wrap">' +
      '<button class="mp-header-icon-btn" id="js-notif-btn" title="お知らせ" aria-expanded="false">' +
        '<svg width="22" height="22" viewBox="0 -960 960 960" fill="currentColor">' +
          '<path d="M160-200v-80h80v-280q0-83 50-147.5T420-792v-28q0-25 17.5-42.5T480-880t42.5 17.5T540-820v28q80 20 130 84.5T720-560v280h80v80zM480-80q-33 0-56.5-23.5T400-160h160q0 33-23.5 56.5T480-80M320-280h320v-280q0-66-47-113t-113-47-113 47-47 113z"/>' +
        '</svg>' +
      '</button>' +
      '<div id="js-notif-popup" class="popup-dropdown notif-dropdown" style="display:none;" role="dialog" aria-label="お知らせ">' +
        '<div class="notif-dropdown-header">お知らせ</div>' +
        '<div id="js-notif-popup-list"></div>' +
        '<div class="notif-dropdown-footer"><a href="/notification/">全て表示</a></div>' +
      '</div>' +
    '</div>' +
    '<div class="popup-wrap">' +
      '<button class="mp-header-icon-btn" id="js-user-menu-btn" title="アカウント" aria-expanded="false">' +
        '<svg width="22" height="22" viewBox="0 -960 960 960" fill="currentColor">' +
          '<path d="M480-480q-66 0-113-47t-47-113 47-113 113-47 113 47 47 113-47 113-113 47M160-160v-112q0-34 17.5-62.5T224-378q62-31 126-46.5T480-440t130 15.5T736-378q29 15 46.5 43.5T800-272v112z"/>' +
        '</svg>' +
      '</button>' +
      '<div id="js-user-popup" class="popup-dropdown user-menu-dropdown" style="display:none;" role="dialog" aria-label="アカウントメニュー">' +
        '<div class="user-menu-dropdown-head">' +
          '<div class="user-menu-dropdown-info">' +
            '<div class="user-menu-dropdown-uid">ID: <span id="js-popup-uid">---</span></div>' +
            '<div class="user-menu-dropdown-email" id="js-popup-email">---</div>' +
          '</div>' +
          '<div class="user-menu-dropdown-rp">' +
            '<div style="display:flex;align-items:baseline;gap:3px;justify-content:flex-end;">' +
              '<span class="user-menu-dropdown-rp-val">0</span>' +
              '<span style="font-size:12px;">RP</span>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<ul class="user-menu-dropdown-nav">' +
          '<li><a href="/mypage/" class="user-menu-dropdown-nav-item">' +
            '<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 -960 960 960" width="20" height="20"><path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h167q11-35 43-57.5t70-22.5q40 0 71.5 22.5T594-840h166q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120zm0-80h560v-560h-80v120H280v-120h-80zm280-560q17 0 28.5-11.5T520-800t-11.5-28.5T480-840t-28.5 11.5T440-800t11.5 28.5T480-760"/></svg>' +
            '<span>マイページ</span>' +
          '</a></li>' +
          '<li><a href="/mypage/profile/" class="user-menu-dropdown-nav-item">' +
            '<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 -960 960 960" width="20" height="20"><path d="M480-480q-66 0-113-47t-47-113 47-113 113-47 113 47 47 113-47 113-113 47M160-160v-112q0-34 17.5-62.5T224-378q62-31 126-46.5T480-440t130 15.5T736-378q29 15 46.5 43.5T800-272v112z"/></svg>' +
            '<span>ユーザー情報</span>' +
          '</a></li>' +
          '<li><a href="/contact/" class="user-menu-dropdown-nav-item">' +
            '<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" width="20" height="20"><path d="M10.597 16q0-2.024.362-2.912.363-.888 1.538-1.938 1.025-.9 1.562-1.562.538-.663.538-1.513 0-1.025-.688-1.7T11.997 5.7q-1.275 0-1.938.775-.662.776-.937 1.575l-2.575-1.1q.525-1.6 1.925-2.775T11.997 3q2.625 0 4.037 1.463 1.413 1.461 1.413 3.512 0 1.25-.538 2.138-.537.887-1.687 2.012-1.226 1.175-1.488 1.787-.262.614-.262 2.088zm1.4 6q-.825 0-1.413-.587A1.93 1.93 0 0 1 9.997 20q0-.824.587-1.413A1.93 1.93 0 0 1 11.997 18q.825 0 1.412.587.588.588.588 1.413 0 .824-.588 1.413a1.93 1.93 0 0 1-1.412.587"/></svg>' +
            '<span>お問い合わせ</span>' +
          '</a></li>' +
          '<li><a href="/mypage/account/" class="user-menu-dropdown-nav-item user-menu-dropdown-nav-item--danger">' +
            '<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 21 21" width="20" height="20"><path d="m18.775 20.122-2.625-2.625H3v-2.8q0-.85.438-1.563.437-.712 1.162-1.087a13.7 13.7 0 0 1 2.288-.925 16.4 16.4 0 0 1 2.362-.525L.375 1.722 1.8.297l18.4 18.4zM17.4 12.047q.725.35 1.15 1.062t.45 1.538l-3.35-3.35q.45.175.888.35.437.175.862.4m-4.2-3.2-5.55-5.55A4.1 4.1 0 0 1 9.1 1.972a3.9 3.9 0 0 1 1.9-.475q1.65 0 2.825 1.175T15 5.497q0 1.025-.475 1.9a4.1 4.1 0 0 1-1.325 1.45"/></svg>' +
            '<span>ネザーID退会</span>' +
          '</a></li>' +
        '</ul>' +
        '<div class="user-menu-dropdown-footer">' +
          '<button id="js-popup-logout" class="user-menu-logout-btn">ログアウト</button>' +
        '</div>' +
      '</div>' +
    '</div>'
  );

  /* セッション取得後にUID・メールアドレスをポップアップに反映 */
  getSessionSilent()
    .done(function (data) {
      var identity = data.identity || {};
      var traits   = identity.traits || {};
      var uid      = identity.id || '';
      var email    = traits.email || '';
      $('#js-popup-uid').text(uid ? uid.slice(0, 8) + '…' : '---');
      $('#js-popup-email').text(email || '---');
    });

  /** 通知ポップアップに最新5件をレンダリングする */
  function renderNotifPopup() {
    var $list = $('#js-notif-popup-list');
    $list.empty();
    var items = NOTIFICATIONS.slice(0, 5);
    $.each(items, function (i, item) {
      var $item = $(
        '<div class="notif-dropdown-item">' +
          '<div class="notif-dropdown-meta">' +
            '<span class="badge ' + escapeHtml(item.badgeClass) + '">' + escapeHtml(item.badge) + '</span>' +
            '<span class="notif-dropdown-date">' + escapeHtml(item.date) + '</span>' +
          '</div>' +
          '<div class="notif-dropdown-title">' + escapeHtml(item.title) + '</div>' +
        '</div>'
      );
      $item.on('click', function () { window.location.href = '/notification/'; });
      $list.append($item);
    });
  }

  /* 通知ボタン: クリックで開閉。開くときにコンテンツを再描画し、ユーザーメニューは閉じる */
  $('#js-notif-btn').on('click', function (e) {
    e.stopPropagation();
    var $popup     = $('#js-notif-popup');
    var $userPopup = $('#js-user-popup');
    $userPopup.hide();
    $('#js-user-menu-btn').attr('aria-expanded', 'false');
    var isOpen = $popup.is(':visible');
    if (isOpen) {
      $popup.hide();
      $(this).attr('aria-expanded', 'false');
    } else {
      renderNotifPopup();
      $popup.show();
      $(this).attr('aria-expanded', 'true');
    }
  });

  /* ユーザーメニューボタン: クリックで開閉。通知ポップアップは閉じる */
  $('#js-user-menu-btn').on('click', function (e) {
    e.stopPropagation();
    var $popup      = $('#js-user-popup');
    var $notifPopup = $('#js-notif-popup');
    $notifPopup.hide();
    $('#js-notif-btn').attr('aria-expanded', 'false');
    var isOpen = $popup.is(':visible');
    if (isOpen) {
      $popup.hide();
      $(this).attr('aria-expanded', 'false');
    } else {
      $popup.show();
      $(this).attr('aria-expanded', 'true');
    }
  });

  $('#js-popup-logout').on('click', function () {
    performLogout();
  });

  /* ポップアップ外クリックで閉じる */
  $(document).on('click', function (e) {
    if (!$(e.target).closest('#js-notif-popup, #js-notif-btn').length) {
      $('#js-notif-popup').hide();
      $('#js-notif-btn').attr('aria-expanded', 'false');
    }
    if (!$(e.target).closest('#js-user-popup, #js-user-menu-btn').length) {
      $('#js-user-popup').hide();
      $('#js-user-menu-btn').attr('aria-expanded', 'false');
    }
  });

  /* Escape キーで全ポップアップを閉じる */
  $(document).on('keydown', function (e) {
    if (e.key === 'Escape') {
      $('#js-notif-popup, #js-user-popup').hide();
      $('#js-notif-btn, #js-user-menu-btn').attr('aria-expanded', 'false');
    }
  });
}

/* `.mp-header-actions` が存在するページでヘッダーポップアップを自動初期化する */
$(function () {
  if ($('.mp-header-actions').length) {
    initHeaderPopups();
  }
});

/* =====================================================
   アラート表示
   ===================================================== */

/**
 * 指定要素をアラートとして表示する
 * 既存の type クラスをすべて除去してから新しい type を付与する。
 * @param {string} selector - アラート要素のセレクター
 * @param {string} message  - 表示するメッセージ
 * @param {string} [type]   - 'info' | 'success' | 'error' | 'danger' | 'warning'（デフォルト: 'info'）
 */
function showAlert(selector, message, type) {
  var typeClass = 'alert-' + (type || 'info');
  var $el = $(selector);

  $el
    .removeClass('alert-info alert-success alert-error alert-danger alert-warning')
    .addClass('alert ' + typeClass)
    .text(message)
    .show();
}

/* =====================================================
   Kratos エラーメッセージ日本語化
   ===================================================== */

/**
 * Kratos エラーコード（数値）→ 日本語メッセージの対応表
 * 新しいエラーコードが増えた場合はここに追記する
 */
var KRATOS_ERROR_MESSAGES = {
  4000001: 'リクエストが多すぎます。しばらくしてから再度お試しください。',
  4000002: '必須項目が入力されていません。',
  4000003: 'メールアドレスまたはパスワードが正しくありません。',
  4000004: 'このメールアドレスはすでに登録されています。',
  4000005: 'パスワードが短すぎるか、単純すぎます。8文字以上で設定してください。',
  4000006: 'パスワードがメールアドレスに似すぎています。別のパスワードを設定してください。',
  4000007: 'よく使われるパスワードは設定できません。別のパスワードを設定してください。',
  4000008: 'このパスワードは情報漏洩に関与しています。別のパスワードを設定してください。',
  4000009: 'ログイン情報が見つかりませんでした。',
  4000010: 'メールアドレスの認証が完了していません。認証メールをご確認ください。',
  4000032: 'このメールアドレスはすでに使用されています。',
  4060001: '認証コードが無効または使用済みです。もう一度お試しください。',
  4060002: '認証コードの有効期限が切れました。コードを再送してください。',
  4070001: '再設定リンクの有効期限が切れているか、無効です。もう一度お試しください。',
  4070002: '再設定コードの有効期限が切れました。もう一度お試しください。',
};

/**
 * Kratos エラーID（文字列）→ 日本語メッセージの対応表
 * error.id フィールドに含まれる識別子を日本語に変換する
 */
var KRATOS_ERROR_ID_MESSAGES = {
  'session_already_available': 'すでにログイン済みです。',
  'self_service_flow_expired': 'セッションが期限切れです。もう一度お試しください。',
  'security_csrf_violation':   'セキュリティエラーが発生しました。ページを再読み込みしてください。',
  'no_active_session':         'ログインが必要です。',
};

/**
 * Kratos のメッセージオブジェクトを日本語文字列に変換する
 * @param {Object} msg - Kratos の ui.messages / ui.nodes[].messages の要素
 * @returns {string|null} 対応する日本語メッセージ。未対応なら null
 */
function translateKratosMessage(msg) {
  if (!msg) return null;
  if (msg.id && KRATOS_ERROR_MESSAGES[msg.id]) return KRATOS_ERROR_MESSAGES[msg.id];
  return null;
}

/**
 * jqXHR からエラーメッセージを抽出して日本語に変換する
 * 優先順位: error.id → ui.messages → ui.nodes[].messages → fallback
 * @param {jqXHR} xhr      - jQuery の Ajax エラーオブジェクト
 * @param {string} fallback - 変換できなかった場合のデフォルトメッセージ
 * @returns {string} 表示用の日本語エラーメッセージ
 */
function extractKratosErrorMessage(xhr, fallback) {
  var defaultMsg = fallback || 'エラーが発生しました。しばらくしてから再度お試しください。';
  try {
    var json = xhr.responseJSON;
    if (!json) return defaultMsg;

    if (ENV === 'develop') {
      console.warn('[extractKratosErrorMessage]', json);
    }

    if (json.error && json.error.id && KRATOS_ERROR_ID_MESSAGES[json.error.id]) {
      return KRATOS_ERROR_ID_MESSAGES[json.error.id];
    }

    var messages = [];
    if (json.ui && json.ui.messages) {
      $.each(json.ui.messages, function (_, m) {
        var translated = translateKratosMessage(m);
        if (translated) messages.push(translated);
      });
    }
    if (json.ui && json.ui.nodes) {
      $.each(json.ui.nodes, function (_, node) {
        if (node.messages) {
          $.each(node.messages, function (_, m) {
            if (m.type === 'error') {
              var translated = translateKratosMessage(m);
              if (translated) messages.push(translated);
            }
          });
        }
      });
    }
    if (messages.length > 0) return messages.join(' ');
  } catch (ex) { /* ignore */ }
  return defaultMsg;
}

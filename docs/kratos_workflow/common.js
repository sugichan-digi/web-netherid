/* =====================================================
   グローバル設定
   ===================================================== */

/** 動作環境フラグ。'develop' のときコンソールログを出力する */
var ENV = 'develop';

var PROTOCOL = window.location.protocol;
/** Ory Kratos の接続先ベースURL（変更しないこと） */
var KRATOS_BASE = PROTOCOL + '//auth.netherid.com';
/**
 * バックエンド API の接続先ベースURL
 * 新サービスでは自サービスのAPIドメインに変更すること
 * 例: var API_BASE = PROTOCOL + '//api.yourservice.com';
 */
var API_BASE = PROTOCOL + '//api.netherid.com';

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
  if (pw.length >= 8) score++;
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
        window.location.href = '/login/';
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
        window.location.href = '/login/';
        return;
      }
      /* logout_url はフルURLで返るが、CORS対応のためホスト部分を KRATOS_BASE に差し替える */
      var urlObj = new URL(data.logout_url);
      var logoutUrl = KRATOS_BASE + urlObj.pathname + urlObj.search;
      $.ajax({
        method: 'GET',
        url: logoutUrl,
        xhrFields: { withCredentials: true }
      }).always(function () {
        window.location.href = '/login/';
      });
    })
    .fail(function () {
      window.location.href = '/login/';
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
  'security_csrf_violation': 'セキュリティエラーが発生しました。ページを再読み込みしてください。',
  'no_active_session': 'ログインが必要です。',
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

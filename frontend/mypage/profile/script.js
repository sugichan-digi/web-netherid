$(function () {
  /* セッション情報と Kratos settings フローを保持する変数 */
  var session      = null;
  var settingsFlow = null;
  var csrfToken    = '';

  /* ===== セッション取得・フォーム初期化 ===== */
  // セッションから現在のユーザー情報を取得し、フォームの初期値として反映する
  getSession()
    .done(function (data) {
      session = data;
      fillForm(data);
      initSettingsFlow(); // フォーム値確定後に settings フローを取得する
    })
    .fail(function (xhr) {
      if (xhr.status !== 401) {
        showToast('セッション情報の取得に失敗しました', 'error');
      }
    });

  /**
   * フォームに現在の値をセット
   * Kratos identity の traits を各フォームフィールドに反映する。
   * @param {Object} data - getSession() のレスポンス
   */
  function fillForm(data) {
    var identity = data.identity || {};
    var traits   = identity.traits || {};
    var address  = traits.address || {};

    $('#current-email').val(traits.email || '');

    // traits.name は文字列（旧スキーマ）とオブジェクト（新スキーマ）の両方がありうる
    var nameVal = '';
    if (typeof traits.name === 'string') {
      nameVal = traits.name;
    } else if (traits.name && typeof traits.name === 'object') {
      // { last: "山田", first: "太郎" } 形式の場合は「姓 名」に結合する
      nameVal = ((traits.name.last || '') + ' ' + (traits.name.first || '')).trim();
    }
    $('#name').val(nameVal);

    $('input[name="account_type"][value="' + (traits.account_type || 'personal') + '"]').prop('checked', true);
    $('#phone').val(traits.phone || '');

    // 住所フィールド
    $('#postal-code').val(address.postal_code || '');
    $('#prefecture').val(address.prefecture   || '');
    $('#city').val(address.city               || '');
    $('#street').val(address.street           || '');
    $('#building').val(address.building       || '');
  }

  /**
   * Kratos settings フロー取得
   * settings フロー ID と CSRF トークンを取得して保持する。
   * フォームの POST 時にこれらが必要になる。
   */
  function initSettingsFlow() {
    kratosApi({ method: 'GET', path: '/self-service/settings/browser' })
      .done(function (flow) {
        settingsFlow = flow;
        csrfToken    = extractCsrfToken(flow); // ui.nodes から csrf_token を抽出
      })
      .fail(function (xhr) {
        // 401 はセッション切れ → getSession() 側でリダイレクト済みなので二重処理しない
        if (xhr.status === 401) {
          window.location.href = '/auth/login/';
        }
      });
  }

  /* ===== タブ切り替え ===== */
  // common.js の initMpTabs() で .mp-tab / .mp-tab-panel の切り替えを初期化する
  initMpTabs();

  /* ===== メールアドレス変更 ===== */

  $('#js-change-email-btn').on('click', function () {
    var $btn  = $(this);
    var email = $('#new-email').val().trim();
    var $err  = $('#js-email-change-error');

    $err.hide();

    if (!email) {
      $err.text('新しいメールアドレスを入力してください').show();
      return;
    }

    if (!isValidEmail(email)) {
      $err.text('有効なメールアドレスを入力してください').show();
      return;
    }

    if (!settingsFlow) {
      showToast('設定フローが取得できませんでした。ページを再読み込みしてください', 'error');
      return;
    }

    $btn.prop('disabled', true).text('送信中...');

    // Kratos では traits 全体を送信する必要がある。現在の traits に新メールをマージする
    var currentTraits = (session && session.identity && session.identity.traits) ? session.identity.traits : {};
    var traits = $.extend(true, {}, currentTraits, { email: email });

    kratosApi({
      method: 'POST',
      path: '/self-service/settings?flow=' + settingsFlow.id,
      data: { method: 'profile', traits: traits, csrf_token: csrfToken }
    })
      .done(function () {
        // メールアドレス変更は確認メールを送信するだけ（即時変更ではない）
        showToast('確認メールを送信しました。メールをご確認ください', 'success');
        $('#new-email').val('');
        initSettingsFlow(); // CSRF トークンを更新する
      })
      .fail(function (xhr) {
        var msg = extractKratosErrorMessage(xhr, 'メールアドレスの変更に失敗しました。');
        $err.text(msg).show();
      })
      .always(function () {
        $btn.prop('disabled', false).text('変更する');
      });
  });

  /* ===== 基本情報保存 ===== */

  $('#js-profile-form').on('submit', function (e) {
    e.preventDefault();

    if (!settingsFlow) {
      showToast('設定フローが取得できませんでした。ページを再読み込みしてください', 'error');
      return;
    }

    var $btn = $('#js-profile-save-btn');
    var $err = $('#js-profile-form-error');
    $err.hide();
    $btn.prop('disabled', true).text('保存中...');

    var currentTraits = (session && session.identity && session.identity.traits) ? session.identity.traits : {};

    // Kratos identity schema で定義されているフィールドのみ送信可能。
    // settingsFlow の ui.nodes から "traits.xxx" という名前のノードを収集して
    // 送信可能フィールドを特定する（スキーマ外のフィールドは Kratos に弾かれる）
    var allowedKeys = [];
    if (settingsFlow && settingsFlow.ui && settingsFlow.ui.nodes) {
      $.each(settingsFlow.ui.nodes, function(_, node) {
        if (node.attributes && node.attributes.name && node.attributes.name.startsWith('traits.')) {
          allowedKeys.push(node.attributes.name.replace('traits.', ''));
        }
      });
    }

    // フォームから取得した新しい traits 候補
    var newTraits = {
      name: ($('#name').val() || '').trim(),
      phone: ($('#phone').val() || '').trim(),
      account_type: $('input[name="account_type"]:checked').val() || 'personal'
    };

    // 現在の traits をベースに、allowedKeys に含まれる項目のみを上書きする
    var traits = $.extend(true, {}, currentTraits);
    $.each(newTraits, function(key, val) {
      if (allowedKeys.indexOf(key) !== -1) {
        traits[key] = val;
      }
    });

    if (ENV === 'develop') {
      console.log('[Debug] Filtered traits to submit:', traits);
    }

    kratosApi({
      method: 'POST',
      path: '/self-service/settings?flow=' + settingsFlow.id,
      data: { method: 'profile', traits: traits, csrf_token: csrfToken }
    })
      .done(function () {
        showToast('基本情報を保存しました', 'success');
        initSettingsFlow(); // CSRF トークンを更新する
      })
      .fail(function (xhr) {
        var msg = extractKratosErrorMessage(xhr, '保存に失敗しました。');
        $err.text(msg).show();
      })
      .always(function () {
        $btn.prop('disabled', false).text('変更を保存する');
      });
  });

  /* ===== 住所保存 ===== */

  $('#js-address-form').on('submit', function (e) {
    e.preventDefault();

    if (!settingsFlow) {
      showToast('設定フローが取得できませんでした。ページを再読み込みしてください', 'error');
      return;
    }

    var $btn = $('#js-address-save-btn');
    var $err = $('#js-address-form-error');
    $err.hide();
    $btn.prop('disabled', true).text('保存中...');

    var currentTraits = (session && session.identity && session.identity.traits) ? session.identity.traits : {};

    // 住所フィールドは Kratos スキーマによって以下の2通りの定義がある:
    //   A) traits.address.postal_code, traits.address.city ... （ネスト）
    //   B) traits.address                                     （オブジェクト全体）
    // ui.nodes のフルパスを確認して対応する
    var allowedFullPaths = [];
    if (settingsFlow && settingsFlow.ui && settingsFlow.ui.nodes) {
      $.each(settingsFlow.ui.nodes, function(_, node) {
        if (node.attributes && node.attributes.name && node.attributes.name.startsWith('traits.')) {
          allowedFullPaths.push(node.attributes.name);
        }
      });
    }

    var addressTraits = {
      postal_code: $('#postal-code').val().trim(),
      prefecture:  $('#prefecture').val(),
      city:        $('#city').val().trim(),
      street:      $('#street').val().trim(),
      building:    $('#building').val().trim()
    };

    var traits = $.extend(true, {}, currentTraits);

    // パターン A: traits.address.xxx が個別に許可されている場合
    var hasAddressSchema = false;
    $.each(addressTraits, function(key, val) {
      if (allowedFullPaths.indexOf('traits.address.' + key) !== -1) {
        if (!traits.address) traits.address = {};
        traits.address[key] = val;
        hasAddressSchema = true;
      }
    });

    // パターン B: traits.address がオブジェクト全体として許可されている場合
    if (!hasAddressSchema) {
      if (allowedFullPaths.indexOf('traits.address') !== -1) {
        traits.address = addressTraits;
      } else {
        // スキーマに住所フィールドが定義されていない場合は操作不可とする
        showToast('現在は住所情報の保存はサポートされていません', 'warning');
        $btn.prop('disabled', false).text('変更を保存する');
        return;
      }
    }

    if (ENV === 'develop') {
      console.log('[Debug] Filtered traits to submit (Address):', traits);
    }

    kratosApi({
      method: 'POST',
      path: '/self-service/settings?flow=' + settingsFlow.id,
      data: { method: 'profile', traits: traits, csrf_token: csrfToken }
    })
      .done(function () {
        showToast('住所情報を保存しました', 'success');
        initSettingsFlow(); // CSRF トークンを更新する
      })
      .fail(function (xhr) {
        var msg = extractKratosErrorMessage(xhr, '保存に失敗しました。');
        $err.text(msg).show();
      })
      .always(function () {
        $btn.prop('disabled', false).text('変更を保存する');
      });
  });

  /* ===== 郵便番号から住所を自動入力 ===== */
  // zipcloud（https://zipcloud.ibsnet.co.jp）の無料 API を JSONP で利用する
  $('#js-autofill-address').on('click', function () {
    var postal     = $('#postal-code').val().replace(/[^\d]/g, ''); // ハイフン等を除去して数字のみ抽出
    var $btn       = $(this);
    var $postalErr = $('#js-postal-error');

    $postalErr.hide();

    if (postal.length !== 7) {
      $postalErr.text('郵便番号は7桁で入力してください').show();
      return;
    }

    $btn.prop('disabled', true).text('検索中...');

    $.ajax({
      url: 'https://zipcloud.ibsnet.co.jp/api/search',
      method: 'GET',
      dataType: 'jsonp', // クロスオリジン対応のため JSONP を使用する
      data: { zipcode: postal }
    })
      .done(function (res) {
        if (res.status === 200 && res.results && res.results.length > 0) {
          var r = res.results[0];
          // address1: 都道府県 / address2: 市区町村 / address3: 町域
          $('#prefecture').val(r.address1);
          $('#city').val(r.address2);
          $('#street').val(r.address3);
        } else {
          $postalErr.text('該当する住所が見つかりませんでした').show();
        }
      })
      .fail(function () {
        $postalErr.text('住所の検索に失敗しました').show();
      })
      .always(function () {
        $btn.prop('disabled', false).text('住所を自動入力');
      });
  });

  /* ===== パスワード強度インジケーター ===== */
  // calcPasswordStrength() は 1〜4 を返す。levels 配列のインデックスにマッピングして表示する
  $('#new-password').on('input', function () {
    var pw    = $(this).val();
    var score = calcPasswordStrength(pw);
    var $bar  = $('#js-pw-strength-bar');
    var $lbl  = $('#js-pw-strength-label');

    if (!pw) {
      $bar.css({ width: '0%', background: 'var(--border)' });
      $lbl.text('');
      return;
    }

    var levels = [
      { w: '25%', color: 'var(--danger)',  text: '弱い' },
      { w: '50%', color: 'var(--warning)', text: '普通' },
      { w: '75%', color: 'var(--info)',    text: '強い' },
      { w: '100%',color: 'var(--success)', text: 'とても強い' }
    ];
    var level = levels[Math.min(score - 1, 3)] || levels[0];
    $bar.css({ width: level.w, background: level.color });
    $lbl.text('パスワードの強度: ' + level.text);
  });

  /* ===== パスワード表示トグル ===== */
  // data-target 属性でトグル対象の input ID を指定する汎用実装
  $(document).on('click', '.js-toggle-pw', function () {
    var targetId = $(this).data('target');
    var $input   = $('#' + targetId);
    var $eyeOn   = $(this).find('.eye-icon');
    var $eyeOff  = $(this).find('.eye-off-icon');

    if ($input.attr('type') === 'password') {
      $input.attr('type', 'text');
      $eyeOn.hide();
      $eyeOff.show();
    } else {
      $input.attr('type', 'password');
      $eyeOn.show();
      $eyeOff.hide();
    }
  });

  /* ===== パスワード変更 ===== */

  $('#js-password-form').on('submit', function (e) {
    e.preventDefault();

    var $btn      = $('#js-change-pw-btn');
    var $formErr  = $('#js-password-form-error');
    var currentPw = $('#current-password').val();
    var newPw     = $('#new-password').val();
    var confirmPw = $('#confirm-password').val();

    $('#js-current-pw-error, #js-new-pw-error, #js-confirm-pw-error').hide();
    $formErr.hide();

    // クライアント側バリデーション
    var hasError = false;
    if (!currentPw) {
      $('#js-current-pw-error').text('現在のパスワードを入力してください').show();
      hasError = true;
    }
    if (!newPw || newPw.length < 8) {
      // Kratos の最低文字数要件と一致させる
      $('#js-new-pw-error').text('新しいパスワードは8文字以上で入力してください').show();
      hasError = true;
    }
    if (newPw !== confirmPw) {
      $('#js-confirm-pw-error').text('パスワードが一致しません').show();
      hasError = true;
    }
    if (hasError) return;

    if (!settingsFlow) {
      showToast('設定フローが取得できませんでした。ページを再読み込みしてください', 'error');
      return;
    }

    $btn.prop('disabled', true).text('変更中...');

    // Kratos の password method は新しいパスワードのみを送信する（現在のパスワードは不要）
    kratosApi({
      method: 'POST',
      path: '/self-service/settings?flow=' + settingsFlow.id,
      data: { method: 'password', password: newPw, csrf_token: csrfToken }
    })
      .done(function () {
        showToast('パスワードを変更しました', 'success');
        // フォームと強度インジケーターをリセットする
        $('#current-password, #new-password, #confirm-password').val('');
        $('#js-pw-strength-bar').css({ width: '0%', background: 'var(--border)' });
        $('#js-pw-strength-label').text('');
        initSettingsFlow(); // CSRF トークンを更新する
      })
      .fail(function (xhr) {
        var msg = extractKratosErrorMessage(xhr, 'パスワードの変更に失敗しました。');
        $formErr.text(msg).show();
      })
      .always(function () {
        $btn.prop('disabled', false).text('パスワードを変更する');
      });
  });


});

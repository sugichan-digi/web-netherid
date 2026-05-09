$(function () {
  var session      = null;
  var settingsFlow = null;
  var csrfToken    = '';

  // セッション取得・フォーム初期化
  getSession()
    .done(function (data) {
      session = data;
      fillForm(data);
      initSettingsFlow();
    })
    .fail(function (xhr) {
      if (xhr.status !== 401) {
        showToast('セッション情報の取得に失敗しました', 'error');
      }
    });

  // フォームに現在の値をセット
  function fillForm(data) {
    var identity = data.identity || {};
    var traits   = identity.traits || {};
    var address  = traits.address || {};

    $('#current-email').val(traits.email || '');

    // 名前が文字列の場合とオブジェクトの場合の両方に対応
    var nameVal = '';
    if (typeof traits.name === 'string') {
      nameVal = traits.name;
    } else if (traits.name && typeof traits.name === 'object') {
      nameVal = ((traits.name.last || '') + ' ' + (traits.name.first || '')).trim();
    }
    $('#name').val(nameVal);

    $('input[name="account_type"][value="' + (traits.account_type || 'personal') + '"]').prop('checked', true);
    $('#phone').val(traits.phone || '');

    $('#postal-code').val(address.postal_code || '');
    $('#prefecture').val(address.prefecture   || '');
    $('#city').val(address.city               || '');
    $('#street').val(address.street           || '');
    $('#building').val(address.building       || '');
  }

  // Kratos settings フロー取得
  function initSettingsFlow() {
    kratosApi({ method: 'GET', path: '/self-service/settings/browser' })
      .done(function (flow) {
        settingsFlow = flow;
        csrfToken = '';
        if (flow.ui && flow.ui.nodes) {
          $.each(flow.ui.nodes, function (_, node) {
            if (node.attributes && node.attributes.name === 'csrf_token') {
              csrfToken = node.attributes.value;
            }
          });
        }
      })
      .fail(function (xhr) {
        if (xhr.status === 401) {
          window.location.href = '/auth/login/';
        }
      });
  }

  // ===== タブ切り替え =====

  $(document).on('click', '.mp-tab', function () {
    var tab = $(this).data('tab');
    $('.mp-tab').removeClass('mp-tab--active').attr('aria-selected', 'false');
    $(this).addClass('mp-tab--active').attr('aria-selected', 'true');
    $('.mp-tab-panel').removeClass('mp-tab-panel--active');
    $('.mp-tab-panel[data-panel="' + tab + '"]').addClass('mp-tab-panel--active');
  });

  // ===== メールアドレス変更 =====

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

    var currentTraits = (session && session.identity && session.identity.traits) ? session.identity.traits : {};
    var traits = $.extend(true, {}, currentTraits, { email: email });

    kratosApi({
      method: 'POST',
      path: '/self-service/settings?flow=' + settingsFlow.id,
      data: { method: 'profile', traits: traits, csrf_token: csrfToken }
    })
      .done(function () {
        showToast('確認メールを送信しました。メールをご確認ください', 'success');
        $('#new-email').val('');
        initSettingsFlow();
      })
      .fail(function (xhr) {
        var msg = extractKratosErrorMessage(xhr, 'メールアドレスの変更に失敗しました。');
        $err.text(msg).show();
      })
      .always(function () {
        $btn.prop('disabled', false).text('変更する');
      });
  });

  // ===== 基本情報保存 =====

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
    
    // UIノードから許可されているtraitsのキーを取得
    var allowedKeys = [];
    if (settingsFlow && settingsFlow.ui && settingsFlow.ui.nodes) {
      $.each(settingsFlow.ui.nodes, function(_, node) {
        if (node.attributes && node.attributes.name && node.attributes.name.startsWith('traits.')) {
          allowedKeys.push(node.attributes.name.replace('traits.', ''));
        }
      });
    }

    // 許可された項目のみを抽出・マージ
    var newTraits = {
      name: ($('#name').val() || '').trim(),
      phone: ($('#phone').val() || '').trim(),
      account_type: $('input[name="account_type"]:checked').val() || 'personal'
    };

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
        initSettingsFlow();
      })
      .fail(function (xhr) {
        var msg = extractKratosErrorMessage(xhr, '保存に失敗しました。');
        $err.text(msg).show();
      })
      .always(function () {
        $btn.prop('disabled', false).text('変更を保存する');
      });
  });

  // ===== 住所保存 =====

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
    
    // UIノードから許可されているtraitsのフルパス（traits.xxx）を取得
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
    
    // addressオブジェクトの各項目が許可されているかチェック
    var hasAddressSchema = false;
    $.each(addressTraits, function(key, val) {
      if (allowedFullPaths.indexOf('traits.address.' + key) !== -1) {
        if (!traits.address) traits.address = {};
        traits.address[key] = val;
        hasAddressSchema = true;
      }
    });

    if (!hasAddressSchema) {
      // address全体がひとつの項目として定義されている可能性も考慮
      if (allowedFullPaths.indexOf('traits.address') !== -1) {
        traits.address = addressTraits;
      } else {
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
        initSettingsFlow();
      })
      .fail(function (xhr) {
        var msg = extractKratosErrorMessage(xhr, '保存に失敗しました。');
        $err.text(msg).show();
      })
      .always(function () {
        $btn.prop('disabled', false).text('変更を保存する');
      });
  });

  // ===== 郵便番号から住所を自動入力 =====

  $('#js-autofill-address').on('click', function () {
    var postal     = $('#postal-code').val().replace(/[^\d]/g, '');
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
      dataType: 'jsonp',
      data: { zipcode: postal }
    })
      .done(function (res) {
        if (res.status === 200 && res.results && res.results.length > 0) {
          var r = res.results[0];
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

  // ===== パスワード強度 =====

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

  function calcPasswordStrength(pw) {
    var score = 0;
    if (pw.length >= 8)  score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
    if (/\d/.test(pw))   score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return Math.max(1, Math.min(4, Math.ceil(score / 1.25)));
  }

  // ===== パスワード表示トグル =====

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

  // ===== パスワード変更 =====

  $('#js-password-form').on('submit', function (e) {
    e.preventDefault();

    var $btn      = $('#js-change-pw-btn');
    var $formErr  = $('#js-password-form-error');
    var currentPw = $('#current-password').val();
    var newPw     = $('#new-password').val();
    var confirmPw = $('#confirm-password').val();

    $('#js-current-pw-error, #js-new-pw-error, #js-confirm-pw-error').hide();
    $formErr.hide();

    var hasError = false;
    if (!currentPw) {
      $('#js-current-pw-error').text('現在のパスワードを入力してください').show();
      hasError = true;
    }
    if (!newPw || newPw.length < 8) {
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

    kratosApi({
      method: 'POST',
      path: '/self-service/settings?flow=' + settingsFlow.id,
      data: { method: 'password', password: newPw, csrf_token: csrfToken }
    })
      .done(function () {
        showToast('パスワードを変更しました', 'success');
        $('#current-password, #new-password, #confirm-password').val('');
        $('#js-pw-strength-bar').css({ width: '0%', background: 'var(--border)' });
        $('#js-pw-strength-label').text('');
        initSettingsFlow();
      })
      .fail(function (xhr) {
        var msg = extractKratosErrorMessage(xhr, 'パスワードの変更に失敗しました。');
        $formErr.text(msg).show();
      })
      .always(function () {
        $btn.prop('disabled', false).text('パスワードを変更する');
      });
  });

  // ===== ユーティリティ =====

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

});

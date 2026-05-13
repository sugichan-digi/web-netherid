$(function () {
  /*
   * パスワード再設定は2フェーズで構成される:
   *   フェーズ1 (#js-step-code)     : リカバリコードの検証（recovery flow を使用）
   *   フェーズ2 (#js-step-password) : 新しいパスワードの設定（settings flow を使用）
   *
   * Kratos の仕様上、リカバリコードを正しく送信するとセッションに
   * "settings に相当する権限" が付与されるため、続けて settings flow を発行できる。
   */

  /* フェーズ1: リカバリフロー */
  var recoveryFlowId = null;
  var recoveryCsrfToken = '';

  /* フェーズ2: パスワード設定フロー（コード検証成功後に取得） */
  var settingsFlowId = null;
  var settingsCsrfToken = '';

  /* ===== URLパラメータ処理 ===== */
  // /recovery/ から flow ID と email を引き継ぐ
  var urlParams = new URLSearchParams(window.location.search);
  recoveryFlowId = urlParams.get('flow') || null;
  var userEmail = urlParams.get('email') || '';

  if (userEmail) {
    $('#js-email-display').text(userEmail);
    $('#js-email-info').show();
  }

  /* ===== 6桁コード入力UI初期化 ===== */
  // initCodeInputs が返す { getCode, clearCode } オブジェクトを保持する
  var codeInput = initCodeInputs('#js-code-inputs', '#js-code-form');

  // flow ID が URL に存在しない場合は操作不能にする（不正なリンク等）
  if (!recoveryFlowId) {
    showError('無効なリカバリリンクです。パスワード再設定を最初からやり直してください。');
    $('#js-code-form input, #js-code-submit').prop('disabled', true);
  } else {
    // URL の flow ID に対応する CSRF トークンを Kratos から取得する
    kratosApi({ method: 'GET', path: '/self-service/recovery/flows?id=' + recoveryFlowId })
      .done(function (data) {
        recoveryCsrfToken = extractCsrfToken(data); // ui.nodes から csrf_token を抽出
      })
      .fail(function () {
        showError('認証情報の取得に失敗しました。最初からやり直してください。');
      });
  }

  /**
   * エラーアラート表示
   * アラートを danger スタイルで表示し、上部にスクロールして視界に入れる。
   * @param {string} message - 表示メッセージ
   */
  function showError(message) {
    var $alert = $('#js-alert');
    $alert.removeClass('alert-success alert-info').addClass('alert alert-danger').text(message).show();
    $('html, body').animate({ scrollTop: $alert.offset().top - 20 }, 200);
  }

  /**
   * 成功アラート表示
   * @param {string} message - 表示メッセージ
   */
  function showSuccess(message) {
    var $alert = $('#js-alert');
    $alert.removeClass('alert-danger alert-info').addClass('alert alert-success').text(message).show();
  }

  /* ===== パスワード強度インジケーター ===== */
  // calcPasswordStrength() は 1〜4 を返す。UI 表示用の文字列にマッピングする
  var strengthLabels = { weak: '弱い', fair: '普通', strong: '強い' };

  $('#new-password').on('input', function () {
    var pw     = $(this).val();
    var score  = calcPasswordStrength(pw);
    var $fill  = $('#js-pw-strength-fill');
    var $label = $('#js-pw-strength-label');

    // 既存の強度クラスをすべて除去してから再適用する
    $fill.removeClass('pw-strength-fill--weak pw-strength-fill--fair pw-strength-fill--strong');
    $label.removeClass('pw-strength-label--weak pw-strength-label--fair pw-strength-label--strong');

    if (score) {
      var strength = score <= 2 ? 'weak' : score === 3 ? 'fair' : 'strong';
      $fill.addClass('pw-strength-fill--' + strength);
      $label.addClass('pw-strength-label--' + strength).text(strengthLabels[strength]);
    } else {
      $label.text('');
    }
  });

  /* ===== パスワード表示トグル（新パスワード） ===== */
  $('#js-toggle-pw').on('click', function () {
    var $input = $('#new-password');
    var isPassword = $input.attr('type') === 'password';
    $input.attr('type', isPassword ? 'text' : 'password');
    $('#js-eye-icon').toggle(!isPassword);
    $('#js-eye-off-icon').toggle(isPassword);
  });

  /* ===== パスワード表示トグル（確認用） ===== */
  $('#js-toggle-pw-confirm').on('click', function () {
    var $input = $('#confirm-password');
    var isPassword = $input.attr('type') === 'password';
    $input.attr('type', isPassword ? 'text' : 'password');
    $('#js-eye-icon-confirm').toggle(!isPassword);
    $('#js-eye-off-icon-confirm').toggle(isPassword);
  });

  /* ===== フェーズ1: リカバリコード送信 ===== */
  $('#js-code-form').on('submit', function (e) {
    e.preventDefault();
    $('#js-alert').hide();
    $('#js-code-error').hide().text('');

    var code = codeInput.getCode();
    if (code.length !== 6) {
      $('#js-code-error').text('6桁のコードを入力してください').show();
      return;
    }

    var $btn = $('#js-code-submit');
    $btn.prop('disabled', true).text('確認中...');

    kratosApi({
      method: 'POST',
      path: '/self-service/recovery',
      params: { flow: recoveryFlowId },
      data: {
        code: code,
        method: 'code',
        csrf_token: recoveryCsrfToken
      }
    })
      .done(function (data) {
        // Kratosの仕様上、リカバリ成功時は「パスワード設定画面（Settings UI）」への
        // リダイレクトURLが返却されるが、自前の画面でそのまま続行するため
        // リダイレクトを無視してフェーズ2へ移行する
        transitionToPasswordStep();
      })
      .fail(function (xhr) {
        $btn.prop('disabled', false).text('コードを確認する');
        // 失敗時はコードをクリアして再入力させる
        codeInput.clearCode();

        var res = xhr.responseJSON;

        // Kratosはリカバリ成功時に 422（browser_location_change_required）として
        // リダイレクトURLを返してくる仕様があるため、ここでキャッチしてフェーズ2へ進める
        if (res && res.redirect_browser_to) {
          transitionToPasswordStep();
          return;
        }

        // フロー期限切れ: 最初からやり直すよう促す（再送ボタン経由で戻る必要あり）
        if (xhr.status === 410) {
          showError('コードの有効期限が切れました。パスワード再設定を最初からやり直してください。');
          return;
        }

        showError(extractKratosErrorMessage(xhr, 'コードが正しくありません。もう一度お試しください。'));
      });
  });

  /**
   * フェーズ2へ移行
   * リカバリ成功後に Kratos settings フローを新規発行し、パスワード設定UIを表示する。
   * Kratos はリカバリ完了セッションに対して settings フローの発行を許可する。
   */
  function transitionToPasswordStep() {
    kratosApi({ method: 'GET', path: '/self-service/settings/browser' })
      .done(function (data) {
        settingsFlowId    = data.id;
        settingsCsrfToken = extractCsrfToken(data);
        // コード入力UIを非表示にしてパスワード設定UIを表示する
        $('#js-step-code').hide();
        $('#js-step-password').show();
        $('#js-subtitle').text('新しいパスワードを設定してください');
        $('#js-alert').hide();
      })
      .fail(function () {
        showError('パスワード設定フローの初期化に失敗しました。ページを再読み込みしてください。');
      });
  }

  /* ===== フェーズ2: 新パスワード設定 ===== */
  $('#js-password-form').on('submit', function (e) {
    e.preventDefault();
    $('#js-alert').hide();
    $('#js-new-password-error, #js-confirm-password-error').hide().text('');
    $('#new-password, #confirm-password').removeClass('form-input--error');

    // transitionToPasswordStep() が完了していない状態での送信を防ぐ
    if (!settingsFlowId) {
      showError('パスワード設定フローが初期化されていません。ページを再読み込みしてください。');
      return;
    }

    var newPassword     = $('#new-password').val();
    var confirmPassword = $('#confirm-password').val();
    var hasError        = false;

    // クライアント側バリデーション
    if (!newPassword) {
      $('#js-new-password-error').text('新しいパスワードを入力してください').show();
      $('#new-password').addClass('form-input--error');
      hasError = true;
    } else if (newPassword.length < 8) {
      // Kratos の最低文字数要件と一致させる
      $('#js-new-password-error').text('パスワードは8文字以上で入力してください').show();
      $('#new-password').addClass('form-input--error');
      hasError = true;
    }

    if (!confirmPassword) {
      $('#js-confirm-password-error').text('確認用パスワードを入力してください').show();
      $('#confirm-password').addClass('form-input--error');
      hasError = true;
    } else if (newPassword !== confirmPassword) {
      $('#js-confirm-password-error').text('パスワードが一致しません').show();
      $('#confirm-password').addClass('form-input--error');
      hasError = true;
    }

    if (hasError) return;

    var $btn = $('#js-password-submit');
    $btn.prop('disabled', true).text('設定中...');

    kratosApi({
      method: 'POST',
      path: '/self-service/settings',
      params: { flow: settingsFlowId },
      data: {
        password:   newPassword,
        method:     'password',
        csrf_token: settingsCsrfToken
      }
    })
      .done(function () {
        // パスワード再設定完了 → ログイン画面へ遷移。?reset=1 で完了通知を表示させる
        window.location.href = '/login/?reset=1';
      })
      .fail(function (xhr) {
        $btn.prop('disabled', false).text('パスワードを再設定する');

        var res = xhr.responseJSON;

        // Kratos が別ページへのリダイレクトを要求する場合
        if (res && res.redirect_browser_to) {
          window.location.href = res.redirect_browser_to;
          return;
        }

        showError(extractKratosErrorMessage(xhr, 'パスワードの設定に失敗しました。もう一度お試しください。'));
      });
  });
});

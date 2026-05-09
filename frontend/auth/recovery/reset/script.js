$(function () {
  var recoveryFlowId = null;
  var settingsFlowId = null;
  var recoveryCsrfToken = '';
  var settingsCsrfToken = '';

  var urlParams = new URLSearchParams(window.location.search);
  recoveryFlowId = urlParams.get('flow') || null;
  var userEmail = urlParams.get('email') || '';

  if (userEmail) {
    $('#js-email-display').text(userEmail);
    $('#js-email-info').show();
  }

  if (!recoveryFlowId) {
    showError('無効なリカバリリンクです。パスワード再設定を最初からやり直してください。');
    $('#js-code-form input, #js-code-submit').prop('disabled', true);
  } else {
    // URLのフローIDからCSRFトークンを取得する
    kratosApi({ method: 'GET', path: '/self-service/recovery/flows?id=' + recoveryFlowId })
      .done(function (data) {
        if (data.ui && data.ui.nodes) {
          $.each(data.ui.nodes, function (_, node) {
            if (node.attributes && node.attributes.name === 'csrf_token') {
              recoveryCsrfToken = node.attributes.value;
            }
          });
        }
      })
      .fail(function () {
        showError('認証情報の取得に失敗しました。最初からやり直してください。');
      });
  }

  function showError(message) {
    var $alert = $('#js-alert');
    $alert.removeClass('alert-success alert-info').addClass('alert alert-danger').text(message).show();
    $('html, body').animate({ scrollTop: $alert.offset().top - 20 }, 200);
  }

  function showSuccess(message) {
    var $alert = $('#js-alert');
    $alert.removeClass('alert-danger alert-info').addClass('alert alert-success').text(message).show();
  }

  function getCode() {
    var digits = [];
    $('#js-code-inputs .code-input').each(function () {
      digits.push($(this).val());
    });
    return digits.join('');
  }

  function clearCode() {
    $('#js-code-inputs .code-input').val('');
    $('#js-code-inputs .code-input').first().trigger('focus');
  }

  function getPasswordStrength(pw) {
    if (!pw) return null;
    var score = 0;
    if (pw.length >= 8)  score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 2) return 'weak';
    if (score <= 3) return 'fair';
    return 'strong';
  }

  var strengthLabels = { weak: '弱い', fair: '普通', strong: '強い' };

  $('#new-password').on('input', function () {
    var pw = $(this).val();
    var strength = getPasswordStrength(pw);
    var $fill = $('#js-pw-strength-fill');
    var $label = $('#js-pw-strength-label');

    $fill.removeClass('pw-strength-fill--weak pw-strength-fill--fair pw-strength-fill--strong');
    $label.removeClass('pw-strength-label--weak pw-strength-label--fair pw-strength-label--strong');

    if (strength) {
      $fill.addClass('pw-strength-fill--' + strength);
      $label.addClass('pw-strength-label--' + strength).text(strengthLabels[strength]);
    } else {
      $label.text('');
    }
  });

  $('#js-toggle-pw').on('click', function () {
    var $input = $('#new-password');
    var isPassword = $input.attr('type') === 'password';
    $input.attr('type', isPassword ? 'text' : 'password');
    $('#js-eye-icon').toggle(!isPassword);
    $('#js-eye-off-icon').toggle(isPassword);
  });

  $('#js-toggle-pw-confirm').on('click', function () {
    var $input = $('#confirm-password');
    var isPassword = $input.attr('type') === 'password';
    $input.attr('type', isPassword ? 'text' : 'password');
    $('#js-eye-icon-confirm').toggle(!isPassword);
    $('#js-eye-off-icon-confirm').toggle(isPassword);
  });

  $('#js-code-inputs').on('input', '.code-input', function () {
    var $current = $(this);
    var val = $current.val().replace(/[^0-9]/g, '');
    $current.val(val.slice(-1));

    if (val && $current.next('.code-input').length) {
      $current.next('.code-input').trigger('focus');
    }

    if (getCode().length === 6) {
      $('#js-code-form').trigger('submit');
    }
  });

  $('#js-code-inputs').on('keydown', '.code-input', function (e) {
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

  $('#js-code-inputs').on('paste', '.code-input', function (e) {
    e.preventDefault();
    var pasted = (e.originalEvent.clipboardData || window.clipboardData).getData('text').replace(/[^0-9]/g, '');
    var $inputs = $('#js-code-inputs .code-input');
    pasted.split('').forEach(function (char, i) {
      if (i < 6) $inputs.eq(i).val(char);
    });
    if (pasted.length >= 6) {
      $inputs.last().trigger('focus');
      $('#js-code-form').trigger('submit');
    } else {
      $inputs.eq(pasted.length).trigger('focus');
    }
  });

  $('#js-code-form').on('submit', function (e) {
    e.preventDefault();
    $('#js-alert').hide();
    $('#js-code-error').hide().text('');

    var code = getCode();
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
        // Kratosの仕様上、リカバリ成功時は「パスワード設定画面（Settings UI）」へのリダイレクトURLが
        // 返却されますが、今回は自前の画面でそのままパスワード設定を行うため、
        // リダイレクトを無視して次のステップ（transitionToPasswordStep）へ進みます。
        transitionToPasswordStep();
      })
      .fail(function (xhr) {
        $btn.prop('disabled', false).text('コードを確認する');
        clearCode();

        var res = xhr.responseJSON;

        if (res && res.redirect_browser_to) {
          // Kratosはリカバリ成功時に422エラー（browser_location_change_required）として
          // リダイレクトURLを返してくる仕様があるため、ここでキャッチしてパスワード設定画面へ進める
          transitionToPasswordStep();
          return;
        }

        if (xhr.status === 410) {
          showError('コードの有効期限が切れました。パスワード再設定を最初からやり直してください。');
          return;
        }

        showError(extractKratosErrorMessage(xhr, 'コードが正しくありません。もう一度お試しください。'));
      });
  });

  function transitionToPasswordStep() {
    kratosApi({ method: 'GET', path: '/self-service/settings/browser' })
      .done(function (data) {
        settingsFlowId = data.id;
        if (data.ui && data.ui.nodes) {
          $.each(data.ui.nodes, function (_, node) {
            if (node.attributes && node.attributes.name === 'csrf_token') {
              settingsCsrfToken = node.attributes.value;
            }
          });
        }
        $('#js-step-code').hide();
        $('#js-step-password').show();
        $('#js-subtitle').text('新しいパスワードを設定してください');
        $('#js-alert').hide();
      })
      .fail(function () {
        showError('パスワード設定フローの初期化に失敗しました。ページを再読み込みしてください。');
      });
  }

  $('#js-password-form').on('submit', function (e) {
    e.preventDefault();
    $('#js-alert').hide();
    $('#js-new-password-error, #js-confirm-password-error').hide().text('');
    $('#new-password, #confirm-password').removeClass('form-input--error');

    if (!settingsFlowId) {
      showError('パスワード設定フローが初期化されていません。ページを再読み込みしてください。');
      return;
    }

    var newPassword = $('#new-password').val();
    var confirmPassword = $('#confirm-password').val();
    var hasError = false;

    if (!newPassword) {
      $('#js-new-password-error').text('新しいパスワードを入力してください').show();
      $('#new-password').addClass('form-input--error');
      hasError = true;
    } else if (newPassword.length < 8) {
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
        password: newPassword,
        method: 'password',
        csrf_token: settingsCsrfToken
      }
    })
      .done(function () {
        window.location.href = '/auth/login/?reset=1';
      })
      .fail(function (xhr) {
        $btn.prop('disabled', false).text('パスワードを再設定する');

        var res = xhr.responseJSON;

        if (res && res.redirect_browser_to) {
          window.location.href = res.redirect_browser_to;
          return;
        }

        showError(extractKratosErrorMessage(xhr, 'パスワードの設定に失敗しました。もう一度お試しください。'));
      });
  });
});

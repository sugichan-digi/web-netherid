$(function () {
  var flowId = null;
  var csrfToken = '';
  var userEmail = '';

  var params = new URLSearchParams(window.location.search);
  userEmail = params.get('email') || '';

  if (userEmail) {
    $('#js-email-display').text(userEmail);
    $('#js-email-info').show();
  }

  /**
   * Verificationフロー初期化
   * flow.idとcsrf_tokenを取得・保持する
   */
  function initFlow() {
    kratosApi({ method: 'GET', path: '/self-service/verification/browser' })
      .done(function (data) {
        flowId = data.id;
        csrfToken = '';
        if (data.ui && data.ui.nodes) {
          $.each(data.ui.nodes, function (_, node) {
            if (node.attributes && node.attributes.name === 'csrf_token') {
              csrfToken = node.attributes.value;
            }
          });
        }
      })
      .fail(function (xhr) {
        var redirect = xhr.getResponseHeader('Location') || (xhr.responseJSON && xhr.responseJSON.redirect_browser_to);
        if (redirect) {
          window.location.href = redirect;
        }
      });
  }

  /**
   * コード入力欄の値を結合して返す
   * @returns {string} 6桁の入力コード
   */
  function getCode() {
    var digits = [];
    $('#js-code-inputs .code-input').each(function () {
      digits.push($(this).val());
    });
    return digits.join('');
  }

  /**
   * コード入力欄をクリアして先頭にフォーカスを移す
   */
  function clearCode() {
    $('#js-code-inputs .code-input').val('');
    $('#js-code-inputs .code-input').first().trigger('focus');
  }

  /**
   * エラーアラート表示
   * @param {string} message - 表示メッセージ
   */
  function showError(message) {
    var $alert = $('#js-alert');
    $alert.removeClass('alert-success alert-info').addClass('alert alert-danger').text(message).show();
  }

  /**
   * 成功アラート表示
   * @param {string} message - 表示メッセージ
   */
  function showSuccess(message) {
    var $alert = $('#js-alert');
    $alert.removeClass('alert-danger alert-info').addClass('alert alert-success').text(message).show();
  }

  /**
   * 送信ボタンのローディング状態制御
   * @param {boolean} loading - ローディング中かどうか
   */
  function setLoading(loading) {
    var $btn = $('#js-submit');
    if (loading) {
      $btn.prop('disabled', true).text('確認中...');
    } else {
      $btn.prop('disabled', false).text('認証して完了する');
    }
  }

  /* ===== コード入力: 数字のみ許可・自動フォーカス移動 ===== */
  $('#js-code-inputs').on('input', '.code-input', function () {
    var $current = $(this);
    var val = $current.val().replace(/[^0-9]/g, '');
    $current.val(val.slice(-1));

    if (val && $current.next('.code-input').length) {
      $current.next('.code-input').trigger('focus');
    }

    if (getCode().length === 6) {
      $('#js-verify-form').trigger('submit');
    }
  });

  /* ===== コード入力: バックスペース・矢印キー操作 ===== */
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

  /* ===== コード入力: ペースト対応 ===== */
  $('#js-code-inputs').on('paste', '.code-input', function (e) {
    e.preventDefault();
    var pasted = (e.originalEvent.clipboardData || window.clipboardData).getData('text').replace(/[^0-9]/g, '');
    var $inputs = $('#js-code-inputs .code-input');
    pasted.split('').forEach(function (char, i) {
      if (i < 6) $inputs.eq(i).val(char);
    });
    if (pasted.length >= 6) {
      $inputs.last().trigger('focus');
      $('#js-verify-form').trigger('submit');
    } else {
      $inputs.eq(pasted.length).trigger('focus');
    }
  });

  /* ===== フォーム送信 ===== */
  $('#js-verify-form').on('submit', function (e) {
    e.preventDefault();
    $('#js-code-error').hide().text('');

    if (!flowId) {
      showError('認証フローが初期化されていません。ページを再読み込みしてください。');
      return;
    }

    var code = getCode();
    if (code.length !== 6) {
      $('#js-code-error').text('6桁のコードを入力してください').show();
      return;
    }

    setLoading(true);

    kratosApi({
      method: 'POST',
      path: '/self-service/verification',
      params: { flow: flowId },
      data: {
        method:     'code',
        csrf_token: csrfToken,
        code:       code
      }
    })
      .done(function () {
        window.location.href = '/mypage/';
      })
      .fail(function (xhr) {
        setLoading(false);
        clearCode();

        var res = xhr.responseJSON;

        if (res && res.redirect_browser_to) {
          window.location.href = res.redirect_browser_to;
          return;
        }

        if (xhr.status === 410) {
          showError('認証フローが期限切れです。コードを再送してください。');
          flowId = null;
          initFlow();
          return;
        }

        showError(extractKratosErrorMessage(xhr, '認証コードが正しくありません。もう一度お試しください。'));
      });
  });

  /* ===== 認証コード再送 ===== */
  $('#js-resend').on('click', function () {
    var $btn = $(this);
    $btn.prop('disabled', true).text('送信中...');
    flowId = null;
    csrfToken = '';

    kratosApi({ method: 'GET', path: '/self-service/verification/browser' })
      .done(function (data) {
        flowId = data.id;
        if (data.ui && data.ui.nodes) {
          $.each(data.ui.nodes, function (_, node) {
            if (node.attributes && node.attributes.name === 'csrf_token') {
              csrfToken = node.attributes.value;
            }
          });
        }
        showSuccess('認証コードを再送しました。メールをご確認ください。');
        $btn.prop('disabled', false).text('認証コードを再送する');
        clearCode();
      })
      .fail(function () {
        showError('再送に失敗しました。しばらくしてからお試しください。');
        $btn.prop('disabled', false).text('認証コードを再送する');
      });
  });

  initFlow();
});

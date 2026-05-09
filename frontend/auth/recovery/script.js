$(function () {
  var flowId = null;
  var csrfToken = '';

  function initFlow() {
    kratosApi({ method: 'GET', path: '/self-service/recovery/browser' })
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
        var res = xhr.responseJSON;
        
        // すでにログインしている場合（セッションが存在する場合）
        if (res && res.error && res.error.id === 'session_already_available') {
          window.location.href = '/mypage/'; // ログイン済みの場合はマイページへ
          return;
        }

        var redirect = xhr.getResponseHeader('Location') || (res && res.redirect_browser_to);
        if (redirect) {
          window.location.href = redirect;
        }
      });
  }

  function showError(message) {
    var $alert = $('#js-alert');
    $alert.removeClass('alert-success alert-info').addClass('alert alert-danger').text(message).show();
    $('html, body').animate({ scrollTop: $alert.offset().top - 20 }, 200);
  }

  function setLoading(loading) {
    var $btn = $('#js-submit');
    if (loading) {
      $btn.prop('disabled', true).text('送信中...');
    } else {
      $btn.prop('disabled', false).text('リカバリコードを送信');
    }
  }

  $('#js-recovery-form').on('submit', function (e) {
    e.preventDefault();
    $('#js-alert').hide();
    $('#js-email-error').hide().text('');
    $('#email').removeClass('form-input--error');

    if (!flowId) {
      showError('フローが初期化されていません。ページを再読み込みしてください。');
      return;
    }

    var email = $('#email').val().trim();

    if (!email) {
      $('#js-email-error').text('メールアドレスを入力してください').show();
      $('#email').addClass('form-input--error');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      $('#js-email-error').text('有効なメールアドレスを入力してください').show();
      $('#email').addClass('form-input--error');
      return;
    }

    setLoading(true);

    kratosApi({
      method: 'POST',
      path: '/self-service/recovery',
      params: { flow: flowId },
      data: {
        email: email,
        method: 'code',
        csrf_token: csrfToken
      }
    })
      .done(function () {
        window.location.href = '/auth/recovery/reset/?flow=' + encodeURIComponent(flowId) + '&email=' + encodeURIComponent(email);
      })
      .fail(function (xhr) {
        setLoading(false);

        var res = xhr.responseJSON;

        if (res && res.redirect_browser_to) {
          window.location.href = res.redirect_browser_to;
          return;
        }

        if (res && res.state === 'sent_email') {
          window.location.href = '/auth/recovery/reset/?flow=' + encodeURIComponent(flowId) + '&email=' + encodeURIComponent(email);
          return;
        }

        if (xhr.status === 410) {
          showError('フローが期限切れです。もう一度お試しください。');
          flowId = null;
          initFlow();
          return;
        }

        showError(extractKratosErrorMessage(xhr, 'リカバリコードの送信に失敗しました。もう一度お試しください。'));
      });
  });

  initFlow();
});

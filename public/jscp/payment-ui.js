(() => {
    const modal = document.getElementById('paymentModal');
    if (!modal) return;
    const status = document.getElementById('dlPaymentStatus'), retry = document.getElementById('dlPaymentRetry');
    let recheck = null, previouslyOpen = false, previousFocus = null;
    const copy = {
        waiting: 'Đang chờ xác nhận thanh toán. Chuyển khoản xong, kết quả sẽ tự cập nhật.',
        paid: 'Đã xác nhận thanh toán thành công.',
        ended: 'Giao dịch đã kết thúc. Bạn có thể đóng cửa sổ này để xem lại đơn.',
        timeout: 'Chưa nhận được xác nhận. Nếu đã chuyển khoản, hãy kiểm tra lại.',
        auth: 'Phiên đăng nhập đã hết. Đóng cửa sổ và đăng nhập lại để kiểm tra đơn.',
        notfound: 'Chưa tìm thấy giao dịch. Hãy nhắn admin kèm mã đơn nếu đã chuyển khoản.',
    };
    function setStatus(phase) { status.textContent = copy[phase] || copy.waiting; retry.hidden = phase !== 'timeout'; }
    retry.addEventListener('click', () => { retry.hidden = true; recheck?.(); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && modal.style.display === 'flex') document.getElementById('btnClosePaymentModal')?.click(); });
    new MutationObserver(() => {
        const open = modal.style.display === 'flex';
        if (open && !previouslyOpen) { previousFocus = document.activeElement; document.getElementById('btnClosePaymentModal')?.focus(); }
        if (!open && previouslyOpen && previousFocus?.isConnected) previousFocus.focus();
        previouslyOpen = open;
    }).observe(modal, {attributes:true,attributeFilter:['style']});
    window.dlovePaymentUI = {
        begin(orderCode, callback) { document.getElementById('dlPaymentOrder').textContent = 'Đơn #' + orderCode; recheck = callback; setStatus('waiting'); },
        status: setStatus,
        updated(link) {
            document.querySelector('.dl-edit-success')?.remove();
            const box = document.createElement('dialog'); box.className = 'dl-edit-success'; box.setAttribute('aria-labelledby','dlUpdatedTitle');
            box.innerHTML = '<img src="assets/dlove-gift-logo.png" alt="DLove"><h2 id="dlUpdatedTitle">Đã cập nhật món quà</h2><p>Nội dung mới đã được lưu.<br>Link và mã QR vẫn giữ nguyên.</p><button type="button">Tiếp tục chỉnh sửa</button>';
            try { const url = new URL(link); if (url.origin === location.origin && ['http:','https:'].includes(url.protocol)) {const a = document.createElement('a');a.href=url.href;a.target='_blank';a.rel='noopener';a.textContent='Xem quà ↗';box.insertBefore(a,box.querySelector('button'));} } catch {}
            const previous = document.activeElement;
            box.querySelector('button').onclick = () => box.close();
            box.addEventListener('close', () => {box.remove();if(previous?.isConnected)previous.focus();},{once:true});
            document.body.append(box); box.showModal();
        },
    };
})();

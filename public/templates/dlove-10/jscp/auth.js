/**
 * 20-11/jscp/auth.js — V2 Firebase auth + SSO Ticket → dg_jwt convention.
 *
 * Khác V1:
 *   - POST /api/v2/auth/login với idToken → { user, token } (JWT V2).
 *   - SSO Ticket cross-domain authentication support
 *   - Lưu dg_jwt + dg_user (convention V2) + bridge sang user_uid / user_email
 *     để code legacy đọc trực tiếp (PricingCalculator, voucher.js, settings.js).
 *
 * Provider: Google Firebase OAuth + SSO Ticket (parity với valentine/loveplannet).
 */

const API_BASE = window.API_BASE || 'https://apiv2.deargift.online/api/v2';

// ════════════════════════════════════════════════════════════
// SSO TICKET HANDLER
// ════════════════════════════════════════════════════════════
let ssoTicketProcessed = false;
let ssoAuthSuccess = false;
let authGeneration = 0;
let signingOut = false;

async function handleSsoTicket() {
  const generation = authGeneration;
  const params = new URLSearchParams(window.location.search);
  const ticket = params.get('ticket');
  
  if (!ticket) {
    ssoTicketProcessed = true;
    return { success: false, noTicket: true };
  }
  
  try {
    const apiUrl = `${API_BASE}/auth/sso-redeem`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticket })
    });
    
    const data = await response.json();
    
    if (generation !== authGeneration || signingOut) {
      ssoTicketProcessed = true;
      return { success: false };
    }
    if (response.ok && data.success && data.token) {
      const { token, user } = data;
      
      // Save to localStorage (V2 convention + legacy bridge)
      localStorage.setItem('dg_jwt', token);
      localStorage.setItem('dg_user', JSON.stringify(user));
      if (user?.uid) localStorage.setItem('user_uid', user.uid);
      if (user?.email) {
        localStorage.setItem('user_email', user.email);
        localStorage.setItem('customerEmail', user.email);
      }
      
      // Clean URL
      params.delete('ticket');
      const cleanUrl = window.location.pathname + 
                     (params.toString() ? '?' + params.toString() : '') + 
                     window.location.hash;
      window.history.replaceState({}, '', cleanUrl);
      
      ssoTicketProcessed = true;
      ssoAuthSuccess = true;
      
      return { success: true, user, token };
    } else {
      params.delete('ticket');
      const cleanUrl = window.location.pathname + 
                     (params.toString() ? '?' + params.toString() : '') + 
                     window.location.hash;
      window.history.replaceState({}, '', cleanUrl);
      
      ssoTicketProcessed = true;
      return { success: false, message: data.message || data.error?.message || 'Ticket không hợp lệ' };
    }
  } catch (error) {
    params.delete('ticket');
    const cleanUrl = window.location.pathname + 
                   (params.toString() ? '?' + params.toString() : '') + 
                   window.location.hash;
    window.history.replaceState({}, '', cleanUrl);
    
    ssoTicketProcessed = true;
    return { success: false, message: 'Lỗi kết nối server: ' + error.message };
  }
}

// Execute SSO ticket check immediately
const ssoTicketPromise = handleSsoTicket().then(result => {
  if (result.success) {
    updateAuthUI();
  }
  return result;
});

// ════════════════════════════════════════════════════════════
// FIREBASE AUTH
// ════════════════════════════════════════════════════════════
// Firebase Configuration (shared deargift-e6488 project — same as Valentine/loveplannet).
const firebaseConfig = {
  apiKey: "AIzaSyDN3YxOpqxqfBQgHOvtFk6JJvztlV3vTH8",
  authDomain: "deargift-e6488.firebaseapp.com",
  projectId: "deargift-e6488",
  storageBucket: "deargift-e6488.appspot.com",
  messagingSenderId: "391379008795",
  appId: "1:391379008795:web:4b1c98f17f824690e2e7be",
  measurementId: "G-VGBLRMQM9L"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// DOM elements
const googleLoginBtn = document.getElementById('googleLoginBtn');
const logoutBtn      = document.getElementById('logoutBtn');
const userInfo       = document.getElementById('userInfo');
const userAvatar     = document.getElementById('userAvatar');
const userName       = document.getElementById('userName');
const userEmail      = document.getElementById('userEmail');

// Google Login → V2 /auth/login
if (googleLoginBtn) {
  googleLoginBtn.addEventListener('click', async () => {
    const originalText = googleLoginBtn.innerHTML;
    googleLoginBtn.innerHTML = '<div style="display: inline-block; width: 12px; height: 12px; border: 2px solid #4285f4; border-radius: 50%; border-top-color: transparent; animation: spin 1s linear infinite;"></div> Đang đăng nhập...';
    googleLoginBtn.disabled = true;

    const generation = authGeneration;
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.addScope('email');
      const result = await firebase.auth().signInWithPopup(provider);
      const idToken = await result.user.getIdToken();

      // V2: POST /auth/login → { success, token, user }
      const r = await fetch(`${API_BASE}/auth/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ idToken }),
      });
      const data = await r.json();
      if (!r.ok || !data.success) {
        throw new Error(data.error?.message || data.message || 'Đăng nhập V2 thất bại');
      }
      if (generation !== authGeneration || signingOut) return;
      // Lưu theo convention V2.
      if (data.token) localStorage.setItem('dg_jwt', data.token);
      if (data.user)  localStorage.setItem('dg_user', JSON.stringify(data.user));
      // Bridge sang legacy keys cho main.js / voucher.js / settings.js đọc trực tiếp.
      if (data.user?.uid)   localStorage.setItem('user_uid',       data.user.uid);
      if (data.user?.email) localStorage.setItem('user_email',     data.user.email);
      if (data.user?.email) localStorage.setItem('customerEmail',  data.user.email);
    } catch (error) {
      alert('❌ Đăng nhập thất bại: ' + error.message);
    } finally {
      googleLoginBtn.innerHTML = originalText;
      googleLoginBtn.disabled  = false;
    }
  });
}

// Logout
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    signingOut = true;
    authGeneration++;
    try {
      await firebase.auth().signOut();
      ssoAuthSuccess = false;
      for (const key of ['dg_jwt', 'dg_user', 'user_uid', 'user_email', 'customerEmail']) {
        localStorage.removeItem(key);
      }
      updateAuthUI();
    } catch (error) {
      alert('❌ Đăng xuất thất bại: ' + error.message);
    } finally {
      signingOut = false;
    }
  });
}

// Update UI with user info
function updateAuthUI() {
  const token = localStorage.getItem('dg_jwt');
  const userStr = localStorage.getItem('dg_user');
  const uid = localStorage.getItem('user_uid');
  const email = localStorage.getItem('user_email');
  
  if (token && (userStr || uid)) {
    let user = null;
    if (userStr) {
      try {
        user = JSON.parse(userStr);
      } catch (e) {
        user = null;
      }
    }
    
    // Hide login button, show user info
    if (googleLoginBtn) googleLoginBtn.style.display = 'none';
    if (userInfo) userInfo.style.display = 'flex';
    
    // Update user avatar and info
    if (user) {
      if (userAvatar) {
        userAvatar.src = user.photoURL || user.avatar || 'https://via.placeholder.com/24x24/4285f4/ffffff?text=👤';
      }
      if (userName) {
        userName.textContent = user.displayName || user.name || '';
      }
      if (userEmail) {
        userEmail.textContent = user.email || email || '';
      }
    } else {
      // Fallback to localStorage values
      if (userAvatar) {
        userAvatar.src = 'https://via.placeholder.com/24x24/4285f4/ffffff?text=👤';
      }
      if (userName) {
        userName.textContent = '';
      }
      if (userEmail) {
        userEmail.textContent = email || '';
      }
    }
    
    // Load vouchers if available
    if (window.pricingCalculator && window.pricingCalculator.loadUserVouchers) {
      window.pricingCalculator.loadUserVouchers();
    }
  } else {
    // Show login button, hide user info
    if (googleLoginBtn) googleLoginBtn.style.display = 'flex';
    if (userInfo) userInfo.style.display = 'none';
    
    // Clear UI
    if (userAvatar) userAvatar.src = '';
    if (userName) userName.textContent = '';
    if (userEmail) userEmail.textContent = '';
    
    // Clear vouchers if available
    if (window.pricingCalculator && window.pricingCalculator.clearVouchers) {
      window.pricingCalculator.clearVouchers();
    }
  }
}

// Auth State Listener — sync UI + bridge keys cho code legacy.
firebase.auth().onAuthStateChanged(async user => {
  const generation = authGeneration;
  // Wait for SSO ticket processing
  await ssoTicketPromise;
  if (signingOut || generation !== authGeneration) return;
  
  if (user) {
    // Bridge sang legacy keys (V2 token đã lưu trong handler login phía trên,
    // nhưng onAuthStateChanged còn fire khi resume session — đảm bảo legacy
    // keys luôn có khi user login).
    localStorage.setItem('user_uid',       user.uid);
    localStorage.setItem('user_email',     user.email || '');
    localStorage.setItem('customerEmail',  user.email || '');
    
    // Get backend token if not from SSO
    if (!ssoAuthSuccess) {
      try {
        const idToken = await user.getIdToken();
        const r = await fetch(`${API_BASE}/auth/login`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ idToken }),
        });
        const data = await r.json();
        if (generation !== authGeneration || signingOut) return;
        if (r.ok && data.success) {
          if (data.token) localStorage.setItem('dg_jwt', data.token);
          if (data.user)  localStorage.setItem('dg_user', JSON.stringify(data.user));
        }
      } catch (error) {
        // Ignore error
      }
    }

    updateAuthUI();
  } else {
    // User logged out or not logged in
    // Check if SSO authenticated
    const hasToken = localStorage.getItem('dg_jwt');
    const hasUser = localStorage.getItem('dg_user');
    
    if (!hasToken && !hasUser) {
      // Clear everything
      localStorage.removeItem('dg_jwt');
      localStorage.removeItem('dg_user');
      localStorage.removeItem('user_uid');
      localStorage.removeItem('user_email');
      localStorage.removeItem('customerEmail');

      updateAuthUI();
    }
  }
});

// Initial auth check
(async function() {
  await ssoTicketPromise;
  updateAuthUI();
})();

// CSS for loading animation (keep từ V1).
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  #googleLoginBtn:hover {
    background: #f8f9fa !important;
    box-shadow: 0 4px 8px rgba(0,0,0,0.15) !important;
  }
  #googleLoginBtn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;
document.head.appendChild(style);

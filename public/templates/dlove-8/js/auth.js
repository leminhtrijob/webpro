// auth.js

import { SERVER_URL_PROD } from './config.js';

// ════════════════════════════════════════════════════════
// SSO TICKET HANDLER — Cross-domain authentication
// ════════════════════════════════════════════════════════
async function handleSsoTicket() {
  const params = new URLSearchParams(window.location.search);
  const ticket = params.get('ticket');
  
  if (!ticket) {
    return { success: false, noTicket: true };
  }
  
  try {
    const apiUrl = `${SERVER_URL_PROD}/auth/sso-redeem`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticket })
    });
    
    const data = await response.json();
    
    if (response.ok && data.success && data.token) {
      const { token, user } = data;
      
      // Save to localStorage (V2 format + backward compat)
      localStorage.setItem('dg_jwt', token);
      localStorage.setItem('dg_user', JSON.stringify(user));
      if (user?.uid) localStorage.setItem('user_uid', user.uid);
      if (user?.email) localStorage.setItem('customerEmail', user.email);
      
      // Clean URL
      params.delete('ticket');
      const cleanUrl = window.location.pathname + 
                     (params.toString() ? '?' + params.toString() : '') + 
                     window.location.hash;
      window.history.replaceState({}, '', cleanUrl);
      
      return { success: true, user, token };
    } else {
      params.delete('ticket');
      const cleanUrl = window.location.pathname + 
                     (params.toString() ? '?' + params.toString() : '') + 
                     window.location.hash;
      window.history.replaceState({}, '', cleanUrl);
      
      return { success: false, message: data.message || data.error?.message };
    }
  } catch (error) {
    params.delete('ticket');
    const cleanUrl = window.location.pathname + 
                   (params.toString() ? '?' + params.toString() : '') + 
                   window.location.hash;
    window.history.replaceState({}, '', cleanUrl);
    
    return { success: false, message: error.message };
  }
}

// Helper function to update auth UI based on login state
function updateAuthUIVisibility() {
  const hasAuth = localStorage.getItem('dg_jwt') || localStorage.getItem('user_uid');
  const hash = window.location.hash;
  const isChildPage = hash.startsWith('#config=') || hash.startsWith('#id=');
  
  const userLogoContainer = document.getElementById('userLogoContainer');
  const googleLoginBtn = document.getElementById('googleLoginBtn');
  
  if (isChildPage) {
    // Web con: ẩn login button, hiển thị user info nếu đã login
    if (googleLoginBtn) {
      googleLoginBtn.style.display = 'none';
      googleLoginBtn.classList.add('hidden');
    }
    
    if (userLogoContainer) {
      if (hasAuth) {
        userLogoContainer.style.display = 'block';
        userLogoContainer.classList.remove('hidden');
      } else {
        userLogoContainer.style.display = 'none';
        userLogoContainer.classList.add('hidden');
      }
    }
  } else {
    // Web cha: hiển thị UI auth bình thường
    if (hasAuth) {
      if (googleLoginBtn) {
        googleLoginBtn.style.display = 'none';
      }
      if (userLogoContainer) {
        userLogoContainer.style.display = 'block';
      }
    } else {
      if (googleLoginBtn) {
        googleLoginBtn.style.display = 'flex';
      }
      if (userLogoContainer) {
        userLogoContainer.style.display = 'none';
      }
    }
  }
}

// Execute SSO ticket check immediately
const ssoTicketPromise = handleSsoTicket().then(result => {
  // Sau khi SSO ticket xử lý xong, update UI
  if (result.success) {
    updateAuthUIVisibility();
  } else if (result.noTicket) {
    // No ticket - Normal flow
  } else {
    // SSO Failed
  }
  
  return result;
});

// ════════════════════════════════════════════════════════
// FIREBASE AUTH
// ════════════════════════════════════════════════════════

// Khởi tạo Firebase
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
const logoutBtn = document.getElementById('logoutBtn');
const userLogoContainer = document.getElementById('userLogoContainer');
const userLogo = document.getElementById('userLogo');
const userDropdown = document.getElementById('userDropdown');
const userAvatar = document.getElementById('userAvatar');
const userName = document.getElementById('userName');
const userEmail = document.getElementById('userEmail');

// Google Login
if (googleLoginBtn) {
  googleLoginBtn.addEventListener('click', async () => {
    const originalText = googleLoginBtn.innerHTML;
    googleLoginBtn.innerHTML = '<div class="loading"></div> Đang đăng nhập...';
    googleLoginBtn.disabled = true;

    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.addScope('email');
      const result = await firebase.auth().signInWithPopup(provider);
      const idToken = await result.user.getIdToken();

      // V2: POST /api/v2/auth/login với idToken → { user, token } (JWT).
      // SERVER_URL_PROD đã được rewrite về `${API_BASE}` = '/api/v2'.
      const r = await fetch(`${SERVER_URL_PROD}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      });
      const data = await r.json();
      if (!r.ok || !data.success) {
        throw new Error(data.error?.message || data.message || 'Đăng nhập V2 thất bại');
      }
      // Lưu JWT + user theo convention V2 (dg_jwt / dg_user).
      if (data.token) localStorage.setItem('dg_jwt', data.token);
      if (data.user)  localStorage.setItem('dg_user', JSON.stringify(data.user));
      // Backward-compat cho code legacy đọc user_uid / customerEmail trực tiếp.
      if (data.user?.uid)   localStorage.setItem('user_uid', data.user.uid);
      if (data.user?.email) localStorage.setItem('customerEmail', data.user.email);
    } catch (error) {
      alert('❌ Đăng nhập thất bại: ' + error.message);
    } finally {
      googleLoginBtn.innerHTML = originalText;
      googleLoginBtn.disabled = false;
    }
  });
}

// Logout
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    try {
      await firebase.auth().signOut();
    } catch (error) {
      alert('❌ Đăng xuất thất bại: ' + error.message);
    }
  });
}

// Toggle dropdown khi click vào logo
if (userLogo) {
  userLogo.addEventListener('click', () => {
    if (userDropdown) {
      const isVisible = userDropdown.style.display === 'block';
      userDropdown.style.display = isVisible ? 'none' : 'block';
    }
  });
}

// Đóng dropdown khi click bên ngoài
document.addEventListener('click', (event) => {
  if (userDropdown && userDropdown.style.display === 'block') {
    const isClickInside = userLogoContainer.contains(event.target) || userDropdown.contains(event.target);
    if (!isClickInside) {
      userDropdown.style.display = 'none';
    }
  }
});

// Event listener để load voucher khi sphere.js sẵn sàng
document.addEventListener('sphere_ready', () => {
  // Kiểm tra xem user đã đăng nhập chưa
  const user = firebase.auth().currentUser;
  if (user && typeof loadUserVouchers === 'function' && typeof window.getDynamicPrice === 'function') {
    loadUserVouchers(window.getDynamicPrice);
  }
});

// Auth State Listener
firebase.auth().onAuthStateChanged(async (user) => {
  console.log('[AUTH] 🔐 Firebase Auth state changed');
  console.log('[AUTH] Firebase user:', user ? user.email : 'null');
  
  // Wait for SSO ticket processing
  const ssoResult = await ssoTicketPromise;
  
  // Check if user authenticated via SSO ticket
  const ssoUser = localStorage.getItem('dg_user');
  const ssoToken = localStorage.getItem('dg_jwt');
  
  if (ssoUser && ssoToken) {
    // User authenticated via SSO ticket
    try {
      const userData = JSON.parse(ssoUser);
      console.log('[AUTH] 👤 SSO User data:', {
        email: userData.email,
        displayName: userData.displayName || userData.name,
        hasAvatar: !!(userData.avatar || userData.photoURL)
      });
      
      console.log('[AUTH] 🎨 Updating UI elements...');
      if (userLogo) {
        userLogo.src = userData.avatar || userData.photoURL || 'https://via.placeholder.com/40x40/667eea/ffffff?text=👤';
        console.log('[AUTH]    → userLogo updated');
      }
      if (userAvatar) {
        userAvatar.src = userData.avatar || userData.photoURL || 'https://via.placeholder.com/40x40/667eea/ffffff?text=👤';
        console.log('[AUTH]    → userAvatar updated');
      }
      if (userName) {
        userName.textContent = userData.displayName || userData.name || '';
        console.log('[AUTH]    → userName updated:', userName.textContent);
      }
      if (userEmail) {
        userEmail.textContent = userData.email || '';
        console.log('[AUTH]    → userEmail updated:', userEmail.textContent);
      }
      
      // Update UI visibility based on page context
      console.log('[AUTH] 🎨 Calling updateAuthUIVisibility...');
      updateAuthUIVisibility();
      
      if (typeof loadUserVouchers === 'function') {
        console.log('[AUTH] 🎫 Loading user vouchers...');
        setTimeout(() => {
          if (typeof window.getDynamicPrice === 'function') {
            loadUserVouchers(window.getDynamicPrice);
          } else {
            loadUserVouchers(() => 0);
          }
        }, 500);
      }
      
      console.log('[AUTH] ✅ SSO auth setup completed');
    } catch (e) {
      console.error('[AUTH] ❌ Error parsing SSO user data:', e);
      // Invalid user data, clear and show login
      localStorage.removeItem('dg_jwt');
      localStorage.removeItem('dg_user');
      localStorage.removeItem('user_uid');
      localStorage.removeItem('customerEmail');
      updateAuthUIVisibility();
    }
  } else if (user) {
    console.log('[AUTH] ✅ User authenticated via Firebase');
    console.log('[AUTH] 👤 Firebase User:', {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName
    });
    
    // Đăng nhập thành công qua Firebase
    localStorage.setItem('user_uid', user.uid);
    localStorage.setItem('customerEmail', user.email);
    
    console.log('[AUTH] 🎨 Updating UI elements...');
    if (userLogo) userLogo.src = user.photoURL || 'https://via.placeholder.com/40x40/667eea/ffffff?text=👤';
    if (userAvatar) userAvatar.src = user.photoURL || 'https://via.placeholder.com/40x40/667eea/ffffff?text=👤';
    if (userName) userName.textContent = user.displayName || '';
    if (userEmail) userEmail.textContent = user.email || '';
    
    // Update UI visibility based on page context
    updateAuthUIVisibility();
    
    if (typeof loadUserVouchers === 'function') {
      console.log('[AUTH] 🎫 Loading user vouchers...');
      setTimeout(() => {
        if (typeof window.getDynamicPrice === 'function') {
          loadUserVouchers(window.getDynamicPrice);
        } else {
          loadUserVouchers(() => 0);
        }
      }, 500);
    }
    
    console.log('[AUTH] ✅ Firebase auth setup completed');
  } else {
    console.log('[AUTH] ℹ️  No authentication - User logged out or not logged in');
    
    // Đăng xuất — xóa cả convention V2 (dg_jwt / dg_user) và legacy.
    localStorage.removeItem('dg_jwt');
    localStorage.removeItem('dg_user');
    localStorage.removeItem('user_uid');
    localStorage.removeItem('customerEmail');
    if (userDropdown) userDropdown.style.display = 'none';
    if (userLogo) userLogo.src = '';
    if (userAvatar) userAvatar.src = '';
    if (userName) userName.textContent = '';
    if (userEmail) userEmail.textContent = '';
    
    // Update UI visibility based on page context
    updateAuthUIVisibility();
    
    console.log('[AUTH] ✅ Logout cleanup completed');
  }
});

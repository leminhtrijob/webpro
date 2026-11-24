'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  KeyRound,
  LayoutDashboard,
  ShoppingBag,
  Gift,
  Palette,
  Users,
  Settings,
  Search,
  Eye,
  Check,
  Send,
  Save,
  Flame,
  CheckCircle2,
  RefreshCw,
  LogOut,
  Database,
  Server,
  Layers,
  ArrowUpRight,
  UserCheck,
  Trash2,
  Plus,
  Play,
  Pause,
  Copy,
  Menu,
  X,
  DollarSign,
  Music,
  CheckCheck,
  Download,
  ExternalLink,
  Sparkles,
  FileText,
  Edit3,
  Crown,
  Image as ImageIcon,
  CreditCard,
  Phone,
  Activity,
  SlidersHorizontal
} from 'lucide-react';
import { AVAILABLE_TEMPLATES } from '@/data/availableTemplates';
import { ROMANTIC_PLAYLIST } from '@/data/music';
import { getLocalTemplateEnginePath } from '@/lib/templateEngineMap';
import { TemplateItem } from '@/models/gift';

interface IOrder {
  _id: string;
  orderId: string;
  giftId?: string;
  templateName: string;
  customerName: string;
  customerPhone?: string;
  orderType: string;
  amount: number;
  status: string;
  paymentMethod: string;
  note?: string;
  createdAt: string;
}

interface IGiftDoc {
  giftId: string;
  templateSlug: string;
  templateName: string;
  recipientName: string;
  senderName: string;
  viewsCount: number;
  isVip: boolean;
  letterTitle?: string;
  letterContent?: string;
  musicTitle?: string;
  particleType?: string;
  createdAt: string;
}

interface IAdminUser {
  userId: string;
  email: string;
  fullName: string;
  phone: string;
  avatar: string;
  bio: string;
  role: 'user' | 'vip' | 'admin';
  status: 'active' | 'locked';
  authProvider: 'local' | 'google';
  emailVerified: boolean;
  hasPassword: boolean;
  lastLoginAt?: string;
  createdAt?: string;
}

const CHIBI_GALLERY = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  url: `/demo/photos/${i + 1}.jpg?v=chibi`,
  label: `Chibi Studio #${String(i + 1).padStart(2, '0')}`
}));

export default function AdminDashboardPage() {
  // Authentication
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  // Navigation
  const [currentMenu, setCurrentMenu] = useState<
    'dashboard' | 'orders' | 'gifts' | 'templates' | 'customers' | 'media' | 'settings'
  >('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Sub-tabs
  const [customerSubTab, setCustomerSubTab] = useState<'users' | 'crm'>('users');
  const [mediaSubTab, setMediaSubTab] = useState<'chibi' | 'music'>('chibi');

  // Database Data
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [gifts, setGifts] = useState<IGiftDoc[]>([]);
  const [usersList, setUsersList] = useState<IAdminUser[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalOrdersCount, setTotalOrdersCount] = useState(0);
  const [totalGiftsCount, setTotalGiftsCount] = useState(0);
  const [loadingData, setLoadingData] = useState(false);
  const [dbPing, setDbPing] = useState('18ms');

  // Users Filter & Modals
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'user' | 'vip' | 'admin'>('all');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'active' | 'locked'>('all');
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    role: 'user' as 'user' | 'vip' | 'admin'
  });
  const [editingUser, setEditingUser] = useState<IAdminUser | null>(null);
  const [editUserPassword, setEditUserPassword] = useState('');

  // Templates Management
  const [templatesList, setTemplatesList] = useState<TemplateItem[]>(AVAILABLE_TEMPLATES);
  const [templateSearch, setTemplateSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [templatePage, setTemplatePage] = useState(1);
  const [previewModalTemplate, setPreviewModalTemplate] = useState<TemplateItem | null>(null);

  // Orders & Gifts Filters
  const [orderSearch, setOrderSearch] = useState('');
  const [orderFilter, setOrderFilter] = useState<'all' | 'completed' | 'pending'>('all');
  const [giftSearch, setGiftSearch] = useState('');

  // Audio Player
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Action Modals
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showAddOrderModal, setShowAddOrderModal] = useState(false);
  const [selectedGiftDetail, setSelectedGiftDetail] = useState<IGiftDoc | null>(null);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<IOrder | null>(null);

  const [newOrderForm, setNewOrderForm] = useState({
    customerName: '',
    customerPhone: '',
    templateName: 'Vũ Trụ Trái Tim 3D WebGL',
    amount: 49000,
    status: 'completed'
  });

  // Settings
  const [settings, setSettings] = useState({
    bankName: 'ACB Bank',
    accountNumber: '42515647',
    accountHolder: 'LE MINH TRI',
    zaloPhone: '0345151438'
  });
  const [savedSettings, setSavedSettings] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Session Check
  useEffect(() => {
    Promise.all([
      fetch('/api/admin/session').then((r) => r.json()).catch(() => ({ authenticated: false })),
      fetch('/api/auth/session').then((r) => r.json()).catch(() => ({ authenticated: false, user: null }))
    ])
      .then(([adminRes, userRes]) => {
        const isOk = Boolean(adminRes.authenticated) || (userRes.authenticated && userRes.user?.role === 'admin');
        setIsAuthenticated(isOk);
      })
      .finally(() => setCheckingSession(false));
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setPinError('');
    try {
      const response = await fetch('/api/admin/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pinInput })
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setIsAuthenticated(true);
        setPinInput('');
        setPinError('');
        showToast('Đăng nhập Quản trị viên thành công!');
      } else {
        setPinError(result.message || 'Mật khẩu quản trị không chính xác');
      }
    } catch {
      setPinError('Không thể kết nối máy chủ');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/session', { method: 'DELETE' });
    setIsAuthenticated(false);
    setPinInput('');
    showToast('Đã đăng xuất phiên quản trị');
  };

  // Load All MongoDB Data
  const loadDatabaseData = async () => {
    setLoadingData(true);
    const start = Date.now();
    try {
      const [resOrders, resGifts, resSettings, resUsers] = await Promise.all([
        fetch('/api/orders').then((r) => r.json()).catch(() => ({ success: false })),
        fetch('/api/gifts?all=1').then((r) => r.json()).catch(() => ({ success: false })),
        fetch('/api/settings').then((r) => r.json()).catch(() => ({ success: false })),
        fetch('/api/admin/users').then((r) => r.json()).catch(() => ({ success: false }))
      ]);

      if (resOrders.success) {
        setOrders(resOrders.data || []);
        setTotalRevenue(resOrders.revenue || 0);
        setTotalOrdersCount(resOrders.totalCount ?? resOrders.data?.length ?? 0);
      }
      if (resGifts.success) {
        setGifts(resGifts.data || []);
        setTotalGiftsCount(resGifts.totalCount || resGifts.data?.length || 0);
      }
      if (resSettings.success && resSettings.data) {
        setSettings(resSettings.data);
      }
      if (resUsers.success) {
        setUsersList(resUsers.data || []);
      }
    } catch (e) {
      console.warn('Lỗi đồng bộ MongoDB:', e);
    }
    setDbPing(`${Math.max(12, Date.now() - start)}ms`);
    setLoadingData(false);
  };

  useEffect(() => {
    if (isAuthenticated) {
      const timer = setTimeout(() => {
        void loadDatabaseData();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated]);

  // Orders CRUD
  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status })
      });
      const data = await res.json();
      if (data.success) {
        setOrders((prev) => prev.map((o) => (o.orderId === orderId ? { ...o, status } : o)));
        showToast(`Đơn ${orderId}: ${status === 'completed' ? 'Đã duyệt thanh toán' : 'Chờ duyệt'}`);
        void loadDatabaseData();
      } else {
        showToast(data.message || 'Không thể đổi trạng thái đơn');
      }
    } catch {
      showToast('Lỗi cập nhật trạng thái đơn');
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm(`Xóa đơn hàng ${orderId}?`)) return;
    try {
      const res = await fetch(`/api/orders?id=${orderId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setOrders((prev) => prev.filter((o) => o.orderId !== orderId));
        showToast(`Đã xóa đơn ${orderId}`);
      } else {
        showToast(data.message || 'Không thể xóa đơn đã hoàn tất');
      }
    } catch {
      showToast('Lỗi xóa đơn hàng');
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrderForm)
      });
      const data = await res.json();
      if (data.success && data.data) {
        setOrders((prev) => [data.data, ...prev]);
        setShowAddOrderModal(false);
        setNewOrderForm({
          customerName: '',
          customerPhone: '',
          templateName: 'Vũ Trụ Trái Tim 3D WebGL',
          amount: 49000,
          status: 'completed'
        });
        showToast('Đã tạo đơn hàng mới!');
        void loadDatabaseData();
      }
    } catch {
      showToast('Lỗi tạo đơn hàng');
    }
  };

  // Gifts CRUD
  const handleDeleteGift = async (giftId: string) => {
    if (!confirm(`Xóa quà tặng ${giftId} khỏi hệ thống?`)) return;
    try {
      const res = await fetch(`/api/gifts?id=${giftId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setGifts((prev) => prev.filter((g) => g.giftId !== giftId));
        setTotalGiftsCount((c) => Math.max(0, c - 1));
        showToast(`Đã xóa quà ${giftId}`);
      }
    } catch {
      showToast('Lỗi xóa quà');
    }
  };

  const handleCopyLink = (url: string, id: string) => {
    const full = typeof window !== 'undefined' ? `${window.location.origin}${url}` : url;
    navigator.clipboard.writeText(full);
    setCopiedId(id);
    showToast('Đã sao chép đường link quà tặng!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const exportOrdersCSV = () => {
    if (orders.length === 0) {
      showToast('Chưa có đơn hàng để xuất CSV');
      return;
    }
    const headers = ['Mã Đơn', 'Mẫu Quà', 'Khách Hàng', 'SĐT', 'Số Tiền', 'Trạng Thái', 'Thời Gian'];
    const rows = orders.map((o) => [
      o.orderId,
      `"${o.templateName.replace(/"/g, '""')}"`,
      `"${o.customerName.replace(/"/g, '""')}"`,
      `"${o.customerPhone || ''}"`,
      o.amount,
      o.status === 'completed' ? 'Đã Thanh Toán' : 'Chờ Duyệt',
      new Date(o.createdAt).toLocaleString('vi-VN')
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `trikun_orders_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Đã tải xuống file CSV báo cáo!');
  };

  // Audio Preview
  const togglePlayAudio = (file: string) => {
    if (playingAudio === file) {
      audioPlayerRef.current?.pause();
      setPlayingAudio(null);
    } else {
      if (!audioPlayerRef.current) {
        audioPlayerRef.current = new Audio(file);
      } else {
        audioPlayerRef.current.src = file;
      }
      audioPlayerRef.current.play().catch(() => {});
      setPlayingAudio(file);
      audioPlayerRef.current.onended = () => setPlayingAudio(null);
    }
  };

  // User CRUD
  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUserForm)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.message || 'Không thể tạo tài khoản');
        return;
      }
      setUsersList((prev) => [data.data, ...prev]);
      setShowCreateUserModal(false);
      setNewUserForm({ fullName: '', email: '', phone: '', password: '', role: 'user' });
      showToast('Đã tạo tài khoản thành công!');
      void loadDatabaseData();
    } catch {
      showToast('Lỗi kết nối khi tạo người dùng');
    }
  };

  const handleQuickUpdateUser = async (
    userId: string,
    payload: Partial<{
      role: 'user' | 'vip' | 'admin';
      status: 'active' | 'locked';
      fullName: string;
      phone: string;
      newPassword: string;
    }>
  ) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...payload })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.message || 'Lỗi cập nhật tài khoản');
        return;
      }
      setUsersList((prev) => prev.map((u) => (u.userId === userId ? data.data : u)));
      showToast(data.message || 'Đã cập nhật tài khoản');
      if (editingUser && editingUser.userId === userId) {
        setEditingUser(null);
        setEditUserPassword('');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ');
    }
  };

  const handleDeleteUser = async (user: IAdminUser) => {
    if (user.userId === 'USR_ADMIN_TRIKUN') {
      showToast('Không thể xóa tài khoản Super Admin gốc!');
      return;
    }
    if (!confirm(`Xóa tài khoản "${user.fullName}" (${user.email})?`)) return;
    try {
      const res = await fetch(`/api/admin/users?id=${encodeURIComponent(user.userId)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.message || 'Không thể xóa tài khoản');
        return;
      }
      setUsersList((prev) => prev.filter((u) => u.userId !== user.userId));
      showToast('Đã xóa tài khoản');
    } catch {
      showToast('Lỗi xóa người dùng');
    }
  };

  // Computed Lists
  const filteredAdminUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    return usersList.filter((u) => {
      if (userRoleFilter !== 'all' && u.role !== userRoleFilter) return false;
      if (userStatusFilter !== 'all' && u.status !== userStatusFilter) return false;
      if (!q) return true;
      return `${u.fullName} ${u.email} ${u.phone} ${u.userId}`.toLowerCase().includes(q);
    });
  }, [usersList, userSearch, userRoleFilter, userStatusFilter]);

  const customersList = useMemo(() => {
    const map = new Map<string, { name: string; phone: string; count: number; totalSpent: number; lastOrder: string }>();
    orders.forEach((o) => {
      const key = o.customerPhone || o.customerName || 'Khách vãng lai';
      const prev = map.get(key);
      if (prev) {
        prev.count += 1;
        if (o.status === 'completed') prev.totalSpent += o.amount;
        if (new Date(o.createdAt) > new Date(prev.lastOrder)) prev.lastOrder = o.createdAt;
      } else {
        map.set(key, {
          name: o.customerName,
          phone: o.customerPhone || '',
          count: 1,
          totalSpent: o.status === 'completed' ? o.amount : 0,
          lastOrder: o.createdAt
        });
      }
    });
    return Array.from(map.values());
  }, [orders]);

  const filteredTemplates = useMemo(() => {
    const q = templateSearch.trim().toLowerCase();
    return templatesList.filter((t) => {
      const matchCat = selectedCategory === 'Tất cả' || t.category.toLowerCase().includes(selectedCategory.toLowerCase());
      const matchSearch = !q || `${t.name} ${t.slug} ${t.category}`.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [templatesList, selectedCategory, templateSearch]);

  const TEMPLATES_PER_PAGE = 12;
  const totalTemplatePages = Math.max(1, Math.ceil(filteredTemplates.length / TEMPLATES_PER_PAGE));
  const safeTemplatePage = Math.min(templatePage, totalTemplatePages);
  const pagedTemplates = filteredTemplates.slice(
    (safeTemplatePage - 1) * TEMPLATES_PER_PAGE,
    safeTemplatePage * TEMPLATES_PER_PAGE
  );

  const pendingOrdersCount = useMemo(() => orders.filter((o) => o.status === 'pending').length, [orders]);
  const completedOrdersCount = useMemo(() => orders.filter((o) => o.status === 'completed').length, [orders]);
  const totalViewsCount = useMemo(() => gifts.reduce((acc, g) => acc + (g.viewsCount || 0), 0), [gifts]);

  // =========================================================================
  // 1. LOADING & SECURITY GATE
  // =========================================================================
  if (checkingSession) {
    return (
      <div className="min-h-screen bg-[#0D0716] text-white flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#FF1E6A] to-[#A838FF] flex items-center justify-center animate-spin shadow-lg shadow-[#FF1E6A]/40">
          <RefreshCw className="w-6 h-6 text-white" />
        </div>
        <p className="mt-4 text-xs font-bold text-pink-200/70">Đang xác thực phiên quản trị TriKun Studio...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0B0614] text-white flex flex-col justify-center items-center px-4 relative overflow-hidden select-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[#FF1E6A]/25 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-[#A838FF]/25 rounded-full blur-[150px]" />

        <div className="max-w-md w-full relative z-10">
          <div className="bg-[#160D24]/90 backdrop-blur-2xl border border-pink-400/25 rounded-3xl p-8 shadow-[0_25px_70px_rgba(255,30,106,0.28)] text-center space-y-6">
            <div className="inline-flex p-4 rounded-3xl bg-gradient-to-tr from-[#FF1E6A]/25 to-[#A838FF]/25 border border-pink-300/30 text-[#FF4F9A] shadow-lg">
              <ShieldCheck className="w-11 h-11" />
            </div>

            <div>
              <span className="px-3 py-1 rounded-full bg-pink-500/15 border border-pink-400/30 text-pink-300 text-[10px] font-black uppercase tracking-widest">
                TriKun Command Center
              </span>
              <h1 className="text-2xl font-black text-white tracking-tight mt-2">Đăng Nhập Quản Trị</h1>
              <p className="text-xs text-pink-200/70 mt-1">
                Nhập mật khẩu Admin (mặc định: <code className="text-pink-300 font-bold">TriKun@2026</code>)
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4 text-left">
              <div className="relative">
                <input
                  type="password"
                  autoFocus
                  placeholder="Mật khẩu quản trị..."
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  className="w-full bg-[#0D0716] border border-pink-300/25 rounded-2xl px-4 py-3.5 pl-11 text-sm text-white placeholder-pink-200/30 focus:outline-none focus:border-[#FF1E6A] focus:ring-2 focus:ring-[#FF1E6A]/30 transition-all"
                />
                <KeyRound className="w-4 h-4 text-pink-300/50 absolute left-4 top-1/2 -translate-y-1/2" />
              </div>

              {pinError && (
                <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{pinError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isVerifying || !pinInput}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#FF1E6A] via-[#FF3D8B] to-[#A838FF] text-white font-black text-sm shadow-lg shadow-[#FF1E6A]/35 hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang xác thực...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Vào Bảng Điều Khiển</span>
                  </>
                )}
              </button>
            </form>

            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-pink-200/60">
              <Link href="/" className="hover:text-white transition-colors">
                ← Về trang chủ
              </Link>
              <span className="flex items-center gap-1">
                <Server className="w-3.5 h-3.5 text-emerald-400" />
                MongoDB Atlas Connected
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. LUXURY MODERN-TECH ADMIN WORKSPACE
  // =========================================================================
  const MENU_ITEMS = [
    { id: 'dashboard', label: 'Tổng Quan', icon: LayoutDashboard, count: null },
    { id: 'orders', label: 'Đơn Hàng', icon: ShoppingBag, count: totalOrdersCount || orders.length },
    { id: 'gifts', label: 'Quà Tặng 3D', icon: Gift, count: totalGiftsCount || gifts.length },
    { id: 'templates', label: 'Kho 122 Mẫu', icon: Palette, count: templatesList.length },
    { id: 'customers', label: 'Tài Khoản & CRM', icon: Users, count: usersList.length },
    { id: 'media', label: 'Chibi & Nhạc', icon: Sparkles, count: 19 },
    { id: 'settings', label: 'Cấu Hình ACB', icon: Settings, count: null }
  ] as const;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FDF7FA] via-[#F7F2FA] to-[#FDF8FC] text-[#1E122B] flex antialiased">
      {/* TOAST */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-[80] bg-[#1E102C] text-white px-4 py-3 rounded-2xl shadow-2xl border border-pink-400/30 flex items-center gap-2.5 text-xs font-extrabold">
          <Sparkles className="w-4 h-4 text-[#FF1E6A]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* MOBILE BACKDROP */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#130A1E] text-white flex flex-col border-r border-white/10 transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#FF1E6A] to-[#A838FF] flex items-center justify-center shadow-lg shadow-[#FF1E6A]/35 shrink-0">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div className="truncate">
              <div className="font-black text-sm tracking-tight text-white flex items-center gap-1.5">
                <span>TriKun Admin</span>
                <span className="px-1.5 py-0.5 rounded-md bg-gradient-to-r from-[#FF1E6A] to-[#A838FF] text-[9px] font-black uppercase">
                  PRO
                </span>
              </div>
              <p className="text-[10px] text-pink-200/60 font-semibold truncate">48 Engine • 122 Mẫu 3D</p>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-zinc-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cloud Status */}
        <div className="px-3.5 py-2.5 mx-3.5 my-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-bold text-pink-100/90">MongoDB Cloud</span>
          </div>
          <span className="font-mono text-[10px] text-emerald-400 font-bold bg-emerald-500/15 px-2 py-0.5 rounded-full">
            {dbPing}
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = currentMenu === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentMenu(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-extrabold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-[#FF1E6A] via-[#FF3D8B] to-[#A838FF] text-white shadow-lg shadow-[#FF1E6A]/30'
                    : 'text-pink-100/65 hover:bg-white/8 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.count !== null && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                      isActive ? 'bg-white/25 text-white' : 'bg-white/10 text-pink-200'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Admin Footer */}
        <div className="p-3.5 border-t border-white/10 bg-[#0D0716] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="/demo/photos/1.jpg?v=chibi"
              alt="Admin"
              className="w-9 h-9 rounded-xl object-cover border border-pink-400/40 shrink-0"
            />
            <div className="truncate">
              <p className="text-xs font-black text-white truncate">Lê Minh Trí</p>
              <p className="text-[10px] text-pink-300/70 truncate">Super Admin • {settings.zaloPhone}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Đăng xuất"
            className="p-2 rounded-xl text-pink-200/60 hover:text-red-400 hover:bg-red-500/15 transition-colors cursor-pointer shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-xl border-b border-pink-200/60 px-4 sm:px-7 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-pink-50 text-[#29104E] border border-pink-200 shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="truncate">
              <h1 className="text-sm sm:text-base font-black text-[#29104E] truncate">
                {currentMenu === 'dashboard' && 'Tổng Quan Hệ Thống'}
                {currentMenu === 'orders' && 'Quản Lý Đơn Hàng & VietQR'}
                {currentMenu === 'gifts' && 'Quản Lý Quà Tặng 3D (Cloud DB)'}
                {currentMenu === 'templates' && 'Kho 122 Mẫu Web & 48 Engine Local'}
                {currentMenu === 'customers' && 'Quản Lý Tài Khoản User & CRM'}
                {currentMenu === 'media' && 'Bộ Ảnh Chibi TriKun & Kho Nhạc'}
                {currentMenu === 'settings' && 'Cấu Hình Thanh Toán ACB & Zalo'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={loadDatabaseData}
              disabled={loadingData}
              className="px-3 py-1.5 rounded-xl border border-pink-200 bg-white text-xs font-extrabold text-[#29104E] hover:border-[#FF1E6A] hover:text-[#FF1E6A] flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin text-[#FF1E6A]' : ''}`} />
              <span className="hidden sm:inline">Làm mới</span>
            </button>

            <Link
              href="/studio/myheart-7"
              className="px-3 py-1.5 rounded-xl border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-extrabold hidden md:flex items-center gap-1.5 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Mở Studio</span>
            </Link>

            <Link
              href="/"
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#FF1E6A] to-[#A838FF] text-white text-xs font-extrabold shadow-sm hover:opacity-95 flex items-center gap-1.5 transition-all"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Xem Trang Chủ</span>
            </Link>
          </div>
        </header>

        {/* WORKSPACE BODY */}
        <main className="p-4 sm:p-7 flex-1 space-y-6 max-w-7xl w-full mx-auto">
          {/* ========================================================= */}
          {/* 1. DASHBOARD OVERVIEW                                     */}
          {/* ========================================================= */}
          {currentMenu === 'dashboard' && (
            <div className="space-y-6">
              {/* 4 KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div
                  onClick={() => setCurrentMenu('orders')}
                  className="bg-white/95 rounded-3xl p-5 border border-pink-200/80 shadow-[0_10px_30px_rgba(255,30,106,0.06)] hover:border-[#FF1E6A] transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-extrabold text-[#6E5560]">Doanh Thu VietQR</span>
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#FF1E6A] to-[#FF5E99] text-white flex items-center justify-center shadow-md shadow-[#FF1E6A]/25">
                      <DollarSign className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-[#29104E] truncate">
                    {totalRevenue.toLocaleString('vi-VN')}đ
                  </div>
                  <div className="mt-2.5 flex items-center justify-between text-[11px] font-bold">
                    <span className="text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {completedOrdersCount} đơn hoàn tất
                    </span>
                    <span className="text-amber-600">{pendingOrdersCount} chờ duyệt</span>
                  </div>
                </div>

                <div
                  onClick={() => setCurrentMenu('gifts')}
                  className="bg-white/95 rounded-3xl p-5 border border-purple-200/80 shadow-[0_10px_30px_rgba(168,56,255,0.06)] hover:border-[#A838FF] transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-extrabold text-[#6E5560]">Quà Tặng 3D Đã Tạo</span>
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#A838FF] to-[#C06CFF] text-white flex items-center justify-center shadow-md shadow-[#A838FF]/25">
                      <Gift className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-[#29104E] truncate">
                    {totalGiftsCount || gifts.length} link quà
                  </div>
                  <div className="mt-2.5 flex items-center justify-between text-[11px] font-bold text-purple-600">
                    <span>{totalViewsCount.toLocaleString('vi-VN')} lượt mở xem</span>
                    <span>Cloud Atlas</span>
                  </div>
                </div>

                <div
                  onClick={() => setCurrentMenu('templates')}
                  className="bg-white/95 rounded-3xl p-5 border border-pink-200/80 shadow-[0_10px_30px_rgba(255,30,106,0.06)] hover:border-[#FF1E6A] transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-extrabold text-[#6E5560]">Kho Mẫu 3D Local</span>
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#EC4899] to-[#8B5CF6] text-white flex items-center justify-center shadow-md shadow-pink-500/25">
                      <Palette className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-[#29104E] truncate">122 mẫu active</div>
                  <div className="mt-2.5 flex items-center justify-between text-[11px] font-bold text-[#FF1E6A]">
                    <span>48 Engine HTML/3D</span>
                    <span>12 Chibi VIP</span>
                  </div>
                </div>

                <div
                  onClick={() => setCurrentMenu('customers')}
                  className="bg-white/95 rounded-3xl p-5 border border-blue-200/80 shadow-[0_10px_30px_rgba(0,104,255,0.06)] hover:border-[#0068FF] transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-extrabold text-[#6E5560]">Tài Khoản & Khách Hàng</span>
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#0068FF] to-[#38BDF8] text-white flex items-center justify-center shadow-md shadow-blue-500/25">
                      <Users className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-[#29104E] truncate">{usersList.length} tài khoản</div>
                  <div className="mt-2.5 flex items-center justify-between text-[11px] font-bold text-[#0068FF]">
                    <span>Zalo: {settings.zaloPhone}</span>
                    <span>ACB: {settings.accountNumber}</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions Bar */}
              <div className="bg-gradient-to-r from-[#1A0D2A] via-[#28123D] to-[#1A0D2A] text-white p-4 sm:p-5 rounded-3xl shadow-lg border border-pink-400/20 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-pink-400 shrink-0">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black">Thao Tác Quản Trị Nhanh</h3>
                    <p className="text-[11px] text-pink-200/70">
                      Tạo đơn mới, thêm tài khoản VIP, xuất báo cáo hoặc kiểm tra kho mẫu 3D.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setShowAddOrderModal(true)}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#FF1E6A] to-[#FF4F86] text-white text-xs font-extrabold flex items-center gap-1.5 shadow-md cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm Đơn</span>
                  </button>
                  <button
                    onClick={() => setShowCreateUserModal(true)}
                    className="px-3.5 py-2 rounded-xl bg-white/12 hover:bg-white/20 text-white text-xs font-extrabold border border-white/15 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm User</span>
                  </button>
                  <button
                    onClick={exportOrdersCSV}
                    className="px-3.5 py-2 rounded-xl bg-white/12 hover:bg-white/20 text-white text-xs font-extrabold border border-white/15 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Xuất CSV</span>
                  </button>
                </div>
              </div>

              {/* 2-Column Live Lists: Recent Orders & Recent 3D Gifts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Orders */}
                <div className="bg-white/95 rounded-3xl border border-pink-200/75 p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-pink-100 pb-3">
                    <h3 className="text-sm font-black text-[#29104E] flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-[#FF1E6A]" />
                      <span>Đơn Hàng Mới Nhất</span>
                    </h3>
                    <button
                      onClick={() => setCurrentMenu('orders')}
                      className="text-xs font-extrabold text-[#FF1E6A] hover:underline cursor-pointer"
                    >
                      Tất cả ({orders.length}) →
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {orders.length === 0 ? (
                      <div className="py-10 text-center text-xs text-zinc-400">Chưa có đơn hàng nào</div>
                    ) : (
                      orders.slice(0, 5).map((order) => (
                        <div
                          key={order.orderId}
                          className="p-3.5 rounded-2xl bg-[#FDF9FC] border border-pink-100 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-[#FF1E6A]">{order.orderId}</span>
                              <span
                                className={`px-2 py-0.5 rounded-full font-extrabold text-[10px] ${
                                  order.status === 'completed'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-amber-100 text-amber-700'
                                }`}
                              >
                                {order.status === 'completed' ? 'Đã TT' : 'Chờ duyệt'}
                              </span>
                            </div>
                            <p className="text-[#29104E] font-bold mt-1 truncate">
                              {order.customerName} • {order.templateName}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-black text-sm text-[#29104E]">
                              {order.amount.toLocaleString('vi-VN')}đ
                            </span>
                            {order.status === 'pending' && (
                              <button
                                onClick={() => handleUpdateOrderStatus(order.orderId, 'completed')}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-extrabold hover:bg-emerald-700 cursor-pointer"
                              >
                                Duyệt
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Recent 3D Gifts */}
                <div className="bg-white/95 rounded-3xl border border-purple-200/75 p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-purple-100 pb-3">
                    <h3 className="text-sm font-black text-[#29104E] flex items-center gap-2">
                      <Gift className="w-4 h-4 text-[#A838FF]" />
                      <span>Quà Tặng 3D Vừa Tạo</span>
                    </h3>
                    <button
                      onClick={() => setCurrentMenu('gifts')}
                      className="text-xs font-extrabold text-[#A838FF] hover:underline cursor-pointer"
                    >
                      Tất cả ({gifts.length}) →
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {gifts.length === 0 ? (
                      <div className="py-10 text-center text-xs text-zinc-400">Chưa có quà tặng nào</div>
                    ) : (
                      gifts.slice(0, 5).map((gift) => (
                        <div
                          key={gift.giftId}
                          className="p-3.5 rounded-2xl bg-[#FAF8FE] border border-purple-100 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-[#A838FF] truncate max-w-[140px]">
                                {gift.giftId}
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-pink-100 text-[#FF1E6A] text-[10px] font-extrabold">
                                {gift.viewsCount || 0} xem
                              </span>
                            </div>
                            <p className="text-[#29104E] font-bold mt-1 truncate">
                              Gửi {gift.recipientName} • {gift.templateName}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <a
                              href={`/v/${gift.templateSlug}?id=${gift.giftId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-[#FF1E6A] to-[#A838FF] text-white font-extrabold text-[11px] flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Mở</span>
                            </a>
                            <button
                              onClick={() => handleCopyLink(`/v/${gift.templateSlug}?id=${gift.giftId}`, gift.giftId)}
                              className="p-1.5 rounded-xl border border-purple-200 bg-white text-purple-700 hover:bg-purple-50 cursor-pointer"
                              title="Copy link"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 2. ORDERS MANAGEMENT                                      */}
          {/* ========================================================= */}
          {currentMenu === 'orders' && (
            <div className="bg-white/95 rounded-3xl border border-pink-200/80 p-5 sm:p-6 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-pink-100 pb-4">
                <div className="flex flex-wrap items-center gap-2">
                  {(['all', 'completed', 'pending'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setOrderFilter(mode)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                        orderFilter === mode
                          ? 'bg-gradient-to-r from-[#FF1E6A] to-[#A838FF] text-white shadow-sm'
                          : 'bg-pink-50/70 text-[#6E5560] hover:bg-pink-100/70'
                      }`}
                    >
                      {mode === 'all' && `Tất cả (${orders.length})`}
                      {mode === 'completed' && `Đã thanh toán (${completedOrdersCount})`}
                      {mode === 'pending' && `Chờ duyệt (${pendingOrdersCount})`}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Tìm mã đơn, tên, SĐT..."
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                      className="w-full text-xs py-2 pl-8 pr-3 rounded-xl border border-pink-200 focus:outline-none focus:border-[#FF1E6A]"
                    />
                  </div>
                  <button
                    onClick={exportOrdersCSV}
                    className="px-3 py-2 rounded-xl border border-pink-200 bg-white text-xs font-extrabold text-[#29104E] hover:border-[#FF1E6A] flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-[#0068FF]" />
                    <span>CSV</span>
                  </button>
                  <button
                    onClick={() => setShowAddOrderModal(true)}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#FF1E6A] to-[#FF4F86] text-white text-xs font-extrabold flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm Đơn</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-pink-100">
                <table className="w-full text-left text-xs">
                  <thead className="bg-pink-50/60 text-[#6E5560] font-extrabold border-b border-pink-100">
                    <tr>
                      <th className="py-3 px-3.5">Mã Đơn</th>
                      <th className="py-3 px-3.5">Khách Hàng</th>
                      <th className="py-3 px-3.5">Mẫu Quà</th>
                      <th className="py-3 px-3.5">Số Tiền</th>
                      <th className="py-3 px-3.5">Trạng Thái</th>
                      <th className="py-3 px-3.5">Ngày Tạo</th>
                      <th className="py-3 px-3.5 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-pink-100/60">
                    {orders
                      .filter((o) => {
                        const matchFilter = orderFilter === 'all' || o.status === orderFilter;
                        const q = orderSearch.toLowerCase();
                        const matchSearch =
                          !q ||
                          o.orderId.toLowerCase().includes(q) ||
                          o.customerName.toLowerCase().includes(q) ||
                          (o.customerPhone && o.customerPhone.includes(q));
                        return matchFilter && matchSearch;
                      })
                      .map((order) => (
                        <tr key={order.orderId} className="hover:bg-pink-50/30 transition-colors">
                          <td className="py-3 px-3.5 font-mono font-black text-[#FF1E6A]">{order.orderId}</td>
                          <td className="py-3 px-3.5">
                            <span className="font-extrabold text-[#29104E] block">{order.customerName}</span>
                            <span className="text-[10px] text-zinc-500">{order.customerPhone || '—'}</span>
                          </td>
                          <td className="py-3 px-3.5 font-bold text-[#29104E] max-w-[200px] truncate">
                            {order.templateName}
                          </td>
                          <td className="py-3 px-3.5 font-black text-[#29104E]">
                            {order.amount.toLocaleString('vi-VN')}đ
                          </td>
                          <td className="py-3 px-3.5">
                            <span
                              className={`px-2.5 py-1 rounded-full font-extrabold text-[10px] ${
                                order.status === 'completed'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {order.status === 'completed' ? 'Đã Thanh Toán' : 'Chờ Duyệt'}
                            </span>
                          </td>
                          <td className="py-3 px-3.5 text-[11px] text-zinc-500">
                            {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                          </td>
                          <td className="py-3 px-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {order.status === 'pending' ? (
                                <button
                                  onClick={() => handleUpdateOrderStatus(order.orderId, 'completed')}
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-[11px] font-extrabold flex items-center gap-1 cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Duyệt</span>
                                </button>
                              ) : (
                                <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                                  <CheckCheck className="w-3.5 h-3.5" />
                                </span>
                              )}
                              {order.customerPhone && (
                                <a
                                  href={`https://zalo.me/${order.customerPhone}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded-lg bg-[#0068FF] text-white hover:opacity-90"
                                  title="Chat Zalo"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                </a>
                              )}
                              <button
                                onClick={() => setSelectedOrderDetail(order)}
                                className="p-1.5 rounded-lg border border-pink-200 text-zinc-600 hover:text-[#FF1E6A] cursor-pointer"
                                title="Chi tiết"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              {order.status !== 'completed' && (
                                <button
                                  onClick={() => handleDeleteOrder(order.orderId)}
                                  className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 cursor-pointer"
                                  title="Xóa đơn"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 3. GIFTS MANAGEMENT (CLOUD MONGODB)                       */}
          {/* ========================================================= */}
          {currentMenu === 'gifts' && (
            <div className="bg-white/95 rounded-3xl border border-pink-200/80 p-5 sm:p-6 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-pink-100 pb-4">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded-xl bg-pink-50 text-[#FF1E6A] text-xs font-black">
                    Tổng: {totalGiftsCount || gifts.length} link quà
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-purple-50 text-[#A838FF] text-xs font-black">
                    {totalViewsCount} lượt mở
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative w-full sm:w-72">
                    <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Tìm mã TK, người nhận, người gửi..."
                      value={giftSearch}
                      onChange={(e) => setGiftSearch(e.target.value)}
                      className="w-full text-xs py-2 pl-8 pr-3 rounded-xl border border-pink-200 focus:outline-none focus:border-[#FF1E6A]"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {gifts
                  .filter((g) => {
                    const q = giftSearch.toLowerCase();
                    return (
                      !q ||
                      g.giftId.toLowerCase().includes(q) ||
                      g.recipientName.toLowerCase().includes(q) ||
                      g.senderName.toLowerCase().includes(q) ||
                      g.templateName.toLowerCase().includes(q)
                    );
                  })
                  .map((gift) => (
                    <div
                      key={gift.giftId}
                      className="p-4 rounded-3xl bg-[#FDF9FC] border border-pink-200/70 hover:border-[#FF1E6A] transition-all flex flex-col justify-between gap-3"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono font-black text-xs text-[#FF1E6A] truncate">{gift.giftId}</span>
                          <span className="px-2.5 py-0.5 rounded-full bg-pink-100 text-[#FF1E6A] font-extrabold text-[10px] shrink-0">
                            {gift.viewsCount || 0} lượt xem
                          </span>
                        </div>
                        <h4 className="font-black text-sm text-[#29104E] truncate">{gift.templateName}</h4>
                        <p className="text-xs text-[#6E5560] truncate">
                          Gửi: <strong className="text-[#29104E]">{gift.recipientName}</strong> • Từ: {gift.senderName}
                        </p>
                      </div>

                      <div className="pt-2.5 border-t border-pink-100 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <a
                            href={`/v/${gift.templateSlug}?id=${gift.giftId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#FF1E6A] to-[#A838FF] text-white font-extrabold text-[11px] flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Mở 3D</span>
                          </a>
                          <button
                            onClick={() => handleCopyLink(`/v/${gift.templateSlug}?id=${gift.giftId}`, gift.giftId)}
                            className="px-2.5 py-1.5 rounded-xl border border-pink-200 bg-white text-[#29104E] hover:border-[#FF1E6A] font-extrabold text-[11px] flex items-center gap-1 cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>{copiedId === gift.giftId ? 'Đã copy' : 'Copy'}</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setSelectedGiftDetail(gift)}
                            className="p-1.5 rounded-lg border border-pink-200 bg-white text-zinc-600 hover:text-[#FF1E6A] cursor-pointer"
                            title="Xem thư tình"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteGift(gift.giftId)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 cursor-pointer"
                            title="Xóa quà"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 4. 122 TEMPLATES & 48 LOCAL ENGINES                       */}
          {/* ========================================================= */}
          {currentMenu === 'templates' && (
            <div className="bg-white/95 rounded-3xl border border-pink-200/80 p-5 sm:p-6 shadow-xs space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-pink-100 pb-4">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {['Tất cả', 'Tình yêu', 'Valentine', 'Sinh nhật', 'Ngày Nhà Giáo 20/11', 'Trái tim 3D', 'Thiệp'].map(
                    (cat) => (
                      <button
                        key={cat}
                        onClick={() => {
                          setSelectedCategory(cat);
                          setTemplatePage(1);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap cursor-pointer ${
                          selectedCategory === cat
                            ? 'bg-gradient-to-r from-[#FF1E6A] to-[#A838FF] text-white shadow-xs'
                            : 'bg-pink-50/70 text-[#6E5560] hover:bg-pink-100/70'
                        }`}
                      >
                        {cat}
                      </button>
                    )
                  )}
                </div>

                <div className="relative w-full md:w-72 shrink-0">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Tìm trong 122 mẫu..."
                    value={templateSearch}
                    onChange={(e) => {
                      setTemplateSearch(e.target.value);
                      setTemplatePage(1);
                    }}
                    className="w-full text-xs py-2 pl-8 pr-3 rounded-xl border border-pink-200 focus:outline-none focus:border-[#FF1E6A]"
                  />
                </div>
              </div>

              {/* Grid 12 Templates per page */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {pagedTemplates.map((item) => {
                  const enginePath = getLocalTemplateEnginePath(item.slug);
                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-pink-200/80 bg-[#FDF9FC] overflow-hidden flex flex-col justify-between hover:border-[#FF1E6A] transition-all"
                    >
                      <div>
                        <div className="relative aspect-[16/10] bg-[#160B24] overflow-hidden">
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          <button
                            onClick={() => {
                              setTemplatesList((prev) =>
                                prev.map((t) => (t.id === item.id ? { ...t, isHot: !t.isHot } : t))
                              );
                              showToast(`Đã ${item.isHot ? 'tắt' : 'bật'} nhãn HOT cho ${item.name}`);
                            }}
                            className={`absolute top-2 left-2 px-2.5 py-1 rounded-full text-[10px] font-black flex items-center gap-1 cursor-pointer shadow ${
                              item.isHot
                                ? 'bg-gradient-to-r from-[#FF1E6A] to-[#FF6B00] text-white'
                                : 'bg-black/60 text-white/80 hover:bg-black/80'
                            }`}
                          >
                            <Flame className="w-3 h-3" />
                            <span>{item.isHot ? 'HOT' : 'Thường'}</span>
                          </button>
                          <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-white/90 text-[#29104E] text-[10px] font-black">
                            #{item.id}
                          </span>
                        </div>

                        <div className="p-3.5 space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-extrabold text-[#FF1E6A]">
                            <span className="truncate">{item.category}</span>
                            <span className="text-emerald-600">● Active</span>
                          </div>
                          <h4 className="font-black text-sm text-[#29104E] truncate">{item.name}</h4>
                          <p className="font-mono text-[10px] text-purple-600 truncate" title={enginePath}>
                            Engine: {enginePath.replace('/templates/', '').replace('/index.html', '')}
                          </p>
                        </div>
                      </div>

                      <div className="p-3 pt-0 grid grid-cols-2 gap-1.5">
                        <button
                          onClick={() => setPreviewModalTemplate(item)}
                          className="py-2 rounded-xl border border-pink-200 bg-white hover:bg-pink-50 text-[#29104E] text-[11px] font-extrabold flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#FF1E6A]" />
                          <span>Chạy thử</span>
                        </button>
                        <Link
                          href={`/studio/${item.slug}`}
                          target="_blank"
                          className="py-2 rounded-xl bg-gradient-to-r from-[#FF1E6A] to-[#A838FF] text-white text-[11px] font-extrabold flex items-center justify-center gap-1"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Studio</span>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalTemplatePages > 1 && (
                <div className="flex items-center justify-between pt-3 border-t border-pink-100 text-xs font-extrabold">
                  <span className="text-[#6E5560]">
                    Hiển thị {pagedTemplates.length} / {filteredTemplates.length} mẫu (Trang {safeTemplatePage}/
                    {totalTemplatePages})
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={safeTemplatePage <= 1}
                      onClick={() => setTemplatePage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1.5 rounded-xl border border-pink-200 bg-white disabled:opacity-40 cursor-pointer"
                    >
                      ← Trước
                    </button>
                    <button
                      disabled={safeTemplatePage >= totalTemplatePages}
                      onClick={() => setTemplatePage((p) => Math.min(totalTemplatePages, p + 1))}
                      className="px-3 py-1.5 rounded-xl border border-pink-200 bg-white disabled:opacity-40 cursor-pointer"
                    >
                      Sau →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* 5. USERS (MVC) & CRM                                      */}
          {/* ========================================================= */}
          {currentMenu === 'customers' && (
            <div className="space-y-5">
              {/* Sub-tab Switcher */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white/95 p-3.5 rounded-3xl border border-pink-200/80">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCustomerSubTab('users')}
                    className={`px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                      customerSubTab === 'users'
                        ? 'bg-gradient-to-r from-[#FF1E6A] to-[#A838FF] text-white shadow-sm'
                        : 'bg-pink-50 text-[#6E5560]'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Tài Khoản Hệ Thống ({usersList.length})</span>
                  </button>
                  <button
                    onClick={() => setCustomerSubTab('crm')}
                    className={`px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                      customerSubTab === 'crm'
                        ? 'bg-gradient-to-r from-[#FF1E6A] to-[#A838FF] text-white shadow-sm'
                        : 'bg-pink-50 text-[#6E5560]'
                    }`}
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Khách Đặt Đơn Zalo ({customersList.length})</span>
                  </button>
                </div>

                {customerSubTab === 'users' && (
                  <button
                    onClick={() => setShowCreateUserModal(true)}
                    className="px-4 py-2 rounded-2xl bg-gradient-to-r from-[#FF1E6A] to-[#FF4F86] text-white text-xs font-black flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tạo Tài Khoản Mới</span>
                  </button>
                )}
              </div>

              {customerSubTab === 'users' ? (
                <div className="bg-white/95 rounded-3xl border border-pink-200/80 p-5 space-y-4">
                  {/* Filters */}
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        placeholder="Tìm tên, email, SĐT..."
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-pink-200 text-xs font-semibold focus:outline-none focus:border-[#FF1E6A]"
                      />
                    </div>
                    <select
                      value={userRoleFilter}
                      onChange={(e) => setUserRoleFilter(e.target.value as typeof userRoleFilter)}
                      className="px-3 py-2 rounded-xl border border-pink-200 bg-pink-50/40 text-xs font-extrabold text-[#29104E]"
                    >
                      <option value="all">Tất cả vai trò</option>
                      <option value="user">User</option>
                      <option value="vip">VIP</option>
                      <option value="admin">Admin</option>
                    </select>
                    <select
                      value={userStatusFilter}
                      onChange={(e) => setUserStatusFilter(e.target.value as typeof userStatusFilter)}
                      className="px-3 py-2 rounded-xl border border-pink-200 bg-pink-50/40 text-xs font-extrabold text-[#29104E]"
                    >
                      <option value="all">Tất cả trạng thái</option>
                      <option value="active">Hoạt động</option>
                      <option value="locked">Đang khóa</option>
                    </select>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto rounded-2xl border border-pink-100">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-pink-50/60 text-[#6E5560] font-extrabold border-b border-pink-100">
                        <tr>
                          <th className="py-3 px-3.5">Thành Viên</th>
                          <th className="py-3 px-3.5">Email</th>
                          <th className="py-3 px-3.5">Vai Trò</th>
                          <th className="py-3 px-3.5">Trạng Thái</th>
                          <th className="py-3 px-3.5 text-right">Thao Tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-pink-100/60">
                        {filteredAdminUsers.map((u) => (
                          <tr key={u.userId} className="hover:bg-pink-50/30 transition-colors">
                            <td className="py-3 px-3.5">
                              <div className="flex items-center gap-2.5">
                                <img
                                  src={u.avatar || '/demo/photos/1.jpg?v=chibi'}
                                  alt={u.fullName}
                                  className="w-9 h-9 rounded-xl object-cover border border-pink-200 shrink-0"
                                />
                                <div className="min-w-0">
                                  <p className="font-extrabold text-[#29104E] truncate">{u.fullName}</p>
                                  <span className="text-[10px] text-zinc-500">{u.phone || u.userId}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3.5">
                              <p className="font-bold text-[#29104E]">{u.email}</p>
                              <span className="text-[10px] text-purple-600 font-bold uppercase">
                                {u.authProvider === 'google' ? 'Google OAuth' : 'Email OTP'}
                              </span>
                            </td>
                            <td className="py-3 px-3.5">
                              <select
                                value={u.role}
                                onChange={(e) =>
                                  handleQuickUpdateUser(u.userId, {
                                    role: e.target.value as 'user' | 'vip' | 'admin'
                                  })
                                }
                                className="px-2.5 py-1 rounded-lg border border-pink-200 bg-white font-extrabold text-[11px] text-[#29104E] cursor-pointer"
                              >
                                <option value="user">User</option>
                                <option value="vip">⭐ VIP</option>
                                <option value="admin">🛡️ Admin</option>
                              </select>
                            </td>
                            <td className="py-3 px-3.5">
                              <button
                                onClick={() =>
                                  handleQuickUpdateUser(u.userId, {
                                    status: u.status === 'active' ? 'locked' : 'active'
                                  })
                                }
                                className={`px-2.5 py-1 rounded-full font-extrabold text-[10px] inline-flex items-center gap-1 cursor-pointer ${
                                  u.status === 'active'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-red-100 text-red-700'
                                }`}
                              >
                                {u.status === 'active' ? (
                                  <>
                                    <Unlock className="w-3 h-3" /> Hoạt động
                                  </>
                                ) : (
                                  <>
                                    <Lock className="w-3 h-3" /> Đang khóa
                                  </>
                                )}
                              </button>
                            </td>
                            <td className="py-3 px-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    setEditingUser(u);
                                    setEditUserPassword('');
                                  }}
                                  className="p-1.5 rounded-lg border border-pink-200 text-zinc-600 hover:text-[#FF1E6A] cursor-pointer"
                                  title="Sửa / Đổi mật khẩu"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                {u.userId !== 'USR_ADMIN_TRIKUN' && (
                                  <button
                                    onClick={() => handleDeleteUser(u)}
                                    className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 cursor-pointer"
                                    title="Xóa tài khoản"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-white/95 rounded-3xl border border-pink-200/80 p-5 space-y-3">
                  {customersList.length === 0 ? (
                    <div className="py-10 text-center text-xs text-zinc-400">Chưa có khách hàng đặt đơn</div>
                  ) : (
                    customersList.map((c, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-[#FDF9FC] border border-pink-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#0068FF] to-[#38BDF8] text-white font-black flex items-center justify-center">
                            {c.name.slice(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-black text-sm text-[#29104E]">{c.name}</h4>
                            <p className="text-[#6E5560]">
                              SĐT: <strong className="text-[#0068FF]">{c.phone || '—'}</strong> • {c.count} đơn • Đã
                              thanh toán:{' '}
                              <strong className="text-emerald-600">{c.totalSpent.toLocaleString('vi-VN')}đ</strong>
                            </p>
                          </div>
                        </div>
                        <a
                          href={`https://zalo.me/${c.phone || settings.zaloPhone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 rounded-xl bg-[#0068FF] text-white font-extrabold text-xs flex items-center gap-1.5 w-fit"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Chat Zalo</span>
                        </a>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* 6. CHIBI DEMO GALLERY & ROMANTIC MUSIC                    */}
          {/* ========================================================= */}
          {currentMenu === 'media' && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 bg-white/95 p-3.5 rounded-3xl border border-pink-200/80">
                <button
                  onClick={() => setMediaSubTab('chibi')}
                  className={`px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                    mediaSubTab === 'chibi'
                      ? 'bg-gradient-to-r from-[#FF1E6A] to-[#A838FF] text-white shadow-sm'
                      : 'bg-pink-50 text-[#6E5560]'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>12 Ảnh Chibi Độc Quyền TriKun</span>
                </button>
                <button
                  onClick={() => setMediaSubTab('music')}
                  className={`px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                    mediaSubTab === 'music'
                      ? 'bg-gradient-to-r from-[#FF1E6A] to-[#A838FF] text-white shadow-sm'
                      : 'bg-pink-50 text-[#6E5560]'
                  }`}
                >
                  <Music className="w-3.5 h-3.5" />
                  <span>Kho Nhạc Nền ({ROMANTIC_PLAYLIST.length} bài)</span>
                </button>
              </div>

              {mediaSubTab === 'chibi' ? (
                <div className="bg-white/95 rounded-3xl border border-pink-200/80 p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {CHIBI_GALLERY.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl overflow-hidden border border-pink-200 bg-[#FDF9FC] group hover:border-[#FF1E6A] transition-all"
                    >
                      <div className="aspect-square overflow-hidden">
                        <img
                          src={item.url}
                          alt={item.label}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="p-2.5 flex items-center justify-between text-xs">
                        <span className="font-extrabold text-[#29104E]">{item.label}</span>
                        <span className="text-[10px] font-black text-[#FF1E6A] bg-pink-50 px-2 py-0.5 rounded-full">
                          3D VIP
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white/95 rounded-3xl border border-pink-200/80 p-5 grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {ROMANTIC_PLAYLIST.map((track) => {
                    const isCurrent = playingAudio === track.url;
                    return (
                      <div
                        key={track.id}
                        className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs transition-all ${
                          isCurrent
                            ? 'bg-pink-50 border-[#FF1E6A]'
                            : 'bg-[#FDF9FC] border-pink-100 hover:border-pink-300'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <button
                            onClick={() => togglePlayAudio(track.url)}
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 cursor-pointer ${
                              isCurrent
                                ? 'bg-gradient-to-r from-[#FF1E6A] to-[#A838FF] text-white'
                                : 'bg-white border border-pink-200 text-[#FF1E6A]'
                            }`}
                          >
                            {isCurrent ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                          </button>
                          <div className="truncate">
                            <p className="font-extrabold text-sm text-[#29104E] truncate">{track.title}</p>
                            <p className="text-[11px] text-[#6E5560]">
                              {track.artist} • {track.duration}
                            </p>
                          </div>
                        </div>
                        <span className="font-mono text-[10px] text-purple-600 bg-purple-50 px-2.5 py-1 rounded-lg shrink-0">
                          {track.url}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* 7. SETTINGS (ACB VIETQR & ZALO)                           */}
          {/* ========================================================= */}
          {currentMenu === 'settings' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-7 bg-white/95 rounded-3xl border border-pink-200/80 p-6 shadow-xs space-y-5">
                <div className="border-b border-pink-100 pb-3">
                  <h3 className="text-base font-black text-[#29104E]">Cấu Hình Nhận Thanh Toán VietQR & Zalo</h3>
                  <p className="text-xs text-[#6E5560]">Đồng bộ trực tiếp với toàn bộ popup VietQR trên Studio.</p>
                </div>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setSettingsError('');
                    try {
                      const response = await fetch('/api/settings', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(settings)
                      });
                      const result = await response.json();
                      if (!response.ok || !result.success) throw new Error(result.message || 'Không thể lưu');
                      setSettings(result.data);
                      setSavedSettings(true);
                      showToast('Đã lưu cấu hình ACB & Zalo!');
                      setTimeout(() => setSavedSettings(false), 2000);
                    } catch (error) {
                      setSettingsError(error instanceof Error ? error.message : 'Lỗi lưu cấu hình');
                    }
                  }}
                  className="space-y-4 text-xs"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-extrabold text-[#29104E] mb-1.5">Ngân Hàng</label>
                      <input
                        type="text"
                        value={settings.bankName}
                        onChange={(e) => setSettings({ ...settings, bankName: e.target.value })}
                        className="w-full p-3 rounded-xl border border-pink-200 bg-pink-50/30 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-extrabold text-[#29104E] mb-1.5">Số Tài Khoản</label>
                      <input
                        type="text"
                        value={settings.accountNumber}
                        onChange={(e) => setSettings({ ...settings, accountNumber: e.target.value })}
                        className="w-full p-3 rounded-xl border border-pink-200 font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-extrabold text-[#29104E] mb-1.5">Chủ Tài Khoản</label>
                      <input
                        type="text"
                        value={settings.accountHolder}
                        onChange={(e) => setSettings({ ...settings, accountHolder: e.target.value })}
                        className="w-full p-3 rounded-xl border border-pink-200 font-bold uppercase"
                      />
                    </div>
                    <div>
                      <label className="block font-extrabold text-[#29104E] mb-1.5">Hotline / Zalo Hỗ Trợ</label>
                      <input
                        type="text"
                        value={settings.zaloPhone}
                        onChange={(e) => setSettings({ ...settings, zaloPhone: e.target.value })}
                        className="w-full p-3 rounded-xl border border-pink-200 font-mono font-bold"
                      />
                    </div>
                  </div>

                  {settingsError && <p className="text-red-600 font-bold">{settingsError}</p>}

                  <button
                    type="submit"
                    className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#FF1E6A] to-[#A838FF] text-white font-black text-xs shadow-md flex items-center gap-2 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>{savedSettings ? 'Đã Lưu Thành Công!' : 'Lưu Cấu Hình Hệ Thống'}</span>
                  </button>
                </form>
              </div>

              {/* Visual Bank Card Preview */}
              <div className="lg:col-span-5 bg-gradient-to-br from-[#1E0B30] via-[#31104F] to-[#1A092B] text-white rounded-3xl p-6 shadow-xl border border-pink-400/30 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-white/10 text-pink-300 text-[10px] font-black uppercase">
                    VietQR Napas 247
                  </span>
                  <CreditCard className="w-5 h-5 text-pink-400" />
                </div>
                <div className="py-2">
                  <p className="text-xs text-pink-200/70">{settings.bankName}</p>
                  <p className="text-2xl font-mono font-black tracking-wider mt-1">{settings.accountNumber}</p>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-white/10 text-xs">
                  <div>
                    <span className="text-[10px] text-pink-200/60 block">CHỦ TÀI KHOẢN</span>
                    <span className="font-black">{settings.accountHolder}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-pink-200/60 block">ZALO HỖ TRỢ</span>
                    <span className="font-black text-pink-300">{settings.zaloPhone}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ========================================================= */}
      {/* MODALS                                                    */}
      {/* ========================================================= */}

      {/* MODAL: LIVE 3D TEMPLATE PREVIEW */}
      {previewModalTemplate && (
        <div
          className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setPreviewModalTemplate(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-4xl w-full p-5 shadow-2xl border-2 border-pink-300 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-base text-[#29104E]">{previewModalTemplate.name}</h3>
                <p className="text-xs text-purple-600 font-mono">
                  {getLocalTemplateEnginePath(previewModalTemplate.slug)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/studio/${previewModalTemplate.slug}`}
                  target="_blank"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF1E6A] to-[#A838FF] text-white text-xs font-black"
                >
                  Mở trong Studio ↗
                </Link>
                <button
                  onClick={() => setPreviewModalTemplate(null)}
                  className="p-2 rounded-full bg-pink-50 text-[#29104E] hover:bg-pink-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="aspect-[16/10] w-full rounded-2xl overflow-hidden bg-black border border-pink-200">
              <iframe
                src={`${getLocalTemplateEnginePath(previewModalTemplate.slug)}?preview=1`}
                className="w-full h-full border-0 block"
                allow="autoplay; encrypted-media; fullscreen"
                title={previewModalTemplate.name}
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD ORDER */}
      {showAddOrderModal && (
        <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-pink-100 pb-3">
              <h3 className="font-black text-sm text-[#29104E]">Thêm Đơn Hàng Mới</h3>
              <button onClick={() => setShowAddOrderModal(false)} className="text-zinc-400 hover:text-black cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateOrder} className="space-y-3">
              <div>
                <label className="block font-bold mb-1">Tên Khách Hàng</label>
                <input
                  type="text"
                  required
                  value={newOrderForm.customerName}
                  onChange={(e) => setNewOrderForm({ ...newOrderForm, customerName: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-pink-200"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Số Điện Thoại / Zalo</label>
                <input
                  type="text"
                  value={newOrderForm.customerPhone}
                  onChange={(e) => setNewOrderForm({ ...newOrderForm, customerPhone: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-pink-200"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Mẫu Quà</label>
                <input
                  type="text"
                  value={newOrderForm.templateName}
                  onChange={(e) => setNewOrderForm({ ...newOrderForm, templateName: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-pink-200"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Số Tiền (VNĐ)</label>
                <input
                  type="number"
                  value={newOrderForm.amount}
                  onChange={(e) => setNewOrderForm({ ...newOrderForm, amount: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-xl border border-pink-200"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddOrderModal(false)}
                  className="px-4 py-2 rounded-xl border border-pink-200 font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#FF1E6A] to-[#A838FF] text-white font-black cursor-pointer"
                >
                  Lưu Đơn Hàng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: GIFT DETAIL */}
      {selectedGiftDetail && (
        <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-pink-100 pb-3">
              <div>
                <h3 className="font-black text-sm text-[#29104E]">Chi Tiết Quà Tặng</h3>
                <span className="font-mono text-[#A838FF] font-bold">{selectedGiftDetail.giftId}</span>
              </div>
              <button onClick={() => setSelectedGiftDetail(null)} className="text-zinc-400 hover:text-black cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 bg-pink-50/40 p-4 rounded-2xl border border-pink-100">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-zinc-500">Người nhận:</span>
                  <p className="font-black text-sm text-[#29104E]">{selectedGiftDetail.recipientName}</p>
                </div>
                <div>
                  <span className="text-zinc-500">Người gửi:</span>
                  <p className="font-black text-sm text-[#29104E]">{selectedGiftDetail.senderName}</p>
                </div>
              </div>
              {selectedGiftDetail.letterContent && (
                <div>
                  <span className="text-zinc-500">Nội dung thư:</span>
                  <p className="p-3 bg-white rounded-xl border border-pink-100 mt-1 whitespace-pre-wrap">
                    {selectedGiftDetail.letterContent}
                  </p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <a
                href={`/v/${selectedGiftDetail.templateSlug}?id=${selectedGiftDetail.giftId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF1E6A] to-[#A838FF] text-white font-black"
              >
                Mở Xem 3D ↗
              </a>
              <button
                onClick={() => setSelectedGiftDetail(null)}
                className="px-4 py-2 rounded-xl border border-pink-200 font-bold cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ORDER DETAIL */}
      {selectedOrderDetail && (
        <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-pink-100 pb-3">
              <div>
                <h3 className="font-black text-sm text-[#29104E]">Chi Tiết Đơn Hàng</h3>
                <span className="font-mono text-[#FF1E6A] font-bold">{selectedOrderDetail.orderId}</span>
              </div>
              <button onClick={() => setSelectedOrderDetail(null)} className="text-zinc-400 hover:text-black cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2.5 bg-pink-50/40 p-4 rounded-2xl border border-pink-100">
              <div className="flex justify-between">
                <span className="text-zinc-500">Khách hàng:</span>
                <span className="font-bold">{selectedOrderDetail.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">SĐT / Zalo:</span>
                <span className="font-mono font-bold text-[#0068FF]">{selectedOrderDetail.customerPhone || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Mẫu quà:</span>
                <span className="font-bold">{selectedOrderDetail.templateName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Số tiền:</span>
                <span className="font-black text-sm text-[#FF1E6A]">
                  {selectedOrderDetail.amount.toLocaleString('vi-VN')}đ
                </span>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setSelectedOrderDetail(null)}
                className="px-4 py-2 rounded-xl border border-pink-200 font-bold cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE USER */}
      {showCreateUserModal && (
        <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-pink-100 pb-3">
              <h3 className="font-black text-sm text-[#29104E]">Tạo Tài Khoản Mới</h3>
              <button onClick={() => setShowCreateUserModal(false)} className="text-zinc-400 hover:text-black cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateUserSubmit} className="space-y-3">
              <div>
                <label className="block font-bold mb-1">Họ và Tên</label>
                <input
                  type="text"
                  required
                  value={newUserForm.fullName}
                  onChange={(e) => setNewUserForm({ ...newUserForm, fullName: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-pink-200"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-pink-200"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Số Điện Thoại</label>
                <input
                  type="text"
                  value={newUserForm.phone}
                  onChange={(e) => setNewUserForm({ ...newUserForm, phone: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-pink-200"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Mật Khẩu</label>
                <input
                  type="text"
                  required
                  minLength={6}
                  value={newUserForm.password}
                  onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-pink-200"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Vai Trò</label>
                <select
                  value={newUserForm.role}
                  onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value as 'user' | 'vip' | 'admin' })}
                  className="w-full p-2.5 rounded-xl border border-pink-200 font-bold"
                >
                  <option value="user">User</option>
                  <option value="vip">VIP</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateUserModal(false)}
                  className="px-4 py-2 rounded-xl border border-pink-200 font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#FF1E6A] to-[#A838FF] text-white font-black cursor-pointer"
                >
                  Tạo Tài Khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT USER */}
      {editingUser && (
        <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-pink-100 pb-3">
              <div>
                <h3 className="font-black text-sm text-[#29104E]">Sửa Tài Khoản</h3>
                <span className="font-mono text-[#FF1E6A] font-bold">{editingUser.email}</span>
              </div>
              <button onClick={() => setEditingUser(null)} className="text-zinc-400 hover:text-black cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block font-bold mb-1">Họ và Tên</label>
                <input
                  type="text"
                  value={editingUser.fullName}
                  onChange={(e) => setEditingUser({ ...editingUser, fullName: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-pink-200"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Số Điện Thoại</label>
                <input
                  type="text"
                  value={editingUser.phone}
                  onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-pink-200"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Đặt Mật Khẩu Mới (để trống nếu giữ nguyên)</label>
                <input
                  type="text"
                  value={editUserPassword}
                  onChange={(e) => setEditUserPassword(e.target.value)}
                  placeholder="Nhập mật khẩu mới..."
                  className="w-full p-2.5 rounded-xl border border-pink-200"
                />
              </div>
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 rounded-xl border border-pink-200 font-bold cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() =>
                  handleQuickUpdateUser(editingUser.userId, {
                    fullName: editingUser.fullName,
                    phone: editingUser.phone,
                    ...(editUserPassword.trim() ? { newPassword: editUserPassword.trim() } : {})
                  })
                }
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#FF1E6A] to-[#A838FF] text-white font-black cursor-pointer"
              >
                Lưu Thay Đổi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

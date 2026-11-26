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
  SlidersHorizontal,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  HelpCircle,
  Clock,
  CheckCircle,
  Hash,
  Calendar,
  MessageCircle,
  Mail,
  UserPlus,
  FolderOpen,
  Volume2
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
  musicUrl?: string;
  particleColor?: string;
  passcode?: string;
  passcodeEnabled?: boolean;
  passcodeHint?: string;
  keypadPin?: string;
  keypadPinEnabled?: boolean;
  keypadPinHint?: string;
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
  const [globalSearch, setGlobalSearch] = useState('');

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
  const [orderFilter, setOrderFilter] = useState<'all' | 'completed' | 'pending' | 'cancelled'>('all');
  const [giftSearch, setGiftSearch] = useState('');
  const [giftVipFilter, setGiftVipFilter] = useState<'all' | 'vip' | 'regular'>('all');

  // Audio Player
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Action Modals
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showAddOrderModal, setShowAddOrderModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<IOrder | null>(null);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<IOrder | null>(null);

  const [selectedGiftDetail, setSelectedGiftDetail] = useState<IGiftDoc | null>(null);
  const [editingGift, setEditingGift] = useState<IGiftDoc | null>(null);
  const [showCreateGiftModal, setShowCreateGiftModal] = useState(false);

  const [newOrderForm, setNewOrderForm] = useState({
    customerName: '',
    customerPhone: '',
    templateName: 'Vũ Trụ Trái Tim 3D WebGL',
    amount: 49000,
    status: 'completed',
    note: ''
  });

  const [newGiftForm, setNewGiftForm] = useState({
    templateSlug: 'trikun-heart',
    templateName: 'Vũ Trụ Trái Tim 3D WebGL',
    recipientName: 'Người Thương ♡',
    senderName: 'Trí Kun ♡',
    letterTitle: 'Gửi Người Làm Thế Giới Của Anh Dịu Lại ♡',
    letterContent:
      'Cảm ơn em vì đã luôn ở bên, mang đến thật nhiều nụ cười và những khoảnh khắc ngọt ngào nhất. Yêu em thật nhiều ♡',
    isVip: false,
    keypadPin: '1402',
    passcode: ''
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
    setTimeout(() => setToastMessage(null), 3200);
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

  // ==========================================
  // ORDERS CRUD PRO
  // ==========================================
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
        showToast(`Đơn ${orderId}: ${status === 'completed' ? 'Đã duyệt thanh toán thành công' : 'Đổi trạng thái: ' + status}`);
        void loadDatabaseData();
      } else {
        showToast(data.message || 'Không thể đổi trạng thái đơn');
      }
    } catch {
      showToast('Lỗi cập nhật trạng thái đơn');
    }
  };

  const handleSaveEditOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: editingOrder.orderId,
          customerName: editingOrder.customerName,
          customerPhone: editingOrder.customerPhone,
          amount: Number(editingOrder.amount),
          status: editingOrder.status,
          note: editingOrder.note,
          templateName: editingOrder.templateName
        })
      });
      const data = await res.json();
      if (data.success) {
        setOrders((prev) => prev.map((o) => (o.orderId === editingOrder.orderId ? { ...o, ...editingOrder } : o)));
        setEditingOrder(null);
        showToast('Đã lưu thay đổi đơn hàng thành công!');
        void loadDatabaseData();
      } else {
        showToast(data.message || 'Lỗi lưu đơn hàng');
      }
    } catch {
      showToast('Lỗi kết nối khi cập nhật đơn');
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm(`Xác nhận xóa vĩnh viễn đơn hàng ${orderId}?`)) return;
    try {
      const res = await fetch(`/api/orders?id=${orderId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setOrders((prev) => prev.filter((o) => o.orderId !== orderId));
        showToast(`Đã xóa đơn hàng ${orderId}`);
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
          status: 'completed',
          note: ''
        });
        showToast('Đã tạo đơn hàng mới thành công!');
        void loadDatabaseData();
      }
    } catch {
      showToast('Lỗi tạo đơn hàng');
    }
  };

  const exportOrdersCSV = () => {
    if (orders.length === 0) {
      showToast('Chưa có đơn hàng để xuất CSV');
      return;
    }
    const headers = ['Mã Đơn', 'Mẫu Quà', 'Khách Hàng', 'SĐT', 'Số Tiền (VNĐ)', 'Trạng Thái', 'Thời Gian'];
    const rows = orders.map((o) => [
      o.orderId,
      `"${(o.templateName || '').replace(/"/g, '""')}"`,
      `"${(o.customerName || '').replace(/"/g, '""')}"`,
      `"${o.customerPhone || ''}"`,
      o.amount,
      o.status === 'completed' ? 'Đã Thanh Toán' : o.status === 'cancelled' ? 'Đã Hủy' : 'Chờ Duyệt',
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
    showToast('Đã tải xuống file CSV báo cáo tài chính!');
  };

  // ==========================================
  // GIFTS CRUD PRO
  // ==========================================
  const handleDeleteGift = async (giftId: string) => {
    if (!confirm(`Xác nhận xóa quà tặng ${giftId} khỏi hệ thống?`)) return;
    try {
      const res = await fetch(`/api/gifts?id=${giftId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setGifts((prev) => prev.filter((g) => g.giftId !== giftId));
        setTotalGiftsCount((c) => Math.max(0, c - 1));
        showToast(`Đã xóa quà ${giftId}`);
      } else {
        showToast(data.message || 'Lỗi xóa quà');
      }
    } catch {
      showToast('Lỗi xóa quà');
    }
  };

  const handleCloneGift = async (giftId: string) => {
    try {
      const res = await fetch('/api/gifts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ giftId, action: 'clone' })
      });
      const data = await res.json();
      if (data.success && data.data) {
        setGifts((prev) => [data.data, ...prev]);
        setTotalGiftsCount((c) => c + 1);
        showToast(`Đã nhân bản quà thành công: ${data.data.giftId}!`);
      } else {
        showToast(data.message || 'Không thể nhân bản quà');
      }
    } catch {
      showToast('Lỗi nhân bản quà');
    }
  };

  const handleSaveEditGift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGift) return;
    try {
      const res = await fetch('/api/gifts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingGift)
      });
      const data = await res.json();
      if (data.success) {
        setGifts((prev) => prev.map((g) => (g.giftId === editingGift.giftId ? { ...g, ...editingGift } : g)));
        setEditingGift(null);
        showToast('Đã lưu cập nhật quà tặng!');
      } else {
        showToast(data.message || 'Lỗi cập nhật quà');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ');
    }
  };

  const handleCreateGiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const tpl = AVAILABLE_TEMPLATES.find((t) => t.slug === newGiftForm.templateSlug);
      const res = await fetch('/api/gifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newGiftForm,
          templateName: tpl?.name || newGiftForm.templateName,
          images: [],
          musicUrl: '/demo/music/romantic.mp3',
          musicTitle: 'Giai Điệu Tình Yêu'
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Tạo quà thành công: ${data.giftId}!`);
        setShowCreateGiftModal(false);
        void loadDatabaseData();
      } else {
        showToast(data.message || 'Không thể tạo quà');
      }
    } catch {
      showToast('Lỗi khi tạo quà');
    }
  };

  const exportGiftsCSV = () => {
    if (gifts.length === 0) {
      showToast('Chưa có quà tặng để xuất CSV');
      return;
    }
    const headers = ['Mã Quà', 'Mẫu Web', 'Người Nhận', 'Người Gửi', 'Lượt Xem', 'VIP', 'Mã PIN', 'Ngày Tạo'];
    const rows = gifts.map((g) => [
      g.giftId,
      `"${(g.templateName || '').replace(/"/g, '""')}"`,
      `"${(g.recipientName || '').replace(/"/g, '""')}"`,
      `"${(g.senderName || '').replace(/"/g, '""')}"`,
      g.viewsCount || 0,
      g.isVip ? 'VIP' : 'Thường',
      g.keypadPin || '',
      new Date(g.createdAt).toLocaleString('vi-VN')
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `trikun_gifts_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Đã xuất file CSV quà tặng!');
  };

  const handleCopyLink = (url: string, id: string) => {
    const full = typeof window !== 'undefined' ? `${window.location.origin}${url}` : url;
    navigator.clipboard.writeText(full);
    setCopiedId(id);
    showToast('Đã sao chép đường link!');
    setTimeout(() => setCopiedId(null), 2000);
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

  // ==========================================
  // USERS & CRM CRUD PRO
  // ==========================================
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
    if (!confirm(`Xác nhận xóa tài khoản "${user.fullName}" (${user.email})?`)) return;
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

  // ==========================================
  // SETTINGS SAVE
  // ==========================================
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSettings(false);
    setSettingsError('');
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSavedSettings(true);
        showToast('Đã lưu cấu hình ngân hàng & Zalo thành công!');
        setTimeout(() => setSavedSettings(false), 3000);
      } else {
        setSettingsError(data.message || 'Không thể lưu cài đặt');
      }
    } catch {
      setSettingsError('Lỗi kết nối khi lưu cài đặt');
    }
  };

  // ==========================================
  // COMPUTED INTELLIGENCE & CHARTS
  // ==========================================
  const pendingOrdersCount = useMemo(() => orders.filter((o) => o.status === 'pending').length, [orders]);
  const completedOrdersCount = useMemo(() => orders.filter((o) => o.status === 'completed').length, [orders]);
  const cancelledOrdersCount = useMemo(() => orders.filter((o) => o.status === 'cancelled').length, [orders]);
  const totalViewsCount = useMemo(() => gifts.reduce((acc, g) => acc + (g.viewsCount || 0), 0), [gifts]);
  const vipGiftsCount = useMemo(() => gifts.filter((g) => g.isVip).length, [gifts]);

  const conversionRate = useMemo(() => {
    if (!orders.length) return '0%';
    return `${Math.round((completedOrdersCount / orders.length) * 100)}%`;
  }, [orders, completedOrdersCount]);

  const avgOrderValue = useMemo(() => {
    if (!completedOrdersCount) return 0;
    return Math.round(totalRevenue / completedOrdersCount);
  }, [totalRevenue, completedOrdersCount]);

  // 7-day revenue trend data
  const last7DaysData = useMemo(() => {
    const days: { dateStr: string; label: string; amount: number; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayLabel = `${d.getDate()}/${d.getMonth() + 1}`;
      days.push({ dateStr, label: dayLabel, amount: 0, count: 0 });
    }

    orders.forEach((o) => {
      const oDate = o.createdAt?.slice(0, 10);
      const target = days.find((d) => d.dateStr === oDate);
      if (target) {
        target.count += 1;
        if (o.status === 'completed') target.amount += o.amount;
      }
    });

    return days;
  }, [orders]);

  const maxRevenueIn7Days = useMemo(() => {
    return Math.max(...last7DaysData.map((d) => d.amount), 50000);
  }, [last7DaysData]);

  const chartPoints = useMemo(() => {
    const width = 500;
    const height = 140;
    const padding = 24;
    const usableW = width - padding * 2;
    const usableH = height - padding * 2;

    const points = last7DaysData.map((d, idx) => {
      const x = padding + (idx / (last7DaysData.length - 1)) * usableW;
      const y = height - padding - (d.amount / maxRevenueIn7Days) * usableH;
      return { x, y, ...d };
    });

    const pathD = points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');
    const areaD = `${pathD} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

    return { pathD, areaD, points, width, height };
  }, [last7DaysData, maxRevenueIn7Days]);

  const topTemplates = useMemo(() => {
    const counts = new Map<string, { slug: string; name: string; count: number; views: number }>();
    gifts.forEach((g) => {
      const prev = counts.get(g.templateSlug);
      if (prev) {
        prev.count += 1;
        prev.views += g.viewsCount || 0;
      } else {
        counts.set(g.templateSlug, {
          slug: g.templateSlug,
          name: g.templateName || g.templateSlug,
          count: 1,
          views: g.viewsCount || 0
        });
      }
    });
    return Array.from(counts.values()).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [gifts]);

  // Global search & filtered lists
  const filteredOrders = useMemo(() => {
    const q = (orderSearch || globalSearch).trim().toLowerCase();
    return orders.filter((o) => {
      if (orderFilter !== 'all' && o.status !== orderFilter) return false;
      if (!q) return true;
      return (
        o.orderId.toLowerCase().includes(q) ||
        (o.customerName || '').toLowerCase().includes(q) ||
        (o.customerPhone || '').toLowerCase().includes(q) ||
        (o.templateName || '').toLowerCase().includes(q)
      );
    });
  }, [orders, orderSearch, globalSearch, orderFilter]);

  const filteredGifts = useMemo(() => {
    const q = (giftSearch || globalSearch).trim().toLowerCase();
    return gifts.filter((g) => {
      if (giftVipFilter === 'vip' && !g.isVip) return false;
      if (giftVipFilter === 'regular' && g.isVip) return false;
      if (!q) return true;
      return (
        g.giftId.toLowerCase().includes(q) ||
        g.recipientName.toLowerCase().includes(q) ||
        g.senderName.toLowerCase().includes(q) ||
        g.templateName.toLowerCase().includes(q)
      );
    });
  }, [gifts, giftSearch, globalSearch, giftVipFilter]);

  const filteredAdminUsers = useMemo(() => {
    const q = (userSearch || globalSearch).trim().toLowerCase();
    return usersList.filter((u) => {
      if (userRoleFilter !== 'all' && u.role !== userRoleFilter) return false;
      if (userStatusFilter !== 'all' && u.status !== userStatusFilter) return false;
      if (!q) return true;
      return `${u.fullName} ${u.email} ${u.phone} ${u.userId}`.toLowerCase().includes(q);
    });
  }, [usersList, userSearch, globalSearch, userRoleFilter, userStatusFilter]);

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
    return Array.from(map.values()).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [orders]);

  const filteredTemplates = useMemo(() => {
    const q = (templateSearch || globalSearch).trim().toLowerCase();
    return templatesList.filter((t) => {
      const matchCat = selectedCategory === 'Tất cả' || t.category.toLowerCase().includes(selectedCategory.toLowerCase());
      const matchSearch = !q || `${t.name} ${t.slug} ${t.category}`.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [templatesList, selectedCategory, templateSearch, globalSearch]);

  const TEMPLATES_PER_PAGE = 12;
  const totalTemplatePages = Math.max(1, Math.ceil(filteredTemplates.length / TEMPLATES_PER_PAGE));
  const safeTemplatePage = Math.min(templatePage, totalTemplatePages);
  const pagedTemplates = filteredTemplates.slice(
    (safeTemplatePage - 1) * TEMPLATES_PER_PAGE,
    safeTemplatePage * TEMPLATES_PER_PAGE
  );

  // =========================================================================
  // 1. LOADING & SECURITY GATE
  // =========================================================================
  if (checkingSession) {
    return (
      <div className="min-h-screen bg-[#0F081D] text-white flex flex-col items-center justify-center p-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-500 via-rose-500 to-purple-600 flex items-center justify-center animate-spin shadow-2xl shadow-pink-500/50">
          <RefreshCw className="w-7 h-7 text-white" />
        </div>
        <h3 className="mt-5 text-sm font-black text-pink-200">Đang khởi tạo TriKun Command Center Pro...</h3>
        <p className="mt-1 text-xs text-pink-300/60 font-semibold">Bảo mật đa lớp • 48 Engine 3D Local</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0B0614] text-white flex flex-col justify-center items-center px-4 relative overflow-hidden select-none font-sans">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[#FF1E6A]/25 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-[#A838FF]/25 rounded-full blur-[150px]" />

        <div className="max-w-md w-full relative z-10">
          <div className="bg-[#160D24]/90 backdrop-blur-2xl border border-pink-400/30 rounded-3xl p-8 shadow-[0_25px_70px_rgba(255,30,106,0.35)] text-center space-y-6">
            <div className="inline-flex p-4 rounded-3xl bg-gradient-to-tr from-pink-500/25 to-purple-600/25 border border-pink-300/40 text-pink-400 shadow-xl">
              <ShieldCheck className="w-12 h-12" />
            </div>

            <div>
              <span className="px-3.5 py-1 rounded-full bg-pink-500/20 border border-pink-400/40 text-pink-300 text-[11px] font-black uppercase tracking-widest">
                TriKun Security Gate
              </span>
              <h1 className="text-2xl font-black text-white tracking-tight mt-2.5">Đăng Nhập Quản Trị Viên</h1>
              <p className="text-xs text-pink-200/80 mt-1.5 font-medium">
                Vui lòng nhập mật khẩu Admin (mặc định: <code className="text-pink-300 font-extrabold px-1.5 py-0.5 rounded bg-white/10">TriKun@2026</code>)
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4 text-left">
              <div className="relative">
                <input
                  type="password"
                  autoFocus
                  placeholder="Nhập mật khẩu quản trị..."
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  className="w-full bg-[#0D0716] border border-pink-300/30 rounded-2xl px-4 py-3.5 pl-11 text-sm text-white placeholder-pink-200/30 focus:outline-none focus:border-[#FF1E6A] focus:ring-2 focus:ring-[#FF1E6A]/40 transition-all font-mono font-bold"
                />
                <KeyRound className="w-4 h-4 text-pink-300/60 absolute left-4 top-1/2 -translate-y-1/2" />
              </div>

              {pinError && (
                <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs font-bold flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{pinError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isVerifying || !pinInput.trim()}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#FF1E6A] via-[#FF3D8B] to-[#A838FF] text-white font-black text-sm shadow-xl shadow-[#FF1E6A]/30 hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang kiểm tra an ninh...</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4" />
                    <span>Mở Bảng Điều Khiển Pro</span>
                  </>
                )}
              </button>
            </form>

            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-pink-200/60 font-semibold">
              <Link href="/" className="hover:text-white transition-colors">
                ← Về Trang Chủ
              </Link>
              <span className="flex items-center gap-1 text-emerald-400">
                <Server className="w-3.5 h-3.5" />
                MongoDB Atlas Online
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. LUXURY HIGH-CONTRAST ADMIN WORKSPACE
  // =========================================================================
  const MENU_ITEMS = [
    { id: 'dashboard', label: 'Tổng Quan', icon: LayoutDashboard, color: 'text-pink-400', badgeColor: 'bg-pink-500/20 text-pink-300', count: null },
    { id: 'orders', label: 'Đơn Hàng', icon: ShoppingBag, color: 'text-emerald-400', badgeColor: 'bg-emerald-500/20 text-emerald-300', count: orders.length },
    { id: 'gifts', label: 'Quà Tặng 3D', icon: Gift, color: 'text-purple-400', badgeColor: 'bg-purple-500/20 text-purple-300', count: gifts.length },
    { id: 'templates', label: 'Kho 122 Mẫu', icon: Palette, color: 'text-amber-400', badgeColor: 'bg-amber-500/20 text-amber-300', count: templatesList.length },
    { id: 'customers', label: 'Tài Khoản & CRM', icon: Users, color: 'text-blue-400', badgeColor: 'bg-blue-500/20 text-blue-300', count: usersList.length },
    { id: 'media', label: 'Chibi & Nhạc', icon: Sparkles, color: 'text-fuchsia-400', badgeColor: 'bg-fuchsia-500/20 text-fuchsia-300', count: 19 },
    { id: 'settings', label: 'Cấu Hình ACB', icon: Settings, color: 'text-cyan-400', badgeColor: 'bg-cyan-500/20 text-cyan-300', count: null }
  ] as const;

  return (
    <div className="min-h-screen bg-[#F8F9FD] text-zinc-900 flex antialiased font-sans">
      {/* TOAST MESSAGE */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-[80] bg-[#1A0E2B] text-white px-5 py-3.5 rounded-2xl shadow-2xl border-2 border-pink-400/50 flex items-center gap-3 text-xs font-black animate-in fade-in slide-in-from-bottom-3">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-pink-500 to-rose-500 flex items-center justify-center shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* MOBILE BACKDROP */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR NAVIGATION */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#11081F] text-white flex flex-col border-r border-white/10 transition-transform duration-300 shadow-2xl lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#FF1E6A] via-[#FF3D8B] to-[#A838FF] flex items-center justify-center shadow-lg shadow-pink-500/40 shrink-0">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div className="truncate">
              <div className="font-black text-sm tracking-tight text-white flex items-center gap-1.5">
                <span>TriKun Admin</span>
                <span className="px-1.5 py-0.5 rounded-md bg-gradient-to-r from-[#FF1E6A] to-[#A838FF] text-[9px] font-black uppercase tracking-wider">
                  PRO V3.8
                </span>
              </div>
              <p className="text-[10px] text-pink-200/70 font-bold truncate">48 Engine • 122 Mẫu 3D</p>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-zinc-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cloud Status Indicator */}
        <div className="px-3.5 py-2.5 mx-3.5 my-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400" />
            <span className="text-[11px] font-extrabold text-pink-100">MongoDB Cloud</span>
          </div>
          <button
            onClick={() => void loadDatabaseData()}
            className="font-mono text-[10px] text-emerald-300 font-black bg-emerald-500/20 hover:bg-emerald-500/30 px-2.5 py-1 rounded-full flex items-center gap-1 transition-all cursor-pointer border border-emerald-400/30"
            title="Bấm để kiểm tra lại tốc độ kết nối"
          >
            <RefreshCw className={`w-2.5 h-2.5 ${loadingData ? 'animate-spin' : ''}`} />
            <span>{dbPing}</span>
          </button>
        </div>

        {/* Navigation Menu List */}
        <nav className="flex-1 px-3 space-y-1.5 overflow-y-auto">
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
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-[#FF1E6A] via-[#FF3D8B] to-[#A838FF] text-white shadow-lg shadow-pink-500/35 scale-[1.02]'
                    : 'text-zinc-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : item.color}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.count !== null && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                      isActive ? 'bg-white/30 text-white' : item.badgeColor
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer Actions */}
        <div className="p-3.5 border-t border-white/10 space-y-2">
          <Link
            href="/"
            target="_blank"
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-pink-200 hover:text-white text-xs font-bold transition-all border border-white/5"
          >
            <ExternalLink className="w-3.5 h-3.5 text-pink-400" />
            <span>Xem Trang Người Dùng ↗</span>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-rose-200 text-xs font-black transition-all border border-rose-500/30 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Đăng Xuất Admin</span>
          </button>
        </div>
      </aside>

      {/* MAIN VIEWPORT */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* TOP STATUS BAR */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-zinc-200 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-pink-50 text-[#FF1E6A] border border-pink-200"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#FF1E6A]" />
                <h1 className="text-base sm:text-lg font-black text-zinc-900 truncate tracking-tight">
                  {currentMenu === 'dashboard' && 'Tổng Quan Hệ Thống & Trí Tuệ Phân Tích'}
                  {currentMenu === 'orders' && 'Quản Lý Đơn Hàng & VietQR (CRUD Đầy Đủ)'}
                  {currentMenu === 'gifts' && 'Quản Lý Quà Tặng 3D (Cloud Atlas CRUD)'}
                  {currentMenu === 'templates' && 'Kho 122 Mẫu Web & 48 Engine Local'}
                  {currentMenu === 'customers' && 'Quản Lý Tài Khoản User & Bảng Xếp Hạng CRM'}
                  {currentMenu === 'media' && 'Kho 12 Ảnh Chibi TriKun & Bộ Nhạc Nền 3D'}
                  {currentMenu === 'settings' && 'Cấu Hình Thanh Toán ACB & Hotline Zalo'}
                </h1>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Global Search Bar */}
            <div className="relative hidden md:block w-72">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm đơn, quà, user, mẫu..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className="w-full text-xs py-2 pl-9 pr-7 rounded-xl border border-zinc-200 bg-zinc-50 font-bold text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-[#FF1E6A] focus:bg-white transition-all"
              />
              {globalSearch && (
                <button
                  onClick={() => setGlobalSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-black font-bold text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Sync Live Button */}
            <button
              onClick={() => void loadDatabaseData()}
              disabled={loadingData}
              className="px-3 py-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-800 font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
              title="Đồng bộ dữ liệu mới nhất từ MongoDB"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#FF1E6A] ${loadingData ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Làm Mới</span>
            </button>

            {/* Super Admin Badge */}
            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-zinc-200">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#FF1E6A] to-[#A838FF] text-white flex items-center justify-center font-black text-xs shadow-md">
                TK
              </div>
              <div className="text-left text-xs leading-tight hidden xl:block">
                <span className="font-black text-zinc-900 block">Lê Minh Trí</span>
                <span className="text-[10px] text-pink-600 font-extrabold">Super Admin</span>
              </div>
            </div>
          </div>
        </header>

        {/* MAIN BODY CONTENT */}
        <main className="p-4 sm:p-6 lg:p-8 flex-1 space-y-6">
          {/* ========================================================= */}
          {/* TAB 1: DASHBOARD & INTELLIGENCE                           */}
          {/* ========================================================= */}
          {currentMenu === 'dashboard' && (
            <div className="space-y-6">
              {/* 3 AI Actionable Advice Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Pending Orders Alert */}
                <div className="p-4 rounded-3xl bg-gradient-to-br from-rose-50 to-amber-50 border-2 border-rose-200 shadow-sm flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-rose-500/30">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-black text-[10px] uppercase tracking-wider">
                      Cảnh Báo Đơn Chờ Duyệt
                    </span>
                    <p className="text-xs font-black text-zinc-900 mt-1.5 leading-snug">
                      {pendingOrdersCount > 0
                        ? `Có ${pendingOrdersCount} đơn hàng đang chờ duyệt thanh toán VietQR!`
                        : 'Tuyệt vời! Toàn bộ đơn hàng đã được xử lý hoàn tất.'}
                    </p>
                    {pendingOrdersCount > 0 && (
                      <button
                        onClick={() => setCurrentMenu('orders')}
                        className="inline-flex items-center gap-1 text-[11px] font-black text-rose-700 hover:text-rose-900 mt-2 cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-rose-300 shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Duyệt đơn ngay ({pendingOrdersCount}) →</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Conversion & Revenue Stats */}
                <div className="p-4 rounded-3xl bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 shadow-sm flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-purple-500/30">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-black text-[10px] uppercase tracking-wider">
                      Tỷ Lệ Chuyển Đổi & Doanh Thu
                    </span>
                    <p className="text-xs font-black text-zinc-900 mt-1.5 leading-snug">
                      Tỷ lệ hoàn tất: <span className="text-purple-700 font-black text-sm">{conversionRate}</span> • TB:{' '}
                      <span className="text-pink-700 font-black">{avgOrderValue.toLocaleString('vi-VN')}đ</span>/đơn.
                    </p>
                    <span className="text-[11px] text-zinc-600 font-bold block mt-1">
                      Tổng doanh số: <strong className="text-emerald-700">{totalRevenue.toLocaleString('vi-VN')}đ</strong>
                    </span>
                  </div>
                </div>

                {/* Engine Health Status */}
                <div className="p-4 rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 shadow-sm flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/30">
                    <Server className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-black text-[10px] uppercase tracking-wider">
                      48 Engine 3D & MongoDB
                    </span>
                    <p className="text-xs font-black text-zinc-900 mt-1.5 leading-snug">
                      100% 48 Engine Local sẵn sàng. Độ trễ Database:{' '}
                      <strong className="text-emerald-700 font-mono text-sm">{dbPing}</strong>.
                    </p>
                    <span className="text-[11px] text-zinc-600 font-bold block mt-1">
                      Đã ghi nhận: <strong className="text-purple-700">{totalViewsCount.toLocaleString('vi-VN')}</strong> lượt mở quà 3D
                    </span>
                  </div>
                </div>
              </div>

              {/* 4 Big KPI Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {/* Doanh thu */}
                <div
                  onClick={() => setCurrentMenu('orders')}
                  className="bg-white rounded-3xl p-5 border-2 border-emerald-100 shadow-sm hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-black text-zinc-700 uppercase tracking-wider">Doanh Thu VietQR</span>
                      <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/30">
                        <DollarSign className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="text-2xl font-black text-zinc-900 truncate">
                      {totalRevenue.toLocaleString('vi-VN')}đ
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs font-black">
                    <span className="text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {completedOrdersCount} đơn hoàn tất
                    </span>
                    <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      {pendingOrdersCount} chờ
                    </span>
                  </div>
                </div>

                {/* Quà tặng */}
                <div
                  onClick={() => setCurrentMenu('gifts')}
                  className="bg-white rounded-3xl p-5 border-2 border-purple-100 shadow-sm hover:border-purple-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-black text-zinc-700 uppercase tracking-wider">Quà Tặng 3D Cloud</span>
                      <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-500/30">
                        <Gift className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="text-2xl font-black text-zinc-900 truncate">
                      {totalGiftsCount || gifts.length} link quà
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs font-black">
                    <span className="text-purple-700 flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      {totalViewsCount.toLocaleString('vi-VN')} lượt xem
                    </span>
                    <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      {vipGiftsCount} VIP
                    </span>
                  </div>
                </div>

                {/* Kho mẫu */}
                <div
                  onClick={() => setCurrentMenu('templates')}
                  className="bg-white rounded-3xl p-5 border-2 border-pink-100 shadow-sm hover:border-[#FF1E6A] hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-black text-zinc-700 uppercase tracking-wider">Kho Mẫu 3D Local</span>
                      <div className="w-10 h-10 rounded-2xl bg-[#FF1E6A] text-white flex items-center justify-center shadow-md shadow-pink-500/30">
                        <Palette className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="text-2xl font-black text-zinc-900 truncate">122 mẫu active</div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs font-black text-[#FF1E6A]">
                    <span>48 Engine HTML/JS</span>
                    <span className="bg-pink-50 px-2 py-0.5 rounded-full border border-pink-200">12 Chibi 3D</span>
                  </div>
                </div>

                {/* Người dùng */}
                <div
                  onClick={() => setCurrentMenu('customers')}
                  className="bg-white rounded-3xl p-5 border-2 border-blue-100 shadow-sm hover:border-blue-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-black text-zinc-700 uppercase tracking-wider">Tài Khoản & Khách Hàng</span>
                      <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/30">
                        <Users className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="text-2xl font-black text-zinc-900 truncate">{usersList.length} tài khoản</div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs font-black text-blue-700">
                    <span>{customersList.length} khách mua hàng</span>
                    <span className="bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">CRM Pro</span>
                  </div>
                </div>
              </div>

              {/* 2 Big Visual Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* 7-Day Revenue Trend Area Chart */}
                <div className="lg:col-span-8 bg-white rounded-3xl border border-zinc-200 p-5 sm:p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-[#FF1E6A]" />
                      <h3 className="text-sm font-black text-zinc-900">Xu Hướng Doanh Thu 7 Ngày Qua</h3>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                        Đỉnh: {maxRevenueIn7Days.toLocaleString('vi-VN')}đ
                      </span>
                    </div>
                  </div>

                  <div className="w-full pt-2">
                    <svg viewBox={`0 0 ${chartPoints.width} ${chartPoints.height}`} className="w-full h-48 overflow-visible">
                      <defs>
                        <linearGradient id="chartGradPink" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#FF1E6A" stopOpacity="0.45" />
                          <stop offset="100%" stopColor="#A838FF" stopOpacity="0.02" />
                        </linearGradient>
                      </defs>

                      {/* Area Fill */}
                      <path d={chartPoints.areaD} fill="url(#chartGradPink)" />

                      {/* Stroke Line */}
                      <path d={chartPoints.pathD} fill="none" stroke="#FF1E6A" strokeWidth="3.5" strokeLinecap="round" />

                      {/* Points & Values */}
                      {chartPoints.points.map((p, idx) => (
                        <g key={idx}>
                          <circle cx={p.x} cy={p.y} r="5.5" fill="#FFFFFF" stroke="#FF1E6A" strokeWidth="3" />
                          {p.amount > 0 && (
                            <text
                              x={p.x}
                              y={p.y - 10}
                              textAnchor="middle"
                              fontSize="10"
                              fill="#9F1239"
                              fontWeight="900"
                            >
                              {p.amount >= 1000 ? `${Math.round(p.amount / 1000)}k` : p.amount}
                            </text>
                          )}
                          <text x={p.x} y={chartPoints.height} textAnchor="middle" fontSize="11" fill="#4B5563" fontWeight="bold">
                            {p.label}
                          </text>
                        </g>
                      ))}
                    </svg>
                  </div>
                </div>

                {/* Top 5 Templates Leaderboard */}
                <div className="lg:col-span-4 bg-white rounded-3xl border border-zinc-200 p-5 sm:p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                    <h3 className="text-sm font-black text-zinc-900 flex items-center gap-2">
                      <Flame className="w-5 h-5 text-amber-500 fill-amber-500" />
                      <span>Top Mẫu Được Tạo Nhiều</span>
                    </h3>
                  </div>

                  <div className="space-y-3.5">
                    {topTemplates.length === 0 ? (
                      <p className="text-xs text-zinc-400 py-8 text-center font-bold">Chưa có dữ liệu mẫu</p>
                    ) : (
                      topTemplates.map((item, idx) => (
                        <div key={item.slug} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-black">
                            <span className="truncate text-zinc-900">
                              <span className="text-pink-600 mr-1">#{idx + 1}</span> {item.name}
                            </span>
                            <span className="text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200 shrink-0">
                              {item.count} quà
                            </span>
                          </div>
                          <div className="w-full h-2.5 rounded-full bg-zinc-100 overflow-hidden border border-zinc-200">
                            <div
                              className="h-full bg-gradient-to-r from-[#FF1E6A] via-[#FF3D8B] to-[#A838FF] rounded-full"
                              style={{ width: `${Math.min(100, Math.max(15, (item.count / (gifts.length || 1)) * 100))}%` }}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Colorful Quick Action Buttons Bar */}
              <div className="bg-gradient-to-r from-[#190C29] via-[#2A1143] to-[#190C29] text-white p-5 rounded-3xl shadow-xl border-2 border-pink-400/30 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center text-pink-300 shrink-0 border border-white/15">
                    <SlidersHorizontal className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">Thao Tác Quản Trị Hệ Thống Nhanh</h3>
                    <p className="text-xs text-pink-200/80 font-medium">
                      Tạo đơn mới, tạo quà 3D, thêm tài khoản VIP hoặc xuất báo cáo tài chính.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Button 1: Thêm Đơn Hàng (Green) */}
                  <button
                    onClick={() => setShowAddOrderModal(true)}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all cursor-pointer hover:scale-[1.02]"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Thêm Đơn Hàng</span>
                  </button>

                  {/* Button 2: Tạo Quà 3D (Purple) */}
                  <button
                    onClick={() => setShowCreateGiftModal(true)}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-purple-600/30 transition-all cursor-pointer hover:scale-[1.02]"
                  >
                    <Gift className="w-4 h-4" />
                    <span>+ Tạo Quà 3D</span>
                  </button>

                  {/* Button 3: Thêm User (Blue) */}
                  <button
                    onClick={() => setShowCreateUserModal(true)}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition-all cursor-pointer hover:scale-[1.02]"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>+ Thêm User</span>
                  </button>

                  {/* Button 4: Xuất CSV (Amber/Gold) */}
                  <button
                    onClick={exportOrdersCSV}
                    className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-black text-xs border border-white/20 flex items-center gap-1.5 transition-all cursor-pointer hover:scale-[1.02]"
                  >
                    <Download className="w-4 h-4 text-amber-300" />
                    <span>Xuất CSV Đơn</span>
                  </button>
                </div>
              </div>

              {/* 2-Column Live Streams: Recent Orders & Recent Gifts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Đơn Hàng Vừa Nhận */}
                <div className="bg-white rounded-3xl border border-zinc-200 p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                    <h3 className="text-sm font-black text-zinc-900 flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-emerald-600" />
                      <span>Đơn Hàng Gần Đây</span>
                    </h3>
                    <button
                      onClick={() => setCurrentMenu('orders')}
                      className="text-xs font-black text-emerald-700 hover:underline cursor-pointer"
                    >
                      Xem tất cả ({orders.length}) →
                    </button>
                  </div>

                  <div className="space-y-3">
                    {orders.length === 0 ? (
                      <div className="py-10 text-center text-xs text-zinc-400 font-bold">Chưa có đơn hàng nào</div>
                    ) : (
                      orders.slice(0, 5).map((order) => (
                        <div
                          key={order.orderId}
                          className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center justify-between gap-3 text-xs hover:border-emerald-400 transition-colors"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-pink-600">{order.orderId}</span>
                              <span
                                className={`px-2 py-0.5 rounded-full font-black text-[10px] ${
                                  order.status === 'completed'
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                                }`}
                              >
                                {order.status === 'completed' ? '✓ Đã TT' : '⏳ Chờ duyệt'}
                              </span>
                            </div>
                            <p className="text-zinc-900 font-black mt-1 truncate">
                              {order.customerName} • <span className="text-zinc-600 font-medium">{order.templateName}</span>
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-black text-sm text-zinc-900">
                              {order.amount.toLocaleString('vi-VN')}đ
                            </span>
                            {order.status === 'pending' && (
                              <button
                                onClick={() => handleUpdateOrderStatus(order.orderId, 'completed')}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black cursor-pointer shadow-xs"
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

                {/* Quà Tặng 3D Vừa Tạo */}
                <div className="bg-white rounded-3xl border border-zinc-200 p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                    <h3 className="text-sm font-black text-zinc-900 flex items-center gap-2">
                      <Gift className="w-4 h-4 text-purple-600" />
                      <span>Quà Tặng 3D Vừa Tạo</span>
                    </h3>
                    <button
                      onClick={() => setCurrentMenu('gifts')}
                      className="text-xs font-black text-purple-700 hover:underline cursor-pointer"
                    >
                      Xem tất cả ({gifts.length}) →
                    </button>
                  </div>

                  <div className="space-y-3">
                    {gifts.length === 0 ? (
                      <div className="py-10 text-center text-xs text-zinc-400 font-bold">Chưa có quà tặng nào</div>
                    ) : (
                      gifts.slice(0, 5).map((gift) => (
                        <div
                          key={gift.giftId}
                          className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center justify-between gap-3 text-xs hover:border-purple-400 transition-colors"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-purple-700 truncate max-w-[140px]">
                                {gift.giftId}
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-black border border-purple-200">
                                {gift.viewsCount || 0} xem
                              </span>
                            </div>
                            <p className="text-zinc-900 font-black mt-1 truncate">
                              Gửi {gift.recipientName} • <span className="text-zinc-600 font-medium">{gift.templateName}</span>
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <a
                              href={`/v/${gift.templateSlug}?id=${gift.giftId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-[#FF1E6A] to-[#A838FF] text-white font-black text-[11px] flex items-center gap-1 shadow-xs"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Mở</span>
                            </a>
                            <button
                              onClick={() => handleCopyLink(`/v/${gift.templateSlug}?id=${gift.giftId}`, gift.giftId)}
                              className="p-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 cursor-pointer"
                              title="Sao chép link"
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
          {/* TAB 2: ORDERS CRUD PRO                                    */}
          {/* ========================================================= */}
          {currentMenu === 'orders' && (
            <div className="bg-white rounded-3xl border border-zinc-200 p-5 sm:p-6 shadow-sm space-y-5">
              {/* Header Filters & Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setOrderFilter('all')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                      orderFilter === 'all'
                        ? 'bg-zinc-900 text-white shadow-sm'
                        : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                    }`}
                  >
                    Tất cả ({orders.length})
                  </button>
                  <button
                    onClick={() => setOrderFilter('completed')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                      orderFilter === 'completed'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    ✓ Đã thanh toán ({completedOrdersCount})
                  </button>
                  <button
                    onClick={() => setOrderFilter('pending')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                      orderFilter === 'pending'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                    }`}
                  >
                    ⏳ Chờ duyệt ({pendingOrdersCount})
                  </button>
                  <button
                    onClick={() => setOrderFilter('cancelled')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                      orderFilter === 'cancelled'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
                    }`}
                  >
                    ✕ Đã hủy ({cancelledOrdersCount})
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Tìm mã đơn, tên khách, SĐT..."
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                      className="w-full text-xs py-2 pl-8 pr-3 rounded-xl border border-zinc-200 font-bold text-zinc-900 focus:outline-none focus:border-[#FF1E6A]"
                    />
                  </div>
                  <button
                    onClick={() => setShowAddOrderModal(true)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 shrink-0 cursor-pointer hover:scale-[1.02]"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tạo Đơn</span>
                  </button>
                  <button
                    onClick={exportOrdersCSV}
                    className="p-2 rounded-xl border-2 border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-800 shrink-0 cursor-pointer shadow-xs"
                    title="Xuất file CSV báo cáo tài chính cho Excel"
                  >
                    <Download className="w-4 h-4 text-emerald-600" />
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b-2 border-zinc-200 bg-zinc-50/75 text-zinc-800 font-black uppercase text-[10.5px]">
                      <th className="py-3 px-3.5">
                        <span className="flex items-center gap-1">
                          <Hash className="w-3.5 h-3.5 text-zinc-500" /> Mã Đơn
                        </span>
                      </th>
                      <th className="py-3 px-3.5">
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-blue-600" /> Khách Hàng
                        </span>
                      </th>
                      <th className="py-3 px-3.5">
                        <span className="flex items-center gap-1">
                          <Palette className="w-3.5 h-3.5 text-purple-600" /> Mẫu Quà Tặng
                        </span>
                      </th>
                      <th className="py-3 px-3.5">
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Số Tiền
                        </span>
                      </th>
                      <th className="py-3 px-3.5">
                        <span className="flex items-center gap-1">
                          <Activity className="w-3.5 h-3.5 text-amber-600" /> Trạng Thái
                        </span>
                      </th>
                      <th className="py-3 px-3.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-zinc-500" /> Thời Gian
                        </span>
                      </th>
                      <th className="py-3 px-3.5 text-right">
                        <span className="flex items-center justify-end gap-1">
                          <SlidersHorizontal className="w-3.5 h-3.5 text-pink-600" /> Thao Tác
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-zinc-400 font-bold">
                          Không tìm thấy đơn hàng nào phù hợp với bộ lọc
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((order) => (
                        <tr key={order.orderId} className="hover:bg-zinc-50/80 transition-colors">
                          <td className="py-3.5 px-3.5 font-mono font-black text-pink-600">{order.orderId}</td>
                          <td className="py-3.5 px-3.5">
                            <div className="font-black text-zinc-900">{order.customerName}</div>
                            {order.customerPhone && (
                              <div className="text-[11px] text-blue-700 font-mono font-bold">{order.customerPhone}</div>
                            )}
                          </td>
                          <td className="py-3.5 px-3.5 font-bold text-zinc-800 max-w-[220px] truncate">
                            {order.templateName}
                          </td>
                          <td className="py-3.5 px-3.5 font-black text-zinc-900 text-sm">
                            {order.amount.toLocaleString('vi-VN')}đ
                          </td>
                          <td className="py-3.5 px-3.5">
                            <span
                              className={`px-3 py-1 rounded-full text-[10.5px] font-black border ${
                                order.status === 'completed'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : order.status === 'cancelled'
                                  ? 'bg-zinc-100 text-zinc-700 border-zinc-300'
                                  : 'bg-amber-100 text-amber-800 border-amber-300'
                              }`}
                            >
                              {order.status === 'completed'
                                ? '✓ Đã Thanh Toán'
                                : order.status === 'cancelled'
                                ? '✕ Đã Hủy'
                                : '⏳ Chờ Duyệt'}
                            </span>
                          </td>
                          <td className="py-3.5 px-3.5 text-zinc-600 font-mono font-semibold text-[11px]">
                            {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                          </td>
                          <td className="py-3.5 px-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* 🟢 Nút Duyệt Đơn Nhanh */}
                              {order.status === 'pending' && (
                                <button
                                  onClick={() => handleUpdateOrderStatus(order.orderId, 'completed')}
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black flex items-center gap-1 cursor-pointer shadow-xs"
                                  title="Duyệt đơn thanh toán thành công"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Duyệt</span>
                                </button>
                              )}

                              {/* 🔵 Nút Nhắn Tin Zalo */}
                              {order.customerPhone && (
                                <a
                                  href={`https://zalo.me/${order.customerPhone}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-xs"
                                  title="Mở Zalo nhắn tin cho khách"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                </a>
                              )}

                              {/* 🟡 Nút Sửa Đơn Hàng */}
                              <button
                                onClick={() => setEditingOrder(order)}
                                className="p-1.5 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold cursor-pointer"
                                title="Chỉnh sửa thông tin đơn hàng"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              {/* ⚪ Nút Xem Chi Tiết */}
                              <button
                                onClick={() => setSelectedOrderDetail(order)}
                                className="p-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-800 font-bold cursor-pointer"
                                title="Xem chi tiết đơn hàng"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              {/* 🔴 Nút Xóa Đơn Hàng */}
                              {order.status !== 'completed' && (
                                <button
                                  onClick={() => handleDeleteOrder(order.orderId)}
                                  className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 cursor-pointer"
                                  title="Xóa đơn hàng này"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: GIFTS CRUD PRO (CLOUD ATLAS)                       */}
          {/* ========================================================= */}
          {currentMenu === 'gifts' && (
            <div className="bg-white rounded-3xl border border-zinc-200 p-5 sm:p-6 shadow-sm space-y-5">
              {/* Header Filters & Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1.5 rounded-xl bg-pink-100 text-pink-900 text-xs font-black border border-pink-200">
                    Tổng: {totalGiftsCount || gifts.length} link quà
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-purple-100 text-purple-900 text-xs font-black border border-purple-200">
                    👁️ {totalViewsCount} lượt mở
                  </span>
                  <button
                    onClick={() => setGiftVipFilter(giftVipFilter === 'vip' ? 'all' : 'vip')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 transition-all ${
                      giftVipFilter === 'vip'
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100'
                    }`}
                  >
                    <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span>Lọc Quà VIP ({vipGiftsCount})</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative w-full sm:w-72">
                    <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Tìm mã TK, người nhận, người gửi..."
                      value={giftSearch}
                      onChange={(e) => setGiftSearch(e.target.value)}
                      className="w-full text-xs py-2 pl-8 pr-3 rounded-xl border border-zinc-200 font-bold text-zinc-900 focus:outline-none focus:border-[#FF1E6A]"
                    />
                  </div>
                  <button
                    onClick={() => setShowCreateGiftModal(true)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-[#FF1E6A] text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-purple-600/20 shrink-0 cursor-pointer hover:scale-[1.02]"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tạo Quà 3D</span>
                  </button>
                  <button
                    onClick={exportGiftsCSV}
                    className="p-2 rounded-xl border-2 border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-800 shrink-0 cursor-pointer shadow-xs"
                    title="Xuất file CSV danh sách quà tặng"
                  >
                    <Download className="w-4 h-4 text-purple-600" />
                  </button>
                </div>
              </div>

              {/* Grid Gift Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredGifts.length === 0 ? (
                  <div className="col-span-full py-12 text-center text-zinc-400 text-xs font-bold">
                    Không tìm thấy quà tặng nào phù hợp với từ khóa
                  </div>
                ) : (
                  filteredGifts.map((gift) => (
                    <div
                      key={gift.giftId}
                      className="p-5 rounded-3xl bg-white border-2 border-zinc-200 hover:border-[#FF1E6A] transition-all flex flex-col justify-between gap-3 shadow-xs hover:shadow-md"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono font-black text-xs text-[#FF1E6A] truncate">{gift.giftId}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {gift.isVip && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-black text-[10px] flex items-center gap-0.5 border border-amber-300">
                                <Crown className="w-3 h-3 text-amber-500 fill-amber-500" />
                                VIP
                              </span>
                            )}
                            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-black text-[10px] border border-blue-200">
                              👁️ {gift.viewsCount || 0}
                            </span>
                          </div>
                        </div>

                        <h4 className="font-black text-sm text-zinc-900 truncate">{gift.templateName}</h4>
                        <p className="text-xs text-zinc-700 truncate font-semibold">
                          Gửi: <strong className="text-pink-700 font-black">{gift.recipientName}</strong> • Từ:{' '}
                          <strong className="text-zinc-900 font-bold">{gift.senderName}</strong>
                        </p>

                        {/* PIN & Passcode Indicators */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10.5px]">
                          {gift.keypadPin && (
                            <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-mono font-black border border-purple-200">
                              🔢 PIN: {gift.keypadPin}
                            </span>
                          )}
                          {gift.passcode && (
                            <span className="px-2 py-0.5 rounded-md bg-pink-100 text-pink-800 font-mono font-black border border-pink-200">
                              🔒 Khóa: {gift.passcode}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Card Action Buttons (Rực rỡ, rõ ràng, đủ màu sắc) */}
                      <div className="pt-3 border-t border-zinc-100 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          {/* 🌸 Nút Mở 3D */}
                          <a
                            href={`/v/${gift.templateSlug}?id=${gift.giftId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#FF1E6A] to-[#A838FF] text-white font-black text-[11px] flex items-center gap-1 shadow-xs hover:opacity-95"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Mở 3D</span>
                          </a>

                          {/* 📋 Nút Copy Link */}
                          <button
                            onClick={() => handleCopyLink(`/v/${gift.templateSlug}?id=${gift.giftId}`, gift.giftId)}
                            className="px-2.5 py-1.5 rounded-xl border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-800 font-black text-[11px] flex items-center gap-1 cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>{copiedId === gift.giftId ? 'Đã copy' : 'Copy'}</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          {/* 🟣 Nút Nhân Bản (Clone) */}
                          <button
                            onClick={() => handleCloneGift(gift.giftId)}
                            className="p-1.5 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold cursor-pointer"
                            title="Nhân bản quà tặng này (Clone)"
                          >
                            <Layers className="w-3.5 h-3.5" />
                          </button>

                          {/* 🟡 Nút Sửa Quà */}
                          <button
                            onClick={() => setEditingGift(gift)}
                            className="p-1.5 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold cursor-pointer"
                            title="Sửa nội dung thư, mã PIN, người nhận"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* 🔵 Nút Xem Thư */}
                          <button
                            onClick={() => setSelectedGiftDetail(gift)}
                            className="p-1.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold cursor-pointer"
                            title="Xem chi tiết nội dung thư tình"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>

                          {/* 🔴 Nút Xóa Quà */}
                          <button
                            onClick={() => handleDeleteGift(gift.giftId)}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 cursor-pointer"
                            title="Xóa quà này khỏi database"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 4: TEMPLATES & 48 LOCAL ENGINES                       */}
          {/* ========================================================= */}
          {currentMenu === 'templates' && (
            <div className="bg-white rounded-3xl border border-zinc-200 p-5 sm:p-6 shadow-sm space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
                <div className="flex flex-wrap items-center gap-2">
                  {['Tất cả', 'Tình yêu', 'Valentine', 'Sinh nhật', 'Trái tim 3D', '20/11', 'Thiệp'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => {
                        setSelectedCategory(cat);
                        setTemplatePage(1);
                      }}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                        selectedCategory === cat
                          ? 'bg-gradient-to-r from-[#FF1E6A] to-[#A838FF] text-white shadow-sm'
                          : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="relative w-full md:w-64">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Tìm theo tên mẫu, slug..."
                    value={templateSearch}
                    onChange={(e) => {
                      setTemplateSearch(e.target.value);
                      setTemplatePage(1);
                    }}
                    className="w-full text-xs py-2 pl-8 pr-3 rounded-xl border border-zinc-200 font-bold text-zinc-900 focus:outline-none focus:border-[#FF1E6A]"
                  />
                </div>
              </div>

              {/* Templates Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {pagedTemplates.map((tpl) => {
                  const enginePath = getLocalTemplateEnginePath(tpl.slug);
                  return (
                    <div
                      key={tpl.id}
                      className="group rounded-3xl border-2 border-zinc-200 bg-white overflow-hidden shadow-xs hover:border-[#FF1E6A] hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div className="aspect-video relative overflow-hidden bg-zinc-900">
                        <img
                          src={tpl.image}
                          alt={tpl.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                        <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-black/75 backdrop-blur-xs text-[10px] font-black text-pink-300 border border-white/20">
                          {tpl.category}
                        </span>
                        {tpl.priceType === 'free' ? (
                          <span className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full bg-emerald-600 text-[10px] font-black text-white shadow-sm">
                            Miễn Phí
                          </span>
                        ) : (
                          <span className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full bg-amber-500 text-[10px] font-black text-white shadow-sm">
                            VIP
                          </span>
                        )}
                      </div>

                      <div className="p-4 space-y-2.5 flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="font-black text-xs text-zinc-900 line-clamp-1">{tpl.name}</h4>
                          <span className="font-mono text-[10.5px] text-zinc-500 font-bold block mt-1 truncate">
                            Engine: {enginePath}
                          </span>
                        </div>

                        <div className="pt-2.5 border-t border-zinc-100 flex items-center justify-between gap-2">
                          <button
                            onClick={() => setPreviewModalTemplate(tpl)}
                            className="flex-1 py-2 rounded-xl border border-pink-200 bg-pink-50 hover:bg-pink-100 text-[#FF1E6A] font-black text-[11px] flex items-center justify-center gap-1 cursor-pointer transition-colors"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>Test Live</span>
                          </button>
                          <Link
                            href={`/studio/${tpl.slug}`}
                            target="_blank"
                            className="flex-1 py-2 rounded-xl bg-gradient-to-r from-[#FF1E6A] to-[#A838FF] text-white font-black text-[11px] flex items-center justify-center gap-1 shadow-xs hover:opacity-95"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Mở Studio</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalTemplatePages > 1 && (
                <div className="pt-4 border-t border-zinc-200 flex items-center justify-between text-xs font-black text-zinc-700">
                  <span>
                    Trang {safeTemplatePage} / {totalTemplatePages} ({filteredTemplates.length} mẫu)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setTemplatePage((p) => Math.max(1, p - 1))}
                      disabled={safeTemplatePage <= 1}
                      className="px-3.5 py-1.5 rounded-xl border border-zinc-300 disabled:opacity-40 font-black cursor-pointer"
                    >
                      ← Trang Trước
                    </button>
                    <button
                      onClick={() => setTemplatePage((p) => Math.min(totalTemplatePages, p + 1))}
                      disabled={safeTemplatePage >= totalTemplatePages}
                      className="px-3.5 py-1.5 rounded-xl border border-zinc-300 disabled:opacity-40 font-black cursor-pointer"
                    >
                      Trang Sau →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 5: USERS & CRM CUSTOMERS                              */}
          {/* ========================================================= */}
          {currentMenu === 'customers' && (
            <div className="space-y-5">
              {/* Subtab Switcher */}
              <div className="flex items-center gap-2 bg-white p-3.5 rounded-3xl border border-zinc-200 shadow-sm">
                <button
                  onClick={() => setCustomerSubTab('users')}
                  className={`px-4 py-2 rounded-2xl text-xs font-black transition-all ${
                    customerSubTab === 'users'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                      : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                  }`}
                >
                  👥 Tài Khoản Thành Viên ({usersList.length})
                </button>
                <button
                  onClick={() => setCustomerSubTab('crm')}
                  className={`px-4 py-2 rounded-2xl text-xs font-black transition-all ${
                    customerSubTab === 'crm'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                      : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                  }`}
                >
                  💎 Khách Hàng & CRM ({customersList.length})
                </button>
              </div>

              {customerSubTab === 'users' ? (
                <div className="bg-white rounded-3xl border border-zinc-200 p-5 sm:p-6 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => setUserRoleFilter('all')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black ${
                          userRoleFilter === 'all' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-700'
                        }`}
                      >
                        Tất cả ({usersList.length})
                      </button>
                      <button
                        onClick={() => setUserRoleFilter('vip')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black ${
                          userRoleFilter === 'vip' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-900 border border-amber-200'
                        }`}
                      >
                        👑 VIP ({usersList.filter((u) => u.role === 'vip').length})
                      </button>
                      <button
                        onClick={() => setUserRoleFilter('admin')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black ${
                          userRoleFilter === 'admin' ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-900 border border-purple-200'
                        }`}
                      >
                        🛡️ Admin ({usersList.filter((u) => u.role === 'admin').length})
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative w-full sm:w-64">
                        <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Tìm tên, email, SĐT..."
                          value={userSearch}
                          onChange={(e) => setUserSearch(e.target.value)}
                          className="w-full text-xs py-2 pl-8 pr-3 rounded-xl border border-zinc-200 font-bold text-zinc-900 focus:outline-none focus:border-blue-600"
                        />
                      </div>
                      <button
                        onClick={() => setShowCreateUserModal(true)}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/20 shrink-0 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Thêm User</span>
                      </button>
                    </div>
                  </div>

                  {/* Users Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b-2 border-zinc-200 bg-zinc-50/75 text-zinc-800 font-black uppercase text-[10.5px]">
                          <th className="py-3 px-3.5">Họ và Tên</th>
                          <th className="py-3 px-3.5">Email / SĐT</th>
                          <th className="py-3 px-3.5">Vai Trò</th>
                          <th className="py-3 px-3.5">Trạng Thái</th>
                          <th className="py-3 px-3.5">Ngày Đăng Ký</th>
                          <th className="py-3 px-3.5 text-right">Thao Tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {filteredAdminUsers.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-10 text-center text-zinc-400 font-bold">
                              Không tìm thấy người dùng phù hợp
                            </td>
                          </tr>
                        ) : (
                          filteredAdminUsers.map((user) => (
                            <tr key={user.userId} className="hover:bg-zinc-50 transition-colors">
                              <td className="py-3.5 px-3.5">
                                <div className="font-black text-zinc-900 flex items-center gap-1.5">
                                  <span>{user.fullName}</span>
                                  {user.authProvider === 'google' && (
                                    <span className="px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-700 text-[9px] font-black border border-blue-200">
                                      Google
                                    </span>
                                  )}
                                </div>
                                <span className="font-mono text-[10px] text-zinc-500 font-semibold">{user.userId}</span>
                              </td>
                              <td className="py-3.5 px-3.5">
                                <div className="font-mono font-bold text-zinc-900">{user.email}</div>
                                {user.phone && <div className="text-[11px] text-zinc-600 font-mono font-semibold">{user.phone}</div>}
                              </td>
                              <td className="py-3.5 px-3.5">
                                <span
                                  className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${
                                    user.role === 'admin'
                                      ? 'bg-purple-100 text-purple-800 border-purple-300'
                                      : user.role === 'vip'
                                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                                      : 'bg-zinc-100 text-zinc-700 border-zinc-300'
                                  }`}
                                >
                                  {user.role}
                                </span>
                              </td>
                              <td className="py-3.5 px-3.5">
                                <button
                                  onClick={() =>
                                    handleQuickUpdateUser(user.userId, {
                                      status: user.status === 'active' ? 'locked' : 'active'
                                    })
                                  }
                                  className={`px-2.5 py-1 rounded-full text-[10px] font-black border transition-colors cursor-pointer ${
                                    user.status === 'active'
                                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
                                      : 'bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-200'
                                  }`}
                                  title="Bấm để khóa / mở khóa tài khoản"
                                >
                                  {user.status === 'active' ? '● Đang Hoạt Động' : '🔒 Đã Khóa'}
                                </button>
                              </td>
                              <td className="py-3.5 px-3.5 text-zinc-600 font-mono font-bold text-[11px]">
                                {user.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : '—'}
                              </td>
                              <td className="py-3.5 px-3.5 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {/* Quick Role Switcher */}
                                  <select
                                    value={user.role}
                                    onChange={(e) =>
                                      handleQuickUpdateUser(user.userId, {
                                        role: e.target.value as 'user' | 'vip' | 'admin'
                                      })
                                    }
                                    className="px-2 py-1 rounded-lg border border-zinc-300 bg-white font-black text-[11px] cursor-pointer"
                                  >
                                    <option value="user">User</option>
                                    <option value="vip">VIP</option>
                                    <option value="admin">Admin</option>
                                  </select>

                                  <button
                                    onClick={() => setEditingUser(user)}
                                    className="p-1.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 cursor-pointer"
                                    title="Sửa thông tin tài khoản"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={() => handleDeleteUser(user)}
                                    className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 cursor-pointer"
                                    title="Xóa tài khoản này"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                /* CRM Subtab */
                <div className="bg-white rounded-3xl border border-zinc-200 p-5 sm:p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                    <h3 className="text-sm font-black text-zinc-900 flex items-center gap-2">
                      <Crown className="w-4 h-4 text-amber-500 fill-amber-500" />
                      <span>Bảng Xếp Hạng Khách Hàng Thân Thiết (CRM)</span>
                    </h3>
                    <span className="text-xs text-zinc-500 font-bold">Tự động tính từ lịch sử đơn hàng</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b-2 border-zinc-200 bg-zinc-50/75 text-zinc-800 font-black uppercase text-[10.5px]">
                          <th className="py-3 px-3.5">Hạng</th>
                          <th className="py-3 px-3.5">Khách Hàng</th>
                          <th className="py-3 px-3.5">Số Điện Thoại</th>
                          <th className="py-3 px-3.5">Số Đơn Mua</th>
                          <th className="py-3 px-3.5">Tổng Chi Tiêu</th>
                          <th className="py-3 px-3.5">Đơn Gần Nhất</th>
                          <th className="py-3 px-3.5 text-right">Chăm Sóc Khách</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {customersList.map((c, idx) => (
                          <tr key={idx} className="hover:bg-zinc-50 transition-colors">
                            <td className="py-3.5 px-3.5">
                              <span
                                className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[11px] ${
                                  idx === 0
                                    ? 'bg-amber-400 text-zinc-900 shadow-sm'
                                    : idx === 1
                                    ? 'bg-zinc-300 text-zinc-900'
                                    : idx === 2
                                    ? 'bg-amber-700 text-white'
                                    : 'bg-zinc-100 text-zinc-600'
                                }`}
                              >
                                {idx + 1}
                              </span>
                            </td>
                            <td className="py-3.5 px-3.5 font-black text-zinc-900">{c.name}</td>
                            <td className="py-3.5 px-3.5 font-mono text-blue-700 font-black">{c.phone || '—'}</td>
                            <td className="py-3.5 px-3.5 font-black text-purple-700">{c.count} đơn</td>
                            <td className="py-3.5 px-3.5 font-black text-emerald-700 text-sm">
                              {c.totalSpent.toLocaleString('vi-VN')}đ
                            </td>
                            <td className="py-3.5 px-3.5 text-zinc-600 font-mono font-bold text-[11px]">
                              {new Date(c.lastOrder).toLocaleDateString('vi-VN')}
                            </td>
                            <td className="py-3.5 px-3.5 text-right">
                              {c.phone ? (
                                <a
                                  href={`https://zalo.me/${c.phone}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-[11px] inline-flex items-center gap-1 shadow-xs"
                                >
                                  <Send className="w-3 h-3" />
                                  <span>Chat Zalo</span>
                                </a>
                              ) : (
                                <span className="text-zinc-400 font-bold">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 6: MEDIA & CHIBI & ROMANTIC PLAYLIST                  */}
          {/* ========================================================= */}
          {currentMenu === 'media' && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 bg-white p-3.5 rounded-3xl border border-zinc-200 shadow-sm">
                <button
                  onClick={() => setMediaSubTab('chibi')}
                  className={`px-4 py-2 rounded-2xl text-xs font-black transition-all ${
                    mediaSubTab === 'chibi'
                      ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-md'
                      : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                  }`}
                >
                  🎨 Kho 12 Ảnh Chibi 3D Độc Quyền
                </button>
                <button
                  onClick={() => setMediaSubTab('music')}
                  className={`px-4 py-2 rounded-2xl text-xs font-black transition-all ${
                    mediaSubTab === 'music'
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                      : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                  }`}
                >
                  🎵 Kho Nhạc Nền ({ROMANTIC_PLAYLIST.length} bài)
                </button>
              </div>

              {mediaSubTab === 'chibi' ? (
                <div className="bg-white rounded-3xl border border-zinc-200 p-5 sm:p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                    <div>
                      <h3 className="text-sm font-black text-zinc-900">Kho Ảnh Chibi Couple 3D Siêu Dễ Thương</h3>
                      <p className="text-xs text-zinc-600 font-semibold">Tự động tích hợp cho các mẫu thiệp và phòng Studio</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {CHIBI_GALLERY.map((img) => (
                      <div
                        key={img.id}
                        className="group rounded-2xl border-2 border-zinc-200 overflow-hidden bg-zinc-50 p-2.5 flex flex-col justify-between gap-2 hover:border-[#FF1E6A] hover:shadow-md transition-all"
                      >
                        <div className="aspect-square rounded-xl overflow-hidden bg-pink-100 relative">
                          <img
                            src={img.url}
                            alt={img.label}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        </div>
                        <div className="text-center">
                          <span className="text-xs font-black text-zinc-900 block truncate">{img.label}</span>
                          <button
                            onClick={() => handleCopyLink(img.url, String(img.id))}
                            className="mt-1.5 w-full py-1.5 rounded-lg border border-pink-200 text-[11px] font-black text-[#FF1E6A] hover:bg-pink-50 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>{copiedId === String(img.id) ? '✓ Đã copy' : 'Copy URL'}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-zinc-200 p-5 sm:p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                    <h3 className="text-sm font-black text-zinc-900 flex items-center gap-2">
                      <Volume2 className="w-5 h-5 text-purple-600" />
                      <span>Danh Sách Nhạc Lãng Mạn (Romantic Playlist)</span>
                    </h3>
                    <span className="text-xs text-zinc-600 font-bold">Đã tối ưu cho 48 Engine 3D</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {ROMANTIC_PLAYLIST.map((song) => {
                      const isPlaying = playingAudio === song.url;
                      return (
                        <div
                          key={song.id}
                          className="p-4 rounded-2xl border-2 border-zinc-200 bg-zinc-50 flex items-center justify-between gap-3 hover:border-purple-400 transition-all"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <button
                              onClick={() => togglePlayAudio(song.url)}
                              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 cursor-pointer transition-all shadow-sm ${
                                isPlaying
                                  ? 'bg-gradient-to-tr from-pink-500 to-rose-600 text-white animate-pulse'
                                  : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                              }`}
                            >
                              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                            </button>
                            <div className="min-w-0">
                              <h4 className="text-xs font-black text-zinc-900 truncate">{song.title}</h4>
                              <span className="text-[10px] text-zinc-500 font-mono font-bold truncate block">{song.url}</span>
                            </div>
                          </div>

                          <button
                            onClick={() => handleCopyLink(song.url, song.id)}
                            className="p-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-800 cursor-pointer shrink-0 font-bold"
                            title="Sao chép link bài hát"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 7: SETTINGS & PAYMENT CONFIGURATION                   */}
          {/* ========================================================= */}
          {currentMenu === 'settings' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-7 bg-white rounded-3xl border border-zinc-200 p-6 shadow-sm space-y-5">
                <div className="border-b border-zinc-100 pb-3">
                  <h3 className="font-black text-sm text-zinc-900">Cấu Hình Tài Khoản ACB & VietQR</h3>
                  <p className="text-xs text-zinc-600 font-medium">
                    Thông tin tài khoản nhận tiền chuyển khoản tự động khi khách đặt đơn VIP
                  </p>
                </div>

                <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-black text-zinc-800 mb-1.5">Ngân Hàng Tiếp Nhận</label>
                    <input
                      type="text"
                      disabled
                      value={settings.bankName}
                      className="w-full p-3 rounded-xl border border-zinc-200 bg-zinc-100 font-black text-zinc-700"
                    />
                  </div>

                  <div>
                    <label className="block font-black text-zinc-800 mb-1.5">Số Tài Khoản (STK)</label>
                    <input
                      type="text"
                      required
                      value={settings.accountNumber}
                      onChange={(e) => setSettings({ ...settings, accountNumber: e.target.value })}
                      className="w-full p-3 rounded-xl border-2 border-zinc-200 font-mono font-black text-base text-zinc-900 focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-black text-zinc-800 mb-1.5">Tên Chủ Tài Khoản</label>
                      <input
                        type="text"
                        required
                        value={settings.accountHolder}
                        onChange={(e) => setSettings({ ...settings, accountHolder: e.target.value.toUpperCase() })}
                        className="w-full p-3 rounded-xl border-2 border-zinc-200 font-black uppercase text-zinc-900 focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                    <div>
                      <label className="block font-black text-zinc-800 mb-1.5">Hotline / Zalo Hỗ Trợ</label>
                      <input
                        type="text"
                        required
                        value={settings.zaloPhone}
                        onChange={(e) => setSettings({ ...settings, zaloPhone: e.target.value })}
                        className="w-full p-3 rounded-xl border-2 border-zinc-200 font-mono font-black text-zinc-900 focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                  </div>

                  {settingsError && <p className="text-rose-600 font-black">{settingsError}</p>}

                  <button
                    type="submit"
                    className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs shadow-md shadow-emerald-600/30 flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.01]"
                  >
                    <Save className="w-4 h-4" />
                    <span>{savedSettings ? '✓ Đã Lưu Cấu Hình Thành Công!' : 'Lưu Cấu Hình Hệ Thống'}</span>
                  </button>
                </form>
              </div>

              {/* Luxury Realistic Bank Card Preview */}
              <div className="lg:col-span-5 bg-gradient-to-br from-[#120B1E] via-[#24113D] to-[#140A22] text-white rounded-3xl p-7 shadow-2xl border-2 border-amber-400/40 space-y-5">
                <div className="flex items-center justify-between">
                  <span className="px-3.5 py-1 rounded-full bg-amber-400/20 text-amber-300 text-[10.5px] font-black uppercase tracking-wider border border-amber-400/30">
                    VietQR Napas 247
                  </span>
                  <CreditCard className="w-6 h-6 text-amber-400" />
                </div>
                <div className="py-2">
                  <p className="text-xs text-zinc-400 font-bold uppercase">{settings.bankName}</p>
                  <p className="text-2xl sm:text-3xl font-mono font-black tracking-widest mt-1 text-white">
                    {settings.accountNumber}
                  </p>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-white/10 text-xs">
                  <div>
                    <span className="text-[10px] text-zinc-400 font-bold uppercase block">CHỦ TÀI KHOẢN</span>
                    <span className="font-black text-amber-300 text-sm tracking-wide">{settings.accountHolder}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-zinc-400 font-bold uppercase block">ZALO HỖ TRỢ</span>
                    <span className="font-mono font-black text-blue-300 text-sm">{settings.zaloPhone}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ========================================================= */}
      {/* ACTION MODALS                                             */}
      {/* ========================================================= */}

      {/* MODAL: LIVE 3D TEMPLATE PREVIEW */}
      {previewModalTemplate && (
        <div
          className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setPreviewModalTemplate(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-4xl w-full p-5 shadow-2xl border-2 border-pink-400 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="font-black text-base text-zinc-900">{previewModalTemplate.name}</h3>
                <p className="text-xs text-purple-700 font-mono font-bold mt-0.5">
                  Engine: {getLocalTemplateEnginePath(previewModalTemplate.slug)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/studio/${previewModalTemplate.slug}`}
                  target="_blank"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF1E6A] to-[#A838FF] text-white text-xs font-black shadow-md"
                >
                  Mở trong Studio ↗
                </Link>
                <button
                  onClick={() => setPreviewModalTemplate(null)}
                  className="p-2 rounded-full bg-zinc-100 text-zinc-700 hover:bg-zinc-200 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="aspect-[16/10] w-full rounded-2xl overflow-hidden bg-black border border-zinc-200">
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
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-xs animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="font-black text-sm text-zinc-900 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-emerald-600" />
                <span>Thêm Đơn Hàng Mới</span>
              </h3>
              <button onClick={() => setShowAddOrderModal(false)} className="text-zinc-400 hover:text-black cursor-pointer font-bold">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateOrder} className="space-y-3.5">
              <div>
                <label className="block font-black text-zinc-800 mb-1">Tên Khách Hàng</label>
                <input
                  type="text"
                  required
                  value={newOrderForm.customerName}
                  onChange={(e) => setNewOrderForm({ ...newOrderForm, customerName: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-zinc-300 font-bold text-zinc-900"
                />
              </div>
              <div>
                <label className="block font-black text-zinc-800 mb-1">Số Điện Thoại / Zalo</label>
                <input
                  type="text"
                  value={newOrderForm.customerPhone}
                  onChange={(e) => setNewOrderForm({ ...newOrderForm, customerPhone: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-zinc-300 font-mono font-bold text-zinc-900"
                />
              </div>
              <div>
                <label className="block font-black text-zinc-800 mb-1">Mẫu Quà Tặng</label>
                <select
                  value={newOrderForm.templateName}
                  onChange={(e) => setNewOrderForm({ ...newOrderForm, templateName: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-zinc-300 font-black text-zinc-900"
                >
                  {AVAILABLE_TEMPLATES.map((t) => (
                    <option key={t.id} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-black text-zinc-800 mb-1">Số Tiền (VNĐ)</label>
                <input
                  type="number"
                  value={newOrderForm.amount}
                  onChange={(e) => setNewOrderForm({ ...newOrderForm, amount: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-xl border border-zinc-300 font-black text-emerald-700 text-sm"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddOrderModal(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-300 font-black cursor-pointer text-zinc-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black cursor-pointer shadow-md"
                >
                  Lưu Đơn Hàng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT ORDER */}
      {editingOrder && (
        <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-xs animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="font-black text-sm text-zinc-900 flex items-center gap-1.5">
                  <Edit3 className="w-4 h-4 text-purple-600" /> Sửa Đơn Hàng
                </h3>
                <span className="font-mono text-[#FF1E6A] font-black">{editingOrder.orderId}</span>
              </div>
              <button onClick={() => setEditingOrder(null)} className="text-zinc-400 hover:text-black cursor-pointer font-bold">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEditOrder} className="space-y-3.5">
              <div>
                <label className="block font-black text-zinc-800 mb-1">Tên Khách Hàng</label>
                <input
                  type="text"
                  required
                  value={editingOrder.customerName}
                  onChange={(e) => setEditingOrder({ ...editingOrder, customerName: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-zinc-300 font-black text-zinc-900"
                />
              </div>
              <div>
                <label className="block font-black text-zinc-800 mb-1">Số Điện Thoại / Zalo</label>
                <input
                  type="text"
                  value={editingOrder.customerPhone || ''}
                  onChange={(e) => setEditingOrder({ ...editingOrder, customerPhone: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-zinc-300 font-mono font-bold text-zinc-900"
                />
              </div>
              <div>
                <label className="block font-black text-zinc-800 mb-1">Mẫu Quà</label>
                <input
                  type="text"
                  value={editingOrder.templateName}
                  onChange={(e) => setEditingOrder({ ...editingOrder, templateName: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-zinc-300 font-bold text-zinc-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-black text-zinc-800 mb-1">Số Tiền (VNĐ)</label>
                  <input
                    type="number"
                    value={editingOrder.amount}
                    onChange={(e) => setEditingOrder({ ...editingOrder, amount: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-zinc-300 font-black text-emerald-700 text-sm"
                  />
                </div>
                <div>
                  <label className="block font-black text-zinc-800 mb-1">Trạng Thái</label>
                  <select
                    value={editingOrder.status}
                    onChange={(e) => setEditingOrder({ ...editingOrder, status: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-zinc-300 font-black text-zinc-900"
                  >
                    <option value="pending">⏳ Chờ duyệt</option>
                    <option value="completed">✓ Đã thanh toán</option>
                    <option value="cancelled">✕ Đã hủy</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-black text-zinc-800 mb-1">Ghi Chú</label>
                <textarea
                  rows={2}
                  value={editingOrder.note || ''}
                  onChange={(e) => setEditingOrder({ ...editingOrder, note: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-zinc-300 font-medium text-zinc-900"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingOrder(null)}
                  className="px-4 py-2 rounded-xl border border-zinc-300 font-black cursor-pointer text-zinc-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black cursor-pointer shadow-md"
                >
                  Lưu Thay Đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ORDER DETAIL */}
      {selectedOrderDetail && (
        <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-xs animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="font-black text-sm text-zinc-900">Chi Tiết Đơn Hàng</h3>
                <span className="font-mono text-[#FF1E6A] font-black">{selectedOrderDetail.orderId}</span>
              </div>
              <button onClick={() => setSelectedOrderDetail(null)} className="text-zinc-400 hover:text-black cursor-pointer font-bold">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 bg-zinc-50 p-4 rounded-2xl border border-zinc-200">
              <div className="flex justify-between">
                <span className="text-zinc-600 font-bold">Khách hàng:</span>
                <span className="font-black text-zinc-900">{selectedOrderDetail.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600 font-bold">SĐT / Zalo:</span>
                <span className="font-mono font-black text-blue-700">{selectedOrderDetail.customerPhone || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600 font-bold">Mẫu quà:</span>
                <span className="font-black text-zinc-900">{selectedOrderDetail.templateName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600 font-bold">Số tiền:</span>
                <span className="font-black text-sm text-emerald-700">
                  {selectedOrderDetail.amount.toLocaleString('vi-VN')}đ
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600 font-bold">Phương thức:</span>
                <span className="font-bold text-zinc-900">{selectedOrderDetail.paymentMethod}</span>
              </div>
              {selectedOrderDetail.note && (
                <div className="pt-2 border-t border-zinc-200">
                  <span className="text-zinc-600 font-bold">Ghi chú:</span>
                  <p className="font-bold text-zinc-900 mt-0.5">{selectedOrderDetail.note}</p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setSelectedOrderDetail(null)}
                className="px-4 py-2 rounded-xl border border-zinc-300 font-black cursor-pointer text-zinc-800"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT GIFT */}
      {editingGift && (
        <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 text-xs animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="font-black text-sm text-zinc-900 flex items-center gap-1.5">
                  <Edit3 className="w-4 h-4 text-amber-600" /> Chỉnh Sửa Quà Tặng 3D
                </h3>
                <span className="font-mono text-purple-700 font-black">{editingGift.giftId}</span>
              </div>
              <button onClick={() => setEditingGift(null)} className="text-zinc-400 hover:text-black cursor-pointer font-bold">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEditGift} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-black text-zinc-800 mb-1">Người Nhận</label>
                  <input
                    type="text"
                    required
                    value={editingGift.recipientName}
                    onChange={(e) => setEditingGift({ ...editingGift, recipientName: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-zinc-300 font-black text-zinc-900"
                  />
                </div>
                <div>
                  <label className="block font-black text-zinc-800 mb-1">Người Gửi</label>
                  <input
                    type="text"
                    required
                    value={editingGift.senderName}
                    onChange={(e) => setEditingGift({ ...editingGift, senderName: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-zinc-300 font-black text-zinc-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-black text-zinc-800 mb-1">Tiêu Đề Thư Tình</label>
                <input
                  type="text"
                  value={editingGift.letterTitle || ''}
                  onChange={(e) => setEditingGift({ ...editingGift, letterTitle: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-zinc-300 font-black text-pink-700"
                />
              </div>

              <div>
                <label className="block font-black text-zinc-800 mb-1">Nội Dung Bức Thư</label>
                <textarea
                  rows={4}
                  value={editingGift.letterContent || ''}
                  onChange={(e) => setEditingGift({ ...editingGift, letterContent: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-zinc-300 font-medium text-zinc-900 leading-relaxed font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-black text-zinc-800 mb-1">Mã PIN Bàn Phím Trong Thiệp</label>
                  <input
                    type="text"
                    value={editingGift.keypadPin || ''}
                    onChange={(e) => setEditingGift({ ...editingGift, keypadPin: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-zinc-300 font-mono font-black text-purple-700"
                  />
                </div>
                <div>
                  <label className="block font-black text-zinc-800 mb-1">Mật Khẩu Link Toàn Trang</label>
                  <input
                    type="text"
                    value={editingGift.passcode || ''}
                    onChange={(e) => setEditingGift({ ...editingGift, passcode: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-zinc-300 font-mono font-black text-pink-700"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingGift.isVip}
                    onChange={(e) => setEditingGift({ ...editingGift, isVip: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-500"
                  />
                  <span className="font-black text-amber-800 flex items-center gap-1">
                    <Crown className="w-4 h-4 text-amber-500 fill-amber-500" />
                    Kích hoạt quyền Quà VIP
                  </span>
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingGift(null)}
                  className="px-4 py-2 rounded-xl border border-zinc-300 font-black cursor-pointer text-zinc-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-[#FF1E6A] text-white font-black cursor-pointer shadow-md"
                >
                  Lưu Thông Tin Quà
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE QUICK GIFT */}
      {showCreateGiftModal && (
        <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-xs animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="font-black text-sm text-zinc-900 flex items-center gap-1.5">
                <Gift className="w-4 h-4 text-purple-600" /> Tạo Quà Tặng 3D Nhanh
              </h3>
              <button onClick={() => setShowCreateGiftModal(false)} className="text-zinc-400 hover:text-black cursor-pointer font-bold">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateGiftSubmit} className="space-y-3.5">
              <div>
                <label className="block font-black text-zinc-800 mb-1">Chọn Mẫu 3D</label>
                <select
                  value={newGiftForm.templateSlug}
                  onChange={(e) => setNewGiftForm({ ...newGiftForm, templateSlug: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-zinc-300 font-black text-zinc-900"
                >
                  {AVAILABLE_TEMPLATES.map((t) => (
                    <option key={t.slug} value={t.slug}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-black text-zinc-800 mb-1">Người Nhận</label>
                  <input
                    type="text"
                    required
                    value={newGiftForm.recipientName}
                    onChange={(e) => setNewGiftForm({ ...newGiftForm, recipientName: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-zinc-300 font-black text-zinc-900"
                  />
                </div>
                <div>
                  <label className="block font-black text-zinc-800 mb-1">Người Gửi</label>
                  <input
                    type="text"
                    required
                    value={newGiftForm.senderName}
                    onChange={(e) => setNewGiftForm({ ...newGiftForm, senderName: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-zinc-300 font-black text-zinc-900"
                  />
                </div>
              </div>
              <div>
                <label className="block font-black text-zinc-800 mb-1">Tiêu Đề Thư</label>
                <input
                  type="text"
                  value={newGiftForm.letterTitle}
                  onChange={(e) => setNewGiftForm({ ...newGiftForm, letterTitle: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-zinc-300 font-black text-pink-700"
                />
              </div>
              <div>
                <label className="block font-black text-zinc-800 mb-1">Nội Dung Thư</label>
                <textarea
                  rows={3}
                  value={newGiftForm.letterContent}
                  onChange={(e) => setNewGiftForm({ ...newGiftForm, letterContent: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-zinc-300 font-medium text-zinc-900 leading-relaxed font-sans"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateGiftModal(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-300 font-black cursor-pointer text-zinc-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black cursor-pointer shadow-md"
                >
                  Khởi Tạo Link Quà
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: GIFT DETAIL */}
      {selectedGiftDetail && (
        <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 text-xs animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="font-black text-sm text-zinc-900">Chi Tiết Quà Tặng 3D</h3>
                <span className="font-mono text-purple-700 font-black">{selectedGiftDetail.giftId}</span>
              </div>
              <button onClick={() => setSelectedGiftDetail(null)} className="text-zinc-400 hover:text-black cursor-pointer font-bold">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 bg-zinc-50 p-4 rounded-2xl border border-zinc-200">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-zinc-500 font-bold">Người nhận:</span>
                  <p className="font-black text-sm text-pink-700">{selectedGiftDetail.recipientName}</p>
                </div>
                <div>
                  <span className="text-zinc-500 font-bold">Người gửi:</span>
                  <p className="font-black text-sm text-zinc-900">{selectedGiftDetail.senderName}</p>
                </div>
              </div>
              {selectedGiftDetail.letterTitle && (
                <div>
                  <span className="text-zinc-500 font-bold">Tiêu đề:</span>
                  <p className="font-black text-[#FF1E6A]">{selectedGiftDetail.letterTitle}</p>
                </div>
              )}
              {selectedGiftDetail.letterContent && (
                <div>
                  <span className="text-zinc-500 font-bold">Nội dung thư tình:</span>
                  <p className="p-3 bg-white rounded-xl border border-zinc-200 mt-1 whitespace-pre-wrap leading-relaxed font-sans font-medium text-zinc-900">
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
                className="px-4 py-2 rounded-xl border border-zinc-300 font-black cursor-pointer text-zinc-800"
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
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-xs animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="font-black text-sm text-zinc-900 flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-blue-600" /> Tạo Tài Khoản Mới
              </h3>
              <button onClick={() => setShowCreateUserModal(false)} className="text-zinc-400 hover:text-black cursor-pointer font-bold">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateUserSubmit} className="space-y-3.5">
              <div>
                <label className="block font-black text-zinc-800 mb-1">Họ và Tên</label>
                <input
                  type="text"
                  required
                  value={newUserForm.fullName}
                  onChange={(e) => setNewUserForm({ ...newUserForm, fullName: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-zinc-300 font-black text-zinc-900"
                />
              </div>
              <div>
                <label className="block font-black text-zinc-800 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-zinc-300 font-mono font-bold text-zinc-900"
                />
              </div>
              <div>
                <label className="block font-black text-zinc-800 mb-1">Số Điện Thoại</label>
                <input
                  type="text"
                  value={newUserForm.phone}
                  onChange={(e) => setNewUserForm({ ...newUserForm, phone: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-zinc-300 font-mono font-bold text-zinc-900"
                />
              </div>
              <div>
                <label className="block font-black text-zinc-800 mb-1">Mật Khẩu</label>
                <input
                  type="text"
                  required
                  minLength={6}
                  value={newUserForm.password}
                  onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-zinc-300 font-mono font-bold text-zinc-900"
                />
              </div>
              <div>
                <label className="block font-black text-zinc-800 mb-1">Vai Trò Phân Quyền</label>
                <select
                  value={newUserForm.role}
                  onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value as 'user' | 'vip' | 'admin' })}
                  className="w-full p-2.5 rounded-xl border border-zinc-300 font-black text-zinc-900"
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
                  className="px-4 py-2 rounded-xl border border-zinc-300 font-black cursor-pointer text-zinc-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black cursor-pointer shadow-md"
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
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-xs animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="font-black text-sm text-zinc-900 flex items-center gap-1.5">
                  <Edit3 className="w-4 h-4 text-blue-600" /> Sửa Tài Khoản
                </h3>
                <span className="font-mono text-blue-700 font-black">{editingUser.email}</span>
              </div>
              <button onClick={() => setEditingUser(null)} className="text-zinc-400 hover:text-black cursor-pointer font-bold">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3.5">
              <div>
                <label className="block font-black text-zinc-800 mb-1">Họ và Tên</label>
                <input
                  type="text"
                  value={editingUser.fullName}
                  onChange={(e) => setEditingUser({ ...editingUser, fullName: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-zinc-300 font-black text-zinc-900"
                />
              </div>
              <div>
                <label className="block font-black text-zinc-800 mb-1">Số Điện Thoại</label>
                <input
                  type="text"
                  value={editingUser.phone}
                  onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-zinc-300 font-mono font-bold text-zinc-900"
                />
              </div>
              <div>
                <label className="block font-black text-zinc-800 mb-1">Đặt Mật Khẩu Mới (để trống nếu giữ nguyên)</label>
                <input
                  type="text"
                  value={editUserPassword}
                  onChange={(e) => setEditUserPassword(e.target.value)}
                  placeholder="Nhập mật khẩu mới..."
                  className="w-full p-2.5 rounded-xl border border-zinc-300 font-mono font-bold text-zinc-900"
                />
              </div>
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 rounded-xl border border-zinc-300 font-black cursor-pointer text-zinc-700"
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
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black cursor-pointer shadow-md"
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

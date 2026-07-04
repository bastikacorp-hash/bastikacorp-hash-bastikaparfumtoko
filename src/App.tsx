import React, { useState, useEffect } from "react";
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  User 
} from "./firebase";
import {
  seedInitialDataIfEmpty,
  subscribeToCashBalance,
  subscribeToShelves,
  addShelf,
  updateShelf,
  deleteShelf,
  subscribeToPrices,
  updateScentPrice,
  subscribeToStocks,
  updateStockManual,
  subscribeToTransactions,
  addTransaction,
  subscribeToSalaries,
  addSalary,
  deleteSalary,
  subscribeToCashLedger,
  addManualCashMutation,
  subscribeToClients,
  addClientUser,
  deleteClientUser
} from "./dbService";
import { 
  Shelf as ShelfType, 
  ScentPrice, 
  StockItem, 
  Transaction, 
  Salary, 
  CashMutation, 
  UserProfile, 
  UserRole 
} from "./types";
import { 
  ShoppingBag, 
  TrendingUp, 
  Wallet, 
  Users, 
  Layers, 
  Search, 
  Plus, 
  Trash2, 
  Settings, 
  LogOut, 
  Lock, 
  RefreshCw, 
  AlertCircle, 
  Calendar, 
  DollarSign, 
  Package, 
  Box, 
  Check, 
  PlusCircle, 
  ArrowUpRight, 
  ArrowDownRight, 
  Filter, 
  UserPlus, 
  Edit3,
  Sparkles,
  Info
} from "lucide-react";

export default function App() {
  // Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [customEmail, setCustomEmail] = useState("");
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userWhitelist, setUserWhitelist] = useState<UserProfile[]>([]);
  const [authLoading, setAuthLoading] = useState(true);

  // Core Data State
  const [cashBalance, setCashBalance] = useState(0);
  const [shelves, setShelves] = useState<ShelfType[]>([]);
  const [prices, setPrices] = useState<ScentPrice[]>([]);
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [cashLedger, setCashLedger] = useState<CashMutation[]>([]);

  // Navigation / UI State
  const [activeTab, setActiveTab] = useState<string>("dashboard"); // 'dashboard', 'shelves', 'stocks', 'sales', 'purchases', 'accounting', 'users', 'history'
  const [searchTerm, setSearchTerm] = useState("");
  const [syncStatus, setSyncStatus] = useState<"synced" | "offline" | "syncing">("synced");

  // Input forms state
  const [newShelf, setNewShelf] = useState({ rackNumber: "", scentName: "", pricePerMl: 3500 });
  const [editingPrice, setEditingPrice] = useState<{ scentName: string; pricePerMl: number } | null>(null);
  
  // Sales cashier state
  const [saleScent, setSaleScent] = useState("");
  const [saleVolume, setSaleVolume] = useState<number>(0);
  const [saleBottleSize, setSaleBottleSize] = useState("30ml");
  const [saleBottleCount, setSaleBottleCount] = useState<number>(1);
  const [saleTotalPrice, setSaleTotalPrice] = useState<number>(0);
  const [saleDescription, setSaleDescription] = useState("");

  // Purchase stock state
  const [purchaseCategory, setPurchaseCategory] = useState<"bibit" | "alkohol" | "botol" | "other">("bibit");
  const [purchaseScent, setPurchaseScent] = useState("");
  const [purchaseBottleSize, setPurchaseBottleSize] = useState("30ml");
  const [purchaseVolume, setPurchaseVolume] = useState<number>(0);
  const [purchaseCount, setPurchaseCount] = useState<number>(0);
  const [purchasePrice, setPurchasePrice] = useState<number>(0);
  const [purchaseDesc, setPurchaseDesc] = useState("");

  // Salary form state
  const [salEmployee, setSalEmployee] = useState("");
  const [salAmount, setSalAmount] = useState<number>(0);
  const [salMonth, setSalMonth] = useState("");
  const [salNotes, setSalNotes] = useState("");

  // Client whitelisting form state
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientRole, setNewClientRole] = useState<UserRole>("client");

  // Manual cash mutation state
  const [manualMutationType, setManualMutationType] = useState<"in" | "out">("in");
  const [manualMutationAmount, setManualMutationAmount] = useState<number>(0);
  const [manualMutationDesc, setManualMutationDesc] = useState("");

  // Notification Toast state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Show Toast helper
  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Monitor Network connection for Offline Indicator
  useEffect(() => {
    const handleOnline = () => setSyncStatus("synced");
    const handleOffline = () => setSyncStatus("offline");
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    if (!navigator.onLine) setSyncStatus("offline");
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // 1. Authenticated User Listeners
  useEffect(() => {
    setAuthLoading(true);
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        // Seed database once user is authenticated
        seedInitialDataIfEmpty().then(() => {
          showToast("Koneksi cloud terhubung. Database tersinkronisasi.", "info");
        });
      } else {
        setCurrentUser(null);
        setUserRole(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  // 2. Client Whitelist sync & role evaluation
  useEffect(() => {
    const unsubscribe = subscribeToClients((users) => {
      setUserWhitelist(users);
      
      // Determine role of currently logged in user
      const loggedEmail = currentUser ? currentUser.email?.trim().toLowerCase() : customEmail.trim().toLowerCase();
      if (loggedEmail) {
        if (loggedEmail === "bastikacorp@gmail.com") {
          setUserRole("admin");
        } else {
          const userMatch = users.find(u => u.email.toLowerCase() === loggedEmail);
          if (userMatch) {
            setUserRole(userMatch.role);
          } else {
            setUserRole(null); // Not whitelisted
          }
        }
      } else {
        setUserRole(null);
      }
    });
    return () => unsubscribe();
  }, [currentUser, customEmail]);

  // 3. Real-time Subscriptions to DB
  useEffect(() => {
    if (!userRole) return; // Only sync when logged in

    const unsubCash = subscribeToCashBalance(setCashBalance);
    const unsubShelves = subscribeToShelves(setShelves);
    const unsubPrices = subscribeToPrices(setPrices);
    const unsubStocks = subscribeToStocks(setStocks);
    const unsubTx = subscribeToTransactions(setTransactions);
    const unsubSalaries = subscribeToSalaries(setSalaries);
    const unsubLedger = subscribeToCashLedger(setCashLedger);

    return () => {
      unsubCash();
      unsubShelves();
      unsubPrices();
      unsubStocks();
      unsubTx();
      unsubSalaries();
      unsubLedger();
    };
  }, [userRole]);

  // Auto-seed for bypass testing simulation
  useEffect(() => {
    if (customEmail) {
      seedInitialDataIfEmpty();
    }
  }, [customEmail]);

  // Price Calculation Logic for Sales
  useEffect(() => {
    const matchedPrice = prices.find(p => p.scentName === saleScent);
    const pricePerMl = matchedPrice ? matchedPrice.pricePerMl : 0;
    
    // Bottle rates: 30ml = Rp 10.000, 50ml = Rp 15.000, 100ml = Rp 25.000, None = Rp 0
    let bottleFee = 0;
    if (saleBottleSize === "30ml") bottleFee = 10000;
    else if (saleBottleSize === "50ml") bottleFee = 15000;
    else if (saleBottleSize === "100ml") bottleFee = 25000;

    const baseCost = (saleVolume * pricePerMl) + bottleFee;
    const computedTotal = baseCost * saleBottleCount;
    setSaleTotalPrice(computedTotal);
  }, [saleScent, saleVolume, saleBottleSize, saleBottleCount, prices]);

  // Currency Formatter helper (Indonesian Rupiah)
  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(value);
  };

  // Login handler with bypass for sandbox environment
  const handleBypassLogin = (email: string) => {
    setCustomEmail(email);
    showToast(`Berhasil masuk sebagai ${email}`, "success");
    // Default appropriate landing tabs
    if (email === "bastikacorp@gmail.com") {
      setActiveTab("dashboard");
    } else {
      setActiveTab("sales"); // Client defaults to Sales input screen
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      showToast(`Selamat datang, ${result.user.displayName || result.user.email}!`, "success");
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Gagal masuk lewat Google", "error");
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setCustomEmail("");
      setUserRole(null);
      showToast("Berhasil keluar sistem.", "info");
    } catch (err: any) {
      showToast("Gagal keluar", "error");
    }
  };

  // FORM SUBMIT HANDLERS
  const handleAddShelf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShelf.rackNumber || !newShelf.scentName) {
      showToast("Harap isi semua kolom rak!", "error");
      return;
    }
    try {
      await addShelf(newShelf);
      showToast(`Rak ${newShelf.rackNumber} (${newShelf.scentName}) berhasil ditambahkan!`);
      setNewShelf({ rackNumber: "", scentName: "", pricePerMl: 3500 });
    } catch (err: any) {
      showToast(err.message || "Gagal menambahkan rak", "error");
    }
  };

  const handleDeleteShelf = async (id: string, rackNum: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus ${rackNum}?`)) {
      try {
        await deleteShelf(id);
        showToast(`${rackNum} berhasil dihapus.`);
      } catch (err: any) {
        showToast(err.message, "error");
      }
    }
  };

  const handleUpdatePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPrice) return;
    try {
      await updateScentPrice(editingPrice.scentName, editingPrice.pricePerMl);
      showToast(`Harga aroma ${editingPrice.scentName} berhasil diupdate ke Rp ${editingPrice.pricePerMl.toLocaleString()}/ml!`);
      setEditingPrice(null);
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleSalesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleScent) {
      showToast("Harap pilih nama aroma!", "error");
      return;
    }
    if (saleVolume <= 0) {
      showToast("Volume bibit harus di atas 0 ml!", "error");
      return;
    }
    if (saleBottleCount <= 0) {
      showToast("Jumlah botol minimal 1!", "error");
      return;
    }

    const opEmail = currentUser?.email || customEmail || "client_operator@gmail.com";

    try {
      await addTransaction({
        type: "sale",
        category: "bibit",
        date: new Date().toISOString(),
        scentName: saleScent,
        volumeMl: saleVolume,
        bottleSize: saleBottleSize,
        bottleCount: saleBottleCount,
        totalPrice: saleTotalPrice,
        description: saleDescription || `Penjualan bibit ${saleScent} (${saleVolume}ml) + Botol ${saleBottleSize}`,
        operatorEmail: opEmail
      });
      
      showToast("Transaksi Penjualan berhasil disimpan! Stok berkurang otomatis.", "success");
      // Reset form
      setSaleScent("");
      setSaleVolume(0);
      setSaleBottleSize("30ml");
      setSaleBottleCount(1);
      setSaleDescription("");
    } catch (err: any) {
      showToast(err.message || "Gagal mencatat penjualan", "error");
    }
  };

  const handlePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (purchaseCategory === "bibit" && !purchaseScent) {
      showToast("Harap isi/pilih nama aroma bibit!", "error");
      return;
    }
    if (purchaseTotalPriceCalculation() <= 0) {
      showToast("Total harga belanja harus di atas Rp 0!", "error");
      return;
    }

    const opEmail = currentUser?.email || customEmail || "admin_operator@gmail.com";
    const calculatedTotal = purchaseTotalPriceCalculation();

    try {
      await addTransaction({
        type: "purchase",
        category: purchaseCategory,
        date: new Date().toISOString(),
        scentName: purchaseCategory === "bibit" ? purchaseScent : undefined,
        volumeMl: (purchaseCategory === "bibit" || purchaseCategory === "alkohol") ? purchaseVolume : undefined,
        bottleSize: purchaseCategory === "botol" ? purchaseBottleSize : "None",
        bottleCount: purchaseCategory === "botol" ? purchaseCount : undefined,
        totalPrice: calculatedTotal,
        description: purchaseDesc || `Pembelian stok ${purchaseCategory} ${purchaseCategory === 'bibit' ? purchaseScent : purchaseCategory === 'botol' ? purchaseBottleSize : ''}`,
        operatorEmail: opEmail
      });

      showToast(`Pembelian berhasil dicatat! Kas berkurang ${formatRupiah(calculatedTotal)}.`, "success");
      
      // Reset form
      setPurchaseScent("");
      setPurchaseVolume(0);
      setPurchaseCount(0);
      setPurchasePrice(0);
      setPurchaseDesc("");
    } catch (err: any) {
      showToast(err.message || "Gagal mencatat pembelian", "error");
    }
  };

  const purchaseTotalPriceCalculation = () => {
    return purchasePrice; // User inputs standard total price directly
  };

  const handleSalarySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salEmployee || salAmount <= 0 || !salMonth) {
      showToast("Harap lengkapi semua isian gaji!", "error");
      return;
    }

    try {
      await addSalary({
        employeeName: salEmployee,
        amount: salAmount,
        month: salMonth,
        datePaid: new Date().toISOString(),
        notes: salNotes || `Gaji Bulan ${salMonth}`
      });

      showToast(`Gaji ${salEmployee} sebesar ${formatRupiah(salAmount)} berhasil dibayarkan!`);
      setSalEmployee("");
      setSalAmount(0);
      setSalMonth("");
      setSalNotes("");
    } catch (err: any) {
      showToast(err.message || "Gagal membayar gaji", "error");
    }
  };

  const handleDeleteSalary = async (id: string, name: string, amount: number) => {
    if (confirm(`Batalkan pembayaran gaji untuk ${name}? Kas akan dikembalikan.`)) {
      try {
        await deleteSalary(id, amount);
        showToast("Pembayaran gaji dibatalkan.");
      } catch (err: any) {
        showToast(err.message, "error");
      }
    }
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientEmail) {
      showToast("Masukkan alamat email Gmail!", "error");
      return;
    }
    try {
      await addClientUser(newClientEmail, newClientRole);
      showToast(`User ${newClientEmail} terdaftar sebagai ${newClientRole.toUpperCase()}!`);
      setNewClientEmail("");
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleDeleteClient = async (email: string) => {
    if (confirm(`Hapus akses untuk user ${email}?`)) {
      try {
        await deleteClientUser(email);
        showToast(`Akses untuk ${email} berhasil dihapus.`);
      } catch (err: any) {
        showToast(err.message, "error");
      }
    }
  };

  const handleManualMutation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (manualMutationAmount <= 0 || !manualMutationDesc) {
      showToast("Harap isi nominal dan deskripsi mutasi!", "error");
      return;
    }
    try {
      await addManualCashMutation(manualMutationType, manualMutationAmount, manualMutationDesc);
      showToast(`Mutasi kas manual berhasil dicatat!`);
      setManualMutationAmount(0);
      setManualMutationDesc("");
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // FILTERED LISTS
  const filteredShelves = shelves.filter(s => 
    s.rackNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.scentName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPrices = prices.filter(p => 
    p.scentName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredStocks = stocks.filter(s => {
    const term = searchTerm.toLowerCase();
    if (s.type === "essence" && s.scentName) {
      return s.scentName.toLowerCase().includes(term);
    }
    if (s.type === "bottle" && s.size) {
      return `botol ${s.size}`.includes(term);
    }
    return "alkohol".includes(term);
  });

  // ACCOUNTING CALCULATIONS
  const totalSales = transactions
    .filter(t => t.type === "sale")
    .reduce((sum, t) => sum + t.totalPrice, 0);

  const totalPurchases = transactions
    .filter(t => t.type === "purchase")
    .reduce((sum, t) => sum + t.totalPrice, 0);

  const totalSalaries = salaries.reduce((sum, s) => sum + s.amount, 0);

  const netProfit = totalSales - totalPurchases - totalSalaries;

  // Render Login screen if not authenticated
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        <p className="mt-4 text-slate-600 font-medium">Memuat data Bastika Parfum...</p>
      </div>
    );
  }

  // LOGIN SCREEN
  if (!userRole) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 selection:bg-emerald-500 selection:text-white">
        <div className="w-full max-w-md bg-slate-800 rounded-2xl shadow-2xl border border-slate-700/50 p-8 overflow-hidden relative">
          {/* Accent Glow */}
          <div className="absolute top-0 left-1/4 w-1/2 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600 rounded-full"></div>
          
          <div className="flex flex-col items-center mb-8">
            <div className="h-16 w-16 bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-950/40 mb-4 transform hover:scale-105 transition-transform">
              <ShoppingBag className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold font-display text-white tracking-tight text-center">BASTIKA PARFUM</h1>
            <p className="text-emerald-400 font-semibold tracking-widest text-xs uppercase mt-1">Professional Management & POS</p>
            <p className="text-slate-400 text-xs text-center mt-3 leading-relaxed max-w-xs">
              Sistem POS & Akuntansi Cloud Terintegrasi. Mengelola Rak, Inventori, Mutasi Kas, dan Penggajian Toko Parfum.
            </p>
          </div>

          <div className="space-y-6">
            {/* Real Authentication */}
            <button 
              id="google-signin-btn"
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-800 font-semibold py-3 px-4 rounded-xl transition-all duration-150 transform hover:-translate-y-0.5 active:translate-y-0 shadow-lg cursor-pointer"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.9h6.6c-.28 1.5-.1.1.2 1.1-1.12 1.34-3 2.2-6.8 2.2-4.14 0-7.5-3.36-7.5-7.5s3.36-7.5 7.5-7.5c1.86 0 3.55.67 4.88 1.95l2.85-2.85C17.02 1.44 14.65.6 12 .6 5.7.6.6 5.7.6 12s5.1 11.4 11.4 11.4c6.3 0 11.74-5.1 11.74-11.43z"/>
              </svg>
              Masuk dengan Akun Google
            </button>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-700/60"></div>
              <span className="flex-shrink mx-4 text-slate-500 text-xs uppercase tracking-wider font-semibold">Bypass Simulasi Peran</span>
              <div className="flex-grow border-t border-slate-700/60"></div>
            </div>

            {/* Direct Bypass login options for sandbox environment (highly recommended for review and testing) */}
            <div className="bg-slate-900/60 border border-slate-700/30 rounded-xl p-4 space-y-3">
              <p className="text-slate-400 text-[11px] leading-snug">
                *Gunakan tombol di bawah ini untuk mensimulasikan login tanpa popup Google di dalam lingkungan AI Studio:
              </p>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  id="bypass-admin-btn"
                  onClick={() => handleBypassLogin("bastikacorp@gmail.com")}
                  className="bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 font-medium py-2.5 px-3 rounded-lg text-xs transition-colors flex flex-col items-center justify-center gap-1"
                >
                  <span className="font-bold">ADMIN UTAMA</span>
                  <span className="text-[10px] text-slate-400">bastikacorp@gmail.com</span>
                </button>

                <button
                  id="bypass-client-btn"
                  onClick={() => handleBypassLogin("budi@gmail.com")}
                  className="bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600/50 font-medium py-2.5 px-3 rounded-lg text-xs transition-colors flex flex-col items-center justify-center gap-1"
                >
                  <span className="font-bold">CLIENT (KASIR)</span>
                  <span className="text-[10px] text-slate-400">budi@gmail.com</span>
                </button>
              </div>

              <div className="flex gap-2 pt-1">
                <input
                  id="custom-email-input"
                  type="email"
                  placeholder="Atau masukkan email lain..."
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  id="bypass-custom-btn"
                  onClick={() => customEmail ? handleBypassLogin(customEmail) : showToast("Masukkan email dulu!", "error")}
                  className="bg-teal-600 hover:bg-teal-500 text-white font-medium px-3 rounded-lg text-xs transition-colors"
                >
                  Masuk
                </button>
              </div>
            </div>

            {/* Whitelisted emails notice */}
            {currentUser && !userRole && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex gap-3 text-red-300 text-xs leading-relaxed">
                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                <div>
                  <span className="font-bold">Akses Ditolak:</span> Email Anda <span className="font-semibold text-white">({currentUser.email})</span> tidak terdaftar dalam whitelist sistem Bastika Parfum. Hubungi Admin Utama untuk memberikan akses.
                  <button onClick={handleSignOut} className="mt-2 block text-emerald-400 font-bold hover:underline">Keluar & Ganti Akun</button>
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 pt-4 border-t border-slate-700/50 flex justify-between items-center text-[10px] text-slate-500">
            <span>BASTIKA PARFUM v1.0.0</span>
            <span>Cloud Sync Powered</span>
          </div>
        </div>
      </div>
    );
  }

  // MAIN DASHBOARD LAYOUT
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-800 selection:bg-emerald-500 selection:text-white font-sans">
      {/* Toast Notification */}
      {toast && (
        <div id="toast-notif" className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 py-3 px-5 rounded-xl shadow-2xl border transition-all duration-300 transform translate-y-0 ${
          toast.type === "success" ? "bg-emerald-900 text-emerald-100 border-emerald-700" :
          toast.type === "error" ? "bg-rose-950 text-rose-100 border-rose-800" :
          "bg-slate-900 text-slate-100 border-slate-700"
        }`}>
          {toast.type === "success" && <Check className="h-5 w-5 text-emerald-400" />}
          {toast.type === "error" && <AlertCircle className="h-5 w-5 text-rose-400" />}
          {toast.type === "info" && <Info className="h-5 w-5 text-teal-400" />}
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 shrink-0">
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-xl flex items-center justify-center shadow-md">
              <ShoppingBag className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold font-display text-white tracking-tight text-sm">BASTIKA PARFUM</h2>
              <span className="text-[10px] text-emerald-400 font-semibold tracking-wider uppercase">Online Cloud DB</span>
            </div>
          </div>
          {/* Connection status badge */}
          <div className="flex items-center">
            <span className={`h-2.5 w-2.5 rounded-full ${
              syncStatus === "synced" ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
            }`} title={syncStatus === "synced" ? "Tersambung ke Cloud Firestore" : "Koneksi Offline (Caching aktif)"}></span>
          </div>
        </div>

        {/* Current User Info */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-white font-bold text-xs uppercase">
              {(currentUser?.email || customEmail || "U").substring(0, 2)}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-white truncate">{currentUser?.email || customEmail}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                  userRole === "admin" ? "bg-emerald-950 text-emerald-300 border border-emerald-800" : "bg-slate-800 text-slate-400 border border-slate-700"
                }`}>
                  {userRole}
                </span>
                {syncStatus === "offline" && (
                  <span className="text-[8px] text-amber-400 font-bold uppercase">(Offline Mode)</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          <p className="text-[10px] font-bold text-slate-500 px-3 uppercase tracking-wider mb-2">Menu Utama</p>
          
          {userRole === "admin" && (
            <button
              id="nav-dashboard-btn"
              onClick={() => setActiveTab("dashboard")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                activeTab === "dashboard" ? "bg-emerald-600 text-white font-bold" : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              Dashboard & Laba
            </button>
          )}

          <button
            id="nav-shelves-btn"
            onClick={() => setActiveTab("shelves")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
              activeTab === "shelves" ? "bg-emerald-600 text-white font-bold" : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Layers className="h-4 w-4" />
            Sistem Rak Aroma
          </button>

          <button
            id="nav-stocks-btn"
            onClick={() => setActiveTab("stocks")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
              activeTab === "stocks" ? "bg-emerald-600 text-white font-bold" : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Box className="h-4 w-4" />
            Inventori Stok Master
          </button>

          <button
            id="nav-sales-btn"
            onClick={() => setActiveTab("sales")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
              activeTab === "sales" ? "bg-emerald-600 text-white font-bold" : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <PlusCircle className="h-4 w-4" />
            Input Penjualan (Kasir)
          </button>

          {userRole === "admin" && (
            <>
              <button
                id="nav-purchases-btn"
                onClick={() => setActiveTab("purchases")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === "purchases" ? "bg-emerald-600 text-white font-bold" : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <ArrowDownRight className="h-4 w-4" />
                Catat Belanja Stok
              </button>

              <p className="text-[10px] font-bold text-slate-500 px-3 uppercase tracking-wider pt-4 mb-2">Keuangan & Akses</p>

              <button
                id="nav-accounting-btn"
                onClick={() => setActiveTab("accounting")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === "accounting" ? "bg-emerald-600 text-white font-bold" : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Wallet className="h-4 w-4" />
                Akuntansi & Kas Besar
              </button>

              <button
                id="nav-users-btn"
                onClick={() => setActiveTab("users")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === "users" ? "bg-emerald-600 text-white font-bold" : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Users className="h-4 w-4" />
                Hak Akses Client
              </button>
            </>
          )}

          <button
            id="nav-history-btn"
            onClick={() => setActiveTab("history")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
              activeTab === "history" ? "bg-emerald-600 text-white font-bold" : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Calendar className="h-4 w-4" />
            Riwayat Transaksi
          </button>
        </nav>

        {/* Footer info & Logout */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <button
            id="logout-btn"
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-red-950 hover:text-red-300 hover:border-red-900 border border-slate-700 text-slate-300 text-xs font-semibold py-2 px-3 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            Keluar Sistem
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="bg-white border-b border-slate-200 py-4 px-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 shrink-0">
          <div>
            <h1 className="text-xl font-bold font-display text-slate-900 tracking-tight flex items-center gap-2">
              <span>{activeTab === 'dashboard' ? 'Ringkasan Laba & Omset' :
                     activeTab === 'shelves' ? 'Manajemen Rak Aroma' :
                     activeTab === 'stocks' ? 'Manajemen Stok & Inventori' :
                     activeTab === 'sales' ? 'Kasir Penjualan Parfum' :
                     activeTab === 'purchases' ? 'Pencatatan Belanja Stok' :
                     activeTab === 'accounting' ? 'Buku Kas & Laporan Keuangan' :
                     activeTab === 'users' ? 'Manajemen Akses Karyawan (Client)' :
                     'Riwayat Semua Mutasi'}</span>
              <span className="text-xs font-normal text-slate-500">| Bastika Parfum</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">Sistem data real-time, sinkron otomatis ke seluruh perangkat.</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Real-time Indicator status */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-semibold ${
              syncStatus === "synced" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-800 border-amber-200"
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${syncStatus === 'synced' ? 'bg-emerald-500' : 'bg-amber-500 animate-ping'}`} />
              {syncStatus === "synced" ? "Cloud Connected" : "Local Caching (Offline)"}
            </div>

            {/* Quick search bar for specific views */}
            {["shelves", "stocks", "history"].includes(activeTab) && (
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  id="navbar-search-input"
                  type="text"
                  placeholder="Cari..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-slate-100 focus:bg-white border border-transparent focus:border-slate-300 rounded-xl pl-9 pr-4 py-2 text-xs w-48 transition-all focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            )}
          </div>
        </header>

        {/* Dashboard content workspace container */}
        <div className="flex-1 p-6 overflow-y-auto">
          
          {/* ==========================================
              1. DASHBOARD VIEW (Admin Only)
              ========================================== */}
          {activeTab === "dashboard" && userRole === "admin" && (
            <div className="space-y-6">
              
              {/* Financial Metrics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                
                {/* Total Cash Balance (Kas Besar) */}
                <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-lg relative overflow-hidden">
                  <div className="absolute right-3 top-3 h-10 w-10 bg-slate-800/60 rounded-xl flex items-center justify-center">
                    <Wallet className="h-5 w-5 text-emerald-400" />
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Saldo Kas Besar</p>
                  <p className="text-lg font-bold mt-2 font-mono text-emerald-400 leading-tight">
                    {formatRupiah(cashBalance)}
                  </p>
                  <div className="mt-3 flex items-center gap-1 text-[10px] text-slate-300">
                    <Check className="h-3 w-3 text-emerald-400" />
                    <span>Real-time terupdate</span>
                  </div>
                </div>

                {/* Total Sales (Omset Kotor) */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden">
                  <div className="absolute right-3 top-3 h-10 w-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Penjualan</p>
                  <p className="text-lg font-bold mt-2 font-mono text-slate-900 leading-tight">
                    {formatRupiah(totalSales)}
                  </p>
                  <div className="mt-3 flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                    <ArrowUpRight className="h-3 w-3" />
                    <span>{transactions.filter(t => t.type === "sale").length} transaksi penjualan</span>
                  </div>
                </div>

                {/* Total Purchases (Pengeluaran Belanja) */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden">
                  <div className="absolute right-3 top-3 h-10 w-10 bg-rose-50 rounded-xl flex items-center justify-center">
                    <ArrowDownRight className="h-5 w-5 text-rose-600" />
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Belanja Bibit & Botol</p>
                  <p className="text-lg font-bold mt-2 font-mono text-slate-900 leading-tight">
                    {formatRupiah(totalPurchases)}
                  </p>
                  <div className="mt-3 flex items-center gap-1 text-[10px] text-rose-600 font-medium">
                    <ArrowDownRight className="h-3 w-3" />
                    <span>{transactions.filter(t => t.type === "purchase").length} transaksi belanja</span>
                  </div>
                </div>

                {/* Total Salaries (Pengurang Laba) */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden">
                  <div className="absolute right-3 top-3 h-10 w-10 bg-amber-50 rounded-xl flex items-center justify-center">
                    <Users className="h-5 w-5 text-amber-600" />
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Beban Gaji Karyawan</p>
                  <p className="text-lg font-bold mt-2 font-mono text-slate-900 leading-tight">
                    {formatRupiah(totalSalaries)}
                  </p>
                  <div className="mt-3 flex items-center gap-1 text-[10px] text-amber-600 font-medium">
                    <span>{salaries.length} karyawan terbayar</span>
                  </div>
                </div>

                {/* Net Profit (Laba Bersih) */}
                <div className={`rounded-2xl p-5 border shadow-lg relative overflow-hidden ${
                  netProfit >= 0 ? "bg-emerald-50 border-emerald-200 text-emerald-950" : "bg-rose-50 border-rose-200 text-rose-950"
                }`}>
                  <div className="absolute right-3 top-3 h-10 w-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-emerald-700" />
                  </div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Laba Bersih Otomatis</p>
                  <p className="text-lg font-bold mt-2 font-mono leading-tight">
                    {formatRupiah(netProfit)}
                  </p>
                  <div className="mt-3 flex items-center gap-1 text-[10px] font-semibold">
                    <span>Laba Bersih = Omset - Belanja - Gaji</span>
                  </div>
                </div>

              </div>

              {/* Graphical Analysis & Alert Box */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Visual Mutation Bar Chart */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm lg:col-span-2">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">Performa Keuangan Usaha</h3>
                      <p className="text-[11px] text-slate-500">Visualisasi pemasukan vs pengeluaran terakumulasi real-time.</p>
                    </div>
                    <span className="text-[10px] bg-slate-100 px-2 py-1 rounded font-bold text-slate-600 font-mono">2026-07-01 Current</span>
                  </div>

                  {/* SVG Custom Bar chart */}
                  <div className="h-48 flex items-end justify-around gap-4 pt-6 border-b border-slate-200">
                    <div className="flex flex-col items-center w-24">
                      <div 
                        style={{ height: `${Math.min(100, Math.max(10, (totalSales / (totalSales + totalPurchases + totalSalaries || 1)) * 140))}px` }}
                        className="w-full bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-lg shadow-sm"
                      ></div>
                      <span className="text-[10px] font-bold text-slate-700 mt-2">Penjualan</span>
                      <span className="text-[9px] font-mono text-slate-500">{formatRupiah(totalSales)}</span>
                    </div>

                    <div className="flex flex-col items-center w-24">
                      <div 
                        style={{ height: `${Math.min(100, Math.max(10, (totalPurchases / (totalSales + totalPurchases + totalSalaries || 1)) * 140))}px` }}
                        className="w-full bg-gradient-to-t from-rose-600 to-rose-400 rounded-t-lg shadow-sm"
                      ></div>
                      <span className="text-[10px] font-bold text-slate-700 mt-2">Belanja</span>
                      <span className="text-[9px] font-mono text-slate-500">{formatRupiah(totalPurchases)}</span>
                    </div>

                    <div className="flex flex-col items-center w-24">
                      <div 
                        style={{ height: `${Math.min(100, Math.max(10, (totalSalaries / (totalSales + totalPurchases + totalSalaries || 1)) * 140))}px` }}
                        className="w-full bg-gradient-to-t from-amber-600 to-amber-400 rounded-t-lg shadow-sm"
                      ></div>
                      <span className="text-[10px] font-bold text-slate-700 mt-2">Gaji</span>
                      <span className="text-[9px] font-mono text-slate-500">{formatRupiah(totalSalaries)}</span>
                    </div>
                  </div>
                </div>

                {/* Low Stock Alerts & Overview */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 mb-4 flex items-center gap-2">
                      <AlertCircle className="h-4.5 w-4.5 text-amber-500" />
                      Peringatan Stok Rendah
                    </h3>
                    <div className="space-y-3 overflow-y-auto max-h-48">
                      {stocks.filter(s => s.quantity < (s.type === "essence" ? 100 : s.type === "bottle" ? 15 : 1000)).map(s => (
                        <div key={s.id} className="flex justify-between items-center bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs">
                          <div>
                            <span className="font-bold text-amber-900">
                              {s.type === "essence" ? `Bibit ${s.scentName}` : s.type === "bottle" ? `Botol ${s.size}` : "Alkohol"}
                            </span>
                            <p className="text-[10px] text-amber-700">Perlu re-stock segera!</p>
                          </div>
                          <span className="font-mono font-bold bg-amber-200 text-amber-900 px-2.5 py-1 rounded-lg">
                            {s.quantity} {s.type === "essence" || s.type === "alcohol" ? "ml" : "unit"}
                          </span>
                        </div>
                      ))}
                      {stocks.filter(s => s.quantity < (s.type === "essence" ? 100 : s.type === "bottle" ? 15 : 1000)).length === 0 && (
                        <div className="text-center py-6 text-slate-400">
                          <Check className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                          <p className="text-xs font-semibold">Semua stok aman & memadai.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>Total Scent terdata:</span>
                    <span className="font-bold font-mono text-slate-800">{prices.length} aroma</span>
                  </div>
                </div>

              </div>

              {/* Professional Manual Cash Mutation Form & Fast Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Manual Kas Mutation input */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                  <h3 className="font-bold text-sm text-slate-900 mb-4 flex items-center gap-2">
                    <PlusCircle className="h-4.5 w-4.5 text-emerald-600" />
                    Catat Mutasi Kas Manual (Injeksi Modal / Operasional)
                  </h3>
                  
                  <form onSubmit={handleManualMutation} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setManualMutationType("in")}
                        className={`py-2 px-4 rounded-xl border text-xs font-bold transition-all ${
                          manualMutationType === "in" 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-400" 
                            : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        Uang Masuk (Debit)
                      </button>
                      <button
                        type="button"
                        onClick={() => setManualMutationType("out")}
                        className={`py-2 px-4 rounded-xl border text-xs font-bold transition-all ${
                          manualMutationType === "out" 
                            ? "bg-rose-50 text-rose-700 border-rose-400" 
                            : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        Uang Keluar (Kredit)
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nominal (Rupiah)</label>
                        <input
                          id="manual-mutation-amount"
                          type="number"
                          placeholder="Contoh: 500000"
                          value={manualMutationAmount || ""}
                          onChange={(e) => setManualMutationAmount(Number(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Deskripsi / Keterangan</label>
                        <input
                          id="manual-mutation-desc"
                          type="text"
                          placeholder="Injeksi modal / Operasional..."
                          value={manualMutationDesc}
                          onChange={(e) => setManualMutationDesc(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                        />
                      </div>
                    </div>

                    <button
                      id="save-manual-mutation"
                      type="submit"
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-2"
                    >
                      <span>Simpan Mutasi Kas</span>
                    </button>
                  </form>
                </div>

                {/* Quick Info panel explaining architecture */}
                <div className="bg-slate-900 text-slate-300 rounded-2xl p-6 border border-slate-800 shadow-lg relative overflow-hidden flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-white mb-2 flex items-center gap-2">
                      <Sparkles className="h-4.5 w-4.5 text-emerald-400" />
                      Arsitektur BASTIKA PARFUM Cloud Sync
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Sistem dirancang dengan arsitektur modern MVVM yang didukung oleh **Google Cloud Firestore**. Seluruh data transaksi penjualan, stok, dan kas besar tersimpan di cloud terenkripsi.
                    </p>
                    <ul className="text-[11px] space-y-2 mt-4 text-slate-400 list-disc list-inside">
                      <li>**Real-time Synchronization**: Setiap perubahan data harga master atau transaksi akan disinkronisasikan ke seluruh perangkat kasir dalam waktu kurang dari 1 detik.</li>
                      <li>**Offline Caching**: Jika toko kehilangan sinyal, aplikasi menyimpan data secara lokal pada IndexedDB. Data akan terkirim otomatis saat koneksi internet kembali pulih.</li>
                      <li>**Keamanan Multi-Level**: Akuntansi laba bersih, buku kas, beban gaji, serta pengelolaan whitelist user dienkripsi dan diatur ketat oleh aturan security rules Firebase.</li>
                    </ul>
                  </div>
                  <div className="pt-4 border-t border-slate-800 text-[10px] text-slate-500 flex justify-between">
                    <span>Database ID: ai-studio-bastikaparfumbus</span>
                    <span>Role: {userRole?.toUpperCase()}</span>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ==========================================
              2. SISTEM RAK VIEW
              ========================================== */}
          {activeTab === "shelves" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Add Rack Position Form (Admin Only) */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm h-fit">
                  <h3 className="font-bold text-sm text-slate-900 mb-4 flex items-center gap-2">
                    <Plus className="h-4 w-4 text-emerald-600" />
                    {userRole === 'admin' ? 'Tambah Posisi Rak Aroma Baru' : 'Info Hak Akses'}
                  </h3>
                  
                  {userRole === 'admin' ? (
                    <form onSubmit={handleAddShelf} className="space-y-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nomor / Posisi Rak</label>
                        <input
                          id="shelf-rack-input"
                          type="text"
                          placeholder="Contoh: Rak A-01, Rak C-05"
                          value={newShelf.rackNumber}
                          onChange={(e) => setNewShelf({ ...newShelf, rackNumber: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nama Aroma / Scent</label>
                        <input
                          id="shelf-scent-input"
                          type="text"
                          placeholder="Contoh: Bacarat Rouge, Black Opium"
                          value={newShelf.scentName}
                          onChange={(e) => setNewShelf({ ...newShelf, scentName: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Harga jual per ML (Rupiah)</label>
                        <input
                          id="shelf-price-input"
                          type="number"
                          placeholder="Contoh: 3500"
                          value={newShelf.pricePerMl || ""}
                          onChange={(e) => setNewShelf({ ...newShelf, pricePerMl: Number(e.target.value) })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                        />
                      </div>

                      <button
                        id="save-shelf-btn"
                        type="submit"
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Plus className="h-4 w-4" />
                        Simpan ke Rak
                      </button>
                    </form>
                  ) : (
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-xs text-amber-900 leading-relaxed flex gap-3">
                      <Lock className="h-5 w-5 text-amber-600 flex-shrink-0" />
                      <div>
                        <span className="font-bold">Akses Terbatas (Client):</span> Anda hanya memiliki hak untuk membaca sistem penomoran rak dan melakukan pencarian aroma. Pengeditan posisi rak dan harga jual hanya bisa dilakukan oleh Admin.
                      </div>
                    </div>
                  )}

                  {/* MASTER PRICE UPDATE FORM (Admin Only) */}
                  {userRole === "admin" && (
                    <div className="mt-8 pt-8 border-t border-slate-100">
                      <h3 className="font-bold text-sm text-slate-900 mb-3 flex items-center gap-2">
                        <Edit3 className="h-4.5 w-4.5 text-emerald-600" />
                        Update Harga Scent Master
                      </h3>
                      <p className="text-[11px] text-slate-500 mb-4">Jika diubah, harga jual bibit akan otomatis terupdate ke seluruh rak yang terkait.</p>
                      
                      {editingPrice ? (
                        <form onSubmit={handleUpdatePrice} className="space-y-4">
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                            <span className="block text-[10px] font-bold text-slate-400">Aroma Dipilih:</span>
                            <span className="text-xs font-bold text-slate-800">{editingPrice.scentName}</span>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Harga jual per ML baru (Rp)</label>
                            <input
                              id="edit-price-input"
                              type="number"
                              value={editingPrice.pricePerMl || ""}
                              onChange={(e) => setEditingPrice({ ...editingPrice, pricePerMl: Number(e.target.value) })}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                            />
                          </div>

                          <div className="flex gap-2">
                            <button
                              id="save-update-price-btn"
                              type="submit"
                              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-3 rounded-lg text-xs transition-colors"
                            >
                              Simpan Update
                            </button>
                            <button
                              id="cancel-update-price-btn"
                              type="button"
                              onClick={() => setEditingPrice(null)}
                              className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2 px-3 rounded-lg text-xs transition-colors"
                            >
                              Batal
                            </button>
                          </div>
                        </form>
                      ) : (
                        <p className="text-[11px] text-slate-400 italic">Pilih aroma di tabel kanan untuk mengubah harga master.</p>
                      )}
                    </div>
                  )}

                </div>

                {/* Rak List Table */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm lg:col-span-2">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">Tata Letak Posisi Rak Parfum</h3>
                      <p className="text-[11px] text-slate-500">Mencari letak nomor rak dan aroma parfum yang tersedia.</p>
                    </div>
                    <span className="text-xs bg-slate-100 px-2.5 py-1 rounded-full font-semibold text-slate-600">{filteredShelves.length} rak</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                          <th className="py-3 px-4">Nomor Rak</th>
                          <th className="py-3 px-4">Nama Aroma Scent</th>
                          <th className="py-3 px-4">Harga Jual / ML</th>
                          {userRole === "admin" && <th className="py-3 px-4 text-right">Aksi</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredShelves.map((s) => (
                          <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3 px-4 font-bold text-slate-900">{s.rackNumber}</td>
                            <td className="py-3 px-4 font-medium text-slate-800 flex items-center gap-2">
                              {s.scentName}
                              {userRole === "admin" && (
                                <button 
                                  onClick={() => setEditingPrice({ scentName: s.scentName, pricePerMl: s.pricePerMl })}
                                  className="text-slate-400 hover:text-emerald-600 p-0.5 rounded transition-colors"
                                  title="Edit Harga Aroma"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-emerald-700">{formatRupiah(s.pricePerMl)}</td>
                            {userRole === "admin" && (
                              <td className="py-3 px-4 text-right">
                                <button
                                  onClick={() => handleDeleteShelf(s.id, s.rackNumber)}
                                  className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg transition-colors cursor-pointer"
                                  title="Hapus Rak"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                        {filteredShelves.length === 0 && (
                          <tr>
                            <td colSpan={userRole === 'admin' ? 4 : 3} className="py-8 text-center text-slate-400 italic">
                              Tidak ada letak rak atau aroma yang cocok dengan pencarian Anda.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ==========================================
              3. MASTER STOK VIEW
              ========================================== */}
          {activeTab === "stocks" && (
            <div className="space-y-6">
              
              {/* Stok Cards Visual representation */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Bibit card total */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Aroma Bibit Parfum</span>
                    <h4 className="text-2xl font-extrabold text-slate-900 font-mono mt-1">
                      {stocks.filter(s => s.type === "essence").reduce((sum, s) => sum + s.quantity, 0).toLocaleString("id-ID")} ml
                    </h4>
                    <p className="text-[10px] text-slate-500 mt-2">Terbagi dalam {stocks.filter(s => s.type === "essence").length} jenis bibit terdaftar.</p>
                  </div>
                  <div className="h-12 w-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                    <Sparkles className="h-6 w-6" />
                  </div>
                </div>

                {/* Alkohol card total */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Stok Utama Alkohol</span>
                    <h4 className="text-2xl font-extrabold text-slate-900 font-mono mt-1">
                      {(stocks.find(s => s.id === "alcohol_main")?.quantity || 0).toLocaleString("id-ID")} ml
                    </h4>
                    <p className="text-[10px] text-slate-500 mt-2">Disediakan free bundling untuk campuran racikan.</p>
                  </div>
                  <div className="h-12 w-12 bg-teal-50 rounded-xl flex items-center justify-center text-teal-600">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                </div>

                {/* Botol card total */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Stok Botol Kosong</span>
                    <h4 className="text-2xl font-extrabold text-slate-900 font-mono mt-1">
                      {stocks.filter(s => s.type === "bottle").reduce((sum, s) => sum + s.quantity, 0)} unit
                    </h4>
                    <p className="text-[10px] text-slate-500 mt-2">Mencakup botol ukuran 30ml, 50ml, dan 100ml.</p>
                  </div>
                  <div className="h-12 w-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                    <Package className="h-6 w-6" />
                  </div>
                </div>
              </div>

              {/* Master Stok Grid / Tables */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Bibit Parfum Master Table */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">Stok Bibit Parfum (ml)</h3>
                      <p className="text-[11px] text-slate-500">Jumlah ml cairan bibit per jenis aroma yang tersedia.</p>
                    </div>
                    {userRole === 'admin' && <span className="text-[10px] text-emerald-600 font-semibold">*Admin dapat mengubah angka secara manual</span>}
                  </div>

                  <div className="overflow-x-auto max-h-96">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                          <th className="py-3 px-4">Nama Aroma Bibit</th>
                          <th className="py-3 px-4 text-right">Volume Sisa (ml)</th>
                          {userRole === "admin" && <th className="py-3 px-4 text-right">Sesuaikan Stok</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredStocks.filter(s => s.type === "essence").map((s) => (
                          <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3 px-4 font-bold text-slate-800">{s.scentName}</td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                              <span className={`px-2 py-1 rounded-md ${
                                s.quantity < 100 ? "bg-rose-50 text-rose-700 border border-rose-100 animate-pulse" : ""
                              }`}>
                                {s.quantity} ml
                              </span>
                            </td>
                            {userRole === "admin" && (
                              <td className="py-3 px-4 text-right">
                                <input
                                  type="number"
                                  defaultValue={s.quantity}
                                  onBlur={(e) => updateStockManual(s.id, Number(e.target.value))}
                                  className="w-20 bg-slate-100 border border-transparent rounded px-2 py-1 font-mono text-center focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs"
                                  title="Masukkan angka lalu klik luar kotak untuk menyimpan"
                                />
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Bottles & Alcohol Stocks */}
                <div className="space-y-6">
                  {/* Bottle Stock */}
                  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-sm text-slate-900">Stok Botol & Alkohol</h3>
                        <p className="text-[11px] text-slate-500">Mencatat ketersediaan botol kosong dan cairan pelarut alkohol.</p>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                            <th className="py-3 px-4">Nama Barang</th>
                            <th className="py-3 px-4 text-right">Stok Saat Ini</th>
                            {userRole === "admin" && <th className="py-3 px-4 text-right">Sesuaikan Stok</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {stocks.filter(s => s.type === "bottle" || s.type === "alcohol").map((s) => (
                            <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-3 px-4 font-bold text-slate-800">
                                {s.type === "alcohol" ? "Cairan Alkohol (Utama)" : `Botol Parfum Ukuran ${s.size}`}
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                                <span className={`px-2 py-1 rounded-md ${
                                  s.quantity < (s.type === "alcohol" ? 1000 : 15) ? "bg-rose-50 text-rose-700 border border-rose-100" : ""
                                }`}>
                                  {s.quantity} {s.type === "alcohol" ? "ml" : "unit"}
                                </span>
                              </td>
                              {userRole === "admin" && (
                                <td className="py-3 px-4 text-right">
                                  <input
                                    type="number"
                                    defaultValue={s.quantity}
                                    onBlur={(e) => updateStockManual(s.id, Number(e.target.value))}
                                    className="w-20 bg-slate-100 border border-transparent rounded px-2 py-1 font-mono text-center focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs"
                                    title="Masukkan angka lalu klik luar kotak untuk menyimpan"
                                  />
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Stock Alert explanation box */}
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-amber-900 flex gap-3 text-xs leading-relaxed">
                    <Info className="h-5 w-5 text-amber-600 flex-shrink-0" />
                    <div>
                      <span className="font-bold">Informasi Stok Otomatis:</span> Stok akan berkurang secara real-time setiap kali kasir menginput data Penjualan. Untuk pencatatan belanja (Pembelian), stok bibit parfum atau botol akan bertambah secara otomatis sesuai dengan isian kategori belanja.
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ==========================================
              4. INPUT PENJUALAN (KASIR) VIEW
              ========================================== */}
          {activeTab === "sales" && (
            <div className="max-w-3xl mx-auto space-y-6">
              
              <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
                <div className="bg-slate-900 text-white p-6 flex justify-between items-center">
                  <div>
                    <h2 className="text-base font-bold font-display">KASIR BASTIKA PARFUM</h2>
                    <p className="text-[11px] text-slate-400">Pencatatan Penjualan Parfum (Stok Bibit & Botol Berkurang Otomatis)</p>
                  </div>
                  <span className="text-[11px] font-mono bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 font-bold px-2 py-1 rounded">
                    Real-time POS
                  </span>
                </div>

                <form onSubmit={handleSalesSubmit} className="p-6 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Scent selection */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Aroma / Scent Parfum</label>
                      <select
                        id="sales-scent-select"
                        value={saleScent}
                        onChange={(e) => setSaleScent(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-slate-800"
                      >
                        <option value="">-- Pilih Aroma --</option>
                        {prices.map(p => (
                          <option key={p.scentName} value={p.scentName}>
                            {p.scentName} ({formatRupiah(p.pricePerMl)} / ml)
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Volume (ml) */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Volume Bibit (ml)</label>
                      <input
                        id="sales-volume-input"
                        type="number"
                        placeholder="Volume cairan bibit (ml)"
                        value={saleVolume || ""}
                        onChange={(e) => setSaleVolume(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Bottle size selection */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Ukuran Botol (Kemasan)</label>
                      <select
                        id="sales-bottle-select"
                        value={saleBottleSize}
                        onChange={(e) => setSaleBottleSize(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-slate-800"
                      >
                        <option value="30ml">Botol 30ml (Rp 10.000)</option>
                        <option value="50ml">Botol 50ml (Rp 15.000)</option>
                        <option value="100ml">Botol 100ml (Rp 25.000)</option>
                        <option value="None">Tanpa Botol (Hanya Refill)</option>
                      </select>
                    </div>

                    {/* Bottle count */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Jumlah Botol (Unit)</label>
                      <input
                        id="sales-count-input"
                        type="number"
                        min="1"
                        placeholder="Jumlah pesanan botol"
                        value={saleBottleCount || ""}
                        onChange={(e) => setSaleBottleCount(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                      />
                    </div>
                  </div>

                  {/* Optional Description / Memo */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Keterangan / Catatan Transaksi (Opsional)</label>
                    <input
                      id="sales-desc-input"
                      type="text"
                      placeholder="Contoh: Pesanan aroma soft, campur alkohol standar..."
                      value={saleDescription}
                      onChange={(e) => setSaleDescription(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                    />
                  </div>

                  {/* Calculations & Total Display Box */}
                  <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="text-center sm:text-left">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Perhitungan Total Harga</span>
                      <p className="text-xs text-slate-600 mt-1 leading-snug">
                        {saleScent ? `Bibit ${saleScent}: ${saleVolume}ml x Rp ${prices.find(p => p.scentName === saleScent)?.pricePerMl.toLocaleString() || '0'}` : '-- belum pilih aroma --'}<br />
                        {saleBottleSize !== "None" ? `Botol ${saleBottleSize} x ${saleBottleCount}` : "Hanya Refill"} (Alkohol Free / Bundling)
                      </p>
                    </div>
                    <div className="text-center sm:text-right bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-2.5">
                      <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Total Penjualan</span>
                      <p className="text-xl font-mono font-black text-emerald-700 leading-tight">
                        {formatRupiah(saleTotalPrice)}
                      </p>
                    </div>
                  </div>

                  <button
                    id="submit-sale-btn"
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3.5 px-4 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Check className="h-4.5 w-4.5" />
                    SIMPAN & PROSES TRANSAKSI PENJUALAN
                  </button>
                </form>
              </div>

            </div>
          )}

          {/* ==========================================
              5. CATAT BELANJA STOK (Admin Only)
              ========================================== */}
          {activeTab === "purchases" && userRole === "admin" && (
            <div className="max-w-3xl mx-auto space-y-6">
              
              <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
                <div className="bg-slate-900 text-white p-6 flex justify-between items-center">
                  <div>
                    <h2 className="text-base font-bold font-display">CATAT BELANJA STOK MASTER</h2>
                    <p className="text-[11px] text-slate-400">Pembelian baru yang menambah stok bibit/botol/alkohol, mengurangi kas toko</p>
                  </div>
                  <span className="text-[11px] font-mono bg-rose-600/20 text-rose-400 border border-rose-500/30 font-bold px-2 py-1 rounded">
                    Uang Keluar (Kredit)
                  </span>
                </div>

                <form onSubmit={handlePurchaseSubmit} className="p-6 space-y-5">
                  
                  {/* Category select */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Kategori Pembelian Barang</label>
                    <div className="grid grid-cols-4 gap-2">
                      {(["bibit", "botol", "alkohol", "other"] as const).map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setPurchaseCategory(cat)}
                          className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all uppercase tracking-wider ${
                            purchaseCategory === cat 
                              ? "bg-slate-900 text-white border-slate-900" 
                              : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Category specific fields */}
                    {purchaseCategory === "bibit" && (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Aroma Bibit Parfum (Masukkan Nama)</label>
                        <input
                          id="purchase-scent-input"
                          type="text"
                          placeholder="Contoh: Bacarat Rouge, Bulgari..."
                          value={purchaseScent}
                          onChange={(e) => setPurchaseScent(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                        />
                      </div>
                    )}

                    {purchaseCategory === "botol" && (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Ukuran Botol Kosong</label>
                        <select
                          id="purchase-bottle-select"
                          value={purchaseBottleSize}
                          onChange={(e) => setPurchaseBottleSize(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-slate-800"
                        >
                          <option value="30ml">Botol 30ml</option>
                          <option value="50ml">Botol 50ml</option>
                          <option value="100ml">Botol 100ml</option>
                        </select>
                      </div>
                    )}

                    {(purchaseCategory === "bibit" || purchaseCategory === "alkohol") && (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Volume Tambah (ml)</label>
                        <input
                          id="purchase-volume-input"
                          type="number"
                          placeholder="Masukkan volume cairan (ml)"
                          value={purchaseVolume || ""}
                          onChange={(e) => setPurchaseVolume(Number(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                        />
                      </div>
                    )}

                    {purchaseCategory === "botol" && (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Jumlah Botol Baru (Unit)</label>
                        <input
                          id="purchase-count-input"
                          type="number"
                          placeholder="Contoh: 100"
                          value={purchaseCount || ""}
                          onChange={(e) => setPurchaseCount(Number(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                        />
                      </div>
                    )}

                    {/* Total spent on purchase */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Biaya Belanja (Rupiah)</label>
                      <input
                        id="purchase-total-price-input"
                        type="number"
                        placeholder="Contoh: 1250000"
                        value={purchasePrice || ""}
                        onChange={(e) => setPurchasePrice(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                      />
                    </div>
                  </div>

                  {/* Keterangan / Memo */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Keterangan / Catatan Belanja (Opsional)</label>
                    <input
                      id="purchase-desc-input"
                      type="text"
                      placeholder="Contoh: Belanja bibit ke agen parfum utama Jakarta..."
                      value={purchaseDesc}
                      onChange={(e) => setPurchaseDesc(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                    />
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-950 flex gap-3 leading-relaxed">
                    <Info className="h-5 w-5 text-amber-600 flex-shrink-0" />
                    <div>
                      <span className="font-bold">Keamanan Finansial:</span> Transaksi belanja ini memerlukan ketersediaan uang di kas utama toko. Nilai kas besar akan langsung dipotong secara otomatis sebesar total pengeluaran belanja yang dimasukkan.
                    </div>
                  </div>

                  <button
                    id="submit-purchase-btn"
                    type="submit"
                    className="w-full bg-rose-600 hover:bg-rose-500 text-white font-extrabold py-3.5 px-4 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ArrowDownRight className="h-4.5 w-4.5" />
                    SIMPAN & PROSES PENAMBAHAN STOK BELANJA
                  </button>
                </form>
              </div>

            </div>
          )}

          {/* ==========================================
              6. AKUNTANSI & KAS BESAR (Admin Only)
              ========================================== */}
          {activeTab === "accounting" && userRole === "admin" && (
            <div className="space-y-6">
              
              {/* Accounting summary metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Arus Kas Masuk (Debit)</span>
                  <p className="text-xl font-bold font-mono text-emerald-600 mt-1">{formatRupiah(totalSales)}</p>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Belanja Stok (Kredit)</span>
                  <p className="text-xl font-bold font-mono text-rose-600 mt-1">{formatRupiah(totalPurchases)}</p>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Beban Gaji (Kredit)</span>
                  <p className="text-xl font-bold font-mono text-amber-600 mt-1">{formatRupiah(totalSalaries)}</p>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sisa Saldo Kas Riil</span>
                  <p className="text-xl font-bold font-mono text-slate-900 mt-1">{formatRupiah(cashBalance)}</p>
                </div>
              </div>

              {/* Master Gaji Karyawan */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Pay Salary form */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm h-fit">
                  <h3 className="font-bold text-sm text-slate-900 mb-4 flex items-center gap-2">
                    <UserPlus className="h-4.5 w-4.5 text-emerald-600" />
                    Bayar Gaji Karyawan (Pengurang Laba)
                  </h3>

                  <form onSubmit={handleSalarySubmit} className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nama Lengkap Karyawan</label>
                      <input
                        id="salary-employee-input"
                        type="text"
                        placeholder="Contoh: Budi Cahyono, Siti Aminah"
                        value={salEmployee}
                        onChange={(e) => setSalEmployee(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Bulan Gaji</label>
                      <input
                        id="salary-month-input"
                        type="text"
                        placeholder="Contoh: Juli 2026, Agustus 2026"
                        value={salMonth}
                        onChange={(e) => setSalMonth(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nominal Gaji (Rp)</label>
                      <input
                        id="salary-amount-input"
                        type="number"
                        placeholder="Contoh: 1500000"
                        value={salAmount || ""}
                        onChange={(e) => setSalAmount(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Catatan Tambahan (Opsional)</label>
                      <input
                        id="salary-notes-input"
                        type="text"
                        placeholder="Gaji pokok + bonus kehadiran..."
                        value={salNotes}
                        onChange={(e) => setSalNotes(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                      />
                    </div>

                    <button
                      id="save-salary-btn"
                      type="submit"
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      Proses Pembayaran Gaji
                    </button>
                  </form>
                </div>

                {/* Salaries Paid Master Table */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm lg:col-span-2">
                  <h3 className="font-bold text-sm text-slate-900 mb-1">Master Riwayat Gaji Terbayar</h3>
                  <p className="text-[11px] text-slate-500 mb-4">Daftar beban gaji karyawan yang otomatis mengurangi perhitungan laba bersih toko.</p>

                  <div className="overflow-x-auto max-h-96">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                          <th className="py-3 px-4">Nama Karyawan</th>
                          <th className="py-3 px-4">Bulan Periode</th>
                          <th className="py-3 px-4 text-right">Nominal Gaji</th>
                          <th className="py-3 px-4 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {salaries.map((s) => (
                          <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3 px-4 font-bold text-slate-800">{s.employeeName}</td>
                            <td className="py-3 px-4 text-slate-500">{s.month}</td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">{formatRupiah(s.amount)}</td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => handleDeleteSalary(s.id, s.employeeName, s.amount)}
                                className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors cursor-pointer"
                                title="Batalkan Gaji"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {salaries.length === 0 && (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-slate-400 italic">
                              Belum ada catatan pembayaran gaji karyawan.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

              {/* Rincian Kas Besar Ledger Mutation */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                <h3 className="font-bold text-sm text-slate-900 mb-1">Mutasi Buku Kas Besar</h3>
                <p className="text-[11px] text-slate-500 mb-4">Rincian mutasi uang masuk dan keluar secara kronologis untuk audit keuangan profesional.</p>

                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                        <th className="py-3 px-4">Tanggal Mutasi</th>
                        <th className="py-3 px-4">Deskripsi Mutasi</th>
                        <th className="py-3 px-4">Tipe</th>
                        <th className="py-3 px-4 text-right">Nominal</th>
                        <th className="py-3 px-4 text-right">Saldo Kas Akhir</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {cashLedger.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-4 text-slate-500 font-mono">
                            {new Date(m.date).toLocaleString("id-ID")}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-800">{m.description}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                              m.type === "in" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}>
                              {m.type === "in" ? "DEBIT" : "KREDIT"}
                            </span>
                          </td>
                          <td className={`py-3 px-4 text-right font-mono font-bold ${
                            m.type === "in" ? "text-emerald-700" : "text-rose-700"
                          }`}>
                            {m.type === "in" ? "+" : "-"}{formatRupiah(m.amount)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">{formatRupiah(m.balanceAfter)}</td>
                        </tr>
                      ))}
                      {cashLedger.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                            Belum ada mutasi buku kas besar.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* ==========================================
              7. USER MANAGEMENT (Admin Only)
              ========================================== */}
          {activeTab === "users" && userRole === "admin" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Whitelist user form */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm h-fit">
                  <h3 className="font-bold text-sm text-slate-900 mb-4 flex items-center gap-2">
                    <UserPlus className="h-4.5 w-4.5 text-emerald-600" />
                    Tambah Whitelist Email (Client / Admin)
                  </h3>

                  <form onSubmit={handleAddClient} className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Alamat Email Gmail Karyawan</label>
                      <input
                        id="client-email-input"
                        type="email"
                        placeholder="Contoh: karyawan@gmail.com"
                        value={newClientEmail}
                        onChange={(e) => setNewClientEmail(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tingkat Hak Akses</label>
                      <select
                        id="client-role-select"
                        value={newClientRole}
                        onChange={(e) => setNewClientRole(e.target.value as UserRole)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-slate-800"
                      >
                        <option value="client">Client (Hanya Input Kasir & Lihat Stok)</option>
                        <option value="admin">Admin (Akses Penuh Seluruh Sistem)</option>
                      </select>
                    </div>

                    <button
                      id="save-client-btn"
                      type="submit"
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      Daftarkan Akses User
                    </button>
                  </form>
                </div>

                {/* Whitelist List Table */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm lg:col-span-2">
                  <h3 className="font-bold text-sm text-slate-900 mb-1">Daftar Whitelist Hak Akses Toko</h3>
                  <p className="text-[11px] text-slate-500 mb-4">Hanya email Gmail yang terdaftar di bawah ini yang dapat masuk ke dalam sistem.</p>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                          <th className="py-3 px-4">Email Gmail</th>
                          <th className="py-3 px-4">Hak Akses</th>
                          <th className="py-3 px-4">Ditambahkan Pada</th>
                          <th className="py-3 px-4 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {userWhitelist.map((u) => (
                          <tr key={u.email} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3 px-4 font-bold text-slate-800">{u.email}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                u.role === "admin" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-600 border border-slate-200"
                              }`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-500 font-mono">
                              {new Date(u.addedAt).toLocaleDateString("id-ID")}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {u.email !== "bastikacorp@gmail.com" ? (
                                <button
                                  onClick={() => handleDeleteClient(u.email)}
                                  className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors cursor-pointer"
                                  title="Hapus Hak Akses"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-semibold italic">Owner Utama</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ==========================================
              8. RIWAYAT TRANSAKSI VIEW (All Whitelisted)
              ========================================== */}
          {activeTab === "history" && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Histori Kronologis Transaksi Toko</h3>
                  <p className="text-[11px] text-slate-500">Mencatat seluruh mutasi penjualan kasir dan pembelian stok yang dilakukan.</p>
                </div>
                <span className="text-xs bg-slate-100 px-2.5 py-1 rounded-full font-semibold text-slate-600">{transactions.length} baris data</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                      <th className="py-3 px-4">Tanggal & Jam</th>
                      <th className="py-3 px-4">Tipe Transaksi</th>
                      <th className="py-3 px-4">Detail Mutasi Barang</th>
                      <th className="py-3 px-4">Operator Kasir</th>
                      <th className="py-3 px-4 text-right">Total Transaksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.filter(t => 
                      (t.scentName && t.scentName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                      (t.description && t.description.toLowerCase().includes(searchTerm.toLowerCase()))
                    ).map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4 text-slate-500 font-mono">
                          {new Date(t.date).toLocaleString("id-ID")}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            t.type === "sale" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}>
                            {t.type === "sale" ? "PENJUALAN" : "BELANJA STOK"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800">{t.description}</div>
                          <span className="text-[10px] text-slate-400">
                            ID: {t.id} {t.volumeMl ? `| Volume: ${t.volumeMl}ml` : ""} {t.bottleSize && t.bottleSize !== "None" ? `| Botol: ${t.bottleSize} (${t.bottleCount}x)` : ""}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-medium">{t.operatorEmail}</td>
                        <td className={`py-3 px-4 text-right font-mono font-bold text-sm ${
                          t.type === "sale" ? "text-emerald-700" : "text-slate-800"
                        }`}>
                          {t.type === "sale" ? "+" : "-"}{formatRupiah(t.totalPrice)}
                        </td>
                      </tr>
                    ))}
                    {transactions.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                          Belum ada histori transaksi terekam.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

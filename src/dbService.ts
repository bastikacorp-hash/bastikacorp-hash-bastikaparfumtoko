import { 
  db, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  runTransaction,
  writeBatch,
  increment 
} from "./firebase";
import { 
  Shelf, 
  ScentPrice, 
  StockItem, 
  Transaction, 
  Salary, 
  CashMutation, 
  UserProfile 
} from "./types";

// Helper for unique ID generation if Firestore auto-id isn't used
const generateId = () => Math.random().toString(36).substring(2, 15);

// ==========================================
// SEED INITIAL DATA IF EMPTY
// ==========================================
export async function seedInitialDataIfEmpty() {
  try {
    const configRef = doc(db, "config", "status");
    const configSnap = await getDoc(configRef);
    if (configSnap.exists()) {
      return; // Already seeded
    }

    console.log("Seeding initial data for BASTIKA PARFUM...");

    // 1. Initial Client Whitelist
    const initialClients: UserProfile[] = [
      { email: "bastikacorp@gmail.com", role: "admin", addedAt: new Date().toISOString() },
      { email: "budi@gmail.com", role: "client", addedAt: new Date().toISOString() },
      { email: "siti@gmail.com", role: "client", addedAt: new Date().toISOString() },
    ];
    for (const client of initialClients) {
      await setDoc(doc(db, "users", client.email), client);
    }

    // 2. Initial Scent Prices (Harga Master)
    const initialPrices: ScentPrice[] = [
      { scentName: "Avicenna", pricePerMl: 3500, updatedAt: new Date().toISOString() },
      { scentName: "Bacarat Rouge", pricePerMl: 5000, updatedAt: new Date().toISOString() },
      { scentName: "Black Opium", pricePerMl: 4000, updatedAt: new Date().toISOString() },
      { scentName: "Blue de Chanel", pricePerMl: 4500, updatedAt: new Date().toISOString() },
      { scentName: "Bombshell", pricePerMl: 3000, updatedAt: new Date().toISOString() },
      { scentName: "Savage Sauvage", pricePerMl: 4500, updatedAt: new Date().toISOString() },
    ];
    for (const price of initialPrices) {
      await setDoc(doc(db, "prices", price.scentName), price);
    }

    // 3. Initial Shelves (Sistem Rak)
    const initialShelves: Shelf[] = [
      { id: "shelf_1", rackNumber: "Rak A-01", scentName: "Avicenna", pricePerMl: 3500 },
      { id: "shelf_2", rackNumber: "Rak A-02", scentName: "Bacarat Rouge", pricePerMl: 5000 },
      { id: "shelf_3", rackNumber: "Rak B-01", scentName: "Black Opium", pricePerMl: 4000 },
      { id: "shelf_4", rackNumber: "Rak B-02", scentName: "Blue de Chanel", pricePerMl: 4500 },
      { id: "shelf_5", rackNumber: "Rak C-01", scentName: "Bombshell", pricePerMl: 3000 },
      { id: "shelf_6", rackNumber: "Rak C-02", scentName: "Savage Sauvage", pricePerMl: 4500 },
    ];
    for (const shelf of initialShelves) {
      await setDoc(doc(db, "shelves", shelf.id), shelf);
    }

    // 4. Initial Stocks (Stok Master)
    // Essence stocks
    for (const p of initialPrices) {
      const id = `essence_${p.scentName.replace(/\s+/g, "_").toLowerCase()}`;
      await setDoc(doc(db, "stocks", id), {
        id,
        type: "essence",
        scentName: p.scentName,
        quantity: 500, // starting with 500ml each
      });
    }
    // Alcohol stock
    await setDoc(doc(db, "stocks", "alcohol_main"), {
      id: "alcohol_main",
      type: "alcohol",
      quantity: 5000, // 5000ml alcohol
    });
    // Bottle stocks
    const bottleSizes = ["30ml", "50ml", "100ml"];
    for (const size of bottleSizes) {
      const id = `bottle_${size}`;
      await setDoc(doc(db, "stocks", id), {
        id,
        type: "bottle",
        size,
        quantity: 50, // 50 bottles of each size
      });
    }

    // 5. Initial Cash Balance (Saldo Kas Besar)
    await setDoc(doc(db, "config", "cash"), { balance: 15000000 }); // Starting with Rp 15,000,000

    // 6. Initial Cash Ledger Mutation
    const initialMutation: CashMutation = {
      id: "mut_init",
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
      type: "in",
      amount: 15000000,
      balanceBefore: 0,
      balanceAfter: 15000000,
      description: "Modal awal usaha BASTIKA PARFUM",
      referenceId: "modal_awal"
    };
    await setDoc(doc(db, "cash_ledger", initialMutation.id), initialMutation);

    // Mark as seeded
    await setDoc(configRef, { seeded: true, timestamp: new Date().toISOString() });
    console.log("Seeding completed successfully.");
  } catch (error) {
    console.error("Error seeding initial data: ", error);
  }
}

// ==========================================
// CONFIGS & CASH
// ==========================================
export function subscribeToCashBalance(callback: (balance: number) => void) {
  return onSnapshot(doc(db, "config", "cash"), (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data().balance);
    } else {
      callback(0);
    }
  });
}

// ==========================================
// SHELVES (RAK) SERVICES
// ==========================================
export function subscribeToShelves(callback: (shelves: Shelf[]) => void) {
  return onSnapshot(collection(db, "shelves"), (snapshot) => {
    const list: Shelf[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as Shelf);
    });
    // Sort by rack number
    list.sort((a, b) => a.rackNumber.localeCompare(b.rackNumber, undefined, { numeric: true }));
    callback(list);
  });
}

export async function addShelf(shelf: Omit<Shelf, "id">) {
  const id = "shelf_" + generateId();
  await setDoc(doc(db, "shelves", id), { ...shelf, id });
  return id;
}

export async function updateShelf(id: string, updates: Partial<Omit<Shelf, "id">>) {
  await updateDoc(doc(db, "shelves", id), updates);
}

export async function deleteShelf(id: string) {
  await deleteDoc(doc(db, "shelves", id));
}

// ==========================================
// SCENT PRICES SERVICES
// ==========================================
export function subscribeToPrices(callback: (prices: ScentPrice[]) => void) {
  return onSnapshot(collection(db, "prices"), (snapshot) => {
    const list: ScentPrice[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as ScentPrice);
    });
    list.sort((a, b) => a.scentName.localeCompare(b.scentName));
    callback(list);
  });
}

// Update Master Price and cascade update to Shelves & Essence Stock names
export async function updateScentPrice(scentName: string, newPrice: number) {
  await runTransaction(db, async (transaction) => {
    // 1. Update prices doc
    const priceRef = doc(db, "prices", scentName);
    transaction.update(priceRef, { 
      pricePerMl: newPrice, 
      updatedAt: new Date().toISOString() 
    });

    // 2. Query shelves with this scent name and update their pricePerMl
    const shelvesQuery = query(collection(db, "shelves"), where("scentName", "==", scentName));
    const shelvesSnap = await getDocs(shelvesQuery);
    shelvesSnap.forEach((shelfDoc) => {
      transaction.update(doc(db, "shelves", shelfDoc.id), { pricePerMl: newPrice });
    });
  });
}

// ==========================================
// STOCKS SERVICES
// ==========================================
export function subscribeToStocks(callback: (stocks: StockItem[]) => void) {
  return onSnapshot(collection(db, "stocks"), (snapshot) => {
    const list: StockItem[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as StockItem);
    });
    callback(list);
  });
}

// Set manual adjustments (Admin only)
export async function updateStockManual(id: string, newQuantity: number) {
  await updateDoc(doc(db, "stocks", id), { quantity: newQuantity });
}

// ==========================================
// TRANSACTIONS & CASHFLOW ACCOUNTING
// ==========================================
export function subscribeToTransactions(callback: (transactions: Transaction[]) => void) {
  return onSnapshot(
    query(collection(db, "transactions"), orderBy("date", "desc")),
    (snapshot) => {
      const list: Transaction[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Transaction);
      });
      callback(list);
    }
  );
}

// Recording transactions with atomic stock adjustments & Cash Ledger Integration
export async function addTransaction(tx: Omit<Transaction, "id">) {
  const id = "tx_" + generateId();
  const dateStr = tx.date || new Date().toISOString();

  await runTransaction(db, async (transaction) => {
    // A. Fetch current cash balance
    const cashRef = doc(db, "config", "cash");
    const cashSnap = await transaction.get(cashRef);
    let currentBalance = 15000000; // default initial if config/cash doesn't exist yet
    if (cashSnap.exists()) {
      currentBalance = cashSnap.data().balance;
    }

    // B. Perform stock checks and updates
    if (tx.type === "sale") {
      // PENJUALAN: mengurangi stok bibit, mengurangi stok botol, menambahkan kas
      const volumeToDeduct = tx.volumeMl || 0;
      const bottleSize = tx.bottleSize || "None";
      const bottleCountToDeduct = tx.bottleCount || 0;

      // Deduct essence stock
      if (tx.scentName && volumeToDeduct > 0) {
        const essenceId = `essence_${tx.scentName.replace(/\s+/g, "_").toLowerCase()}`;
        const essenceRef = doc(db, "stocks", essenceId);
        const essenceSnap = await transaction.get(essenceRef);
        
        if (essenceSnap.exists()) {
          const currentQty = essenceSnap.data().quantity;
          if (currentQty < volumeToDeduct) {
            throw new Error(`Stok bibit ${tx.scentName} tidak mencukupi! Tersisa: ${currentQty} ml.`);
          }
          transaction.update(essenceRef, { quantity: currentQty - volumeToDeduct });
        } else {
          // If essence stock doc doesn't exist, create it with negative or 0 balance check
          throw new Error(`Stok master bibit ${tx.scentName} tidak ditemukan!`);
        }

        // Deduct alcohol stock dynamically as bundling/free
        // Typically, 1 ml of perfume needs some dilution. Assuming user input ml is the essence,
        // and we might deduct a corresponding amount of alcohol if mixing.
        // Let's assume alcohol deduction is equal to 0.5 * volumeToDeduct for mixing, or free bundling.
        // Let's deduct 0.5 * volumeToDeduct from alcohol stock if available
        const alcoholRef = doc(db, "stocks", "alcohol_main");
        const alcoholSnap = await transaction.get(alcoholRef);
        if (alcoholSnap.exists()) {
          const alcoholQty = alcoholSnap.data().quantity;
          const alcoholDeduct = Math.round(volumeToDeduct * 0.5); // standard ratio
          if (alcoholQty >= alcoholDeduct) {
            transaction.update(alcoholRef, { quantity: alcoholQty - alcoholDeduct });
          }
        }
      }

      // Deduct bottle stock
      if (bottleSize !== "None" && bottleCountToDeduct > 0) {
        const bottleId = `bottle_${bottleSize}`;
        const bottleRef = doc(db, "stocks", bottleId);
        const bottleSnap = await transaction.get(bottleRef);

        if (bottleSnap.exists()) {
          const currentQty = bottleSnap.data().quantity;
          if (currentQty < bottleCountToDeduct) {
            throw new Error(`Stok botol ukuran ${bottleSize} tidak mencukupi! Tersisa: ${currentQty} unit.`);
          }
          transaction.update(bottleRef, { quantity: currentQty - bottleCountToDeduct });
        } else {
          throw new Error(`Stok master botol ${bottleSize} tidak ditemukan!`);
        }
      }

      // C. Update Cash Balance (Uang Masuk)
      const newBalance = currentBalance + tx.totalPrice;
      transaction.update(cashRef, { balance: newBalance });

      // D. Record Cash Ledger Mutation
      const mutId = "mut_" + generateId();
      const mutationRef = doc(db, "cash_ledger", mutId);
      transaction.set(mutationRef, {
        id: mutId,
        date: dateStr,
        type: "in",
        amount: tx.totalPrice,
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
        description: `Penjualan: ${tx.scentName || "Parfum"} (${tx.volumeMl}ml) + Botol ${tx.bottleSize} x ${tx.bottleCount}`,
        referenceId: id
      });

    } else if (tx.type === "purchase") {
      // PEMBELIAN: menambah stok bibit/alkohol/botol, mengurangi kas
      const volumeToAdd = tx.volumeMl || 0;
      const bottleSize = tx.bottleSize || "None";
      const bottleCountToAdd = tx.bottleCount || 0;

      if (currentBalance < tx.totalPrice) {
        throw new Error(`Saldo kas tidak mencukupi untuk pembelian ini! Tersisa: Rp ${currentBalance.toLocaleString("id-ID")}`);
      }

      // Update essence stock
      if (tx.category === "bibit" && tx.scentName && volumeToAdd > 0) {
        const essenceId = `essence_${tx.scentName.replace(/\s+/g, "_").toLowerCase()}`;
        const essenceRef = doc(db, "stocks", essenceId);
        const essenceSnap = await transaction.get(essenceRef);
        
        if (essenceSnap.exists()) {
          transaction.update(essenceRef, { quantity: essenceSnap.data().quantity + volumeToAdd });
        } else {
          // Create new essence stock item
          transaction.set(essenceRef, {
            id: essenceId,
            type: "essence",
            scentName: tx.scentName,
            quantity: volumeToAdd
          });
          
          // Also check and create in price list if not exists
          const priceRef = doc(db, "prices", tx.scentName);
          const priceSnap = await transaction.get(priceRef);
          if (!priceSnap.exists()) {
            transaction.set(priceRef, {
              scentName: tx.scentName,
              pricePerMl: 3500, // starting default price if new
              updatedAt: new Date().toISOString()
            });
          }
        }
      }

      // Update alcohol stock
      if (tx.category === "alkohol" && volumeToAdd > 0) {
        const alcoholRef = doc(db, "stocks", "alcohol_main");
        const alcoholSnap = await transaction.get(alcoholRef);
        if (alcoholSnap.exists()) {
          transaction.update(alcoholRef, { quantity: alcoholSnap.data().quantity + volumeToAdd });
        } else {
          transaction.set(alcoholRef, {
            id: "alcohol_main",
            type: "alcohol",
            quantity: volumeToAdd
          });
        }
      }

      // Update bottle stock
      if (tx.category === "botol" && bottleSize !== "None" && bottleCountToAdd > 0) {
        const bottleId = `bottle_${bottleSize}`;
        const bottleRef = doc(db, "stocks", bottleId);
        const bottleSnap = await transaction.get(bottleRef);

        if (bottleSnap.exists()) {
          transaction.update(bottleRef, { quantity: bottleSnap.data().quantity + bottleCountToAdd });
        } else {
          transaction.set(bottleRef, {
            id: bottleId,
            type: "bottle",
            size: bottleSize,
            quantity: bottleCountToAdd
          });
        }
      }

      // C. Update Cash Balance (Uang Keluar)
      const newBalance = currentBalance - tx.totalPrice;
      transaction.update(cashRef, { balance: newBalance });

      // D. Record Cash Ledger Mutation
      const mutId = "mut_" + generateId();
      const mutationRef = doc(db, "cash_ledger", mutId);
      transaction.set(mutationRef, {
        id: mutId,
        date: dateStr,
        type: "out",
        amount: tx.totalPrice,
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
        description: `Pembelian stok: ${tx.category === "bibit" ? `Bibit ${tx.scentName}` : tx.category === "botol" ? `Botol ${tx.bottleSize}` : "Alkohol"}`,
        referenceId: id
      });
    }

    // E. Save transaction document
    const txRef = doc(db, "transactions", id);
    transaction.set(txRef, { ...tx, id, date: dateStr });
  });

  return id;
}

// ==========================================
// MASTER SALARIES (GAJI KARYAWAN)
// ==========================================
export function subscribeToSalaries(callback: (salaries: Salary[]) => void) {
  return onSnapshot(collection(db, "salaries"), (snapshot) => {
    const list: Salary[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as Salary);
    });
    list.sort((a, b) => b.datePaid.localeCompare(a.datePaid));
    callback(list);
  });
}

export async function addSalary(salary: Omit<Salary, "id">) {
  const id = "salary_" + generateId();
  const dateStr = salary.datePaid || new Date().toISOString();

  await runTransaction(db, async (transaction) => {
    // 1. Fetch current cash balance
    const cashRef = doc(db, "config", "cash");
    const cashSnap = await transaction.get(cashRef);
    let currentBalance = 15000000;
    if (cashSnap.exists()) {
      currentBalance = cashSnap.data().balance;
    }

    if (currentBalance < salary.amount) {
      throw new Error(`Saldo kas tidak mencukupi untuk bayar gaji! Tersisa: Rp ${currentBalance.toLocaleString("id-ID")}`);
    }

    // 2. Deduct Cash
    const newBalance = currentBalance - salary.amount;
    transaction.update(cashRef, { balance: newBalance });

    // 3. Record Cash Mutation
    const mutId = "mut_" + generateId();
    const mutationRef = doc(db, "cash_ledger", mutId);
    transaction.set(mutationRef, {
      id: mutId,
      date: dateStr,
      type: "out",
      amount: salary.amount,
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
      description: `Gaji karyawan: ${salary.employeeName} (${salary.month})`,
      referenceId: id
    });

    // 4. Save Salary record
    const salaryRef = doc(db, "salaries", id);
    transaction.set(salaryRef, { ...salary, id, datePaid: dateStr });
  });

  return id;
}

export async function deleteSalary(id: string, amount: number) {
  // If a salary is deleted, let's reverse the cash balance
  await runTransaction(db, async (transaction) => {
    const cashRef = doc(db, "config", "cash");
    const cashSnap = await transaction.get(cashRef);
    if (cashSnap.exists()) {
      const currentBalance = cashSnap.data().balance;
      const newBalance = currentBalance + amount;
      transaction.update(cashRef, { balance: newBalance });

      // Create counter-mutation
      const mutId = "mut_" + generateId();
      transaction.set(doc(db, "cash_ledger", mutId), {
        id: mutId,
        date: new Date().toISOString(),
        type: "in",
        amount: amount,
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
        description: `Batal Gaji Karyawan Ref ID: ${id}`,
        referenceId: id
      });
    }

    transaction.delete(doc(db, "salaries", id));
  });
}

// ==========================================
// CASH LEDGER (KAS BESAR MUTASI)
// ==========================================
export function subscribeToCashLedger(callback: (mutations: CashMutation[]) => void) {
  return onSnapshot(
    query(collection(db, "cash_ledger"), orderBy("date", "desc")),
    (snapshot) => {
      const list: CashMutation[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as CashMutation);
      });
      callback(list);
    }
  );
}

// Adding custom manual cash entry (e.g. inject capital or manual expense)
export async function addManualCashMutation(type: "in" | "out", amount: number, description: string) {
  const id = "mut_manual_" + generateId();
  const dateStr = new Date().toISOString();

  await runTransaction(db, async (transaction) => {
    const cashRef = doc(db, "config", "cash");
    const cashSnap = await transaction.get(cashRef);
    let currentBalance = 0;
    if (cashSnap.exists()) {
      currentBalance = cashSnap.data().balance;
    }

    if (type === "out" && currentBalance < amount) {
      throw new Error(`Saldo kas tidak mencukupi! Tersisa: Rp ${currentBalance.toLocaleString("id-ID")}`);
    }

    const newBalance = type === "in" ? currentBalance + amount : currentBalance - amount;
    transaction.update(cashRef, { balance: newBalance });

    transaction.set(doc(db, "cash_ledger", id), {
      id,
      date: dateStr,
      type,
      amount,
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
      description: `Manual: ${description}`,
      referenceId: "manual"
    });
  });
}

// ==========================================
// CLIENTS MANAGEMENT (WHITELIST ACCESS)
// ==========================================
export function subscribeToClients(
  callback: (users: UserProfile[]) => void,
  errorCallback?: (error: any) => void
) {
  return onSnapshot(
    collection(db, "users"),
    (snapshot) => {
      const list: UserProfile[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as UserProfile);
      });
      list.sort((a, b) => a.email.localeCompare(b.email));
      callback(list);
    },
    (error) => {
      if (errorCallback) {
        errorCallback(error);
      } else {
        console.error("Error in subscribeToClients:", error);
      }
    }
  );
}

export async function addClientUser(email: string, role: "admin" | "client" = "client") {
  const emailClean = email.trim().toLowerCase();
  await setDoc(doc(db, "users", emailClean), {
    email: emailClean,
    role,
    addedAt: new Date().toISOString()
  });
}

export async function deleteClientUser(email: string) {
  if (email.trim().toLowerCase() === "bastikacorp@gmail.com") {
    throw new Error("Admin utama 'bastikacorp@gmail.com' tidak bisa dihapus!");
  }
  await deleteDoc(doc(db, "users", email.trim().toLowerCase()));
}

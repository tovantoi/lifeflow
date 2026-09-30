import { create } from "zustand";
import { persist } from "zustand/middleware";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
} from "firebase/firestore";
import { auth, db, provider } from "../firebase";
import { uid as newId } from "../lib/format";

// Dữ liệu nằm ở: users/{uid}/tasks/{id} và users/{uid}/transactions/{id}
const col = (name) => collection(db, "users", auth.currentUser.uid, name);
const ref = (name, id) => doc(db, "users", auth.currentUser.uid, name, id);
const safe = (p) => p.catch((e) => alert("Lưu dữ liệu thất bại: " + e.message));
let unsubs = [];

export const useStore = create(
  persist(
    (set, get) => ({
      theme: "light",
      user: null,
      ready: false,
      loadError: null,
      tasks: [],
      transactions: [],

      toggleTheme: () =>
        set((s) => ({ theme: s.theme === "light" ? "dark" : "light" })),

      // Gọi 1 lần khi mở app: theo dõi đăng nhập và đồng bộ dữ liệu realtime
      init: () =>
        onAuthStateChanged(
          auth,
          (user) => {
            unsubs.forEach((u) => u());
            unsubs = [];
            if (!user)
              return set({
                user: null,
                ready: true,
                loadError: null,
                tasks: [],
                transactions: [],
              });
            set({ user, loadError: null });
            const listen = (name) =>
              onSnapshot(
                col(name),
                (snap) =>
                  set({
                    ready: true,
                    [name]: snap.docs
                      .map((d) => ({ id: d.id, ...d.data() }))
                      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
                  }),
                (err) => {
                  console.error(`Không tải được ${name} từ Firestore:`, err);
                  set({ ready: true, loadError: err.message || String(err) });
                },
              );
            unsubs = [listen("tasks"), listen("transactions")];
          },
          (err) => {
            console.error("Không khởi tạo được phiên Firebase Auth:", err);
            set({ ready: true, loadError: err.message || String(err) });
          },
        ),

      login: () =>
        signInWithPopup(auth, provider).catch((e) =>
          alert("Đăng nhập thất bại: " + e.message),
        ),
      logout: () => signOut(auth),

      addTask: (t) =>
        safe(
          setDoc(ref("tasks", newId()), {
            status: "todo",
            createdAt: Date.now(),
            ...t,
          }),
        ),
      updateTask: (id, patch) => safe(updateDoc(ref("tasks", id), patch)),
      removeTask: (id) => safe(deleteDoc(ref("tasks", id))),

      addTx: (t) =>
        safe(
          setDoc(ref("transactions", newId()), { createdAt: Date.now(), ...t }),
        ),
      updateTx: (id, patch) => safe(updateDoc(ref("transactions", id), patch)),
      // Xóa toàn bộ 'tasks' hoặc 'transactions' của người dùng (theo lô, tối đa 400 mục/lô)
      resetData: async (name) => {
        const ids = get()[name].map((d) => d.id);
        try {
          for (let i = 0; i < ids.length; i += 400) {
            const batch = writeBatch(db);
            ids.slice(i, i + 400).forEach((id) => batch.delete(ref(name, id)));
            await batch.commit();
          }
        } catch (e) {
          alert("Đặt lại thất bại: " + e.message);
        }
      },
      removeTx: (id) => safe(deleteDoc(ref("transactions", id))),
    }),
    { name: "lifeflow", partialize: (s) => ({ theme: s.theme }) }, // chỉ lưu theme ở máy
  ),
);

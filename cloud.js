// cloud.js — warstwa chmury dla ARKON CRM (Supabase + fallback lokalny)
const TBL = {
  clients: "clients",
  leads: "leads",
  components_pumps: "components_pumps",
  components_boilers: "components_boilers",
  components_pv: "components_pv",
  components_insul: "components_insul",
  components_garage: "components_garage",
  messages: "messages",
  // opcjonalnie: pliki metadane; binaria do Storage (bucket)
  files: "files_meta"
};

export const cloud = {
  supa: null,
  url: null,
  anon: null,
  userId: null,
  enabled: false,
  bucket: "arkon-files", // nazwa bucketa na pliki w Supabase Storage

  async init({ url, anon, userId }) {
    this.url = url;
    this.anon = anon;
    this.userId = userId || "local-user";

    if (!url || !anon) {
      console.info("[cloud] Brak konfiguracji — działam lokalnie.");
      this.enabled = false;
      return false;
    }
    // załaduj klienta Supabase z CDN (jeśli nie ma)
    if (!window.supabase) {
      await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js");
    }
    this.supa = window.supabase.createClient(url, anon, {
      auth: { persistSession: false },
    });

    // szybki ping
    try {
      const { data, error } = await this.supa.from(TBL.clients).select("id").limit(1);
      if (error) throw error;
      this.enabled = true;
      console.info("[cloud] Połączono z Supabase.");
      return true;
    } catch (e) {
      console.warn("[cloud] Supabase off:", e?.message || e);
      this.enabled = false;
      return false;
    }
  },

  /* ===== Klienci ===== */
  async loadClients() {
    if (!this.enabled) return null;
    const { data, error } = await this.supa.from(TBL.clients).select("*").order("created", { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async saveClients(list) {
    if (!this.enabled) return;
    // Upsert po id
    const { error } = await this.supa.from(TBL.clients).upsert(list, { onConflict: "id" });
    if (error) throw error;
  },
  async deleteClient(id) {
    if (!this.enabled) return;
    const { error } = await this.supa.from(TBL.clients).delete().eq("id", id);
    if (error) throw error;
  },

  /* ===== Leady ===== */
  async loadLeads() {
    if (!this.enabled) return null;
    const { data, error } = await this.supa.from(TBL.leads).select("*").order("created", { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async saveLeads(list) {
    if (!this.enabled) return;
    const { error } = await this.supa.from(TBL.leads).upsert(list, { onConflict: "id" });
    if (error) throw error;
  },
  async deleteLead(id) {
    if (!this.enabled) return;
    const { error } = await this.supa.from(TBL.leads).delete().eq("id", id);
    if (error) throw error;
  },

  /* ===== Komponenty (5 tabel) ===== */
  async loadComponents() {
    if (!this.enabled) return null;
    const k = {};
    const reqs = [
      ["pumps", TBL.components_pumps],
      ["boilers", TBL.components_boilers],
      ["pv", TBL.components_pv],
      ["insul", TBL.components_insul],
      ["garage", TBL.components_garage],
    ].map(async ([key, table]) => {
      const { data, error } = await this.supa.from(table).select("*");
      if (error) throw error;
      k[key] = data || [];
    });
    await Promise.all(reqs);
    return k;
  },
  async saveComponents(all) {
    if (!this.enabled) return;
    const plan = [
      ["pumps", TBL.components_pumps],
      ["boilers", TBL.components_boilers],
      ["pv", TBL.components_pv],
      ["insul", TBL.components_insul],
      ["garage", TBL.components_garage],
    ];
    for (const [key, table] of plan) {
      const list = all?.[key] || [];
      if (!Array.isArray(list)) continue;
      const { error } = await this.supa.from(table).upsert(list, { onConflict: "id" });
      if (error) throw error;
    }
  },

  /* ===== Chat (wiadomości + załączniki w Storage) ===== */
  async listMessages(limit = 200) {
    if (!this.enabled) return null;
    const { data, error } = await this.supa
      .from(TBL.messages)
      .select("*")
      .order("at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data || []).reverse(); // najstarsze na górze
  },
  async sendMessage({ id, user, text, at, files = [] }) {
    if (!this.enabled) return;
    const payload = { id, user, text, at, files };
    const { error } = await this.supa.from(TBL.messages).insert(payload);
    if (error) throw error;
  },

  /* ===== Pliki: metadane + Storage ===== */
  async uploadFile({ id, file, category = "upload", clientId = null, clientName = "" }) {
    if (!this.enabled) return null;
    const path = ${category}/${id}_${file.name};
    const up = await this.supa.storage.from(this.bucket).upload(path, file, { upsert: false });
    if (up.error) throw up.error;
    const { data: pub } = this.supa.storage.from(this.bucket).getPublicUrl(path);
    const meta = {
      id,
      name: file.name,
      type: file.type || "application/octet-stream",
      size: file.size,
      at: Date.now(),
      category,
      clientId,
      clientName,
      path,
      public_url: pub?.publicUrl || null,
    };
    const ins = await this.supa.from(TBL.files).insert(meta);
    if (ins.error) throw ins.error;
    return meta;
  },
  async listFiles() {
    if (!this.enabled) return null;
    const { data, error } = await this.supa.from(TBL.files).select("*").order("at", { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async deleteFile(id) {
    if (!this.enabled) return;
    // pobierz metadane -> usuń ze storage -> usuń rekord
    const { data, error } = await this.supa.from(TBL.files).select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    if (data?.path) {
      await this.supa.storage.from(this.bucket).remove([data.path]).catch(()=>{});
    }
    const del = await this.supa.from(TBL.files).delete().eq("id", id);
    if (del.error) throw del.error;
  },

  /* ===== Realtime (opcjonalnie) ===== */
  // Subskrypcja czatu (RT) — wywołaj callback przy nowej wiadomości
  subscribeChat(onInsert) {
    if (!this.enabled) return { unsubscribe(){/* noop */} };
    const ch = this.supa.channel("messages-insert")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: TBL.messages }, payload => {
        onInsert?.(payload.new);
      })
      .subscribe();
    return ch;
  },
  unsubscribe(channel) {
    try { this.supa.removeChannel(channel); } catch {}
  },
};
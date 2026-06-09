import { createClient } from "@supabase/supabase-js";

// ─── Client Supabase ──────────────────────────────────────────────────────────
// Remplace ces valeurs par celles de ton projet Supabase
// (Settings → API dans le dashboard)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// ─── Notes ────────────────────────────────────────────────────────────────────

/** Récupère toutes les notes de l'utilisateur connecté */
export async function fetchNotes() {
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .order("done", { ascending: true })
    .order("due_urgent", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data.map(dbToNote);
}

/** Crée une nouvelle note */
export async function createNote(note) {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("notes")
    .insert([noteToDb(note, user.id)])
    .select()
    .single();

  if (error) throw error;

  // Créer les reminders automatiquement si échéance définie
  if (data.due_date) {
    await createReminders(data.id, user.id, data.due_date);
  }

  return dbToNote(data);
}

/** Marque une note comme faite */
export async function markNoteDone(id) {
  const { error } = await supabase
    .from("notes")
    .update({ done: true, done_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

/** Supprime une note */
export async function deleteNote(id) {
  const { error } = await supabase
    .from("notes")
    .delete()
    .eq("id", id);

  if (error) throw error;
}


// ─── Reminders ────────────────────────────────────────────────────────────────

/** Crée les relances automatiques : J-2, J-1 et jour J */
async function createReminders(noteId, userId, dueDate) {
  const due = new Date(dueDate);
  const offsets = [2, 1, 0]; // jours avant l'échéance

  const reminders = offsets.map(offset => {
    const remindAt = new Date(due);
    remindAt.setDate(remindAt.getDate() - offset);
    remindAt.setHours(9, 0, 0, 0); // 9h00 le matin
    return {
      note_id: noteId,
      user_id: userId,
      remind_at: remindAt.toISOString(),
      offset_days: offset,
    };
  }).filter(r => new Date(r.remind_at) > new Date()); // ne pas créer dans le passé

  if (reminders.length === 0) return;

  const { error } = await supabase.from("reminders").insert(reminders);
  if (error) console.error("Erreur création reminders :", error);
}


// ─── Digest ───────────────────────────────────────────────────────────────────

/** Récupère ou génère le récap du jour */
export async function fetchOrCreateDigest() {
  const today = new Date().toISOString().split("T")[0];
  const { data: { user } } = await supabase.auth.getUser();

  // Vérifier si un digest existe déjà pour aujourd'hui
  const { data: existing } = await supabase
    .from("digests")
    .select("*")
    .eq("user_id", user.id)
    .eq("digest_date", today)
    .single();

  if (existing) return existing;

  // Sinon, récupérer les stats et créer un nouveau digest
  const notes = await fetchNotes();
  const stats = {
    total:    notes.filter(n => !n.done).length,
    urgentes: notes.filter(n => n.dueUrgent && !n.done).length,
    done:     notes.filter(n => n.done).length,
    new_today: notes.filter(n => {
      const d = new Date(n.createdAt);
      return d.toISOString().split("T")[0] === today;
    }).length,
  };

  const topActions = notes
    .filter(n => !n.done)
    .sort((a, b) => {
      const po = { haute: 0, moyenne: 1, basse: 2 };
      return po[a.priority] - po[b.priority];
    })
    .slice(0, 3)
    .map(n => n.actions[0]);

  const { data, error } = await supabase
    .from("digests")
    .insert([{
      user_id: user.id,
      digest_date: today,
      summary: `Récap du ${new Date().toLocaleDateString("fr-FR", { weekday:"long", day:"numeric", month:"long" })}`,
      top_actions: topActions,
      stats,
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}


// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function onAuthChange(callback) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user ?? null);
  });
}


// ─── Mappers DB ↔ App ─────────────────────────────────────────────────────────
// Convertit les noms snake_case de Supabase en camelCase pour React

function dbToNote(row) {
  return {
    id:         row.id,
    userId:     row.user_id,
    raw:        row.raw,
    title:      row.title,
    body:       row.body,
    category:   row.category,
    priority:   row.priority,
    due:        row.due_date,
    dueLabel:   row.due_label ?? "Pas d'échéance",
    dueUrgent:  row.due_urgent,
    actions:    row.actions ?? [],
    done:       row.done,
    doneAt:     row.done_at,
    createdAt:  row.created_at,
    updatedAt:  row.updated_at,
  };
}

function noteToDb(note, userId) {
  return {
    user_id:   userId,
    raw:       note.raw,
    title:     note.title,
    body:      note.body,
    category:  note.category,
    priority:  note.priority,
    due_date:  note.due ?? null,
    due_label: note.dueLabel ?? null,
    due_urgent: note.dueUrgent ?? false,
    actions:   note.actions ?? [],
  };
}

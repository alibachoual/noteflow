import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL     = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY= import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── Notes ────────────────────────────────────────────────────────────────────

export async function fetchNotes(space = null) {
  let q = supabase.from("notes").select("*")
    .order("done",       { ascending: true })
    .order("due_urgent", { ascending: false })
    .order("created_at", { ascending: false });
  if (space) q = q.eq("space", space);
  const { data, error } = await q;
  if (error) throw error;
  return data.map(dbToNote);
}

export async function createNote(note, space = "pro") {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.from("notes")
    .insert([noteToDb(note, user.id, space)]).select().single();
  if (error) throw error;
  if (data.due_date) await createReminders(data.id, user.id, data.due_date);
  return dbToNote(data);
}

export async function updateNote(id, fields) {
  const { data, error } = await supabase.from("notes")
    .update({
      title:      fields.title,
      body:       fields.body,
      category:   fields.category,
      priority:   fields.priority,
      due_date:   fields.due   ?? null,
      due_label:  fields.dueLabel  ?? null,
      due_urgent: fields.dueUrgent ?? false,
      actions:    fields.actions   ?? [],
      updated_at: new Date().toISOString(),
    })
    .eq("id", id).select().single();
  if (error) throw error;
  return dbToNote(data);
}

export async function deleteNote(id) {
  const { error } = await supabase.from("notes").delete().eq("id", id);
  if (error) throw error;
}

export async function markNoteDone(id, note) {
  const now = new Date();
  const updates = { done: true, done_at: now.toISOString() };

  if (note?.isRecurring && note?.recurrence) {
    updates.next_due = calcNextDue(now, note.recurrence, note.recurrenceDay);
  }

  const { error } = await supabase.from("notes")
    .update(updates).eq("id", id);
  if (error) throw error;
}

export function calcNextDue(from, recurrence, recurrenceDay) {
  const d = new Date(from);
  switch (recurrence) {
    case "daily":
      d.setDate(d.getDate() + 1);
      break;
    case "weekly":
      d.setDate(d.getDate() + 7);
      break;
    case "monthly":
      d.setMonth(d.getMonth() + 1);
      if (recurrenceDay) d.setDate(recurrenceDay);
      else d.setDate(1); // 1er du mois suivant par défaut
      break;
    case "yearly":
      d.setFullYear(d.getFullYear() + 1);
      break;
  }
  return d.toISOString().split("T")[0];
}

export async function resetRecurring(id) {
  // Remet une tâche récurrente à "à faire" (appelé au chargement si next_due <= today)
  const { error } = await supabase.from("notes")
    .update({ done: false, done_at: null, next_due: null }).eq("id", id);
  if (error) throw error;
}

// ─── Categories ───────────────────────────────────────────────────────────────

export async function fetchCategories(space) {
  const { data, error } = await supabase.from("categories")
    .select("*").eq("space", space).order("position");
  if (error) throw error;
  // Convertir en objet key→meta
  return Object.fromEntries(data.map(c => [c.key, {
    id: c.id, label: c.label, icon: c.icon, color: c.color,
  }]));
}

export async function createCategory(space, { key, label, icon, color }) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.from("categories")
    .insert([{ user_id: user.id, space, key, label, icon, color, position: 0 }])
    .select().single();
  if (error) throw error;
  return data;
}

export async function deleteCategory(id) {
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;
}

// ─── Reminders ────────────────────────────────────────────────────────────────

async function createReminders(noteId, userId, dueDate) {
  const due = new Date(dueDate);
  const reminders = [2, 1, 0].map(offset => {
    const remindAt = new Date(due);
    remindAt.setDate(remindAt.getDate() - offset);
    remindAt.setHours(9, 0, 0, 0);
    return { note_id: noteId, user_id: userId, remind_at: remindAt.toISOString(), offset_days: offset };
  }).filter(r => new Date(r.remind_at) > new Date());
  if (reminders.length) await supabase.from("reminders").insert(reminders);
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
  await supabase.auth.signOut();
}

export function onAuthChange(cb) {
  return supabase.auth.onAuthStateChange((_, session) => cb(session?.user ?? null));
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function dbToNote(row) {
  return {
    id:            row.id,
    space:         row.space ?? "pro",
    raw:           row.raw,
    title:         row.title,
    body:          row.body,
    category:      row.category,
    priority:      row.priority,
    due:           row.due_date,
    dueLabel:      row.due_label ?? "Pas d'échéance",
    dueUrgent:     row.due_urgent,
    actions:       row.actions ?? [],
    done:          row.done,
    doneAt:        row.done_at ?? null,
    nextDue:       row.next_due ?? null,
    isRecurring:   row.is_recurring ?? false,
    recurrence:    row.recurrence ?? null,
    recurrenceDay: row.recurrence_day ?? null,
    createdAt:     row.created_at,
  };
}

function noteToDb(note, userId, space) {
  return {
    user_id:       userId,
    space:         space,
    raw:           note.raw,
    title:         note.title,
    body:          note.body,
    category:      note.category,
    priority:      note.priority,
    due_date:      note.due ?? null,
    due_label:     note.dueLabel ?? null,
    due_urgent:    note.dueUrgent ?? false,
    actions:       note.actions ?? [],
    is_recurring:  note.isRecurring ?? false,
    recurrence:    note.recurrence ?? null,
    recurrence_day:note.recurrenceDay ?? null,
    next_due:      note.nextDue ?? null,
  };
}

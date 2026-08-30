import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables are not set. Service placeholders are active.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);

export async function getTableRows(tableName, options = {}) {
  const { select = '*', filters = [], orderBy, limit } = options;

  let query = supabase.from(tableName).select(select);

  for (const filter of filters) {
    const { column, operator, value } = filter;
    query = query.filter(column, operator, value);
  }

  if (orderBy) {
    const { column, ascending = true } = orderBy;
    query = query.order(column, { ascending });
  }

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error(`Error fetching rows from ${tableName}:`, error);
    return [];
  }

  return data ?? [];
}

export async function insertRow(tableName, row) {
  const { data, error } = await supabase.from(tableName).insert(row).select();

  if (error) {
    console.error(`Error inserting row into ${tableName}:`, error);
    return null;
  }

  return data?.[0] ?? null;
}

export async function updateRow(tableName, id, updates) {
  const { data, error } = await supabase
    .from(tableName)
    .update(updates)
    .eq('id', id)
    .select();

  if (error) {
    console.error(`Error updating row in ${tableName}:`, error);
    return null;
  }

  return data?.[0] ?? null;
}

export async function deleteRow(tableName, id) {
  const { error } = await supabase.from(tableName).delete().eq('id', id);

  if (error) {
    console.error(`Error deleting row from ${tableName}:`, error);
    return false;
  }

  return true;
}

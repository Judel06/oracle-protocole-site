function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const str = Array.isArray(value) ? value.join('; ') : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

/**
 * Exporte un tableau d'objets en CSV et declenche le telechargement.
 * @param {Array<{key:string,label:string,format?:Function}>} columns
 * @param {Array<Object>} rows
 * @param {string} filename
 */
export function exportToCsv(columns, rows, filename) {
  const header = columns.map((c) => csvEscape(c.label)).join(',');
  const lines = rows.map((row) =>
    columns.map((c) => csvEscape(c.format ? c.format(row[c.key], row) : row[c.key])).join(',')
  );
  const csv = [header, ...lines].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

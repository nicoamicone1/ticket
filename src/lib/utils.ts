import type { Ticket } from '@/lib/types';

/**
 * Exporta un conjunto de datos a un archivo CSV descargable.
 */
export const exportToCSV = (filename: string, headers: string[], rows: (string | number | null | undefined)[][]) => {
  // Convertir filas a formato CSV respetando comillas y comas
  const csvRows = [
    headers.join(','),
    ...rows.map(row =>
      row.map(val => {
        let str = val === null || val === undefined ? '' : String(val);
        // Neutralizar inyección de fórmulas en Excel/Sheets (=, +, -, @)
        if (/^[=+\-@]/.test(str)) {
          str = `'${str}`;
        }
        // Si tiene comas, comillas o nuevas líneas, lo encerramos en comillas dobles
        if (/[",\n\r]/.test(str)) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(',')
    )
  ];

  const csvContent = '﻿' + csvRows.join('\n'); // BOM para UTF-8 en Excel
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Extrae un mensaje legible de un error desconocido.
 */
export const getErrorMessage = (err: unknown, fallback = 'Ocurrió un error inesperado'): string => {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
    return (err as { message: string }).message;
  }
  return fallback;
};

/**
 * Copia texto al portapapeles. Devuelve false si el navegador lo bloquea.
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

/**
 * Métricas compartidas entre Dashboard y Detalle de Espacio.
 * Las horas aprobadas solo cuentan tickets que el cliente efectivamente aprobó.
 */
export const getTicketStats = (tickets: Ticket[]) => {
  const approvedStatuses = new Set(['aprobado', 'en_progreso', 'resuelto']);
  return {
    approvedHours: tickets
      .filter(t => approvedStatuses.has(t.status))
      .reduce((sum, t) => sum + (t.estimated_hours || 0), 0),
    pending: tickets.filter(t => t.status === 'pendiente').length,
    estimated: tickets.filter(t => t.status === 'estimado').length,
    inProgress: tickets.filter(t => t.status === 'en_progreso').length,
    resolved: tickets.filter(t => t.status === 'resuelto').length
  };
};

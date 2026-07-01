/**
 * Exporta un conjunto de datos a un archivo CSV descargable.
 */
export const exportToCSV = (filename: string, headers: string[], rows: (string | number | null | undefined)[][]) => {
  // Convertir filas a formato CSV respetando comillas y comas
  const csvRows = [
    headers.join(','),
    ...rows.map(row => 
      row.map(val => {
        const str = val === null || val === undefined ? '' : String(val);
        // Si tiene comas, comillas o nuevas líneas, lo encerramos en comillas dobles
        if (/[",\n\r]/.test(str)) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(',')
    )
  ];

  const csvContent = '\uFEFF' + csvRows.join('\n'); // BOM para UTF-8 en Excel
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

import * as XLSX from 'xlsx';
import { CampaignReport } from '../types';

export const generateSampleExcel = () => {
  const data = [
    ['Date', 'Campaign Name', 'Purchases', 'Cost Per Purchase', 'Confirmed', 'Canceled', 'Pending', 'ROAS'],
    ['2024-04-01', 'Spring Sale 2024', 150, 12.5, 120, 10, 20, 3.5],
    ['2024-04-01', 'New Arrivals FB', 85, 15.2, 70, 5, 10, 2.8],
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Campaign Report');
  
  // Generate buffer
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  
  // Create blob and download
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'campaign_report_sample.xlsx';
  a.click();
  URL.revokeObjectURL(url);
};

export const parseReportExcel = async (file: File): Promise<Partial<CampaignReport>[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const reports: Partial<CampaignReport>[] = jsonData.map((row: any) => {
          const purchases = Number(row['Purchases']) || 0;
          const cpp = Number(row['Cost Per Purchase']) || 0;
          const confirmed = Number(row['Confirmed']) || 0;
          const canceled = Number(row['Canceled']) || 0;
          const pending = Number(row['Pending']) || 0;
          const roas = Number(row['ROAS']) || 0;
          const totalSpend = purchases * cpp;

          return {
            campaignDate: row['Date'] ? new Date(row['Date']).toISOString() : new Date().toISOString(),
            campaignName: row['Campaign Name'] || 'Unnamed Campaign',
            purchases,
            costPerPurchase: cpp,
            confirmed,
            canceled,
            pending,
            roas,
            totalSpend,
            netOrders: confirmed,
            cancellationRate: purchases > 0 ? (canceled / purchases) * 100 : 0,
            confirmationRate: purchases > 0 ? (confirmed / purchases) * 100 : 0,
            performanceScore: purchases > 0 ? (confirmed / purchases) * 100 : 0,
          };
        });

        resolve(reports);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

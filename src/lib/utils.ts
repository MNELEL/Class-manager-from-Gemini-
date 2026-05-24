import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const exportData = (data: any, filename: string = 'data.csv') => {
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map((row: any) => 
      headers.map(fieldName => JSON.stringify(row[fieldName])).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.click();
};

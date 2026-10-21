/// <reference types="vite/client" />

declare module 'jspdf' {
  export class jsPDF {
    constructor(options?: any);
    internal: any;
    setFillColor(...args: any[]): void;
    rect(...args: any[]): void;
    setTextColor(...args: any[]): void;
    setFont(...args: any[]): void;
    setFontSize(...args: any[]): void;
    text(...args: any[]): void;
    setDrawColor(...args: any[]): void;
    setLineWidth(...args: any[]): void;
    line(...args: any[]): void;
    addPage(...args: any[]): void;
    getNumberOfPages(): number;
    setPage(page: number): void;
    splitTextToSize(text: string, maxW: number): string[];
    output(type: 'blob'): Blob;
    output(type: string): any;
  }
}

declare module 'jspdf-autotable' {
  export function autoTable(doc: any, options: any): void;
}

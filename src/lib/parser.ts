"use client";

import Papa from "papaparse";
import { Workbook } from "exceljs";
import type { Transaction } from "@/types/transaction";

type RawRow = Record<string, unknown>;

const aliases: Record<string, string[]> = {
  pelanggan: ["pelanggan", "nama", "customer", "pembeli"],
  nominal: ["nominal", "jumlah", "amount", "total", "nilai"],
  metode: ["metode", "metode pembayaran", "payment method", "method", "pembayaran"],
  waktu: ["waktu", "tanggal", "jam", "timestamp", "date"],
  kota: ["kota", "lokasi", "city"],
  catatan: ["catatan", "note", "notes", "keterangan"],
};

function normalizeKey(value: string) {
  return value.toLowerCase().trim().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function findValue(row: RawRow, field: keyof typeof aliases) {
  const normalized = new Map(Object.entries(row).map(([key, value]) => [normalizeKey(key), value]));
  for (const alias of aliases[field]) {
    const value = normalized.get(alias);
    if (value !== undefined && value !== null && String(value).trim()) return value;
  }
  return "";
}

function parseAmount(value: unknown) {
  if (typeof value === "number") return value;
  const cleaned = String(value)
    .replace(/rp/gi, "")
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");
  return Number(cleaned);
}

function normalizeRows(rows: RawRow[]): Transaction[] {
  const transactions = rows
    .filter((row) => Object.values(row).some((value) => String(value ?? "").trim()))
    .map((row, index) => ({
      id: `FG-${Date.now()}-${index + 1}`,
      pelanggan: String(findValue(row, "pelanggan")).trim(),
      nominal: parseAmount(findValue(row, "nominal")),
      metode: String(findValue(row, "metode")).trim(),
      waktu: String(findValue(row, "waktu")).trim(),
      kota: String(findValue(row, "kota")).trim() || undefined,
      catatan: String(findValue(row, "catatan")).trim() || undefined,
    }));

  if (!transactions.length) throw new Error("File tidak memiliki baris transaksi.");
  const invalid = transactions.find(
    (item) => !item.pelanggan || !Number.isFinite(item.nominal) || item.nominal < 0 || !item.metode || !item.waktu,
  );
  if (invalid) {
    throw new Error("Kolom wajib: pelanggan, nominal, metode, dan waktu. Periksa kembali format file.");
  }
  if (transactions.length > 50) throw new Error("Maksimal 50 transaksi per analisis.");
  return transactions;
}

export async function parseTransactionFile(file: File): Promise<Transaction[]> {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "csv") {
    return new Promise((resolve, reject) => {
      Papa.parse<RawRow>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          if (result.errors.length) return reject(new Error(`CSV tidak dapat dibaca: ${result.errors[0].message}`));
          try {
            resolve(normalizeRows(result.data));
          } catch (error) {
            reject(error);
          }
        },
        error: () => reject(new Error("CSV tidak dapat dibaca.")),
      });
    });
  }

  if (extension === "xlsx") {
    const data = await file.arrayBuffer();
    const workbook = new Workbook();
    await workbook.xlsx.load(data);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) throw new Error("Workbook tidak memiliki sheet.");
    const headers: string[] = [];
    worksheet.getRow(1).eachCell({ includeEmpty: true }, (cell, column) => {
      headers[column - 1] = cell.text.trim();
    });
    const rows: RawRow[] = [];
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return;
      const output: RawRow = {};
      headers.forEach((header, index) => {
        if (header) output[header] = row.getCell(index + 1).text;
      });
      rows.push(output);
    });
    return normalizeRows(rows);
  }

  throw new Error("Gunakan file CSV atau XLSX.");
}

export function createSampleTransactions(): Transaction[] {
  return [
    { id: "DEMO-001", pelanggan: "Siti Rahma", nominal: 285000, metode: "QRIS", waktu: "2026-07-16 10:24", kota: "Bandung", catatan: "Pesanan hijab 3 pcs" },
    { id: "DEMO-002", pelanggan: "Budi Santoso", nominal: 15400000, metode: "Transfer bank", waktu: "2026-07-16 02:13", kota: "Jakarta", catatan: "Akun baru, minta kirim cepat" },
    { id: "DEMO-003", pelanggan: "Nadia Putri", nominal: 850000, metode: "Virtual account", waktu: "2026-07-16 14:55", kota: "Surabaya" },
    { id: "DEMO-004", pelanggan: "Rizky Pratama", nominal: 7200000, metode: "Kartu kredit", waktu: "2026-07-16 03:07", kota: "Medan", catatan: "Alamat berbeda dari pemegang kartu" },
    { id: "DEMO-005", pelanggan: "Toko Maju Jaya", nominal: 1250000, metode: "Transfer bank", waktu: "2026-07-16 11:40", kota: "Semarang", catatan: "Pelanggan berulang" },
  ];
}

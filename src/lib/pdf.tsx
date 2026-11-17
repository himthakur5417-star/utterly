import React from "react";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { Client, Invoice, InvoiceItem } from "@prisma/client";
import { formatCurrency, formatDate } from "@/lib/utils";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: "Helvetica", color: "#1e222a" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 28 },
  brand: { fontSize: 20, fontWeight: "bold", color: "#1f47f5" },
  brandSub: { fontSize: 9, color: "#666f83", marginTop: 2 },
  invoiceTitle: { fontSize: 26, fontWeight: "bold", color: "#1e222a" },
  invoiceNo: { fontSize: 12, color: "#51586b", marginTop: 2 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 18 },
  metaBlock: { width: "45%" },
  metaLabel: { fontSize: 8, color: "#858d9e", textTransform: "uppercase", marginBottom: 4 },
  metaText: { fontSize: 10, color: "#343841", lineHeight: 1.6 },
  table: { marginTop: 24, borderTopWidth: 1, borderTopColor: "#d5d8df" },
  tableHead: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#ecedf0", paddingVertical: 8 },
  th: { fontSize: 8, color: "#858d9e", textTransform: "uppercase" },
  desc: { width: "52%" },
  qty: { width: "14%", textAlign: "right" },
  price: { width: "17%", textAlign: "right" },
  amount: { width: "17%", textAlign: "right" },
  row: { flexDirection: "row", paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: "#f6f7f9" },
  td: { fontSize: 10, color: "#343841" },
  totals: { marginTop: 16, alignSelf: "flex-end", width: "45%" },
  totalLine: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  totalLabel: { fontSize: 10, color: "#666f83" },
  totalValue: { fontSize: 10, color: "#343841" },
  grand: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#d5d8df", marginTop: 6, paddingTop: 8 },
  grandLabel: { fontSize: 12, fontWeight: "bold" },
  grandValue: { fontSize: 12, fontWeight: "bold", color: "#1f47f5" },
  memo: { marginTop: 24, fontSize: 9, color: "#666f83" },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, borderTopWidth: 1, borderTopColor: "#ecedf0", paddingTop: 10, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 8, color: "#858d9e" },
});

interface PdfInvoice extends Invoice {
  client: Client;
  items: InvoiceItem[];
}

function InvoiceDocument({ invoice, businessName }: { invoice: PdfInvoice; businessName: string }) {
  const subtotal = invoice.items.reduce((s, i) => s + i.amount, 0);
  const discount = (subtotal * invoice.discountPercent) / 100;
  const taxable = subtotal - discount;
  const tax = (taxable * invoice.taxPercent) / 100;
  const total = taxable + tax;
  const due = Math.max(0, total - invoice.amountPaid);

  return (
    <Document title={`Invoice ${invoice.number}`}>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>Utterly</Text>
            <Text style={styles.brandSub}>{businessName}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.invoiceTitle}>Invoice</Text>
            <Text style={styles.invoiceNo}>#{invoice.number}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>From</Text>
            <Text style={styles.metaText}>{businessName}</Text>
            <Text style={styles.metaText}>Billed via Utterly</Text>
          </View>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Bill to</Text>
            <Text style={styles.metaText}>{invoice.client.name}</Text>
            {invoice.client.contactName ? <Text style={styles.metaText}>{invoice.client.contactName}</Text> : null}
            {invoice.client.email ? <Text style={styles.metaText}>{invoice.client.email}</Text> : null}
            {invoice.client.billingAddress ? <Text style={styles.metaText}>{invoice.client.billingAddress}</Text> : null}
          </View>
          <View style={[styles.metaBlock, { alignItems: "flex-end" }]}>
            <Text style={styles.metaLabel}>Details</Text>
            <Text style={styles.metaText}>Issue date: {formatDate(invoice.issueDate)}</Text>
            <Text style={styles.metaText}>Due date: {formatDate(invoice.dueDate)}</Text>
            <Text style={styles.metaText}>Status: {invoice.status.replace(/_/g, " ")}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHead}>
            <Text style={[styles.th, styles.desc]}>Description</Text>
            <Text style={[styles.th, styles.qty]}>Qty</Text>
            <Text style={[styles.th, styles.price]}>Unit price</Text>
            <Text style={[styles.th, styles.amount]}>Amount</Text>
          </View>
          {invoice.items.map((item) => (
            <View style={styles.row} key={item.id}>
              <Text style={[styles.td, styles.desc]}>{item.description}</Text>
              <Text style={[styles.td, styles.qty]}>{item.quantity}</Text>
              <Text style={[styles.td, styles.price]}>{formatCurrency(item.unitPrice, invoice.currency)}</Text>
              <Text style={[styles.td, styles.amount]}>{formatCurrency(item.amount, invoice.currency)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalLine}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{formatCurrency(subtotal, invoice.currency)}</Text>
          </View>
          {invoice.discountPercent > 0 ? (
            <View style={styles.totalLine}>
              <Text style={styles.totalLabel}>Discount ({invoice.discountPercent}%)</Text>
              <Text style={styles.totalValue}>−{formatCurrency(discount, invoice.currency)}</Text>
            </View>
          ) : null}
          {invoice.taxPercent > 0 ? (
            <View style={styles.totalLine}>
              <Text style={styles.totalLabel}>Tax ({invoice.taxPercent}%)</Text>
              <Text style={styles.totalValue}>{formatCurrency(tax, invoice.currency)}</Text>
            </View>
          ) : null}
          <View style={styles.grand}>
            <Text style={styles.grandLabel}>Total due</Text>
            <Text style={styles.grandValue}>{formatCurrency(due, invoice.currency)}</Text>
          </View>
        </View>

        {invoice.memo ? <Text style={styles.memo}>Notes: {invoice.memo}</Text> : null}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Utterly — AI Invoice & Payment Recovery</Text>
          <Text style={styles.footerText}>Questions? Reply to this invoice email.</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function generateInvoicePdf(invoice: PdfInvoice, businessName: string): Promise<Buffer> {
  const buffer = await renderToBuffer(<InvoiceDocument invoice={invoice} businessName={businessName} />);
  return Buffer.from(buffer);
}

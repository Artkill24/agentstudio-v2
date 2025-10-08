import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 10 },
  header: { marginBottom: 20, borderBottom: '1px solid black', paddingBottom: 10 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  table: { marginTop: 20, borderTop: '1px solid black' },
  tableRow: { flexDirection: 'row', borderBottom: '1px solid gray', padding: 5 },
  bold: { fontWeight: 'bold' }
})

interface InvoicePDFProps {
  invoiceNumber: string
  clientName: string
  clientAddress: string
  amount: number
  iva: number
  ritenuta: number
  bollo: boolean
  total: number
  date: string
}

export const InvoicePDF = ({ 
  invoiceNumber, clientName, clientAddress, 
  amount, iva, ritenuta, bollo, total, date 
}: InvoicePDFProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>FATTURA N. {invoiceNumber}</Text>
        <Text>Data: {date}</Text>
      </View>
      
      <View style={{ marginBottom: 20 }}>
        <Text style={styles.bold}>Cliente:</Text>
        <Text>{clientName}</Text>
        <Text>{clientAddress}</Text>
      </View>

      <View style={styles.table}>
        <View style={styles.tableRow}>
          <Text style={styles.bold}>Descrizione</Text>
          <Text style={styles.bold}>Importo</Text>
        </View>
        <View style={styles.tableRow}>
          <Text>Imponibile</Text>
          <Text>€ {amount.toFixed(2)}</Text>
        </View>
        <View style={styles.tableRow}>
          <Text>IVA ({iva}%)</Text>
          <Text>€ {(amount * iva / 100).toFixed(2)}</Text>
        </View>
        {ritenuta > 0 && (
          <View style={styles.tableRow}>
            <Text>Ritenuta d'acconto ({ritenuta}%)</Text>
            <Text>- € {(amount * ritenuta / 100).toFixed(2)}</Text>
          </View>
        )}
        {bollo && (
          <View style={styles.tableRow}>
            <Text>Marca da bollo</Text>
            <Text>€ 2.00</Text>
          </View>
        )}
        <View style={[styles.tableRow, { borderTop: '2px solid black' }]}>
          <Text style={styles.bold}>TOTALE</Text>
          <Text style={styles.bold}>€ {total.toFixed(2)}</Text>
        </View>
      </View>
    </Page>
  </Document>
)
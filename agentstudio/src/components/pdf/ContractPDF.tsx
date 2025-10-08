import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: 'Helvetica' },
  title: { fontSize: 18, marginBottom: 20, textAlign: 'center', fontWeight: 'bold' },
  section: { marginBottom: 15 },
  text: { lineHeight: 1.5 }
})

interface ContractPDFProps {
  title: string
  content: string
  clientName: string
}

export const ContractPDF = ({ title, content, clientName }: ContractPDFProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.title}>
        <Text>{title}</Text>
      </View>
      <View style={styles.section}>
        <Text>Cliente: {clientName}</Text>
        <Text>Data: {new Date().toLocaleDateString('it-IT')}</Text>
      </View>
      <View style={styles.section}>
        <Text style={styles.text}>{content}</Text>
      </View>
    </Page>
  </Document>
)
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: 'Helvetica' },
  title: { fontSize: 18, marginBottom: 20, textAlign: 'center', fontWeight: 'bold' },
  section: { marginBottom: 15 },
  text: { lineHeight: 1.5 },
  signatureSection: { marginTop: 40, borderTop: '1px solid #ccc', paddingTop: 20 },
  signatureLabel: { fontSize: 9, color: '#666', marginBottom: 6 },
  signatureImage: { width: 180, height: 70, objectFit: 'contain' },
  signatureDate: { fontSize: 9, color: '#666', marginTop: 6 },
})

interface ContractPDFProps {
  title: string
  content: string
  clientName: string
  signatureDataUrl?: string
}

export const ContractPDF = ({ title, content, clientName, signatureDataUrl }: ContractPDFProps) => (
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
      {signatureDataUrl && (
        <View style={styles.signatureSection}>
          <Text style={styles.signatureLabel}>Firma</Text>
          <Image src={signatureDataUrl} style={styles.signatureImage} />
          <Text style={styles.signatureDate}>
            Firmato digitalmente il {new Date().toLocaleDateString('it-IT')}
          </Text>
        </View>
      )}
    </Page>
  </Document>
)

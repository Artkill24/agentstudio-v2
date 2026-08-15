// Strumenti fiscali deterministici — nessuna generazione AI, solo calcolo e verifica reale.

export interface VatCheckResult {
  valid: boolean
  countryCode: string
  vatNumber: string
  name?: string
  address?: string
  requestDate?: string
  error?: string
}

/**
 * Verifica una Partita IVA tramite il servizio ufficiale VIES della Commissione Europea.
 * Endpoint pubblico, gratuito, nessuna chiave richiesta.
 */
export async function checkVatNumber(countryCode: string, vatNumber: string): Promise<VatCheckResult> {
  const cc = countryCode.toUpperCase().trim()
  const vn = vatNumber.replace(/\s+/g, '').trim()

  if (!/^[A-Z]{2}$/.test(cc)) {
    return { valid: false, countryCode: cc, vatNumber: vn, error: 'Codice paese non valido (es. IT, DE, FR)' }
  }
  if (!/^[0-9A-Za-z+*.]{2,12}$/.test(vn)) {
    return { valid: false, countryCode: cc, vatNumber: vn, error: 'Formato numero P.IVA non valido' }
  }

  try {
    const response = await fetch(`https://ec.europa.eu/taxation_customs/vies/rest-api/ms/${cc}/vat/${vn}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    })

    if (!response.ok) {
      return { valid: false, countryCode: cc, vatNumber: vn, error: 'Servizio VIES temporaneamente non disponibile' }
    }

    const data = await response.json()

    if (data.userError && data.userError !== 'VALID') {
      return { valid: false, countryCode: cc, vatNumber: vn, error: `Servizio VIES: ${data.userError}` }
    }

    return {
      valid: Boolean(data.isValid ?? data.valid),
      countryCode: cc,
      vatNumber: vn,
      name: data.name && data.name !== '---' ? data.name : undefined,
      address: data.address && data.address !== '---' ? data.address : undefined,
      requestDate: data.requestDate,
    }
  } catch {
    return {
      valid: false,
      countryCode: cc,
      vatNumber: vn,
      error: 'Servizio VIES non raggiungibile al momento (può capitare durante manutenzioni nazionali). Riprova tra qualche minuto.',
    }
  }
}

/**
 * Valida formalmente un Codice Fiscale italiano (persona fisica, 16 caratteri).
 * Solo controllo di formato — non verifica l'esistenza reale in Anagrafe Tributaria
 * (non esiste un servizio pubblico gratuito per quello).
 */
export function validateCodiceFiscale(cf: string): { valid: boolean; reason?: string } {
  const clean = cf.toUpperCase().trim()
  const pattern = /^[A-Z]{6}[0-9LMNPQRSTUV]{2}[ABCDEHLMPRST][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/

  if (clean.length !== 16) {
    return { valid: false, reason: `Lunghezza non valida (${clean.length} caratteri, attesi 16)` }
  }
  if (!pattern.test(clean)) {
    return { valid: false, reason: 'Formato non conforme allo schema del Codice Fiscale italiano' }
  }
  return { valid: true }
}

export interface FiscalCalculation {
  regime: string
  imponibile: number
  iva: number
  ritenuta: number
  totaleFattura: number
  nettoPercepito: number
  note: string[]
}

interface FiscalCalcInput {
  imponibile: number
  regime: 'forfettario' | 'ordinario'
  aliquotaIva?: number // default 22
  ritenutaAcconto?: boolean // solo regime ordinario, default true per prestazioni professionali
  coefficienteRedditivita?: number // forfettario, default 0.78 (attività professionali generiche)
}

/**
 * Calcolo fiscale rapido e trasparente per una fattura di prestazione professionale italiana.
 * Regole semplificate e standard — sempre da verificare con il proprio commercialista
 * per la situazione specifica (aliquote INPS, cassa previdenziale di categoria, ecc.).
 */
export function calculateInvoiceFiscal(input: FiscalCalcInput): FiscalCalculation {
  const notes: string[] = []
  const imponibile = Math.round(input.imponibile * 100) / 100

  if (input.regime === 'forfettario') {
    // Regime forfettario: no IVA in fattura, no ritenuta d'acconto (tranne casi specifici)
    notes.push('Regime forfettario: fattura senza IVA (operazione fuori campo IVA ex art.1 c.58 L.190/2014)')
    notes.push('Regime forfettario: nessuna ritenuta d\'acconto da applicare (salvo specifiche eccezioni)')
    notes.push('Imposta sostitutiva (5% o 15%) e contributi previdenziali si calcolano separatamente sul reddito annuo, non su questa fattura')

    return {
      regime: 'forfettario',
      imponibile,
      iva: 0,
      ritenuta: 0,
      totaleFattura: imponibile,
      nettoPercepito: imponibile,
      note: notes,
    }
  }

  // Regime ordinario
  const aliquotaIva = input.aliquotaIva ?? 22
  const applicaRitenuta = input.ritenutaAcconto ?? true

  const iva = Math.round(imponibile * (aliquotaIva / 100) * 100) / 100
  const ritenuta = applicaRitenuta ? Math.round(imponibile * 0.2 * 100) / 100 : 0

  if (applicaRitenuta) {
    notes.push('Ritenuta d\'acconto 20% calcolata sul solo imponibile (standard per prestazioni professionali)')
  }
  notes.push(`IVA ${aliquotaIva}% calcolata sull'imponibile`)
  notes.push('Non include eventuale contributo cassa previdenziale di categoria (es. 4% per alcune casse) — verificare se applicabile')

  const totaleFattura = Math.round((imponibile + iva) * 100) / 100
  const nettoPercepito = Math.round((totaleFattura - ritenuta) * 100) / 100

  return {
    regime: 'ordinario',
    imponibile,
    iva,
    ritenuta,
    totaleFattura,
    nettoPercepito,
    note: notes,
  }
}

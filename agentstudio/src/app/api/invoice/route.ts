import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const body = await request.json()
    const {
      invoiceNumber,
      invoiceDate,
      clientName,
      clientVat,
      clientAddress,
      items,
      subtotal,
      totalVat,
      withholding,
      stamp,
      total,
      notes
    } = body

    // Validazione
    if (!invoiceNumber || !clientName || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Dati obbligatori mancanti' },
        { status: 400 }
      )
    }

    // Get profile per intestazione fattura
    const { data: profile } = await supabase
      .from('studio_profiles')
      .select('studio_name, vat_number, address, email, phone')
      .eq('user_id', user.id)
      .single()

    // Genera HTML fattura
    const invoiceHTML = generateInvoiceHTML({
      invoiceNumber,
      invoiceDate,
      clientName,
      clientVat,
      clientAddress,
      items,
      subtotal,
      totalVat,
      withholding,
      stamp,
      total,
      notes,
      supplier: {
        name: profile?.studio_name || 'Studio Legale',
        vat: profile?.vat_number || '',
        address: profile?.address || '',
        email: profile?.email || user.email,
        phone: profile?.phone || ''
      }
    })

    // Salva nel database
    const { data: invoice, error: saveError } = await supabase
      .from('invoices')
      .insert({
        user_id: user.id,
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        client_name: clientName,
        client_vat: clientVat,
        client_address: clientAddress,
        items,
        subtotal,
        total_vat: totalVat,
        total,
        withholding_tax: withholding,
        stamp_duty: stamp,
        notes,
        status: 'draft'
      })
      .select()
      .single()

    if (saveError) {
      console.error('Error saving invoice:', saveError)
  
      // Gestione errore duplicato
      if (saveError.code === '23505') {
       return NextResponse.json(
         { 
           error: `Fattura ${invoiceNumber} già esistente. Usa un numero diverso.`,
           html: invoiceHTML // Restituisci comunque l'HTML
         },
         { status: 409 }
        )
       }
        
       return NextResponse.json(
         { error: 'Errore nel salvataggio' },
         { status: 500 }
        )
       }

    return NextResponse.json({
      success: true,
      invoice,
      html: invoiceHTML
    })

  } catch (error: any) {
    console.error('Invoice error:', error)
    return NextResponse.json(
      { error: 'Errore interno' },
      { status: 500 }
    )
  }
}

function generateInvoiceHTML(data: any): string {
  const {
    invoiceNumber,
    invoiceDate,
    clientName,
    clientVat,
    clientAddress,
    items,
    subtotal,
    totalVat,
    withholding,
    stamp,
    total,
    notes,
    supplier
  } = data

  return `
  
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
    .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .company { font-weight: bold; }
    .invoice-title { font-size: 24px; font-weight: bold; margin: 20px 0; }
    .client-box { border: 1px solid #ddd; padding: 15px; margin: 20px 0; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
    th { background: #f5f5f5; }
    .text-right { text-align: right; }
    .totals { margin-left: auto; width: 300px; }
    .totals td { border: none; padding: 5px; }
    .total-row { font-weight: bold; font-size: 18px; border-top: 2px solid #333; }
    .notes { margin-top: 30px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="company">${supplier.name}</div>
      <div>${supplier.address}</div>
      <div>P.IVA: ${supplier.vat}</div>
      <div>${supplier.email}</div>
      <div>${supplier.phone}</div>
    </div>
    <div class="invoice-title">
      FATTURA N. ${invoiceNumber}<br>
      <small style="font-size: 14px;">Data: ${new Date(invoiceDate).toLocaleDateString('it-IT')}</small>
    </div>
  </div>

  <div class="client-box">
    <strong>CLIENTE:</strong><br>
    ${clientName}<br>
    ${clientVat ? `P.IVA/CF: ${clientVat}<br>` : ''}
    ${clientAddress ? `${clientAddress}<br>` : ''}
  </div>

  <table>
    <thead>
      <tr>
        <th>Descrizione</th>
        <th class="text-right">Q.tà</th>
        <th class="text-right">Prezzo</th>
        <th class="text-right">IVA</th>
        <th class="text-right">Totale</th>
      </tr>
    </thead>
    <tbody>
      ${items.map((item: any) => {
        const lineTotal = item.quantity * item.unitPrice
        const lineVat = lineTotal * (item.vat / 100)
        return `
          <tr>
            <td>${item.description}</td>
            <td class="text-right">${item.quantity}</td>
            <td class="text-right">€${item.unitPrice.toFixed(2)}</td>
            <td class="text-right">${item.vat}%</td>
            <td class="text-right">€${(lineTotal + lineVat).toFixed(2)}</td>
          </tr>         `
      }).join('')}
    </tbody>
  </table>

  <table class="totals">
    <tr>
      <td>Imponibile:</td>
      <td class="text-right">€${subtotal.toFixed(2)}</td>
    </tr>
    <tr>
      <td>IVA:</td>
      <td class="text-right">€${totalVat.toFixed(2)}</td>
    </tr>
    ${withholding > 0 ? `
    <tr>
      <td>Ritenuta d'acconto 20%:</td>
      <td class="text-right">-€${withholding.toFixed(2)}</td>
    </tr>
    ` : ''}
    ${stamp > 0 ? `
    <tr>
      <td>Bollo:</td>
      <td class="text-right">€${stamp.toFixed(2)}</td>
    </tr>
    ` : ''}
    <tr class="total-row">
      <td>TOTALE:</td>
      <td class="text-right">€${total.toFixed(2)}</td>
    </tr>
  </table>

  ${notes ? `<div class="notes"><strong>Note:</strong><br>${notes}</div>` : ''}

  <div style="margin-top: 60px; text-align: center; font-size: 11px; color: #999;">
    Documento generato con AgentStudio
  </div>
</body>
</html>
  `
}
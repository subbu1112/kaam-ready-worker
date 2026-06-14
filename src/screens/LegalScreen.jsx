import { useState } from 'react'
const Y='#F5C000', YD='#B8900A', BK='#1C1C1E'

const SECTIONS = {
  terms: {
    title: 'Terms & Conditions',
    ico: '📜',
    content: `Last updated: June 2025

1. ACCEPTANCE OF TERMS
By registering as a service provider on Kaam Ready, you agree to these Terms & Conditions. If you do not agree, do not use the platform.

2. WORKER OBLIGATIONS
- Complete all accepted jobs professionally and on time
- Maintain valid KYC documents at all times
- Uphold service quality standards as defined by Kaam Ready
- Not to engage in fraudulent bookings or manipulate the rating system

3. COMMISSION & PAYMENTS
- Kaam Ready retains a 10% platform commission on each completed booking
- You receive 90% of the booking amount to your registered UPI ID
- Payouts are processed weekly (every Monday)
- Disputes must be raised within 48 hours of job completion

4. KYC REQUIREMENTS
- Valid Aadhaar card (mandatory)
- PAN card (mandatory for tax purposes)
- Profile photo (mandatory)
- Service-specific certifications may be required

5. CONDUCT STANDARDS
- Zero tolerance for abuse, harassment, or misconduct toward customers
- Accurate representation of skills and experience
- Maintain cleanliness and professionalism at job sites

6. ACCOUNT SUSPENSION
Accounts may be suspended for: repeated cancellations, low ratings (below 3.0), misconduct complaints, or KYC expiry.

7. TERMINATION
You may deactivate your account at any time. Kaam Ready reserves the right to terminate accounts for policy violations.

8. GOVERNING LAW
These terms are governed by the laws of India. Disputes will be resolved under jurisdiction of Telangana courts.`
  },
  privacy: {
    title: 'Privacy Policy',
    ico: '🔒',
    content: `Last updated: June 2025

1. DATA WE COLLECT
- Personal details: Name, phone, address, Aadhaar, PAN
- Location data during active jobs (only when app is open)
- Banking/UPI details for payouts
- Service history and ratings

2. HOW WE USE YOUR DATA
- Matching you with nearby bookings
- Processing payouts to your UPI
- KYC verification with government databases
- Customer service and dispute resolution
- Improving platform features

3. DATA SHARING
We share your data only with:
- Customers (name, phone, service category) for booked jobs
- Payment processors for UPI payouts
- Government agencies if legally required

4. DATA SECURITY
- All data encrypted in transit (TLS 1.3)
- Aadhaar and PAN stored encrypted at rest
- Access restricted to authorised personnel only
- You can request deletion of your data

5. LOCATION DATA
Location is only tracked during active bookings for customer ETA updates. We do not track location in the background.

6. YOUR RIGHTS
- Access your personal data
- Correct inaccurate data
- Request data deletion
- Withdraw consent

7. CONTACT
privacy@kaamready.in | 1800-KR-HELP`
  },
  refund: {
    title: 'Cancellation Policy',
    ico: '↩️',
    content: `Last updated: June 2025

FOR WORKERS — CANCELLATION RULES:

1. CUSTOMER CANCELLATIONS
- If cancelled before you are dispatched: No compensation
- If cancelled after you are en route: ₹100–₹150 cancellation fee charged to customer, credited to you
- If cancelled after you have arrived: ₹200–₹300 credited to you

2. WORKER CANCELLATIONS
- You may cancel before acceptance without penalty
- Cancelling after acceptance: penalty of ₹50 deducted from wallet
- Repeat cancellations (>3 in a week) may result in account review

3. NO-SHOW JOBS
- If customer is not at location after 15 min wait, raise a no-show dispute in the app
- Verified no-shows: ₹150 compensation credited to your wallet

4. SERVICE DISPUTES
- Quality disputes raised by customers reviewed within 24 hours
- Re-do of service may be required for valid complaints
- Partial refunds to customers may be deducted from your payout

5. APPEALS
Dispute any penalty within 48 hours via Help & Support → Raise a Ticket.`
  }
}

export default function LegalScreen({ onBack }) {
  const [section, setSection] = useState(null)
  const s = section ? SECTIONS[section] : null

  if (s) return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', background:'#111' }}>
      <div style={{ background:BK, padding:'52px 20px 20px', flexShrink:0 }}>
        <button onClick={()=>setSection(null)} style={{ background:'rgba(255,255,255,.12)', border:'none', borderRadius:10, padding:'6px 14px', color:'#fff', cursor:'pointer', fontFamily:'inherit', fontWeight:600, fontSize:13, marginBottom:14 }}>← Back</button>
        <div style={{ fontSize:28 }}>{s.ico}</div>
        <h1 style={{ fontSize:18, fontWeight:800, color:Y, marginTop:8 }}>{s.title}</h1>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:'16px 20px' }}>
        <pre style={{ fontFamily:'inherit', fontSize:13, color:'#aaa', lineHeight:1.7, whiteSpace:'pre-wrap', wordBreak:'break-word' }}>{s.content}</pre>
        <div style={{ height:32 }} />
      </div>
    </div>
  )

  return (
    <div style={{ flex:1, overflowY:'auto', background:'#111' }}>
      <div style={{ background:BK, padding:'52px 20px 20px' }}>
        <button onClick={onBack} style={{ background:'rgba(255,255,255,.12)', border:'none', borderRadius:10, padding:'6px 14px', color:'#fff', cursor:'pointer', fontFamily:'inherit', fontWeight:600, fontSize:13, marginBottom:14 }}>← Back</button>
        <div style={{ fontSize:32 }}>⚖️</div>
        <h1 style={{ fontSize:20, fontWeight:800, color:Y, marginTop:8 }}>Legal</h1>
        <p style={{ fontSize:13, color:'#555', marginTop:4 }}>Platform policies and your rights</p>
      </div>
      <div style={{ padding:16, display:'flex', flexDirection:'column', gap:10 }}>
        {Object.entries(SECTIONS).map(([k,v]) => (
          <button key={k} onClick={()=>setSection(k)} style={{ background:'#1a1a1a', borderRadius:14, padding:'14px 16px', border:'1px solid #2a2a2a', cursor:'pointer', fontFamily:'inherit', textAlign:'left', display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:44, height:44, borderRadius:12, background:'#2a2a2a', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>{v.ico}</div>
            <div style={{ flex:1 }}>
              <p style={{ fontSize:14, fontWeight:700, color:'#fff' }}>{v.title}</p>
              <p style={{ fontSize:11, color:'#555', marginTop:2 }}>Tap to read</p>
            </div>
            <span style={{ color:'#333', fontSize:18 }}>›</span>
          </button>
        ))}
        <div style={{ background:'#1a1a1a', borderRadius:14, padding:16, border:'1px solid #2a2a2a', marginTop:4 }}>
          <p style={{ fontSize:12, fontWeight:700, color:'#444', textTransform:'uppercase', marginBottom:8 }}>Contact Legal</p>
          <p style={{ fontSize:13, color:'#555', lineHeight:1.6 }}>For legal queries: <span style={{ color:Y }}>legal@kaamready.in</span></p>
          <p style={{ fontSize:13, color:'#555', marginTop:4 }}>Helpline: <span style={{ color:Y }}>1800-KR-HELP</span></p>
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { FileText, ChevronDown, ChevronUp } from 'lucide-react'

export default function TermsOfService() {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['1']))

  const toggleSection = (id: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedSections(newExpanded)
  }

  const sections = [
    {
      id: '1',
      title: '1. Acceptance of Terms',
      content: `By accessing and using BITTX SMS services, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services. These terms constitute a legally binding agreement between you and BITTX SMS.`
    },
    {
      id: '2',
      title: '2. Description of Service',
      content: `BITTX SMS provides SMS verification services, OTP delivery, and related telecommunications services. Our platform enables users to send and receive SMS messages for verification purposes. We reserve the right to modify, suspend, or discontinue any aspect of our services at any time without prior notice.`
    },
    {
      id: '3',
      title: '3. User Responsibilities',
      content: `Users are responsible for maintaining the confidentiality of their account credentials. You agree to:
      - Use our services only for legitimate purposes
      - Not engage in fraudulent activities or spam
      - Comply with all applicable laws and regulations
      - Not attempt to circumvent our security measures
      - Provide accurate and complete information during registration`
    },
    {
      id: '4',
      title: '4. Account Registration',
      content: `To use our services, you must create an account. You agree to provide accurate, current, and complete information during registration. You are responsible for maintaining the security of your account and for all activities that occur under your account. BITTX SMS reserves the right to suspend or terminate accounts that violate these terms.`
    },
    {
      id: '5',
      title: '5. Payment and Billing',
      content: `BITTX SMS services are subject to fees. By using our services, you agree to pay all applicable charges. Payments are processed through our secure payment system. All fees are non-refundable unless otherwise stated. We reserve the right to change our pricing at any time with prior notice.`
    },
    {
      id: '6',
      title: '6. Prohibited Activities',
      content: `You may not use our services to:
      - Send unsolicited messages or spam
      - Engage in fraudulent or illegal activities
      - Violate any local, state, national, or international law
      - Infringe upon the rights of others
      - Distribute viruses or malicious code
      - Attempt to gain unauthorized access to our systems`
    },
    {
      id: '7',
      title: '7. Privacy Policy',
      content: `Your use of our services is also governed by our Privacy Policy, which describes how we collect, use, and protect your personal information. By using our services, you consent to our data practices as described in our Privacy Policy.`
    },
    {
      id: '8',
      title: '8. Intellectual Property',
      content: `All content, features, and functionality of BITTX SMS are owned by BITTX SMS and are protected by international copyright, trademark, and other intellectual property laws. You may not reproduce, modify, or distribute our content without prior written consent.`
    },
    {
      id: '9',
      title: '9. Limitation of Liability',
      content: `BITTX SMS shall not be liable for any indirect, incidental, special, or consequential damages arising from the use or inability to use our services. Our total liability shall not exceed the amount paid by you for the services in the twelve months preceding the claim.`
    },
    {
      id: '10',
      title: '10. Termination',
      content: `BITTX SMS reserves the right to terminate or suspend your account at any time, with or without cause, with or without notice. Upon termination, your right to use the services will immediately cease. All provisions of these terms shall survive termination.`
    },
    {
      id: '11',
      title: '11. Governing Law',
      content: `These Terms of Service shall be governed by and construed in accordance with the laws of Bangladesh. Any disputes arising from these terms shall be resolved in the courts of Bangladesh.`
    },
    {
      id: '12',
      title: '12. Changes to Terms',
      content: `BITTX SMS reserves the right to modify these terms at any time. We will notify users of significant changes via email or through our platform. Continued use of our services after such modifications constitutes acceptance of the updated terms.`
    },
    {
      id: '13',
      title: '13. Contact Information',
      content: `If you have any questions about these Terms of Service, please contact us at:
      Email: support@bittxsms.com
      Address: BITTX SMS, Bangladesh`
    }
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '40px 20px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ width: 80, height: 80, borderRadius: 20, background: 'linear-gradient(135deg,#7c3aed,#a78bfa)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <FileText size={40} style={{ color: '#fff' }} />
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 900, color: '#0f172a', margin: '0 0 12px' }}>Terms of Service</h1>
          <p style={{ fontSize: 16, color: '#64748b', margin: 0 }}>Last updated: January 2024</p>
        </div>

        {/* Introduction */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '28px 32px', marginBottom: 24,
          border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <p style={{ fontSize: 15, color: '#475569', lineHeight: 1.8, margin: 0 }}>
            Welcome to BITTX SMS. Please read these Terms of Service carefully before using our services.
            These terms outline the rules and regulations for the use of BITTX SMS's services.
          </p>
        </div>

        {/* Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {sections.map(section => (
            <div key={section.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0',
              overflow: 'hidden', boxShadow: '0 2px 4px -1px rgba(0,0,0,0.05)' }}>
              <button
                onClick={() => toggleSection(section.id)}
                style={{ width: '100%', padding: '18px 24px', display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer',
                  transition: 'background 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>{section.title}</span>
                {expandedSections.has(section.id) ? (
                  <ChevronUp size={20} style={{ color: '#7c3aed' }} />
                ) : (
                  <ChevronDown size={20} style={{ color: '#94a3b8' }} />
                )}
              </button>
              {expandedSections.has(section.id) && (
                <div style={{ padding: '0 24px 20px', borderTop: '1px solid #f1f5f9' }}>
                  <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.8, margin: '16px 0 0', whiteSpace: 'pre-line' }}>
                    {section.content}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ marginTop: 40, textAlign: 'center', padding: '24px', background: '#fff',
          borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
            © 2024 BITTX SMS. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}

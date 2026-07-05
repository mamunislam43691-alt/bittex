import { useState } from 'react'
import { Shield, ChevronDown, ChevronUp } from 'lucide-react'

export default function PrivacyPolicy() {
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
      title: '1. Information We Collect',
      content: `BITTX SMS collects the following types of information:
      
      **Personal Information:**
      - Name, email address, phone number
      - Account credentials (encrypted)
      - Agent information (if applicable)
      - Payment information (processed securely)
      
      **Usage Information:**
      - SMS message logs
      - OTP verification history
      - Account activity and login sessions
      - IP address and device information
      
      **Technical Information:**
      - Browser type and version
      - Operating system
      - Referring website
      - Time and date of access`
    },
    {
      id: '2',
      title: '2. How We Use Your Information',
      content: `We use your information for the following purposes:
      
      - To provide and maintain our SMS services
      - To process transactions and send related information
      - To send technical notices and support messages
      - To respond to customer inquiries and requests
      - To monitor and analyze usage patterns
      - To detect, prevent, and address technical issues
      - To protect against fraud and ensure account security
      - To comply with legal obligations`
    },
    {
      id: '3',
      title: '3. Information Sharing',
      content: `We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:
      
      **With Service Providers:**
      - Payment processors for transaction processing
      - SMS carriers for message delivery
      - Cloud service providers for data hosting
      
      **For Legal Reasons:**
      - When required by law or legal process
      - To protect our rights, property, or safety
      - To enforce our Terms of Service
      
      **With Your Consent:**
      - When you explicitly authorize the sharing`
    },
    {
      id: '4',
      title: '4. Data Security',
      content: `We implement appropriate security measures to protect your information:
      
      - Encryption of sensitive data in transit and at rest
      - Secure authentication and access controls
      - Regular security audits and updates
      - Limited access to personal data for authorized personnel
      - Secure payment processing through PCI-compliant providers
      
      Despite our efforts, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security.`
    },
    {
      id: '5',
      title: '5. Data Retention',
      content: `We retain your information for as long as necessary to provide our services and fulfill the purposes outlined in this policy:
      
      - Account information: Retained while your account is active
      - SMS logs: Retained for 90 days for operational purposes
      - Transaction records: Retained for 7 years for legal compliance
      - Support communications: Retained for 2 years
      
      You may request deletion of your account and associated data by contacting our support team.`
    },
    {
      id: '6',
      title: '6. Your Privacy Rights',
      content: `You have the following rights regarding your personal information:
      
      **Access:** You can request access to your personal data
      **Correction:** You can request correction of inaccurate data
      **Deletion:** You can request deletion of your account and data
      **Opt-out:** You can opt out of marketing communications
      **Portability:** You can request a copy of your data
      **Objection:** You can object to certain data processing activities
      
      To exercise these rights, contact us at support@bittxsms.com`
    },
    {
      id: '7',
      title: '7. Cookies and Tracking',
      content: `We use cookies and similar technologies to:
      
      - Remember your preferences and login status
      - Analyze website traffic and usage patterns
      - Improve our services and user experience
      - Provide personalized content
      
      You can control cookies through your browser settings. Disabling cookies may affect the functionality of our services.`
    },
    {
      id: '8',
      title: '8. Third-Party Services',
      content: `Our services may integrate with third-party services such as:
      
      - Payment gateways (Stripe, PayPal)
      - SMS carriers and providers
      - Analytics services
      - Customer support platforms
      
      These third parties have their own privacy policies. We encourage you to review their policies before using their services.`
    },
    {
      id: '9',
      title: '9. Children\'s Privacy',
      content: `Our services are not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If we discover that we have collected such information, we will take steps to delete it immediately.`
    },
    {
      id: '10',
      title: '10. International Data Transfers',
      content: `Your information may be transferred to and processed in countries other than your country of residence. We ensure that appropriate safeguards are in place to protect your information in accordance with this Privacy Policy and applicable data protection laws.`
    },
    {
      id: '11',
      title: '11. Changes to This Policy',
      content: `We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on our website and sending you an email notification. We encourage you to review this policy periodically to stay informed about how we protect your information.`
    },
    {
      id: '12',
      title: '12. Contact Information',
      content: `If you have any questions or concerns about this Privacy Policy or our data practices, please contact us:
      
      Email: privacy@bittxsms.com
      Address: BITTX SMS, Bangladesh
      Phone: +880 XXXXXXXXXX
      
      We will respond to your inquiries within 30 days of receipt.`
    }
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '40px 20px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ width: 80, height: 80, borderRadius: 20, background: 'linear-gradient(135deg,#22c55e,#86efac)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <Shield size={40} style={{ color: '#fff' }} />
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 900, color: '#0f172a', margin: '0 0 12px' }}>Privacy Policy</h1>
          <p style={{ fontSize: 16, color: '#64748b', margin: 0 }}>Last updated: January 2024</p>
        </div>

        {/* Introduction */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '28px 32px', marginBottom: 24,
          border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <p style={{ fontSize: 15, color: '#475569', lineHeight: 1.8, margin: 0 }}>
            At BITTX SMS, we take your privacy seriously. This Privacy Policy explains how we collect, use, 
            and protect your personal information when you use our SMS services.
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
                  <ChevronUp size={20} style={{ color: '#22c55e' }} />
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

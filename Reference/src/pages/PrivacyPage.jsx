import React from 'react'
import { useNavigate } from 'react-router-dom'

const body = {
  fontFamily: 'Inter, system-ui, sans-serif',
  fontSize: '14px', color: '#444', lineHeight: 1.75, margin: '0 0 14px',
}

const link = { color: '#C9A96E', textDecoration: 'underline' }

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '40px' }}>
      <h2 style={{
        fontFamily: '"Playfair Display", Georgia, serif',
        fontSize: '19px', fontWeight: 600, color: '#2A2A2A',
        margin: '0 0 16px', paddingBottom: '10px',
        borderBottom: '1px solid #EAE4DA',
      }}>
        {title}
      </h2>
      {children}
    </div>
  )
}

function ServiceRow({ name, detail }) {
  return (
    <div style={{ display: 'flex', gap: '16px', marginBottom: '14px' }}>
      <p style={{
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '11px', fontWeight: 600, color: '#3A3A3A',
        margin: 0, minWidth: '96px', flexShrink: 0, paddingTop: '2px',
      }}>
        {name}
      </p>
      <p style={{
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '13px', color: '#666', margin: 0, lineHeight: 1.65,
      }}>
        {detail}
      </p>
    </div>
  )
}

export default function PrivacyPage() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', background: '#FAF8F3', paddingBottom: '80px' }}>

      {/* Minimal header */}
      <div style={{
        borderBottom: '1px solid #EAE4DA', padding: '14px 20px',
        display: 'flex', alignItems: 'center', gap: '12px',
        background: '#FAF8F3',
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase',
            color: '#9B8B72', padding: 0,
          }}
        >
          ← Back
        </button>
        <div style={{ flex: 1, height: '1px', background: '#EAE4DA' }} />
        <span style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: '13px', color: '#C9A96E', fontStyle: 'italic' }}>
          Gigi
        </span>
      </div>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '48px 24px' }}>

        <h1 style={{
          fontFamily: '"Playfair Display", Georgia, serif',
          fontSize: '34px', fontWeight: 700, color: '#111', margin: '0 0 8px',
        }}>
          Privacy Policy
        </h1>
        <p style={{
          fontFamily: 'Inter, system-ui, sans-serif', fontSize: '11px',
          color: '#B8A88A', margin: '0 0 48px', letterSpacing: '0.06em',
        }}>
          Last updated: May 2026
        </p>

        <p style={body}>
          Gigi is a personal styling app. We take your privacy seriously and only collect what we need to give you great outfit recommendations. This page explains what we collect, how we use it, and who else sees it.
        </p>

        <Section title="What we collect">
          <p style={body}>
            <strong>Account information.</strong> When you sign up, we store your email address and a secure password hash through Supabase Auth.
          </p>
          <p style={body}>
            <strong>Wardrobe data.</strong> Photos you upload to your wardrobe are stored in Supabase Storage. Metadata about those items — labels, categories, and tags — is stored in our Supabase database.
          </p>
          <p style={body}>
            <strong>Occasion preferences.</strong> When you enter a venue and set styling preferences (dress code, occasion type, season, etc.), those details live only in your browser's sessionStorage and are automatically cleared when you close the tab. They are not stored on our servers.
          </p>
          <p style={body}>
            <strong>App behavior.</strong> We use PostHog to understand how people use Gigi — things like which features are used and where people drop off. This helps us improve the app. We do not collect personally identifiable information through analytics beyond an anonymous user ID.
          </p>
        </Section>

        <Section title="How we use it">
          <p style={body}>We use the information we collect solely to provide and improve Gigi:</p>
          <ul style={{ ...body, paddingLeft: '20px', margin: '0 0 14px' }}>
            <li style={{ marginBottom: '8px' }}>To generate personalized outfit recommendations based on your venue, occasion, and wardrobe</li>
            <li style={{ marginBottom: '8px' }}>To save and display your wardrobe items across sessions</li>
            <li style={{ marginBottom: '8px' }}>To understand how the app is used so we can make it better</li>
          </ul>
          <p style={body}>We do not sell your data. We do not use your data for advertising.</p>
        </Section>

        <Section title="Third-party services">
          <p style={{ ...body, marginBottom: '20px' }}>Gigi relies on the following services to function:</p>
          <ServiceRow
            name="Supabase"
            detail="Authentication, database, and file storage. Your account credentials and wardrobe data are stored here."
          />
          <ServiceRow
            name="Anthropic"
            detail="AI styling recommendations are generated by Claude, Anthropic's AI model. Your venue, occasion context, and styling preferences are sent to Anthropic's API to produce outfit suggestions. Wardrobe photos are not sent."
          />
          <ServiceRow
            name="PostHog"
            detail="Product analytics. Helps us understand app usage patterns anonymously."
          />
          <ServiceRow
            name="Google Places"
            detail="Powers the venue search autocomplete on the home screen. Only the text you type in the search box is sent."
          />
          <ServiceRow
            name="Unsplash"
            detail="Supplies editorial fashion photos shown as outfit inspiration. No personal data is sent to Unsplash."
          />
          <ServiceRow
            name="Amazon Associates"
            detail="We link to products on Amazon and earn a small commission on qualifying purchases at no extra cost to you. See the affiliate disclosure below."
          />
        </Section>

        <Section title="Affiliate disclosure">
          <p style={body}>
            Gigi participates in the Amazon Associates program and other affiliate programs. We earn a small commission on qualifying purchases at no extra cost to you. This never influences our recommendations — outfit suggestions are generated solely based on your venue, occasion, and style preferences.
          </p>
        </Section>

        <Section title="Data retention">
          <p style={body}>
            Your wardrobe photos and metadata are retained until you delete your account. Analytics data is retained according to PostHog's standard data retention policy. Occasion and styling preferences live only in your browser's sessionStorage and are cleared automatically when you close the tab.
          </p>
        </Section>

        <Section title="Your rights">
          <p style={body}>
            You can delete your account and all associated data at any time by emailing us at{' '}
            <a href="mailto:hello@gigiapp.com" style={link}>hello@gigiapp.com</a>.
            We will permanently delete your account, wardrobe photos, and all stored metadata within 30 days of your request.
          </p>
        </Section>

        <Section title="Contact">
          <p style={body}>
            Questions about this policy? Reach us at{' '}
            <a href="mailto:hello@gigiapp.com" style={link}>hello@gigiapp.com</a>.
          </p>
        </Section>

        <div style={{ marginTop: '48px', paddingTop: '24px', borderTop: '1px solid #EAE4DA', textAlign: 'center' }}>
          <span style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: '14px', color: '#C9A96E', fontStyle: 'italic' }}>
            Gigi
          </span>
        </div>

      </div>
    </div>
  )
}

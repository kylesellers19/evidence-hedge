import React from 'react'
import { Link } from 'react-router-dom'
import { usePageTitle, CONTACT_EMAIL, COPYRIGHT } from '../components/layout/SiteLayout.jsx'

/**
 * Terms and privacy — the full text behind the fine print in the footer
 * (SiteLayout.jsx): what a score is and is not, what The List does with a
 * firm's name, where a document and a visitor's details go, what adding an
 * entry commits a reader to, and the warranty and copyright lines.
 *
 * Every statement about data matches what the code does: the Method page's
 * "Your document" section, src/ingest/fetchLink.js (the reader service),
 * src/list/store.js and docs/the-list.sql (what an entry holds). Change one of
 * those and change this page with it, and move UPDATED.
 */

// Associated Press style, as every date on the site.
const UPDATED = 'Nov. 11, 2026'

const POLICIES = {
  github: 'https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement',
  supabase: 'https://supabase.com/privacy',
  jina: 'https://jina.ai/legal',
}

export default function LegalPage() {
  usePageTitle('Terms and privacy')
  const mail = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
  return (
    <main className="eh-page">
      <article className="eh-col eh-legal">
        <p className="eh-kicker">Legal</p>
        <h1 className="eh-hed">Terms and privacy</h1>
        <p className="eh-dek">
          What a score is and is not, where your document goes and what you agree to when you use Evidence
          Hedge or add a report to The List.
        </p>
        <p className="eh-small">Last updated {UPDATED}.</p>

        <h2 id="scores">What a score is</h2>
        <p>
          A score, a flag and every line of an evidence brief come from software that applies published
          rules to the text of a document. Each one measures how well the document’s claims are supported
          by the evidence it shows, following the steps on the <Link to="/method">Method</Link> page. None of them says that a claim is true or false, that a document is accurate or misleading,
          or that its authors or publisher acted in bad faith.
        </p>
        <p>
          The engine makes mistakes. It can miss a source, misread a sentence or hold a document to the
          wrong standard, and the Method page lists{' '}
          <Link to="/method#limits">what the score does not show</Link>. Treat a flag as a place to look,
          and read the document yourself before you rely on a score.
        </p>

        <h2 id="advice">Not medical, financial or legal advice</h2>
        <p>
          A score judges the evidence a report shows, not its subject. When a report is about health,
          money or law, the score is not medical, financial or legal advice.
        </p>

        <h2 id="list">The List</h2>
        <p>
          <Link to="/list">The List</Link> is public. It holds reports we weighed in our own audit and
          reports that readers added, each with its publisher’s name, the report’s name, type and date, and
          its score. A score there describes one document as one build of the engine read it. It is not a
          rating of the firm that published the report, of the people who wrote it or of the firm’s other
          work.
        </p>
        <p>
          Company names, report titles and trademarks belong to their owners, and we use them only to say
          which report an entry is about. Listing a report does not mean its publisher is affiliated with
          Evidence Hedge, sponsors it or endorses it.
        </p>
        <p>
          Entries that readers add are not reviewed before they appear. If a detail is wrong, or you
          published a report and think its entry misreads it, write to {mail}. We correct details that are
          wrong, and we may remove an entry.
        </p>

        <h2 id="privacy">Your document and your details</h2>
        <ul>
          <li>
            <strong>Text and files.</strong> Text you paste and files you upload are read in your browser.
            They are not sent to us, and nothing is kept once you leave the page.
          </li>
          <li>
            <strong>Links.</strong> When you give a link, its address goes to the site it points to and, for
            most web pages, to Jina Reader (r.jina.ai), a service another company runs, which fetches the
            page and returns its text.
          </li>
          <li>
            <strong>The List.</strong> Opening The List asks a database hosted by Supabase for its entries.
            Adding a report sends the details you confirm, the score, the engine build and a one-way
            fingerprint of the text, which keeps the same report from being listed twice. The text itself
            is never sent, and an entry records nothing about the person who added it.
          </li>
          <li>
            <strong>No tracking.</strong> The site has no accounts, sets no cookies and runs no analytics or
            advertising.
          </li>
          <li>
            <strong>The companies that serve the site.</strong> GitHub Pages serves these pages. As any web
            host does, GitHub, Supabase and Jina receive your internet address and your browser’s details
            when your browser asks them for something, and each handles them under its own policy:{' '}
            <a href={POLICIES.github}>GitHub</a>, <a href={POLICIES.supabase}>Supabase</a> and{' '}
            <a href={POLICIES.jina}>Jina</a>.
          </li>
          <li>
            <strong>Email.</strong> If you write to us, we keep your message and your address so we can
            answer.
          </li>
        </ul>

        <h2 id="adding">Adding a report to The List</h2>
        <p>
          When you add a report, you agree that the entry is public, that the details you give are accurate
          as far as you know and that they hold no personal or confidential information. Add only reports
          that are published, or whose details you have the right to share. We may edit or remove any
          entry.
        </p>

        <h2 id="warranty">No warranty</h2>
        <p>
          Evidence Hedge is offered as it is, without warranties of any kind, including that it is
          accurate, complete, always available or fit for a particular purpose. To the extent the law
          allows, we are not liable for loss or damage that comes from using the site, from relying on a
          score or an evidence brief, or from an entry on The List.
        </p>

        <h2 id="copyright">Copyright</h2>
        <p>
          The text, design and scores on this site are {COPYRIGHT}. The reports we weigh belong to their
          publishers; The List holds a report’s details and a link to it, never its text. Code and data
          taken from other projects keep their own licenses, set out in the{' '}
          <a href={`${import.meta.env.BASE_URL}THIRD_PARTY_NOTICES.md`}>third-party notices</a>.
        </p>

        <h2 id="changes">Changes and contact</h2>
        <p>
          We may change these terms, and the date at the top shows when we last did. Using the site after
          a change means you accept it. Send questions, corrections and legal notices to {mail}.
        </p>
      </article>
    </main>
  )
}

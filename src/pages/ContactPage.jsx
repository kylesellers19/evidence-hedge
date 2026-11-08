import React from 'react'
import { Link } from 'react-router-dom'
import { usePageTitle, CONTACT_EMAIL } from '../components/layout/SiteLayout.jsx'

/**
 * Contact — inquiries, consulting and corrections to The List, after Delgam's
 * "Work with Delgam" page: each reason gets what it is for and what to send,
 * and a mail link with its own subject line. No prices and no turnaround
 * promises.
 */

const REASONS = [
  {
    id: 'inquiries',
    name: 'Inquiries',
    about: 'Questions about a score, the method or the engine, and anything else about Evidence Hedge.',
    send: 'The report’s title or link, and what you want to know. If it is about a score, say which brief or which entry on The List.',
  },
  {
    id: 'consulting',
    name: 'Consulting',
    about:
      'A review of a report before it is published, so you see which claims read stronger than their evidence and what would carry them; help writing evidence standards into a team’s research or communications work; and rubrics fitted to a field the four genres do not cover.',
    send: 'What the work is, who it is for and when it needs to be done. A draft or a past example helps.',
  },
  {
    id: 'corrections',
    name: 'Corrections to The List',
    about:
      'A detail on an entry that is wrong, such as the company, the report’s title, its type or its date. The score is the engine’s and changes only when the engine does, but a case where you think it misreads a report is useful to hear about.',
    send: 'The entry as it appears on The List and what it should say, with a link to the report.',
  },
]

const mail = (subject) => `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`

export default function ContactPage() {
  usePageTitle('Contact')
  return (
    <main className="eh-page">
      <article className="eh-col">
        <p className="eh-kicker">Contact</p>
        <h1 className="eh-hed">Ask about a score, a review or the method</h1>
        <p className="eh-dek">
          Inquiries, consulting and corrections to The List all go to one address, and Kyle answers them.
        </p>
        <p className="eh-contact-line">
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>

        {REASONS.map((r) => (
          <section className="eh-reason" id={r.id} key={r.id} aria-labelledby={`${r.id}-h`}>
            <h2 id={`${r.id}-h`}>{r.name}</h2>
            <dl>
              <dt>What it covers</dt>
              <dd>{r.about}</dd>
              <dt>What to send</dt>
              <dd>{r.send}</dd>
            </dl>
            <p className="eh-ask"><a href={mail(r.name)}>Write about {r.name.toLowerCase()}</a></p>
          </section>
        ))}

        <p className="eh-note eh-contact-foot">
          How a score is reached, and what it does not measure, is on the <Link to="/method">Method</Link> page.
        </p>
      </article>
    </main>
  )
}

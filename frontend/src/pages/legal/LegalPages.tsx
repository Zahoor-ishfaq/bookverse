import { Link, useLocation } from 'react-router-dom'
import { openCookieSettings } from '@/components/legal/CookieConsent'
import { cn } from '@/lib/utils'
import { useSEO } from '@/lib/seo'
import { BrandMark } from '@/components/layout/BrandMark'

const EFFECTIVE = '1 September 2026'
const OPERATOR = 'BookVerse'
const CONTACT = 'privacy@bookverse.app'

function Layout({ title, updated, toc, children }: { title: string; updated: string; toc: { id: string; label: string }[]; children: React.ReactNode }) {
  const loc = useLocation()
  useSEO({ title, description: `${title} for BookVerse, effective ${updated}.`, path: loc.pathname })
  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap gap-1.5 text-xs">
        {[{ to: '/legal/terms', l: 'Terms of service' }, { to: '/legal/privacy', l: 'Privacy policy' }, { to: '/legal/cookies', l: 'Cookie policy' }].map((x) => <Link key={x.to} to={x.to} className={cn('chip', loc.pathname === x.to && 'chip-active')}>{x.l}</Link>)}
      </div>
      <div className="grid gap-10 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block"><div className="sticky top-20"><p className="eyebrow mb-2">On this page</p><ol className="space-y-1.5 text-sm">{toc.map((t) => <li key={t.id}><a href={`#${t.id}`} className="hover:underline" style={{ color: 'var(--text-secondary)' }}>{t.label}</a></li>)}</ol></div></aside>
        <article className="prose-legal max-w-3xl">
          <h1 className="text-3xl md:text-4xl">{title}</h1>
          <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>Effective {updated}</p>
          {children}
        </article>
      </div>
    </div>
  )
}

export function TermsPage() {
  const toc = [['acceptance', '1. Acceptance'], ['eligibility', '2. Eligibility'], ['account', '3. Your account'], ['content', '4. Your content'], ['conduct', '5. Acceptable use'], ['ip', '6. Intellectual property'], ['publicdomain', '7. Public-domain books'], ['termination', '8. Suspension and termination'], ['disclaimer', '9. Disclaimers'], ['liability', '10. Limitation of liability'], ['law', '11. Governing law and disputes'], ['changes', '12. Changes'], ['contact', '13. Contact']].map(([id, label]) => ({ id, label }))
  return (
    <Layout title="Terms of Service" updated={EFFECTIVE} toc={toc}>
      <p className="mt-6">These Terms govern your use of the {OPERATOR} website, apps and services (the "Service"). By creating an account or using the Service you agree to them. If you do not agree, do not use the Service.</p>
      <h2 id="acceptance">1. Acceptance</h2>
      <p>These Terms form a binding agreement between you and {OPERATOR} ("we", "us"). Our <Link to="/legal/privacy">Privacy Policy</Link> and <Link to="/legal/cookies">Cookie Policy</Link> explain how we handle personal data and are incorporated by reference.</p>
      <h2 id="eligibility">2. Eligibility</h2>
      <p>You must be at least 16 years old, or the minimum age required in your country to consent to the processing of personal data without parental approval (13 in the United States), to create an account. Reading public-domain books without an account is available to everyone.</p>
      <h2 id="account">3. Your account</h2>
      <ul><li>You are responsible for activity under your account and for keeping your password secure.</li><li>Provide accurate information and keep it up to date.</li><li>Notify us at <a href={`mailto:${CONTACT}`}>{CONTACT}</a> if you believe your account has been compromised.</li><li>You may delete your account at any time from Settings → Privacy. Deletion removes your personal data within 30 days, except where retention is required by law.</li></ul>
      <h2 id="content">4. Your content</h2>
      <p>You keep ownership of everything you create on the Service — reviews, diary entries, highlights, stories and books you publish ("User Content"). By posting User Content publicly you grant us a worldwide, non-exclusive, royalty-free licence to host, store, display, reproduce and distribute it solely to operate and promote the Service. This licence ends when you delete the content, except for copies in backups for a limited period or content others have already shared.</p>
      <p>You confirm that you hold the rights to any User Content you publish, that it does not infringe third-party rights, and that books you publish are your original work or work you are authorised to distribute.</p>
      <p>We may remove content that violates these Terms. To report content, use the report option on the item or write to <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. Rights holders may submit notices in accordance with the US Digital Millennium Copyright Act or the EU Digital Services Act to the same address.</p>
      <h2 id="conduct">5. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul><li>Harass, threaten or abuse other members, or post hateful or discriminatory content.</li><li>Post sexual content involving minors, or content that promotes violence or self-harm.</li><li>Upload malware, scrape the Service at scale, or interfere with its operation.</li><li>Impersonate others or misrepresent your affiliation.</li><li>Publish books or stories that infringe copyright.</li><li>Use the Service for unsolicited advertising or spam.</li></ul>
      <h2 id="ip">6. Intellectual property</h2>
      <p>The Service, including its design, software and trademarks, is owned by {OPERATOR} or its licensors and protected by intellectual-property laws. You may not copy, modify or create derivative works of the Service except as permitted by law.</p>
      <h2 id="publicdomain">7. Public-domain books</h2>
      <p>Books in the catalogue are sourced from Project Gutenberg and are in the public domain in the United States. Copyright status may differ in your country; you are responsible for checking the laws where you live before downloading a text. Project Gutenberg's trademark licence applies to any redistribution of its e-books.</p>
      <h2 id="termination">8. Suspension and termination</h2>
      <p>We may suspend or terminate accounts that breach these Terms, with notice where reasonably possible. You may stop using the Service and delete your account at any time. Sections 4, 6, 9, 10 and 11 survive termination.</p>
      <h2 id="disclaimer">9. Disclaimers</h2>
      <p>The Service is provided "as is" and "as available". To the fullest extent permitted by law we disclaim all warranties, express or implied, including fitness for a particular purpose. Automatically generated summaries and recommendations may be inaccurate and are provided for convenience only.</p>
      <h2 id="liability">10. Limitation of liability</h2>
      <p>To the extent permitted by law, {OPERATOR} will not be liable for indirect, incidental, special or consequential damages, or loss of data, profits or goodwill, arising from your use of the Service. Our total liability for any claim is limited to the greater of the amount you paid us in the 12 months before the claim or USD 100. Nothing in these Terms limits liability that cannot be limited by law, including for death, personal injury or fraud, or your statutory rights as a consumer in the EU, UK or elsewhere.</p>
      <h2 id="law">11. Governing law and disputes</h2>
      <p>These Terms are governed by the laws of the jurisdiction in which {OPERATOR} is established, without regard to conflict-of-law rules. If you are a consumer in the European Union or United Kingdom you also benefit from the mandatory protections of the law of your country of residence, and you may bring proceedings in your local courts. EU consumers may use the European Commission's Online Dispute Resolution platform.</p>
      <h2 id="changes">12. Changes</h2>
      <p>We may update these Terms. For material changes we will give at least 30 days' notice by email or in-app before they take effect. Continued use after the effective date constitutes acceptance.</p>
      <h2 id="contact">13. Contact</h2>
      <p>{OPERATOR} · <a href={`mailto:${CONTACT}`}>{CONTACT}</a></p>
    </Layout>
  )
}

export function PrivacyPage() {
  const toc = [['who', '1. Who we are'], ['data', '2. Data we collect'], ['why', '3. Why and on what basis'], ['sharing', '4. Sharing'], ['transfers', '5. International transfers'], ['retention', '6. Retention'], ['rights', '7. Your rights'], ['california', '8. California and US state notices'], ['children', '9. Children'], ['security', '10. Security'], ['changes', '11. Changes'], ['contact', '12. Contact']].map(([id, label]) => ({ id, label }))
  return (
    <Layout title="Privacy Policy" updated={EFFECTIVE} toc={toc}>
      <p className="mt-6">This policy explains what personal data {OPERATOR} collects, why, and the choices you have. It applies worldwide and is written to meet the EU and UK General Data Protection Regulation (GDPR), the California Consumer Privacy Act as amended (CCPA/CPRA), Brazil's LGPD and similar laws.</p>
      <h2 id="who">1. Who we are</h2>
      <p>{OPERATOR} is the data controller for personal data processed through the Service. Contact our privacy team at <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. If you are in the EU/UK, you may also contact our representative or data-protection officer at the same address.</p>
      <h2 id="data">2. Data we collect</h2>
      <table><thead><tr><th>Category</th><th>Examples</th><th>Source</th></tr></thead><tbody>
        <tr><td>Account</td><td>Name, email, username, password hash, profile photo, bio, links you add</td><td>You; Google if you sign in with Google</td></tr>
        <tr><td>Reading activity</td><td>Books opened, position, time spent, highlights, bookmarks, shelves, streaks</td><td>Generated by your use</td></tr>
        <tr><td>Content</td><td>Reviews, diary entries, stories, books you publish, messages in reading rooms</td><td>You</td></tr>
        <tr><td>Technical</td><td>IP address, device and browser type, approximate location, crash logs</td><td>Automatically</td></tr>
        <tr><td>Cookies</td><td>See our <Link to="/legal/cookies">Cookie Policy</Link></td><td>Automatically, with consent where required</td></tr>
      </tbody></table>
      <h2 id="why">3. Why we use it and on what legal basis</h2>
      <ul>
        <li><strong>To provide the Service</strong> — accounts, syncing your reading position, community features. <em>Basis: performance of a contract.</em></li>
        <li><strong>To personalise</strong> recommendations and your feed. <em>Basis: consent (you can turn personalisation off in Cookie settings) or legitimate interests where the law allows.</em></li>
        <li><strong>To keep the Service safe</strong> — moderation, fraud and abuse prevention. <em>Basis: legitimate interests and legal obligation.</em></li>
        <li><strong>To communicate</strong> — service emails (always), digests and marketing (only if you opt in; unsubscribe any time). <em>Basis: contract / consent.</em></li>
        <li><strong>To improve the Service</strong> — aggregated analytics. <em>Basis: consent where required, otherwise legitimate interests.</em></li>
        <li><strong>To comply with law.</strong></li>
      </ul>
      <p>We do not use your data for automated decisions with legal or similarly significant effects, and we do not sell personal data.</p>
      <h2 id="sharing">4. Sharing</h2>
      <p>We share data only with: service providers acting on our instructions (hosting, email delivery, error monitoring) under data-processing agreements; other members, to the extent you make content public; authorities where required by law; and a successor in the event of a merger or acquisition, with notice to you. Public-domain book text is fetched from Project Gutenberg; your request may reveal your IP address to them.</p>
      <h2 id="transfers">5. International transfers</h2>
      <p>Our servers may be located outside your country. Where data leaves the EEA, UK or Switzerland we rely on adequacy decisions or the European Commission's Standard Contractual Clauses (and the UK Addendum), with supplementary measures where needed. A copy is available on request.</p>
      <h2 id="retention">6. Retention</h2>
      <p>We keep account data while your account is active and delete or anonymise it within 30 days of deletion. Reading-room transcripts are kept for 7 days after a room ends. Server logs are kept for up to 90 days. Records we must keep by law (for example, consent records) are kept for the statutory period.</p>
      <h2 id="rights">7. Your rights</h2>
      <p>Depending on where you live you may have the right to access, correct, delete or port your data, to restrict or object to processing, and to withdraw consent at any time without affecting prior processing. You can export or delete your data yourself from <Link to="/settings">Settings → Privacy</Link>, or write to <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. We respond within one month (extendable by two months for complex requests). You may also lodge a complaint with your local supervisory authority; in the EU see <a href="https://edpb.europa.eu/about-edpb/about-edpb/members_en" target="_blank" rel="noreferrer">edpb.europa.eu</a>, in the UK the ICO.</p>
      <h2 id="california">8. California and other US state notices</h2>
      <p>Residents of California, Colorado, Connecticut, Utah, Virginia and other states with privacy laws have the right to know, delete, correct and opt out of the "sale" or "sharing" of personal data and targeted advertising. We do not sell personal data. To opt out of sharing for cross-context behavioural advertising, turn off Marketing in <button onClick={openCookieSettings} className="underline">Cookie settings</button>; we also honour Global Privacy Control signals. We do not discriminate against you for exercising your rights. Authorised agents may submit requests on your behalf to <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.</p>
      <h2 id="children">9. Children</h2>
      <p>The Service is not directed to children under 13, and accounts require users to be at least 16 (or the age of digital consent in their country). If we learn we have collected data from a child without appropriate consent we will delete it.</p>
      <h2 id="security">10. Security</h2>
      <p>We use encryption in transit, hashed passwords, access controls and regular reviews. No system is perfectly secure; if a breach affects you we will notify you and regulators as the law requires.</p>
      <h2 id="changes">11. Changes</h2>
      <p>We will post any changes here and, for material changes, notify you by email or in-app at least 30 days in advance.</p>
      <h2 id="contact">12. Contact</h2>
      <p>{OPERATOR} · <a href={`mailto:${CONTACT}`}>{CONTACT}</a></p>
    </Layout>
  )
}

export function CookiesPage() {
  const toc = [['what', '1. What cookies are'], ['use', '2. Cookies we use'], ['manage', '3. Managing cookies'], ['contact', '4. Contact']].map(([id, label]) => ({ id, label }))
  return (
    <Layout title="Cookie Policy" updated={EFFECTIVE} toc={toc}>
      <p className="mt-6">This policy explains how {OPERATOR} uses cookies and similar technologies (local storage, pixels) and how you can control them. It supplements our <Link to="/legal/privacy">Privacy Policy</Link>.</p>
      <h2 id="what">1. What cookies are</h2>
      <p>Cookies are small text files stored on your device by your browser. Local storage works similarly but is not sent with each request. We use both to remember you and your preferences.</p>
      <h2 id="use">2. Cookies and storage we use</h2>
      <table><thead><tr><th>Name</th><th>Category</th><th>Purpose</th><th>Duration</th></tr></thead><tbody>
        <tr><td>bookverse.auth</td><td>Strictly necessary</td><td>Keeps you signed in</td><td>Until you log out</td></tr>
        <tr><td>bookverse.library, bookverse.reader, bookverse.stories, bookverse.ui</td><td>Strictly necessary</td><td>Your shelves, reading position, reader settings, theme and language</td><td>Persistent</td></tr>
        <tr><td>bookverse.consent</td><td>Strictly necessary</td><td>Records your cookie choices</td><td>12 months</td></tr>
        <tr><td>bookverse.cache</td><td>Strictly necessary</td><td>Caches book metadata and text so pages load quickly</td><td>Up to 24 hours (text: 7 days)</td></tr>
        <tr><td>_bv_a</td><td>Analytics</td><td>Aggregated usage statistics (only with consent)</td><td>13 months</td></tr>
        <tr><td>_bv_p</td><td>Personalisation</td><td>Recommendation preferences (only with consent)</td><td>12 months</td></tr>
        <tr><td>_bv_m</td><td>Marketing</td><td>Campaign measurement (only with consent)</td><td>90 days</td></tr>
      </tbody></table>
      <h2 id="manage">3. Managing cookies</h2>
      <p>You can change your choices at any time via <button onClick={openCookieSettings} className="underline">Cookie settings</button>. You can also delete or block cookies in your browser settings, although blocking strictly necessary storage will sign you out and reset your reading position. We honour the Global Privacy Control (GPC) browser signal as an opt-out of marketing cookies.</p>
      <h2 id="contact">4. Contact</h2>
      <p>{OPERATOR} · <a href={`mailto:${CONTACT}`}>{CONTACT}</a></p>
    </Layout>
  )
}

export function HelpPage() {
  useSEO({ title: 'Help centre', description: 'Answers to common questions about reading, publishing and your account on BookVerse.', path: '/help' })
  const faqs = [
    ['Is BookVerse free?', 'Yes. Every book in the catalogue is in the public domain and free to read. Publishing your own book is free too.'],
    ['Why are the books mostly classics?', 'The catalogue comes from Project Gutenberg, which digitises books whose copyright has expired in the United States. Newer titles arrive as members publish their own work.'],
    ['Does my reading position sync?', 'Your position is saved every 30 seconds and when you leave the reader. It is stored securely with your account.'],
    ['How do I delete my account?', 'Settings → Privacy → Delete account. Your data is removed within 30 days.'],
    ['How do I report content?', 'Use the report option on any review, story or message, or email us. We review reports within 48 hours.'],
    ['Can I publish a book I wrote?', 'Yes — go to Publish a book, add a cover and chapters, and it appears in your profile and the catalogue. You keep all rights.'],
  ]
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl md:text-4xl">Help centre</h1>
      <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>Quick answers. For anything else, write to <a href="mailto:support@bookverse.app" className="underline">support@bookverse.app</a>.</p>
      <div className="mt-8 divide-y" style={{ borderColor: 'var(--border)' }}>{faqs.map(([q, a]) => <details key={q} className="group py-4"><summary className="cursor-pointer list-none text-[15px] font-semibold">{q}</summary><p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{a}</p></details>)}</div>
    </div>
  )
}

export function AboutPage() {
  useSEO({ title: 'About', description: 'BookVerse is a free reading platform: a reader, a catalogue of 75,000 public-domain books, book clubs, live rooms, a reading diary and self-publishing for writers.', path: '/about' })
  return (
    <div className="mx-auto max-w-3xl">
      <BrandMark size={56} />
      <h1 className="mt-5 text-3xl md:text-4xl">About BookVerse</h1>
      <p className="mt-3 text-[17px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>BookVerse is a free place to read, talk about and publish books. It brings together a distraction-free reader, a catalogue of more than 75,000 public-domain books, book clubs, live reading rooms, a reading diary and publishing tools for writers.</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {[
          ['What you can read', 'Every book in the catalogue is in the public domain and free. The classics come from Project Gutenberg. New books are published directly by their authors on BookVerse.'],
          ['What it costs', 'Nothing. There is no subscription, no trial and no card. Accounts are free and optional for reading.'],
          ['Who it is for', 'Readers who want a quiet place to read long books, clubs who want to read together without spoilers, and writers who want readers.'],
          ['How it treats your data', 'We collect only what the product needs, never sell personal data, and let you export or delete everything from Settings. See the Privacy Policy.'],
        ].map(([h, b]) => <div key={h} className="card p-5"><h2 className="text-base">{h}</h2><p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{b}</p></div>)}
      </div>
      <h2 className="mt-10 text-xl">Contact</h2>
      <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>Support: <a href="mailto:support@bookverse.app" className="underline">support@bookverse.app</a> · Privacy: <a href="mailto:privacy@bookverse.app" className="underline">privacy@bookverse.app</a> · Press and partnerships: <a href="mailto:hello@bookverse.app" className="underline">hello@bookverse.app</a></p>
      <div className="mt-8 flex flex-wrap gap-2"><Link to="/discover" className="btn btn-primary">Browse the catalogue</Link><Link to="/help" className="btn btn-secondary">Help centre</Link></div>
    </div>
  )
}

export function NotFoundPage() {
  useSEO({ title: 'Page not found', noindex: true })
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center text-center">
      <p className="text-7xl font-extrabold" style={{ color: 'var(--border-strong)' }}>404</p>
      <h1 className="mt-2 text-2xl">This page is not on our shelves</h1>
      <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>The link may be broken or the page may have been moved. Try the catalogue or search instead.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2"><Link to="/discover" className="btn btn-primary">Browse books</Link><Link to="/search" className="btn btn-secondary">Search</Link><Link to="/" className="btn btn-ghost">Home</Link></div>
    </div>
  )
}

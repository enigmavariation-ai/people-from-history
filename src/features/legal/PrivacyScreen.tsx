import { AppMenu } from '@/components/AppMenu';
import type { Screen } from '@/components/ProtoNav';

type PrivacyScreenProps = { goTo: (s: Screen) => void };

// Datenschutzerklärung / Privacy Policy.
//
// TEMPLATE based on what the app actually does today:
//   * Auth via Supabase (email magic-link + Google OAuth)
//   * Game state in Supabase (daily_plays, practice_state, runs, profiles)
//   * Cloudflare Turnstile captcha on sign-in / leaderboard submit
//   * Hosting via Vercel (US/edge)
//
// The operator must (a) fill in their contact details, (b) confirm
// the data-processing-agreement (DPA) status with each subprocessor
// (Supabase, Cloudflare, Vercel), (c) have a lawyer review the final
// text. Auto-generated tools like datenschutz-generator.de are a
// reasonable starting point.
export function PrivacyScreen({ goTo }: PrivacyScreenProps) {
  return (
    <div className="h-[calc(100vh-var(--app-bar-h))] overflow-y-auto bg-(--color-bg)">
      <div className="mx-auto max-w-[680px] px-5 pb-24 pt-5 md:px-8 md:pt-10">
        <div className="mb-6">
          <AppMenu goTo={goTo} currentScreen="privacy" />
        </div>

        <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-(--color-amber)">
          § Legal
        </div>
        <h1
          className="mb-2"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(32px, 6vw, 44px)',
            lineHeight: 1.05,
            fontWeight: 500,
            color: 'var(--color-ink)',
            letterSpacing: '-0.018em',
          }}
        >
          Privacy Policy
        </h1>
        <p className="mb-8 text-sm text-(--color-muted)">
          Datenschutzerklärung gemäß DSGVO / GDPR.
        </p>

        <DraftNotice />

        <Section title="1. Controller">
          <p>
            The party responsible for processing personal data on this site
            (the "controller" under GDPR / DSGVO) is:
          </p>
          <p className="mt-2">
            {/* TODO: Operator's full legal name + address + email. */}
            [Vorname Nachname]
            <br />
            [Straße und Hausnummer]
            <br />
            [PLZ Ort], Deutschland
            <br />
            E-Mail:{' '}
            <a className="text-(--color-amber) underline-offset-2 hover:underline" href="mailto:[email@example.com]">
              [email@example.com]
            </a>
          </p>
        </Section>

        <Section title="2. Personal data we process">
          <p className="mb-2">When you use People from History we may process:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong className="font-medium text-(--color-ink)">Account data:</strong>{' '}
              email address (when you sign up via magic-link), Google profile
              identifier (when you sign in with Google), and a stable user ID
              issued by our authentication provider.
            </li>
            <li>
              <strong className="font-medium text-(--color-ink)">Game data:</strong>{' '}
              daily puzzle results (date, reveal %, hints used, figure ID,
              outcome), Practice mode state (streak, figures seen, last
              difficulty), Challenge run history (score, nickname, figures
              played), and the chosen leaderboard nickname.
            </li>
            <li>
              <strong className="font-medium text-(--color-ink)">Technical data:</strong>{' '}
              session tokens and a captcha verification token, both used
              solely to keep you signed in and to prevent automated abuse.
            </li>
          </ul>
        </Section>

        <Section title="3. Purposes and legal basis">
          <p className="mb-2">We process this data to:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>operate the game and provide cross-device sync (Art. 6 (1)(b) GDPR — performance of contract);</li>
            <li>display public leaderboards to other users (Art. 6 (1)(b) GDPR — your nickname and score, only after you submit a run);</li>
            <li>prevent automated abuse of the sign-in and leaderboard endpoints (Art. 6 (1)(f) GDPR — legitimate interest in service integrity).</li>
          </ul>
        </Section>

        <Section title="4. Processors / third parties">
          <p className="mb-2">We use the following service providers to operate the site:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong className="font-medium text-(--color-ink)">Supabase</strong>{' '}
              (database, authentication, file storage). A data-processing
              agreement (DPA) is in place. Supabase hosts the data in the
              region configured for the project; see{' '}
              <a
                className="text-(--color-amber) underline-offset-2 hover:underline"
                href="https://supabase.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
              >
                Supabase Privacy
              </a>
              .
            </li>
            <li>
              <strong className="font-medium text-(--color-ink)">Vercel</strong>{' '}
              (web hosting / CDN); see{' '}
              <a
                className="text-(--color-amber) underline-offset-2 hover:underline"
                href="https://vercel.com/legal/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
              >
                Vercel Privacy
              </a>
              .
            </li>
            <li>
              <strong className="font-medium text-(--color-ink)">Cloudflare</strong>{' '}
              (Turnstile captcha + edge delivery); see{' '}
              <a
                className="text-(--color-amber) underline-offset-2 hover:underline"
                href="https://www.cloudflare.com/privacypolicy/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Cloudflare Privacy
              </a>
              .
            </li>
            <li>
              <strong className="font-medium text-(--color-ink)">Google</strong>{' '}
              (only if you sign in with Google OAuth); see{' '}
              <a
                className="text-(--color-amber) underline-offset-2 hover:underline"
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
              >
                Google Privacy
              </a>
              .
            </li>
          </ul>
          <p className="mt-2">
            Where any of these providers process data outside the EU/EEA we
            rely on the standard contractual clauses (SCCs) and the EU-US Data
            Privacy Framework, as applicable.
          </p>
        </Section>

        <Section title="5. Cookies and local storage">
          <p className="mb-2">We only use storage that is strictly necessary to run the game:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong className="font-medium text-(--color-ink)">Local storage</strong>{' '}
              for your daily streak, last-played puzzle, preferred difficulty,
              and onboarding flags — kept on your device only.
            </li>
            <li>
              <strong className="font-medium text-(--color-ink)">Authentication tokens</strong>{' '}
              issued by Supabase so you stay signed in across visits.
            </li>
            <li>
              <strong className="font-medium text-(--color-ink)">Cloudflare Turnstile</strong>{' '}
              may set a short-lived cookie when you sign in or submit a
              leaderboard run, purely for bot detection.
            </li>
          </ul>
          <p className="mt-2">
            We do <strong className="font-medium text-(--color-ink)">not</strong>{' '}
            use analytics, advertising, or third-party tracking cookies. As
            none of the above are used for marketing or profiling, no
            additional consent is required under § 25 (2) TTDSG / Art. 5 (3)
            ePrivacy Directive.
          </p>
        </Section>

        <Section title="6. Retention">
          <p>
            Account and game data are stored for as long as your account is
            active. If you delete your account (see below) we remove your
            personal data within 30 days, except where we are required by law
            to keep it longer.
          </p>
        </Section>

        <Section title="7. Your rights">
          <p className="mb-2">Under the GDPR / DSGVO you have the right to:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>access the personal data we hold about you (Art. 15);</li>
            <li>have inaccurate data corrected (Art. 16);</li>
            <li>have your data erased (Art. 17);</li>
            <li>restrict processing (Art. 18);</li>
            <li>receive a copy of your data in a machine-readable format (Art. 20);</li>
            <li>object to processing based on legitimate interest (Art. 21);</li>
            <li>lodge a complaint with a supervisory authority — for example, the data protection authority of your federal state in Germany.</li>
          </ul>
          <p className="mt-2">
            To exercise any of these rights, email us at{' '}
            <a className="text-(--color-amber) underline-offset-2 hover:underline" href="mailto:[email@example.com]">
              [email@example.com]
            </a>
            .
          </p>
        </Section>

        <Section title="8. Deleting your account">
          <p>
            You can request deletion of your account and all associated game
            data at any time by emailing{' '}
            <a className="text-(--color-amber) underline-offset-2 hover:underline" href="mailto:[email@example.com]">
              [email@example.com]
            </a>{' '}
            from the address linked to your account.
          </p>
        </Section>

        <p className="mt-10 text-xs text-(--color-muted)">
          Stand / Last reviewed: TODO — set the date of the last legal review.
        </p>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6">
      <h2
        className="mb-2"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 18,
          fontWeight: 500,
          color: 'var(--color-ink)',
          letterSpacing: '-0.01em',
        }}
      >
        {title}
      </h2>
      <div className="text-sm leading-[1.55] text-(--color-body)">{children}</div>
    </section>
  );
}

function DraftNotice() {
  return (
    <div className="mb-8 rounded-card border border-dashed border-(--color-amber) bg-(--color-amber-soft)/30 px-4 py-3 text-xs leading-relaxed text-(--color-body)">
      <strong className="font-medium text-(--color-ink)">Draft template.</strong>{' '}
      This policy reflects what the app does, but the wording must be
      reviewed by a German data-protection lawyer (or generated via a tool
      such as datenschutz-generator.de) before publishing to an EU audience.
      Replace bracketed placeholders with the operator's real details.
    </div>
  );
}

import { AppMenu } from '@/components/AppMenu';
import type { Screen } from '@/components/ProtoNav';

type PrivacyScreenProps = { goTo: (s: Screen) => void };

// Privacy policy / Datenschutzerklärung for People from History,
// operated from Austria. Legal framework:
//   - GDPR (EU 2016/679) — the substantive law for processing
//   - Austrian DSG (Datenschutzgesetz) — national implementation
//   - § 165 TKG 2021 — cookie / device-storage consent rule
// Hosting and subprocessors:
//   - Supabase on AWS in the EU (database, auth, file storage)
//   - Vercel (web hosting / CDN)
//   - Cloudflare (Turnstile captcha)
//   - Google (only if the user signs in with Google OAuth)
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
        <p className="mb-10 text-sm text-(--color-muted)">
          How People from History handles personal data, under the General
          Data Protection Regulation (GDPR) and the Austrian DSG.
        </p>

        <Section title="1. Who we are">
          <p>
            The controller responsible for processing your personal data
            within the meaning of Art. 4 (7) GDPR is:
          </p>
          <p className="mt-3">
            Robert Fip
            <br />
            Apollogasse 9/3
            <br />
            1070 Vienna, Austria
            <br />
            Email:{' '}
            <a
              className="text-(--color-amber) underline-offset-2 hover:underline"
              href="mailto:peoplefromhistorygame@gmail.com"
            >
              peoplefromhistorygame@gmail.com
            </a>
          </p>
          <p className="mt-3">
            People from History is operated as a personal, non-commercial
            project. There is no separate data protection officer; please
            address privacy enquiries directly to the email above.
          </p>
        </Section>

        <Section title="2. What we collect, and why">
          <p className="mb-2">
            We try to collect as little as possible. Concretely:
          </p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <strong className="font-medium text-(--color-ink)">
                Account data
              </strong>{' '}
              — when you sign in: your email address (magic-link) or your
              Google account identifier and basic profile (Google
              sign-in). A stable user ID is issued by our authentication
              provider so we can recognise you on return visits.
            </li>
            <li>
              <strong className="font-medium text-(--color-ink)">
                Game data
              </strong>{' '}
              — daily-puzzle results (date, reveal percentage, hints used,
              figure ID, win/loss outcome), Practice-mode progress (current
              streak, figures already seen, last difficulty), Challenge run
              history (score, figures played, the nickname you chose), and
              your chosen leaderboard nickname.
            </li>
            <li>
              <strong className="font-medium text-(--color-ink)">
                Technical data
              </strong>{' '}
              — short-lived authentication tokens so you stay signed in,
              and a Cloudflare Turnstile verification token issued each
              time you submit a sign-in or leaderboard form, used purely
              to distinguish humans from bots.
            </li>
          </ul>
          <p className="mt-3">
            We do <strong className="font-medium text-(--color-ink)">not</strong>{' '}
            collect IP-address logs of normal site visits, install
            analytics, run advertising scripts, or share data with
            marketing partners.
          </p>
        </Section>

        <Section title="3. Legal basis (Art. 6 GDPR)">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <strong className="font-medium text-(--color-ink)">
                Art. 6 (1)(b) — performance of contract:
              </strong>{' '}
              we use your account and game data to actually run the game
              for you (sign you in, remember your progress, sync across
              devices, show your score on the leaderboard once you submit
              a run).
            </li>
            <li>
              <strong className="font-medium text-(--color-ink)">
                Art. 6 (1)(f) — legitimate interest:
              </strong>{' '}
              the Cloudflare Turnstile captcha protects sign-in and the
              leaderboard endpoints from automated abuse. Without it the
              leaderboard would be trivial to spam.
            </li>
            <li>
              <strong className="font-medium text-(--color-ink)">
                Art. 6 (1)(a) — consent:
              </strong>{' '}
              currently not relied upon, because we do not use any
              technology that requires it under § 165 TKG 2021 or Art. 5
              (3) ePrivacy Directive (no analytics, no marketing
              cookies). If that ever changes, we will ask for an explicit
              opt-in first.
            </li>
          </ul>
        </Section>

        <Section title="4. Service providers (processors)">
          <p className="mb-2">
            We rely on the following service providers to run the site.
            Each is a processor within the meaning of Art. 28 GDPR; we
            have entered into the standard data-processing terms each
            provider offers.
          </p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <strong className="font-medium text-(--color-ink)">
                Supabase
              </strong>{' '}
              — database, authentication, and file storage. All game and
              account data is stored on infrastructure operated by Amazon
              Web Services within the European Union. See{' '}
              <a
                className="text-(--color-amber) underline-offset-2 hover:underline"
                href="https://supabase.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
              >
                supabase.com/privacy
              </a>
              .
            </li>
            <li>
              <strong className="font-medium text-(--color-ink)">
                Vercel
              </strong>{' '}
              — web hosting, content delivery, and Web Analytics. Web
              Analytics records aggregate, cookieless page-view and
              referrer counts (no user identifiers, no behavioural
              profiling) for our use only. Vercel's edge network may
              handle requests outside the EU/EEA. See{' '}
              <a
                className="text-(--color-amber) underline-offset-2 hover:underline"
                href="https://vercel.com/legal/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
              >
                vercel.com/legal/privacy-policy
              </a>
              .
            </li>
            <li>
              <strong className="font-medium text-(--color-ink)">
                Cloudflare
              </strong>{' '}
              — Turnstile captcha. Cloudflare's bot-detection network is
              global. See{' '}
              <a
                className="text-(--color-amber) underline-offset-2 hover:underline"
                href="https://www.cloudflare.com/privacypolicy/"
                target="_blank"
                rel="noopener noreferrer"
              >
                cloudflare.com/privacypolicy
              </a>
              .
            </li>
            <li>
              <strong className="font-medium text-(--color-ink)">
                Google
              </strong>{' '}
              — only relevant if you choose to sign in with Google. The
              sign-in itself takes place on Google's servers. See{' '}
              <a
                className="text-(--color-amber) underline-offset-2 hover:underline"
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
              >
                policies.google.com/privacy
              </a>
              .
            </li>
          </ul>
          <p className="mt-3">
            Your account and game data is stored within the EU (Supabase
            on AWS Europe). Some supporting services — Vercel's CDN edges,
            Cloudflare's bot-detection network, and Google's OAuth
            servers, where used — may process limited technical data
            outside the EU/EEA. For such transfers we rely on the
            standard contractual clauses (SCCs) and, where applicable,
            the EU–US Data Privacy Framework.
          </p>
        </Section>

        <Section title="5. Cookies and local storage (§ 165 TKG)">
          <p className="mb-2">
            We only store things on your device that are strictly
            necessary to run the game. These do not require consent under
            § 165 (3) TKG 2021 or Art. 5 (3) ePrivacy Directive:
          </p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <strong className="font-medium text-(--color-ink)">
                Local storage
              </strong>{' '}
              for your daily streak, last-played puzzle, preferred
              difficulty, and one-off onboarding flags. This stays on
              your device.
            </li>
            <li>
              <strong className="font-medium text-(--color-ink)">
                Authentication tokens
              </strong>{' '}
              issued by Supabase so you stay signed in across visits.
            </li>
            <li>
              <strong className="font-medium text-(--color-ink)">
                Cloudflare Turnstile
              </strong>{' '}
              may set a short-lived cookie or local-storage entry when
              you sign in or submit a leaderboard run, purely for bot
              detection.
            </li>
            <li>
              <strong className="font-medium text-(--color-ink)">
                Vercel Web Analytics
              </strong>{' '}
              records aggregate page-view counts and referrer information
              first-party (same origin as the site). It does{' '}
              <strong className="font-medium text-(--color-ink)">not</strong>{' '}
              set cookies, does not assign user identifiers, and does not
              follow you across other websites; it only counts how many
              times each page was loaded.
            </li>
          </ul>
          <p className="mt-3">
            We do{' '}
            <strong className="font-medium text-(--color-ink)">not</strong>{' '}
            use third-party analytics cookies, advertising cookies,
            tracking pixels, social-media plug-ins, or any cross-site
            profiling. Because the storage we do use is strictly
            necessary, no cookie-consent banner is required by law — we
            still surface a one-time informational notice so you know
            what is stored.
          </p>
        </Section>

        <Section title="6. Retention">
          <p>
            Account and game data are retained for as long as your
            account is active. When you delete your account (see
            Section 8), the underlying records are removed immediately
            and the cascading database cleanup runs within the same
            request. Database backups are rotated within 30 days, after
            which deleted data is no longer recoverable. We do not retain
            personal data beyond what is technically necessary to keep
            the service running.
          </p>
        </Section>

        <Section title="7. Your rights">
          <p className="mb-2">
            Under the GDPR you have the right to:
          </p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>access the personal data we hold about you (Art. 15);</li>
            <li>have inaccurate data corrected (Art. 16);</li>
            <li>have your data erased (Art. 17);</li>
            <li>restrict processing (Art. 18);</li>
            <li>
              receive a copy of your data in a structured, machine-readable
              format and have it transmitted to another controller
              (Art. 20);
            </li>
            <li>
              object to processing based on legitimate interest (Art. 21);
            </li>
            <li>
              withdraw any consent at any time, without affecting the
              lawfulness of processing carried out before withdrawal
              (Art. 7 (3)).
            </li>
          </ul>
          <p className="mt-3">
            To exercise any of these rights, email{' '}
            <a
              className="text-(--color-amber) underline-offset-2 hover:underline"
              href="mailto:peoplefromhistorygame@gmail.com"
            >
              peoplefromhistorygame@gmail.com
            </a>{' '}
            from the address linked to your account. You also have the
            right to lodge a complaint with a supervisory authority — for
            users in Austria this is the{' '}
            <a
              className="text-(--color-amber) underline-offset-2 hover:underline"
              href="https://www.dsb.gv.at/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Datenschutzbehörde (dsb.gv.at)
            </a>
            ; users elsewhere in the EU may contact the supervisory
            authority of their member state.
          </p>
        </Section>

        <Section title="8. Deleting your account">
          <p>
            You can delete your account and all associated game data at
            any time from your{' '}
            <button
              type="button"
              onClick={() => goTo('profile')}
              className="text-(--color-amber) underline-offset-2 hover:underline"
            >
              profile page
            </button>
            : open Profile and use the "Delete my account" button under
            "Danger zone". Deletion is immediate and irreversible — your
            email, leaderboard nickname, daily-play history,
            Practice-mode progress, and Challenge runs are removed from
            our database within the same request. Backup copies are
            rotated out within 30 days.
          </p>
          <p className="mt-3">
            If you have lost access to your account and cannot sign in,
            email{' '}
            <a
              className="text-(--color-amber) underline-offset-2 hover:underline"
              href="mailto:peoplefromhistorygame@gmail.com"
            >
              peoplefromhistorygame@gmail.com
            </a>{' '}
            from the address that is linked to it and we will delete it on
            your behalf.
          </p>
        </Section>

        <Section title="9. Security">
          <p>
            Traffic is served over HTTPS. Database access is restricted by
            row-level security policies so each account can only read and
            modify its own rows; sensitive operations (such as account
            deletion or curator edits) run through audited server-side
            functions rather than direct table writes. We do not store
            passwords — sign-in is handled via magic-link email or Google
            OAuth.
          </p>
        </Section>

        <Section title="10. Children">
          <p>
            People from History is suitable for general audiences but is
            not directed at children under 14. We do not knowingly
            collect personal data from children under 14. If you believe
            a child has provided us with personal data, please contact us
            and we will remove it.
          </p>
        </Section>

        <Section title="11. Changes to this policy">
          <p>
            We may update this policy from time to time to reflect changes
            in the service or in applicable law. The "last reviewed" date
            below indicates when the current version took effect. If the
            change is material we will surface a notice in the app
            before it applies to existing users.
          </p>
        </Section>

        <p className="mt-10 text-xs text-(--color-muted)">
          Last reviewed: 31 May 2026.
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
    <section className="mb-7">
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

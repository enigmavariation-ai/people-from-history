import { AppMenu } from '@/components/AppMenu';
import type { Screen } from '@/components/ProtoNav';

type ImprintScreenProps = { goTo: (s: Screen) => void };

// Offenlegung / Impressum for a site operated from Austria.
// Combines the disclosures required by § 5 E-Commerce-Gesetz (ECG)
// and § 25 Mediengesetz (MedienG). The English-language headings
// keep the citations next to each block so a reader can verify.
export function ImprintScreen({ goTo }: ImprintScreenProps) {
  return (
    <div className="h-[calc(100vh-var(--app-bar-h))] overflow-y-auto bg-(--color-bg)">
      <div className="mx-auto max-w-[680px] px-5 pb-24 pt-5 md:px-8 md:pt-10">
        <div className="mb-6">
          <AppMenu goTo={goTo} currentScreen="imprint" />
        </div>

        <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-(--color-amber)">
          Legal
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
          Imprint
        </h1>
        <p className="mb-10 text-sm text-(--color-muted)">
          Disclosures pursuant to § 5 ECG and § 25 MedienG (Austria).
        </p>

        <Section title="Operator">
          <p>
            Robert Fip
            <br />
            Apollogasse 9/3
            <br />
            1070 Vienna
            <br />
            Austria
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Email:{' '}
            <a
              className="text-(--color-amber) underline-offset-2 hover:underline"
              href="mailto:peoplefromhistorygame@gmail.com"
            >
              peoplefromhistorygame@gmail.com
            </a>
          </p>
        </Section>

        <Section title="Purpose of the site">
          <p>
            People from History is a personal, non-commercial web game in
            which players identify historical figures from
            progressively-revealed cropped portraits. The site is operated
            by a private individual and is not currently monetized; there
            are no ads, no paid features, and no commercial offerings.
          </p>
        </Section>

        <Section title="Responsible for content (§ 24 MedienG)">
          <p>Robert Fip, address as above.</p>
        </Section>

        <Section title="Online dispute resolution">
          <p className="mb-3">
            The European Commission provides a platform for online dispute
            resolution (ODR) at{' '}
            <a
              className="text-(--color-amber) underline-offset-2 hover:underline"
              href="https://ec.europa.eu/consumers/odr/"
              target="_blank"
              rel="noopener noreferrer"
            >
              ec.europa.eu/consumers/odr
            </a>
            . Our email address is listed above.
          </p>
          <p>
            We are neither obliged nor willing to participate in
            dispute-resolution proceedings before a consumer arbitration
            body.
          </p>
        </Section>

        <Section title="Liability for content">
          <p className="mb-3">
            As a service provider we are responsible for our own content on
            this site under the general laws. However, under §§ 13–17 ECG
            we are not obliged to monitor transmitted or stored third-party
            information or to investigate circumstances pointing to
            unlawful activity.
          </p>
          <p>
            Obligations to remove or block the use of information under the
            general laws remain unaffected. Liability in this respect is
            only possible from the point in time at which we become aware
            of a specific legal infringement; we will remove such content
            without delay once it comes to our attention.
          </p>
        </Section>

        <Section title="Liability for external links">
          <p>
            This site contains links to external third-party websites — for
            example to Wikipedia for image credits and historical
            background. We have no influence over the content of those
            sites, so we cannot accept responsibility for it. The
            respective provider or operator of the linked pages is always
            responsible for their content. Links are checked at the time
            they are added and removed if a violation becomes known to us.
          </p>
        </Section>

        <Section title="Image credits">
          <p>
            Historical portraits are sourced from Wikimedia Commons and
            are, unless otherwise noted on the source page, in the public
            domain or released under a Creative Commons licence. The
            relevant source and licence information for each portrait is
            accessible through the Wikipedia link associated with the
            figure inside the game.
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
      <div className="text-sm leading-[1.55] text-(--color-body)">
        {children}
      </div>
    </section>
  );
}

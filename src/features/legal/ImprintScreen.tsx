import { AppMenu } from '@/components/AppMenu';
import type { Screen } from '@/components/ProtoNav';

type ImprintScreenProps = { goTo: (s: Screen) => void };

// Impressum — required under § 5 DDG (formerly TMG) for any
// commercial website operated from Germany. The content below is a
// TEMPLATE based on the standard format; the operator MUST fill in
// their own legal details and have a lawyer (or a generator like
// e-recht24.de / datenschutz-generator.de) review the result before
// going live to a German audience.
//
// Things you MUST replace before launch (search the file for TODO):
//   * Operator name + address + email
//   * (If applicable) VAT ID, register entries, professional body
//   * (If applicable) Person responsible under § 18 MStV
export function ImprintScreen({ goTo }: ImprintScreenProps) {
  return (
    <div className="h-[calc(100vh-var(--app-bar-h))] overflow-y-auto bg-(--color-bg)">
      <div className="mx-auto max-w-[680px] px-5 pb-24 pt-5 md:px-8 md:pt-10">
        <div className="mb-6">
          <AppMenu goTo={goTo} currentScreen="imprint" />
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
          Impressum
        </h1>
        <p className="mb-8 text-sm text-(--color-muted)">
          Angaben gemäß § 5 DDG.
        </p>

        <DraftNotice />

        <Section title="Diensteanbieter">
          <p>
            {/* TODO: Operator's full legal name (private individuals: Vor- und Nachname). */}
            [Vorname Nachname]
            <br />
            {/* TODO: Street + house number. P.O. boxes are not allowed for individuals. */}
            [Straße und Hausnummer]
            <br />
            {/* TODO: ZIP + city. */}
            [PLZ Ort]
            <br />
            Deutschland
          </p>
        </Section>

        <Section title="Kontakt">
          <p>
            E-Mail:{' '}
            {/* TODO: Working contact email. */}
            <a className="text-(--color-amber) underline-offset-2 hover:underline" href="mailto:[email@example.com]">
              [email@example.com]
            </a>
          </p>
        </Section>

        <Section title="Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV">
          <p>
            {/* TODO: Same as Diensteanbieter unless a different responsible person applies. */}
            [Vorname Nachname], [Straße und Hausnummer], [PLZ Ort], Deutschland
          </p>
        </Section>

        <Section title="Streitschlichtung">
          <p className="mb-3">
            Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung
            (OS) bereit:{' '}
            <a
              className="text-(--color-amber) underline-offset-2 hover:underline"
              href="https://ec.europa.eu/consumers/odr/"
              target="_blank"
              rel="noopener noreferrer"
            >
              https://ec.europa.eu/consumers/odr/
            </a>
            . Unsere E-Mail-Adresse finden Sie oben im Impressum.
          </p>
          <p>
            Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor
            einer Verbraucherschlichtungsstelle teilzunehmen.
          </p>
        </Section>

        <Section title="Haftung für Inhalte">
          <p>
            Als Diensteanbieter sind wir gemäß § 7 Abs. 1 DDG für eigene Inhalte auf
            diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis
            10 DDG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte
            oder gespeicherte fremde Informationen zu überwachen oder nach Umständen
            zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
          </p>
        </Section>

        <Section title="Urheberrecht und Bildquellen">
          <p>
            Die Portraits der historischen Persönlichkeiten stammen aus Wikimedia
            Commons und sind, soweit nicht anders angegeben, gemeinfrei oder unter
            einer Creative-Commons-Lizenz veröffentlicht. Die jeweilige
            Quellenangabe und Lizenz ist über den Wikipedia-Link in jeder Figur
            einsehbar.
          </p>
        </Section>

        <p className="mt-10 text-xs text-(--color-muted)">
          Stand: TODO — set the date of the last legal review here.
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
      <div className="text-sm leading-[1.55] text-(--color-body)">
        {children}
      </div>
    </section>
  );
}

function DraftNotice() {
  return (
    <div className="mb-8 rounded-card border border-dashed border-(--color-amber) bg-(--color-amber-soft)/30 px-4 py-3 text-xs leading-relaxed text-(--color-body)">
      <strong className="font-medium text-(--color-ink)">Draft template.</strong>{' '}
      Replace bracketed placeholders with the operator's real details and have a
      German lawyer (or a generator such as e-recht24.de) review before
      publishing to an EU audience.
    </div>
  );
}

import Link from "next/link";

export type LegalSection = {
  title: string;
  paragraphs?: string[];
  items?: string[];
};

export function LegalDocument({
  eyebrow,
  title,
  intro,
  sections,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <main className="app-page grid-bg legal-page">
      <header className="page-intro">
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{intro}</p>
        <small>Berlaku sejak 30 Juli 2026 · Versi 2026-07-30</small>
      </header>
      <article className="neon-card legal-document">
        {sections.map((section) => (
          <section key={section.title}>
            <h2>{section.title}</h2>
            {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            {section.items && <ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul>}
          </section>
        ))}
        <div className="legal-callout">
          <strong>Penting</strong>
          <p>FraudGuard adalah alat bantu skrining risiko, bukan bukti bahwa seseorang melakukan fraud dan bukan pengganti keputusan manusia.</p>
        </div>
        <p><Link className="text-link" href="/settings">Kelola persetujuan dan akun Anda</Link></p>
      </article>
    </main>
  );
}


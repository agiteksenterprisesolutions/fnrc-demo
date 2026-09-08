// fnrc/src/App.jsx
//
// A single page for Fujairah Natural Resources Corporation. Content follows
// fnrc.gov.ae — the establishment decrees, the vision and mission as the
// corporation words them in Arabic, its stated values and objectives, and the
// service families listed on the portal.
import { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  Building2,
  FileCheck2,
  FlaskConical,
  Gauge,
  Landmark,
  Map,
  Mountain,
  Phone,
  ShieldCheck,
  Sparkles,
  Target,
  Truck,
} from 'lucide-react';
import FnrcChatWidget from './components/FnrcChatWidget';

const NAV = [
  { href: '#about', label: 'About' },
  { href: '#vision', label: 'Vision & Mission' },
  { href: '#services', label: 'Services' },
  { href: '#objectives', label: 'Objectives' },
  { href: '#contact', label: 'Contact' },
];

const FACTS = [
  { value: '2009', label: 'Established by Emiri Decree No. (1)' },
  { value: '2011', label: 'Restructured as a Corporation, Decree No. (3)' },
  { value: '11', label: 'Languages served by the assistant' },
  { value: '800 3672', label: 'Toll-free contact centre' },
];

const SERVICES = [
  {
    icon: Mountain,
    title: 'Blasting permits',
    body: 'Permits and oversight for blasting operations at licensed mining sites across the Emirate.',
  },
  {
    icon: FileCheck2,
    title: 'No-objection certificates',
    body: 'Certificates of no objection for works, contractors and projects touching mining land.',
  },
  {
    icon: Map,
    title: 'Map requests',
    body: 'Survey and geological map extracts for licensed sites, concessions and planned works.',
  },
  {
    icon: ShieldCheck,
    title: 'Authorisation certificates',
    body: 'Certificates of authorisation covering operators and representatives of mining facilities.',
  },
  {
    icon: Gauge,
    title: 'Weighbridges & collection centres',
    body: 'Weighing and collection points governing material leaving quarries and crushers.',
  },
  {
    icon: Truck,
    title: 'Transport & logistics',
    body: 'Movement permits and haulage services for extracted rock, aggregate and minerals.',
  },
  {
    icon: Building2,
    title: 'Corporate services',
    body: 'Licensing and account services for companies operating mining facilities in Fujairah.',
  },
  {
    icon: FlaskConical,
    title: 'Innovation laboratory',
    body: 'Testing and materials work supporting quality and sustainability across the sector.',
  },
];

const VALUES = [
  'Knowledge',
  'Responsibility',
  'Positivity',
  'Transparency',
  'Excellence',
  'Innovation',
  'Sustainability',
];

const OBJECTIVES = [
  {
    icon: Landmark,
    title: 'Support local economic development',
    body: 'Grow the Emirate’s mining economy through strategic partnerships across the sector.',
  },
  {
    icon: Sparkles,
    title: 'Create sustainable investment',
    body: 'Open diverse, successful and sustainable mining investment opportunities in Fujairah.',
  },
  {
    icon: Target,
    title: 'Exceed stakeholder expectations',
    body: 'Deliver excellent performance for investors, operators and the wider community.',
  },
  {
    icon: ShieldCheck,
    title: 'Strengthen internal capability',
    body: 'Build capability and an innovative workplace culture inside the corporation.',
  },
];

const Section = ({ id, children, className = '' }) => (
  <section id={id} className={`scroll-mt-20 px-5 py-16 sm:px-8 sm:py-20 ${className}`}>
    <div className="mx-auto max-w-6xl">{children}</div>
  </section>
);

const Eyebrow = ({ children }) => (
  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-fnrc">{children}</p>
);

const Mark = ({ className = '' }) => (
  <span
    className={`flex items-center justify-center rounded-xl bg-fnrc text-white ${className}`}
    aria-hidden="true"
  >
    <Mountain className="h-1/2 w-1/2" />
  </span>
);

export default function App() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header
        className={`sticky top-0 z-40 border-b transition-colors ${
          scrolled ? 'border-fnrc-line bg-white/95 backdrop-blur' : 'border-transparent bg-white'
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
          <a href="#top" className="flex min-w-0 items-center gap-3">
            <Mark className="h-10 w-10 shrink-0" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold leading-tight text-ink">
                Fujairah Natural Resources Corporation
              </span>
              <span className="font-arabic block truncate text-xs leading-tight text-ink-soft" dir="rtl">
                مؤسسة الفجيرة للموارد الطبيعية
              </span>
            </span>
          </a>

          <nav className="hidden items-center gap-7 lg:flex">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-ink-soft transition-colors hover:text-fnrc"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <a
            href="tel:8003672"
            className="hidden shrink-0 items-center gap-2 rounded-full bg-fnrc px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-fnrc-dark sm:flex"
          >
            <Phone size={15} />
            800 3672
          </a>
        </div>
      </header>

      {/* Hero */}
      <div id="top" className="relative overflow-hidden bg-fnrc-tint">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, #7c5e24 1px, transparent 1px), radial-gradient(circle at 70% 60%, #7c5e24 1px, transparent 1px)',
            backgroundSize: '28px 28px, 36px 36px',
          }}
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-fnrc/25 bg-white px-3.5 py-1.5 text-xs font-semibold text-fnrc">
              <Landmark size={13} />
              Government of Fujairah · United Arab Emirates
            </span>

            <h1 className="mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight text-ink sm:text-5xl lg:text-6xl">
              Developing Fujairah’s mining
              <span className="text-fnrc"> resources, sustainably.</span>
            </h1>

            <p className="font-arabic mt-4 text-lg text-ink-soft" dir="rtl">
              المؤسسة الرائدة إقليمياً في إستثمار الموارد التعدينية بإستدامة وابتكار
            </p>

            <p className="mt-6 max-w-2xl text-base leading-relaxed text-ink-soft sm:text-lg">
              FNRC regulates and develops mining activity across the Emirate of Fujairah —
              licensing operators, permitting blasting works, governing weighbridges and
              opening safe, sustainable investment in the Emirate’s natural resources.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#services"
                className="inline-flex items-center gap-2 rounded-full bg-fnrc px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-fnrc-dark"
              >
                Explore our services
                <ArrowUpRight size={16} />
              </a>
              <a
                href="#contact"
                className="inline-flex items-center gap-2 rounded-full border border-fnrc/30 bg-white px-6 py-3 text-sm font-semibold text-fnrc transition-colors hover:bg-fnrc-soft"
              >
                Contact the corporation
              </a>
            </div>
          </div>

          <dl className="mt-16 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-fnrc-line bg-fnrc-line lg:grid-cols-4">
            {FACTS.map((fact) => (
              <div key={fact.label} className="bg-white px-5 py-6">
                <dt className="text-2xl font-extrabold text-fnrc sm:text-3xl">{fact.value}</dt>
                <dd className="mt-1.5 text-xs leading-snug text-ink-soft">{fact.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* About */}
      <Section id="about">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <Eyebrow>About the corporation</Eyebrow>
            <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              A government corporation reporting to the Ruler of Fujairah
            </h2>
            <p className="mt-5 leading-relaxed text-ink-soft">
              Fujairah Natural Resources Corporation was established in 2009 under Emiri Decree
              No. (1), and restructured in 2011 under Decree No. (3), when it was renamed from an
              Authority to a Corporation.
            </p>
            <p className="mt-4 leading-relaxed text-ink-soft">
              It holds an independent legal personality with financial and administrative
              independence, and reports directly to the Ruler of Fujairah. Its remit covers the
              development, regulation and oversight of mining activity throughout the Emirate.
            </p>
          </div>

          <div className="rounded-3xl border border-fnrc-line bg-fnrc-tint p-8">
            <Eyebrow>Our values</Eyebrow>
            <div className="mt-2 flex flex-wrap gap-2.5">
              {VALUES.map((value) => (
                <span
                  key={value}
                  className="rounded-full border border-fnrc/25 bg-white px-4 py-2 text-sm font-medium text-fnrc"
                >
                  {value}
                </span>
              ))}
            </div>
            <p className="mt-6 text-sm leading-relaxed text-ink-soft">
              These values guide how the corporation licenses operators, works with the community
              and holds the mining sector to a standard the Emirate can build on.
            </p>
          </div>
        </div>
      </Section>

      {/* Vision & mission */}
      <Section id="vision" className="bg-fnrc-tint">
        <Eyebrow>Vision &amp; mission</Eyebrow>
        <div className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-3xl border border-fnrc-line bg-white p-8">
            <h3 className="text-lg font-bold text-ink">Vision</h3>
            <p className="font-arabic mt-4 text-lg leading-loose text-fnrc" dir="rtl">
              المؤسسة الرائدة إقليمياً في إستثمار الموارد التعدينية بإستدامة وابتكار
            </p>
            <p className="mt-4 leading-relaxed text-ink-soft">
              The regional leader in investing mining resources with sustainability and
              innovation.
            </p>
          </article>

          <article className="rounded-3xl border border-fnrc-line bg-white p-8">
            <h3 className="text-lg font-bold text-ink">Mission</h3>
            <p className="font-arabic mt-4 text-lg leading-loose text-fnrc" dir="rtl">
              مؤسسة حكومية تقدم أداء متميز وقادرة على تطوير وإدارة النشاط التعديني بالتعاون مع
              كافه فئات المجتمع لخلق بيئة إستثمار آمنة
            </p>
            <p className="mt-4 leading-relaxed text-ink-soft">
              A government corporation delivering distinguished performance, able to develop and
              manage mining activity in cooperation with all parts of the community, to create a
              safe investment environment.
            </p>
          </article>
        </div>
      </Section>

      {/* Services */}
      <Section id="services">
        <div className="max-w-2xl">
          <Eyebrow>Our services</Eyebrow>
          <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Services for individuals, companies and mining facilities
          </h2>
          <p className="mt-4 leading-relaxed text-ink-soft">
            Applications are handled through the corporation’s electronic services, its customer
            happiness centres and its weighbridges and collection points across the Emirate.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map(({ icon: Icon, title, body }) => (
            <article
              key={title}
              className="group rounded-2xl border border-fnrc-line bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-fnrc/40 hover:shadow-lg hover:shadow-fnrc/5"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-fnrc-soft text-fnrc transition-colors group-hover:bg-fnrc group-hover:text-white">
                <Icon size={20} />
              </span>
              <h3 className="mt-4 text-base font-semibold text-ink">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{body}</p>
            </article>
          ))}
        </div>
      </Section>

      {/* Objectives */}
      <Section id="objectives" className="bg-fnrc-tint">
        <div className="max-w-2xl">
          <Eyebrow>Strategic objectives</Eyebrow>
          <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            What the corporation is working towards
          </h2>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {OBJECTIVES.map(({ icon: Icon, title, body }) => (
            <article
              key={title}
              className="flex gap-4 rounded-2xl border border-fnrc-line bg-white p-6"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-fnrc-soft text-fnrc">
                <Icon size={18} />
              </span>
              <div>
                <h3 className="text-base font-semibold text-ink">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{body}</p>
              </div>
            </article>
          ))}
        </div>
      </Section>

      {/* Contact */}
      <Section id="contact">
        <div className="overflow-hidden rounded-3xl bg-fnrc">
          <div className="grid gap-10 p-8 sm:p-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                Contact us
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                We are here to help
              </h2>
              <p className="mt-4 leading-relaxed text-white/80">
                Reach the corporation on the toll-free number, on WhatsApp, or ask the assistant
                on this page — it answers in eleven languages, by voice or in writing.
              </p>

              <div className="mt-8 space-y-3">
                <a
                  href="tel:8003672"
                  className="flex w-fit items-center gap-3 rounded-full bg-white px-5 py-3 text-sm font-semibold text-fnrc transition-opacity hover:opacity-90"
                >
                  <Phone size={16} />
                  800 3672
                </a>
                <p className="text-sm text-white/70">
                  WhatsApp: +971 800 3672 · Social: @fnrcfujairah
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-white/10 p-7">
              <h3 className="text-base font-semibold text-white">Where we operate</h3>
              <ul className="mt-4 space-y-3 text-sm text-white/85">
                {[
                  'Main office — Emirate of Fujairah',
                  'Customer happiness centres',
                  'Weighbridges and collection centres',
                  'Innovation laboratory',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-white/60" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Section>

      {/* Footer */}
      <footer className="border-t border-fnrc-line px-5 py-10 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 sm:flex-row">
          <div className="flex items-center gap-3">
            <Mark className="h-9 w-9" />
            <div>
              <p className="text-sm font-semibold text-ink">
                Fujairah Natural Resources Corporation
              </p>
              <p className="font-arabic text-xs text-ink-soft" dir="rtl">
                مؤسسة الفجيرة للموارد الطبيعية
              </p>
            </div>
          </div>
          <p className="text-xs text-ink-soft">
            © {new Date().getFullYear()} FNRC · Government of Fujairah, United Arab Emirates
          </p>
        </div>
      </footer>

      {/* The assistant. Its own widget, sharing nothing with the Xposer one. */}
      <FnrcChatWidget />
    </div>
  );
}

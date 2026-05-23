'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Activity, ArrowRight, ArrowUpRight, BookOpen, Building2, Calendar,
  ChevronRight, FlaskConical, Globe, GraduationCap, HeartPulse, Languages,
  Layers, LayoutDashboard, Lightbulb, LogIn, Mail, MapPin, Microscope,
  Phone, Presentation, ShieldCheck, Sparkles, Stethoscope, UserRound, Users,
} from 'lucide-react'

import { useAuthStore } from '@/lib/auth-store'
import { cn, formatDate } from '@/lib/utils'

// ---------- Public, demo-safe shapes (subset of the full types) ----------

export type HomeStats = {
  active_projects: number
  published_papers: number
  total_departments: number
  q1_publications: number
  open_access_count: number
  total_users: number
}

export type HomePublication = {
  id: string
  research_id: string
  title: string
  title_ar?: string | null
  journal_name?: string | null
  publication_date?: string | null
  journal_quartile?: string | null
  is_open_access?: boolean | null
  principal_investigator_name?: string | null
  department_id?: string | null
}

export type HomeDepartment = {
  id: string
  name: string
  name_ar?: string | null
  code: string
  color: string
  research_count: number
}

type Lang = 'en' | 'ar'

type Props = {
  initialLang: Lang
  stats: HomeStats
  featured: HomePublication[]
  departments: HomeDepartment[]
  liveData: boolean
}

// ---------------------- Translations ----------------------

const T = {
  en: {
    publicPortal: 'Public Research Portal',
    languageBtn: 'العربية',
    staffLogin: 'Staff Login',
    goToDashboard: 'Go to Dashboard',
    continueAsVisitor: 'Continue as Visitor',
    heroBadge: 'Health & Nursing Research Excellence',
    unitName: 'Health & Nursing Research Unit',
    hospital: 'Prince Mohammed Bin Nasser Hospital',
    location: 'Jazan · Kingdom of Saudi Arabia',
    heroLead:
      'A center of evidence-based clinical, nursing, and health-systems research advancing patient care, professional practice, and population health across the Jazan region.',
    learnMore: 'Explore Research',
    contact: 'Contact the Unit',
    statsTitle: 'Research at a Glance',
    statsSub: 'Operational metrics from the Research Unit, updated continuously',
    activeProjects: 'Active Research Projects',
    publishedPapers: 'Published Papers',
    departmentsLabel: 'Active Departments',
    q1Publications: 'Q1 Journal Publications',
    openAccess: 'Open-Access Studies',
    researchers: 'Investigators & Staff',
    liveData: 'Live data',
    demoData: 'Sample data shown — connect Supabase to display live figures',
    aboutEyebrow: 'About the Unit',
    aboutTitle: 'Evidence that shapes care at the bedside',
    aboutP1:
      'The Health & Nursing Research Unit at PMNH coordinates research across clinical specialties, nursing practice, and hospital operations. We provide investigators with IRB navigation, methodology consultation, statistical support, and a structured publication workflow.',
    aboutP2:
      'Our mission is to translate everyday clinical observation into peer-reviewed evidence — and to translate that evidence back into measurable improvements for the patients of Jazan.',
    areasEyebrow: 'Research Areas',
    areasTitle: 'Where we focus',
    areasSub:
      'Cross-departmental programs spanning clinical specialties, nursing science, public health, and quality improvement.',
    featuredEyebrow: 'Featured Publications',
    featuredTitle: 'Recent peer-reviewed contributions',
    featuredSub:
      'A curated selection from our publications database. Use the public portal to search the full collection.',
    viewAll: 'Browse all publications',
    noFeatured: 'New publications will appear here once approved for public release.',
    programsEyebrow: 'Programs & Activities',
    programsTitle: 'Year-round capacity building',
    programsSub:
      'Workshops, journal clubs, conference participation, and ethics support — open to clinical and nursing staff across PMNH.',
    deptsEyebrow: 'Participating Departments',
    deptsTitle: 'Department research footprint',
    deptsSub:
      'Departments actively contributing to the unit’s portfolio, with study counts updated as projects progress.',
    contactEyebrow: 'Get in Touch',
    contactTitle: 'Talk to the Research Unit',
    contactSub:
      'For collaboration proposals, ethics submissions, training requests, or media enquiries.',
    address: 'Prince Mohammed Bin Nasser Hospital, Jazan, Saudi Arabia',
    emailLabel: 'Email',
    phoneLabel: 'Phone',
    visitLabel: 'Visit',
    visitorPortalCta: 'Browse the public research portal',
    rights: 'All rights reserved.',
    privacy: 'Privacy & Data Use',
    publicNote:
      'This portal shows only approved public research information. Confidential records require staff authentication.',
    footerTagline:
      'An institutional research unit of Prince Mohammed Bin Nasser Hospital, Jazan.',
    studies: 'studies',
    journal: 'Journal',
    pi: 'Principal Investigator',
  },
  ar: {
    publicPortal: 'البوابة البحثية العامة',
    languageBtn: 'English',
    staffLogin: 'دخول الموظفين',
    goToDashboard: 'الانتقال إلى لوحة التحكم',
    continueAsVisitor: 'الدخول كزائر',
    heroBadge: 'التميّز في الأبحاث الصحية والتمريضية',
    unitName: 'وحدة الأبحاث الصحية والتمريضية',
    hospital: 'مستشفى الأمير محمد بن ناصر',
    location: 'جازان · المملكة العربية السعودية',
    heroLead:
      'مركز متخصص للأبحاث السريرية والتمريضية وأبحاث النظم الصحية، يدعم رعاية المرضى وتطوير الممارسة المهنية وتحسين الصحة العامة في منطقة جازان.',
    learnMore: 'استعراض الأبحاث',
    contact: 'تواصل مع الوحدة',
    statsTitle: 'نظرة عامة على نشاط الوحدة',
    statsSub: 'مؤشرات تشغيلية يتم تحديثها باستمرار',
    activeProjects: 'مشاريع بحثية نشطة',
    publishedPapers: 'أبحاث منشورة',
    departmentsLabel: 'أقسام مشاركة',
    q1Publications: 'منشورات في مجلات الربع الأول',
    openAccess: 'دراسات مفتوحة الوصول',
    researchers: 'باحثون وموظفون',
    liveData: 'بيانات مباشرة',
    demoData: 'بيانات تجريبية — قم بربط Supabase لعرض الأرقام الفعلية',
    aboutEyebrow: 'عن الوحدة',
    aboutTitle: 'أدلة علمية تنعكس على رعاية المرضى',
    aboutP1:
      'تنسق وحدة الأبحاث الصحية والتمريضية بمستشفى الأمير محمد بن ناصر الأبحاث عبر التخصصات السريرية والممارسة التمريضية والتشغيل المستشفوي. نقدم للباحثين دعمًا في إجراءات لجنة الأخلاقيات والمنهجية والتحليل الإحصائي وسير عمل النشر.</p>',
    aboutP2:
      'مهمتنا هي تحويل الملاحظات السريرية اليومية إلى أدلة علمية محكّمة، ثم إعادة تلك الأدلة إلى تحسينات ملموسة في رعاية المرضى في جازان.',
    areasEyebrow: 'مجالات الأبحاث',
    areasTitle: 'مجالات تركيزنا',
    areasSub:
      'برامج متعددة الأقسام تشمل التخصصات السريرية وعلوم التمريض والصحة العامة وتحسين الجودة.',
    featuredEyebrow: 'أحدث المنشورات',
    featuredTitle: 'مساهمات علمية محكّمة حديثة',
    featuredSub:
      'مختارات من قاعدة بيانات المنشورات. استخدم البوابة العامة للبحث في القائمة الكاملة.',
    viewAll: 'استعراض جميع المنشورات',
    noFeatured: 'ستظهر المنشورات هنا بعد اعتمادها للنشر العام.',
    programsEyebrow: 'البرامج والأنشطة',
    programsTitle: 'بناء القدرات طوال العام',
    programsSub:
      'ورش عمل، نوادي قراءة بحثية، مشاركة في المؤتمرات، ودعم لجنة الأخلاقيات — مفتوحة لمنسوبي المستشفى السريريين والتمريضيين.',
    deptsEyebrow: 'الأقسام المشاركة',
    deptsTitle: 'البصمة البحثية للأقسام',
    deptsSub:
      'أقسام تساهم فعليًا في محفظة الوحدة، مع تحديث أعداد الدراسات حسب تقدم المشاريع.',
    contactEyebrow: 'تواصل معنا',
    contactTitle: 'تواصل مع وحدة الأبحاث',
    contactSub:
      'لمقترحات التعاون، أو طلبات الموافقة الأخلاقية، أو حجز التدريب، أو الاستفسارات الإعلامية.',
    address: 'مستشفى الأمير محمد بن ناصر، جازان، المملكة العربية السعودية',
    emailLabel: 'البريد الإلكتروني',
    phoneLabel: 'الهاتف',
    visitLabel: 'الموقع',
    visitorPortalCta: 'استعراض البوابة البحثية العامة',
    rights: 'جميع الحقوق محفوظة.',
    privacy: 'الخصوصية واستخدام البيانات',
    publicNote:
      'يعرض هذا البوابة المعلومات البحثية المعتمدة للنشر العام فقط. السجلات السرية تتطلب تسجيل دخول الموظفين.',
    footerTagline:
      'وحدة بحثية مؤسسية تابعة لمستشفى الأمير محمد بن ناصر بجازان.',
    studies: 'دراسة',
    journal: 'المجلة',
    pi: 'الباحث الرئيسي',
  },
} as const

// ----------------- Research-area cards (icon + EN/AR copy) -----------------

const RESEARCH_AREAS: {
  icon: React.ComponentType<{ className?: string }>
  en: { title: string; desc: string }
  ar: { title: string; desc: string }
  tint: string
}[] = [
  {
    icon: Stethoscope,
    en: { title: 'Clinical Research', desc: 'Disease-focused studies across internal medicine, surgery, ICU and emergency care.' },
    ar: { title: 'الأبحاث السريرية', desc: 'دراسات متخصصة في الباطنية والجراحة والعناية المركزة وطب الطوارئ.' },
    tint: 'from-blue-500/15 to-blue-600/5 text-blue-600',
  },
  {
    icon: HeartPulse,
    en: { title: 'Nursing Research', desc: 'Evidence-based nursing practice, workforce wellbeing, and patient experience.' },
    ar: { title: 'الأبحاث التمريضية', desc: 'الممارسة التمريضية المستندة على الأدلة وسلامة العاملين وتجربة المريض.' },
    tint: 'from-rose-500/15 to-rose-600/5 text-rose-600',
  },
  {
    icon: ShieldCheck,
    en: { title: 'Quality & Safety', desc: 'Quality improvement, infection prevention, and patient-safety initiatives.' },
    ar: { title: 'الجودة والسلامة', desc: 'مبادرات تحسين الجودة ومكافحة العدوى وسلامة المرضى.' },
    tint: 'from-emerald-500/15 to-emerald-600/5 text-emerald-600',
  },
  {
    icon: Microscope,
    en: { title: 'Biomedical & Lab', desc: 'Laboratory-based studies, biomarker analysis, and diagnostic accuracy.' },
    ar: { title: 'الأبحاث المخبرية والحيوية', desc: 'دراسات مخبرية وتحليل المؤشرات الحيوية ودقة التشخيص.' },
    tint: 'from-violet-500/15 to-violet-600/5 text-violet-600',
  },
  {
    icon: Users,
    en: { title: 'Public & Community Health', desc: 'Population health, epidemiology, and prevention programs in Jazan.' },
    ar: { title: 'الصحة العامة والمجتمعية', desc: 'صحة السكان والوبائيات وبرامج الوقاية في منطقة جازان.' },
    tint: 'from-amber-500/15 to-amber-600/5 text-amber-600',
  },
  {
    icon: Layers,
    en: { title: 'Health Systems', desc: 'Operations research, workflow optimization, and digital-health adoption.' },
    ar: { title: 'النظم الصحية', desc: 'بحوث التشغيل وتحسين سير العمل وتبني الصحة الرقمية.' },
    tint: 'from-cyan-500/15 to-cyan-600/5 text-cyan-600',
  },
]

const PROGRAMS: {
  icon: React.ComponentType<{ className?: string }>
  en: { title: string; desc: string }
  ar: { title: string; desc: string }
}[] = [
  {
    icon: GraduationCap,
    en: { title: 'Workshops & Training', desc: 'Methodology, statistics, manuscript writing, and IRB navigation courses.' },
    ar: { title: 'ورش العمل والتدريب', desc: 'دورات في المنهجية والإحصاء وكتابة المخطوطات وإجراءات الأخلاقيات.' },
  },
  {
    icon: BookOpen,
    en: { title: 'Research Journal Club', desc: 'Monthly sessions reviewing recent literature and methodology critiques.' },
    ar: { title: 'النادي البحثي', desc: 'جلسات شهرية لمراجعة الأدبيات الحديثة ونقد المنهجية.' },
  },
  {
    icon: Presentation,
    en: { title: 'Scientific Conferences', desc: 'Coordination of abstract submissions, posters, and oral presentations.' },
    ar: { title: 'المؤتمرات العلمية', desc: 'تنسيق إرسال الملخصات والملصقات والعروض الشفوية.' },
  },
  {
    icon: Sparkles,
    en: { title: 'IRB & Ethics Support', desc: 'Pre-submission review and ethics documentation guidance for investigators.' },
    ar: { title: 'دعم لجنة الأخلاقيات', desc: 'مراجعة ما قبل التقديم وتوجيه وثائق الأخلاقيات.' },
  },
]

// ---------------------- Small UI helpers ----------------------

function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn('inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-700/80', className)}>
      <span className="h-px w-6 bg-blue-700/40" />
      {children}
    </p>
  )
}

function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = 'left',
}: {
  eyebrow: string
  title: string
  subtitle?: string
  align?: 'left' | 'center'
}) {
  return (
    <div className={cn('max-w-3xl', align === 'center' && 'mx-auto text-center')}>
      <Eyebrow className={align === 'center' ? 'justify-center' : ''}>{eyebrow}</Eyebrow>
      <h2 className="mt-3 text-3xl md:text-4xl font-bold text-gray-900 leading-tight">{title}</h2>
      {subtitle && <p className="mt-3 text-base text-gray-600 leading-relaxed">{subtitle}</p>}
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="glass-dark p-5">
      <p className="text-blue-100/80 text-xs font-semibold uppercase tracking-wider">{label}</p>
      <p className="text-white text-3xl md:text-4xl font-bold mt-1.5 tabular-nums">{value}</p>
      {sub && <p className="text-blue-200/80 text-xs mt-1">{sub}</p>}
    </div>
  )
}

// ---------------------- Main page ----------------------

export default function HomePage({
  initialLang,
  stats,
  featured,
  departments,
  liveData,
}: Props) {
  const [lang, setLang] = useState<Lang>(initialLang)
  const isRtl = lang === 'ar'
  const t = T[lang]

  const { isAuthenticated, user } = useAuthStore()

  // Persist language choice in a cookie so the next request matches.
  useEffect(() => {
    document.cookie = `lang=${lang}; path=/; max-age=${60 * 60 * 24 * 365}`
    if (typeof document !== 'undefined') document.documentElement.lang = lang
  }, [lang])

  const featuredSafe = useMemo(() => featured.slice(0, 6), [featured])
  const deptLimited = useMemo(() => departments.slice(0, 12), [departments])

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} lang={lang} className="min-h-screen bg-white text-gray-900">

      {/* ============ TOP BAR ============ */}
      <header className="sticky top-0 z-40 backdrop-blur-lg bg-white/85 border-b border-gray-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center overflow-hidden ring-1 ring-blue-100 shadow-sm">
              <img
                src="/jazan-health-cluster.jpg"
                alt="Jazan Health Cluster"
                className="w-8 h-8 object-contain"
                onError={(e) => { const t = e.currentTarget; t.onerror = null; t.src = '/hospital-logo.svg' }}
              />
            </div>
            <div className="hidden sm:block leading-tight">
              <p className="text-[13px] font-bold text-gray-900 group-hover:text-blue-700 transition-colors">
                {t.unitName}
              </p>
              <p className="text-[11px] text-gray-500">{t.hospital} · Jazan</p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1 mx-auto text-sm font-medium text-gray-600">
            <a href="#about" className="px-3 py-1.5 rounded-lg hover:bg-blue-50 hover:text-blue-700 transition-colors">
              {t.aboutEyebrow}
            </a>
            <a href="#areas" className="px-3 py-1.5 rounded-lg hover:bg-blue-50 hover:text-blue-700 transition-colors">
              {t.areasEyebrow}
            </a>
            <a href="#featured" className="px-3 py-1.5 rounded-lg hover:bg-blue-50 hover:text-blue-700 transition-colors">
              {t.featuredEyebrow}
            </a>
            <a href="#programs" className="px-3 py-1.5 rounded-lg hover:bg-blue-50 hover:text-blue-700 transition-colors">
              {t.programsEyebrow}
            </a>
            <a href="#contact" className="px-3 py-1.5 rounded-lg hover:bg-blue-50 hover:text-blue-700 transition-colors">
              {t.contactEyebrow}
            </a>
          </nav>

          <div className="ms-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
              aria-label="Toggle language"
            >
              <Languages className="w-4 h-4" />
              <span>{t.languageBtn}</span>
            </button>

            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
              >
                <LayoutDashboard className="w-4 h-4" />
                {t.goToDashboard}
              </Link>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
              >
                <LogIn className="w-4 h-4" />
                {t.staffLogin}
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ============ HERO ============ */}
      <section className="home-hero text-white relative overflow-hidden">
        <div className="home-hero-grid absolute inset-0 opacity-60" aria-hidden />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24 md:pt-24 md:pb-32">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="max-w-3xl"
          >
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-blue-100 text-xs font-semibold tracking-wide backdrop-blur">
              <Sparkles className="w-3.5 h-3.5" />
              {t.heroBadge}
            </span>

            <h1 className="mt-6 text-4xl md:text-6xl font-extrabold leading-[1.05] text-balance">
              {t.unitName}
            </h1>
            <p className="mt-4 text-lg md:text-xl text-blue-100/90 font-medium">
              {t.hospital} · {t.location}
            </p>
            <p className="mt-6 max-w-2xl text-base md:text-lg text-blue-100/80 leading-relaxed">
              {t.heroLead}
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href="/visitor"
                className="cta-glow inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white text-blue-800 font-bold text-sm shadow-xl hover:bg-blue-50 transition-colors"
              >
                <Globe className="w-4 h-4" />
                {t.continueAsVisitor}
                <ArrowRight className={cn('w-4 h-4 transition-transform group-hover:translate-x-0.5', isRtl && 'flip-rtl')} />
              </Link>

              {isAuthenticated ? (
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white/10 border border-white/25 text-white font-bold text-sm hover:bg-white/20 transition-colors backdrop-blur"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  {t.goToDashboard}
                  <ChevronRight className={cn('w-4 h-4', isRtl && 'flip-rtl')} />
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white/10 border border-white/25 text-white font-bold text-sm hover:bg-white/20 transition-colors backdrop-blur"
                >
                  <LogIn className="w-4 h-4" />
                  {t.staffLogin}
                  <ChevronRight className={cn('w-4 h-4', isRtl && 'flip-rtl')} />
                </Link>
              )}

              <a
                href="#contact"
                className="inline-flex items-center gap-2 px-4 py-3 rounded-xl text-white/90 font-semibold text-sm hover:text-white transition-colors"
              >
                {t.contact}
                <ArrowUpRight className={cn('w-4 h-4', isRtl && 'flip-rtl')} />
              </a>
            </div>
          </motion.div>

          {/* Stats strip */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
            className="mt-14 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3"
          >
            <Stat label={t.activeProjects} value={stats.active_projects} />
            <Stat label={t.publishedPapers} value={stats.published_papers} />
            <Stat label={t.q1Publications} value={stats.q1_publications} />
            <Stat label={t.openAccess} value={stats.open_access_count} />
            <Stat label={t.departmentsLabel} value={stats.total_departments} />
            <Stat label={t.researchers} value={stats.total_users} />
          </motion.div>

          {/* Live data badge */}
          <div className="mt-5 flex items-center justify-center md:justify-start gap-2 text-xs text-blue-200/80">
            <span
              className={cn(
                'inline-block w-1.5 h-1.5 rounded-full',
                liveData ? 'bg-emerald-400' : 'bg-amber-400',
              )}
              aria-hidden
            />
            {liveData ? t.liveData : t.demoData}
          </div>
        </div>
      </section>

      {/* ============ ABOUT ============ */}
      <section id="about" className="scroll-anchor py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <SectionHeading eyebrow={t.aboutEyebrow} title={t.aboutTitle} subtitle={t.aboutP1} />
            <p className="mt-5 text-base text-gray-600 leading-relaxed">{t.aboutP2}</p>

            <div className="mt-8 grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-gray-200 p-4 bg-blue-50/40">
                <FlaskConical className="w-6 h-6 text-blue-700" />
                <p className="mt-3 text-2xl font-bold text-gray-900 tabular-nums">{stats.active_projects}</p>
                <p className="text-xs text-gray-500 mt-0.5">{t.activeProjects}</p>
              </div>
              <div className="rounded-2xl border border-gray-200 p-4 bg-teal-50/40">
                <BookOpen className="w-6 h-6 text-teal-700" />
                <p className="mt-3 text-2xl font-bold text-gray-900 tabular-nums">{stats.published_papers}</p>
                <p className="text-xs text-gray-500 mt-0.5">{t.publishedPapers}</p>
              </div>
              <div className="rounded-2xl border border-gray-200 p-4 bg-violet-50/40">
                <Building2 className="w-6 h-6 text-violet-700" />
                <p className="mt-3 text-2xl font-bold text-gray-900 tabular-nums">{stats.total_departments}</p>
                <p className="text-xs text-gray-500 mt-0.5">{t.departmentsLabel}</p>
              </div>
              <div className="rounded-2xl border border-gray-200 p-4 bg-emerald-50/40">
                <UserRound className="w-6 h-6 text-emerald-700" />
                <p className="mt-3 text-2xl font-bold text-gray-900 tabular-nums">{stats.total_users}</p>
                <p className="text-xs text-gray-500 mt-0.5">{t.researchers}</p>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 bg-gradient-to-tr from-blue-200/40 via-teal-200/30 to-transparent rounded-[2rem] blur-2xl" aria-hidden />
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/60 bg-gradient-to-br from-blue-900 via-blue-800 to-blue-600 aspect-[4/5]">
              <div className="absolute inset-0 home-hero-grid opacity-40" />
              <div className="absolute inset-0 flex flex-col justify-end p-8">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center border border-white/25">
                    <Activity className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">PMNH · Jazan</p>
                    <p className="text-blue-200 text-xs">{t.publicPortal}</p>
                  </div>
                </div>
                <p className="text-white text-xl md:text-2xl font-bold leading-snug">
                  {isRtl
                    ? 'من السرير إلى المنشور — وعودة إلى السرير.'
                    : 'From the bedside to the page — and back to the bedside.'}
                </p>
                <p className="text-blue-200/90 text-sm mt-3 leading-relaxed">
                  {isRtl
                    ? 'تستثمر الوحدة في كل خطوة من رحلة البحث: من الفكرة إلى الموافقة الأخلاقية إلى النشر.'
                    : 'The Unit invests in every step of the research journey — from idea to ethics approval to publication.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ RESEARCH AREAS ============ */}
      <section id="areas" className="scroll-anchor py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-blue-50/50 to-white">
        <div className="max-w-7xl mx-auto">
          <SectionHeading eyebrow={t.areasEyebrow} title={t.areasTitle} subtitle={t.areasSub} />

          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {RESEARCH_AREAS.map((a, i) => {
              const copy = a[lang]
              const Icon = a.icon
              return (
                <motion.div
                  key={copy.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{ duration: 0.45, delay: i * 0.05, ease: 'easeOut' }}
                  className="group premium-card p-6"
                >
                  <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br', a.tint)}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="mt-5 text-lg font-bold text-gray-900 group-hover:text-blue-700 transition-colors">
                    {copy.title}
                  </h3>
                  <p className="mt-2 text-sm text-gray-600 leading-relaxed">{copy.desc}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ============ FEATURED PUBLICATIONS ============ */}
      <section id="featured" className="scroll-anchor py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <SectionHeading eyebrow={t.featuredEyebrow} title={t.featuredTitle} subtitle={t.featuredSub} />
            <Link
              href="/visitor"
              className="self-start md:self-end inline-flex items-center gap-2 text-sm font-bold text-blue-700 hover:text-blue-800 transition-colors group whitespace-nowrap"
            >
              {t.viewAll}
              <ArrowRight className={cn('w-4 h-4 transition-transform group-hover:translate-x-1', isRtl && 'flip-rtl')} />
            </Link>
          </div>

          {featuredSafe.length === 0 ? (
            <div className="mt-12 premium-card p-12 text-center">
              <BookOpen className="w-12 h-12 text-gray-300 mx-auto" />
              <p className="mt-4 text-gray-500">{t.noFeatured}</p>
            </div>
          ) : (
            <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {featuredSafe.map((p, i) => {
                const dept = departments.find(d => d.id === p.department_id)
                const title = isRtl && p.title_ar ? p.title_ar : p.title
                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.4, delay: i * 0.04 }}
                    className="premium-card p-5 flex flex-col group"
                  >
                    <div className="flex items-center gap-2 flex-wrap mb-3">
                      <span className="font-mono text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                        {p.research_id}
                      </span>
                      {p.journal_quartile && p.journal_quartile !== 'not_indexed' && (
                        <span className="text-[11px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
                          {p.journal_quartile.toUpperCase()}
                        </span>
                      )}
                      {p.is_open_access && (
                        <span className="text-[11px] font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          {t.openAccess}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-gray-900 leading-snug line-clamp-3 group-hover:text-blue-700 transition-colors">
                      {title}
                    </h3>
                    <div className="mt-4 space-y-1.5 text-xs text-gray-500 flex-1">
                      {p.principal_investigator_name && (
                        <p className="flex items-center gap-1.5">
                          <Users className="w-3 h-3" />
                          {p.principal_investigator_name}
                        </p>
                      )}
                      {dept && (
                        <p className="flex items-center gap-1.5">
                          <Building2 className="w-3 h-3" />
                          {isRtl && dept.name_ar ? dept.name_ar : dept.name}
                        </p>
                      )}
                      {p.journal_name && (
                        <p className="flex items-center gap-1.5">
                          <BookOpen className="w-3 h-3" />
                          {p.journal_name}
                        </p>
                      )}
                      {p.publication_date && (
                        <p className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3" />
                          {formatDate(p.publication_date)}
                        </p>
                      )}
                    </div>
                    <Link
                      href="/visitor"
                      className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-800 transition-colors"
                    >
                      {t.viewAll}
                      <ArrowRight className={cn('w-3.5 h-3.5', isRtl && 'flip-rtl')} />
                    </Link>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* ============ PROGRAMS ============ */}
      <section id="programs" className="scroll-anchor py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-blue-50/50">
        <div className="max-w-7xl mx-auto">
          <SectionHeading eyebrow={t.programsEyebrow} title={t.programsTitle} subtitle={t.programsSub} />

          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {PROGRAMS.map((p, i) => {
              const Icon = p.icon
              const copy = p[lang]
              return (
                <motion.div
                  key={copy.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{ duration: 0.45, delay: i * 0.06 }}
                  className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-700 via-blue-800 to-blue-900 text-white p-6 shadow-xl"
                >
                  <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-2xl" aria-hidden />
                  <div className="relative">
                    <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center border border-white/20">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="mt-5 text-lg font-bold leading-tight">{copy.title}</h3>
                    <p className="mt-2 text-sm text-blue-100/85 leading-relaxed">{copy.desc}</p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ============ DEPARTMENTS ============ */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <SectionHeading eyebrow={t.deptsEyebrow} title={t.deptsTitle} subtitle={t.deptsSub} />

          <div className="mt-12 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {deptLimited.map((d, i) => (
              <motion.div
                key={d.id}
                initial={{ opacity: 0, scale: 0.97 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.3, delay: i * 0.03 }}
                className="group rounded-2xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-card transition-all bg-white"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-[11px] font-bold shadow-sm flex-shrink-0"
                    style={{ background: d.color }}
                  >
                    {d.code.slice(0, 3)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate group-hover:text-blue-700 transition-colors">
                      {isRtl && d.name_ar ? d.name_ar : d.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 tabular-nums">
                      {d.research_count} {t.studies}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CONTACT ============ */}
      <section id="contact" className="scroll-anchor py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 text-white relative overflow-hidden">
        <div className="home-hero-grid absolute inset-0 opacity-40" aria-hidden />
        <div className="relative max-w-7xl mx-auto grid lg:grid-cols-2 gap-12">
          <div>
            <Eyebrow className="text-blue-300 [&>span]:bg-blue-300/40">{t.contactEyebrow}</Eyebrow>
            <h2 className="mt-3 text-3xl md:text-4xl font-bold leading-tight">{t.contactTitle}</h2>
            <p className="mt-3 text-blue-100/85 leading-relaxed max-w-xl">{t.contactSub}</p>

            <div className="mt-8 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center border border-white/20 flex-shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-blue-200/80 text-xs font-semibold uppercase tracking-wider">{t.visitLabel}</p>
                  <p className="text-sm mt-0.5">{t.address}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center border border-white/20 flex-shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-blue-200/80 text-xs font-semibold uppercase tracking-wider">{t.emailLabel}</p>
                  <a href="mailto:research@pmnh.gov.sa" className="text-sm mt-0.5 hover:underline">
                    research@pmnh.gov.sa
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center border border-white/20 flex-shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-blue-200/80 text-xs font-semibold uppercase tracking-wider">{t.phoneLabel}</p>
                  <a href="tel:+966173000000" dir="ltr" className="text-sm mt-0.5 hover:underline">
                    +966 17 300 0000
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="rounded-3xl bg-white text-gray-900 p-8 shadow-2xl border border-white/40">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center ring-1 ring-blue-100">
                  <Lightbulb className="w-5 h-5 text-blue-700" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    {isRtl ? 'هل لديك فكرة بحثية؟' : 'Have a research idea?'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {isRtl ? 'الوحدة جاهزة لدعمك' : 'The Unit can help you move it forward'}
                  </p>
                </div>
              </div>

              <ol className="space-y-3 text-sm">
                {[
                  isRtl ? 'تواصل معنا بفكرتك المبدئية أو سؤالك البحثي.' : 'Reach out with your initial idea or research question.',
                  isRtl ? 'نراجع المنهجية ونقترح التصميم المناسب.' : 'We review methodology and suggest an appropriate design.',
                  isRtl ? 'نساعدك في إعداد ملف لجنة الأخلاقيات.' : 'We help you prepare the IRB / ethics submission.',
                  isRtl ? 'ندعمك خلال جمع البيانات والتحليل والنشر.' : 'We support you through data collection, analysis, and publication.',
                ].map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center tabular-nums">
                      {i + 1}
                    </span>
                    <span className="text-gray-700 leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>

              <Link
                href="/visitor"
                className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-blue-700 hover:text-blue-800 transition-colors group"
              >
                {t.visitorPortalCta}
                <ArrowRight className={cn('w-4 h-4 transition-transform group-hover:translate-x-0.5', isRtl && 'flip-rtl')} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="bg-gray-950 text-gray-300 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/5 ring-1 ring-white/10 flex items-center justify-center">
                <img
                  src="/jazan-health-cluster.jpg"
                  alt="Jazan Health Cluster"
                  className="w-7 h-7 object-contain"
                  onError={(e) => { const t = e.currentTarget; t.onerror = null; t.src = '/hospital-logo.svg' }}
                />
              </div>
              <div className="leading-tight">
                <p className="text-white font-bold text-sm">{t.unitName}</p>
                <p className="text-gray-500 text-xs">{t.hospital}</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-gray-400 leading-relaxed">{t.footerTagline}</p>
          </div>

          <div>
            <p className="text-white text-sm font-bold mb-3">{t.publicPortal}</p>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="/visitor" className="hover:text-white transition-colors">{t.continueAsVisitor}</Link></li>
              <li><a href="#about" className="hover:text-white transition-colors">{t.aboutEyebrow}</a></li>
              <li><a href="#areas" className="hover:text-white transition-colors">{t.areasEyebrow}</a></li>
              <li><a href="#programs" className="hover:text-white transition-colors">{t.programsEyebrow}</a></li>
            </ul>
          </div>

          <div>
            <p className="text-white text-sm font-bold mb-3">{t.staffLogin}</p>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="/login" className="hover:text-white transition-colors">{t.staffLogin}</Link></li>
              <li><Link href="/forgot-password" className="hover:text-white transition-colors">{isRtl ? 'استرجاع كلمة المرور' : 'Forgot password'}</Link></li>
              {isAuthenticated && (
                <li><Link href="/dashboard" className="hover:text-white transition-colors">{t.goToDashboard}</Link></li>
              )}
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-10 pt-6 border-t border-white/10 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} {t.hospital} · {t.rights}
          </p>
          <p className="text-xs text-gray-600">{t.publicNote}</p>
        </div>
      </footer>
    </div>
  )
}

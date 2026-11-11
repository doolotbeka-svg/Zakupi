import React, { useEffect, useMemo, useState } from 'react';
import { Language } from '../types';
import { useAccount } from '../account/AccountContext';
import { AccountModal } from './AccountModal';
import { INITIAL_TENDER_PARAMS } from '../data/defaultTemplates';
import { DEFAULT_DISCOUNT } from '../utils/storage';
import { calculateTender, formatCurrency, formatDiscount, formatPercent } from '../utils/taxCalculator';
import {
  ArrowRight,
  BarChart3,
  Building2,
  Cloud,
  FileSpreadsheet,
  LogIn,
  Mail,
  Printer,
  Target,
  TrendingDown
} from 'lucide-react';

const STORAGE_KEY_LANG = 'kg_tender_calc_lang_v1';

const readLang = (): Language => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_LANG);
    if (saved === 'ru' || saved === 'ky') return saved;
  } catch {
    // ignore
  }
  return 'ky';
};

/** Introduction page shown to signed-out visitors when login is required. */
export const Landing: React.FC = () => {
  const account = useAccount();
  const [lang, setLang] = useState<Language>(readLang);
  const L = (ky: string, ru: string) => (lang === 'ky' ? ky : ru);

  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem(STORAGE_KEY_LANG, lang);
    } catch {
      // ignore
    }
  }, [lang]);

  // A real calculation of the built-in example, so the preview numbers are honest
  const example = useMemo(() => calculateTender(INITIAL_TENDER_PARAMS, DEFAULT_DISCOUNT), []);

  const features = [
    {
      icon: Building2,
      title: L('КР салык режимдери', 'Налоговые режимы КР'),
      text: L(
        'Бирдиктүү салык 0–6%, КНС зачету менен жалпы режим же өзүңүздүн ченем.',
        'Единый налог 0–6%, общий режим с зачётом НДС или своя ставка.'
      )
    },
    {
      icon: TrendingDown,
      title: L('Баа төмөндөтүү симулятору', 'Симулятор снижения цены'),
      text: L(
        'Аукциондогу ар бир пайыз пайдага кандай таасир этээрин дароо көрөсүз.',
        'Сразу видно, как каждый процент снижения на торгах меняет прибыль.'
      )
    },
    {
      icon: Target,
      title: L('Чыгымсыздык чекити', 'Точка безубыточности'),
      text: L(
        'Эң чоң жол берилген төмөндөтүү жана каалаган рентабелдүүлүк үчүн тескери эсеп.',
        'Максимально допустимое снижение и обратный расчёт под желаемую рентабельность.'
      )
    },
    {
      icon: FileSpreadsheet,
      title: L('Спецификация жана Excel', 'Спецификация и Excel'),
      text: L(
        'Товарлардын таблицасы, Excel/CSV импорт жана толук эсепти Excelге экспорттоо.',
        'Таблица товаров, импорт Excel/CSV и выгрузка полного расчёта в Excel.'
      )
    },
    {
      icon: Printer,
      title: L('Отчёт жана шилтеме', 'Отчёт и ссылка'),
      text: L(
        'Басып чыгаруу же PDF үчүн рентабелдүүлүк картасы, кесиптешке шилтеме.',
        'Карта рентабельности для печати или PDF, ссылка на расчёт для коллеги.'
      )
    },
    {
      icon: Cloud,
      title: L('Сакталган эсептөөлөр', 'Сохранённые расчёты'),
      text: L(
        'Бир нече тендерди аккаунтта сактаңыз — бардык түзмөктөрдөн жеткиликтүү.',
        'Храните несколько тендеров в аккаунте — доступны на всех устройствах.'
      )
    }
  ];

  const steps = [
    { title: L('Email менен кириңиз', 'Войдите по email'), text: L('Бир жолку код келет, сырсөз керек эмес.', 'Придёт одноразовый код, пароль не нужен.') },
    { title: L('Тендердин маалыматтарын киргизиңиз', 'Введите данные тендера'), text: L('Сумма, салык режими, чыгашалар жана товарлар.', 'Сумма, налоговый режим, расходы и товары.') },
    { title: L('Жыйынтыкты алыңыз', 'Получите результат'), text: L('Таза пайда, салыктар жана төмөндөтүүнүн чеги.', 'Чистая прибыль, налоги и предел снижения цены.') }
  ];

  const openLogin = () => account.openAccount();

  const LoginButton: React.FC<{ large?: boolean }> = ({ large }) => (
    <button
      type="button"
      onClick={openLogin}
      className={`inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-sm ring-1 ring-emerald-400/40 transition-colors cursor-pointer ${
        large ? 'px-6 py-3 text-base' : 'px-3 py-1.5 text-xs'
      }`}
    >
      {large ? <Mail className="w-4 h-4" /> : <LogIn className="w-3.5 h-3.5" />}
      {large ? L('Email менен кирүү', 'Войти по email') : L('Кирүү', 'Войти')}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col">
      <header className="bg-slate-900 text-white border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 shrink-0 rounded-md bg-emerald-600 flex items-center justify-center font-bold text-white text-sm font-mono ring-1 ring-emerald-400/30">
              KG
            </div>
            <span className="font-bold tracking-tight truncate max-[400px]:hidden">
              {L('Тендер калькулятору', 'Калькулятор тендеров')}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center bg-emerald-950/80 p-0.5 rounded-md border border-emerald-600/40 text-xs font-semibold">
              {(['ky', 'ru'] as const).map(code => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLang(code)}
                  aria-label={code === 'ky' ? 'Кыргызча' : 'Русский'}
                  className={`px-2.5 py-1 rounded cursor-pointer transition-all ${
                    lang === code ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-emerald-300 hover:text-white'
                  }`}
                >
                  {code === 'ky' ? 'КЫР' : 'РУС'}
                </button>
              ))}
            </div>
            <LoginButton />
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-16 grid gap-10 lg:grid-cols-2 lg:items-center">
          <div className="space-y-5">
            <span className="inline-block text-xs font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded">
              {L('Мамлекеттик сатып алуулар · Кыргызстан', 'Госзакупки · Кыргызстан')}
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight text-slate-900">
              {L('Тендерге катышуудан мурун пайдасын эсептеңиз', 'Рассчитайте выгоду тендера до подачи заявки')}
            </h1>
            <p className="text-base text-slate-600 leading-relaxed">
              {L(
                'Кыргызстандын мамлекеттик сатып алуулары үчүн рентабелдүүлүк калькулятору: салыктар, чыгашалар, чыгымсыздык чекити жана тоорукта бааны канчага чейин төмөндөтсө болот.',
                'Калькулятор рентабельности для государственных закупок Кыргызстана: налоги, расходы, точка безубыточности и до какой цены можно снижаться на торгах.'
              )}
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <LoginButton large />
              <span className="text-xs text-slate-500">
                {L('Каттоо бир мүнөт: email жана каттагы код.', 'Регистрация за минуту: email и код из письма.')}
              </span>
            </div>
          </div>

          {/* Example result */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 sm:p-5 space-y-4" aria-label={L('Эсептин мисалы', 'Пример расчёта')}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-slate-500" />
                {L('Эсептин мисалы', 'Пример расчёта')}
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                −{formatDiscount(example.discountPercent)}% {L('тоорукта', 'на торгах')}
              </span>
            </div>
            <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-3">
              <div className="p-3 rounded-md bg-slate-50 border border-slate-200">
                <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">{L('Келишимдин баасы', 'Цена контракта')}</div>
                <div className="mt-1 font-mono font-bold text-slate-900 tabular-nums">{formatCurrency(example.finalContractPrice)}</div>
              </div>
              <div className="p-3 rounded-md bg-slate-50 border border-slate-200">
                <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">{L('Чыгымдар', 'Расходы')}</div>
                <div className="mt-1 font-mono font-bold text-slate-900 tabular-nums">{formatCurrency(example.totalExpenses)}</div>
              </div>
              <div className="p-3 rounded-md bg-slate-50 border border-slate-200">
                <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">{L('Салыктар', 'Налоги')}</div>
                <div className="mt-1 font-mono font-bold text-slate-900 tabular-nums">{formatCurrency(example.taxes.totalTax)}</div>
              </div>
              <div className="p-3 rounded-md bg-emerald-50 border border-emerald-300">
                <div className="text-[11px] uppercase tracking-wider text-emerald-800 font-semibold">{L('Таза пайда', 'Чистая прибыль')}</div>
                <div className="mt-1 font-mono font-bold text-emerald-700 tabular-nums">{formatCurrency(example.netProfit)}</div>
                <div className="text-[11px] font-mono text-emerald-700">{formatPercent(example.profitabilityPercent)}</div>
              </div>
            </div>
            <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-950 text-xs flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5">
                <Target className="w-4 h-4 text-amber-600 shrink-0" />
                {L('Чыгымсыздык чекити', 'Точка безубыточности')}
              </span>
              <strong className="font-mono">{formatDiscount(example.breakEvenDiscount)}%</strong>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="bg-white border-y border-slate-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              {L('Калькулятор эмнелерди жасай алат', 'Что умеет калькулятор')}
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map(({ icon: Icon, title, text }) => (
                <div key={title} className="p-4 rounded-lg border border-slate-200 bg-slate-50/60">
                  <Icon className="w-5 h-5 text-emerald-600" />
                  <h3 className="mt-2 font-semibold text-slate-900">{title}</h3>
                  <p className="mt-1 text-sm text-slate-600 leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">{L('Кантип башташ керек', 'Как начать')}</h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => (
              <li key={step.title} className="p-4 rounded-lg bg-white border border-slate-200 flex gap-3">
                <span className="w-7 h-7 shrink-0 rounded bg-slate-900 text-white font-bold text-sm flex items-center justify-center">
                  {index + 1}
                </span>
                <div>
                  <h3 className="font-semibold text-slate-900">{step.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={openLogin}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm cursor-pointer"
            >
              {L('Калькуляторду ачуу', 'Открыть калькулятор')}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>
      </main>

      <footer className="bg-slate-900 text-slate-400 text-xs py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-center">
          <span className="font-bold text-white">{L('Тендер калькулятору', 'Калькулятор тендеров')}</span>
          <span>{L('Кыргыз Республикасынын Салык кодекси', 'Налоговый кодекс Кыргызской Республики')}</span>
          <a href="https://zakupki.okmot.kg" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">
            zakupki.okmot.kg
          </a>
        </div>
      </footer>

      <AccountModal lang={lang} />
    </div>
  );
};

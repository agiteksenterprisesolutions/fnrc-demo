// The eleven languages the assistant speaks, plus auto-detect.
//
// Self-contained on purpose: this site and its widget share no code with the
// Xposer app, so neither can break the other.
//
// The code travels on the LiveKit token as a participant attribute and is read
// once, at join — it builds the recogniser, picks the pre-written spoken
// welcome, and locks the assistant's replies. It cannot be changed mid-call.
export const LANGUAGES = [
  { code: 'ar', native: 'العربية', english: 'Arabic', rtl: true },
  { code: 'en', native: 'English', english: 'English' },
  { code: 'ur', native: 'اردو', english: 'Urdu', rtl: true },
  { code: 'hi', native: 'हिन्दी', english: 'Hindi' },
  { code: 'es', native: 'Español', english: 'Spanish' },
  { code: 'fr', native: 'Français', english: 'French' },
  { code: 'de', native: 'Deutsch', english: 'German' },
  { code: 'pt', native: 'Português', english: 'Portuguese' },
  { code: 'tr', native: 'Türkçe', english: 'Turkish' },
  { code: 'ru', native: 'Русский', english: 'Russian' },
  { code: 'zh', native: '中文', english: 'Chinese' },
  { code: 'auto', native: 'Detect automatically', english: 'Detect automatically' },
];

const BY_CODE = new Map(LANGUAGES.map((entry) => [entry.code, entry]));

export const getLanguage = (code) => BY_CODE.get(code) || null;
export const getLanguageName = (code) => getLanguage(code)?.native || code || '';
export const isRtlLanguage = (code) => Boolean(getLanguage(code)?.rtl);

/**
 * The reply-mode question, translated.
 *
 * It is asked after the language has been chosen but before the room opens,
 * so nothing has been translated for the caller yet — the assistant is not
 * running. Asking in English immediately after someone chose Arabic undoes
 * the point of the picker.
 */
const MODE_COPY = {
  en: {
    greeting: ['Hello!', 'I am the FNRC assistant.'],
    languageQuestion: 'Which language should we talk in?',
    question: 'And how should I reply?',
    speak: 'Speak out loud',
    text: 'Reply in text',
    hint: 'You can switch at any point during the call, and you can talk either way.',
    changeLanguage: 'Change language',
  },
  ar: {
    greeting: ['مرحباً بك!', 'أنا مساعد مؤسسة الفجيرة للموارد الطبيعية.'],
    languageQuestion: 'بأي لغة تود التحدث؟',
    question: 'وكيف تريد أن أرد؟',
    speak: 'الرد بصوت مسموع',
    text: 'الرد بالكتابة',
    hint: 'يمكنك التبديل في أي وقت أثناء المحادثة، ويمكنك التحدث في الحالتين.',
    changeLanguage: 'تغيير اللغة',
  },
  ur: {
    greeting: ['خوش آمدید!', 'میں ایف این آر سی کا معاون ہوں۔'],
    languageQuestion: 'ہم کس زبان میں بات کریں؟',
    question: 'اور میں کس طرح جواب دوں؟',
    speak: 'آواز میں جواب دیں',
    text: 'لکھ کر جواب دیں',
    hint: 'آپ گفتگو کے دوران کسی بھی وقت تبدیل کر سکتے ہیں، اور دونوں صورتوں میں بول سکتے ہیں۔',
    changeLanguage: 'زبان تبدیل کریں',
  },
  hi: {
    greeting: ['नमस्ते!', 'मैं FNRC सहायक हूँ।'],
    languageQuestion: 'हम किस भाषा में बात करें?',
    question: 'और मैं किस तरह जवाब दूँ?',
    speak: 'बोलकर जवाब दें',
    text: 'लिखकर जवाब दें',
    hint: 'आप बातचीत के दौरान कभी भी बदल सकते हैं, और दोनों ही स्थितियों में बोल सकते हैं।',
    changeLanguage: 'भाषा बदलें',
  },
  es: {
    greeting: ['¡Hola!', 'Soy el asistente de FNRC.'],
    languageQuestion: '¿En qué idioma hablamos?',
    question: '¿Y cómo quieres que responda?',
    speak: 'Responder en voz alta',
    text: 'Responder por escrito',
    hint: 'Puedes cambiar en cualquier momento y podrás hablar de las dos formas.',
    changeLanguage: 'Cambiar idioma',
  },
  fr: {
    greeting: ['Bonjour !', 'Je suis l’assistant FNRC.'],
    languageQuestion: 'Dans quelle langue parlons-nous ?',
    question: 'Et comment dois-je répondre ?',
    speak: 'Répondre à voix haute',
    text: 'Répondre par écrit',
    hint: 'Vous pouvez changer à tout moment, et vous pouvez parler dans les deux cas.',
    changeLanguage: 'Changer de langue',
  },
  de: {
    greeting: ['Hallo!', 'Ich bin der FNRC-Assistent.'],
    languageQuestion: 'In welcher Sprache sprechen wir?',
    question: 'Und wie soll ich antworten?',
    speak: 'Gesprochen antworten',
    text: 'Schriftlich antworten',
    hint: 'Sie können jederzeit wechseln und in beiden Fällen sprechen.',
    changeLanguage: 'Sprache ändern',
  },
  pt: {
    greeting: ['Olá!', 'Sou o assistente da FNRC.'],
    languageQuestion: 'Em que idioma vamos falar?',
    question: 'E como devo responder?',
    speak: 'Responder em voz alta',
    text: 'Responder por escrito',
    hint: 'Pode mudar a qualquer momento e pode falar nos dois casos.',
    changeLanguage: 'Mudar de idioma',
  },
  tr: {
    greeting: ['Merhaba!', 'Ben FNRC asistanıyım.'],
    languageQuestion: 'Hangi dilde konuşalım?',
    question: 'Peki nasıl yanıt vereyim?',
    speak: 'Sesli yanıtla',
    text: 'Yazılı yanıtla',
    hint: 'İstediğiniz zaman değiştirebilirsiniz; her iki durumda da konuşabilirsiniz.',
    changeLanguage: 'Dili değiştir',
  },
  ru: {
    greeting: ['Здравствуйте!', 'Я ассистент FNRC.'],
    languageQuestion: 'На каком языке будем говорить?',
    question: 'И как мне отвечать?',
    speak: 'Отвечать голосом',
    text: 'Отвечать текстом',
    hint: 'Вы можете переключиться в любой момент и говорить можно в обоих случаях.',
    changeLanguage: 'Изменить язык',
  },
  zh: {
    greeting: ['您好！', '我是 FNRC 助理。'],
    languageQuestion: '我们用哪种语言交流？',
    question: '我该怎么回复你？',
    speak: '语音回复',
    text: '文字回复',
    hint: '通话中可随时切换，两种方式都可以说话。',
    changeLanguage: '更换语言',
  },
};

/** Copy in the chosen language; auto-detect has none of its own yet. */
export const getCopy = (code) => MODE_COPY[code] || MODE_COPY.en;

export type LanguageCode = 'bn' | 'en' | 'hi' | 'ar'

export interface Translations {
  // Sidebar
  dashboard: string
  getNumber: string
  console: string
  summary: string
  accessList: string
  senderRange: string
  dialerPanel: string
  tweaks: string
  developer: string
  seeApiDocs: string
  view: string

  // Dashboard
  welcomeBack: string
  hereIsWhatsHappening: string
  todayRevenue: string
  earningsFromOTPs: string
  todayOTPs: string
  totalSuccessfulVerifications: string
  yesterdayRevenue: string
  previousDayPerformance: string
  yesterdayOTPs: string
  completedVerifications: string
  hourlyTraffic: string
  otpRequestsPerHour: string
  live: string
  globalTrending: string
  topServicesByOTPVolume: string
  yourTopPerformers: string
  bestServicesByRevenue: string
  noActivityRecorded: string
  service: string
  volume: string
  earnings: string

  // Announcement Banner
  announcementTitle: string
  announcementPending: string
  joinTelegram: string

  // Support Panel
  liveSupport: string
  weAreOnline: string
  supportWelcomeMessage: string
  problemDescription: string
  writeYourMessage: string
  uploadedFiles: string
  filesAndImages: string
  sendMessage: string

  // Tweaks Panel
  theme: string
  dark: string
  light: string
  accentColor: string
  density: string
  comfortable: string
  compact: string
  sidebar: string
  expanded: string
  collapsed: string
  privacy: string
  showNumbers: string
  hideNumbers: string
  replacesEveryDigit: string
  language: string
  bengali: string
  english: string
  hindi: string
  arabic: string

  // Buttons & Actions
  close: string
  send: string
  upload: string
  yes: string
  no: string
  cancel: string
  save: string
  delete: string
  edit: string
  add: string

  // Common
  loading: string
  error: string
  success: string
  warning: string
  info: string
}

export const translations: Record<LanguageCode, Translations> = {
  bn: {
    // Sidebar
    dashboard: 'ড্যাশবোর্ড',
    getNumber: 'নম্বর পান',
    console: 'কনসোল',
    summary: 'সারসংক্ষেপ',
    accessList: 'অ্যাক্সেস লিস্ট',
    senderRange: 'সেন্ডার / রেঞ্জ',
    dialerPanel: 'ডায়ালার প্যানেল',
    tweaks: 'টুইকস',
    developer: 'ডেভেলপার',
    seeApiDocs: 'API ডকুমেন্টেশন দেখুন',
    view: 'দেখুন',

    // Dashboard
    welcomeBack: 'আবার স্বাগতম',
    hereIsWhatsHappening: 'আজ আপনার অ্যাকাউন্টে কী ঘটছে তা এখানে।',
    todayRevenue: 'আজ আয়',
    earningsFromOTPs: 'সফল OTP থেকে আয়',
    todayOTPs: 'আজ OTP',
    totalSuccessfulVerifications: 'মোট সফল যাচাইকরণ',
    yesterdayRevenue: 'গতকাল আয়',
    previousDayPerformance: 'আগের দিনের পারফরম্যান্স',
    yesterdayOTPs: 'গতকাল OTP',
    completedVerifications: 'সম্পন্ন যাচাইকরণ',
    hourlyTraffic: 'প্রতি ঘণ্টায় ট্রাফিক',
    otpRequestsPerHour: 'প্রতি ঘণ্টায় OTP অনুরোধ (আজ)',
    live: 'লাইভ',
    globalTrending: 'বৈশ্বিক ট্রেন্ডিং',
    topServicesByOTPVolume: 'OTP ভলিউম দ্বারা শীর্ষ সেবা',
    yourTopPerformers: 'আপনার শীর্ষ পারফর্মার',
    bestServicesByRevenue: 'এই সপ্তাহে রাজস্ব দ্বারা সেরা সেবা',
    noActivityRecorded: 'কোন কার্যকলাপ রেকর্ড করা হয়নি',
    service: 'সেবা',
    volume: 'ভলিউম',
    earnings: 'আয়',

    // Announcement Banner
    announcementTitle: 'Welcome to BITTXSMS! New High Access Panel with real time OTPs. Contact your old Team Leader & start earning again.',
    announcementPending: 'If you have pending payments, you will receive them within 24 hours insha\'Allah. ❤️',
    joinTelegram: 'Join our Telegram channel for updates: @bittxsmssupport',

    // Support Panel
    liveSupport: 'লাইভ সাপোর্ট',
    weAreOnline: 'আমরা অনলাইন আছি',
    supportWelcomeMessage: 'আসসালামু আলাইকুম! 👋 আমরা এখানে আপনাকে সাহায্য করতে প্রস্তুত। আপনার সমস্যা বা প্রশ্ন বলুন।',
    problemDescription: 'সমস্যা বর্ণনা',
    writeYourMessage: 'আপনার বার্তা লিখুন...',
    uploadedFiles: 'আপলোড করা ফাইল',
    filesAndImages: 'ছবি ও ফাইল আপলোড করতে পারেন',
    sendMessage: 'বার্তা পাঠান',

    // Tweaks Panel
    theme: 'থিম',
    dark: 'ডার্ক',
    light: 'লাইট',
    accentColor: 'অ্যাক্সেন্ট রঙ',
    density: 'ঘনত্ব',
    comfortable: 'আরামদায়ক',
    compact: 'সংক্ষিপ্ত',
    sidebar: 'সাইডবার',
    expanded: 'সম্প্রসারিত',
    collapsed: 'সংকুচিত',
    privacy: 'গোপনীয়তা',
    showNumbers: 'সংখ্যা দেখান',
    hideNumbers: 'সংখ্যা লুকান',
    replacesEveryDigit: 'প্রতিটি অঙ্ক স্বয়ংক্রিয়ভাবে • দিয়ে প্রতিস্থাপন করে। no-mask ক্লাস যোগ করুন যে কোন উপাদানে যা আপনি লুকাতে চান না।',
    language: 'ভাষা',
    bengali: 'বাংলা',
    english: 'English',
    hindi: 'हिन्दी',
    arabic: 'العربية',

    // Buttons & Actions
    close: 'বন্ধ করুন',
    send: 'পাঠান',
    upload: 'আপলোড করুন',
    yes: 'হ্যাঁ',
    no: 'না',
    cancel: 'বাতিল করুন',
    save: 'সংরক্ষণ করুন',
    delete: 'মুছুন',
    edit: 'সম্পাদনা করুন',
    add: 'যোগ করুন',

    // Common
    loading: 'লোড হচ্ছে...',
    error: 'ত্রুটি',
    success: 'সফল',
    warning: 'সতর্কতা',
    info: 'তথ্য',
  },

  en: {
    // Sidebar
    dashboard: 'Dashboard',
    getNumber: 'Get Number',
    console: 'Console',
    summary: 'Summary',
    accessList: 'Access List',
    senderRange: 'Sender / Range',
    dialerPanel: 'Dialer Panel',
    tweaks: 'Tweaks',
    developer: 'Developer',
    seeApiDocs: 'See the API documentation',
    view: 'View',

    // Dashboard
    welcomeBack: 'Welcome back',
    hereIsWhatsHappening: "Here's what's happening with your account today.",
    todayRevenue: 'Today Revenue',
    earningsFromOTPs: 'Earnings from successful OTPs',
    todayOTPs: 'Today OTPs',
    totalSuccessfulVerifications: 'Total successful verifications',
    yesterdayRevenue: 'Yesterday Revenue',
    previousDayPerformance: 'Previous day performance',
    yesterdayOTPs: 'Yesterday OTPs',
    completedVerifications: 'Completed verifications',
    hourlyTraffic: 'Hourly Traffic',
    otpRequestsPerHour: 'OTP requests per hour (today)',
    live: 'Live',
    globalTrending: 'Global Trending',
    topServicesByOTPVolume: 'Top services by OTP volume',
    yourTopPerformers: 'Your Top Performers',
    bestServicesByRevenue: 'Best services by revenue this week',
    noActivityRecorded: 'No activity recorded today',
    service: 'SERVICE',
    volume: 'VOLUME',
    earnings: 'EARNINGS',

    // Announcement Banner
    announcementTitle: 'Welcome to BITTXSMS! New High Access Panel with real time OTPs. Contact your old Team Leader & start earning again.',
    announcementPending: 'If you have pending payments, you will receive them within 24 hours insha\'Allah. ❤️',
    joinTelegram: 'Join our Telegram channel for updates: @bittxsmssupport',

    // Support Panel
    liveSupport: 'Live Support',
    weAreOnline: 'We are online',
    supportWelcomeMessage: 'Assalamu alaikum! 👋 We are here to help you. Please describe your issue or question.',
    problemDescription: 'Problem Description',
    writeYourMessage: 'Write your message...',
    uploadedFiles: 'Uploaded Files',
    filesAndImages: 'You can upload images & files',
    sendMessage: 'Send Message',

    // Tweaks Panel
    theme: 'Theme',
    dark: 'Dark',
    light: 'Light',
    accentColor: 'Accent Color',
    density: 'Density',
    comfortable: 'Comfortable',
    compact: 'Compact',
    sidebar: 'Sidebar',
    expanded: 'Expanded',
    collapsed: 'Collapsed',
    privacy: 'Privacy',
    showNumbers: 'Show numbers',
    hideNumbers: 'Hide numbers',
    replacesEveryDigit: 'Replaces every digit on the page with • automatically. Add the no-mask class to any element you never want masked.',
    language: 'Language',
    bengali: 'বাংলা',
    english: 'English',
    hindi: 'हिन्दी',
    arabic: 'العربية',

    // Buttons & Actions
    close: 'Close',
    send: 'Send',
    upload: 'Upload',
    yes: 'Yes',
    no: 'No',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',

    // Common
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    warning: 'Warning',
    info: 'Info',
  },

  hi: {
    // Sidebar
    dashboard: 'डैशबोर्ड',
    getNumber: 'नंबर प्राप्त करें',
    console: 'कंसोल',
    summary: 'सारांश',
    accessList: 'एक्सेस सूची',
    senderRange: 'प्रेषक / रेंज',
    dialerPanel: 'डायलर पैनल',
    tweaks: 'ट्वीक्स',
    developer: 'डेवलपर',
    seeApiDocs: 'API दस्तावेज़ देखें',
    view: 'देखें',

    // Dashboard
    welcomeBack: 'स्वागत है',
    hereIsWhatsHappening: 'आपके खाते के साथ आज क्या हो रहा है।',
    todayRevenue: 'आज की आय',
    earningsFromOTPs: 'सफल OTP से आय',
    todayOTPs: 'आज के OTP',
    totalSuccessfulVerifications: 'कुल सफल सत्यापन',
    yesterdayRevenue: 'कल की आय',
    previousDayPerformance: 'पिछले दिन का प्रदर्शन',
    yesterdayOTPs: 'कल के OTP',
    completedVerifications: 'पूर्ण सत्यापन',
    hourlyTraffic: 'प्रति घंटे ट्रैफिक',
    otpRequestsPerHour: 'प्रति घंटे OTP अनुरोध (आज)',
    live: 'लाइव',
    globalTrending: 'वैश्विक ट्रेंडिंग',
    topServicesByOTPVolume: 'OTP वॉल्यूम के अनुसार शीर्ष सेवाएं',
    yourTopPerformers: 'आपके शीर्ष प्रदर्शक',
    bestServicesByRevenue: 'इस सप्ताह राजस्व के अनुसार सर्वश्रेष्ठ सेवाएं',
    noActivityRecorded: 'कोई गतिविधि दर्ज नहीं की गई',
    service: 'सेवा',
    volume: 'मात्रा',
    earnings: 'आय',

    // Announcement Banner
    announcementTitle: 'Welcome to BITTXSMS! New High Access Panel with real time OTPs. Contact your old Team Leader & start earning again.',
    announcementPending: 'If you have pending payments, you will receive them within 24 hours insha\'Allah. ❤️',
    joinTelegram: 'Join our Telegram channel for updates: @bittxsmssupport',

    // Support Panel
    liveSupport: 'लाइव सपोर्ट',
    weAreOnline: 'हम ऑनलाइन हैं',
    supportWelcomeMessage: 'अस्सलामु अलैकुम! 👋 हम आपकी मदद के लिए यहां हैं। कृपया अपनी समस्या या प्रश्न बताएं।',
    problemDescription: 'समस्या विवरण',
    writeYourMessage: 'अपना संदेश लिखें...',
    uploadedFiles: 'अपलोड की गई फाइलें',
    filesAndImages: 'आप छवियों और फाइलों को अपलोड कर सकते हैं',
    sendMessage: 'संदेश भेजें',

    // Tweaks Panel
    theme: 'थीम',
    dark: 'डार्क',
    light: 'लाइट',
    accentColor: 'एक्सेंट कलर',
    density: 'घनत्व',
    comfortable: 'आरामदायक',
    compact: 'कॉम्पैक्ट',
    sidebar: 'साइडबार',
    expanded: 'विस्तारित',
    collapsed: 'संक्षिप्त',
    privacy: 'गोपनीयता',
    showNumbers: 'नंबर दिखाएं',
    hideNumbers: 'नंबर छुपाएं',
    replacesEveryDigit: 'पृष्ठ पर प्रत्येक अंक को स्वचालित रूप से • से बदल देता है। किसी भी तत्व में no-mask वर्ग जोड़ें जिसे आप मुखौटा नहीं करना चाहते।',
    language: 'भाषा',
    bengali: 'বাংলা',
    english: 'English',
    hindi: 'हिन्दी',
    arabic: 'العربية',

    // Buttons & Actions
    close: 'बंद करें',
    send: 'भेजें',
    upload: 'अपलोड करें',
    yes: 'हां',
    no: 'नहीं',
    cancel: 'रद्द करें',
    save: 'सहेजें',
    delete: 'हटाएं',
    edit: 'संपादित करें',
    add: 'जोड़ें',

    // Common
    loading: 'लोड हो रहा है...',
    error: 'त्रुटि',
    success: 'सफलता',
    warning: 'चेतावनी',
    info: 'जानकारी',
  },

  ar: {
    // Sidebar
    dashboard: 'لوحة التحكم',
    getNumber: 'احصل على رقم',
    console: 'وحدة التحكم',
    summary: 'ملخص',
    accessList: 'قائمة الوصول',
    senderRange: 'المُرسل / النطاق',
    dialerPanel: 'لوحة الطلب',
    tweaks: 'التعديلات',
    developer: 'المطور',
    seeApiDocs: 'انظر وثائق API',
    view: 'عرض',

    // Dashboard
    welcomeBack: 'مرحبا بعودتك',
    hereIsWhatsHappening: 'إليك ما يحدث مع حسابك اليوم.',
    todayRevenue: 'إيرادات اليوم',
    earningsFromOTPs: 'الأرباح من OTP الناجح',
    todayOTPs: 'OTP اليوم',
    totalSuccessfulVerifications: 'إجمالي التحقق الناجح',
    yesterdayRevenue: 'إيرادات الأمس',
    previousDayPerformance: 'أداء اليوم السابق',
    yesterdayOTPs: 'OTP الأمس',
    completedVerifications: 'التحقق المكتمل',
    hourlyTraffic: 'حركة المرور كل ساعة',
    otpRequestsPerHour: 'طلبات OTP في الساعة (اليوم)',
    live: 'مباشر',
    globalTrending: 'المتجهات العالمية',
    topServicesByOTPVolume: 'أفضل الخدمات حسب حجم OTP',
    yourTopPerformers: 'أفضل المؤديين لديك',
    bestServicesByRevenue: 'أفضل الخدمات حسب الإيرادات هذا الأسبوع',
    noActivityRecorded: 'لم يتم تسجيل أي نشاط',
    service: 'الخدمة',
    volume: 'الحجم',
    earnings: 'الأرباح',

    // Announcement Banner
    announcementTitle: 'Welcome to BITTXSMS! New High Access Panel with real time OTPs. Contact your old Team Leader & start earning again.',
    announcementPending: 'إذا كان لديك دفعات معلقة، فستتلقاها في غضون 24 ساعة بإذن الله. ❤️',
    joinTelegram: 'انضم إلى قناتنا على تليجرام للتحديثات: @bittxsmssupport',

    // Support Panel
    liveSupport: 'الدعم المباشر',
    weAreOnline: 'نحن متصلون بالإنترنت',
    supportWelcomeMessage: 'السلام عليكم ورحمة الله وبركاته! 👋 نحن هنا لمساعدتك. يرجى وصف مشكلتك أو سؤالك.',
    problemDescription: 'وصف المشكلة',
    writeYourMessage: 'اكتب رسالتك...',
    uploadedFiles: 'الملفات المرفوعة',
    filesAndImages: 'يمكنك تحميل الصور والملفات',
    sendMessage: 'إرسال الرسالة',

    // Tweaks Panel
    theme: 'المظهر',
    dark: 'مظلم',
    light: 'فاتح',
    accentColor: 'لون التركيز',
    density: 'الكثافة',
    comfortable: 'مريح',
    compact: 'مضغوط',
    sidebar: 'الشريط الجانبي',
    expanded: 'موسع',
    collapsed: 'مطوي',
    privacy: 'الخصوصية',
    showNumbers: 'إظهار الأرقام',
    hideNumbers: 'إخفاء الأرقام',
    replacesEveryDigit: 'يستبدل كل رقم على الصفحة بـ • تلقائيًا. أضف فئة no-mask إلى أي عنصر لا تريد إخفاءه.',
    language: 'اللغة',
    bengali: 'বাংলা',
    english: 'English',
    hindi: 'हिन्दी',
    arabic: 'العربية',

    // Buttons & Actions
    close: 'إغلاق',
    send: 'إرسال',
    upload: 'تحميل',
    yes: 'نعم',
    no: 'لا',
    cancel: 'إلغاء',
    save: 'حفظ',
    delete: 'حذف',
    edit: 'تعديل',
    add: 'إضافة',

    // Common
    loading: 'جاري التحميل...',
    error: 'خطأ',
    success: 'نجح',
    warning: 'تحذير',
    info: 'معلومات',
  },
}

export const getTranslation = (lang: LanguageCode): Translations => {
  return translations[lang] || translations.en
}

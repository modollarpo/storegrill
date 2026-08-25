export type Locale = 'en' | 'de' | 'fr' | 'es' | 'it' | 'nl' | 'pl' | 'pt' | 'ja' | 'ar';

export const LOCALES: Locale[] = ['en', 'de', 'fr', 'es', 'it', 'nl', 'pl', 'pt', 'ja', 'ar'];

type Dict = Record<string, string>;

const en: Dict = {
  deliverTo: 'Deliver to', hello: 'Hello', signIn: 'Sign In', account: 'Account',
  returns: 'Returns', orders: '& Orders', cart: 'Cart', all: 'All',
  todaysDeals: "Today's Deals", vendors: 'Vendors', bestSellers: 'Best Sellers',
  newReleases: 'New Arrivals', customerService: 'Customer Service',
  searchPlaceholder: 'Search Storegrill', addToCart: 'Add to Cart', buyNow: 'Buy Now',
  inStock: 'In Stock', outOfStock: 'Currently unavailable',
  subtotal: 'Subtotal', proceedCheckout: 'Proceed to Checkout', continueShopping: 'Continue Shopping',
  emptyCartTitle: 'Your Storegrill Cart is empty',
  backToTop: 'Back to top', freeDelivery: 'FREE delivery', soldBy: 'Sold by',
  changeRegion: 'Change region', language: 'Language', currency: 'Currency',
  signInButton: 'Sign in securely', createAccount: 'Create account',
  noResults: 'No results found', clearFilters: 'Clear all filters', sortBy: 'Sort by',
  shopNow: 'Shop now', viewAll: 'View all', seeAllDeals: 'See all deals',
  recentlyViewed: 'Recently viewed', featuredVendors: 'Featured Vendors',
  becomeVendor: 'Become a Vendor',
};

const de: Dict = {
  deliverTo: 'Liefern nach', hello: 'Hallo', signIn: 'Anmelden', account: 'Konto',
  returns: 'Rückgaben', orders: '& Bestellungen', cart: 'Warenkorb', all: 'Alle',
  todaysDeals: 'Angebote des Tages', vendors: 'Händler', bestSellers: 'Bestseller',
  newReleases: 'Neuheiten', customerService: 'Kundenservice',
  searchPlaceholder: 'Storegrill durchsuchen', addToCart: 'In den Warenkorb', buyNow: 'Jetzt kaufen',
  inStock: 'Auf Lager', outOfStock: 'Derzeit nicht verfügbar',
  subtotal: 'Zwischensumme', proceedCheckout: 'Zur Kasse gehen', continueShopping: 'Weiter einkaufen',
  emptyCartTitle: 'Ihr Storegrill-Warenkorb ist leer',
  backToTop: 'Zum Seitenanfang', freeDelivery: 'GRATIS-Lieferung', soldBy: 'Verkauft von',
  changeRegion: 'Region ändern', language: 'Sprache', currency: 'Währung',
  signInButton: 'Sicher anmelden', createAccount: 'Konto erstellen',
  noResults: 'Keine Ergebnisse gefunden', clearFilters: 'Filter löschen', sortBy: 'Sortieren nach',
  shopNow: 'Jetzt einkaufen', viewAll: 'Alle ansehen', seeAllDeals: 'Alle Angebote',
  recentlyViewed: 'Kürzlich angesehen', featuredVendors: 'Ausgewählte Händler',
  becomeVendor: 'Verkäufer werden',
};

const fr: Dict = {
  deliverTo: 'Livrer à', hello: 'Bonjour', signIn: 'Se connecter', account: 'Compte',
  returns: 'Retours', orders: '& Commandes', cart: 'Panier', all: 'Tout',
  todaysDeals: 'Offres du jour', vendors: 'Vendeurs', bestSellers: 'Meilleures ventes',
  newReleases: 'Nouveautés', customerService: 'Service client',
  searchPlaceholder: 'Rechercher sur Storegrill', addToCart: 'Ajouter au panier', buyNow: 'Acheter maintenant',
  inStock: 'En stock', outOfStock: 'Actuellement indisponible',
  subtotal: 'Sous-total', proceedCheckout: 'Passer la commande', continueShopping: 'Continuer les achats',
  emptyCartTitle: 'Votre panier Storegrill est vide',
  backToTop: 'Haut de page', freeDelivery: 'Livraison GRATUITE', soldBy: 'Vendu par',
  changeRegion: 'Changer de région', language: 'Langue', currency: 'Devise',
  signInButton: 'Connexion sécurisée', createAccount: 'Créer un compte',
  noResults: 'Aucun résultat trouvé', clearFilters: 'Effacer les filtres', sortBy: 'Trier par',
  shopNow: 'Acheter maintenant', viewAll: 'Tout voir', seeAllDeals: 'Toutes les offres',
  recentlyViewed: 'Vus récemment', featuredVendors: 'Vendeurs en vedette',
  becomeVendor: 'Devenir vendeur',
};

const es: Dict = {
  deliverTo: 'Enviar a', hello: 'Hola', signIn: 'Iniciar sesión', account: 'Cuenta',
  returns: 'Devoluciones', orders: '& Pedidos', cart: 'Cesta', all: 'Todo',
  todaysDeals: 'Ofertas del día', vendors: 'Vendedores', bestSellers: 'Más vendidos',
  newReleases: 'Novedades', customerService: 'Atención al cliente',
  searchPlaceholder: 'Buscar en Storegrill', addToCart: 'Añadir a la cesta', buyNow: 'Comprar ahora',
  inStock: 'En stock', outOfStock: 'No disponible actualmente',
  subtotal: 'Subtotal', proceedCheckout: 'Tramitar pedido', continueShopping: 'Seguir comprando',
  emptyCartTitle: 'Tu cesta de Storegrill está vacía',
  backToTop: 'Volver arriba', freeDelivery: 'Envío GRATIS', soldBy: 'Vendido por',
  changeRegion: 'Cambiar región', language: 'Idioma', currency: 'Moneda',
  signInButton: 'Iniciar sesión de forma segura', createAccount: 'Crear cuenta',
  noResults: 'Sin resultados', clearFilters: 'Borrar filtros', sortBy: 'Ordenar por',
  shopNow: 'Comprar ahora', viewAll: 'Ver todo', seeAllDeals: 'Ver todas las ofertas',
  recentlyViewed: 'Vistos recientemente', featuredVendors: 'Vendedores destacados',
  becomeVendor: 'Vender en Storegrill',
};

const it: Dict = {
  deliverTo: 'Consegna a', hello: 'Ciao', signIn: 'Accedi', account: 'Account',
  returns: 'Resi', orders: '& Ordini', cart: 'Carrello', all: 'Tutto',
  todaysDeals: 'Offerte del giorno', vendors: 'Venditori', bestSellers: 'Più venduti',
  newReleases: 'Novità', customerService: 'Servizio clienti',
  searchPlaceholder: 'Cerca su Storegrill', addToCart: 'Aggiungi al carrello', buyNow: 'Acquista ora',
  inStock: 'Disponibile', outOfStock: 'Attualmente non disponibile',
  subtotal: 'Subtotale', proceedCheckout: 'Vai alla cassa', continueShopping: 'Continua lo shopping',
  emptyCartTitle: 'Il tuo carrello Storegrill è vuoto',
  backToTop: 'Torna su', freeDelivery: 'Consegna GRATUITA', soldBy: 'Venduto da',
  changeRegion: 'Cambia regione', language: 'Lingua', currency: 'Valuta',
  signInButton: 'Accedi in sicurezza', createAccount: 'Crea account',
  noResults: 'Nessun risultato', clearFilters: 'Cancella filtri', sortBy: 'Ordina per',
  shopNow: 'Acquista ora', viewAll: 'Vedi tutto', seeAllDeals: 'Tutte le offerte',
  recentlyViewed: 'Visti di recente', featuredVendors: 'Venditori in evidenza',
  becomeVendor: 'Diventa venditore',
};

const nl: Dict = {
  deliverTo: 'Bezorgen aan', hello: 'Hallo', signIn: 'Inloggen', account: 'Account',
  returns: 'Retouren', orders: '& Bestellingen', cart: 'Winkelwagen', all: 'Alles',
  todaysDeals: 'Aanbiedingen van de dag', vendors: 'Verkopers', bestSellers: 'Bestsellers',
  newReleases: 'Nieuw', customerService: 'Klantenservice',
  searchPlaceholder: 'Zoeken op Storegrill', addToCart: 'Toevoegen aan winkelwagen', buyNow: 'Nu kopen',
  inStock: 'Op voorraad', outOfStock: 'Momenteel niet beschikbaar',
  subtotal: 'Subtotaal', proceedCheckout: 'Afrekenen', continueShopping: 'Verder winkelen',
  emptyCartTitle: 'Je Storegrill-winkelwagen is leeg',
  backToTop: 'Naar boven', freeDelivery: 'GRATIS bezorging', soldBy: 'Verkocht door',
  changeRegion: 'Regio wijzigen', language: 'Taal', currency: 'Valuta',
  signInButton: 'Veilig inloggen', createAccount: 'Account aanmaken',
  noResults: 'Geen resultaten gevonden', clearFilters: 'Filters wissen', sortBy: 'Sorteren op',
  shopNow: 'Nu winkelen', viewAll: 'Alles bekijken', seeAllDeals: 'Alle aanbiedingen',
  recentlyViewed: 'Recent bekeken', featuredVendors: 'Uitgelichte verkopers',
  becomeVendor: 'Verkoper worden',
};

const pl: Dict = {
  deliverTo: 'Dostawa do', hello: 'Cześć', signIn: 'Zaloguj się', account: 'Konto',
  returns: 'Zwroty', orders: '& Zamówienia', cart: 'Koszyk', all: 'Wszystko',
  todaysDeals: 'Okazje dnia', vendors: 'Sprzedawcy', bestSellers: 'Bestsellery',
  newReleases: 'Nowości', customerService: 'Obsługa klienta',
  searchPlaceholder: 'Szukaj w Storegrill', addToCart: 'Dodaj do koszyka', buyNow: 'Kup teraz',
  inStock: 'W magazynie', outOfStock: 'Obecnie niedostępne',
  subtotal: 'Suma częściowa', proceedCheckout: 'Przejdź do kasy', continueShopping: 'Kontynuuj zakupy',
  emptyCartTitle: 'Twój koszyk Storegrill jest pusty',
  backToTop: 'Do góry', freeDelivery: 'DARMOWA dostawa', soldBy: 'Sprzedawane przez',
  changeRegion: 'Zmień region', language: 'Język', currency: 'Waluta',
  signInButton: 'Bezpieczne logowanie', createAccount: 'Utwórz konto',
  noResults: 'Brak wyników', clearFilters: 'Wyczyść filtry', sortBy: 'Sortuj według',
  shopNow: 'Kupuj teraz', viewAll: 'Zobacz wszystko', seeAllDeals: 'Wszystkie okazje',
  recentlyViewed: 'Ostatnio oglądane', featuredVendors: 'Wyróżnieni sprzedawcy',
  becomeVendor: 'Zostań sprzedawcą',
};

const pt: Dict = {
  deliverTo: 'Entregar em', hello: 'Olá', signIn: 'Entrar', account: 'Conta',
  returns: 'Devoluções', orders: '& Encomendas', cart: 'Carrinho', all: 'Tudo',
  todaysDeals: 'Promoções de hoje', vendors: 'Vendedores', bestSellers: 'Mais vendidos',
  newReleases: 'Novidades', customerService: 'Apoio ao cliente',
  searchPlaceholder: 'Pesquisar na Storegrill', addToCart: 'Adicionar ao carrinho', buyNow: 'Comprar agora',
  inStock: 'Em stock', outOfStock: 'Atualmente indisponível',
  subtotal: 'Subtotal', proceedCheckout: 'Finalizar compra', continueShopping: 'Continuar a comprar',
  emptyCartTitle: 'O seu carrinho Storegrill está vazio',
  backToTop: 'Voltar ao topo', freeDelivery: 'Entrega GRÁTIS', soldBy: 'Vendido por',
  changeRegion: 'Mudar região', language: 'Idioma', currency: 'Moeda',
  signInButton: 'Iniciar sessão com segurança', createAccount: 'Criar conta',
  noResults: 'Sem resultados', clearFilters: 'Limpar filtros', sortBy: 'Ordenar por',
  shopNow: 'Comprar agora', viewAll: 'Ver tudo', seeAllDeals: 'Todas as promoções',
  recentlyViewed: 'Vistos recentemente', featuredVendors: 'Vendedores destacados',
  becomeVendor: 'Tornar-se vendedor',
};

const ja: Dict = {
  deliverTo: 'お届け先', hello: 'こんにちは', signIn: 'ログイン', account: 'アカウント',
  returns: '返品', orders: '& 注文履歴', cart: 'カート', all: 'すべて',
  todaysDeals: '本日のお得な商品', vendors: '出品者', bestSellers: 'ベストセラー',
  newReleases: '新着商品', customerService: 'カスタマーサービス',
  searchPlaceholder: 'Storegrillを検索', addToCart: 'カートに追加する', buyNow: '今すぐ購入',
  inStock: '在庫あり', outOfStock: '現在在庫切れです',
  subtotal: '小計', proceedCheckout: 'レジに進む', continueShopping: '買い物を続ける',
  emptyCartTitle: 'Storegrillのカートは空です',
  backToTop: 'ページトップへ', freeDelivery: '無料配送', soldBy: '販売元',
  changeRegion: 'リージョンを変更', language: '言語', currency: '通貨',
  signInButton: '安全にサインイン', createAccount: 'アカウントを作成',
  noResults: '結果が見つかりません', clearFilters: 'フィルターをクリア', sortBy: '並び替え',
  shopNow: '今すぐショップ', viewAll: 'すべて見る', seeAllDeals: 'すべてのお得な商品',
  recentlyViewed: '最近閲覧した商品', featuredVendors: '注目の出品者',
  becomeVendor: '出品者になる',
};

const ar: Dict = {
  deliverTo: 'التوصيل إلى', hello: 'مرحباً', signIn: 'تسجيل الدخول', account: 'حسابك',
  returns: 'الإرجاع', orders: 'والطلبات', cart: 'عربة التسوق', all: 'الكل',
  todaysDeals: 'صفقات اليوم', vendors: 'البائعون', bestSellers: 'الأكثر مبيعاً',
  newReleases: 'وصل حديثاً', customerService: 'خدمة العملاء',
  searchPlaceholder: 'ابحث في ستور غريل', addToCart: 'أضف إلى السلة', buyNow: 'اشترِ الآن',
  inStock: 'متوفر', outOfStock: 'غير متوفر حالياً',
  subtotal: 'المجموع الفرعي', proceedCheckout: 'إتمام الشراء', continueShopping: 'متابعة التسوق',
  emptyCartTitle: 'سلة التسوق فارغة',
  backToTop: 'العودة إلى الأعلى', freeDelivery: 'توصيل مجاني', soldBy: 'يبيعه',
  changeRegion: 'تغيير المنطقة', language: 'اللغة', currency: 'العملة',
  signInButton: 'تسجيل دخول آمن', createAccount: 'إنشاء حساب',
  noResults: 'لا توجد نتائج', clearFilters: 'مسح عوامل التصفية', sortBy: 'ترتيب حسب',
  shopNow: 'اشترِ الآن', viewAll: 'عرض الكل', seeAllDeals: 'كل الصفقات',
  recentlyViewed: 'شوهدت مؤخراً', featuredVendors: 'بائعون مميزون',
  becomeVendor: 'كن بائعاً',
};

const dictionaries: Partial<Record<Locale, Dict>> = { en, de, fr, es, it, nl, pl, pt, ja, ar };

export function t(locale: string, key: string, ...args: Array<string | number>): string {
  const dict = dictionaries[locale as Locale] ?? en;
  let str = dict[key] ?? en[key] ?? key;
  args.forEach((arg, i) => {
    str = str.replace(`{${i}}`, String(arg));
  });
  return str;
}

export function isRtl(locale: string): boolean {
  return locale === 'ar';
}

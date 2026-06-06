// Big diversity-expansion seed. ~350 figures spread across Asia,
// Africa, South America, deeper Europe, and the ancient world to
// close the gaps the bias audit (docs/figure-bias.md) called out.
// Idempotent upserts; existing rows are merged so re-runs are safe.
//
//   node scripts/seedDiversityExpansion.mjs
//   node scripts/seedDiversityExpansion.mjs --dry-run
//   node scripts/seedDiversityExpansion.mjs --only=confucius
//   node scripts/seedDiversityExpansion.mjs --new-only   # skip ids already in DB
//
// All figures default to Medium difficulty unless tagged otherwise.
// Easy is reserved for portraits the average adult would recognise
// across cultures. Hard for technical / scholarly recognition only.

import { readFileSync } from 'node:fs';

function loadEnv() {
  try {
    const raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {}
}
loadEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local.');
  process.exit(1);
}

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const newOnly = args.includes('--new-only');
const onlyArg = args.find((a) => a.startsWith('--only='));
const only = onlyArg ? onlyArg.slice('--only='.length).toLowerCase() : null;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- Roster ------------------------------------------------------------
//
// Schema per row (all required):
//   id, name, aliases, tier (easy|medium|hard), era, field, region
// Optional:
//   wikipediaTitle (override for the image fetch)

const e = (id, name, aliases, tier, era, field, region, wikipediaTitle) => ({
  id, name, aliases, tier, era, field, region, wikipediaTitle,
});

const SEED = [
  // ============================================================
  // ASIA
  // ============================================================

  // -- China (25) --
  e('confucius',        'Confucius',         ['kongzi', 'kong fuzi'],     'easy',   'Ancient',                  'Philosophy', 'China'),
  e('laozi',            'Laozi',             ['lao tzu'],                  'medium', 'Ancient',                  'Philosophy', 'China'),
  e('sun-tzu',          'Sun Tzu',           ['sunzi'],                    'medium', 'Ancient',                  'Military', 'China'),
  e('qin-shi-huang',    'Qin Shi Huang',     ['qin shihuang'],             'medium', 'Ancient',                  'Royalty', 'China'),
  e('wu-zetian',        'Wu Zetian',         ['empress wu'],               'medium', 'Medieval',                 'Royalty', 'China'),
  e('kublai-khan',      'Kublai Khan',       ['kublai'],                   'medium', 'Medieval',                 'Royalty', 'Mongolia / China'),
  e('mao-zedong',       'Mao Zedong',        ['mao', 'chairman mao'],      'easy',   '20th century',             'Politics', 'China'),
  e('sun-yat-sen',      'Sun Yat-sen',       ['sun yat-sen'],              'medium', '19th–20th century',        'Politics', 'China'),
  e('chiang-kai-shek',  'Chiang Kai-shek',   ['chiang kai-shek'],          'medium', '20th century',             'Politics', 'China / Taiwan'),
  e('zhou-enlai',       'Zhou Enlai',        ['chou en-lai'],              'medium', '20th century',             'Politics', 'China'),
  e('deng-xiaoping',    'Deng Xiaoping',     ['deng'],                     'medium', '20th century',             'Politics', 'China'),
  e('lu-xun',           'Lu Xun',            ['lu xun'],                   'medium', '20th century',             'Literature', 'China'),
  e('bruce-lee',        'Bruce Lee',         ['bruce lee'],                'easy',   '20th century',             'Film', 'Hong Kong / USA'),
  e('li-bai',           'Li Bai',            ['li bo', 'li po'],           'medium', 'Medieval',                 'Poetry', 'China'),
  e('du-fu',            'Du Fu',             ['du fu'],                    'medium', 'Medieval',                 'Poetry', 'China'),
  e('kangxi',           'Kangxi Emperor',    ['kangxi'],                   'medium', '17th–18th century',        'Royalty', 'China',     'Kangxi Emperor'),
  e('qianlong',         'Qianlong Emperor',  ['qianlong'],                 'medium', '18th century',             'Royalty', 'China',     'Qianlong Emperor'),
  e('puyi',             'Puyi',              ['puyi', 'last emperor'],     'medium', '20th century',             'Royalty', 'China'),
  e('zheng-he',         'Zheng He',          ['zheng he'],                 'medium', 'Renaissance',              'Exploration', 'China'),
  e('cixi',             'Empress Dowager Cixi', ['cixi'],                  'medium', '19th century',             'Royalty', 'China',     'Empress Dowager Cixi'),
  e('jiang-qing',       'Jiang Qing',        ['madame mao'],               'hard',   '20th century',             'Politics', 'China'),
  e('liu-shaoqi',       'Liu Shaoqi',        ['liu shaoqi'],               'hard',   '20th century',             'Politics', 'China'),
  e('lin-biao',         'Lin Biao',          ['lin biao'],                 'hard',   '20th century',             'Military', 'China'),
  e('hua-guofeng',      'Hua Guofeng',       ['hua guofeng'],              'hard',   '20th century',             'Politics', 'China'),
  e('jiang-zemin',      'Jiang Zemin',       ['jiang zemin'],              'medium', '20th–21st century',        'Politics', 'China'),

  // -- Japan (15) --
  e('emperor-hirohito', 'Hirohito',          ['emperor hirohito'],         'medium', '20th century',             'Royalty', 'Japan'),
  e('akira-kurosawa',   'Akira Kurosawa',    ['kurosawa'],                 'medium', '20th century',             'Film', 'Japan'),
  e('yukio-mishima',    'Yukio Mishima',     ['mishima'],                  'medium', '20th century',             'Literature', 'Japan'),
  e('yasunari-kawabata','Yasunari Kawabata', ['kawabata'],                 'medium', '20th century',             'Literature', 'Japan'),
  e('murasaki-shikibu', 'Murasaki Shikibu',  ['lady murasaki'],            'medium', 'Medieval',                 'Literature', 'Japan'),
  e('hokusai',          'Hokusai',           ['katsushika hokusai'],       'easy',   '18th–19th century',        'Painting', 'Japan'),
  e('hiroshige',        'Hiroshige',         ['ando hiroshige'],           'medium', '19th century',             'Painting', 'Japan'),
  e('toshiro-mifune',   'Toshiro Mifune',    ['mifune'],                   'medium', '20th century',             'Film', 'Japan'),
  e('oda-nobunaga',     'Oda Nobunaga',      ['nobunaga'],                 'medium', 'Renaissance',              'Military', 'Japan'),
  e('tokugawa-ieyasu',  'Tokugawa Ieyasu',   ['ieyasu'],                   'medium', '17th century',             'Royalty', 'Japan'),
  e('saigo-takamori',   'Saigō Takamori',    ['saigo'],                    'medium', '19th century',             'Military', 'Japan'),
  e('ito-hirobumi',     'Itō Hirobumi',      ['ito hirobumi'],             'hard',   '19th–20th century',        'Politics', 'Japan'),
  e('matsuo-basho',     'Matsuo Bashō',      ['basho'],                    'medium', '17th century',             'Poetry', 'Japan'),
  e('toyotomi-hideyoshi','Toyotomi Hideyoshi',['hideyoshi'],               'medium', 'Renaissance',              'Military', 'Japan'),
  e('emperor-meiji',    'Emperor Meiji',     ['meiji'],                    'medium', '19th–20th century',        'Royalty', 'Japan'),

  // -- India / South Asia (20) --
  e('mahatma-gandhi',   'Mahatma Gandhi',    ['gandhi'],                   'easy',   '20th century',             'Politics', 'India'),
  e('jawaharlal-nehru', 'Jawaharlal Nehru',  ['nehru'],                    'medium', '20th century',             'Politics', 'India'),
  e('indira-gandhi',    'Indira Gandhi',     ['indira'],                   'medium', '20th century',             'Politics', 'India'),
  e('rabindranath-tagore','Rabindranath Tagore',['tagore'],                'medium', '19th–20th century',        'Literature', 'India'),
  e('akbar',            'Akbar',             ['akbar the great'],          'medium', 'Renaissance',              'Royalty', 'Mughal India', 'Akbar'),
  e('shah-jahan',       'Shah Jahan',        ['shah jahan'],               'medium', '17th century',             'Royalty', 'Mughal India'),
  e('aurangzeb',        'Aurangzeb',         ['aurangzeb'],                'medium', '17th–18th century',        'Royalty', 'Mughal India'),
  e('br-ambedkar',      'B. R. Ambedkar',    ['ambedkar'],                 'medium', '20th century',             'Politics', 'India',     'B. R. Ambedkar'),
  e('subhas-chandra-bose','Subhas Chandra Bose',['bose'],                  'medium', '20th century',             'Politics', 'India'),
  e('swami-vivekananda','Swami Vivekananda', ['vivekananda'],              'medium', '19th century',             'Religion', 'India'),
  e('ramanujan',        'Srinivasa Ramanujan',['ramanujan'],               'medium', '20th century',             'Mathematics', 'India', 'Srinivasa Ramanujan'),
  e('cv-raman',         'C. V. Raman',       ['cv raman'],                 'medium', '20th century',             'Physics', 'India',     'C. V. Raman'),
  e('satyajit-ray',     'Satyajit Ray',      ['satyajit ray'],             'medium', '20th century',             'Film', 'India'),
  e('siddhartha-gautama','Gautama Buddha',   ['buddha', 'siddhartha'],     'easy',   'Ancient',                  'Religion', 'India',     'Gautama Buddha'),
  e('ashoka',           'Ashoka',            ['ashoka the great'],         'medium', 'Ancient',                  'Royalty', 'India'),
  e('babur',            'Babur',             ['babur'],                    'medium', 'Renaissance',              'Royalty', 'Mughal India'),
  e('chandragupta-maurya','Chandragupta Maurya',['chandragupta'],          'hard',   'Ancient',                  'Royalty', 'India'),
  e('lal-bahadur-shastri','Lal Bahadur Shastri',['shastri'],               'hard',   '20th century',             'Politics', 'India'),
  e('muhammad-ali-jinnah','Muhammad Ali Jinnah',['jinnah'],                'medium', '20th century',             'Politics', 'Pakistan'),
  e('benazir-bhutto',   'Benazir Bhutto',    ['bhutto'],                   'medium', '20th–21st century',        'Politics', 'Pakistan'),

  // -- Korea / SE Asia (10) --
  e('king-sejong',      'Sejong the Great',  ['sejong'],                   'medium', 'Renaissance',              'Royalty', 'Korea',     'Sejong the Great'),
  e('yi-sun-shin',      'Yi Sun-sin',        ['yi sun-shin'],              'medium', '16th century',             'Military', 'Korea'),
  e('park-chung-hee',   'Park Chung-hee',    ['park chung-hee'],           'hard',   '20th century',             'Politics', 'South Korea'),
  e('ho-chi-minh',      'Hồ Chí Minh',       ['ho chi minh'],              'easy',   '20th century',             'Politics', 'Vietnam'),
  e('sukarno',          'Sukarno',           ['sukarno'],                  'medium', '20th century',             'Politics', 'Indonesia'),
  e('aung-san',         'Aung San',          ['aung san'],                 'medium', '20th century',             'Politics', 'Myanmar / Burma'),
  e('pol-pot',          'Pol Pot',           ['pol pot'],                  'medium', '20th century',             'Politics', 'Cambodia'),
  e('mongkut',          'Mongkut',           ['rama iv'],                  'hard',   '19th century',             'Royalty', 'Thailand'),
  e('rama-v',           'Chulalongkorn',     ['rama v'],                   'medium', '19th–20th century',        'Royalty', 'Thailand'),
  e('lee-kuan-yew',     'Lee Kuan Yew',      ['lee kuan yew'],             'medium', '20th–21st century',        'Politics', 'Singapore'),

  // -- Middle East / Persia (15) --
  e('cyrus-the-great',  'Cyrus the Great',   ['cyrus'],                    'medium', 'Ancient',                  'Royalty', 'Persia / Iran'),
  e('darius-the-great', 'Darius the Great',  ['darius i'],                 'medium', 'Ancient',                  'Royalty', 'Persia / Iran'),
  e('xerxes',           'Xerxes I',          ['xerxes'],                   'medium', 'Ancient',                  'Royalty', 'Persia / Iran', 'Xerxes I'),
  e('saladin',          'Saladin',           ['salah ad-din'],             'medium', 'Medieval',                 'Military', 'Egypt / Syria'),
  e('avicenna',         'Avicenna',          ['ibn sina'],                 'medium', 'Medieval',                 'Medicine', 'Persia / Iran'),
  e('averroes',         'Averroes',          ['ibn rushd'],                'hard',   'Medieval',                 'Philosophy', 'Al-Andalus'),
  e('rumi',             'Rumi',              ['mevlana'],                  'medium', 'Medieval',                 'Poetry', 'Persia / Anatolia'),
  e('omar-khayyam',     'Omar Khayyam',      ['khayyam'],                  'medium', 'Medieval',                 'Literature', 'Persia / Iran'),
  e('suleiman-the-magnificent','Suleiman the Magnificent',['suleiman'],    'medium', 'Renaissance',              'Royalty', 'Ottoman Empire'),
  e('ataturk',          'Mustafa Kemal Atatürk',['ataturk'],               'easy',   '20th century',             'Politics', 'Turkey',    'Mustafa Kemal Atatürk'),
  e('yasser-arafat',    'Yasser Arafat',     ['arafat'],                   'easy',   '20th–21st century',        'Politics', 'Palestine'),
  e('ruhollah-khomeini','Ruhollah Khomeini', ['khomeini', 'ayatollah'],    'medium', '20th century',             'Politics', 'Iran'),
  e('mohammad-reza-pahlavi','Mohammad Reza Pahlavi',['shah of iran'],      'medium', '20th century',             'Royalty', 'Iran'),
  e('hafez',            'Hafez',             ['hafez'],                    'medium', 'Medieval',                 'Poetry', 'Persia / Iran'),
  e('mehmed-ii',        'Mehmed the Conqueror',['mehmed ii'],              'medium', 'Renaissance',              'Royalty', 'Ottoman Empire', 'Mehmed II'),

  // ============================================================
  // AFRICA
  // ============================================================

  // -- Ancient Egypt (8) --
  e('cleopatra',        'Cleopatra',         ['cleopatra vii'],            'easy',   'Ancient',                  'Royalty', 'Egypt',     'Cleopatra'),
  e('tutankhamun',      'Tutankhamun',       ['king tut'],                 'easy',   'Ancient',                  'Royalty', 'Egypt'),
  e('nefertiti',        'Nefertiti',         ['queen nefertiti'],          'easy',   'Ancient',                  'Royalty', 'Egypt'),
  e('ramses-ii',        'Ramesses II',       ['ramses ii'],                'medium', 'Ancient',                  'Royalty', 'Egypt',     'Ramesses II'),
  e('hatshepsut',       'Hatshepsut',        ['hatshepsut'],               'medium', 'Ancient',                  'Royalty', 'Egypt'),
  e('akhenaten',        'Akhenaten',         ['akhenaton'],                'medium', 'Ancient',                  'Royalty', 'Egypt'),
  e('imhotep',          'Imhotep',           ['imhotep'],                  'medium', 'Ancient',                  'Architecture', 'Egypt'),
  e('thutmose-iii',     'Thutmose III',      ['thutmose iii'],             'hard',   'Ancient',                  'Royalty', 'Egypt'),

  // -- Sub-Saharan + modern Africa (35) --
  e('nelson-mandela',   'Nelson Mandela',    ['mandela'],                  'easy',   '20th–21st century',        'Politics', 'South Africa'),
  e('desmond-tutu',     'Desmond Tutu',      ['tutu'],                     'medium', '20th–21st century',        'Religion', 'South Africa'),
  e('haile-selassie',   'Haile Selassie',    ['haile selassie'],           'medium', '20th century',             'Royalty', 'Ethiopia'),
  e('menelik-ii',       'Menelik II',        ['menelik'],                  'medium', '19th–20th century',        'Royalty', 'Ethiopia'),
  e('mansa-musa',       'Mansa Musa',        ['mansa musa'],               'medium', 'Medieval',                 'Royalty', 'Mali'),
  e('shaka-zulu',       'Shaka',             ['shaka zulu'],               'medium', '19th century',             'Military', 'Zulu Kingdom'),
  e('cetshwayo',        'Cetshwayo kaMpande',['cetshwayo'],                'hard',   '19th century',             'Royalty', 'Zulu Kingdom'),
  e('patrice-lumumba',  'Patrice Lumumba',   ['lumumba'],                  'medium', '20th century',             'Politics', 'Congo'),
  e('kwame-nkrumah',    'Kwame Nkrumah',     ['nkrumah'],                  'medium', '20th century',             'Politics', 'Ghana'),
  e('jomo-kenyatta',    'Jomo Kenyatta',     ['kenyatta'],                 'medium', '20th century',             'Politics', 'Kenya'),
  e('julius-nyerere',   'Julius Nyerere',    ['nyerere'],                  'medium', '20th century',             'Politics', 'Tanzania'),
  e('leopold-senghor',  'Léopold Sédar Senghor',['senghor'],               'medium', '20th century',             'Politics', 'Senegal'),
  e('robert-mugabe',    'Robert Mugabe',     ['mugabe'],                   'medium', '20th–21st century',        'Politics', 'Zimbabwe'),
  e('idi-amin',         'Idi Amin',          ['idi amin'],                 'medium', '20th century',             'Politics', 'Uganda'),
  e('mobutu-sese-seko', 'Mobutu Sese Seko',  ['mobutu'],                   'medium', '20th century',             'Politics', 'Congo / Zaire'),
  e('steve-biko',       'Steve Biko',        ['steve biko'],               'medium', '20th century',             'Politics', 'South Africa'),
  e('miriam-makeba',    'Miriam Makeba',     ['mama africa'],              'medium', '20th–21st century',        'Music', 'South Africa'),
  e('fela-kuti',        'Fela Kuti',         ['fela'],                     'medium', '20th century',             'Music', 'Nigeria'),
  e('chinua-achebe',    'Chinua Achebe',     ['achebe'],                   'medium', '20th–21st century',        'Literature', 'Nigeria'),
  e('wangari-maathai',  'Wangari Maathai',   ['maathai'],                  'medium', '20th–21st century',        'Politics', 'Kenya'),
  e('gamal-abdel-nasser','Gamal Abdel Nasser',['nasser'],                  'medium', '20th century',             'Politics', 'Egypt'),
  e('anwar-sadat',      'Anwar Sadat',       ['sadat'],                    'medium', '20th century',             'Politics', 'Egypt'),
  e('hosni-mubarak',    'Hosni Mubarak',     ['mubarak'],                  'medium', '20th–21st century',        'Politics', 'Egypt'),
  e('muammar-gaddafi',  'Muammar Gaddafi',   ['gaddafi', 'qaddafi'],       'easy',   '20th–21st century',        'Politics', 'Libya'),
  e('tariq-ibn-ziyad',  'Tariq ibn Ziyad',   ['tariq'],                    'hard',   'Medieval',                 'Military', 'Berber / Al-Andalus'),
  e('ibn-battuta',      'Ibn Battuta',       ['ibn battuta'],              'medium', 'Medieval',                 'Exploration', 'Morocco'),
  e('thomas-sankara',   'Thomas Sankara',    ['sankara'],                  'medium', '20th century',             'Politics', 'Burkina Faso'),
  e('houphouet-boigny', 'Félix Houphouët-Boigny',['houphouet'],            'hard',   '20th century',             'Politics', 'Ivory Coast'),
  e('samora-machel',    'Samora Machel',     ['machel'],                   'hard',   '20th century',             'Politics', 'Mozambique'),
  e('amilcar-cabral',   'Amílcar Cabral',    ['cabral'],                   'hard',   '20th century',             'Politics', 'Guinea-Bissau'),
  e('ahmed-ben-bella',  'Ahmed Ben Bella',   ['ben bella'],                'hard',   '20th–21st century',        'Politics', 'Algeria'),
  e('frantz-fanon',     'Frantz Fanon',      ['fanon'],                    'medium', '20th century',             'Philosophy', 'Martinique / Algeria'),
  e('léopold-ii',       'Léopold II',        ['leopold ii of belgium'],    'medium', '19th–20th century',        'Royalty', 'Belgium / Congo', 'Leopold II of Belgium'),
  e('sundiata-keita',   'Sundiata Keita',    ['sundiata'],                 'hard',   'Medieval',                 'Royalty', 'Mali'),
  e('queen-amina',      'Amina of Zaria',    ['queen amina'],              'hard',   'Renaissance',              'Royalty', 'Hausa / Nigeria', 'Amina'),

  // ============================================================
  // SOUTH AMERICA
  // ============================================================

  e('simon-bolivar',    'Simón Bolívar',     ['bolivar', 'el libertador'], 'easy',   '19th century',             'Politics', 'Venezuela / Colombia'),
  e('jose-de-san-martin','José de San Martín',['san martin'],              'medium', '19th century',             'Politics', 'Argentina'),
  e('bernardo-ohiggins','Bernardo O’Higgins',['ohiggins'],                  'medium', '19th century',             'Politics', 'Chile',     'Bernardo O’Higgins'),
  e('pedro-ii-of-brazil','Pedro II of Brazil',['pedro ii'],                'medium', '19th century',             'Royalty', 'Brazil'),
  e('tupac-amaru-ii',   'Túpac Amaru II',    ['tupac amaru ii'],           'hard',   '18th century',             'Politics', 'Peru'),
  e('atahualpa',        'Atahualpa',         ['atahualpa'],                'medium', 'Renaissance',              'Royalty', 'Inca Empire'),
  e('manco-inca',       'Manco Inca Yupanqui',['manco inca'],              'hard',   'Renaissance',              'Royalty', 'Inca Empire'),
  e('juan-peron',       'Juan Perón',        ['peron'],                    'medium', '20th century',             'Politics', 'Argentina'),
  e('salvador-allende', 'Salvador Allende',  ['allende'],                  'medium', '20th century',             'Politics', 'Chile'),
  e('pablo-neruda',     'Pablo Neruda',      ['neruda'],                   'medium', '20th century',             'Literature', 'Chile'),
  e('jorge-luis-borges','Jorge Luis Borges', ['borges'],                   'medium', '20th century',             'Literature', 'Argentina'),
  e('frida-kahlo',      'Frida Kahlo',       ['frida'],                    'easy',   '20th century',             'Painting', 'Mexico'),
  e('diego-rivera',     'Diego Rivera',      ['rivera'],                   'medium', '20th century',             'Painting', 'Mexico'),
  e('octavio-paz',      'Octavio Paz',       ['paz'],                      'medium', '20th century',             'Literature', 'Mexico'),
  e('augusto-pinochet', 'Augusto Pinochet',  ['pinochet'],                 'medium', '20th–21st century',        'Politics', 'Chile'),
  e('getulio-vargas',   'Getúlio Vargas',    ['vargas'],                   'medium', '20th century',             'Politics', 'Brazil'),
  e('tom-jobim',        'Antônio Carlos Jobim',['tom jobim'],              'medium', '20th–21st century',        'Music', 'Brazil', 'Antônio Carlos Jobim'),
  e('vinicius-de-moraes','Vinicius de Moraes',['vinicius'],                'medium', '20th century',             'Music', 'Brazil'),
  e('heitor-villa-lobos','Heitor Villa-Lobos',['villa-lobos'],             'medium', '20th century',             'Music', 'Brazil'),
  e('machado-de-assis', 'Machado de Assis',  ['machado de assis'],         'medium', '19th–20th century',        'Literature', 'Brazil'),
  e('gabriel-garcia-marquez','Gabriel García Márquez',['garcia marquez'],  'easy',   '20th–21st century',        'Literature', 'Colombia'),
  e('pele',             'Pelé',              ['pele'],                     'easy',   '20th–21st century',        'Sports', 'Brazil'),
  e('maradona',         'Diego Maradona',    ['maradona'],                 'easy',   '20th–21st century',        'Sports', 'Argentina'),
  e('carmen-miranda',   'Carmen Miranda',    ['carmen miranda'],           'medium', '20th century',             'Music', 'Brazil'),
  e('benito-juarez',    'Benito Juárez',     ['juarez'],                   'medium', '19th century',             'Politics', 'Mexico'),
  e('porfirio-diaz',    'Porfirio Díaz',     ['diaz'],                     'medium', '19th–20th century',        'Politics', 'Mexico'),
  e('emiliano-zapata',  'Emiliano Zapata',   ['zapata'],                   'medium', '20th century',             'Politics', 'Mexico'),
  e('pancho-villa',     'Pancho Villa',      ['pancho villa'],             'medium', '20th century',             'Politics', 'Mexico'),
  e('hugo-chavez',      'Hugo Chávez',       ['chavez'],                   'medium', '20th–21st century',        'Politics', 'Venezuela'),
  e('jorge-amado',      'Jorge Amado',       ['jorge amado'],              'hard',   '20th century',             'Literature', 'Brazil'),

  // ============================================================
  // EUROPEAN DEPTH (Renaissance → 1900)
  // ============================================================

  // -- Renaissance + Baroque painting (20) --
  e('donatello',        'Donatello',         ['donatello'],                'medium', 'Renaissance',              'Sculpture', 'Italy'),
  e('brunelleschi',     'Filippo Brunelleschi',['brunelleschi'],           'medium', 'Renaissance',              'Architecture', 'Italy'),
  e('titian',           'Titian',            ['tiziano'],                  'medium', 'Renaissance',              'Painting', 'Italy'),
  e('tintoretto',       'Tintoretto',        ['tintoretto'],               'medium', 'Renaissance',              'Painting', 'Italy'),
  e('veronese',         'Paolo Veronese',    ['veronese'],                 'medium', 'Renaissance',              'Painting', 'Italy'),
  e('lorenzo-de-medici','Lorenzo de’ Medici',['lorenzo'],                   'medium', 'Renaissance',              'Politics', 'Italy', 'Lorenzo de’ Medici'),
  e('vasari',           'Giorgio Vasari',    ['vasari'],                   'medium', 'Renaissance',              'Painting', 'Italy'),
  e('holbein',          'Hans Holbein the Younger',['holbein'],            'medium', 'Renaissance',              'Painting', 'Germany / England'),
  e('durer',            'Albrecht Dürer',    ['durer'],                    'medium', 'Renaissance',              'Painting', 'Germany'),
  e('cranach',          'Lucas Cranach the Elder',['cranach'],             'medium', 'Renaissance',              'Painting', 'Germany'),
  e('pieter-bruegel',   'Pieter Bruegel the Elder',['bruegel'],            'medium', 'Renaissance',              'Painting', 'Flanders'),
  e('jan-van-eyck',     'Jan van Eyck',      ['van eyck'],                 'medium', 'Renaissance',              'Painting', 'Flanders'),
  e('frans-hals',       'Frans Hals',        ['hals'],                     'medium', '17th century',             'Painting', 'Netherlands'),
  e('van-dyck',         'Anthony van Dyck',  ['van dyck'],                 'medium', '17th century',             'Painting', 'Flanders / England'),
  e('velazquez',        'Diego Velázquez',   ['velazquez'],                'medium', '17th century',             'Painting', 'Spain'),
  e('murillo',          'Bartolomé Esteban Murillo',['murillo'],           'medium', '17th century',             'Painting', 'Spain'),
  e('claude-lorrain',   'Claude Lorrain',    ['claude lorrain'],           'hard',   '17th century',             'Painting', 'France'),
  e('nicolas-poussin',  'Nicolas Poussin',   ['poussin'],                  'medium', '17th century',             'Painting', 'France'),
  e('jean-honore-fragonard','Jean-Honoré Fragonard',['fragonard'],         'hard',   '18th century',             'Painting', 'France'),
  e('francois-boucher', 'François Boucher',  ['boucher'],                  'hard',   '18th century',             'Painting', 'France'),

  // -- Classical music (30) --
  e('handel',           'George Frideric Handel',['handel'],               'medium', '17th–18th century',        'Music', 'Germany / England'),
  e('purcell',          'Henry Purcell',     ['purcell'],                  'medium', '17th century',             'Music', 'England'),
  e('paganini',         'Niccolò Paganini',  ['paganini'],                 'medium', '19th century',             'Music', 'Italy'),
  e('mendelssohn',      'Felix Mendelssohn', ['mendelssohn'],              'medium', '19th century',             'Music', 'Germany'),
  e('robert-schumann',  'Robert Schumann',   ['schumann'],                 'medium', '19th century',             'Music', 'Germany'),
  e('clara-schumann',   'Clara Schumann',    ['clara schumann'],           'medium', '19th century',             'Music', 'Germany'),
  e('berlioz',          'Hector Berlioz',    ['berlioz'],                  'medium', '19th century',             'Music', 'France'),
  e('dvorak',           'Antonín Dvořák',    ['dvorak'],                   'medium', '19th–20th century',        'Music', 'Czech Lands'),
  e('smetana',          'Bedřich Smetana',   ['smetana'],                  'medium', '19th century',             'Music', 'Czech Lands'),
  e('grieg',            'Edvard Grieg',      ['grieg'],                    'medium', '19th–20th century',        'Music', 'Norway'),
  e('sibelius',         'Jean Sibelius',     ['sibelius'],                 'medium', '19th–20th century',        'Music', 'Finland'),
  e('mussorgsky',       'Modest Mussorgsky', ['mussorgsky'],               'medium', '19th century',             'Music', 'Russia'),
  e('rimsky-korsakov',  'Nikolai Rimsky-Korsakov',['rimsky-korsakov'],     'medium', '19th–20th century',        'Music', 'Russia'),
  e('stravinsky',       'Igor Stravinsky',   ['stravinsky'],               'medium', '20th century',             'Music', 'Russia / USA'),
  e('prokofiev',        'Sergei Prokofiev',  ['prokofiev'],                'medium', '20th century',             'Music', 'Russia'),
  e('shostakovich',     'Dmitri Shostakovich',['shostakovich'],            'medium', '20th century',             'Music', 'Russia'),
  e('bartok',           'Béla Bartók',       ['bartok'],                   'medium', '20th century',             'Music', 'Hungary'),
  e('kodaly',           'Zoltán Kodály',     ['kodaly'],                   'medium', '20th century',             'Music', 'Hungary'),
  e('ravel',            'Maurice Ravel',     ['ravel'],                    'medium', '19th–20th century',        'Music', 'France'),
  e('debussy',          'Claude Debussy',    ['debussy'],                  'medium', '19th–20th century',        'Music', 'France'),
  e('satie',            'Erik Satie',        ['satie'],                    'medium', '19th–20th century',        'Music', 'France'),
  e('saint-saens',      'Camille Saint-Saëns',['saint-saens'],             'medium', '19th–20th century',        'Music', 'France'),
  e('bizet',            'Georges Bizet',     ['bizet'],                    'medium', '19th century',             'Music', 'France'),
  e('rossini',          'Gioachino Rossini', ['rossini'],                  'medium', '19th century',             'Music', 'Italy'),
  e('donizetti',        'Gaetano Donizetti', ['donizetti'],                'medium', '19th century',             'Music', 'Italy'),
  e('bellini',          'Vincenzo Bellini',  ['bellini'],                  'medium', '19th century',             'Music', 'Italy'),
  e('liszt',            'Franz Liszt',       ['liszt'],                    'medium', '19th century',             'Music', 'Hungary'),
  e('mahler',           'Gustav Mahler',     ['mahler'],                   'medium', '19th–20th century',        'Music', 'Austria'),
  e('antonio-salieri',  'Antonio Salieri',   ['salieri'],                  'medium', '18th–19th century',        'Music', 'Italy / Austria'),
  e('carl-maria-von-weber','Carl Maria von Weber',['weber'],               'hard',   '19th century',             'Music', 'Germany'),

  // -- Literature (30) --
  e('christopher-marlowe','Christopher Marlowe',['marlowe'],               'medium', 'Renaissance',              'Literature', 'England'),
  e('milton',           'John Milton',       ['milton'],                   'medium', '17th century',             'Literature', 'England'),
  e('defoe',            'Daniel Defoe',      ['defoe'],                    'medium', '17th–18th century',        'Literature', 'England'),
  e('swift',            'Jonathan Swift',    ['swift'],                    'medium', '17th–18th century',        'Literature', 'Ireland'),
  e('samuel-johnson',   'Samuel Johnson',    ['dr johnson'],               'medium', '18th century',             'Literature', 'England'),
  e('walter-scott',     'Walter Scott',      ['scott'],                    'medium', '18th–19th century',        'Literature', 'Scotland'),
  e('byron',            'Lord Byron',        ['byron'],                    'medium', '19th century',             'Poetry', 'England'),
  e('percy-shelley',    'Percy Bysshe Shelley',['shelley'],                'medium', '19th century',             'Poetry', 'England'),
  e('john-keats',       'John Keats',        ['keats'],                    'medium', '19th century',             'Poetry', 'England'),
  e('wordsworth',       'William Wordsworth',['wordsworth'],               'medium', '18th–19th century',        'Poetry', 'England'),
  e('coleridge',        'Samuel Taylor Coleridge',['coleridge'],           'medium', '18th–19th century',        'Poetry', 'England'),
  e('william-blake',    'William Blake',     ['blake'],                    'medium', '18th–19th century',        'Poetry', 'England'),
  e('thomas-hardy',     'Thomas Hardy',      ['hardy'],                    'medium', '19th–20th century',        'Literature', 'England'),
  e('robert-louis-stevenson','Robert Louis Stevenson',['stevenson'],       'medium', '19th century',             'Literature', 'Scotland'),
  e('lewis-carroll',    'Lewis Carroll',     ['lewis carroll'],            'medium', '19th century',             'Literature', 'England'),
  e('kipling',          'Rudyard Kipling',   ['kipling'],                  'medium', '19th–20th century',        'Literature', 'England'),
  e('joseph-conrad',    'Joseph Conrad',     ['conrad'],                   'medium', '19th–20th century',        'Literature', 'Poland / England'),
  e('virginia-woolf',   'Virginia Woolf',    ['woolf'],                    'medium', '20th century',             'Literature', 'England'),
  e('dh-lawrence',      'D. H. Lawrence',    ['dh lawrence'],              'medium', '20th century',             'Literature', 'England', 'D. H. Lawrence'),
  e('george-orwell',    'George Orwell',     ['orwell'],                   'easy',   '20th century',             'Literature', 'England'),
  e('aldous-huxley',    'Aldous Huxley',     ['huxley'],                   'medium', '20th century',             'Literature', 'England'),
  e('albert-camus',     'Albert Camus',      ['camus'],                    'medium', '20th century',             'Literature', 'France / Algeria'),
  e('balzac',           'Honoré de Balzac',  ['balzac'],                   'medium', '19th century',             'Literature', 'France'),
  e('emile-zola',       'Émile Zola',        ['zola'],                     'medium', '19th–20th century',        'Literature', 'France'),
  e('stendhal',         'Stendhal',          ['stendhal'],                 'medium', '19th century',             'Literature', 'France'),
  e('alexandre-dumas',  'Alexandre Dumas',   ['dumas'],                    'easy',   '19th century',             'Literature', 'France'),
  e('flaubert',         'Gustave Flaubert',  ['flaubert'],                 'medium', '19th century',             'Literature', 'France'),
  e('jules-verne',      'Jules Verne',       ['verne'],                    'easy',   '19th–20th century',        'Literature', 'France'),
  e('saint-exupery',    'Antoine de Saint-Exupéry',['saint-exupery'],      'medium', '20th century',             'Literature', 'France'),
  e('nikolai-gogol',    'Nikolai Gogol',     ['gogol'],                    'medium', '19th century',             'Literature', 'Russia'),

  // -- Philosophy + Science (25) --
  e('spinoza',          'Baruch Spinoza',    ['spinoza'],                  'medium', '17th century',             'Philosophy', 'Netherlands'),
  e('leibniz',          'Gottfried Wilhelm Leibniz',['leibniz'],           'medium', '17th–18th century',        'Philosophy', 'Germany'),
  e('john-locke',       'John Locke',        ['locke'],                    'medium', '17th–18th century',        'Philosophy', 'England'),
  e('david-hume',       'David Hume',        ['hume'],                     'medium', '18th century',             'Philosophy', 'Scotland'),
  e('jeremy-bentham',   'Jeremy Bentham',    ['bentham'],                  'medium', '18th–19th century',        'Philosophy', 'England'),
  e('john-stuart-mill', 'John Stuart Mill',  ['mill'],                     'medium', '19th century',             'Philosophy', 'England'),
  e('hannah-arendt',    'Hannah Arendt',     ['arendt'],                   'medium', '20th century',             'Philosophy', 'Germany / USA'),
  e('walter-benjamin',  'Walter Benjamin',   ['walter benjamin'],          'medium', '20th century',             'Philosophy', 'Germany'),
  e('michel-foucault',  'Michel Foucault',   ['foucault'],                 'medium', '20th century',             'Philosophy', 'France'),
  e('jacques-derrida',  'Jacques Derrida',   ['derrida'],                  'medium', '20th–21st century',        'Philosophy', 'France'),
  e('bertrand-russell', 'Bertrand Russell',  ['russell'],                  'medium', '20th century',             'Philosophy', 'England'),
  e('lavoisier',        'Antoine Lavoisier', ['lavoisier'],                'medium', '18th century',             'Chemistry', 'France'),
  e('louis-pasteur',    'Louis Pasteur',     ['pasteur'],                  'easy',   '19th century',             'Medicine', 'France'),
  e('edward-jenner',    'Edward Jenner',     ['jenner'],                   'medium', '18th–19th century',        'Medicine', 'England'),
  e('gregor-mendel',    'Gregor Mendel',     ['mendel'],                   'medium', '19th century',             'Genetics', 'Czech Lands / Austria'),
  e('michael-faraday',  'Michael Faraday',   ['faraday'],                  'medium', '19th century',             'Physics', 'England'),
  e('james-clerk-maxwell','James Clerk Maxwell',['maxwell'],               'medium', '19th century',             'Physics', 'Scotland'),
  e('lord-kelvin',      'William Thomson, Lord Kelvin',['kelvin'],         'medium', '19th–20th century',        'Physics', 'United Kingdom', 'William Thomson, 1st Baron Kelvin'),
  e('alan-turing',      'Alan Turing',       ['turing'],                   'easy',   '20th century',             'Mathematics', 'England'),
  e('kurt-godel',       'Kurt Gödel',        ['godel'],                    'medium', '20th century',             'Mathematics', 'Austria / USA'),
  e('paul-dirac',       'Paul Dirac',        ['dirac'],                    'medium', '20th century',             'Physics', 'England'),
  e('werner-heisenberg','Werner Heisenberg', ['heisenberg'],               'medium', '20th century',             'Physics', 'Germany'),
  e('lise-meitner',     'Lise Meitner',      ['meitner'],                  'medium', '20th century',             'Physics', 'Austria / Sweden'),
  e('ernest-rutherford','Ernest Rutherford', ['rutherford'],               'medium', '19th–20th century',        'Physics', 'New Zealand / UK'),
  e('robert-koch',      'Robert Koch',       ['koch'],                     'medium', '19th–20th century',        'Medicine', 'Germany'),

  // ============================================================
  // ANCIENT / CLASSICAL
  // ============================================================

  // -- Greek (20) --
  e('socrates',         'Socrates',          ['socrates'],                 'easy',   'Ancient',                  'Philosophy', 'Greece'),
  e('plato',            'Plato',             ['plato'],                    'easy',   'Ancient',                  'Philosophy', 'Greece'),
  e('aristotle',        'Aristotle',         ['aristotle'],                'easy',   'Ancient',                  'Philosophy', 'Greece'),
  e('pythagoras',       'Pythagoras',        ['pythagoras'],               'easy',   'Ancient',                  'Mathematics', 'Greece'),
  e('hippocrates',      'Hippocrates',       ['hippocrates'],              'medium', 'Ancient',                  'Medicine', 'Greece'),
  e('euclid',           'Euclid',            ['euclid'],                   'medium', 'Ancient',                  'Mathematics', 'Greece'),
  e('archimedes',       'Archimedes',        ['archimedes'],               'easy',   'Ancient',                  'Mathematics', 'Greece'),
  e('pericles',         'Pericles',          ['pericles'],                 'medium', 'Ancient',                  'Politics', 'Greece'),
  e('homer',            'Homer',             ['homer'],                    'medium', 'Ancient',                  'Poetry', 'Greece'),
  e('sappho',           'Sappho',            ['sappho'],                   'medium', 'Ancient',                  'Poetry', 'Greece'),
  e('aeschylus',        'Aeschylus',         ['aeschylus'],                'hard',   'Ancient',                  'Literature', 'Greece'),
  e('sophocles',        'Sophocles',         ['sophocles'],                'medium', 'Ancient',                  'Literature', 'Greece'),
  e('euripides',        'Euripides',         ['euripides'],                'medium', 'Ancient',                  'Literature', 'Greece'),
  e('aristophanes',     'Aristophanes',      ['aristophanes'],             'hard',   'Ancient',                  'Literature', 'Greece'),
  e('plutarch',         'Plutarch',          ['plutarch'],                 'medium', 'Ancient',                  'Literature', 'Greece'),
  e('herodotus',        'Herodotus',         ['herodotus'],                'medium', 'Ancient',                  'Literature', 'Greece'),
  e('thucydides',       'Thucydides',        ['thucydides'],               'medium', 'Ancient',                  'Literature', 'Greece'),
  e('diogenes',         'Diogenes',          ['diogenes'],                 'medium', 'Ancient',                  'Philosophy', 'Greece'),
  e('epicurus',         'Epicurus',          ['epicurus'],                 'medium', 'Ancient',                  'Philosophy', 'Greece'),
  e('alexander-the-great','Alexander the Great',['alexander'],             'easy',   'Ancient',                  'Military', 'Macedon / Greece'),

  // -- Roman (20) --
  e('julius-caesar',    'Julius Caesar',     ['caesar'],                   'easy',   'Ancient',                  'Politics', 'Rome'),
  e('augustus',         'Augustus',          ['octavian'],                 'easy',   'Ancient',                  'Royalty', 'Rome'),
  e('nero',             'Nero',              ['nero'],                     'medium', 'Ancient',                  'Royalty', 'Rome'),
  e('caligula',         'Caligula',          ['caligula'],                 'medium', 'Ancient',                  'Royalty', 'Rome'),
  e('trajan',           'Trajan',            ['trajan'],                   'medium', 'Ancient',                  'Royalty', 'Rome'),
  e('hadrian',          'Hadrian',           ['hadrian'],                  'medium', 'Ancient',                  'Royalty', 'Rome'),
  e('marcus-aurelius',  'Marcus Aurelius',   ['aurelius'],                 'easy',   'Ancient',                  'Philosophy', 'Rome'),
  e('constantine',      'Constantine the Great',['constantine'],           'medium', 'Ancient',                  'Royalty', 'Rome'),
  e('cicero',           'Cicero',            ['cicero'],                   'medium', 'Ancient',                  'Politics', 'Rome'),
  e('virgil',           'Virgil',            ['virgil'],                   'medium', 'Ancient',                  'Poetry', 'Rome'),
  e('ovid',             'Ovid',              ['ovid'],                     'medium', 'Ancient',                  'Poetry', 'Rome'),
  e('horace',           'Horace',            ['horace'],                   'medium', 'Ancient',                  'Poetry', 'Rome'),
  e('livy',             'Livy',              ['livy'],                     'medium', 'Ancient',                  'Literature', 'Rome'),
  e('tacitus',          'Tacitus',           ['tacitus'],                  'medium', 'Ancient',                  'Literature', 'Rome'),
  e('seneca',           'Seneca the Younger',['seneca'],                   'medium', 'Ancient',                  'Philosophy', 'Rome'),
  e('mark-antony',      'Mark Antony',       ['marc antony'],              'medium', 'Ancient',                  'Politics', 'Rome'),
  e('pompey',           'Pompey',            ['pompey the great'],         'medium', 'Ancient',                  'Politics', 'Rome'),
  e('spartacus',        'Spartacus',         ['spartacus'],                'easy',   'Ancient',                  'Military', 'Thrace / Rome'),
  e('hannibal',         'Hannibal',          ['hannibal barca'],           'easy',   'Ancient',                  'Military', 'Carthage'),
  e('boudica',          'Boudica',           ['boudicca'],                 'medium', 'Ancient',                  'Military', 'Britain'),

  // ============================================================
  // OCEANIA + UNDERREPRESENTED
  // ============================================================

  e('captain-cook',     'James Cook',        ['captain cook'],             'medium', '18th century',             'Exploration', 'England / Oceania'),
  e('eddie-mabo',       'Eddie Mabo',        ['eddie mabo'],               'hard',   '20th century',             'Politics', 'Australia'),
  e('queen-liliuokalani','Liliʻuokalani',    ['liliuokalani'],             'medium', '19th–20th century',        'Royalty', 'Hawaii'),
  e('kamehameha-i',     'Kamehameha I',      ['kamehameha'],               'medium', '18th–19th century',        'Royalty', 'Hawaii'),
  e('queen-pomare-iv',  'Pōmare IV',         ['pomare iv'],                'hard',   '19th century',             'Royalty', 'Tahiti', 'Pōmare IV'),

  // -- A few more Americas (15) --
  e('frederick-douglass','Frederick Douglass',['douglass'],                'easy',   '19th century',             'Politics', 'USA'),
  e('sojourner-truth',  'Sojourner Truth',   ['sojourner truth'],          'medium', '19th century',             'Politics', 'USA'),
  e('ida-b-wells',      'Ida B. Wells',      ['ida wells'],                'medium', '19th–20th century',        'Politics', 'USA',       'Ida B. Wells'),
  e('w-e-b-du-bois',    'W. E. B. Du Bois',  ['du bois'],                  'medium', '19th–20th century',        'Philosophy', 'USA',     'W. E. B. Du Bois'),
  e('booker-t-washington','Booker T. Washington',['booker washington'],    'medium', '19th–20th century',        'Politics', 'USA',       'Booker T. Washington'),
  e('marcus-garvey',    'Marcus Garvey',     ['garvey'],                   'medium', '20th century',             'Politics', 'Jamaica / USA'),
  e('jesse-owens',      'Jesse Owens',       ['owens'],                    'medium', '20th century',             'Sports', 'USA'),
  e('joe-louis',        'Joe Louis',         ['joe louis'],                'medium', '20th century',             'Sports', 'USA'),
  e('arthur-ashe',      'Arthur Ashe',       ['arthur ashe'],              'medium', '20th century',             'Sports', 'USA'),
  e('ralph-ellison',    'Ralph Ellison',     ['ellison'],                  'medium', '20th century',             'Literature', 'USA'),
  e('langston-hughes',  'Langston Hughes',   ['hughes'],                   'medium', '20th century',             'Poetry', 'USA'),
  e('zora-neale-hurston','Zora Neale Hurston',['zora hurston'],            'medium', '20th century',             'Literature', 'USA'),
  e('billie-holiday',   'Billie Holiday',    ['lady day'],                 'easy',   '20th century',             'Music', 'USA'),
  e('thurgood-marshall','Thurgood Marshall', ['marshall'],                 'medium', '20th century',             'Politics', 'USA'),
  e('robert-f-kennedy', 'Robert F. Kennedy', ['rfk', 'bobby kennedy'],     'medium', '20th century',             'Politics', 'USA',       'Robert F. Kennedy'),
];

// ---- Wikipedia helpers (same shape as seedNewEasy.mjs) -----------------

async function fetchWikipediaImageUrl(title) {
  const encoded = encodeURIComponent(title.replace(/ /g, '_'));
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'PFH-seed/1.0 (peoplefromhistorygame@gmail.com)',
      Accept: 'application/json',
    },
    redirect: 'follow',
  });
  if (!res.ok) return { url: null, reason: `HTTP ${res.status}` };
  const data = await res.json();
  if (data.type === 'disambiguation') return { url: null, reason: 'disambiguation page' };
  const img = data?.originalimage?.source ?? data?.thumbnail?.source ?? null;
  return { url: img, reason: img ? null : 'no thumbnail' };
}

async function upsertFigure(row) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/figures`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
}

async function fetchExistingIds() {
  const ids = new Set();
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const to = from + pageSize - 1;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/figures?select=id`, {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        Range: `${from}-${to}`,
      },
    });
    if (!res.ok) throw new Error(`list HTTP ${res.status}`);
    const rows = await res.json();
    for (const r of rows) ids.add(r.id);
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return ids;
}

async function main() {
  let entries = SEED;
  if (only) entries = entries.filter((f) => f.id.toLowerCase().includes(only));
  if (newOnly) {
    const existing = await fetchExistingIds();
    const before = entries.length;
    entries = entries.filter((f) => !existing.has(f.id));
    console.log(`Skipping ${before - entries.length} ids already in DB.`);
  }
  console.log(`${entries.length} diversity additions${dryRun ? ' (DRY RUN)' : ''}${only ? ` (filter: ${only})` : ''}\n`);

  let ok = 0;
  let noImage = 0;
  let failed = 0;

  for (let i = 0; i < entries.length; i++) {
    const fig = entries[i];
    const title = fig.wikipediaTitle ?? fig.name;
    let imageUrl = null;
    let reason = null;
    try {
      const r = await fetchWikipediaImageUrl(title);
      imageUrl = r.url;
      reason = r.reason;
    } catch (e) {
      reason = `fetch error: ${e.message}`;
    }

    const row = {
      id: fig.id,
      name: fig.name,
      aliases: fig.aliases,
      image_url: imageUrl,
      focal_x: 0.5,
      focal_y: 0.35,
      start_size: 0.15,
      focal_note: '',
      difficulty: fig.tier,
      era: fig.era,
      field: fig.field,
      region: fig.region,
      first_letter: fig.name[0].toUpperCase(),
      enabled: true,
    };

    const label = `[${String(i + 1).padStart(3, '0')}/${entries.length}] ${fig.id.padEnd(30)} ${fig.tier}`;

    if (dryRun) {
      console.log(`${label}  ${imageUrl ? 'OK' : 'NO-IMG'}` + (reason ? `  — ${reason}` : ''));
      if (imageUrl) ok++; else noImage++;
      await sleep(80);
      continue;
    }

    try {
      await upsertFigure(row);
      if (imageUrl) ok++;
      else noImage++;
      const tag = imageUrl ? 'OK' : 'NO-IMG';
      console.log(`${label}  ${tag}` + (reason ? `  — ${reason}` : ''));
    } catch (e) {
      failed++;
      console.log(`${label}  FAIL — ${e.message}`);
    }
    await sleep(100);
  }

  console.log(`\nDone. ok=${ok} no-image=${noImage} failed=${failed}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

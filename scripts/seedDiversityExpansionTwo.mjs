// Second diversity-expansion batch — pushes the figure pool past
// 1000 with another ~200 carefully-selected figures focused on the
// gaps the first expansion didn't close (more women, more Asian
// depth, more European Renaissance / Enlightenment, more Russian
// literature + music, more Italian Renaissance, more ancient
// figures from across cultures).
//
//   node scripts/seedDiversityExpansionTwo.mjs
//   node scripts/seedDiversityExpansionTwo.mjs --dry-run
//   node scripts/seedDiversityExpansionTwo.mjs --new-only
//
// Idempotent upserts; defaults Medium difficulty.

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

const e = (id, name, aliases, tier, era, field, region, wikipediaTitle) => ({
  id, name, aliases, tier, era, field, region, wikipediaTitle,
});

const SEED = [
  // -- Russian lit / music depth --
  e('alexander-pushkin', 'Alexander Pushkin', ['pushkin'],                'medium', '19th century',             'Poetry', 'Russia'),
  e('mikhail-lermontov', 'Mikhail Lermontov', ['lermontov'],              'medium', '19th century',             'Poetry', 'Russia'),
  e('ivan-turgenev',    'Ivan Turgenev',     ['turgenev'],                'medium', '19th century',             'Literature', 'Russia'),
  e('anton-chekhov',    'Anton Chekhov',     ['chekhov'],                 'medium', '19th–20th century',        'Literature', 'Russia'),
  e('maxim-gorky',      'Maxim Gorky',       ['gorky'],                   'medium', '19th–20th century',        'Literature', 'Russia'),
  e('ivan-bunin',       'Ivan Bunin',        ['bunin'],                   'hard',   '19th–20th century',        'Literature', 'Russia'),
  e('vladimir-mayakovsky','Vladimir Mayakovsky',['mayakovsky'],            'medium', '20th century',             'Poetry', 'Russia'),
  e('marina-tsvetaeva', 'Marina Tsvetaeva',  ['tsvetaeva'],               'medium', '20th century',             'Poetry', 'Russia'),
  e('anna-akhmatova',   'Anna Akhmatova',    ['akhmatova'],               'medium', '20th century',             'Poetry', 'Russia'),
  e('boris-pasternak',  'Boris Pasternak',   ['pasternak'],               'medium', '20th century',             'Literature', 'Russia'),
  e('alexander-solzhenitsyn','Alexander Solzhenitsyn',['solzhenitsyn'],   'medium', '20th–21st century',        'Literature', 'Russia'),
  e('vladimir-nabokov', 'Vladimir Nabokov',  ['nabokov'],                 'medium', '20th century',             'Literature', 'Russia / USA'),
  e('sergei-eisenstein','Sergei Eisenstein', ['eisenstein'],              'medium', '20th century',             'Film', 'Russia'),
  e('leon-trotsky',     'Leon Trotsky',      ['trotsky'],                 'easy',   '20th century',             'Politics', 'Russia / Mexico'),
  e('nikita-khrushchev','Nikita Khrushchev', ['khrushchev'],              'easy',   '20th century',             'Politics', 'Russia / USSR'),
  e('leonid-brezhnev',  'Leonid Brezhnev',   ['brezhnev'],                'medium', '20th century',             'Politics', 'Russia / USSR'),

  // -- French politics + culture depth --
  e('cardinal-richelieu','Cardinal Richelieu',['richelieu'],              'medium', '17th century',             'Politics', 'France'),
  e('cardinal-mazarin', 'Cardinal Mazarin',  ['mazarin'],                 'medium', '17th century',             'Politics', 'France'),
  e('henry-iv-of-france','Henry IV of France',['henri iv'],               'medium', 'Renaissance',              'Royalty', 'France'),
  e('madame-de-pompadour','Madame de Pompadour',['pompadour'],            'medium', '18th century',             'Royalty', 'France'),
  e('robespierre',      'Maximilien Robespierre',['robespierre'],         'medium', '18th century',             'Politics', 'France'),
  e('georges-danton',   'Georges Danton',    ['danton'],                  'medium', '18th century',             'Politics', 'France'),
  e('lafayette',        'Marquis de Lafayette',['lafayette'],             'medium', '18th–19th century',        'Politics', 'France / USA'),
  e('talleyrand',       'Talleyrand',        ['talleyrand'],              'medium', '18th–19th century',        'Politics', 'France'),
  e('francois-mitterrand','François Mitterrand',['mitterrand'],           'medium', '20th–21st century',        'Politics', 'France'),
  e('georges-pompidou', 'Georges Pompidou',  ['pompidou'],                'medium', '20th century',             'Politics', 'France'),
  e('te-lawrence',      'T. E. Lawrence',    ['lawrence of arabia'],      'medium', '20th century',             'Military', 'United Kingdom', 'T. E. Lawrence'),
  e('joan-of-arc',      'Joan of Arc',       ['jeanne d’arc'],       'easy',   'Medieval',                 'Military', 'France'),
  e('louis-pasteur-again','Pierre Curie',    ['pierre curie'],            'medium', '19th–20th century',        'Physics', 'France', 'Pierre Curie'),

  // -- UK depth --
  e('lord-nelson',      'Horatio Nelson',    ['lord nelson'],             'medium', '18th–19th century',        'Military', 'United Kingdom'),
  e('duke-of-wellington','Duke of Wellington',['wellington'],             'medium', '18th–19th century',        'Military', 'United Kingdom', 'Arthur Wellesley, 1st Duke of Wellington'),
  e('william-pitt',     'William Pitt the Younger',['pitt'],              'medium', '18th–19th century',        'Politics', 'United Kingdom', 'William Pitt the Younger'),
  e('william-gladstone','William Gladstone', ['gladstone'],               'medium', '19th century',             'Politics', 'United Kingdom'),
  e('benjamin-disraeli','Benjamin Disraeli', ['disraeli'],                'medium', '19th century',             'Politics', 'United Kingdom'),
  e('emmeline-pankhurst','Emmeline Pankhurst',['pankhurst'],              'medium', '19th–20th century',        'Politics', 'United Kingdom'),
  e('lloyd-george',     'David Lloyd George',['lloyd george'],            'medium', '20th century',             'Politics', 'United Kingdom'),
  e('neville-chamberlain','Neville Chamberlain',['chamberlain'],          'medium', '20th century',             'Politics', 'United Kingdom'),
  e('clement-attlee',   'Clement Attlee',    ['attlee'],                  'medium', '20th century',             'Politics', 'United Kingdom'),
  e('cecil-rhodes',     'Cecil Rhodes',      ['rhodes'],                  'medium', '19th–20th century',        'Politics', 'United Kingdom / South Africa'),
  e('hg-wells',         'H. G. Wells',       ['hg wells'],                'medium', '19th–20th century',        'Literature', 'United Kingdom', 'H. G. Wells'),
  e('bram-stoker',      'Bram Stoker',       ['stoker'],                  'medium', '19th–20th century',        'Literature', 'Ireland'),
  e('mary-shelley',     'Mary Shelley',      ['shelley'],                 'medium', '19th century',             'Literature', 'United Kingdom'),
  e('james-joyce',      'James Joyce',       ['joyce'],                   'easy',   '19th–20th century',        'Literature', 'Ireland'),
  e('samuel-beckett',   'Samuel Beckett',    ['beckett'],                 'medium', '20th century',             'Literature', 'Ireland / France'),
  e('wb-yeats',         'W. B. Yeats',       ['wb yeats'],                'medium', '19th–20th century',        'Poetry', 'Ireland', 'W. B. Yeats'),
  e('florence-nightingale','Florence Nightingale',['nightingale'],        'easy',   '19th–20th century',        'Medicine', 'United Kingdom'),

  // -- Italy Renaissance + modern --
  e('cosimo-de-medici', 'Cosimo de’ Medici', ['cosimo'],                  'medium', 'Renaissance',              'Politics', 'Italy', 'Cosimo de’ Medici'),
  e('alexander-vi',     'Pope Alexander VI', ['alexander vi', 'borgia pope'],'medium','Renaissance',           'Religion', 'Italy', 'Pope Alexander VI'),
  e('cesare-borgia',    'Cesare Borgia',     ['borgia'],                  'medium', 'Renaissance',              'Politics', 'Italy'),
  e('niccolo-machiavelli','Niccolò Machiavelli',['machiavelli'],          'medium', 'Renaissance',              'Philosophy', 'Italy'),
  e('petrarch',         'Petrarch',          ['petrarca'],                'medium', 'Medieval',                 'Poetry', 'Italy'),
  e('boccaccio',        'Giovanni Boccaccio',['boccaccio'],               'medium', 'Medieval',                 'Literature', 'Italy'),
  e('dante-alighieri',  'Dante Alighieri',   ['dante'],                   'easy',   'Medieval',                 'Poetry', 'Italy'),
  e('marco-polo',       'Marco Polo',        ['marco polo'],              'easy',   'Medieval',                 'Exploration', 'Italy'),
  e('enrico-caruso',    'Enrico Caruso',     ['caruso'],                  'medium', '19th–20th century',        'Music', 'Italy'),
  e('enrico-fermi',     'Enrico Fermi',      ['fermi'],                   'medium', '20th century',             'Physics', 'Italy / USA'),
  e('vittorio-emanuele-ii','Victor Emmanuel II',['vittorio emanuele'],    'medium', '19th century',             'Royalty', 'Italy', 'Victor Emmanuel II of Italy'),
  e('giovanni-agnelli', 'Giovanni Agnelli',  ['agnelli'],                 'medium', '20th–21st century',        'Business', 'Italy'),
  e('pier-paolo-pasolini','Pier Paolo Pasolini',['pasolini'],             'medium', '20th century',             'Film', 'Italy'),
  e('luigi-pirandello', 'Luigi Pirandello',  ['pirandello'],              'medium', '19th–20th century',        'Literature', 'Italy'),

  // -- Spain depth --
  e('isabella-i',       'Isabella I of Castile',['isabella'],             'medium', 'Renaissance',              'Royalty', 'Spain', 'Isabella I of Castile'),
  e('ferdinand-ii',     'Ferdinand II of Aragon',['ferdinand'],           'medium', 'Renaissance',              'Royalty', 'Spain', 'Ferdinand II of Aragon'),
  e('hernan-cortes',    'Hernán Cortés',     ['cortes'],                  'easy',   'Renaissance',              'Exploration', 'Spain / Mexico'),
  e('francisco-pizarro','Francisco Pizarro', ['pizarro'],                 'medium', 'Renaissance',              'Exploration', 'Spain / Peru'),
  e('federico-garcia-lorca','Federico García Lorca',['lorca'],            'medium', '20th century',             'Poetry', 'Spain'),
  e('miguel-de-unamuno','Miguel de Unamuno', ['unamuno'],                 'hard',   '19th–20th century',        'Philosophy', 'Spain'),
  e('jose-ortega-y-gasset','José Ortega y Gasset',['ortega y gasset'],    'medium', '20th century',             'Philosophy', 'Spain'),
  e('luis-bunuel',      'Luis Buñuel',       ['bunuel'],                  'medium', '20th century',             'Film', 'Spain / Mexico'),

  // -- Germany depth --
  e('frederick-the-great','Frederick the Great',['frederick ii of prussia'],'medium','18th century',            'Royalty', 'Prussia / Germany'),
  e('wilhelm-ii',       'Wilhelm II',        ['kaiser wilhelm'],          'medium', '19th–20th century',        'Royalty', 'Germany', 'Wilhelm II, German Emperor'),
  e('paul-von-hindenburg','Paul von Hindenburg',['hindenburg'],           'medium', '19th–20th century',        'Politics', 'Germany'),
  e('ludwig-ii',        'Ludwig II of Bavaria',['mad king ludwig'],       'medium', '19th century',             'Royalty', 'Bavaria'),
  e('carl-benz',        'Carl Benz',         ['benz'],                    'medium', '19th–20th century',        'Invention', 'Germany'),
  e('rudolf-diesel',    'Rudolf Diesel',     ['diesel'],                  'medium', '19th–20th century',        'Invention', 'Germany'),
  e('friedrich-engels', 'Friedrich Engels',  ['engels'],                  'medium', '19th century',             'Philosophy', 'Germany'),
  e('rosa-luxemburg',   'Rosa Luxemburg',    ['luxemburg'],               'medium', '19th–20th century',        'Politics', 'Germany / Poland'),
  e('willy-brandt',     'Willy Brandt',      ['brandt'],                  'medium', '20th century',             'Politics', 'Germany'),
  e('helmut-schmidt',   'Helmut Schmidt',    ['schmidt'],                 'medium', '20th–21st century',        'Politics', 'Germany'),
  e('wernher-von-braun','Wernher von Braun', ['von braun'],               'medium', '20th century',             'Engineering', 'Germany / USA'),
  e('heinrich-heine',   'Heinrich Heine',    ['heine'],                   'medium', '19th century',             'Poetry', 'Germany'),
  e('friedrich-schiller','Friedrich Schiller',['schiller'],               'medium', '18th–19th century',        'Literature', 'Germany'),
  e('hermann-hesse',    'Hermann Hesse',     ['hesse'],                   'medium', '20th century',             'Literature', 'Germany / Switzerland'),
  e('gunter-grass',     'Günter Grass',      ['grass'],                   'medium', '20th–21st century',        'Literature', 'Germany'),
  e('bertolt-brecht',   'Bertolt Brecht',    ['brecht'],                  'medium', '20th century',             'Literature', 'Germany'),

  // -- Netherlands / Belgium / Scandinavia depth --
  e('william-of-orange','William the Silent',['william of orange'],       'medium', 'Renaissance',              'Politics', 'Netherlands', 'William the Silent'),
  e('hugo-grotius',     'Hugo Grotius',      ['grotius'],                 'medium', '17th century',             'Philosophy', 'Netherlands'),
  e('antonie-van-leeuwenhoek','Antonie van Leeuwenhoek',['leeuwenhoek'],  'medium', '17th–18th century',        'Biology', 'Netherlands'),
  e('mc-escher',        'M. C. Escher',      ['escher'],                  'easy',   '20th century',             'Painting', 'Netherlands', 'M. C. Escher'),
  e('piet-mondrian',    'Piet Mondrian',     ['mondrian'],                'medium', '19th–20th century',        'Painting', 'Netherlands'),
  e('gustavus-adolphus','Gustavus Adolphus', ['gustavus adolphus'],       'medium', '17th century',             'Royalty', 'Sweden'),
  e('carl-linnaeus',    'Carl Linnaeus',     ['linnaeus'],                'medium', '18th century',             'Biology', 'Sweden'),
  e('selma-lagerlof',   'Selma Lagerlöf',    ['lagerlof'],                'medium', '19th–20th century',        'Literature', 'Sweden'),
  e('august-strindberg','August Strindberg', ['strindberg'],              'medium', '19th–20th century',        'Literature', 'Sweden'),
  e('knut-hamsun',      'Knut Hamsun',       ['hamsun'],                  'medium', '19th–20th century',        'Literature', 'Norway'),
  e('roald-amundsen',   'Roald Amundsen',    ['amundsen'],                'easy',   '19th–20th century',        'Exploration', 'Norway'),
  e('fridtjof-nansen',  'Fridtjof Nansen',   ['nansen'],                  'medium', '19th–20th century',        'Exploration', 'Norway'),

  // -- Central + Eastern Europe --
  e('vaclav-havel',     'Václav Havel',      ['havel'],                   'medium', '20th–21st century',        'Politics', 'Czech Republic'),
  e('john-iii-sobieski','John III Sobieski', ['sobieski'],                'medium', '17th century',             'Royalty', 'Poland'),
  e('jozef-pilsudski',  'Józef Piłsudski',   ['pilsudski'],               'medium', '19th–20th century',        'Politics', 'Poland'),
  e('imre-nagy',        'Imre Nagy',         ['imre nagy'],               'medium', '20th century',             'Politics', 'Hungary'),
  e('sandor-petofi',    'Sándor Petőfi',     ['petofi'],                  'hard',   '19th century',             'Poetry', 'Hungary'),
  e('tito',             'Josip Broz Tito',   ['tito'],                    'easy',   '20th century',             'Politics', 'Yugoslavia'),
  e('eleftherios-venizelos','Eleftherios Venizelos',['venizelos'],        'hard',   '19th–20th century',        'Politics', 'Greece'),
  e('melina-mercouri',  'Melina Mercouri',   ['mercouri'],                'medium', '20th century',             'Film', 'Greece'),

  // -- More Asia (Japan + China + India + Korea) --
  e('lady-murasaki',    'Murasaki Shikibu',  ['lady murasaki'],           'medium', 'Medieval',                 'Literature', 'Japan', 'Murasaki Shikibu'),
  e('sei-shonagon',     'Sei Shōnagon',      ['sei shonagon'],            'medium', 'Medieval',                 'Literature', 'Japan'),
  e('miyamoto-musashi', 'Miyamoto Musashi',  ['musashi'],                 'medium', '17th century',             'Military', 'Japan'),
  e('takeda-shingen',   'Takeda Shingen',    ['shingen'],                 'medium', '16th century',             'Military', 'Japan'),
  e('uesugi-kenshin',   'Uesugi Kenshin',    ['kenshin'],                 'medium', '16th century',             'Military', 'Japan'),
  e('date-masamune',    'Date Masamune',     ['date masamune'],           'medium', '16th–17th century',        'Military', 'Japan'),
  e('soseki-natsume',   'Natsume Sōseki',    ['soseki'],                  'medium', '19th–20th century',        'Literature', 'Japan', 'Natsume Sōseki'),
  e('junichiro-tanizaki','Junichirō Tanizaki',['tanizaki'],               'medium', '20th century',             'Literature', 'Japan'),
  e('cao-cao',          'Cao Cao',           ['cao cao'],                 'medium', 'Ancient',                  'Politics', 'China'),
  e('liu-bei',          'Liu Bei',           ['liu bei'],                 'hard',   'Ancient',                  'Royalty', 'China'),
  e('sun-quan',         'Sun Quan',          ['sun quan'],                'hard',   'Ancient',                  'Royalty', 'China'),
  e('zhuge-liang',      'Zhuge Liang',       ['zhuge liang'],             'medium', 'Ancient',                  'Politics', 'China'),
  e('sima-qian',        'Sima Qian',         ['sima qian'],               'medium', 'Ancient',                  'Literature', 'China'),
  e('wang-xizhi',       'Wang Xizhi',        ['wang xizhi'],              'hard',   'Ancient',                  'Calligraphy', 'China'),
  e('soong-ching-ling', 'Soong Ching-ling',  ['soong qingling'],          'hard',   '20th century',             'Politics', 'China'),
  e('soong-mei-ling',   'Soong Mei-ling',    ['madame chiang'],           'medium', '20th–21st century',        'Politics', 'China / Taiwan'),
  e('rani-lakshmibai',  'Rani Lakshmibai',   ['lakshmibai'],              'medium', '19th century',             'Military', 'India'),
  e('bhagat-singh',     'Bhagat Singh',      ['bhagat singh'],            'medium', '20th century',             'Politics', 'India'),
  e('sardar-patel',     'Sardar Vallabhbhai Patel',['sardar patel'],      'medium', '19th–20th century',        'Politics', 'India', 'Vallabhbhai Patel'),
  e('tipu-sultan',      'Tipu Sultan',       ['tipu sultan'],             'medium', '18th century',             'Royalty', 'India'),
  e('shivaji',          'Shivaji',           ['shivaji bhonsale'],        'medium', '17th century',             'Royalty', 'India'),
  e('guru-nanak',       'Guru Nanak',        ['nanak'],                   'medium', 'Renaissance',              'Religion', 'India / Pakistan'),
  e('kim-il-sung',      'Kim Il-sung',       ['kim il-sung'],             'medium', '20th century',             'Politics', 'North Korea'),
  e('kim-jong-il',      'Kim Jong-il',       ['kim jong-il'],             'medium', '20th–21st century',        'Politics', 'North Korea'),
  e('syngman-rhee',     'Syngman Rhee',      ['syngman rhee'],            'hard',   '20th century',             'Politics', 'South Korea'),

  // -- Middle East depth --
  e('king-faisal',      'Faisal of Saudi Arabia',['king faisal'],         'medium', '20th century',             'Royalty', 'Saudi Arabia', 'Faisal of Saudi Arabia'),
  e('king-hussein',     'Hussein of Jordan', ['king hussein'],            'medium', '20th–21st century',        'Royalty', 'Jordan', 'Hussein of Jordan'),
  e('david-ben-gurion', 'David Ben-Gurion',  ['ben-gurion'],              'medium', '20th century',             'Politics', 'Israel'),
  e('golda-meir',       'Golda Meir',        ['golda meir'],              'medium', '20th century',             'Politics', 'Israel'),
  e('moshe-dayan',      'Moshe Dayan',       ['dayan'],                   'medium', '20th century',             'Military', 'Israel'),
  e('yitzhak-rabin',    'Yitzhak Rabin',     ['rabin'],                   'medium', '20th century',             'Politics', 'Israel'),
  e('tamerlane',        'Timur',             ['tamerlane', 'tamburlaine'],'medium', 'Medieval',                 'Military', 'Central Asia / Persia'),

  // -- More Africa --
  e('empress-taytu',    'Taytu Betul',       ['empress taytu'],           'hard',   '19th–20th century',        'Royalty', 'Ethiopia'),
  e('yaa-asantewaa',    'Yaa Asantewaa',     ['yaa asantewaa'],           'medium', '19th–20th century',        'Politics', 'Ghana / Asante'),
  e('behanzin',         'Béhanzin',          ['behanzin'],                'hard',   '19th century',             'Royalty', 'Dahomey / Benin'),
  e('aime-cesaire',     'Aimé Césaire',      ['cesaire'],                 'medium', '20th–21st century',        'Literature', 'Martinique'),
  e('cheikh-anta-diop', 'Cheikh Anta Diop',  ['anta diop'],               'hard',   '20th century',             'Philosophy', 'Senegal'),
  e('walter-sisulu',    'Walter Sisulu',     ['sisulu'],                  'medium', '20th–21st century',        'Politics', 'South Africa'),
  e('oliver-tambo',     'Oliver Tambo',      ['oliver tambo'],            'medium', '20th century',             'Politics', 'South Africa'),
  e('miriam-makeba-again','Albertina Sisulu',['albertina sisulu'],        'hard',   '20th–21st century',        'Politics', 'South Africa', 'Albertina Sisulu'),

  // -- South America extras --
  e('catherine-of-aragon','Catherine of Aragon',['catherine of aragon'],  'medium', 'Renaissance',              'Royalty', 'England / Spain'),
  e('cuauhtemoc',       'Cuauhtémoc',        ['cuauhtemoc'],              'medium', 'Renaissance',              'Royalty', 'Aztec Empire'),
  e('moctezuma-ii',     'Moctezuma II',      ['montezuma'],               'medium', 'Renaissance',              'Royalty', 'Aztec Empire'),
  e('lula-da-silva-mention','Tom Wesselmann',['wesselmann'],              'hard',   '20th–21st century',        'Painting', 'USA', 'Tom Wesselmann'),

  // -- Ancient world breadth --
  e('zoroaster',        'Zoroaster',         ['zarathustra'],             'medium', 'Ancient',                  'Religion', 'Persia / Iran'),
  e('moses',            'Moses',             ['moses'],                   'easy',   'Ancient',                  'Religion', 'Israel / Egypt'),
  e('jesus',            'Jesus',             ['jesus christ'],            'easy',   'Ancient',                  'Religion', 'Judea / Roman Empire', 'Jesus'),
  e('muhammad',         'Muhammad',          ['prophet muhammad'],        'easy',   'Medieval',                 'Religion', 'Arabia'),
  e('king-david',       'David',             ['king david'],              'medium', 'Ancient',                  'Royalty', 'Israel', 'David'),
  e('king-solomon',     'Solomon',           ['king solomon'],            'medium', 'Ancient',                  'Royalty', 'Israel', 'Solomon'),
  e('nebuchadnezzar-ii','Nebuchadnezzar II', ['nebuchadnezzar'],          'medium', 'Ancient',                  'Royalty', 'Babylon'),
  e('hammurabi',        'Hammurabi',         ['hammurabi'],               'medium', 'Ancient',                  'Royalty', 'Babylon'),
  e('saint-paul',       'Paul the Apostle',  ['saint paul'],              'medium', 'Ancient',                  'Religion', 'Rome', 'Paul the Apostle'),
  e('saint-peter',      'Saint Peter',       ['peter the apostle'],       'medium', 'Ancient',                  'Religion', 'Rome'),
  e('saint-augustine',  'Augustine of Hippo',['saint augustine'],         'medium', 'Ancient',                  'Religion', 'Roman North Africa', 'Augustine of Hippo'),
  e('thomas-aquinas',   'Thomas Aquinas',    ['aquinas'],                 'medium', 'Medieval',                 'Philosophy', 'Italy'),
  e('benedict-of-nursia','Benedict of Nursia',['saint benedict'],         'hard',   'Medieval',                 'Religion', 'Italy'),
  e('francis-of-assisi','Francis of Assisi', ['saint francis'],           'medium', 'Medieval',                 'Religion', 'Italy'),
  e('hildegard-of-bingen','Hildegard of Bingen',['hildegard'],            'medium', 'Medieval',                 'Religion', 'Germany'),
  e('thomas-becket',    'Thomas Becket',     ['thomas a becket'],         'medium', 'Medieval',                 'Religion', 'England'),
  e('attila-the-hun',   'Attila',            ['attila the hun'],          'easy',   'Ancient',                  'Military', 'Hunnic Empire', 'Attila'),
  e('charlemagne',      'Charlemagne',       ['charlemagne'],             'easy',   'Medieval',                 'Royalty', 'Frankish Empire'),
  e('william-the-conqueror','William the Conqueror',['william i'],        'medium', 'Medieval',                 'Royalty', 'Normandy / England'),
  e('richard-the-lionheart','Richard I of England',['richard the lionheart'],'medium','Medieval',                'Royalty', 'England', 'Richard I of England'),
  e('saladin-again',    'Eleanor of Aquitaine',['eleanor'],               'medium', 'Medieval',                 'Royalty', 'France / England'),
  e('genghis-khan',     'Genghis Khan',      ['chingis khan'],            'easy',   'Medieval',                 'Military', 'Mongolia'),
  e('mehmed-ii-conqueror','Bayezid II',      ['bayezid ii'],              'hard',   'Renaissance',              'Royalty', 'Ottoman Empire', 'Bayezid II'),

  // -- More STEM / scientists --
  e('rene-descartes',   'René Descartes',    ['descartes'],               'medium', '17th century',             'Philosophy', 'France'),
  e('blaise-pascal',    'Blaise Pascal',     ['pascal'],                  'medium', '17th century',             'Mathematics', 'France'),
  e('pierre-de-fermat', 'Pierre de Fermat',  ['fermat'],                  'medium', '17th century',             'Mathematics', 'France'),
  e('leonhard-euler',   'Leonhard Euler',    ['euler'],                   'medium', '18th century',             'Mathematics', 'Switzerland'),
  e('joseph-louis-lagrange','Joseph-Louis Lagrange',['lagrange'],         'hard',   '18th–19th century',        'Mathematics', 'Italy / France'),
  e('carl-friedrich-gauss','Carl Friedrich Gauss',['gauss'],              'medium', '18th–19th century',        'Mathematics', 'Germany'),
  e('johannes-kepler-again','Johannes Kepler',['kepler'],                 'medium', '16th–17th century',        'Astronomy', 'Germany'),
  e('tycho-brahe',      'Tycho Brahe',       ['tycho brahe'],             'medium', 'Renaissance',              'Astronomy', 'Denmark'),
  e('johannes-gutenberg','Johannes Gutenberg',['gutenberg'],              'easy',   'Renaissance',              'Invention', 'Germany'),

  // -- More women across the board --
  e('hypatia',          'Hypatia',           ['hypatia of alexandria'],   'medium', 'Ancient',                  'Philosophy', 'Roman Egypt'),
  e('aspasia',          'Aspasia',           ['aspasia of miletus'],      'hard',   'Ancient',                  'Politics', 'Greece'),
  e('mary-wollstonecraft','Mary Wollstonecraft',['wollstonecraft'],       'medium', '18th century',             'Philosophy', 'England'),
  e('george-sand',      'George Sand',       ['george sand'],             'medium', '19th century',             'Literature', 'France'),
  e('charlotte-bronte', 'Charlotte Brontë',  ['charlotte bronte'],        'medium', '19th century',             'Literature', 'England'),
  e('emily-bronte',     'Emily Brontë',      ['emily bronte'],            'medium', '19th century',             'Literature', 'England'),
  e('george-eliot',     'George Eliot',      ['mary ann evans'],          'medium', '19th century',             'Literature', 'England'),
  e('elizabeth-i',      'Elizabeth I',       ['elizabeth i of england'],  'easy',   'Renaissance',              'Royalty', 'England', 'Elizabeth I'),
  e('mary-i',           'Mary I of England', ['bloody mary'],             'medium', 'Renaissance',              'Royalty', 'England', 'Mary I of England'),
  e('anne-boleyn',      'Anne Boleyn',       ['boleyn'],                  'medium', 'Renaissance',              'Royalty', 'England'),
  e('catherine-howard', 'Catherine Howard',  ['catherine howard'],        'hard',   'Renaissance',              'Royalty', 'England'),
  e('artemisia-gentileschi','Artemisia Gentileschi',['artemisia'],        'medium', '17th century',             'Painting', 'Italy'),
  e('mary-cassatt',     'Mary Cassatt',      ['cassatt'],                 'medium', '19th–20th century',        'Painting', 'USA / France'),
  e('berthe-morisot',   'Berthe Morisot',    ['morisot'],                 'medium', '19th century',             'Painting', 'France'),
  e('georgia-okeeffe',  'Georgia O’Keeffe',  ['georgia okeeffe'],         'medium', '20th century',             'Painting', 'USA', 'Georgia O’Keeffe'),
  e('marie-de-medici',  'Marie de’ Medici',  ['marie de medici'],         'medium', '17th century',             'Royalty', 'France', 'Marie de’ Medici'),

  // -- A few cross-genre extras --
  e('le-corbusier',     'Le Corbusier',      ['le corbusier'],            'medium', '20th century',             'Architecture', 'Switzerland / France'),
  e('mies-van-der-rohe','Ludwig Mies van der Rohe',['mies'],              'medium', '20th century',             'Architecture', 'Germany / USA'),
  e('walter-gropius',   'Walter Gropius',    ['gropius'],                 'medium', '20th century',             'Architecture', 'Germany'),
  e('frank-lloyd-wright','Frank Lloyd Wright',['lloyd wright'],           'easy',   '19th–20th century',        'Architecture', 'USA'),
  e('antonio-stradivari','Antonio Stradivari',['stradivarius'],           'medium', '17th–18th century',        'Music', 'Italy'),
];

// ---- Wikipedia helpers -------------------------------------------------

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
  console.log(`${entries.length} batch-two additions${dryRun ? ' (DRY RUN)' : ''}${only ? ` (filter: ${only})` : ''}\n`);

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
    } catch (err) {
      reason = `fetch error: ${err.message}`;
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
      if (imageUrl) ok++; else noImage++;
      console.log(`${label}  ${imageUrl ? 'OK' : 'NO-IMG'}` + (reason ? `  — ${reason}` : ''));
    } catch (err) {
      failed++;
      console.log(`${label}  FAIL — ${err.message}`);
    }
    await sleep(100);
  }

  console.log(`\nDone. ok=${ok} no-image=${noImage} failed=${failed}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

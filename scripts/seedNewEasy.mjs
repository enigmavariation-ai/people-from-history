// One-shot seed: 150 additional household-name figures, all flagged
// `easy`. Each row is inserted with a Wikipedia-resolved image URL
// (via the page summary endpoint) and default focal coords
// (0.5, 0.35). Run once; idempotent thanks to upsert.
//
//   node scripts/seedNewEasy.mjs
//   node scripts/seedNewEasy.mjs --dry-run    # don't write to Supabase
//   node scripts/seedNewEasy.mjs --only=hendrix
//
// After this, run:
//   node scripts/mirrorImages.mjs            # copy new images to Storage
//   node scripts/backfillSummaries.mjs       # add Wikipedia summaries

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

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const onlyArg = args.find((a) => a.startsWith('--only='));
const only = onlyArg ? onlyArg.slice('--only='.length).toLowerCase() : null;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!dryRun) {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local.');
    process.exit(1);
  }
}

const SEED = [
  // ==========================================================================
  // EASY — household-name additions (150)
  // Each is deceased and has a recognizable portrait at the population
  // level. Decade of death noted only when 21st century to make
  // recency obvious.
  // ==========================================================================

  // --- Rock / pop musicians (25) ---
  { id: 'jimi-hendrix', name: 'Jimi Hendrix', aliases: ['hendrix'], era: '20th century', field: 'Music', region: 'USA' },
  { id: 'janis-joplin', name: 'Janis Joplin', aliases: ['joplin'], era: '20th century', field: 'Music', region: 'USA' },
  { id: 'jim-morrison', name: 'Jim Morrison', aliases: ['morrison'], era: '20th century', field: 'Music', region: 'USA' },
  { id: 'kurt-cobain', name: 'Kurt Cobain', aliases: ['cobain'], era: '20th century', field: 'Music', region: 'USA' },
  { id: 'george-harrison', name: 'George Harrison', aliases: ['harrison'], era: '20th century', field: 'Music', region: 'United Kingdom' },
  { id: 'buddy-holly', name: 'Buddy Holly', aliases: ['holly'], era: '20th century', field: 'Music', region: 'USA' },
  { id: 'johnny-cash', name: 'Johnny Cash', aliases: ['johnny cash'], era: '20th century', field: 'Music', region: 'USA' },
  { id: 'marvin-gaye', name: 'Marvin Gaye', aliases: ['gaye'], era: '20th century', field: 'Music', region: 'USA' },
  { id: 'tina-turner', name: 'Tina Turner', aliases: ['tina'], era: '21st century', field: 'Music', region: 'USA' },
  { id: 'ray-charles', name: 'Ray Charles', aliases: ['ray charles'], era: '20th century', field: 'Music', region: 'USA' },
  { id: 'nat-king-cole', name: 'Nat King Cole', aliases: ['nat cole'], era: '20th century', field: 'Music', region: 'USA' },
  { id: 'otis-redding', name: 'Otis Redding', aliases: ['redding'], era: '20th century', field: 'Music', region: 'USA' },
  { id: 'sam-cooke', name: 'Sam Cooke', aliases: ['cooke'], era: '20th century', field: 'Music', region: 'USA' },
  { id: 'tupac-shakur', name: 'Tupac Shakur', aliases: ['2pac', 'tupac'], era: '20th century', field: 'Music', region: 'USA' },
  { id: 'notorious-big', name: 'The Notorious B.I.G.', aliases: ['biggie', 'notorious big'], wikipediaTitle: 'The Notorious B.I.G.', era: '20th century', field: 'Music', region: 'USA' },
  { id: 'amy-winehouse', name: 'Amy Winehouse', aliases: ['winehouse'], era: '21st century', field: 'Music', region: 'United Kingdom' },
  { id: 'george-michael', name: 'George Michael', aliases: ['george michael'], era: '21st century', field: 'Music', region: 'United Kingdom' },
  { id: 'tom-petty', name: 'Tom Petty', aliases: ['petty'], era: '21st century', field: 'Music', region: 'USA' },
  { id: 'eddie-van-halen', name: 'Eddie Van Halen', aliases: ['van halen'], era: '21st century', field: 'Music', region: 'USA' },
  { id: 'avicii', name: 'Avicii', aliases: ['tim bergling'], era: '21st century', field: 'Music', region: 'Sweden' },
  { id: 'bing-crosby', name: 'Bing Crosby', aliases: ['crosby'], era: '20th century', field: 'Music', region: 'USA' },
  { id: 'judy-garland', name: 'Judy Garland', aliases: ['garland'], era: '20th century', field: 'Music', region: 'USA' },
  { id: 'roy-orbison', name: 'Roy Orbison', aliases: ['orbison'], era: '20th century', field: 'Music', region: 'USA' },
  { id: 'dean-martin', name: 'Dean Martin', aliases: ['dean martin'], era: '20th century', field: 'Music', region: 'USA' },
  { id: 'john-denver', name: 'John Denver', aliases: ['denver'], era: '20th century', field: 'Music', region: 'USA' },

  // --- Hollywood golden age (25) ---
  { id: 'marlon-brando', name: 'Marlon Brando', aliases: ['brando'], era: '20th century', field: 'Film', region: 'USA' },
  { id: 'james-stewart', name: 'James Stewart', aliases: ['jimmy stewart'], wikipediaTitle: 'James Stewart (actor)', era: '20th century', field: 'Film', region: 'USA' },
  { id: 'henry-fonda', name: 'Henry Fonda', aliases: ['henry fonda'], era: '20th century', field: 'Film', region: 'USA' },
  { id: 'cary-grant', name: 'Cary Grant', aliases: ['cary grant'], era: '20th century', field: 'Film', region: 'United Kingdom / USA' },
  { id: 'clark-gable', name: 'Clark Gable', aliases: ['gable'], era: '20th century', field: 'Film', region: 'USA' },
  { id: 'grace-kelly', name: 'Grace Kelly', aliases: ['grace kelly'], era: '20th century', field: 'Film', region: 'USA / Monaco' },
  { id: 'elizabeth-taylor', name: 'Elizabeth Taylor', aliases: ['liz taylor'], era: '21st century', field: 'Film', region: 'USA' },
  { id: 'katharine-hepburn', name: 'Katharine Hepburn', aliases: ['katharine hepburn'], era: '21st century', field: 'Film', region: 'USA' },
  { id: 'ingrid-bergman', name: 'Ingrid Bergman', aliases: ['bergman'], era: '20th century', field: 'Film', region: 'Sweden' },
  { id: 'bette-davis', name: 'Bette Davis', aliases: ['bette davis'], era: '20th century', field: 'Film', region: 'USA' },
  { id: 'joan-crawford', name: 'Joan Crawford', aliases: ['joan crawford'], era: '20th century', field: 'Film', region: 'USA' },
  { id: 'vivien-leigh', name: 'Vivien Leigh', aliases: ['vivien leigh'], era: '20th century', field: 'Film', region: 'United Kingdom' },
  { id: 'greta-garbo', name: 'Greta Garbo', aliases: ['garbo'], era: '20th century', field: 'Film', region: 'Sweden' },
  { id: 'marlene-dietrich', name: 'Marlene Dietrich', aliases: ['dietrich'], era: '20th century', field: 'Film', region: 'Germany / USA' },
  { id: 'lauren-bacall', name: 'Lauren Bacall', aliases: ['bacall'], era: '21st century', field: 'Film', region: 'USA' },
  { id: 'ava-gardner', name: 'Ava Gardner', aliases: ['ava gardner'], era: '20th century', field: 'Film', region: 'USA' },
  { id: 'doris-day', name: 'Doris Day', aliases: ['doris day'], era: '21st century', field: 'Film', region: 'USA' },
  { id: 'shirley-temple', name: 'Shirley Temple', aliases: ['shirley temple'], era: '21st century', field: 'Film', region: 'USA' },
  { id: 'gene-kelly', name: 'Gene Kelly', aliases: ['gene kelly'], era: '20th century', field: 'Film', region: 'USA' },
  { id: 'fred-astaire', name: 'Fred Astaire', aliases: ['astaire'], era: '20th century', field: 'Film', region: 'USA' },
  { id: 'charlton-heston', name: 'Charlton Heston', aliases: ['heston'], era: '21st century', field: 'Film', region: 'USA' },
  { id: 'gregory-peck', name: 'Gregory Peck', aliases: ['peck'], era: '21st century', field: 'Film', region: 'USA' },
  { id: 'john-wayne', name: 'John Wayne', aliases: ['john wayne'], era: '20th century', field: 'Film', region: 'USA' },
  { id: 'steve-mcqueen', name: 'Steve McQueen', aliases: ['mcqueen'], wikipediaTitle: 'Steve McQueen', era: '20th century', field: 'Film', region: 'USA' },
  { id: 'paul-newman', name: 'Paul Newman', aliases: ['paul newman'], era: '21st century', field: 'Film', region: 'USA' },

  // --- Modern actors (10) ---
  { id: 'robin-williams', name: 'Robin Williams', aliases: ['robin williams'], era: '21st century', field: 'Film', region: 'USA' },
  { id: 'heath-ledger', name: 'Heath Ledger', aliases: ['heath ledger'], era: '21st century', field: 'Film', region: 'Australia' },
  { id: 'philip-seymour-hoffman', name: 'Philip Seymour Hoffman', aliases: ['hoffman'], era: '21st century', field: 'Film', region: 'USA' },
  { id: 'carrie-fisher', name: 'Carrie Fisher', aliases: ['carrie fisher'], era: '21st century', field: 'Film', region: 'USA' },
  { id: 'christopher-reeve', name: 'Christopher Reeve', aliases: ['reeve'], era: '21st century', field: 'Film', region: 'USA' },
  { id: 'patrick-swayze', name: 'Patrick Swayze', aliases: ['swayze'], era: '21st century', field: 'Film', region: 'USA' },
  { id: 'sean-connery', name: 'Sean Connery', aliases: ['connery'], era: '21st century', field: 'Film', region: 'Scotland' },
  { id: 'roger-moore', name: 'Roger Moore', aliases: ['roger moore'], era: '21st century', field: 'Film', region: 'United Kingdom' },
  { id: 'christopher-lee', name: 'Christopher Lee', aliases: ['christopher lee'], era: '21st century', field: 'Film', region: 'United Kingdom' },
  { id: 'james-gandolfini', name: 'James Gandolfini', aliases: ['gandolfini'], era: '21st century', field: 'Film', region: 'USA' },

  // --- Sports legends (15) ---
  { id: 'lou-gehrig', name: 'Lou Gehrig', aliases: ['gehrig'], era: '20th century', field: 'Baseball', region: 'USA' },
  { id: 'joe-dimaggio', name: 'Joe DiMaggio', aliases: ['dimaggio'], era: '20th century', field: 'Baseball', region: 'USA' },
  { id: 'mickey-mantle', name: 'Mickey Mantle', aliases: ['mantle'], era: '20th century', field: 'Baseball', region: 'USA' },
  { id: 'hank-aaron', name: 'Hank Aaron', aliases: ['hank aaron'], era: '21st century', field: 'Baseball', region: 'USA' },
  { id: 'yogi-berra', name: 'Yogi Berra', aliases: ['yogi berra'], era: '21st century', field: 'Baseball', region: 'USA' },
  { id: 'roberto-clemente', name: 'Roberto Clemente', aliases: ['clemente'], era: '20th century', field: 'Baseball', region: 'Puerto Rico' },
  { id: 'joe-louis', name: 'Joe Louis', aliases: ['joe louis'], era: '20th century', field: 'Boxing', region: 'USA' },
  { id: 'sugar-ray-robinson', name: 'Sugar Ray Robinson', aliases: ['sugar ray'], era: '20th century', field: 'Boxing', region: 'USA' },
  { id: 'rocky-marciano', name: 'Rocky Marciano', aliases: ['marciano'], era: '20th century', field: 'Boxing', region: 'USA' },
  { id: 'joe-frazier', name: 'Joe Frazier', aliases: ['frazier'], era: '21st century', field: 'Boxing', region: 'USA' },
  { id: 'diego-maradona', name: 'Diego Maradona', aliases: ['maradona'], era: '21st century', field: 'Football', region: 'Argentina' },
  { id: 'johan-cruyff', name: 'Johan Cruyff', aliases: ['cruyff'], era: '21st century', field: 'Football', region: 'Netherlands' },
  { id: 'wilt-chamberlain', name: 'Wilt Chamberlain', aliases: ['chamberlain'], era: '20th century', field: 'Basketball', region: 'USA' },
  { id: 'bill-russell', name: 'Bill Russell', aliases: ['bill russell'], wikipediaTitle: 'Bill Russell', era: '21st century', field: 'Basketball', region: 'USA' },
  { id: 'kobe-bryant', name: 'Kobe Bryant', aliases: ['kobe'], era: '21st century', field: 'Basketball', region: 'USA' },

  // --- Comedians & TV personalities (8) ---
  { id: 'john-belushi', name: 'John Belushi', aliases: ['belushi'], era: '20th century', field: 'Comedy', region: 'USA' },
  { id: 'chris-farley', name: 'Chris Farley', aliases: ['farley'], era: '20th century', field: 'Comedy', region: 'USA' },
  { id: 'george-carlin', name: 'George Carlin', aliases: ['carlin'], era: '21st century', field: 'Comedy', region: 'USA' },
  { id: 'joan-rivers', name: 'Joan Rivers', aliases: ['joan rivers'], era: '21st century', field: 'Comedy', region: 'USA' },
  { id: 'bob-hope', name: 'Bob Hope', aliases: ['bob hope'], era: '21st century', field: 'Comedy', region: 'USA' },
  { id: 'lucille-ball', name: 'Lucille Ball', aliases: ['lucy'], era: '20th century', field: 'Comedy', region: 'USA' },
  { id: 'johnny-carson', name: 'Johnny Carson', aliases: ['johnny carson'], era: '21st century', field: 'Television', region: 'USA' },
  { id: 'mr-rogers', name: 'Fred Rogers', aliases: ['mr rogers'], wikipediaTitle: 'Fred Rogers', era: '21st century', field: 'Television', region: 'USA' },

  // --- Directors / auteurs (5) ---
  { id: 'stanley-kubrick', name: 'Stanley Kubrick', aliases: ['kubrick'], era: '20th century', field: 'Film', region: 'USA' },
  { id: 'federico-fellini', name: 'Federico Fellini', aliases: ['fellini'], era: '20th century', field: 'Film', region: 'Italy' },
  { id: 'akira-kurosawa', name: 'Akira Kurosawa', aliases: ['kurosawa'], era: '20th century', field: 'Film', region: 'Japan' },
  { id: 'ingmar-bergman', name: 'Ingmar Bergman', aliases: ['ingmar bergman'], era: '21st century', field: 'Film', region: 'Sweden' },
  { id: 'david-lean', name: 'David Lean', aliases: ['david lean'], era: '20th century', field: 'Film', region: 'United Kingdom' },

  // --- US Presidents (deceased modern) (6) ---
  { id: 'dwight-eisenhower', name: 'Dwight D. Eisenhower', aliases: ['eisenhower', 'ike'], wikipediaTitle: 'Dwight D. Eisenhower', era: '20th century', field: 'Politics', region: 'USA' },
  { id: 'harry-truman', name: 'Harry S. Truman', aliases: ['truman'], wikipediaTitle: 'Harry S. Truman', era: '20th century', field: 'Politics', region: 'USA' },
  { id: 'lyndon-b-johnson', name: 'Lyndon B. Johnson', aliases: ['lbj', 'johnson'], wikipediaTitle: 'Lyndon B. Johnson', era: '20th century', field: 'Politics', region: 'USA' },
  { id: 'george-hw-bush', name: 'George H. W. Bush', aliases: ['hw bush'], wikipediaTitle: 'George H. W. Bush', era: '21st century', field: 'Politics', region: 'USA' },
  { id: 'herbert-hoover', name: 'Herbert Hoover', aliases: ['hoover'], era: '20th century', field: 'Politics', region: 'USA' },
  { id: 'woodrow-wilson', name: 'Woodrow Wilson', aliases: ['woodrow wilson'], era: '20th century', field: 'Politics', region: 'USA' },

  // --- International leaders (deceased) (8) ---
  { id: 'mikhail-gorbachev', name: 'Mikhail Gorbachev', aliases: ['gorbachev'], era: '21st century', field: 'Politics', region: 'Russia' },
  { id: 'yasser-arafat', name: 'Yasser Arafat', aliases: ['arafat'], era: '21st century', field: 'Politics', region: 'Palestine' },
  { id: 'ayatollah-khomeini', name: 'Ruhollah Khomeini', aliases: ['khomeini', 'ayatollah'], era: '20th century', field: 'Politics', region: 'Iran' },
  { id: 'saddam-hussein', name: 'Saddam Hussein', aliases: ['saddam'], era: '21st century', field: 'Politics', region: 'Iraq' },
  { id: 'muammar-gaddafi', name: 'Muammar Gaddafi', aliases: ['gaddafi', 'qaddafi'], era: '21st century', field: 'Politics', region: 'Libya' },
  { id: 'augusto-pinochet', name: 'Augusto Pinochet', aliases: ['pinochet'], era: '21st century', field: 'Politics', region: 'Chile' },
  { id: 'leonid-brezhnev', name: 'Leonid Brezhnev', aliases: ['brezhnev'], era: '20th century', field: 'Politics', region: 'Russia' },
  { id: 'nikita-khrushchev', name: 'Nikita Khrushchev', aliases: ['khrushchev'], era: '20th century', field: 'Politics', region: 'Russia' },

  // --- Royals (deceased modern) (8) ---
  { id: 'prince-philip', name: 'Prince Philip, Duke of Edinburgh', aliases: ['prince philip'], wikipediaTitle: 'Prince Philip, Duke of Edinburgh', era: '21st century', field: 'Royalty', region: 'United Kingdom' },
  { id: 'queen-mother', name: 'Queen Elizabeth The Queen Mother', aliases: ['queen mother'], wikipediaTitle: 'Queen Elizabeth The Queen Mother', era: '21st century', field: 'Royalty', region: 'United Kingdom' },
  { id: 'princess-margaret', name: 'Princess Margaret', aliases: ['princess margaret'], wikipediaTitle: 'Princess Margaret, Countess of Snowdon', era: '21st century', field: 'Royalty', region: 'United Kingdom' },
  { id: 'king-george-vi', name: 'George VI', aliases: ['george vi'], wikipediaTitle: 'George VI', era: '20th century', field: 'Royalty', region: 'United Kingdom' },
  { id: 'edward-viii', name: 'Edward VIII', aliases: ['edward viii', 'duke of windsor'], wikipediaTitle: 'Edward VIII', era: '20th century', field: 'Royalty', region: 'United Kingdom' },
  { id: 'tsar-nicholas-ii', name: 'Nicholas II of Russia', aliases: ['nicholas ii', 'tsar nicholas'], wikipediaTitle: 'Nicholas II of Russia', era: '20th century', field: 'Royalty', region: 'Russia' },
  { id: 'anastasia-romanov', name: 'Grand Duchess Anastasia Nikolaevna of Russia', aliases: ['anastasia'], wikipediaTitle: 'Grand Duchess Anastasia Nikolaevna of Russia', era: '20th century', field: 'Royalty', region: 'Russia' },
  { id: 'rasputin', name: 'Grigori Rasputin', aliases: ['rasputin'], era: '20th century', field: 'Religion', region: 'Russia' },

  // --- Business tycoons (5) ---
  { id: 'john-d-rockefeller', name: 'John D. Rockefeller', aliases: ['rockefeller'], wikipediaTitle: 'John D. Rockefeller', era: '20th century', field: 'Business', region: 'USA' },
  { id: 'andrew-carnegie', name: 'Andrew Carnegie', aliases: ['carnegie'], era: '20th century', field: 'Business', region: 'Scotland / USA' },
  { id: 'jp-morgan', name: 'J. P. Morgan', aliases: ['jp morgan', 'morgan'], wikipediaTitle: 'J. P. Morgan', era: '20th century', field: 'Business', region: 'USA' },
  { id: 'howard-hughes', name: 'Howard Hughes', aliases: ['howard hughes'], era: '20th century', field: 'Business', region: 'USA' },
  { id: 'hugh-hefner', name: 'Hugh Hefner', aliases: ['hefner'], era: '21st century', field: 'Business', region: 'USA' },

  // --- Astronauts / explorers (3) ---
  { id: 'neil-armstrong', name: 'Neil Armstrong', aliases: ['armstrong'], era: '21st century', field: 'Space', region: 'USA' },
  { id: 'yuri-gagarin', name: 'Yuri Gagarin', aliases: ['gagarin'], era: '20th century', field: 'Space', region: 'Russia' },
  { id: 'sally-ride', name: 'Sally Ride', aliases: ['sally ride'], era: '21st century', field: 'Space', region: 'USA' },

  // --- Other icons (12) ---
  { id: 'anne-frank', name: 'Anne Frank', aliases: ['anne frank'], era: '20th century', field: 'Literature', region: 'Germany / Netherlands' },
  { id: 'stan-lee', name: 'Stan Lee', aliases: ['stan lee'], era: '21st century', field: 'Comics', region: 'USA' },
  { id: 'jim-henson', name: 'Jim Henson', aliases: ['henson'], era: '20th century', field: 'Television', region: 'USA' },
  { id: 'oprah-winfrey-skipalive', name: 'IGNORE', aliases: [], era: '', field: '', region: '' }, // placeholder — will filter
  { id: 'mahatma-gandhi-skipdup', name: 'IGNORE', aliases: [], era: '', field: '', region: '' }, // placeholder
  { id: 'andy-griffith', name: 'Andy Griffith', aliases: ['griffith'], era: '21st century', field: 'Television', region: 'USA' },
  { id: 'walter-cronkite', name: 'Walter Cronkite', aliases: ['cronkite'], era: '21st century', field: 'Television', region: 'USA' },
  { id: 'larry-king', name: 'Larry King', aliases: ['larry king'], era: '21st century', field: 'Television', region: 'USA' },
  { id: 'evel-knievel', name: 'Evel Knievel', aliases: ['knievel'], era: '21st century', field: 'Entertainment', region: 'USA' },
  { id: 'houdini', name: 'Harry Houdini', aliases: ['houdini'], era: '20th century', field: 'Entertainment', region: 'USA' },
  { id: 'henry-kissinger', name: 'Henry Kissinger', aliases: ['kissinger'], era: '21st century', field: 'Politics', region: 'USA' },
  { id: 'arnold-palmer', name: 'Arnold Palmer', aliases: ['arnold palmer'], era: '21st century', field: 'Golf', region: 'USA' },
  { id: 'ayrton-senna', name: 'Ayrton Senna', aliases: ['senna'], era: '20th century', field: 'Motorsport', region: 'Brazil' },
  { id: 'enzo-ferrari', name: 'Enzo Ferrari', aliases: ['ferrari'], era: '20th century', field: 'Motorsport', region: 'Italy' },
  { id: 'pavarotti', name: 'Luciano Pavarotti', aliases: ['pavarotti'], era: '21st century', field: 'Opera', region: 'Italy' },
  { id: 'leonard-bernstein', name: 'Leonard Bernstein', aliases: ['bernstein'], era: '20th century', field: 'Music', region: 'USA' },
  { id: 'maria-callas', name: 'Maria Callas', aliases: ['callas'], era: '20th century', field: 'Opera', region: 'Greece / USA' },
  { id: 'leonard-cohen', name: 'Leonard Cohen', aliases: ['leonard cohen'], era: '21st century', field: 'Music', region: 'Canada' },
  { id: 'frank-zappa', name: 'Frank Zappa', aliases: ['zappa'], era: '20th century', field: 'Music', region: 'USA' },

  // --- 20th century military commanders (5) ---
  { id: 'george-patton', name: 'George S. Patton', aliases: ['patton'], wikipediaTitle: 'George S. Patton', era: '20th century', field: 'Military', region: 'USA' },
  { id: 'douglas-macarthur', name: 'Douglas MacArthur', aliases: ['macarthur'], era: '20th century', field: 'Military', region: 'USA' },
  { id: 'erwin-rommel', name: 'Erwin Rommel', aliases: ['rommel'], era: '20th century', field: 'Military', region: 'Germany' },
  { id: 'te-lawrence', name: 'T. E. Lawrence', aliases: ['lawrence of arabia'], wikipediaTitle: 'T. E. Lawrence', era: '20th century', field: 'Military', region: 'United Kingdom' },
  { id: 'colin-powell', name: 'Colin Powell', aliases: ['colin powell'], era: '21st century', field: 'Politics', region: 'USA' },

  // --- Music/pop additions (3) ---
  { id: 'selena-quintanilla', name: 'Selena', aliases: ['selena'], wikipediaTitle: 'Selena', era: '20th century', field: 'Music', region: 'USA' },
  { id: 'aaliyah', name: 'Aaliyah', aliases: ['aaliyah'], era: '20th century', field: 'Music', region: 'USA' },
  { id: 'michael-hutchence', name: 'Michael Hutchence', aliases: ['hutchence'], era: '20th century', field: 'Music', region: 'Australia' },

  // --- Latin American + European icons (2) ---
  { id: 'eva-peron', name: 'Eva Perón', aliases: ['evita'], era: '20th century', field: 'Politics', region: 'Argentina' },
  { id: 'mata-hari', name: 'Mata Hari', aliases: ['mata hari'], era: '20th century', field: 'Espionage', region: 'Netherlands' },

  // --- Old West / frontier (5) ---
  { id: 'sitting-bull', name: 'Sitting Bull', aliases: ['sitting bull'], era: '19th century', field: 'Politics', region: 'North America' },
  { id: 'crazy-horse', name: 'Crazy Horse', aliases: ['crazy horse'], era: '19th century', field: 'Military', region: 'North America' },
  { id: 'geronimo', name: 'Geronimo', aliases: ['geronimo'], era: '19th century', field: 'Military', region: 'North America' },
  { id: 'buffalo-bill', name: 'Buffalo Bill', aliases: ['buffalo bill', 'william cody'], era: '20th century', field: 'Entertainment', region: 'USA' },
  { id: 'annie-oakley', name: 'Annie Oakley', aliases: ['annie oakley'], era: '20th century', field: 'Entertainment', region: 'USA' },
].filter((f) => f.name !== 'IGNORE');

if (SEED.length !== 150) {
  // Lazy sanity check while iterating on the list.
  console.warn(`Heads up: SEED has ${SEED.length} figures (expected 150).`);
}

const STORAGE_HOST = `${SUPABASE_URL}/storage/v1/object/public/figures/`;

async function fetchWikipediaImageUrl(title) {
  const encoded = encodeURIComponent(title.replace(/ /g, '_'));
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'PFH-seed/1.0 (contact: niklas.fip@gmail.com)',
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
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body}`);
  }
}

async function main() {
  const entries = only ? SEED.filter((f) => f.id.toLowerCase().includes(only)) : SEED;
  console.log(`${entries.length} new easy figures` + (dryRun ? ' (DRY RUN)' : '') + (only ? ` (filter: ${only})` : ''));

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
      difficulty: 'easy',
      era: fig.era,
      field: fig.field,
      region: fig.region,
      first_letter: fig.name[0].toUpperCase(),
      enabled: true,
    };

    const label = `[${String(i + 1).padStart(3, '0')}/${entries.length}] ${fig.id}`;

    if (dryRun) {
      console.log(`${label}  ${imageUrl ? 'OK' : 'NO-IMG'}` + (reason ? `  — ${reason}` : ''));
      if (imageUrl) ok++;
      else noImage++;
      await sleep(120);
      continue;
    }

    try {
      await upsertFigure(row);
      if (imageUrl) {
        ok++;
        console.log(`${label}  OK`);
      } else {
        noImage++;
        console.log(`${label}  NO-IMG` + (reason ? `  — ${reason}` : ''));
      }
    } catch (e) {
      failed++;
      console.log(`${label}  FAIL  — ${e.message}`);
    }
    await sleep(150);
  }

  console.log(`\nDone. ok=${ok}  no_image=${noImage}  failed=${failed}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

// Catalogue constants: real Project Gutenberg IDs, moods and genres.
// All community content lives in the database (see backend/app/seed.py).
export const IDS = {
  pride: 1342,
  frankenstein: 84,
  moby: 2701,
  sherlock: 1661,
  alice: 11,
  dorian: 174,
  anna: 1399,
  quixote: 996,
  twoCities: 98,
  dracula: 345,
  jekyll: 43,
  yellowWallpaper: 1952,
  huck: 76,
  metamorphosis: 5200,
  gatsby: 64317,
  crime: 2554,
  emma: 158,
  janeEyre: 1260,
  wuthering: 768,
  treasure: 120,
  monteCristo: 1184,
  warWorlds: 36,
  timeMachine: 35,
  oz: 55,
  republic: 1497,
  odyssey: 1727,
  grimm: 2591,
  karamazov: 28054,
  heartDarkness: 219,
  greatExpectations: 1400,
  walden: 205,
  littleWomen: 514,
  tomSawyer: 74,
  middlemarch: 145,
  sense: 161,
  dollsHouse: 2542,
  romeo: 1513,
  christmasCarol: 46,
  musketeers: 1257,
  gulliver: 829,
  notesUnderground: 600,
  peterPan: 16,
  secretGarden: 113,
  meditations: 2680,
  scarlet: 25344,
  iliad: 6130,
  callWild: 215,
  importanceEarnest: 844,
  persuasion: 105,
  siddhartha: 2500,
  princess: 1155, // Agnes Grey? placeholder -> Grimm's alt
  blueCastle: 67979,
  enchantedApril: 16389,
  hound: 2852,
  prince: 1232,
  artOfWar: 132,
  beowulf: 16328,
  poe: 2148,
}

export const FEATURED_IDS = [
  IDS.pride, IDS.dorian, IDS.frankenstein, IDS.moby, IDS.sherlock, IDS.alice, IDS.anna, IDS.dracula,
  IDS.janeEyre, IDS.gatsby, IDS.crime, IDS.metamorphosis, IDS.wuthering, IDS.monteCristo, IDS.emma,
  IDS.twoCities, IDS.treasure, IDS.warWorlds, IDS.walden, IDS.littleWomen,
]

export const TRENDING_IDS = [IDS.gatsby, IDS.dorian, IDS.yellowWallpaper, IDS.metamorphosis, IDS.blueCastle, IDS.enchantedApril]

export const MOSAIC_IDS = [
  IDS.pride, IDS.dorian, IDS.frankenstein, IDS.moby, IDS.sherlock, IDS.alice, IDS.anna, IDS.dracula, IDS.janeEyre,
  IDS.gatsby, IDS.crime, IDS.metamorphosis, IDS.wuthering, IDS.monteCristo, IDS.emma, IDS.twoCities, IDS.treasure,
  IDS.warWorlds, IDS.walden, IDS.littleWomen, IDS.oz, IDS.peterPan, IDS.secretGarden, IDS.callWild, IDS.hound,
  IDS.siddhartha, IDS.odyssey, IDS.grimm, IDS.heartDarkness, IDS.middlemarch,
]

export const GENRE_TOPICS: { name: string; topic: string; color: string; ids: number[] }[] = [
  { name: 'Fiction', topic: 'fiction', color: '#8A5A2F', ids: [IDS.pride, IDS.gatsby, IDS.middlemarch] },
  { name: 'Mystery', topic: 'detective', color: '#3F4F5C', ids: [IDS.sherlock, IDS.hound, IDS.poe] },
  { name: 'Romance', topic: 'love stories', color: '#A64D62', ids: [IDS.persuasion, IDS.janeEyre, IDS.emma] },
  { name: 'Philosophy', topic: 'philosophy', color: '#7A4B8A', ids: [IDS.meditations, IDS.republic, IDS.walden] },
  { name: 'History', topic: 'history', color: '#8B3A3A', ids: [IDS.twoCities, IDS.iliad, IDS.artOfWar] },
  { name: 'Science', topic: 'science', color: '#1B6B4A', ids: [IDS.timeMachine, IDS.warWorlds, IDS.frankenstein] },
  { name: 'Poetry', topic: 'poetry', color: '#3D6B6B', ids: [IDS.beowulf, IDS.odyssey, IDS.poe] },
  { name: 'Adventure', topic: 'adventure', color: '#9A7B12', ids: [IDS.treasure, IDS.monteCristo, IDS.callWild] },
]

export const MOODS: { key: import('@/types/book').Mood; label: string; color: string; soft: string; blurb: string }[] = [
  { key: 'adventurous', label: 'Adventurous', color: '#B7791F', soft: '#F7EEDC', blurb: 'Journeys, voyages and the open road.' },
  { key: 'dark', label: 'Dark', color: '#3F4F5C', soft: '#E6EAEE', blurb: 'Gothic, crime and the uncanny.' },
  { key: 'romantic', label: 'Romantic', color: '#A64D62', soft: '#F6E4E8', blurb: 'Courtship, longing and letters.' },
  { key: 'philosophical', label: 'Philosophical', color: '#4B6B85', soft: '#E4ECF2', blurb: 'Ideas, ethics and big questions.' },
  { key: 'funny', label: 'Funny', color: '#9A7B12', soft: '#F5F0D6', blurb: 'Wit, satire and comedy.' },
  { key: 'calm', label: 'Calm', color: '#1B6B4A', soft: '#E7F2EC', blurb: 'Nature, poetry and slow reading.' },
]

export const MOOD_TOPICS: Record<string, string> = {
  adventurous: 'adventure',
  dark: 'gothic',
  romantic: 'love',
  philosophical: 'philosophy',
  funny: 'humor',
  calm: 'poetry',
}

export const TESTIMONIALS = [
  { quote: 'I stopped scrolling and started reading again. That is the whole review.', who: 'Amira Haddad', role: 'reads 52 books a year' },
  { quote: 'The reading rooms feel like a late-night radio show where everyone has the same book open.', who: 'Theo Marlowe', role: 'misses trains for Holmes' },
  { quote: 'I published my first story here. Four hundred strangers finished it. I am still not over it.', who: 'June Oyelaran', role: 'writer, The Lighthouse Keeper’s Last Letter' },
  { quote: 'It is Goodreads if Goodreads had ever been to a bookshop.', who: 'Nadia Khoury', role: 'runs four book clubs' },
]

export const ACHIEVEMENTS = [
  { key: 'first_book', name: 'First Book', desc: 'Finished your first book', icon: '📖', earned: true },
  { key: 'bookworm', name: 'Book Worm', desc: 'Finished 10 books', icon: '🐛', earned: true },
  { key: 'first_review', name: 'First Review', desc: 'Wrote your first review', icon: '✍️', earned: true },
  { key: 'streak7', name: '7-Day Streak', desc: 'Read seven days in a row', icon: '🔥', earned: false },
  { key: 'streak30', name: '30-Day Streak', desc: 'A month of reading days', icon: '🌋', earned: false },
  { key: 'critic', name: 'Critic', desc: '50 reviews written', icon: '🎭', earned: false },
  { key: 'century', name: 'Century Reader', desc: '100 books finished', icon: '💯', earned: false },
  { key: 'writer', name: 'Story Writer', desc: 'Published a story', icon: '🪶', earned: false },
  { key: 'globe', name: 'Globe Trotter', desc: 'Read in 3 languages', icon: '🌍', earned: false },
  { key: 'clubmaster', name: 'Club Master', desc: 'Joined 5 book clubs', icon: '🕯️', earned: false },
]


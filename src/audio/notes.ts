export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

export function noteToFreq(noteName: string): number {
  // Matches e.g. "C4", "F#3", "Bb2"
  const match = noteName.match(/^([A-G][#b]?)(-?\d+)$/);
  if (!match) return 440;
  
  let note = match[1];
  const octave = parseInt(match[2], 10);

  // Normalize flats
  if (note === 'Db') note = 'C#';
  else if (note === 'Eb') note = 'D#';
  else if (note === 'Gb') note = 'F#';
  else if (note === 'Ab') note = 'G#';
  else if (note === 'Bb') note = 'A#';

  const noteIndex = NOTE_NAMES.indexOf(note as typeof NOTE_NAMES[number]);
  if (noteIndex === -1) return 440;

  const midi = 12 * (octave + 1) + noteIndex;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export const SCALES = {
  chromatic: { name: 'Chromatic', intervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
  minorPentatonic: { name: 'Minor Pentatonic', intervals: [0, 3, 5, 7, 10] },
  minor: { name: 'Natural Minor', intervals: [0, 2, 3, 5, 7, 8, 10] },
  major: { name: 'Major', intervals: [0, 2, 4, 5, 7, 9, 11] },
  dorian: { name: 'Dorian', intervals: [0, 2, 3, 5, 7, 9, 10] },
  blues: { name: 'Blues', intervals: [0, 3, 5, 6, 7, 10] },
  cyberpunk: { name: 'Phrygian Dominant', intervals: [0, 1, 4, 5, 7, 8, 10] },
};

export const TRACK_LIST = [
  {
    id: 'kick' as const,
    name: 'Kick 909',
    shortName: 'BD',
    color: 'from-rose-500 to-red-600',
    activeColor: 'bg-rose-500 text-white shadow-rose-500/50',
    isTonal: false,
  },
  {
    id: 'snare' as const,
    name: 'Snare 808',
    shortName: 'SD',
    color: 'from-amber-500 to-orange-600',
    activeColor: 'bg-amber-500 text-white shadow-amber-500/50',
    isTonal: false,
  },
  {
    id: 'hihatClosed' as const,
    name: 'Hat Closed',
    shortName: 'CH',
    color: 'from-emerald-500 to-teal-600',
    activeColor: 'bg-emerald-500 text-white shadow-emerald-500/50',
    isTonal: false,
  },
  {
    id: 'hihatOpen' as const,
    name: 'Hat Open',
    shortName: 'OH',
    color: 'from-cyan-500 to-blue-600',
    activeColor: 'bg-cyan-500 text-white shadow-cyan-500/50',
    isTonal: false,
  },
  {
    id: 'bass808' as const,
    name: '808 Sub-Bass',
    shortName: '808',
    color: 'from-purple-500 to-indigo-600',
    activeColor: 'bg-purple-500 text-white shadow-purple-500/50',
    isTonal: true,
    defaultPitch: 'C2',
  },
  {
    id: 'leadSynth' as const,
    name: 'Lead Synth',
    shortName: 'SYN',
    color: 'from-fuchsia-500 to-pink-600',
    activeColor: 'bg-fuchsia-500 text-white shadow-fuchsia-500/50',
    isTonal: true,
    defaultPitch: 'C4',
  },
];

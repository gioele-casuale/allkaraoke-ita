import { readdirSync, readFileSync } from 'fs';
import { Note, Section, Song } from 'interfaces';
import convertSongToTxt from 'Songs/utils/convertSongToTxt';
import convertTxtToSong, { txtTypesMap } from 'Songs/utils/convertTxtToSong';
import isNotesSection from 'Songs/utils/isNotesSection';
import { generateNote } from 'utils/testUtils';

const notesToText = (notes: Note[]) =>
  notes.map((note) => `${txtTypesMap[note.type]} ${note.start} ${note.length} ${note.pitch} ${note.lyrics}`).join('\n');

const generateSongTxt = (trackSections: Section[][], data: Partial<Song> = {}, unknownProps: string[] = []) => {
  const lines: string[] = [];
  trackSections.forEach(([first, ...sections]) => {
    if (!isNotesSection(first)) throw Error(`first section must contain notes, got ${JSON.stringify(first)}`);

    lines.push(notesToText(first.notes));
    sections.forEach((section) =>
      lines.push(
        isNotesSection(section)
          ? `- ${section.start}\n${notesToText(section.notes)}`
          : `- ${section.start} ${section.end}`,
      ),
    );
  });

  return `
#ID:${data?.id ?? 'IdTest'}
#ARTIST:${data?.artist ?? 'ArtistTest'}
#TITLE:${data?.title ?? 'TitleTest'}
#BPM:${data?.bpm ?? '60'}
#LANGUAGE:${data?.language ?? 'language'}
#GAP:${data?.gap ?? '0'}
${data?.video ? `#VIDEO:${data?.video}\n` : ''}
${unknownProps.join('\n')}
${lines.join('\n')}
E`;
};

const videoUrl = 'https://www.youtube.com/watch?v=videoUrl';
const videoId = '12345678901';
const sourceUrl = 'sourceUrl';
const author = 'author';
const authorUrl = 'authorUrl';

const songStub = {
  sourceUrl,
  author,
  authorUrl,
  artist: 'ArtistTest',
  title: 'TitleTest',
  id: 'IdTest',
  language: 'language',
  bpm: 60,
  bar: 4,
  gap: 0,
  video: expect.anything(),
  unsupportedProps: [],
} satisfies Partial<Song>;

describe('convertTxtToSong', () => {
  it('should convert single track', () => {
    const sections: Section[] = [
      { start: 0, type: 'notes', notes: [generateNote(0), generateNote(1)] },
      { start: 5, type: 'notes', notes: [generateNote(7), generateNote(10)] },
    ];

    const inputSongTxt = generateSongTxt([sections]);

    const expectedSong: Song = { ...songStub, tracks: [{ sections }], video: 'videoUrl' } as any;

    expect(convertTxtToSong(inputSongTxt, videoUrl, author, authorUrl, sourceUrl)).toEqual(expectedSong);
  });

  describe('multitrack', function () {
    it('should convert double track', () => {
      const sections: Section[] = [
        { start: 0, type: 'notes', notes: [generateNote(0), generateNote(1)] },
        { start: 15, type: 'notes', notes: [generateNote(17), generateNote(20)] },
      ];
      const unknownProps = ['#SOMEPROP: some value', '#SOMEPROP2: some value2'];

      const inputSongTxt = generateSongTxt([sections, sections], {}, unknownProps);

      const expectedSong: Song = {
        ...songStub,
        tracks: [{ sections }, { sections }],
        unsupportedProps: unknownProps,
      } as any;

      expect(convertTxtToSong(inputSongTxt, videoUrl, author, authorUrl, sourceUrl)).toEqual(expectedSong);
    });

    it('should avoid splitting tracks if notes overlap with heuristics', () => {
      const sections: Section[] = [
        { start: 0, type: 'notes', notes: [generateNote(0), generateNote(1)] },
        { start: 5, type: 'notes', notes: [generateNote(7), generateNote(10)] },
        { start: 8, type: 'notes', notes: [generateNote(10), generateNote(13)] },
      ];

      const inputSongTxt = generateSongTxt([sections]);

      const expectedSong: Song = { ...songStub, tracks: [{ sections }], video: videoId } as any;
      const result = convertTxtToSong(inputSongTxt, videoId, author, authorUrl, sourceUrl);

      expect(result.tracks).toHaveLength(1);
      expect(result).toEqual(expectedSong);
    });
  });

  describe('validate against real files', () => {
    const SONGS_FOLDER = './public/songs';

    it('should properly convert back and forth all the songs', () => {
      const songs = readdirSync(SONGS_FOLDER);

      for (const file of songs) {
        if (!file.endsWith('.txt')) continue;

        // uncomment to get the failing file
        // console.log(file);
        const txt = readFileSync(`${SONGS_FOLDER}/${file}`, { encoding: 'utf-8' }).replace(/\r\n/g, '\n');

        const song = convertTxtToSong(txt);

        expect(convertSongToTxt(song)).toEqual(txt);
      }
    });

    it.skip('Useful to debug specific failing song file', () => {
      const file = 'name';
      const txt = readFileSync(`${SONGS_FOLDER}/${file}`, { encoding: 'utf-8' }).replace(/\r\n/g, '\n');
      const song = convertTxtToSong(txt);

      expect(convertTxtToSong(convertSongToTxt(song))).toEqual(song);
    });
  });

  it('should convert usdb.animux.de proper video format', () => {
    const sections: Section[] = [
      { start: 0, type: 'notes', notes: [generateNote(0), generateNote(1)] },
      { start: 5, type: 'notes', notes: [generateNote(7), generateNote(10)] },
    ];
    const parsed = convertTxtToSong(
      generateSongTxt([sections], {
        video: 'v=QzkK3ZtI9SU,co=woman-in-chains-527f82543d19d.jpg,bg=tears-for-fears-629b760b75972.jpg',
      }),
    );

    expect(parsed.video).toEqual('QzkK3ZtI9SU');
  });

  it('should convert usdb.animux.de proper video format with just the video id ', () => {
    const sections: Section[] = [
      { start: 0, type: 'notes', notes: [generateNote(0), generateNote(1)] },
      { start: 5, type: 'notes', notes: [generateNote(7), generateNote(10)] },
    ];
    const parsed = convertTxtToSong(
      generateSongTxt([sections], {
        video: 'v=QzkK3ZtI9SU',
      }),
    );
    expect(parsed.video).toEqual('QzkK3ZtI9SU');
  });

  it('should ignore usdb.animux.de invalid video format', () => {
    const sections: Section[] = [
      { start: 0, type: 'notes', notes: [generateNote(0), generateNote(1)] },
      { start: 5, type: 'notes', notes: [generateNote(7), generateNote(10)] },
    ];
    const parsed = convertTxtToSong(
      generateSongTxt([sections], {
        video: "Sia - Santa's Coming For Us.mp4",
      }),
    );

    expect(parsed.video).toEqual('');
  });

  describe('deprecated properties support', () => {
    const sections: Section[] = [
      { start: 0, type: 'notes', notes: [generateNote(0), generateNote(1)] },
      { start: 5, type: 'notes', notes: [generateNote(7), generateNote(10)] },
    ];
    it('should properly handle parsing #TRACKNAMES', () => {
      const data = ['#TRACKNAMES:["Tenacious D","Devil","Combined"]'];

      const parsed = convertTxtToSong(generateSongTxt([sections, sections, sections], {}, data));

      expect(parsed.tracks[0].name).toEqual('Tenacious D');
      expect(parsed.tracks[1].name).toEqual('Devil');
      expect(parsed.tracks[2].name).toEqual('Combined');
    });
    it('should properly handle parsing #VIDEOID', () => {
      const data = ['#VIDEOID:QzkK3ZtI9SU'];

      const parsed = convertTxtToSong(generateSongTxt([sections], {}, data));

      expect(parsed.video).toEqual('QzkK3ZtI9SU');
    });
  });
});

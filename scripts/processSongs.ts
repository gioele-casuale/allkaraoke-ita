import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { IArtistList, MusicBrainzApi } from 'musicbrainz-api';
import { IIsrcSearchResult } from 'musicbrainz-api/lib/musicbrainz.types';
import { Song } from '../src/interfaces';
import { fixDiacritics } from '../src/Scenes/Convert/Steps/utils/fixDiacritics';
import convertSongToTxt from '../src/Songs/utils/convertSongToTxt';
import convertTxtToSong from '../src/Songs/utils/convertTxtToSong';
import clearString from '../src/utils/clearString';
// @ts-ignore
import scrapedBpmData from './scraped-bpm-data.json';
// @ts-ignore

const mbApi = new MusicBrainzApi({
  appName: 'Olkaraoke',
  appVersion: '0.1.0',
  appContactInfo: 'tatarczyk.aleksander@gmail.com',
});

const SONGS_FOLDER = './public/songs';

(async function () {
  const songs = readdirSync(SONGS_FOLDER);

  for (const file of songs) {
    if (!file.endsWith('.txt')) continue;
    console.log('reading', file);

    let song: Song = convertTxtToSong(readFileSync(`${SONGS_FOLDER}/${file}`, { encoding: 'utf-8' }));

    console.log(`"${song.artist}" "${song.title}"`);
    const { tracks, ...songData } = song;
    try {
      // await fillMissingRealBpm(songData, file);
      // await fillSongYear(songData);
      // await appendBandOrigin(songData);
    } catch (e) {
      console.error(e);
    }
    const finalSong = { ...songData, tracks };
    // finalSong.id = getSongId(finalSong);
    //
    // const txt = await fixAccentCharacters(
    //   convertSongToTxt(finalSong),
    //   Array.isArray(song.language) ? song.language[0] : song.language,
    // );
    const txt = convertSongToTxt(finalSong);

    writeFileSync(`${SONGS_FOLDER}/${finalSong.id}.txt`, txt, {
      encoding: 'utf-8',
    });
  }
})();

async function fixAccentCharacters(txt: string, language: string) {
  return fixDiacritics(txt, language.toLowerCase());
}

// async function appendBandOrigin(songData: Omit<Song, 'tracks'>) {
//   if (songData.artistOrigin) {
//     return;
//   }
//
//   const bandOrigin = (bandOrigins as Record<string, string>)[songData.artist];
//   if (bandOrigin) {
//     songData.artistOrigin = bandOrigin;
//   } else {
//     console.log(`    [${songData.id}] Missing band origin`);
//   }
// }

async function appendBandOrigin(songData: Omit<Song, 'tracks'>) {
  console.log(` ${songData.artist} - ${songData.artistOrigin}`);
  if (songData.artistOrigin) {
    return;
  }

  const externalData = await mbApi.search<IArtistList>('artist', {
    query: `"${songData.artist}"`,
  });
  if (externalData.count > 0) {
    console.log(JSON.stringify(externalData, null, 2));
    songData.artistOrigin = externalData.artists[0].country;
  }
}

async function fillMissingRealBpm(songData: Omit<Song, 'tracks'>, file: string) {
  if (songData.realBpm) {
    return;
  }
  console.log('    Missing real BPM');

  const songBpmData = scrapedBpmData[file as keyof typeof scrapedBpmData];

  if (songBpmData) {
    console.log('    Found scraped BPM', songBpmData.tempo);
    songData.realBpm = +songBpmData.tempo!;
  } else {
    songData.realBpm = 0;
  }
}

async function fillSongYear(songData: Omit<Song, 'tracks'>) {
  if (songData.year && songData.year !== '') {
    return;
  }
  console.log('    Missing year');

  const externalData = await mbApi.search<IIsrcSearchResult>('recording', {
    query: `"${songData.artist}" "${songData.title}"`,
  });

  if (externalData.count > 0) {
    let oldestRecord = externalData.recordings[0];

    externalData.recordings.forEach((result) => {
      // @ts-expect-error
      const firstReleaseDate = result['first-release-date']?.split('-')?.[0] ?? -Infinity;
      // @ts-expect-error
      const currentOldestRelease = oldestRecord['first-release-date']?.split('-')?.[0] ?? Infinity;
      if (clearString(result.title) === clearString(songData.title) && currentOldestRelease > firstReleaseDate) {
        oldestRecord = result;
      }
    });

    // @ts-expect-error
    const currentOldestRelease = oldestRecord['first-release-date']?.split('-')?.[0];
    if (
      clearString(oldestRecord.title) === clearString(songData.title) &&
      currentOldestRelease !== undefined &&
      currentOldestRelease > 100
    ) {
      console.log('    ...', currentOldestRelease);
      songData.year = currentOldestRelease;
    } else {
      console.log(
        '    ...not found',
        currentOldestRelease,
        clearString(oldestRecord.title),
        clearString(songData.title),
      );
    }
  }
}

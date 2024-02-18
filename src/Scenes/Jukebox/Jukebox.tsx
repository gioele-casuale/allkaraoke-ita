import styled from '@emotion/styled';
import { Button } from 'Elements/Button';
import { useBackground } from 'Elements/LayoutWithBackground';
import NoPrerender from 'Elements/NoPrerender';
import SmoothLink from 'Elements/SmoothLink';
import VideoPlayer, { VideoState } from 'Elements/VideoPlayer';
import LayoutGame from 'Scenes/LayoutGame';
import useSongIndex from 'Songs/hooks/useSongIndex';
import useBackgroundMusic from 'hooks/useBackgroundMusic';
import useKeyboardNav from 'hooks/useKeyboardNav';
import useSmoothNavigate, { buildUrl } from 'hooks/useSmoothNavigate';
import { SongPreview } from 'interfaces';
import { shuffle } from 'lodash-es';
import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import useViewportSize from '../../hooks/useViewportSize';
import SongPage from '../Game/SongPage';

interface Props {}

function Jukebox(props: Props) {
  useBackground(false);
  useBackgroundMusic(false);
  const navigate = useSmoothNavigate();
  const { width, height } = useViewportSize();
  const [currentlyPlaying, setCurrentlyPlaying] = useState(0);
  const songList = useSongIndex();

  const [shuffledList, setShuffledList] = useState<SongPreview[]>([]);
  const { register } = useKeyboardNav({ onBackspace: () => navigate('menu/') });

  useEffect(() => songList.data && setShuffledList(shuffle(songList.data)), [songList.data]);

  const playNext = () => songList.data && setCurrentlyPlaying((current) => (current + 1) % songList.data.length);

  if (!shuffledList.length || !width || !height) return null;

  const navigateUrl = buildUrl(`game/`, { song: shuffledList[currentlyPlaying].id });

  return (
    <LayoutGame>
      <Helmet>
        <title>Jukebox | AllKaraoke.Party - Free Online Karaoke Party Game</title>
      </Helmet>
      <NoPrerender>
        <SongPage
          width={width}
          height={height}
          songData={shuffledList[currentlyPlaying]}
          data-test="jukebox-container"
          data-song={shuffledList[currentlyPlaying].id}
          background={
            <VideoPlayer
              autoplay
              controls
              width={width}
              height={height}
              volume={shuffledList[currentlyPlaying]?.volume}
              video={shuffledList[currentlyPlaying].video}
              startAt={shuffledList[currentlyPlaying].videoGap}
              onStateChange={(state) => {
                if (state === VideoState.ENDED) playNext();
              }}
            />
          }>
          <SkipSongButton {...register('skip-button', playNext)}>Skip</SkipSongButton>
          <SmoothLink to={navigateUrl}>
            <PlayThisSongButton {...register('sing-button', () => navigate(navigateUrl), undefined, true)}>
              Sing this song
            </PlayThisSongButton>
          </SmoothLink>
        </SongPage>
      </NoPrerender>
    </LayoutGame>
  );
}

const PlayThisSongButton = styled(Button)<{ focused: boolean }>`
  bottom: 7rem;
  right: 2rem;
  width: 50rem;
  position: absolute;
  font-size: 1.9vw;
`;

const SkipSongButton = styled(Button)<{ focused: boolean }>`
  bottom: 15rem;
  right: 2rem;
  width: 30rem;
  position: absolute;
  font-size: 1.9vw;
`;

export default Jukebox;

import { Box, Button, ButtonGroup, Divider, Typography } from '@mui/material';
import { useState } from 'react';
import { Pre } from 'Scenes/Convert/Elements';
import formatMs from 'Scenes/Convert/Steps/SyncLyricsToVideo/Helpers/formatMs';
import { PlayerRef } from 'Scenes/Game/Singing/Player';

interface Props {
  player: PlayerRef;
  currentTime: number;
  effectsEnabled: boolean;
  onEffectsToggle: () => void;
}

export default function AdjustPlayback({ player, currentTime, effectsEnabled, onEffectsToggle }: Props) {
  const seekBy = (bySec: number) => player.seekTo((currentTime + bySec) / 1000);
  const [currentSpeed, setCurrentSpeed] = useState(1);

  return (
    <>
      <Box sx={{ mb: 2 }}>
        <Typography variant={'h6'} data-test="current-time">
          Current time: {formatMs(currentTime)} (<Pre>{Math.round(currentTime)}</Pre> ms)
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <ButtonGroup variant="contained" sx={{ display: 'flex', mt: 1, flex: 1 }}>
            <Button sx={{ flex: 1, px: 1 }} onClick={() => seekBy(-10_000)} data-test="seek-10s">
              -10
            </Button>
            <Button sx={{ flex: 1, px: 1 }} onClick={() => seekBy(-5_000)} data-test="seek-5s">
              -5
            </Button>
            <Button sx={{ flex: 1, px: 1 }} onClick={() => seekBy(-1_000)} data-test="seek-1s">
              -1
            </Button>
            <Button sx={{ flex: 1, px: 1 }} onClick={() => seekBy(-500)} data-test="seek-0.5s">
              -0.5
            </Button>
          </ButtonGroup>
          <Divider />
          <ButtonGroup variant="contained" sx={{ display: 'flex', mt: 1, flex: 1 }}>
            <Button sx={{ flex: 1, px: 1 }} onClick={() => seekBy(+500)} data-test="seek+0.5s">
              +0.5
            </Button>
            <Button sx={{ flex: 1, px: 1 }} onClick={() => seekBy(+1_000)} data-test="seek+1s">
              +1
            </Button>
            <Button sx={{ flex: 1, px: 1 }} onClick={() => seekBy(+5_000)} data-test="seek+5s">
              +5
            </Button>
            <Button sx={{ flex: 1, px: 1 }} onClick={() => seekBy(+10_000)} data-test="seek+10s">
              +10
            </Button>
          </ButtonGroup>
        </Box>
      </Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant={'h6'}>
          Playback speed: <Pre data-test="current-speed">{currentSpeed * 100}%</Pre>
        </Typography>
        <ButtonGroup variant="contained" sx={{ display: 'flex', mt: 1 }}>
          {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
            <Button
              data-test={`speed-${speed}`}
              key={speed}
              sx={{ flex: 1 }}
              onClick={() => {
                setCurrentSpeed(speed);
                player.setPlaybackSpeed(speed);
              }}
              disabled={currentSpeed === speed}>
              {speed * 100}%
            </Button>
          ))}
        </ButtonGroup>
      </Box>
    </>
  );
}

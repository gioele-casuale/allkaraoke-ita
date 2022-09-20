import styled from '@emotion/styled';
import { useEffect, useState } from 'react';
import styles from 'Scenes/Game/Singing/GameOverlay/Drawing/styles';

interface Props {
    volume: number;
    playerNumber: number | null;
    frequency: number | null;
}

export default function VolumeIndicator({ playerNumber, volume, frequency }: Props) {
    const [maxVolume, setMaxVolume] = useState(0.000001);

    useEffect(() => {
        setMaxVolume((current) => (volume > current ? volume : current * 0.99));
    }, [volume]);

    const backgroundColor =
        playerNumber !== null ? styles.colors.players[playerNumber].miss.stroke : styles.colors.lines.normal.fill;
    const indicatorColor =
        playerNumber !== null ? styles.colors.players[playerNumber].perfect.fill : styles.colors.lines.normal.stroke;

    return (
        <IndicatorContainer color={backgroundColor}>
            <Frequency>{frequency ? Math.round(frequency) : ''}</Frequency>
            <Indicator
                color={indicatorColor}
                style={{ height: `${100 - Math.min(100, (volume / maxVolume) * 100)}%` }}
            />
        </IndicatorContainer>
    );
}

const Frequency = styled.span`
    position: absolute;
    color: white;
    opacity: 0.15;
`;

const Indicator = styled.div<{ color: string }>`
    width: 100%;
    background-color: ${(props) => props.color};
    transition: 200ms;
`;

const IndicatorContainer = styled.div<{ color: string }>`
    position: relative;
    border: 1px solid white;
    width: 100%;
    aspect-ratio: 1 / 1;

    background: ${(props) => props.color};
`;

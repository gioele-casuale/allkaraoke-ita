import styled from '@emotion/styled';
import { focused } from 'Elements/cssMixins';
import { REGULAR_ALPHA_CHARS } from 'hooks/useKeyboard';
import { KeyHandler } from 'hotkeys-js';
import { SingSetup } from 'interfaces';
import { useEffect, useRef, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import Playlists from 'Scenes/SingASong/SongSelection/Playlists';
import QuickSearch from 'Scenes/SingASong/SongSelection/QuickSearch';
import SelectRandomTip from 'Scenes/SingASong/SongSelection/SelectRandomTip';
import usePrevious from 'hooks/usePrevious';
import useViewportSize from 'hooks/useViewportSize';
import styles from 'Scenes/Game/Singing/GameOverlay/Drawing/styles';
import useSongSelection from 'Scenes/SingASong/SongSelection/Hooks/useSongSelection';
import { FinalSongCard } from 'Scenes/SingASong/SongSelection/SongCard';
import SongPreview from 'Scenes/SingASong/SongSelection/SongPreview';
import { CircularProgress } from '@mui/material';
import { css } from '@emotion/react';
import useBackgroundMusic from 'hooks/useBackgroundMusic';
import { useBackground } from 'Elements/LayoutWithBackground';
import useBlockScroll from 'hooks/useBlockScroll';
import { MobilePhoneModeSetting, useSettingValue } from 'Scenes/Settings/SettingsState';

interface Props {
    onSongSelected: (songSetup: SingSetup & { file: string; video: string }) => void;
    preselectedSong: string | null;
}

const focusMultiplier = 1.2;
const MAX_SONGS_PER_ROW = 4;

export default function SongSelection({ onSongSelected, preselectedSong }: Props) {
    const [mobilePhoneMode] = useSettingValue(MobilePhoneModeSetting);
    const songsPerRow = mobilePhoneMode ? MAX_SONGS_PER_ROW - 1 : MAX_SONGS_PER_ROW;

    useBackground(true);
    useBlockScroll();
    const [{ previewTop, previewLeft, previewWidth, previewHeight }, setPositions] = useState({
        previewTop: 0,
        previewLeft: 0,
        previewWidth: 0,
        previewHeight: 0,
    });
    const {
        focusedGroup,
        focusedSong,
        moveToSong,
        groupedSongList,
        keyboardControl,
        songPreview,
        setKeyboardControl,
        setFilters,
        filters,
        filtersData,
        setShowFilters,
        showFilters,
        isLoading,
    } = useSongSelection(preselectedSong, songsPerRow);
    useBackgroundMusic(false);

    const onSearchSong: KeyHandler = (e) => {
        e.stopPropagation();
        e.preventDefault();

        setFilters({
            search: e.key,
        });
    };
    useHotkeys(REGULAR_ALPHA_CHARS, onSearchSong, { enabled: !filters.search && keyboardControl });

    const list = useRef<HTMLDivElement | null>(null);
    const { width, handleResize } = useViewportSize();
    const previouslyFocusedGroup = usePrevious(focusedGroup);
    const previouslyFocusedSong = usePrevious(focusedSong);

    useEffect(() => {
        const selector = (group: string, index: number) => `[data-group-letter="${group}"] [data-index="${index}"]`;
        handleResize(); // Recalculate width/height to account possible scrollbar appearing

        const previousSong = list.current?.querySelector(
            selector(previouslyFocusedGroup, previouslyFocusedSong),
        ) as HTMLDivElement;
        const song = list.current?.querySelector(selector(focusedGroup, focusedSong)) as HTMLDivElement;
        if (song) {
            if (!previousSong || previousSong.offsetTop !== song.offsetTop) {
                song.scrollIntoView?.({
                    behavior: 'smooth',
                    inline: 'center',
                    block: 'center',
                });
            }
            setPositions({
                previewLeft: song.offsetLeft,
                previewTop: song.offsetTop,
                previewWidth: song.offsetWidth,
                previewHeight: song.offsetHeight,
            });
        }
    }, [width, list, focusedSong, focusedGroup, groupedSongList]);

    const onSongClick = (index: number) => (focusedSong === index ? setKeyboardControl(false) : moveToSong(index));
    if (!groupedSongList || !width) return <>Loading</>;

    if (isLoading) {
        return (
            <LoaderContainer>
                <CircularProgress size="15em" color="secondary" />
            </LoaderContainer>
        );
    }
    return (
        <Container songsPerRow={songsPerRow}>
            {filters.search ? (
                <QuickSearch showFilters={showFilters} onSongFiltered={setFilters} filters={filters} />
            ) : (
                <SelectRandomTip keyboardControl={keyboardControl} />
            )}
            <SongListContainer ref={list} active={keyboardControl} data-test="song-list-container" dim={showFilters}>
                {songPreview && (
                    <SongPreview
                        songPreview={songPreview}
                        onPlay={onSongSelected}
                        keyboardControl={!keyboardControl}
                        onExitKeyboardControl={() => setKeyboardControl(true)}
                        top={previewTop}
                        left={previewLeft}
                        width={previewWidth}
                        height={previewHeight}
                        focusEffect={!showFilters}
                    />
                )}
                {groupedSongList.map((group) => (
                    <SongsGroupContainer
                        key={group.letter}
                        data-group-letter={group.letter}
                        highlight={group.letter === 'New'}>
                        <SongsGroupHeader>{group.letter}</SongsGroupHeader>
                        <SongsGroup>
                            {group.songs.map(({ song, index }) => (
                                <SongListEntry
                                    key={song.file}
                                    song={song}
                                    onClick={() => onSongClick(index)}
                                    focused={!showFilters && keyboardControl && index === focusedSong}
                                    data-index={index}
                                    {...(!showFilters && keyboardControl
                                        ? { 'data-focused': index === focusedSong }
                                        : {})}
                                    data-test={`song-${song.file}${group.isNew ? '-new-group' : ''}`}
                                />
                            ))}
                        </SongsGroup>
                    </SongsGroupContainer>
                ))}
            </SongListContainer>
            <Playlists setFilters={setFilters} active={showFilters} closePlaylist={setShowFilters} />
        </Container>
    );
}

const Container = styled.div<{ songsPerRow: number }>`
    view-transition-name: song-list-container;
    display: flex;
    flex-direction: row;
    max-height: 100vh;
    --song-list-gap: 3.5rem;
    --song-item-width: ${(props) =>
        `calc(${100 / props.songsPerRow}% - ((${props.songsPerRow - 1} / ${
            props.songsPerRow
        }) * var(--song-list-gap)))`};
    --song-item-ratio: calc(16 / 9 * (4 / ${(props) => props.songsPerRow}));
`;

const SongsGroupContainer = styled.div<{ highlight: boolean }>`
    padding: 0 4.5rem 0 11rem;
    ${(props) =>
        props.highlight &&
        css`
            background: rgba(0, 0, 0, 0.5);
            padding-bottom: 3rem;
            border-bottom: 0.2rem solid black;

            ${SongsGroupHeader} {
                @keyframes new-song-group-header {
                    0%,
                    100% {
                        transform: scale(1);
                    }
                    50% {
                        transform: scale(1.1);
                    }
                }
                animation: new-song-group-header 600ms ease-in-out infinite both;
                background: #ffffff;
            }
        `}
`;

const SongsGroupHeader = styled.div`
    display: inline-block;
    padding: 0.5rem 1rem;
    margin-bottom: 2rem;
    font-size: 3.5rem;
    position: sticky;
    z-index: 1;
    top: calc(-1 * var(--song-list-gap));
    font-weight: bold;
    color: ${styles.colors.text.active};
    -webkit-text-stroke: thin black;
    background: rgba(0, 0, 0, 0.7);
`;

const SongListContainer = styled.div<{ active: boolean; dim: boolean }>`
    position: relative;
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    gap: var(--song-list-gap);
    padding: 4.5rem 0;
    overflow-y: auto;
    overflow-x: clip;
    box-sizing: border-box;
    min-height: 100vh;
    max-height: 100vh;
    ::-webkit-scrollbar {
        display: none;
    }
    transition: opacity 500ms;
    opacity: ${(props) => (props.dim ? 0.5 : 1)};
`;

const SongsGroup = styled.div`
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: var(--song-list-gap);
`;

const SongListEntry = styled(FinalSongCard)`
    cursor: pointer;
    flex-basis: var(--song-item-width);
    aspect-ratio: var(--song-item-ratio);

    transition: 300ms;
    transform: scale(${(props) => (props.focused ? focusMultiplier : 1)});
    ${(props) => props.focused && 'z-index: 2;'}
    ${(props) => props.focused && focused}

    content-visibility: auto;
    contain-intrinsic-size: calc(var(--song-item-width) * (1 / var(--song-item-ratio)));
`;

const LoaderContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100vh;
`;

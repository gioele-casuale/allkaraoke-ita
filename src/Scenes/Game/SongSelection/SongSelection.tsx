import styled from '@emotion/styled';
import { focused } from 'Elements/cssMixins';
import { REGULAR_ALPHA_CHARS } from 'hooks/useKeyboard';
import { KeyHandler } from 'hotkeys-js';
import { SingSetup } from 'interfaces';
import { useEffect, useRef, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import Playlists from 'Scenes/Game/SongSelection/Playlists';
import QuickSearch from 'Scenes/Game/SongSelection/QuickSearch';
import SelectRandomTip from 'Scenes/Game/SongSelection/SelectRandomTip';
import usePrevious from '../../../hooks/usePrevious';
import useViewportSize from '../../../hooks/useViewportSize';
import styles from '../Singing/GameOverlay/Drawing/styles';
import useSongSelection from './Hooks/useSongSelection';
import {
    SongCard,
    SongCardBackground,
    SongCardStatsIndicator,
    SongListEntryDetailsArtist,
    SongListEntryDetailsTitle,
} from './SongCard';
import SongPreview from './SongPreview';

interface Props {
    onSongSelected: (songSetup: SingSetup & { file: string; video: string }) => void;
    preselectedSong: string | null;
}

const padding = 45;
const leftPad = 45;
const rightPad = 95;
const gap = 35;
const perRow = 4;

const focusMultiplier = 1.2;

export default function SongSelection({ onSongSelected, preselectedSong }: Props) {
    const [{ previewTop, previewLeft }, setPositions] = useState({ previewTop: 0, previewLeft: 0 });
    const {
        focusedSong,
        setFocusedSong,
        groupedSongList,
        keyboardControl,
        songPreview,
        setKeyboardControl,
        setFilters,
        filters,
        filtersData,
        setShowFilters,
        showFilters,
    } = useSongSelection(preselectedSong);

    const onSearchSong: KeyHandler = (e) => {
        // for some reason the setSearch from Filters component is also called so if `search: e.key,` is passed below
        // the letter would be inputted twice. So here space is enter which is then trimmed in setSearch
        // Possibly the keyboard event "leaks", but couldn't figure out a way to stop it.
        setFilters({
            search: ' ', //e.key,
        });
    };
    useHotkeys(REGULAR_ALPHA_CHARS, onSearchSong, { enabled: !filters.search && keyboardControl });

    const list = useRef<HTMLDivElement | null>(null);
    const { width, handleResize } = useViewportSize();
    const previouslyFocusedSong = usePrevious(focusedSong);

    useEffect(() => {
        handleResize(); // Recalculate width/height to account possible scrollbar appearing

        const previousSong = list.current?.querySelector(`[data-index="${previouslyFocusedSong}"]`) as HTMLDivElement;
        const song = list.current?.querySelector(`[data-index="${focusedSong}"]`) as HTMLDivElement;
        if (song) {
            if (!previousSong || previousSong.offsetTop !== song.offsetTop) {
                song.scrollIntoView?.({
                    behavior: 'smooth',
                    inline: 'center',
                    block: 'center',
                });
            }
            setPositions({ previewLeft: song.offsetLeft, previewTop: song.offsetTop });
        }
    }, [width, list, focusedSong, groupedSongList]);

    const onSongClick = (index: number) => (focusedSong === index ? setKeyboardControl(false) : setFocusedSong(index));
    if (!groupedSongList || !width) return <>Loading</>;

    const entryWidth = (width - leftPad - rightPad - gap * (perRow - 1)) / perRow;
    const entryHeight = (entryWidth / 16) * 9;

    return (
        <Container>
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
                        width={entryWidth}
                        height={entryHeight}
                        focusEffect={!showFilters}
                    />
                )}
                {groupedSongList.map((group) => (
                    <SongsGroupContainer key={group.letter}>
                        <SongsGroupHeader>{group.letter}</SongsGroupHeader>
                        <SongsGroup>
                            {group.songs.map(({ song, index }) => (
                                <SongListEntry
                                    width={entryWidth}
                                    height={entryHeight}
                                    key={song.file}
                                    onClick={() => onSongClick(index)}
                                    video={song.video}
                                    focused={!showFilters && keyboardControl && index === focusedSong}
                                    data-index={index}
                                    data-test={`song-${song.file}`}>
                                    <SongCardBackground
                                        style={{
                                            backgroundImage: `url('https://i3.ytimg.com/vi/${song.video}/hqdefault.jpg')`,
                                        }}
                                        video={song.video}
                                        focused={!showFilters && keyboardControl && index === focusedSong}
                                    />
                                    <SongCardStatsIndicator song={song} />
                                    <SongListEntryDetailsArtist>{song.artist}</SongListEntryDetailsArtist>

                                    <SongListEntryDetailsTitle>{song.title}</SongListEntryDetailsTitle>
                                </SongListEntry>
                            ))}
                        </SongsGroup>
                    </SongsGroupContainer>
                ))}
            </SongListContainer>
            <Playlists setFilters={setFilters} active={showFilters} closePlaylist={setShowFilters} />
        </Container>
    );
}

const Container = styled.div`
    display: flex;
    flex-direction: row;
    max-height: 100vh;
`;

const SongsGroupContainer = styled.div``;

const SongsGroup = styled.div`
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: ${gap}px;
`;
const SongsGroupHeader = styled.div`
    display: inline-block;
    padding: 5px 10px;
    margin-bottom: 20px;
    font-size: 32px;
    position: sticky;
    z-index: 1;
    top: -${gap}px;
    font-weight: bold;
    color: ${styles.colors.text.active};
    -webkit-text-stroke: 0.5px black;
    background: rgba(0, 0, 0, 0.7);
`;

const SongListContainer = styled.div<{ active: boolean; dim: boolean }>`
    position: relative;
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    gap: ${gap}px;
    padding: ${padding}px;
    padding-left: ${leftPad}px;
    padding-right: ${rightPad}px;
    overflow-y: overlay;
    overflow-x: clip;
    box-sizing: border-box;
    min-height: 100vh;
    ::-webkit-scrollbar {
        display: none;
    }
    transition: opacity 500ms;
    opacity: ${(props) => (props.dim ? 0.5 : 1)};
`;

const SongListEntry = styled(SongCard)<{ video: string; focused: boolean; width: number; height: number }>`
    width: ${(props) => props.width}px;
    height: ${(props) => props.height}px;

    padding: 0.5em;

    transition: 300ms;
    transform: scale(${(props) => (props.focused ? focusMultiplier : 1)});
    ${(props) => props.focused && 'z-index: 2;'}
    // transform: ${(props) => (props.focused ? 'scale(1.1) perspective(500px) rotateY(7.5deg)' : 'scale(1)')};
    ${(props) => props.focused && focused}
    border: 1px black solid;
    border-radius: 5px;
`;

import { navigate } from 'hooks/useHashLocation';
import useKeyboard from 'hooks/useKeyboard';
import { chunk, throttle } from 'lodash-es';
import posthog from 'posthog-js';
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { menuBack, menuEnter, menuNavigate } from 'SoundManager';
import random from 'utils/randomValue';
import useKeyboardHelp from '../../../../hooks/useKeyboardHelp';
import usePrevious from '../../../../hooks/usePrevious';
import tuple from '../../../../utils/tuple';
import { AppliedFilters, SongGroup } from './useSongList';

const MAX_SONGS_PER_ROW = 4;

const useTwoDimensionalNavigation = (groups: SongGroup[] = []) => {
    const [cursorPosition, setCursorPosition] = useState<[number, number]>([0, 0]);
    const songIndexMatrix = useMemo(
        () =>
            groups
                .map(({ songs }) =>
                    chunk(
                        songs.map((song) => song.index),
                        MAX_SONGS_PER_ROW,
                    ),
                )
                .flat(),
        [groups],
    );
    const previousMatrix = usePrevious(songIndexMatrix ?? []);

    const isAtLastColumn = cursorPosition[0] === songIndexMatrix[cursorPosition[1]]?.length - 1;

    const moveToSong = (songIndex: number, matrix: number[][] = songIndexMatrix) => {
        const y = matrix.findIndex((columns) => columns.includes(songIndex));
        const x = matrix[y]?.indexOf(songIndex);
        if (x >= 0 && y >= 0) {
            setCursorPosition([x ?? 0, y ?? 0]);
        } else {
            setCursorPosition([0, 0]);
        }
    };

    const positionToSongIndex = ([x, y]: [number, number], matrix: number[][] = songIndexMatrix) => {
        if (groups.length === 0) return 0;
        const row = matrix[y];
        return row?.[x] ?? row?.at(-1) ?? matrix?.[0]?.[0] ?? 0;
    };

    useEffect(() => {
        const previousFocusedSong = positionToSongIndex(cursorPosition, previousMatrix);
        const currentFocusedSong = positionToSongIndex(cursorPosition, songIndexMatrix);
        if (previousFocusedSong !== currentFocusedSong) {
            moveToSong(previousFocusedSong);
        }
    }, [cursorPosition, songIndexMatrix, previousMatrix, isAtLastColumn]);

    const moveCursor = (plane: 'x' | 'y', delta: number) => {
        menuNavigate.play();
        setCursorPosition(([x, y]) => {
            let newX = x;
            let newY = y;
            if (plane === 'y') {
                newY = y + delta;
            } else {
                if (songIndexMatrix[y] === undefined) {
                    debugger;
                }
                const maxXInRow = songIndexMatrix[y].length - 1;
                newX = Math.min(x, maxXInRow) + delta;
                if (newX < 0) {
                    newY = (songIndexMatrix.length + y - 1) % songIndexMatrix.length;
                    newX = songIndexMatrix[newY].length - 1;
                } else if (newX > maxXInRow) {
                    newY = y + 1;
                    newX = 0;
                }
            }
            return [newX % MAX_SONGS_PER_ROW, (songIndexMatrix.length + newY) % songIndexMatrix.length];
        });
    };

    const focusedSong = positionToSongIndex(cursorPosition);

    return tuple([focusedSong, cursorPosition, moveCursor, moveToSong, isAtLastColumn]);
};

export const useSongSelectionKeyboardNavigation = (
    enabled: boolean,
    groupedSongs: SongGroup[] = [],
    onEnter: () => void,
    songCount: number,
    appliedFilters: AppliedFilters,
) => {
    // We need to record how user entered (from which "side") and how left and based on that update the selection.
    // Eg if user was at the last column, entered playlists, and returned to the last column (by clicking left)
    // then effectively the selection shouldn't change
    const [showPlaylistsState, setShowPlaylistsState] = useState<[boolean, 'left' | 'right' | null]>([false, null]);
    const previousPlaylistsState = usePrevious(showPlaylistsState);
    const [arePlaylistsVisible, leavingKey] = showPlaylistsState;

    const [focusedSong, cursorPosition, moveCursor, moveToSong, isAtLastColumn] =
        useTwoDimensionalNavigation(groupedSongs);
    const isAtFirstColumn = cursorPosition[0] === 0;

    const handleEnter = () => {
        menuEnter.play();
        onEnter();
    };

    const handleBackspace = () => {
        if (!appliedFilters.search) {
            menuBack.play();
            navigate('/');
        }
    };

    const navigateToGroup = useCallback(
        throttle(
            (direction: 1 | -1, currentGroup: number) => {
                const nextGroupIndex = (groupedSongs.length + currentGroup + direction) % groupedSongs.length;

                moveToSong(groupedSongs[nextGroupIndex].songs[0].index);
                menuNavigate.play();
            },
            700,
            { trailing: false },
        ),
        [groupedSongs],
    );

    const navigateVertically = ({ repeat }: KeyboardEvent, direction: 1 | -1) => {
        if (!repeat) {
            moveCursor('y', direction);
        } else {
            const currentlySelectedGroupIndex = groupedSongs.findIndex(
                (group) => !!group.songs.find((song) => song.index === focusedSong),
            );
            navigateToGroup(direction, currentlySelectedGroupIndex);
        }
    };

    const navigateHorizontally = (direction: 1 | -1, ignoreFilters = false) => {
        if (!ignoreFilters && direction === 1 && isAtLastColumn && !arePlaylistsVisible) {
            setShowPlaylistsState([true, 'right']);
        } else if (!ignoreFilters && direction === -1 && isAtFirstColumn && !arePlaylistsVisible) {
            setShowPlaylistsState([true, 'left']);
        } else {
            moveCursor('x', direction);
        }
    };

    const setPositionBySongIndex = (songIndex: number) => moveToSong(songIndex);

    useKeyboard(
        {
            onEnter: handleEnter,
            onDownArrow: (e) => navigateVertically(e, 1),
            onUpArrow: (e) => navigateVertically(e, -1),
            onLeftArrow: () => navigateHorizontally(-1),
            onRightArrow: () => navigateHorizontally(1),
            onBackspace: handleBackspace,
            onR: () => {
                const newIndex = Math.round(random(0, songCount));
                setPositionBySongIndex(newIndex);
                posthog.capture('selectRandom', { newIndex });
            },
        },
        enabled && !arePlaylistsVisible,
        [groupedSongs, cursorPosition, arePlaylistsVisible, appliedFilters],
    );

    const { setHelp, clearHelp } = useKeyboardHelp();

    useEffect(() => {
        if (enabled) {
            setHelp({
                'horizontal-vertical': null,
                accept: null,
                back: null,
                shiftR: null,
            });
        }

        return clearHelp;
    }, [enabled]);

    const closePlaylist = useCallback(
        (leavingKey: 'left' | 'right') => {
            setShowPlaylistsState([false, leavingKey]);
            // if (leavingKey === 'right') navigateHorizontally(1);
        },
        [setShowPlaylistsState, navigateHorizontally, groupedSongs, cursorPosition],
    );

    useLayoutEffect(() => {
        const [previousShowFilters, enteringKey] = previousPlaylistsState;
        if (previousShowFilters && !arePlaylistsVisible) {
            console.log(cursorPosition);
            if (enteringKey === leavingKey) navigateHorizontally(leavingKey === 'right' ? 1 : -1, true);
        }
    }, [arePlaylistsVisible, leavingKey, isAtFirstColumn, isAtLastColumn, ...cursorPosition]);

    return tuple([focusedSong, setPositionBySongIndex, arePlaylistsVisible, closePlaylist]);
};

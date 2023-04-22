import React, { useCallback, useEffect, useRef, useState } from "react";
import WebsocketService, { SocketMessageType, ISocketMessage } from "../../services/websocketService";
import { Typography } from "@mui/material";
import axios from "axios";
import Song from "./song";

interface CurrentSongProps {
    useDetails?: boolean;
}
  
const CurrentSong: React.FC<CurrentSongProps> = ({ useDetails }) => {
    const websocket = useRef<WebsocketService | undefined>(undefined);
    const [currentSongTitle, setCurrentSongTitle] = useState<string>();

    document.body.style.background = "transparent";

    const loadFirstSong = () => axios.get("/api/songs").then((response) => {
        const songs = response.data as Song[];
        if (songs && songs.length > 0) {
            let title = songs[0].title;
            if (useDetails && songs[0].detailedTitle) {
                title = songs[0].detailedTitle;
            } else if (songs[0].cleanTitle) {
                title = songs[0].cleanTitle;
            }

            if (useDetails && songs[0].requestedBy) {
                const lines = title.split('\n').length;
                if (lines < 3) {
                    title += `\r\nRequested by: ${songs[0].requestedBy}`;
                }
            }

            setCurrentSongTitle(title);
        } else {
            setCurrentSongTitle("");
        }
    });

    const onSongsChanged = useCallback((message: ISocketMessage) => {
        loadFirstSong();
    }, []);

    useEffect(() => {
        websocket.current = new WebsocketService(window.location.hostname, window.location.protocol);

        return () => {
            websocket.current?.close();
        };
    }, []);

    useEffect(() => {
        if (!websocket.current) {
            return;
        }

        websocket.current.onMessage(SocketMessageType.SongAdded, onSongsChanged);
        websocket.current.onMessage(SocketMessageType.SongRemoved, onSongsChanged);
        websocket.current.onMessage(SocketMessageType.SongPlayed, onSongsChanged);
        websocket.current.onMessage(SocketMessageType.SongMovedToTop, onSongsChanged);
        websocket.current.onMessage(SocketMessageType.SongUpdated, onSongsChanged);
    }, [onSongsChanged]);

    useEffect(() => { loadFirstSong() }, []);

    return <Typography style={{ whiteSpace: 'pre-line' }}>{currentSongTitle}</Typography>;
}

export default CurrentSong;
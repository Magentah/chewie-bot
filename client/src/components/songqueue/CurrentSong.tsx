import React, { useCallback, useEffect, useRef, useState } from "react";
import WebsocketService, { SocketMessageType, ISocketMessage } from "../../services/websocketService";
import { createMuiTheme, MuiThemeProvider, Typography } from "@material-ui/core";
import axios from "axios";
import { useParams } from "react-router";

const CurrentSong: React.FC = (props) => {
    const websocket = useRef<WebsocketService | undefined>(undefined);
    const [currentSongTitle, setCurrentSongTitle] = useState<string>();

    // Allow customisation of font size (maybe more options later)
    const { size } = useParams<{ size: string | undefined }>();

    const THEME = createMuiTheme({
        typography: {
         "fontSize": size ? parseInt(size, 10) : 10,
        }
     });

    const loadFirstSong = () => axios.get("/api/songs").then((response) => {
        if (response.data && response.data.length > 0) {
            setCurrentSongTitle(response.data[0].details.title);
        } else {
            setCurrentSongTitle("");
        }
    });

    const onSongsChanged = useCallback((message: ISocketMessage) => {
        loadFirstSong();
    }, []);

    useEffect(() => {
        websocket.current = new WebsocketService();

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
    }, [onSongsChanged]);

    useEffect(() => { loadFirstSong() }, []);

    return <MuiThemeProvider theme={THEME}><Typography>{currentSongTitle}</Typography></MuiThemeProvider>;
}

export default CurrentSong;
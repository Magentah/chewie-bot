import React, { useCallback, useEffect, useRef, useState } from "react";
import WebsocketService, { SocketMessageType, ISocketMessage } from "../../services/websocketService";
import { Typography, withStyles } from "@material-ui/core";
import axios from "axios";
import { useParams } from "react-router";

const CurrentSong: React.FC = (props) => {
    const websocket = useRef<WebsocketService | undefined>(undefined);
    const [currentSongTitle, setCurrentSongTitle] = useState<string>();
    const [fontCdnUrl, setFontCdnUrl] = useState("");
    const [fontCdnPreconnectHost, setFontCdnPreconnectHost] = useState("");

    // Allow customisation of font size (maybe more options later)
    const { options } = useParams<{ options: string | undefined }>();

    const urlParams = new URLSearchParams(options);
    const size = urlParams.get("size");
    const font = urlParams.get("font") ?? "";
    const color = urlParams.get("color") ?? "000000";

    document.body.style.background = "transparent";

    const ColoredTypography = withStyles({
        root: {
            "color": "#" + color,
            "fontSize": size ? parseInt(size, 10) : 10,
            "fontFamily": font,
        }
    })(Typography);

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
        websocket.current = new WebsocketService(window.location.hostname, window.location.protocol);

        return () => {
            websocket.current?.close();
        };
    }, []);

    useEffect(() => {
        axios
            .get("/api/settings/font-cdn-url").then((response) => {
                if (response) {
                    setFontCdnUrl(response.data);
                    const url = new URL(response.data);
                    setFontCdnPreconnectHost("https://" + url.hostname);
                }
            });
    }, []);

    useEffect(() => {
        if (!websocket.current) {
            return;
        }

        websocket.current.onMessage(SocketMessageType.SongAdded, onSongsChanged);
        websocket.current.onMessage(SocketMessageType.SongRemoved, onSongsChanged);
        websocket.current.onMessage(SocketMessageType.SongMovedToTop, onSongsChanged);
    }, [onSongsChanged]);

    useEffect(() => { loadFirstSong() }, []);

    return <div>
            {fontCdnPreconnectHost ? <link rel="preconnect" href={fontCdnPreconnectHost} /> : undefined}
            {fontCdnUrl ? <link href={fontCdnUrl.replace("{font}", font)} rel="stylesheet" /> : undefined}
            <ColoredTypography>{currentSongTitle}</ColoredTypography>
        </div>;
}

export default CurrentSong;
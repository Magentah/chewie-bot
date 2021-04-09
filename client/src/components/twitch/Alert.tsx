import React, { useCallback, useEffect, useRef, useState } from "react";
import WebsocketService, { SocketMessageType, ISocketMessage } from "../../services/websocketService";
import { Fade } from "@material-ui/core";

interface IAlertData {
    href: string;
};

const Alert: React.FC = (props) => {
    const websocket = useRef<WebsocketService | undefined>(undefined);
    const [showAlert, setShowAlert] = useState<boolean>(false);
    const [alert, setAlert] = useState<IAlertData | undefined>(undefined);


    const alertTriggered = (data: IAlertData) => {
        setAlert(data);
        setShowAlert(true);
        setTimeout(() => {
            setShowAlert(false);
        }, 7500);
    };

    const onAlertTriggered = useCallback((message: ISocketMessage) => {
        alertTriggered(message.data);
    }, []);

    useEffect(() => {
        websocket.current = new WebsocketService(window.location.hostname);

        return () => {
            websocket.current?.close();
        };
    }, []);

    useEffect(() => {
        if (!websocket.current) {
            return;
        }

        websocket.current.onMessage(SocketMessageType.AlertTriggered, onAlertTriggered);
    }, [onAlertTriggered]);

    return <Fade in={showAlert}>
        <img src={alert ? alert.href : ""} width="1280" height="720"/>
    </Fade>;
}

export default Alert;
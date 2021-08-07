import React, { useCallback, useEffect, useRef, useState } from "react";
import WebsocketService, { SocketMessageType, ISocketMessage } from "../../services/websocketService";
import { Fade } from "@material-ui/core";
import { useParams } from "react-router";

interface IAlertData {
    href: string;
};

const Alert: React.FC = (props) => {
    const websocket = useRef<WebsocketService | undefined>(undefined);
    const [showAlert, setShowAlert] = useState<boolean>(false);
    const [alertsToShow, setAlertsToShow] = useState<IAlertData[]>([]);
    const [alert, setAlert] = useState<IAlertData | undefined>(undefined);
    const [intervalEnd, setIntervalEnd] = useState<NodeJS.Timeout | undefined>(undefined);
    const { timeout } = useParams<{ timeout: string | undefined }>();
    document.body.style.background = "transparent";

    if (alert && showAlert) {
        // Alert currently being shown, prepare fade out if not yet done.
        if (!intervalEnd) {
            const interval = setInterval(() => {
                setShowAlert(false);
                clearInterval(interval);
                setIntervalEnd(undefined);
            }, 7500);
            setIntervalEnd(interval);
        }
    } else if (alertsToShow.length > 0) {
        // No alert being shown at the moment, take next alert from queue.
        setAlert(alertsToShow[0]);
        setShowAlert(true);

        setAlertsToShow((state: IAlertData[]) => {
            state.splice(0, 1);
            return state;
        });
    }

    const alertTriggered = (data: IAlertData) => {
        setAlertsToShow((state: IAlertData[]) => {
            state.push(data);
            return [...state];
        });
    };

    const onAlertTriggered = useCallback((message: ISocketMessage) => {
        alertTriggered(message.data);
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

        websocket.current.onMessage(SocketMessageType.AlertTriggered, onAlertTriggered);
    }, [onAlertTriggered]);

    return <Fade in={showAlert} timeout={ timeout ? parseInt(timeout, 10) : 500 }>
        <img alt="" src={alert ? alert.href : ""} width="1280" height="720"/>
    </Fade>;
}

export default Alert;

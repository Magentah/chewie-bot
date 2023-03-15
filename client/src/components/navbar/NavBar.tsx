import React, { useContext, useEffect, useState } from "react";
import { makeStyles } from "tss-react/mui";
import { AppBar, Toolbar, IconButton, Typography, Button, Theme } from "@mui/material";
import { Image } from "react-bootstrap";
import NavBarMenu from "./NavBarMenu";
import axios from "axios";
import { green, red, grey } from "@mui/material/colors";
import { UserContext } from "../../contexts/userContext";
import CheckIcon from '@mui/icons-material/Check';
import ClearIcon from '@mui/icons-material/Clear';
import { UserLevels } from "components/common/userLevel";
import SettingsIcon from '@mui/icons-material/Settings';

type NavBarProps = {};

const useStyles = makeStyles()((theme: Theme) => ({
    rightMenu: {
        marginLeft: "auto",
        marginRight: -12,
    },
    iconButton: {
        color: "white",
        "&:hover": {
            backgroundColor: "rgba(255, 255, 255, 0.08)",
        },
    },
    connectedButton: {
        // Use same color as red (we want both white)
        color: theme.palette.getContrastText(red[500]),
        backgroundColor: green[500],
        "&:hover": {
          backgroundColor: green[700],
        },
        marginRight: "12px"
    },
    disconnectedButton: {
        color: theme.palette.getContrastText(red[500]),
        backgroundColor: red[500],
        "&:hover": {
          backgroundColor: red[700],
        },
        marginRight: "12px"
    },
    loadingButton: {
        color: theme.palette.getContrastText(grey[500]),
        backgroundColor: grey[500],
        "&:hover": {
          backgroundColor: grey[700],
        },
        marginRight: "12px"
    },
}));

const NavBar: React.FC<NavBarProps> = (props: NavBarProps) => {
    const [botConnected, setBotConnected] = useState<boolean | undefined>(undefined);
    const [hasBroadcasterAuth, setHasBroadcasterAuth] = useState<boolean | undefined>(undefined);
    const userContext = useContext(UserContext);

    const { classes } = useStyles();
    const watchChewie = () => {
        window.open("https://www.twitch.tv/chewiemelodies", "_blank");
    };
    const openDiscord = () => {
        window.open("https://discord.gg/chewiemelodies", "_blank");
    };

    const connectBot = async () => {
        if (botConnected) {
            const result = await axios.get("/api/twitch/disconnect");
            if (result.status === 200) {
                setBotConnected(false);
            }
        } else {
            const result = await axios.get("/api/twitch/connect");
            if (result.status === 200) {
                setBotConnected(true);
            }
        }
    };

    useEffect(() => {
        axios.get("/api/twitch/status").then((response) => {
            setBotConnected(response?.data.status === "OPEN");
            setHasBroadcasterAuth(response?.data.hasBroadcasterAuth);
        });
    }, []);

    const getStyle = (v: boolean | undefined) => v === undefined ? classes.loadingButton : v ? classes.connectedButton : classes.disconnectedButton;
    const getIcon = (v: boolean | undefined) => v === undefined ? undefined : v ? <CheckIcon /> : <ClearIcon />;

    const connectBroadcasterButton = (userContext.user.userLevel < UserLevels.Admin) ? undefined :
        <Button className={getStyle(hasBroadcasterAuth)} href="/api/auth/twitch/broadcaster" variant="contained" startIcon={getIcon(hasBroadcasterAuth)}>
            <Typography variant="caption">
                {hasBroadcasterAuth ? "Broastcaster permissions" : "Permissions required"}
            </Typography>
        </Button>;

    const connectChatButton = (userContext.user.userLevel < UserLevels.Admin) ? undefined :
        <Button className={getStyle(botConnected)} onClick={connectBot} variant="contained" startIcon={getIcon(botConnected)}>
            <Typography variant="caption">
                {botConnected === undefined ? "Checking status..." : botConnected ? "Chat connected" : "Chat disconnected"}
            </Typography>
        </Button>;

    const hasModAuth = userContext.user.missingModPermissions?.length === 0;
    const missingModPermissions = userContext.user.missingModPermissions?.join("\r\n");
    const connectModButton = (userContext.user.userLevel > UserLevels.Admin || userContext.user.userLevel < UserLevels.Moderator) ? undefined :
    <Button className={getStyle(hasModAuth)} href={"/api/auth/twitch/mod"} variant="contained" startIcon={<Image height="80%" width={"80%"} src={"/assets/Sword.svg"} />}
            title={`Missing permissions: ${ missingModPermissions ? missingModPermissions : "(None)"}`}>
        <Typography variant="caption">
            {hasModAuth ? "Mod authorized" : "Mod not authorized"}
        </Typography>
    </Button>;

    const hasBotAuth = userContext.user.missingBotPermissions?.length === 0;
    const missingBotPermissions = userContext.user.missingBotPermissions?.join("\r\n");
    const connectBotButton = (userContext.user.userLevel !== UserLevels.Bot) ? undefined :
    <Button className={getStyle(hasBotAuth)} href={"/api/auth/twitch/bot"} variant="contained" startIcon={<SettingsIcon />}
            title={`Missing permissions: ${missingBotPermissions ? missingBotPermissions : "(None)"}`}>
        <Typography variant="caption">
            {hasBotAuth ? "Bot authorized" : "Bot not authorized"}
        </Typography>
    </Button>;

    return (
        <AppBar position="fixed">
            <Toolbar>
                <Typography variant="h6">Chewie Melodies</Typography>
                <div className={classes.rightMenu}>
                    {hasBroadcasterAuth !== undefined ? connectBroadcasterButton : undefined}
                    {connectChatButton}
                    {connectModButton}
                    {connectBotButton}
                    <IconButton
                        color="inherit"
                        className={classes.iconButton}
                        onClick={watchChewie}
                        title="Watch ChewieMelodies on Twitch!">
                        <Image src={"/assets/TwitchGlitchWhite.png"} alt="logo" width="22em" />
                    </IconButton>
                    <IconButton
                        color="inherit"
                        className={classes.iconButton}
                        onClick={openDiscord}
                        title="Join ChewieMelodies on Discord!">
                        <Image src={"/assets/Discord-Logo-White.png"} alt="logo" width="30em" />
                    </IconButton>
                    <NavBarMenu />
                </div>
            </Toolbar>
        </AppBar>
    );
};

export default NavBar;

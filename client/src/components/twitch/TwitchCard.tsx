import {
    Card,
    CardContent,
    Grid,
    Typography,
    Link,
    Button,
    Input,
    Divider,
    TextField,
    Snackbar,
    FormControl,
    InputLabel,
    InputAdornment,
    IconButton,
    Paper,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { darken } from "@material-ui/core/styles/colorManipulator";
import axios, { AxiosResponse } from "axios";
import React, { useEffect, useState } from "react";
import { Image } from "react-bootstrap";
import { Save, Visibility, VisibilityOff } from "@material-ui/icons";
import AuthService from "../../services/authService";
import MuiAlert, { AlertProps } from "@material-ui/lab/Alert";
import useUser from "../../hooks/user";
import MaterialTable from "material-table";

const useStyles = makeStyles((theme) => ({
    title: {
        fontSize: 24,
    },
    form: {
        //margin: theme.spacing(1),
    },
    saveButton: {
        margin: theme.spacing(3, 0, 2),
    },
    twitchButton: {
        backgroundColor: "#9147ff",
        margin: theme.spacing(0, 1, 0, 0),
        textTransform: "none",
        "&:hover, &:focus": {
            backgroundColor: darken("#9147ff", 0.25),
        },
    },
    streamlabsButton: {
        backgroundColor: "#80f5d2",
        margin: theme.spacing(0, 1, 0, 0),
        textTransform: "none",
        "&:hover, &:focus": {
            backgroundColor: darken("#80f5d2", 0.25),
        },
    },
    streamlabsImage: {
        width: "130px",
        padding: "6px",
    },
    spotifyButton: {
        backgroundColor: "#1ED760",
        margin: theme.spacing(0, 1, 0, 0),
        textTransform: "none",
        "&:hover, &:focus": {
            backgroundColor: darken("#1ED760", 0.25),
        }
    },
    buttonDisabled: {
        backgroundColor: theme.palette.action.disabledBackground
    },
}));

function Alert(props: AlertProps) {
    return <MuiAlert elevation={6} variant="filled" {...props} />;
}

const TwitchCard: React.FC<any> = (props: any) => {
    const classes = useStyles();
    const [user, loadUser] = useUser();
    const [botUsername, setBotUsername] = useState("");
    const [botOAuth, setBotOAuth] = useState("");
    const [saved, setSaved] = useState(false);
    const [saveFailed, setSaveFailed] = useState(false);
    const [showBotOAuth, setShowBotOAuth] = useState(false);
    const [settings, setSettings] = useState([]);

    useEffect(loadUser, []);

    useEffect(() => {
        axios.get("/api/twitch/botSettings", { withCredentials: true }).then((response: AxiosResponse<any>) => {
            if (response.status === 200) {
                const botSettingsWrapper: any = { botSettings: response.data };
                setBotUsername(botSettingsWrapper.botSettings.username);
                setBotOAuth(botSettingsWrapper.botSettings.oauth);
            }
        });
    }, [saved]);

    useEffect(() => {
        axios.get("/api/settings").then((response) => {
            setSettings(response.data);
        });
    }, []);

    const disconnectService = (url: string) => {
        axios.get(url).then((response: AxiosResponse<any>) => {
            // TODO
        });
    };

    const submitBotDetails = async () => {
        const success = await AuthService.saveBotDetails(botUsername, botOAuth);
        if (success) {
            setSaved(true);
        } else {
            setSaveFailed(true);
        }
    };

    const handleClose = (event?: React.SyntheticEvent, reason?: string) => {
        if (reason === "clickaway") {
            return;
        }
        setSaved(false);
        setSaveFailed(false);
    };

    const handleClickShowPassword = () => {
        setShowBotOAuth(!showBotOAuth);
    };

    const handleMouseDownPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
    };

    return (
        <Card>
            <CardContent>
                <Grid container>
                    <Grid item xs={12}>
                        <Typography className={classes.title} color="textSecondary" gutterBottom>
                            Authorizations
                        </Typography>
                    </Grid>
                    <Grid item xs={12}>
                        <Typography>Twitch:</Typography>

                        <Button className={classes.twitchButton} href="/api/auth/twitch/broadcaster">
                            <Image
                                src={"/assets/TwitchGlitchWhite.png"} // Must use glitch logo (see https://www.twitch.tv/p/legal/trademark/)
                                style={{ width: "24px", margin: "1px 3px 2px 0px" }}
                            />{" "}
                            <span style={{ color: "white" }}>Authorize with Broadcaster permissions</span>
                        </Button>

                        <Button className={classes.twitchButton} onClick={() => disconnectService("/api/auth/twitch/disconnect")}>
                            <Image
                                src={"/assets/TwitchGlitchWhite.png"} // Must use glitch logo (see https://www.twitch.tv/p/legal/trademark/)
                                style={{ width: "24px", margin: "1px 3px 2px 0px" }}
                            />{" "}
                            <span style={{ color: "white" }}>Disconnect</span>
                        </Button>

                        <Typography>Streamlabs:</Typography>

                        <Button className={classes.streamlabsButton} href="/api/auth/streamlabs">
                            <Image
                                className={classes.streamlabsImage}
                                src="https://cdn.streamlabs.com/static/imgs/logos/kevin-logo.svg"
                            />
                            <Typography component="span">Connect to Streamlabs</Typography>
                        </Button>

                        <Button classes={{root: classes.streamlabsButton, disabled: classes.buttonDisabled}}
                                onClick={() => disconnectService("/api/auth/streamlabs/disconnect")}
                                disabled={!user.streamlabsSocketToken}>
                            <Image
                                className={classes.streamlabsImage}
                                src="https://cdn.streamlabs.com/static/imgs/logos/kevin-logo.svg"
                            />
                            <Typography component="span">Disconnect</Typography>
                        </Button>

                        <Typography>Spotify:</Typography>

                        <Button className={classes.spotifyButton} href="/api/auth/spotify">
                            <Image
                                src={"/assets/Spotify_Icon_RGB_Black.png"}
                                style={{ width: "30px", margin: "1px 3px 2px 0px" }}
                            />
                            <Typography component="span">Connect to Spotify</Typography>
                        </Button>

                        <Button classes={{root: classes.spotifyButton, disabled: classes.buttonDisabled}}
                                onClick={() => disconnectService("/api/auth/spotify/disconnect")}
                                disabled={!user.spotifyRefresh}>
                            <Image
                                src={"/assets/Spotify_Icon_RGB_Black.png"}
                                style={{ width: "30px", margin: "1px 3px 2px 0px" }}
                            />
                            <Typography component="span">Disconnect</Typography>
                        </Button>
                    </Grid>
                </Grid>
            </CardContent>
            <Divider />
            <CardContent>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <Typography className={classes.title} color="textSecondary" gutterBottom>
                            Bot Details
                        </Typography>
                    </Grid>
                    <Grid item xs={12} container spacing={1}>
                        <Grid item>
                            <Typography>
                                To use your own Twitch.tv account for the bot account, please enter your bot account
                                username and OAuth token here.
                            </Typography>
                        </Grid>
                        <Grid item>
                            <Typography>
                                <Link href="https://twitchapps.com/tmi/" target="_blank">
                                    Get OAuth Token
                                </Link>
                            </Typography>
                        </Grid>
                    </Grid>
                    <Grid item xs={12}>
                        <form className={classes.form} onSubmit={submitBotDetails}>
                            <Grid container spacing={2} justify="flex-end">
                                <Grid item xs={12} sm={4}>
                                    <TextField
                                        id="bot-username"
                                        label="Bot Username"
                                        fullWidth
                                        value={botUsername}
                                        onChange={(e) => setBotUsername(e.target.value)}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={8}>
                                    <FormControl fullWidth>
                                        <InputLabel htmlFor="bot-oauth">OAuth Token</InputLabel>
                                        <Input
                                            id="bot-oauth"
                                            type={showBotOAuth ? "text" : "password"}
                                            value={botOAuth}
                                            onChange={(e) => setBotOAuth(e.target.value)}
                                            fullWidth
                                            endAdornment={
                                                <InputAdornment position="end">
                                                    <IconButton
                                                        aria-label="toggle password visibility"
                                                        onClick={handleClickShowPassword}
                                                        onMouseDown={handleMouseDownPassword}
                                                    >
                                                        {showBotOAuth ? <Visibility /> : <VisibilityOff />}
                                                    </IconButton>
                                                </InputAdornment>
                                            }
                                        />
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} sm={2}>
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        startIcon={<Save />}
                                        onClick={submitBotDetails}
                                        className={classes.saveButton}
                                        fullWidth
                                    >
                                        Save
                                    </Button>
                                </Grid>
                            </Grid>
                        </form>
                        <Snackbar open={saved} autoHideDuration={4000} onClose={handleClose}>
                            <Alert onClose={handleClose} severity="success">
                                Bot settings saved.
                            </Alert>
                        </Snackbar>
                        <Snackbar open={saveFailed} autoHideDuration={4000} onClose={handleClose}>
                            <Alert onClose={handleClose} severity="error">
                                Bot settings failed to save.
                            </Alert>
                        </Snackbar>
                    </Grid>
                </Grid>
            </CardContent>
            <Divider />
            <CardContent>
                <Grid spacing={2}>
                    <Grid item xs={1}>
                        <Typography className={classes.title} color="textSecondary" gutterBottom>
                            Settings
                        </Typography>
                    </Grid>
                    <Grid item>
                        <MaterialTable
                            columns = {[
                                { title: "Name", field: "key" },
                                { title: "Value", field: "value" }
                            ]}
                            options = {{
                                paging: false,
                                showTitle: false,
                            }}
                            data = {settings}
                            components={{
                                Container: p => <Paper {...p} elevation={0}/>
                            }}
                        />
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    );
};

export default TwitchCard;

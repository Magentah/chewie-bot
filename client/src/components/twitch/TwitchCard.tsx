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
    ButtonGroup,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { darken } from "@material-ui/core/styles/colorManipulator";
import axios, { AxiosResponse } from "axios";
import React, { useEffect, useState } from "react";
import { Image } from "react-bootstrap";
import { Save, Visibility, VisibilityOff, Check, Clear } from "@material-ui/icons";
import AuthService from "../../services/authService";
import MuiAlert, { AlertProps } from "@material-ui/lab/Alert";
import useUser from "../../hooks/user";
import MaterialTable from "material-table";

const useStyles = makeStyles((theme) => ({
    title: {
        fontSize: 24,
    },
    buttonGroup: {
        margin: theme.spacing(1, 0, 0, 0),
    },
    saveButton: {
        margin: theme.spacing(3, 0, 2),
    },
    twitchButton: {
        backgroundColor: "#9147ff",
        textTransform: "none",
        "&:hover, &:focus": {
            backgroundColor: darken("#9147ff", 0.25),
        },
        "&:disabled": {
            backgroundColor: "#9147ff",
        }
    },
    streamlabsButton: {
        backgroundColor: "#80f5d2",
        textTransform: "none",
        "&:hover, &:focus": {
            backgroundColor: darken("#80f5d2", 0.25),
        },
        "&:disabled": {
            backgroundColor: "#80f5d2",
        }
    },
    streamlabsImage: {
        width: "130px",
        padding: "6px",
    },
    spotifyButton: {
        backgroundColor: "#1ED760",
        textTransform: "none",
        "&:hover, &:focus": {
            backgroundColor: darken("#1ED760", 0.25),
        },
        "&:disabled": {
            backgroundColor: "#1ED760",
        }
    }
}));

function Alert(props: AlertProps) {
    return <MuiAlert elevation={6} variant="filled" {...props} />;
}

type SettingData = { key: string, value: string, description: string, readonly: boolean };

const TwitchCard: React.FC<any> = (props: any) => {
    const classes = useStyles();
    const [user, loadUser] = useUser();
    const [botUsername, setBotUsername] = useState("");
    const [botOAuth, setBotOAuth] = useState("");
    const [saved, setSaved] = useState(false);
    const [saveFailed, setSaveFailed] = useState(false);
    const [showBotOAuth, setShowBotOAuth] = useState(false);
    const [settings, setSettings] = useState([] as SettingData[]);

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
            setSettings(response.data.filter((x: SettingData) => !x.readonly));
        });
    }, []);

    const disconnectService = (url: string) => {
        axios.get(url).then((response: AxiosResponse<any>) => {
            loadUser();
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
                        <Grid item>
                            <ButtonGroup variant="contained" color="primary" aria-label="contained primary button group">
                                <Button className={classes.twitchButton} disabled style={{ width: "17em" }}>
                                    <Image
                                        src={"/assets/TwitchGlitchWhite.png"} // Must use glitch logo (see https://www.twitch.tv/p/legal/trademark/)
                                        style={{ width: "24px", margin: "1px 8px 2px 0px" }}
                                    />
                                    <span style={{ color: "white" }}>Broadcaster permissions</span>
                                </Button>
                                <Button style={{ color: "white" }} className={classes.twitchButton} disabled><Check /></Button>
                                <Button style={{ color: "white" }} href="/api/auth/twitch/broadcaster">Connect</Button>
                                <Button onClick={() => disconnectService("/api/auth/twitch/disconnect")}>Disconnect</Button>
                            </ButtonGroup>
                        </Grid>

                        <Grid item>
                            <ButtonGroup variant="contained" color="primary" aria-label="contained primary button group" className={classes.buttonGroup}>
                                <Button className={classes.streamlabsButton} disabled style={{ width: "17em" }}>
                                    <Image
                                        className={classes.streamlabsImage}
                                        src="https://cdn.streamlabs.com/static/imgs/logos/kevin-logo.svg"
                                    />
                                </Button>

                                <Button style={{ color: "black" }} className={classes.streamlabsButton} disabled>{user.streamlabsSocketToken ? <Check /> : <Clear />}</Button>
                                <Button style={{ color: "white" }} href="/api/auth/streamlabs">Connect</Button>
                                <Button onClick={() => disconnectService("/api/auth/streamlabs/disconnect")} disabled={!user.streamlabsSocketToken}>Disconnect</Button>
                            </ButtonGroup>
                        </Grid>

                        <Grid item>
                            <ButtonGroup variant="contained" color="primary" aria-label="contained primary button group" className={classes.buttonGroup}>
                                <Button className={classes.spotifyButton} disabled style={{ width: "17em" }}>
                                    <Image
                                        src={"/assets/Spotify_Icon_RGB_Black.png"}
                                        style={{ width: "30px", margin: "1px 6px 2px 0px" }}
                                    />
                                    <Typography style={{ color: "black" }} component="span">Spotify</Typography>
                                </Button>

                                <Button style={{ color: "black" }} className={classes.spotifyButton} disabled>{user.spotifyRefresh ? <Check /> : <Clear />}</Button>
                                <Button style={{ color: "white" }} href="/api/auth/spotify">Connect</Button>
                                <Button onClick={() => disconnectService("/api/auth/spotify/disconnect")} disabled={!user.spotifyRefresh}>Disconnect</Button>
                            </ButtonGroup>
                        </Grid>
                    </Grid>
                </Grid>
            </CardContent>

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
                        <form onSubmit={submitBotDetails}>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={5}>
                                    <TextField
                                        id="bot-username"
                                        label="Bot Username"
                                        fullWidth
                                        value={botUsername}
                                        onChange={(e) => setBotUsername(e.target.value)}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={5}>
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
                                { title: "Name", field: "description", defaultSort: "asc" },
                                { title: "Value", field: "value" }
                            ]}
                            options = {{
                                paging: false,
                                showTitle: false,
                                actionsColumnIndex: 2
                            }}
                            data = {settings}
                            components={{
                                Container: p => <Paper {...p} elevation={0}/>
                            }}
                            editable = {
                                {
                                    isEditable: rowData => true,
                                    isDeletable: rowData => false,
                                    onRowUpdate: (newData, oldData) => axios.post("/api/settings", newData).then((result) => {
                                        if (result.status === 200) {
                                            const newSettings = [...settings];
                                            // @ts-ignore
                                            const index = oldData?.tableData.id;
                                            newSettings[index] = newData;
                                            setSettings(newSettings);
                                        }
                                    })
                                }
                            }
                        />
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    );
};

export default TwitchCard;

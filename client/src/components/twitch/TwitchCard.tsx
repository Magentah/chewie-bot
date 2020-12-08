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
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { darken } from "@material-ui/core/styles/colorManipulator";
import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";
import React, { useEffect, useState } from "react";
import { Image } from "react-bootstrap";
import { Save, Visibility, VisibilityOff } from "@material-ui/icons";
import AuthService from "../../services/authService";
import MuiAlert, { AlertProps } from "@material-ui/lab/Alert";

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
        marginRight: "10px",
        textTransform: "none",
        "&:hover, &:focus": {
            backgroundColor: darken("#9147ff", 0.25),
        },
    },
    streamlabsButton: {
        backgroundColor: "#80f5d2",
        textTransform: "none",
        "&:hover, &:focus": {
            backgroundColor: darken("#80f5d2", 0.25),
        },
    },
    streamlabsImage: {
        width: "130px",
        padding: "6px",
    },
}));

function Alert(props: AlertProps) {
    return <MuiAlert elevation={6} variant="filled" {...props} />;
}

const TwitchCard: React.FC<any> = (props: any) => {
    const classes = useStyles();
    const isDev = true;

    const defaultUser: any = {
        streamlabsToken: null,
        username: null,
    };

    const [user, setUser] = useState(defaultUser);
    const [botUsername, setBotUsername] = useState("");
    const [botOAuth, setBotOAuth] = useState("");
    const [saved, setSaved] = useState(false);
    const [saveFailed, setSaveFailed] = useState(false);
    const [showBotOAuth, setShowBotOAuth] = useState(false);

    useEffect(() => {
        axios
            .get("api/isloggedin", {
                withCredentials: true,
            })
            .then((response: AxiosResponse<any>) => {
                if (response.status === 200) {
                    const userWrapper: any = { user: response.data };
                    console.log("login", userWrapper);
                    setUser(userWrapper.user);
                } else if (response.status === 403) {
                    //
                }
            })
            .catch((err: AxiosError<any>) => {
                console.log("ERR", err);
            });
    }, []);

    useEffect(() => {
        axios.get("api/twitch/botSettings", { withCredentials: true }).then((response: AxiosResponse<any>) => {
            if (response.status === 200) {
                const botSettingsWrapper: any = { botSettings: response.data };
                console.log(botSettingsWrapper);
                setBotUsername(botSettingsWrapper.botSettings.username);
                setBotOAuth(botSettingsWrapper.botSettings.oauth);
            }
        });
    }, [saved]);

    const renderWelcome = () => {
        if (isDev) {
            return (
                <div>
                    <div style={{ marginTop: "10px" }}> Welcome Dango Devs!</div>
                    <p>
                        Any modification to <code>{"src/client/**"}</code> can be reloaded by{" "}
                        <code>{"cd src/client && yarn build"}</code>
                    </p>
                </div>
            );
        }
        return <p>Welome to the Dango Family! Sign in using your Twitch account</p>;
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
            <CardContent style={{ textAlign: "center" }}>
                <Grid container>
                    <Grid item xs={12} style={{ marginBottom: "20px" }}>
                        <Image src={"/assets/chewie_logo.jpg"} alt="logo" width="25%" roundedCircle />
                    </Grid>
                    <Grid item xs={12}>
                        {renderWelcome()}
                    </Grid>
                    <Grid item xs={12}>
                        <Button className={classes.twitchButton} href={`/api/twitch/${user.username}/join`}>
                            <Image
                                src={"assets/glitch_logo.png"} // Must use glitch logo (see https://www.twitch.tv/p/legal/trademark/)
                                style={{ width: "30px" }}
                            />{" "}
                            <span style={{ color: "white" }}>Connect ChewieBot to Twitch</span>
                        </Button>
                        <Button className={classes.streamlabsButton} href="/api/auth/streamlabs">
                            <Image
                                className={classes.streamlabsImage}
                                src="https://cdn.streamlabs.com/static/imgs/logos/kevin-logo.svg"
                            />
                            <Typography component="span">Connect to Streamlabs</Typography>
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
                    <Grid item xs={12}>
                        <Typography>
                            To use your own Twitch.tv account for the bot account, please enter your bot account
                            Username and OAuth Token here.
                        </Typography>
                    </Grid>
                    <Grid item xs={12}>
                        <Typography>
                            <Link href="https://twitchapps.com/tmi/" target="_blank">
                                You can get your OAuth Token here.
                            </Link>
                        </Typography>
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
        </Card>
    );
};

export default TwitchCard;

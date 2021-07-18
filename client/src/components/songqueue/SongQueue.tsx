import React, { useState, useEffect, useRef, useCallback } from "react";
import { Image } from "react-bootstrap";
import { Grid, Typography, Box, makeStyles, GridList, GridListTile, GridListTileBar, Divider, TextField, Button, Snackbar, CircularProgress, Paper, Link, Tabs, Tab } from "@material-ui/core";
import MuiAlert, { AlertProps } from "@material-ui/lab/Alert";
import IconButton from "@material-ui/core/IconButton";
import PlayCircleOutlineIcon from "@material-ui/icons/PlayCircleOutline";
import OpenInNewIcon from "@material-ui/icons/OpenInNew";
import AddIcon from "@material-ui/icons/Add";
import VerticalAlignTopIcon from "@material-ui/icons/VerticalAlignTop";
import CheckIcon from "@material-ui/icons/Check";
import AttachMoneyIcon from "@material-ui/icons/AttachMoney";
import WebsocketService, { SocketMessageType, ISocketMessage } from "../../services/websocketService";
import moment from "moment";
import axios from "axios";
import useUser, { UserLevels } from "../../hooks/user";
import MaterialTable, { Action, Column, Options } from "material-table";
import useSetting from "../../hooks/setting";

const useStyles = makeStyles((theme) => ({
    root: {
      display: "flex",
      flexWrap: "wrap",
      justifyContent: "flex-start",
      overflow: "hidden",
      backgroundColor: theme.palette.background.paper,
      marginBottom: "2em",
      marginTop: "1em"
    },
    gridList: {
        width: "100%"
    },
    icon: {
      color: "rgba(255, 255, 255, 0.54)",
    },
    addButton: {
        margin: theme.spacing(2, 0, 2),
    },
    requestHistory: {
        margin: theme.spacing(0),
    },
    table: {
        "& tbody tr:last-child td": {
          border: 0
        }
      }
}));

export enum SongSource {
    Youtube = "Youtube",
    Spotify = "Spotify",
}

const DetailCell: React.FC<{value: Song, onPlaySong: (id: string) => void}> = (props) => {
    const duration = moment.utc(moment.duration(props.value.details.duration).asMilliseconds()).format("HH:mm:ss");

    const playButton = props.value.details.source === SongSource.Spotify ? (<Grid item>
        <IconButton onClick={() => props.onPlaySong(props.value.sourceId)}>
            <PlayCircleOutlineIcon />
        </IconButton>
    </Grid>) : undefined;

    return (
        <Grid container direction="row" justify="flex-start" wrap="nowrap">
            <Grid item>
                <a href={props.value.previewData.linkUrl} target="_blank">
                    <Image style={{ maxHeight: "100px" }} src={props.value.previewData.previewUrl} thumbnail />
                </a>
            </Grid>
            <Grid item xs>
                <Grid container style={{ marginLeft: "1em" }}>
                    <Grid>
                        <Grid item xs={12}>
                            <Typography>
                                <Link href={props.value.previewData.linkUrl} target="_blank">
                                    {props.value?.details.title}
                                </Link>
                            </Typography>
                        </Grid>
                        <Grid>
                            <Typography style={{ fontSize: 14, fontStyle: "italic" }}>
                                Length: {duration}{" "}
                            </Typography>
                        </Grid>
                    </Grid>
                    {playButton}
                </Grid>
            </Grid>
        </Grid>
    );
};

const RequestTimeCell: React.FC<any> = (value: Song) => {
    return (
        <Typography>
            {moment(value?.requestTime).format("HH:mm")}
        </Typography>
    );
};

const RequestDateCell: React.FC<any> = (value: Song) => {
    const dateFormat = new Intl.DateTimeFormat("en", { day: "2-digit", year: "numeric", month: "short", weekday: "short" });

    return (
        <Typography>
            {dateFormat.format(value?.requestTime)}
        </Typography>
    );
};

interface Song {
    previewData: {
        previewUrl: string,
        linkUrl: string
    },
    details: {
        title: string;
        duration: moment.Duration;
        sourceId: string;
        source: SongSource;
    };
    source: number;
    sourceId: string;
    duration: moment.Duration;
    requestedBy: string;
    requesterStatus: {
        viewerStatus: string;
        vipStatus: string;
    };
    requestSource: string;
    requestTime: number;
    comments: string;
}

interface OwnRequest {
    index: number,
    song: Song
}

type NoSongRequestState = {
    state: undefined;
};

type AddedSongRequestState = {
    state: "success";
};

type AddingSongRequestState = {
    state: "progress";
};

type FailedSongRequestState = {
    state: "failed";
    message: string;
};

type SongRequestState = NoSongRequestState | AddedSongRequestState | AddingSongRequestState | FailedSongRequestState;

function Alert(props: AlertProps) {
    return <MuiAlert elevation={6} variant="filled" {...props} />;
}

const SongQueue: React.FC<{onPlaySong: (id: string) => void}> = (props) => {
    const [songs, setSongs] = useState<Song[]>([]);
    const [playedSongs, setPlayedSongs] = useState<Song[]>([]);
    const websocket = useRef<WebsocketService | undefined>(undefined);
    const [user, loadUser] = useUser();
    const [songRequestUrl, setSongRequestUrl] = useState<string>();
    const donationLinkUrl = useSetting<string>("song-donation-link");
    const [songRequestState, setSongRequestState] = useState<SongRequestState>();
    const [selectedTab, setSelectedTab] = React.useState(0);

    const classes = useStyles();

    const addSong = (newSong: Song) => setSongs((state: Song[]) => [...state, newSong]);
    const deleteSong = (song: Song) =>
        setSongs((state: Song[]) => {
            const songIndex = state.indexOf(song);
            return state.filter((_, i) => i !== songIndex);
        });

    const moveSongToTop = (song: Song) =>
        setSongs((state: Song[]) => {
            const songIndex = state.indexOf(song);
            const newState = [...state];
            newState.splice(songIndex, 1);
            newState.splice(0, 0, song);
            return newState;
        });

    const updateHistory = () => {
        axios.get("/api/playedsongs").then((response) => {
            setPlayedSongs(response.data);
        });
    };

    const onSongAdded = useCallback((message: ISocketMessage) => {
        if (message.data && message.data.details && message.data.sourceId) {
            message.data.details.sourceId = message.data.sourceId;
        }
        addSong(message.data);
    }, []);

    const onSongPlayed = useCallback((message: ISocketMessage) => {
        updateHistory();
    }, []);

    useEffect(() => {
        axios.get("/api/songs").then((response) => {
            // Returned array might have gaps in index, these will be filled with null objects here.
            // We don't want that, so filter.
            setSongs(response.data.filter((obj: Song, i: number) => obj !== null));
        });
    }, []);

    useEffect(updateHistory, []);

    useEffect(loadUser, []);

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
        websocket.current.onMessage(SocketMessageType.SongAdded, onSongAdded);
        websocket.current.onMessage(SocketMessageType.SongPlayed, onSongPlayed);
    }, [onSongAdded]);

    const onSongDeleted = (rowsDeleted: Song[]) => {
        axios.post("/api/songs/delete", { songs: rowsDeleted }).then(() => {
            rowsDeleted.forEach((song: Song) => deleteSong(song));
        });
    };

    const onSongCompleted = (rowsDeleted: Song[]) => {
        axios.post("/api/songs/complete", { songs: rowsDeleted }).then(() => {
            rowsDeleted.forEach((song: Song) => deleteSong(song));
        });
    };

    const onSongMovedToTop = (rowsMoved: Song[]) => {
        axios.post("/api/songs/movetotop", { songs: rowsMoved }).then(() => {
                rowsMoved.forEach((song: Song) => moveSongToTop(song));
        });
    };

    const submitSongRequest = async () => {
        try {
            setSongRequestState({state: "progress"});

            const result = await axios.post(`/api/songs/user/${user.username}`, { url: songRequestUrl, requestSource: "Bot UI" },
                    { validateStatus: (status) => true });
            if (result.status === 200) {
                setSongRequestState({state: "success"});
                setSongRequestUrl("");
            } else {
                setSongRequestState({
                    state: "failed",
                    message: result.data.error.message
                });
            }
        } catch (error) {
            setSongRequestState({
                state: "failed",
                message: error.message
            });
        }
    };

    const handleClose = (event?: React.SyntheticEvent, reason?: string) => {
        if (reason === "clickaway") {
            return;
        }
        setSongRequestState({
            state: undefined
        });
    };

    const handleTabChange = (event: React.ChangeEvent<{}>, newValue: number) => {
        setSelectedTab(newValue);
    };

    // Don't allow selecting songs for deletion without permission.
    const tableOptions: Options<Song> = { paging: false, actionsColumnIndex: 5, tableLayout: "auto" };
    let tableActions: (Action<Song> | ((rowData: Song) => Action<Song>))[] = [];
    if (user.userLevelKey >= UserLevels.Moderator) {
        tableActions = [
            rowData => ({
                icon: VerticalAlignTopIcon,
                tooltip: "Move to top",
                hidden: songs.indexOf(rowData) === 0,
                onClick: (event, data) => (data as Song[]).length ? onSongMovedToTop(data as Song[]) : onSongMovedToTop([ data as Song ])
            }),
            rowData => ({
                icon: CheckIcon,
                tooltip: "Complete",
                hidden: songs.indexOf(rowData) !== 0,
                onClick: (evt, data) => (data as Song[]).length ? onSongCompleted(data as Song[]) : onSongCompleted([ data as Song ])
            }),
            {
                tooltip: "Remove",
                icon: "delete",
                onClick: (evt, data) => (data as Song[]).length ? onSongDeleted(data as Song[]) : onSongDeleted([ data as Song ])
            }
        ];
    }

    // Find own requested songs and list them.
    const ownSongs: OwnRequest[] = [];
    for (const song of songs) {
        if (song.requestedBy === user.username) {
            ownSongs.push({
                index: songs.indexOf(song),
                song
            });
        }
    }

    const addSongrequestsForm = (user.userLevelKey >= UserLevels.Moderator)
        ? <Grid item xs={12}>
            <form onSubmit={submitSongRequest}>
                <Grid container spacing={2} justify="flex-start">
                    <Grid item xs={12} sm={4}>
                        <TextField
                            id="song-url"
                            label="Add song request (URL)"
                            fullWidth
                            value={songRequestUrl}
                            onChange={(e) => setSongRequestUrl(e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={12} sm={2}>
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={songRequestState?.state === "progress" ? <CircularProgress size={15} /> : <AddIcon />}
                            onClick={submitSongRequest}
                            className={classes.addButton}
                            disabled={songRequestState?.state === "progress"}>
                            Add
                        </Button>
                    </Grid>
                </Grid>
            </form>
            <Snackbar open={songRequestState?.state === "success"} autoHideDuration={4000} onClose={handleClose}>
                <Alert onClose={handleClose} severity="success">
                    Song request added.
                </Alert>
            </Snackbar>
            { songRequestState?.state === "failed" ?
            <Snackbar open={true} autoHideDuration={4000} onClose={handleClose}>
                <Alert onClose={handleClose} severity="error">
                    Song request could not be added: {songRequestState.message}
                </Alert>
            </Snackbar> : undefined}
        </Grid>
        : undefined;

    // Display only for known users, we can't indentify requests otherwise.
    const ownSongQueue = !user.username ? undefined :
        <Box mb={1} mt={2} key="own-queue">
            {(ownSongs.length === 0)
             ? (donationLinkUrl ?
                 <Typography>
                    <Link href={donationLinkUrl} target="_blank">
                        <AttachMoneyIcon /> Donate for your song request
                    </Link>
                </Typography>
               : undefined)
             : <Box mt={2}>
                <Typography variant="h6">
                    Your requests
                </Typography>
                <div className={classes.root}>
                   <GridList cellHeight={140} cols={3} className={classes.gridList}>
                       {ownSongs.map((tile) => (
                           <GridListTile key={tile.song.previewData.previewUrl}>
                               <img src={tile.song.previewData.previewUrl} alt={tile.song.details.title} />
                               <GridListTileBar
                                   title={tile.song.details.title}
                                   subtitle={<span>Position: {tile.index + 1}</span>}
                                   actionIcon={
                                       <IconButton href={tile.song.previewData.linkUrl} className={classes.icon} target="_blank">
                                           <OpenInNewIcon />
                                       </IconButton>
                                   }
                               />
                           </GridListTile>
                       ))}
                   </GridList>
                </div>
               </Box>
            }
            {addSongrequestsForm}
            <Divider />
        </Box>

    const queueColumns: Column<Song>[] = [
        {
            title: "Song Title",
            field: "details.title",
            render: rowData => DetailCell({value: rowData, onPlaySong: props.onPlaySong}),
            sorting: false,
            width: "60%"
        },
        {
            title: "Requested By",
            field: "requestedBy",
            align: "left",
            sorting: false,
            width: "20%"
        },
        {
            title: "Time",
            field: "requestTime",
            render: rowData => RequestTimeCell(rowData),
            sorting: false,
            width: "10%"
        },
        {
            title: "Requested With",
            field: "requestSource",
            sorting: false,
            width: "10%"
        }
    ];

    if (user.userLevelKey >= UserLevels.Moderator) {
        queueColumns.splice(1, 0,
        {
            title: "Comments",
            field: "comments",
            render: rowData => <div style={{maxWidth: "20em"}}>{rowData.comments}</div>,
            width: "10%",
        });
    }

    const elements = [];

    if (selectedTab === 0) {
        elements.push(ownSongQueue);
        elements.push(<MaterialTable
            key="full-queue"
            title = "Song Queue"
            columns = {queueColumns}
            options = {tableOptions}
            data = {songs}
            components={{
                Container: p => <Paper {...p} elevation={0} className={classes.table} />
            }}
            actions={tableActions}
        />);
    }

    if (selectedTab === 1) {
        elements.push(<MaterialTable
            title = "Recently requested and played"
            columns = {[
                {
                    title: "Song Title",
                    field: "details.title",
                    render: rowData => DetailCell({value: rowData, onPlaySong: props.onPlaySong}),
                    sorting: false,
                    width: "80%"
                },
                {
                     title: "Requested By",
                     field: "requestedBy",
                     align: "left",
                     sorting: false,
                     width: "10%"
                },
                {
                    title: "Request time",
                    field: "requestTime",
                    render: rowData => RequestDateCell(rowData),
                    sorting: false,
                    width: "10%"
                },
            ]}
            options = {{...tableOptions, search: false, showTitle: false, toolbar: false}}
            data = {playedSongs}
            components={{
                Container: p => <Paper {...p} elevation={0} className={`${classes.requestHistory} ${classes.table}`} />
            }}
        />);
    }

    return (
        <Box>
            <Tabs
                value={selectedTab}
                indicatorColor="primary"
                textColor="primary"
                onChange={handleTabChange}>
                <Tab label="Song Queue" />
                <Tab label="Recently Played" />
            </Tabs>
            {elements}
        </Box>
    );
};

export default SongQueue;

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Image } from "react-bootstrap";
import { Grid, Typography, Box, makeStyles, GridList, GridListTile, GridListTileBar, Divider, TextField, Button, Snackbar, CircularProgress, Paper } from "@material-ui/core";
import MuiAlert, { AlertProps } from "@material-ui/lab/Alert";
import IconButton from "@material-ui/core/IconButton";
import PlayCircleOutlineIcon from '@material-ui/icons/PlayCircleOutline';
import OpenInNewIcon from '@material-ui/icons/OpenInNew';
import AddIcon from '@material-ui/icons/Add';
import WebsocketService, { SocketMessageType, ISocketMessage } from "../../services/websocketService";
import moment from "moment";
import axios from "axios";
import useUser, { UserLevels } from "../../hooks/user";
import MaterialTable, { Action, Options } from "material-table";


const useStyles = makeStyles((theme) => ({
    root: {
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'flex-start',
      overflow: 'hidden',
      backgroundColor: theme.palette.background.paper,
      marginBottom: '2em',
      marginTop: '1em'
    },
    gridList: {
        width: '100%'
    },
    icon: {
      color: 'rgba(255, 255, 255, 0.54)',
    },
    addButton: {
        margin: theme.spacing(2, 0, 2),
    },
}));

export enum SongSource {
    Youtube = "Youtube",
    Spotify = "Spotify",
}

const PreviewCell: React.FC<any> = (value) => {
    return (
        <div className="Pog2">
            <a href={value.previewData.linkUrl} target="_blank">
                <Image style={{ maxHeight: "100px" }} src={value.previewData.previewUrl} thumbnail />
            </a>
        </div>
    );
};

const DetailCell: React.FC<{value: Song, onPlaySong: (id: string) => void}> = (props) => {
    const duration = moment.utc(moment.duration(props.value.duration).asMilliseconds()).format("HH:mm:ss");

    const playButton = props.value.details.source === SongSource.Spotify ? (<Grid item>
        <IconButton onClick={() => props.onPlaySong(props.value.sourceId)}>
            <PlayCircleOutlineIcon />
        </IconButton>
    </Grid>) : undefined;

    return (
        <Grid container style={{ marginBottom: 40 }}>
            <Grid>
                <Grid item xs={12}>
                    <Typography component="div">
                        {props.value?.details.title}
                    </Typography>
                </Grid>
                <Grid>
                    <Typography component="div">
                        <Box fontStyle="italic" fontSize={14}>
                            Song Length: {duration}{" "}
                        </Box>
                    </Typography>
                </Grid>
            </Grid>
            {playButton}
        </Grid>
    );
};

const RequesterStatusCell: React.FC<any> = (value: Song) => {
    return (
        <Grid>
            <Typography component="div" style={{ marginBottom: 20 }}>
                Status
                <Box fontStyle="italic" fontSize={14}>
                    {value?.requesterStatus?.viewerStatus}
                </Box>
            </Typography>
            <Typography component="div">
                VIP Status
                <Box fontStyle="italic" fontSize={14}>
                    {value?.requesterStatus?.vipStatus}
                </Box>
            </Typography>
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
    const websocket = useRef<WebsocketService | undefined>(undefined);
    const [user, loadUser] = useUser();
    const [songRequestUrl, setsongRequestUrl] = useState<string>();
    const [songRequestState, setSongRequestState] = useState<SongRequestState>();

    const classes = useStyles();

    const addSong = (newSong: Song) => setSongs((state: Song[]) => [...state, newSong]);
    const deleteSong = (song: Song) =>
        setSongs((state: Song[]) => {
            const songIndex = state.indexOf(song);
            return state.filter((_, i) => i !== songIndex);
        });

    const onSongAdded = useCallback((message: ISocketMessage) => {
        if (message.data && message.data.details && message.data.sourceId) {
            message.data.details.sourceId = message.data.sourceId;
        }
        console.log(`song added`);
        addSong(message.data);
    }, []);

    useEffect(() => {
        axios.get("/api/songs").then((response) => {
            setSongs(response.data);
        });
    }, []);

    useEffect(loadUser, []);

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
        console.log(`songqueue websocket connected`);

        websocket.current.onMessage(SocketMessageType.SongAdded, onSongAdded);
    }, [onSongAdded]);

    const onSongDeleted = (rowsDeleted: Song[]) => {
        axios.post("api/songs/delete", { songs: rowsDeleted }).then((response) => {
            //
        });

        rowsDeleted.forEach((song: Song) => deleteSong(song));
    };

    const submitSongRequest = async () => {
        try {
            setSongRequestState({state: "progress"});

            const result = await axios.post(`/api/songs/user/${user.username}`, { url: songRequestUrl, requestSource: 'Bot UI' },
                    { validateStatus: function(status) {  return true; }});
            if (result.status === 200) {
                setSongRequestState({state: "success"});
                setsongRequestUrl("");
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

    // Don't allow selecting songs for deletion without permission.
    let tableOptions: Options<Song> = { paging: false, actionsColumnIndex: 3 };
    let tableActions: Action<Song>[] = [];
    if (user.userLevelKey >= UserLevels.Moderator) {
        tableOptions = {
            ...tableOptions,
            selection: true
        }

        tableActions = [ {
              tooltip: "Remove all",
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
                            onChange={(e) => setsongRequestUrl(e.target.value)}
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
        <Box mb={1}>
            <Typography variant="h5">
                Your requests
            </Typography>
            {(ownSongs.length === 0)
             ? <Typography>No song requests made.</Typography>
             : <div className={classes.root}>
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
            }
            {addSongrequestsForm}
            <Divider />
        </Box>

    return (
        <Box>
            {ownSongQueue}
            <MaterialTable
                title = "Song Queue"
                columns = {[
                    {
                        title: "Preview",
                        field: "previewData.previewUrl",
                        filtering: false,
                        render: rowData => PreviewCell(rowData)
                    },
                    {
                        title: "Song Title",
                        field: "details.title",
                        render: rowData => DetailCell({value: rowData, onPlaySong: props.onPlaySong})
                    },
                    {
                         title: "Requested By",
                         field: "requestedBy",
                         align: "left"
                    },
                    {
                        title: "Request time",
                        field: "requestTime",
                        render: rowData => RequestTimeCell(rowData)
                    },
                    {
                        title: "Requester Status",
                        field: "requesterStatus.viewerStatus",
                        render: rowData => RequesterStatusCell(rowData)
                    },
                    {
                        title: "Requested With",
                        field: "requestSource"
                    }
                ]}
                options = {tableOptions}
                data = {songs}
                components={{
                    Container: props => <Paper {...props} elevation={0}/>
                }}
                actions={tableActions}
            />
        </Box>
    );
};

export default SongQueue;

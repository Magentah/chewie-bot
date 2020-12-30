import React, { useState, useEffect, useRef } from "react";
import MUIDataTable, { MUIDataTableOptions } from "mui-datatables";
import { Image } from "react-bootstrap";
import { Grid, Typography, Box, makeStyles, GridList, GridListTile, GridListTileBar, Divider, TextField, Button, Snackbar, CircularProgress } from "@material-ui/core";
import MuiAlert, { AlertProps } from "@material-ui/lab/Alert";
import { createMuiTheme, MuiThemeProvider } from "@material-ui/core/styles";
import IconButton from "@material-ui/core/IconButton";
import PlayCircleOutlineIcon from '@material-ui/icons/PlayCircleOutline';
import OpenInNewIcon from '@material-ui/icons/OpenInNew';
import AddIcon from '@material-ui/icons/Add';
import WebsocketService, { SocketMessageType, ISocketMessage } from "../../services/websocketService";
import moment from "moment";
import axios from "axios";
import useUser, { UserLevels } from "../../hooks/user";

const x: any = {
    MUIDataTableHeadCell: {
        root: {
            "&:nth-child(2)": {
                width: 150,
            },
        },
    },
};

const getMuiTheme = () => {
    return createMuiTheme({
        overrides: x,
    });
};

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


const PreviewCell: React.FC<any> = (value) => {
    return (
        <div className="Pog2">
            <a href={value.linkUrl}>
                <Image style={{ maxHeight: "100px" }} src={value.previewUrl} thumbnail />
            </a>
        </div>
    );
};

const DetailCell: React.FC<{value: any, onPlaySong: (id: string) => void}> = (props) => {
    const duration = moment.utc(moment.duration(props.value.duration).asMilliseconds()).format("HH:mm:ss");
    
    const playButton = props.value.source === SongSource.Spotify ? (<Grid item>
        <IconButton onClick={() => props.onPlaySong(props.value.sourceId)}>
            <PlayCircleOutlineIcon />
        </IconButton>
    </Grid>) : undefined;

    return (
        <Grid container style={{ marginBottom: 40 }}>
            <Grid>
                <Grid item xs={12}>
                    <Typography component="div">
                        {props.value?.title}
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

const RequesterCell: React.FC<any> = (value) => {
    return (
        <Typography component="div">
            <Box>{value}</Box>
        </Typography>
    );
};

const RequesterStatusCell: React.FC<any> = (value) => {
    return (
        <Grid>
            <Typography component="div" style={{ marginBottom: 20 }}>
                Status
                <Box fontStyle="italic" fontSize={14}>
                    {value?.viewerStatus}
                </Box>
            </Typography>
            <Typography component="div">
                VIP Status
                <Box fontStyle="italic" fontSize={14}>
                    {value?.vipStatus}
                </Box>
            </Typography>
        </Grid>
    );
};

const RequestedWithCell: React.FC<any> = (value) => {
    return (
        <Typography component="div">
            <Box>{value}</Box>
        </Typography>
    );
};

export enum SongSource {
    Youtube = "Youtube",
    Spotify = "Spotify",
}

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
    const deleteSong = (songIndex: number) =>
        setSongs((state: Song[]) => {
            state.splice(songIndex, 1);
            return state;
        });

    const onSongAdded = (message: ISocketMessage) => {
        if (message.data && message.data.details && message.data.sourceId) {
            message.data.details.sourceId = message.data.sourceId;
        }
        console.log(`song added`);
        addSong(message.data);
    };

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
    }, []);

    const onSongDeleted = (rowsDeleted: any) => {
        console.log(rowsDeleted);
        const indexes = rowsDeleted.data.map((song: any) => {
            return song.dataIndex;
        });

        const songsToDelete = songs.filter((song, index) => {
            return indexes.includes(index);
        });

        axios.post("api/songs/delete", { songs: songsToDelete }).then((response) => {
            //
        });

        indexes.forEach((song: any) => {
            deleteSong(song);
        });
    };

    const columns = [
        {
            label: "Preview",
            name: "previewData",
            options: { customBodyRender: PreviewCell, filter: false },
        },
        {
            label: "Song Title",
            name: "details",
            options: {
                customBodyRender: (value: any) => <DetailCell value={value} onPlaySong={props.onPlaySong} />,
                filterOptions: {
                    names: Array.from(
                        new Set(
                            songs.map((item) => {
                                return item.details.title;
                            })
                        )
                    ),
                    logic(prop: any, filters: any[]): boolean {
                        if (filters.length) {
                            return !filters.includes(prop.title);
                        }
                        return false;
                    },
                },
            },
        },
        {
            label: "Requested By",
            name: "requestedBy",
            options: {
                customBodyRender: RequesterCell,
                filter: true,
            },
        },
        {
            label: "Requester Status",
            name: "requesterStatus",
            options: {
                customBodyRender: RequesterStatusCell,
                filterOptions: {
                    names: Array.from(
                        new Set(
                            songs
                                .map((item) => {
                                    return item?.requesterStatus?.viewerStatus;
                                })
                                .concat(
                                    songs.map((otherItem) => {
                                        return otherItem?.requesterStatus?.vipStatus;
                                    })
                                )
                        )
                    ),
                    logic(prop: any, filters: any[]): boolean {
                        if (filters.length) {
                            return !filters.includes(prop.viewerStatus) && !filters.includes(prop.vipStatus);
                        }
                        return false;
                    },
                },
            },
        },
        {
            label: "Requested With",
            name: "requestSource",
            options: {
                customBodyRender: RequestedWithCell,
                filter: true,
            },
        },
    ];

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
    let tableOptions: MUIDataTableOptions = { elevation: 0, download: false, print: false, onRowsDelete: undefined, selectableRows: "none" };
    if (user.userLevelKey >= UserLevels.Moderator) {
        tableOptions = {
            ...tableOptions,
            selectableRows: "multiple",
            onRowsDelete: onSongDeleted
        }
    }

    // Find own requested songs and list them.
    let ownSongQueue;
    let ownSongs: OwnRequest[] = [];
    for (const song of songs) {
        if (song.requestedBy === user.username) {
            ownSongs.push({
                index: songs.indexOf(song),
                song: song
            });
        }
    }

    ownSongQueue = 
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
                                       <IconButton href={tile.song.previewData.linkUrl} className={classes.icon}>
                                           <OpenInNewIcon />
                                       </IconButton>
                                   }
                               />
                           </GridListTile>
                       ))}
                   </GridList>
               </div>
            }
            <Grid item xs={12}>
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
                                Request
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
            <Divider />
        </Box>

    return (
        <MuiThemeProvider theme={getMuiTheme()}>
            {ownSongQueue}
            <MUIDataTable
                title="Song Queue"
                data={songs}
                columns={columns}
                options={tableOptions}
            />
        </MuiThemeProvider>
    );
};

export default SongQueue;
